#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { expectedFor, git, laneFor, loadState, readJson } from "./lib.mjs";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const state = await loadState(root);
const report = await readJson(join(root, "report.json"));

assert.equal(state.operatorGo, true);
assert.equal(state.fullAutonomy, true);
assert.deepEqual(state.merged, [61, 62]);
assert.equal(state.countersigns.length, 2);
assert.equal(state.gateRaises.length, 0);
for (const id of state.autonomousQueue) {
  const lane = laneFor(state, id);
  assert.equal(lane.state, "MERGED");
  assert.equal(lane.changeRequestState, "MERGED");
  assert.equal(lane.mergedBy, lane.ownerSession);
  assert.match(lane.mergedBy, /^owner-/);
  const authorization = await readJson(join(root, "authorizations", `${id}.json`));
  assert.equal(authorization.consumed, true);
  assert.equal(authorization.ownerSession, lane.ownerSession);
  assert.equal(authorization.issuedBy, "root-coordinator");
  const expected = expectedFor(id);
  assert.equal(`${git(project, "show", `main:${expected.path}`)}\n`, expected.content);
  const reviews = await Promise.all(["gates", "live", "regression"].map((name) => readJson(join(root, "reviews", `${id}-${name}.json`))));
  assert.equal(new Set(reviews.map((item) => item.reviewerSession)).size, 3);
  assert.ok(reviews.every((item) => item.reviewerSession !== lane.ownerSession));
}
const operatorLane = laneFor(state, 63);
assert.equal(operatorLane.state, "WAIT_OPERATOR");
assert.equal(operatorLane.ownerSession, null);
assert.equal(operatorLane.authorization, null);
assert.notEqual(spawnSync("git", ["cat-file", "-e", `main:${expectedFor(63).path}`], { cwd: project }).status, 0);
assert.equal(report.predicate, "2/2 autonomous changes owner-merged; 1 operator item held");
assert.equal(report.targetHead, git(project, "rev-parse", "main"));
assert.equal(report.stopReason, "autonomous-queue-complete-operator-item-held");
console.log(`AUTOPILOT_FULL_OK=${report.targetHead}`);
