#!/usr/bin/env node

import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { git, laneFor, loadState, readJson } from "./lib.mjs";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const state = await loadState(root);
const report = await readJson(join(root, "report.json"));

assert.equal(state.operatorGo, true);
assert.equal(state.landingAuthority, false);
assert.deepEqual(state.stack, [51, 52]);
assert.deepEqual(state.merges, []);
assert.deepEqual(state.armed, []);
assert.equal(git(project, "rev-parse", "main"), state.targetBaseSha);
const bottom = laneFor(state, 51);
const tip = laneFor(state, 52);
assert.equal(bottom.baseRef, "main");
assert.equal(tip.baseRef, bottom.headRef);
assert.equal(git(project, "merge-base", "--is-ancestor", bottom.headRef, tip.headRef), "");
assert.equal(tip.rewrite.codeVerdictPreserved, true);
assert.equal(tip.rewrite.oldPatchId, tip.rewrite.newPatchId);
assert.notEqual(tip.rewrite.oldHeadSha, tip.rewrite.newHeadSha);
assert.ok(state.lanes.every((lane) => lane.state === "stacked" && lane.checks === "PASS" && lane.changeRequestState === "OPEN" && lane.autoMerge === false));
assert.equal(report.predicate, "2/2 stacked");
assert.equal(report.targetHead, state.targetBaseSha);
assert.equal(report.root.headSha, bottom.headSha);
assert.equal(report.tip.headSha, tip.headSha);
assert.equal(report.stopReason, "stack-delivered-without-landing");
assert.equal(report.operatorGate, "review-and-land");
console.log(`AUTOPILOT_STACK_OK=${tip.headSha}`);
