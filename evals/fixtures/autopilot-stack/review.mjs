#!/usr/bin/env node

import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { assertNativeSession, laneFor, liveCoordinates, loadState, readJson, saveState, verifyLane, writeJson } from "./lib.mjs";

const [action, rootArg = ".", idArg, reviewLane, reviewerSession] = process.argv.slice(2);
const root = resolve(rootArg);
const project = join(root, "project");
const state = await loadState(root);
const lane = laneFor(state, idArg);

if (action === "packet") {
  assert.equal(lane.state, "STACK_READY");
  const live = liveCoordinates(project, lane);
  process.stdout.write(`${JSON.stringify({
    change: lane.id,
    ownerSession: lane.ownerSession,
    ...live,
    reviewLane,
    verificationCommand: `node review.mjs verify . ${lane.id} ${reviewLane}`,
  }, null, 2)}\n`);
} else if (action === "verify") {
  assert.ok(["gates", "live"].includes(reviewLane), "unknown review lane");
  const result = verifyLane(project, lane);
  process.stdout.write(`${JSON.stringify({ change: lane.id, reviewLane, ...result }, null, 2)}\n`);
  if (!result.passed) process.exitCode = 1;
} else if (action === "record") {
  assert.equal(lane.state, "STACK_READY");
  assert.ok(["gates", "live"].includes(reviewLane), "unknown review lane");
  assertNativeSession(reviewerSession, "reviewer");
  assert.notEqual(reviewerSession, lane.ownerSession, "owner cannot review its own change");
  const existing = await readdir(join(root, "reviews"));
  for (const file of existing) {
    const review = await readJson(join(root, "reviews", file));
    assert.notEqual(review.reviewerSession, reviewerSession, "reviewer sessions must be distinct");
  }
  const live = liveCoordinates(project, lane);
  const result = verifyLane(project, lane);
  assert.equal(result.passed, true, "observed review must pass");
  const review = { schemaVersion: 1, change: lane.id, reviewLane, reviewerSession, ...live, verdict: "PASS", observed: result };
  await writeJson(join(root, "reviews", `${lane.id}-${reviewLane}.json`), review, { flag: "wx" });
  console.log(`AUTOPILOT_REVIEW=${lane.id}:${reviewLane}:${reviewerSession}:PASS`);
} else if (action === "aggregate") {
  assert.equal(reviewLane, "root-coordinator", "only the root coordinator may aggregate");
  const reviews = await Promise.all(["gates", "live"].map((name) => readJson(join(root, "reviews", `${lane.id}-${name}.json`))));
  assert.equal(new Set(reviews.map((item) => item.reviewerSession)).size, 2, "two distinct reviewers required");
  assert.ok(reviews.every((item) => item.verdict === "PASS"));
  const [first, second] = reviews;
  assert.deepEqual(
    [first.baseSha, first.headSha, first.patchId],
    [second.baseSha, second.headSha, second.patchId],
    "review lanes disagree on frozen coordinates",
  );
  const live = liveCoordinates(project, lane);
  assert.deepEqual([first.baseSha, first.headSha, first.patchId], [live.baseSha, live.headSha, live.patchId], "review coordinates are stale");
  await writeJson(join(root, "aggregates", `${lane.id}.json`), {
    schemaVersion: 1,
    change: lane.id,
    verdict: "CLEAN",
    baseSha: live.baseSha,
    headSha: live.headSha,
    patchId: live.patchId,
    reviewers: reviews.map(({ reviewLane: name, reviewerSession: session }) => ({ lane: name, session })),
  }, { flag: "wx" });
  lane.state = "verified";
  await saveState(root, state);
  console.log(`AUTOPILOT_VERDICT=${lane.id}:CLEAN:${lane.headSha}`);
} else {
  throw new Error("usage: node review.mjs <packet|verify|record|aggregate> <root> <change-id> <lane-or-root> [reviewer-session]");
}
