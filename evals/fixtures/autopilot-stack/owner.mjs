#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { assertNativeSession, expectedFor, git, laneFor, loadState, patchId, saveState } from "./lib.mjs";

const [action, rootArg = ".", idArg, ownerSession] = process.argv.slice(2);
const root = resolve(rootArg);
const project = join(root, "project");
const state = await loadState(root);
const lane = laneFor(state, idArg);

if (action === "packet") {
  process.stdout.write(`${JSON.stringify({
    change: lane.id,
    targetBranch: state.targetBranch,
    baseSha: lane.baseSha,
    headRef: lane.headRef,
    exclusivePath: expectedFor(lane.id).path,
    acceptance: `node owner.mjs self-proof . ${lane.id}`,
    landingAuthority: false,
  }, null, 2)}\n`);
} else if (action === "build") {
  assert.equal(state.operatorGo, true, "operator go is required");
  assert.equal(state.landingAuthority, false, "fixture must withhold landing authority");
  assert.equal(lane.state, "planned", `${lane.id} is not planned`);
  assertNativeSession(ownerSession, "owner");
  const expected = expectedFor(lane.id);
  git(project, "checkout", "-q", state.targetBranch);
  git(project, "checkout", "-q", "-b", lane.headRef);
  await mkdir(dirname(join(project, expected.path)), { recursive: true });
  await writeFile(join(project, expected.path), expected.content);
  git(project, "add", expected.path);
  git(project, "commit", "-qm", `build change ${lane.id}`);
  lane.ownerSession = ownerSession;
  lane.headSha = git(project, "rev-parse", lane.headRef);
  lane.patchId = patchId(project, lane.baseSha, lane.headSha);
  lane.checks = "PASS";
  lane.state = "STACK_READY";
  await writeFile(join(root, "trails", `${lane.id}.tsv`), `change\towner\thead\tresult\n${lane.id}\t${ownerSession}\t${lane.headSha}\tSTACK_READY\n`, { flag: "wx" });
  await saveState(root, state);
  console.log(`AUTOPILOT_STACK_READY=${lane.id}:${lane.headSha}`);
} else if (action === "self-proof") {
  assert.equal(lane.state, "STACK_READY");
  const expected = expectedFor(lane.id);
  assert.equal(`${git(project, "show", `${lane.headRef}:${expected.path}`)}\n`, expected.content);
  assert.equal(git(project, "diff", "--name-only", lane.baseRef, lane.headRef), expected.path);
  console.log(`AUTOPILOT_OWNER_PROOF=${lane.id}:${lane.headSha}`);
} else {
  throw new Error("usage: node owner.mjs <packet|build|self-proof> <root> <change-id> [owner-session]");
}
