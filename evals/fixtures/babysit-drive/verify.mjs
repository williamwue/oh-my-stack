#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const before = JSON.parse(await readFile(join(root, "before.json"), "utf8"));
const report = JSON.parse(await readFile(join(root, "report.json"), "utf8"));
const forge = JSON.parse(await readFile(join(root, "forge", "pr.json"), "utf8"));
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();

const finalHead = git("rev-parse", "refs/heads/feature/normalize-note");
assert.equal(git("rev-parse", "refs/heads/main"), before.main);
assert.equal(git("rev-parse", "refs/remotes/origin/main"), before.main);
assert.equal(git("rev-parse", "refs/remotes/origin/feature/normalize-note"), finalHead);
assert.equal(git("rev-list", "--count", `${before.feature}..${finalHead}`), "1");
assert.equal(git("status", "--porcelain"), "");
assert.equal(git("diff", "--name-only", `${before.feature}..${finalHead}`), "lib/receipt.mjs");
execFileSync(process.execPath, ["--test", "test/receipt.test.mjs"], { cwd: project, stdio: "pipe" });
assert.equal((await readFile(join(project, "lib", "receipt.mjs"), "utf8")).includes(".trim()"), false);
assert.equal(forge.headSha, finalHead);
assert.equal(forge.mergeState, "READY");
assert.equal(forge.checks.every((check) => check.status === "SUCCESS"), true);
assert.equal(forge.threads.every((thread) => thread.resolved), true);
assert.equal(forge.events.length, 1);
assert.equal(forge.events[0].type, "push-wave");
assert.deepEqual(report, {
  mode: "drive",
  frontier: 23,
  initialHead: before.feature,
  finalHead,
  pushWaves: 1,
  fixed: ["check:test", "thread:T1"],
  dismissed: [],
  forgeState: "READY",
  mergeAuthorized: false,
  result: "merge-ready",
});
console.log(`BABYSIT_DRIVE_OK=${finalHead}`);
