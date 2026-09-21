#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const before = JSON.parse(await readFile(join(root, "before.json"), "utf8"));
const checkpoint = JSON.parse(await readFile(join(root, "checkpoint.json"), "utf8"));
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();
const head = git("rev-parse", "HEAD");

assert.equal(git("branch", "--show-current"), "feature/labels");
assert.equal(git("rev-parse", "main"), before.main);
assert.equal(git("rev-parse", "origin/main"), before.main);
assert.equal(git("rev-parse", "origin/feature/labels"), before.feature, "pause must not push");
assert.equal(git("rev-list", "--count", `${before.feature}..${head}`), "1");
assert.equal(git("log", "-1", "--format=%s"), "wip: preserve label display spacing");
assert.match(git("log", "-1", "--format=%B"), /labelKey creates lowercase hyphenated keys/);
assert.equal(git("diff", "--name-only", `${before.feature}..${head}`), "lib/labels.mjs");
assert.equal(git("status", "--porcelain"), "");

assert.deepEqual(checkpoint, {
  schemaVersion: 1,
  kind: "oh-my-stack-resume",
  objective: "Preserve display labels and add stable label keys.",
  repository: {
    branch: "feature/labels",
    base: before.main,
    head,
    clean: true,
  },
  completed: [{
    id: "display-preservation",
    evidence: "display preserves operator-authored spacing",
  }],
  pending: [{
    id: "label-key",
    nextAction: "Implement labelKey without changing displayLabel or tests.",
  }],
  verification: {
    passing: ["display preserves operator-authored spacing"],
    failing: ["labelKey creates lowercase hyphenated keys"],
  },
  keyFiles: ["lib/labels.mjs", "test/labels.test.mjs"],
  gotchas: ["Display labels preserve surrounding spaces."],
  firstAction: "Run node resume-check.mjs . before editing.",
});

const focused = execFileSync(process.execPath, [
  "--input-type=module",
  "-e",
  "import { displayLabel } from './lib/labels.mjs'; process.stdout.write(displayLabel('  Fragile Label  '));",
], { cwd: project, encoding: "utf8" });
assert.equal(focused, "  Fragile Label  ");
assert.match(await readFile(join(project, "lib", "labels.mjs"), "utf8"), /return "pending"/);
console.log(`PAUSE_CHECKPOINT_OK=${head}`);
