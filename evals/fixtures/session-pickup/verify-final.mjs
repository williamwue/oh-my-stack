#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const before = JSON.parse(await readFile(join(root, "before.json"), "utf8"));
const checkpoint = JSON.parse(await readFile(join(root, "checkpoint.json"), "utf8"));
const result = JSON.parse(await readFile(join(root, "result.json"), "utf8"));
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();
const finalHead = git("rev-parse", "HEAD");

assert.equal(git("branch", "--show-current"), "feature/labels");
assert.equal(git("rev-parse", "main"), before.main);
assert.equal(git("rev-parse", "origin/main"), before.main);
assert.equal(git("rev-parse", "origin/feature/labels"), before.feature, "pickup must not push");
assert.equal(git("rev-list", "--count", `${before.feature}..${finalHead}`), "2");
assert.equal(git("rev-parse", `${finalHead}^`), checkpoint.repository.head);
assert.equal(git("diff", "--name-only", `${before.feature}..${checkpoint.repository.head}`), "lib/labels.mjs");
assert.equal(git("diff", "--name-only", `${checkpoint.repository.head}..${finalHead}`), "lib/labels.mjs");
assert.equal(git("status", "--porcelain"), "");

const initialTest = git("show", `${before.feature}:test/labels.test.mjs`);
assert.equal(await readFile(join(project, "test", "labels.test.mjs"), "utf8"), `${initialTest}\n`);
const checkpointSource = git("show", `${checkpoint.repository.head}:lib/labels.mjs`);
const finalSource = await readFile(join(project, "lib", "labels.mjs"), "utf8");
const displayBlock = (source) => source.match(/export function displayLabel\(label\) \{[\s\S]*?\n\}/)?.[0];
assert.equal(displayBlock(finalSource), displayBlock(checkpointSource), "pickup redid inherited display work");
assert.equal(finalSource.includes('return "pending"'), false);
const behavior = JSON.parse(execFileSync(process.execPath, [
  "--input-type=module",
  "-e",
  "import { displayLabel, labelKey } from './lib/labels.mjs'; process.stdout.write(JSON.stringify([displayLabel('  Fragile Label  '), labelKey('  Fragile Label  ')]));",
], { cwd: project, encoding: "utf8" }));
assert.deepEqual(behavior, ["  Fragile Label  ", "fragile-label"]);

assert.deepEqual(result, {
  workflow: "session-pickup",
  checkpointHead: checkpoint.repository.head,
  finalHead,
  inherited: ["display-preservation"],
  newlyCompleted: ["label-key"],
  redone: [],
  verification: [
    "display preserves operator-authored spacing",
    "labelKey creates lowercase hyphenated keys",
  ],
  published: false,
  result: "complete",
});
console.log(`SESSION_PICKUP_OK=${finalHead}`);
