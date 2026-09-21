#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createArchive, packageInventory, sha256 } from "./release-lib.mjs";

const execFileAsync = promisify(execFile);
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = { out: join(repoRoot, "dist"), check: false, tag: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") options.check = true;
    else if (arg === "--out") options.out = resolve(argv[++index]);
    else if (arg === "--tag") options.tag = argv[++index];
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

async function git(root, ...args) {
  return (await execFileAsync("git", args, { cwd: root })).stdout.trim();
}

export async function releaseSource(root, version, tag = null) {
  const commit = await git(root, "rev-parse", "HEAD");
  if (!tag) return { ref: "HEAD", commit, cleanTaggedCheckout: false };
  if (tag !== `v${version}`) throw new Error(`release tag must be v${version}, received ${tag}`);
  const tagCommit = await git(root, "rev-list", "-n", "1", tag);
  if (tagCommit !== commit) throw new Error(`${tag} does not resolve to HEAD`);
  const dirty = await git(root, "status", "--porcelain", "--untracked-files=all");
  if (dirty) throw new Error("tagged releases require a clean checkout");
  return { ref: tag, commit, cleanTaggedCheckout: true };
}

async function collectConformance(root, target) {
  const profile = target === "omp" ? "omp-default" : target === "codex" ? "codex-cli" : null;
  if (!profile) return { status: "deferred", profile: null, scenarios: [] };
  const directory = join(root, "conformance", "results", profile);
  const scenarios = [];
  for (const name of (await readdir(directory)).filter((entry) => entry.endsWith(".json")).sort()) {
    const record = JSON.parse(await readFile(join(directory, name), "utf8"));
    if (record.result !== "pass") throw new Error(`${profile}/${name} is not passing`);
    scenarios.push(record.scenario);
  }
  return { status: "verified", profile, scenarios };
}

export async function buildRelease({ root = repoRoot, out, tag = null }) {
  const project = JSON.parse(await readFile(join(root, "src/core/project.json"), "utf8"));
  const config = JSON.parse(await readFile(join(root, "src/packaging/release.json"), "utf8"));
  if (config.schemaVersion !== 1 || config.archiveRoot !== project.name) throw new Error("invalid release configuration");
  const ids = config.targets.map((target) => target.id);
  if (JSON.stringify(ids) !== JSON.stringify(["omp", "codex", "claude-code"])) {
    throw new Error("release configuration must contain omp, codex, and claude-code in order");
  }
  const source = await releaseSource(root, project.version, tag);
  await mkdir(out, { recursive: true });
  const artifacts = [];
  for (const target of config.targets) {
    const packageRoot = join(root, target.packageDir);
    const generation = JSON.parse(await readFile(join(packageRoot, "GENERATION.json"), "utf8"));
    if (generation.target !== target.id || generation.sourceVersion !== project.version) {
      throw new Error(`${target.id}: generated package version or target drift`);
    }
    const file = `${project.name}-${target.id}-${project.version}.tar.gz`;
    const archive = await createArchive(packageRoot, config.archiveRoot);
    await writeFile(join(out, file), archive);
    const files = await packageInventory(packageRoot);
    artifacts.push({
      target: target.id,
      file,
      sha256: sha256(archive),
      size: archive.length,
      contentSha256: sha256(Buffer.from(`${JSON.stringify(files)}\n`)),
      files,
      profiles: generation.profiles,
      verification: target.verification,
      conformance: await collectConformance(root, target.id),
    });
  }
  const manifest = {
    schemaVersion: 1,
    name: project.name,
    version: project.version,
    archiveRoot: config.archiveRoot,
    source,
    artifacts,
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(out, "release-manifest.json"), manifestBytes);
  const sums = [
    ...artifacts.map((artifact) => `${artifact.sha256}  ${artifact.file}`),
    `${sha256(manifestBytes)}  release-manifest.json`,
  ];
  await writeFile(join(out, "SHA256SUMS"), `${sums.join("\n")}\n`);
  return manifest;
}

async function directorySnapshot(directory) {
  const entries = [];
  for (const name of (await readdir(directory)).sort()) {
    const bytes = await readFile(join(directory, name));
    entries.push({ name, sha256: sha256(bytes), size: bytes.length });
  }
  return entries;
}

export async function checkRelease({ root = repoRoot, tag = null }) {
  const first = await mkdtemp(join(tmpdir(), "oh-my-stack-release-a-"));
  const second = await mkdtemp(join(tmpdir(), "oh-my-stack-release-b-"));
  try {
    await buildRelease({ root, out: first, tag });
    await buildRelease({ root, out: second, tag });
    const a = await directorySnapshot(first);
    const b = await directorySnapshot(second);
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error("release build is not reproducible");
    return a;
  } finally {
    await rm(first, { recursive: true, force: true });
    await rm(second, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.check) {
    const snapshot = await checkRelease({ tag: options.tag });
    console.log(`Verified reproducible release with ${snapshot.length} output files.`);
    return;
  }
  const temporary = await mkdtemp(join(dirname(options.out), ".oh-my-stack-release-"));
  try {
    const manifest = await buildRelease({ out: temporary, tag: options.tag });
    await rm(options.out, { recursive: true, force: true });
    await mkdir(dirname(options.out), { recursive: true });
    await import("node:fs/promises").then(({ rename }) => rename(temporary, options.out));
    console.log(`Built ${manifest.artifacts.length} release artifacts in ${relative(repoRoot, options.out)}.`);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
