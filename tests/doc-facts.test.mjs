import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docs = ["README.md", "README.zh-CN.md", "docs/pi-install.md", "docs/pstack-parity.md", "docs/support-policy.md", "docs/project-status.md"];
const imports = JSON.parse(await readFile(join(root, "upstream/imports.json"), "utf8"));
const parity = JSON.parse(await readFile(join(root, imports.derivationManifest), "utf8"));
const inputs = [...docs, "tools/check-doc-facts.mjs", "src/core/project.json", "upstream/imports.json",
  imports.derivationManifest, imports.sourceReceipt, `${parity.sourceRoot}/.cursor-plugin/plugin.json`, "packages/codex/SKILL_CATALOG.json"];

async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(), "oms-doc-facts-"));
  try {
    for (const path of inputs) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await copyFile(join(root, path), join(directory, path));
    }
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const check = (directory) => spawnSync(process.execPath, [join(directory, "tools/check-doc-facts.mjs"), directory], { encoding: "utf8", cwd: tmpdir() });
async function replace(directory, path, before, after) {
  const text = await readFile(join(directory, path), "utf8");
  assert.ok(text.includes(before), `Fixture contains ${before}`);
  await writeFile(join(directory, path), text.replace(before, after));
}

test("current documentation passes without writing its inputs", async () => fixture(async (directory) => {
  const before = await Promise.all(inputs.map((path) => readFile(join(directory, path), "utf8")));
  const result = check(directory);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(await Promise.all(inputs.map((path) => readFile(join(directory, path), "utf8"))), before);
}));

test("secondary and acceptance revisions do not replace the official baseline fact", async () => fixture(async (directory) => {
  await replace(directory, "docs/project-status.md", "### Deferred host capabilities", "### Extra reference\n\nSecondary revision `1111111111111111111111111111111111111111`.\n\n### Deferred host capabilities");
  assert.equal(check(directory).status, 0);
  await replace(directory, "docs/project-status.md", `\`${imports.revision}\``, "`0000000000000000000000000000000000000000`");
  const result = check(directory);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /upstream revision is 0000/);
}));

for (const [name, path, before, after, diagnostic] of [
  ["stale source", "README.md", "Source candidate 0.20.0", "Source candidate 0.15.0", /source version/],
  ["stale upstream", "README.zh-CN.md", "pstack 0.15.30", "pstack 0.15.23", /upstream pin/],
  ["stale count", "docs/project-status.md", "with 81 default", "with 77 default", /public count/],
  ["stale revision", "docs/pstack-parity.md", "`4ec7ffa173eaa70d3d9467a627baf0954645a353`", "`0000000000000000000000000000000000000000`", /upstream revision/],
  ["stale Pi candidate", "docs/pi-install.md", "The current source generates", "The local 0.15.0 candidate generates", /Pi source scope/],
  ["stale Pi table", "README.zh-CN.md", "由当前源码生成", "当前提供于本地 0.16.0 发行版本", /Pi installation row/],
  ["missing source", "docs/support-policy.md", "current source is a local 0.20.0 candidate", "source has workflows", /found 0/],
  ["duplicate source", "README.md", "Source candidate 0.20.0", "Source candidate 0.20.0. Source candidate 0.20.0", /found 2/],
  ["missing pin", "README.md", "pstack 0.15.30", "pstack", /found 0/],
  ["missing count", "docs/project-status.md", "with 81 default public Skills", "with public Skills", /found 0/],
  ["missing Pi row", "README.md", "| Pi |", "| Other |", /Pi installation row/],
]) {
  test(`rejects ${name}`, async () => fixture(async (directory) => {
    await replace(directory, path, before, after);
    const result = check(directory);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, diagnostic);
    assert.ok(result.stderr.includes(path));
  }));
}

test("historical and installed version statements remain outside current checks", async () => fixture(async (directory) => {
  await replace(directory, "docs/project-status.md", "Current source version is [0.18.0]", "Current source version is [0.01.0]");
  await replace(directory, "docs/pstack-parity.md", "Version 0.18.0 targeted pstack 0.15.23", "Version 0.01.0 targeted pstack 0.01.0");
  await replace(directory, "docs/support-policy.md", "enabled at 0.9.0", "enabled at 0.1.0");
  const result = check(directory);
  assert.equal(result.status, 0, result.stderr);
}));
