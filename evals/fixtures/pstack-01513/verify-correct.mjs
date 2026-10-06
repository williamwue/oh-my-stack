#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2]);
const destination = join(root, "owned-package");
await mkdir(destination, { recursive: true });
await writeFile(join(destination, "GENERATION.json"), JSON.stringify({
  generatedBy: "tools/generate.mjs", target: "codex", sourceVersion: "0.5.0",
}));
const aliases = [join(root, "installer.mjs"), join(root, "source", "tools", "install-release.mjs")];
const outcomes = [];
for (const cli of aliases) {
  const inspect = spawnSync(process.execPath,
    [cli, "inspect", "--target", "codex", "--destination", destination],
    { encoding: "utf8" });
  assert.equal(inspect.status, 0, inspect.stderr);
  assert.ok(inspect.stdout.trim(), `${cli}: silently skipped the CLI`);
  const value = JSON.parse(inspect.stdout);
  assert.equal(value.target, "codex");
  assert.equal(value.installedVersion, "0.5.0");
  const invalid = spawnSync(process.execPath, [cli, "unknown-action"], { encoding: "utf8" });
  assert.notEqual(invalid.status, 0, `${cli}: malformed action silently succeeded`);
  assert.match(invalid.stderr, /action must be/);
  outcomes.push({ alias: cli === aliases[0] ? "file" : "directory", inspect: "pass", malformed: "rejected" });
}
const imported = spawnSync(process.execPath,
  ["--input-type=module", "-e", `await import(${JSON.stringify(join(root, "tools", "install-release.mjs"))});`],
  { encoding: "utf8" });
assert.equal(imported.status, 0, imported.stderr);
assert.equal(imported.stdout, "");
assert.equal(imported.stderr, "");
console.log(JSON.stringify({ outcomes, importExecutedCli: false }));
