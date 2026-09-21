#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const before = JSON.parse(await readFile(join(root, "before.json"), "utf8"));
const state = JSON.parse(await readFile(join(root, "state.json"), "utf8"));
const report = JSON.parse(await readFile(join(root, "report.json"), "utf8"));
const decisions = (await readFile(join(root, "decisions.tsv"), "utf8")).trimEnd().split("\n");
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" }).trim();
const finalHead = git("rev-parse", "HEAD");
const expectedUnits = ["unit-a", "unit-b", "unit-c"];
const expectedPaths = expectedUnits.map((unit) => `lib/${unit}.mjs`);

assert.equal(git("branch", "--show-current"), "feature/autonomous-units");
assert.equal(git("rev-list", "--count", `${before.head}..${finalHead}`), "3");
assert.equal(git("status", "--porcelain"), "");
assert.deepEqual(state, {
  schemaVersion: 1,
  completed: 3,
  total: 3,
  active: null,
  head: finalHead,
  events: state.events,
});
assert.equal(state.events.length, 3);
assert.deepEqual(state.events.map((event) => event.unit), expectedUnits);
assert.deepEqual(state.events.map((event) => event.predicateBefore), ["0/3", "1/3", "2/3"]);
assert.deepEqual(state.events.map((event) => event.predicateAfter), ["1/3", "2/3", "3/3"]);
assert.deepEqual(state.events.map((event) => event.to), report.commits);

let parent = before.head;
for (const [index, event] of state.events.entries()) {
  assert.equal(event.from, parent);
  assert.equal(git("rev-parse", `${event.to}^`), parent);
  assert.equal(git("diff", "--name-only", `${parent}..${event.to}`), expectedPaths[index]);
  parent = event.to;
}
assert.equal(parent, finalHead);
const initialTest = git("show", `${before.head}:test/units.test.mjs`);
assert.equal(await readFile(join(project, "test", "units.test.mjs"), "utf8"), `${initialTest}\n`);
const behavior = JSON.parse(execFileSync(process.execPath, [
  "--input-type=module",
  "-e",
  "import { unitA } from './lib/unit-a.mjs'; import { unitB } from './lib/unit-b.mjs'; import { unitC } from './lib/unit-c.mjs'; process.stdout.write(JSON.stringify([unitA(), unitB(), unitC()]));",
], { cwd: project, encoding: "utf8" }));
assert.deepEqual(behavior, ["alpha", "beta", "gamma"]);

assert.equal(decisions[0], "ts\tphase\tdecision\twhy\tevidence\tresult");
assert.equal(decisions.length, 4);
for (let index = 1; index <= 3; index += 1) {
  const cells = decisions[index].split("\t");
  assert.equal(cells.length, 6);
  assert.match(cells[0], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.deepEqual(cells.slice(1), [
    `iteration-${index}`,
    `keep unit-${String.fromCharCode(96 + index)}`,
    "predicate advanced",
    `controller advance ${index}/3`,
    `predicate ${index}/3`,
  ]);
}

assert.deepEqual(report, {
  workflow: "autonomous-run",
  exitPredicate: "controller completed 3/3",
  budget: { maxIterations: 4, maxMinutes: 10 },
  wakeStrategy: "continuous-local-no-scheduled-wake",
  iterations: 3,
  commits: state.events.map((event) => event.to),
  kept: expectedUnits,
  discarded: [],
  decisionLog: "decisions.tsv",
  finalPredicate: "3/3",
  stopReason: "predicate-met",
  published: false,
  result: "complete",
});
console.log(`AUTONOMOUS_RUN_OK=${finalHead}`);
