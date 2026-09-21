import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const execFileAsync = promisify(execFile);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function pathExists(path) {
  try {
    await readFile(path);
    return true;
  } catch (error) {
    if (error.code === "EISDIR") return true;
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function replaceDirectory(source, target) {
  const stage = `${target}.stage`;
  await rm(stage, { recursive: true, force: true });
  await cp(source, stage, { recursive: true });
  await rm(target, { recursive: true, force: true });
  await mkdir(dirname(target), { recursive: true });
  await rename(stage, target);
}

test("OMP package survives clean npm install, update, and uninstall", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-omp-lifecycle-"));
  const prefix = join(root, "consumer");
  const packagePath = join(prefix, "node_modules", "oh-my-stack");
  const source = join(repoRoot, "packages", "omp");
  try {
    const npmArgs = ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", prefix, source];
    await execFileAsync("npm", npmArgs);
    assert.equal((await readJson(join(packagePath, "package.json"))).omp.skills[0], "./skills");

    const sentinel = join(prefix, "user-owned.txt");
    await writeFile(sentinel, "preserve me\n");
    await execFileAsync("npm", [...npmArgs, "--force"]);
    assert.equal(await readFile(sentinel, "utf8"), "preserve me\n");

    await execFileAsync("npm", ["uninstall", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", prefix, "oh-my-stack"]);
    assert.equal(await pathExists(packagePath), false);
    assert.equal(await readFile(sentinel, "utf8"), "preserve me\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Codex repo marketplace copy installs, replaces, and removes only the plugin", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-codex-lifecycle-"));
  const source = join(repoRoot, "packages", "codex");
  const target = join(root, "plugins", "oh-my-stack");
  const marketplacePath = join(root, ".agents", "plugins", "marketplace.json");
  const sentinel = join(root, "user-owned.txt");
  try {
    await replaceDirectory(source, target);
    await mkdir(dirname(marketplacePath), { recursive: true });
    await writeFile(marketplacePath, `${JSON.stringify({
      name: "oh-my-stack-test",
      plugins: [{
        name: "oh-my-stack",
        source: { source: "local", path: "./plugins/oh-my-stack" },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category: "Productivity",
      }],
    }, null, 2)}\n`);
    await writeFile(sentinel, "preserve me\n");

    assert.equal((await readJson(join(target, "plugin.json"))).name, "oh-my-stack");
    assert.equal((await readJson(join(target, ".codex-plugin", "plugin.json"))).name, "oh-my-stack");

    await writeFile(join(target, "stale-owned-file.txt"), "remove on update\n");
    await replaceDirectory(source, target);
    assert.equal(await pathExists(join(target, "stale-owned-file.txt")), false);
    assert.equal(await readFile(sentinel, "utf8"), "preserve me\n");

    await rm(target, { recursive: true, force: true });
    const marketplace = await readJson(marketplacePath);
    marketplace.plugins = marketplace.plugins.filter((plugin) => plugin.name !== "oh-my-stack");
    await writeFile(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);
    assert.equal(await pathExists(target), false);
    assert.equal((await readJson(marketplacePath)).plugins.length, 0);
    assert.equal(await readFile(sentinel, "utf8"), "preserve me\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
