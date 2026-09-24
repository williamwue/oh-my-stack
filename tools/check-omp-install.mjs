#!/usr/bin/env node

import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { sha256, verifyInstalledTree } from "./release-lib.mjs";

const execFileAsync = promisify(execFile);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    assert(["--manifest", "--package", "--omp"].includes(key) && value && !value.startsWith("--"),
      `${key}: expected a value`);
    assert(!Object.hasOwn(options, key), `${key}: duplicate option`);
    options[key] = value;
  }
  assert(options["--manifest"] && options["--package"], "--manifest and --package are required");
  return {
    manifestPath: resolve(options["--manifest"]),
    packagePath: resolve(options["--package"]),
    omp: options["--omp"] ?? "omp",
  };
}

function installed(list) {
  assert(Array.isArray(list.npm) && Array.isArray(list.marketplace), "unexpected OMP plugin list shape");
  return [...list.npm, ...list.marketplace];
}

export async function checkOmpInstall({ manifestPath, packagePath, omp = "omp",
  run = execFileAsync, profile = `oms-release-${randomBytes(8).toString("hex")}` }) {
  assert(/^oms-release-[a-f0-9]{16}$/.test(profile), "unsafe probe profile name");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const artifact = manifest.artifacts?.find((entry) => entry.target === "omp");
  assert(artifact && artifact.file && artifact.sha256 && Array.isArray(artifact.files),
    "manifest has no complete OMP artifact");
  assert(sha256(await readFile(join(dirname(manifestPath), artifact.file))) === artifact.sha256,
    "OMP archive checksum differs from release manifest");
  await verifyInstalledTree(packagePath, artifact.files);
  const pkg = JSON.parse(await readFile(join(packagePath, "package.json"), "utf8"));
  assert(pkg.name === "oh-my-stack" && pkg.version === manifest.version && pkg.omp?.skills,
    "OMP package name, version, or Skill manifest differs from release");

  const workspace = await mkdtemp(join(tmpdir(), "oms-omp-gate-"));
  try {
    const command = async (...args) => (await run(omp, ["--profile", profile, "--cwd", workspace, ...args])).stdout;
    const before = JSON.parse(await command("plugin", "list", "--json"));
    assert(installed(before).length === 0, `${profile}: probe profile is not empty`);
    let baselineError;
    try { await command("read", "skill://prove-it-works"); }
    catch (error) { baselineError = error; }
    assert(/Unknown skill: prove-it-works/.test(baselineError?.stderr ?? ""),
      "probe Skill was already discoverable before isolated install");

    let primaryError;
    try {
      // This is a real install in a randomly named isolated profile, never a dry-run.
      await command("plugin", "install", packagePath);
      const current = installed(JSON.parse(await command("plugin", "list", "--json")));
      const matches = current.filter((entry) => entry.name === "oh-my-stack");
      assert(current.length === 1 && matches.length === 1 && matches[0].version === manifest.version
        && matches[0].enabled === true, "isolated OMP install did not expose the expected version");
      assert(await realpath(matches[0].path) === await realpath(packagePath),
        "isolated OMP plugin points at a different package");
      const health = JSON.parse(await command("plugin", "doctor", "--json"));
      const expectedEmptyProfileWarning = (entry) => entry.name === "package_manifest"
        && entry.status === "warning" && entry.message === "Not created yet";
      assert(Array.isArray(health) && health.some((entry) => entry.name === "plugin:oh-my-stack"
        && entry.status === "ok")
        && health.every((entry) => entry.status === "ok" || expectedEmptyProfileWarning(entry)),
      `isolated OMP plugin doctor failed: ${JSON.stringify(health)}`);
      const skill = await command("read", "skill://prove-it-works");
      assert(skill.includes("# Prove It Works"), "isolated OMP Skill did not load");
    } catch (error) {
      primaryError = error;
    }

    try {
      const cleanupList = installed(JSON.parse(await command("plugin", "list", "--json")));
      if (cleanupList.some((entry) => entry.name === "oh-my-stack")) {
        await command("plugin", "uninstall", "oh-my-stack");
      }
      const after = JSON.parse(await command("plugin", "list", "--json"));
      assert(installed(after).length === 0, `${profile}: probe plugin remains after cleanup`);
    } catch (cleanupError) {
      throw new AggregateError(primaryError ? [primaryError, cleanupError] : [cleanupError],
        `${profile}: isolated cleanup failed; inspect this profile before reuse`);
    }
    if (primaryError) throw primaryError;
    return { target: "omp", version: manifest.version, profile, preflight: "verified",
      isolatedInstall: "verified", doctor: "verified", skillLoad: "verified", cleanup: "verified",
      userProfile: "not targeted" };
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkOmpInstall(parseArgs(process.argv.slice(2)))
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
