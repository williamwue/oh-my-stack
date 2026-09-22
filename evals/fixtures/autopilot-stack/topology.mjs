#!/usr/bin/env node

import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { git, laneFor, loadState, patchId, readJson, saveState, verifyLane, writeJson } from "./lib.mjs";

const [action, rootArg = ".", idArg, actor] = process.argv.slice(2);
const root = resolve(rootArg);
const project = join(root, "project");
const state = await loadState(root);

if (action === "status") {
  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
} else if (action === "append") {
  assert.equal(actor, state.topologyWriter, "only the named topology writer may append");
  const id = Number(idArg);
  const expected = state.order[state.stack.length];
  assert.equal(id, expected, `next stack change must be ${expected}`);
  const lane = laneFor(state, id);
  assert.equal(lane.state, "verified", `${id} lacks a clean aggregate verdict`);
  const aggregate = await readJson(join(root, "aggregates", `${id}.json`));
  assert.equal(aggregate.verdict, "CLEAN");
  assert.equal(git(project, "rev-parse", lane.headRef), aggregate.headSha, "reviewed head changed before append");
  assert.equal(patchId(project, lane.baseRef, lane.headRef), aggregate.patchId, "reviewed patch changed before append");

  let rewrite = null;
  if (state.stack.length === 0) {
    assert.equal(lane.baseRef, state.targetBranch);
    assert.equal(git(project, "rev-parse", state.targetBranch), state.targetBaseSha, "target branch moved");
  } else {
    const parent = laneFor(state, state.stack.at(-1));
    const oldBaseSha = git(project, "rev-parse", lane.baseRef);
    const oldHeadSha = git(project, "rev-parse", lane.headRef);
    const oldPatchId = patchId(project, oldBaseSha, oldHeadSha);
    const parentHeadSha = git(project, "rev-parse", parent.headRef);
    git(project, "checkout", "-q", lane.headRef);
    git(project, "rebase", "-q", "--onto", parentHeadSha, oldBaseSha, lane.headRef);
    const newHeadSha = git(project, "rev-parse", lane.headRef);
    const newPatchId = patchId(project, parentHeadSha, newHeadSha);
    assert.equal(newPatchId, oldPatchId, "rewritten patch identity changed");
    lane.baseRef = parent.headRef;
    lane.baseSha = parentHeadSha;
    lane.headSha = newHeadSha;
    lane.patchId = newPatchId;
    rewrite = { oldHeadSha, newHeadSha, oldPatchId, newPatchId, codeVerdictPreserved: true };
  }

  const refreshed = verifyLane(project, lane);
  assert.equal(refreshed.passed, true, "rewritten head checks failed");
  lane.checks = "PASS";
  lane.state = "stacked";
  lane.rewrite = rewrite;
  lane.refreshedAtHead = git(project, "rev-parse", lane.headRef);
  state.stack.push(id);
  await saveState(root, state);
  console.log(`AUTOPILOT_STACKED=${id}:${lane.headSha ?? aggregate.headSha}`);
} else if (action === "report") {
  assert.deepEqual(state.stack, state.order, "stack is incomplete");
  assert.equal(git(project, "rev-parse", state.targetBranch), state.targetBaseSha, "target branch must remain unchanged");
  const [bottom, tip] = state.order.map((id) => laneFor(state, id));
  assert.equal(git(project, "merge-base", "--is-ancestor", bottom.headRef, tip.headRef), "");
  assert.deepEqual(state.merges, []);
  assert.deepEqual(state.armed, []);
  const report = {
    schemaVersion: 1,
    workflow: "autopilot-stack",
    predicate: "2/2 stacked",
    landingAuthority: false,
    targetBranch: state.targetBranch,
    targetHead: state.targetBaseSha,
    root: { id: bottom.id, branch: bottom.headRef, headSha: bottom.headSha },
    tip: { id: tip.id, branch: tip.headRef, headSha: tip.headSha },
    order: state.stack,
    links: state.order.map((id) => {
      const lane = laneFor(state, id);
      return { id, ownerSession: lane.ownerSession, baseRef: lane.baseRef, baseSha: lane.baseSha, headSha: lane.headSha, patchId: lane.patchId, verdict: "CLEAN", checks: lane.checks, rewrite: lane.rewrite, state: lane.changeRequestState, autoMerge: lane.autoMerge };
    }),
    parked: [],
    merges: state.merges,
    armed: state.armed,
    operatorGate: "review-and-land",
    stopReason: "stack-delivered-without-landing",
  };
  await writeJson(join(root, "report.json"), report, { flag: "wx" });
  console.log(`AUTOPILOT_STACK_REPORT_OK=${tip.headSha}`);
} else {
  throw new Error("usage: node topology.mjs <status|append|report> <root> [change-id] [actor]");
}
