#!/usr/bin/env node

import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { assertNativeSession, git, laneFor, liveCoordinates, loadState, readJson, saveState, verifyChange, verifyRegression, writeJson } from "./lib.mjs";

const [action, rootArg = ".", idArg, reviewLane, reviewerSession] = process.argv.slice(2);
const root = resolve(rootArg);
const project = join(root, "project");
const state = await loadState(root);
const lane = laneFor(state, idArg);
const allowed = ["gates", "live", "regression"];

function observe() {
  return reviewLane === "regression" ? verifyRegression(project, state, lane) : verifyChange(project, lane);
}

if (action === "packet") {
  assert.equal(lane.state, "MERGE_READY");
  assert.equal(lane.checks, "PASS");
  assert.ok(allowed.includes(reviewLane));
  process.stdout.write(`${JSON.stringify({
    change: lane.id,
    ownerSession: lane.ownerSession,
    ...liveCoordinates(project, lane),
    targetSha: gitTarget(),
    reviewLane,
    verificationCommand: `node review.mjs verify . ${lane.id} ${reviewLane}`,
  }, null, 2)}\n`);
} else if (action === "verify") {
  assert.ok(allowed.includes(reviewLane));
  const result = observe();
  process.stdout.write(`${JSON.stringify({ change: lane.id, reviewLane, ...result }, null, 2)}\n`);
  if (!result.passed) process.exitCode = 1;
} else if (action === "record") {
  assert.equal(lane.state, "MERGE_READY");
  assert.equal(lane.checks, "PASS");
  assert.ok(allowed.includes(reviewLane));
  assertNativeSession(reviewerSession, "reviewer");
  assert.notEqual(reviewerSession, lane.ownerSession, "owner cannot review its own change");
  const existing = await readdir(join(root, "reviews"));
  for (const file of existing) {
    const review = await readJson(join(root, "reviews", file));
    assert.notEqual(review.reviewerSession, reviewerSession, "reviewer sessions must be globally distinct");
  }
  const result = observe();
  assert.equal(result.passed, true);
  await writeJson(join(root, "reviews", `${lane.id}-${reviewLane}.json`), {
    schemaVersion: 1,
    change: lane.id,
    reviewLane,
    reviewerSession,
    ...liveCoordinates(project, lane),
    targetSha: gitTarget(),
    verdict: "PASS",
    observed: result,
  }, { flag: "wx" });
  console.log(`AUTOPILOT_FULL_REVIEW=${lane.id}:${reviewLane}:${reviewerSession}:PASS`);
} else if (action === "aggregate") {
  assert.equal(reviewLane, "root-coordinator", "only root owns verdict aggregation");
  const reviews = await Promise.all(allowed.map((name) => readJson(join(root, "reviews", `${lane.id}-${name}.json`))));
  assert.equal(new Set(reviews.map((item) => item.reviewerSession)).size, 3);
  assert.ok(reviews.every((item) => item.verdict === "PASS"));
  const first = reviews[0];
  assert.ok(reviews.every((item) => item.baseSha === first.baseSha && item.headSha === first.headSha && item.patchId === first.patchId && item.targetSha === first.targetSha));
  const live = liveCoordinates(project, lane);
  assert.deepEqual([first.baseSha, first.headSha, first.patchId], [live.baseSha, live.headSha, live.patchId]);
  assert.equal(first.targetSha, gitTarget(), "target changed during swarm");
  await writeJson(join(root, "aggregates", `${lane.id}.json`), {
    schemaVersion: 1,
    change: lane.id,
    verdict: "CLEAN",
    targetSha: first.targetSha,
    baseSha: first.baseSha,
    headSha: first.headSha,
    patchId: first.patchId,
    reviewers: reviews.map(({ reviewLane: name, reviewerSession: session }) => ({ lane: name, session })),
  }, { flag: "wx" });
  lane.state = "VERIFIED";
  await saveState(root, state);
  console.log(`AUTOPILOT_FULL_VERDICT=${lane.id}:CLEAN:${lane.headSha}`);
} else {
  throw new Error("usage: node review.mjs <packet|verify|record|aggregate> <root> <change-id> <lane-or-root> [reviewer-session]");
}

function gitTarget() {
  return git(project, "rev-parse", state.targetBranch);
}
