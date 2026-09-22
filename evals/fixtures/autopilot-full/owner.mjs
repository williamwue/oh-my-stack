#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { appendTrail, assertNativeSession, expectedFor, git, laneFor, liveCoordinates, loadState, patchId, readJson, saveState, verifyChange } from "./lib.mjs";

const [action, rootArg = ".", idArg, ownerSession, authorizationToken] = process.argv.slice(2);
const root = resolve(rootArg);
const project = join(root, "project");
const state = await loadState(root);
const lane = laneFor(state, idArg);

assert.equal(lane.operatorOwned, undefined, "operator-owned items cannot be delegated");

if (action === "packet") {
  process.stdout.write(`${JSON.stringify({
    change: lane.id,
    targetBranch: state.targetBranch,
    targetSha: git(project, "rev-parse", state.targetBranch),
    headRef: lane.headRef,
    exclusivePath: expectedFor(lane.id).path,
    landingAuthority: "owner-after-root-countersign",
  }, null, 2)}\n`);
} else if (action === "build") {
  assert.equal(state.operatorGo, true);
  assert.equal(state.fullAutonomy, true);
  assert.equal(lane.state, "planned");
  assertNativeSession(ownerSession, "owner");
  const expected = expectedFor(lane.id);
  const targetSha = git(project, "rev-parse", state.targetBranch);
  git(project, "checkout", "-q", state.targetBranch);
  git(project, "checkout", "-q", "-b", lane.headRef);
  await mkdir(dirname(join(project, expected.path)), { recursive: true });
  await writeFile(join(project, expected.path), expected.content);
  git(project, "add", expected.path);
  git(project, "commit", "-qm", `build change ${lane.id}`);
  lane.ownerSession = ownerSession;
  lane.baseSha = targetSha;
  lane.headSha = git(project, "rev-parse", lane.headRef);
  lane.patchId = patchId(project, lane.baseSha, lane.headSha);
  lane.checks = null;
  lane.state = "BUILT";
  lane.changeRequestState = "OPEN_READY";
  await writeFile(join(root, "trails", `${lane.id}.tsv`), `change\tactor\taction\thead\tresult\n${lane.id}\t${ownerSession}\tBUILD\t${lane.headSha}\tOPEN_READY\n`, { flag: "wx" });
  await saveState(root, state);
  console.log(`AUTOPILOT_FULL_BUILT=${lane.id}:${lane.headSha}`);
} else if (action === "self-proof") {
  assert.equal(lane.ownerSession, ownerSession, "only the bound owner may self-prove");
  assert.equal(lane.state, "BUILT");
  const result = verifyChange(project, lane);
  assert.equal(result.passed, true);
  lane.checks = "PASS";
  lane.state = "MERGE_READY";
  await appendTrail(root, lane.id, [lane.id, ownerSession, "SELF_PROOF", lane.headSha, "PASS"]);
  await saveState(root, state);
  console.log(`AUTOPILOT_FULL_OWNER_PROOF=${lane.id}:${lane.headSha}`);
} else if (action === "rebase") {
  assert.equal(lane.ownerSession, ownerSession, "only the bound owner may rebase");
  assert.equal(lane.state, "MERGE_READY");
  const targetSha = git(project, "rev-parse", state.targetBranch);
  assert.notEqual(targetSha, lane.baseSha, "target has not moved");
  const oldHeadSha = git(project, "rev-parse", lane.headRef);
  const oldPatchId = patchId(project, lane.baseSha, oldHeadSha);
  git(project, "checkout", "-q", lane.headRef);
  git(project, "rebase", "-q", "--onto", targetSha, lane.baseSha, lane.headRef);
  const newHeadSha = git(project, "rev-parse", lane.headRef);
  const newPatchId = patchId(project, targetSha, newHeadSha);
  assert.equal(newPatchId, oldPatchId, "rebase changed stable patch identity");
  lane.baseSha = targetSha;
  lane.headSha = newHeadSha;
  lane.patchId = newPatchId;
  lane.checks = null;
  lane.state = "BUILT";
  lane.rewrite = { oldHeadSha, newHeadSha, oldPatchId, newPatchId };
  await appendTrail(root, lane.id, [lane.id, ownerSession, "REBASE", newHeadSha, "PATCH_PRESERVED"]);
  await saveState(root, state);
  console.log(`AUTOPILOT_FULL_REBASED=${lane.id}:${newHeadSha}`);
} else if (action === "merge") {
  assert.equal(lane.ownerSession, ownerSession, "only the bound owner may merge its change");
  assert.equal(lane.state, "AUTHORIZED", "root countersign is required");
  assert.equal(lane.authorization, authorizationToken, "authorization token mismatch");
  const authorization = await readJson(join(root, "authorizations", `${lane.id}.json`));
  assert.equal(authorization.consumed, false, "authorization already consumed");
  assert.equal(authorization.ownerSession, ownerSession);
  assert.equal(authorization.targetSha, git(project, "rev-parse", state.targetBranch), "target moved after countersign");
  assert.equal(authorization.headSha, git(project, "rev-parse", lane.headRef), "head moved after countersign");
  const live = liveCoordinates(project, lane);
  assert.equal(authorization.patchId, live.patchId, "patch changed after countersign");
  git(project, "checkout", "-q", state.targetBranch);
  git(project, "merge", "--squash", lane.headRef);
  git(project, "commit", "-qm", `merge change ${lane.id}`);
  const targetReceipt = git(project, "rev-parse", state.targetBranch);
  authorization.consumed = true;
  authorization.targetReceipt = targetReceipt;
  await writeFile(join(root, "authorizations", `${lane.id}.json`), `${JSON.stringify(authorization, null, 2)}\n`);
  lane.state = "MERGED";
  lane.changeRequestState = "MERGED";
  lane.mergedBy = ownerSession;
  lane.targetReceipt = targetReceipt;
  state.merged.push(lane.id);
  await appendTrail(root, lane.id, [lane.id, ownerSession, "MERGE", lane.headSha, targetReceipt]);
  await saveState(root, state);
  console.log(`AUTOPILOT_FULL_MERGED=${lane.id}:${targetReceipt}`);
} else {
  throw new Error("usage: node owner.mjs <packet|build|self-proof|rebase|merge> <root> <change-id> [owner-session] [authorization-token]");
}
