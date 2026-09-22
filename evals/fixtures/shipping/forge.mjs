#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { assertFreshVerdict, git, liveCoordinates, loadState, loadVerdict } from "./lib.mjs";

const [action, rootArg = ".", idArg] = process.argv.slice(2);
const root = resolve(rootArg);
const project = join(root, "project");
const state = await loadState(root);

if (action === "status") {
  state.reads += 1;
  await writeFile(join(root, "provider.json"), `${JSON.stringify(state, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
} else if (action === "merge") {
  const id = Number(idArg);
  const current = state.order.find((candidate) => state.pullRequests.find((item) => item.id === candidate).state === "OPEN");
  assert.equal(id, current, `only current bottom PR ${current} may merge`);
  const pullRequest = state.pullRequests.find((item) => item.id === id);
  assert.equal(state.authorizedMode, "merge-now");
  assert.equal(pullRequest.checks, "PASS", "required checks are not passing");
  assert.equal(pullRequest.mergeable, true, "current bottom is not mergeable");
  const live = liveCoordinates(project, pullRequest);
  const verdict = await loadVerdict(root, id);
  assertFreshVerdict(pullRequest, live, verdict);
  assert.equal(git(project, "rev-parse", state.targetBranch), live.baseSha, "target branch is not the reviewed base");
  git(project, "checkout", "-q", state.targetBranch);
  git(project, "merge", "--ff-only", "-q", pullRequest.headRef);
  const landedSha = git(project, "rev-parse", state.targetBranch);
  assert.equal(landedSha, live.headSha, "landed revision differs from reviewed head");
  pullRequest.state = "MERGED";
  pullRequest.mergedSha = landedSha;
  state.merges.push({ id, baseSha: live.baseSha, headSha: live.headSha, patchId: live.patchId, landedSha });
  const next = state.order.find((candidate) => state.pullRequests.find((item) => item.id === candidate).state === "OPEN");
  if (next !== undefined) {
    const nextPullRequest = state.pullRequests.find((item) => item.id === next);
    nextPullRequest.baseRef = state.targetBranch;
    nextPullRequest.baseSha = landedSha;
  }
  state.reads += 1;
  await writeFile(join(root, "provider.json"), `${JSON.stringify(state, null, 2)}\n`);
  console.log(`SHIPPING_MERGED=${id}:${landedSha}`);
} else if (action === "report") {
  assert.deepEqual(state.merges.map((item) => item.id), [41, 42], "only the contiguous passing run may be reported landed");
  const verdicts = {};
  for (const id of state.order) verdicts[id] = JSON.parse(await readFile(join(root, "verdicts", `${id}.json`), "utf8"));
  const report = {
    workflow: "shipping",
    authorizedMode: state.authorizedMode,
    frozenStack: state.order,
    verdicts: Object.values(verdicts).map(({ pullRequest, reviewerSession, baseSha, headSha, patchId, verdict }) => ({ pullRequest, reviewerSession, baseSha, headSha, patchId, verdict })),
    verifiedCeiling: 42,
    armed: [],
    landed: state.merges.map(({ id, landedSha }) => ({ id, landedSha })),
    nextGap: { id: 43, reason: "failed-verdict" },
    remainingDecision: "repair and independently re-review PR 43 in a new shipping pass",
    result: "stopped-at-ceiling"
  };
  await writeFile(join(root, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  console.log("SHIPPING_REPORT_OK=42");
} else {
  throw new Error("usage: node forge.mjs <status|merge|report> <fixture-root> [pr-id]");
}
