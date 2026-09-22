#!/usr/bin/env node

import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { git, laneFor, liveCoordinates, loadState, readJson, saveState, writeJson } from "./lib.mjs";

const [action, rootArg = ".", idArg, actor] = process.argv.slice(2);
const root = resolve(rootArg);
const project = join(root, "project");
const state = await loadState(root);

if (action === "status") {
  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
} else if (action === "countersign") {
  assert.equal(actor, state.verdictOwner, "only root owns countersigns");
  const lane = laneFor(state, idArg);
  assert.equal(lane.operatorOwned, undefined, "operator-owned item cannot be countersigned");
  assert.equal(lane.state, "VERIFIED");
  const aggregate = await readJson(join(root, "aggregates", `${lane.id}.json`));
  assert.equal(aggregate.verdict, "CLEAN");
  const live = liveCoordinates(project, lane);
  const targetSha = git(project, "rev-parse", state.targetBranch);
  assert.equal(targetSha, lane.baseSha, "owner head is not freshly based on target");
  assert.deepEqual([aggregate.targetSha, aggregate.baseSha, aggregate.headSha, aggregate.patchId], [targetSha, live.baseSha, live.headSha, live.patchId]);
  const token = `counter-${lane.id}-${live.headSha.slice(0, 12)}`;
  await writeJson(join(root, "authorizations", `${lane.id}.json`), {
    schemaVersion: 1,
    token,
    change: lane.id,
    ownerSession: lane.ownerSession,
    provider: state.provider,
    targetSha,
    headSha: live.headSha,
    patchId: live.patchId,
    verdict: "CLEAN",
    issuedBy: actor,
    consumed: false,
  }, { flag: "wx" });
  lane.authorization = token;
  lane.state = "AUTHORIZED";
  state.countersigns.push({ change: lane.id, token, ownerSession: lane.ownerSession, headSha: live.headSha });
  await saveState(root, state);
  console.log(`AUTOPILOT_FULL_COUNTERSIGN=${lane.id}:${token}`);
} else if (action === "report") {
  assert.deepEqual(state.merged, state.autonomousQueue, "autonomous queue is incomplete");
  const operatorLane = laneFor(state, state.operatorQueue[0]);
  assert.equal(operatorLane.state, "WAIT_OPERATOR");
  assert.equal(operatorLane.ownerSession, null);
  assert.equal(operatorLane.authorization, null);
  const report = {
    schemaVersion: 1,
    workflow: "autopilot-full",
    predicate: "2/2 autonomous changes owner-merged; 1 operator item held",
    targetBranch: state.targetBranch,
    targetHead: git(project, "rev-parse", state.targetBranch),
    autonomousQueue: state.autonomousQueue,
    operatorQueue: state.operatorQueue,
    changes: state.lanes.map((lane) => ({ id: lane.id, state: lane.state, ownerSession: lane.ownerSession, headSha: lane.headSha, patchId: lane.patchId, mergedBy: lane.mergedBy, targetReceipt: lane.targetReceipt ?? null })),
    countersigns: state.countersigns,
    gateRaises: state.gateRaises,
    openOperatorGates: [{ change: operatorLane.id, gate: "operator-review-and-click" }],
    stopReason: "autonomous-queue-complete-operator-item-held",
  };
  await writeJson(join(root, "report.json"), report, { flag: "wx" });
  console.log(`AUTOPILOT_FULL_REPORT_OK=${report.targetHead}`);
} else {
  throw new Error("usage: node root.mjs <status|countersign|report> <root> [change-id] [actor]");
}
