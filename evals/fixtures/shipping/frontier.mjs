#!/usr/bin/env node

import { join, resolve } from "node:path";
import { liveCoordinates, loadState, loadVerdict } from "./lib.mjs";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const state = await loadState(root);
const landable = [];
let gap = null;

for (const id of state.order) {
  const pullRequest = state.pullRequests.find((item) => item.id === id);
  if (pullRequest.state === "MERGED") continue;
  const verdict = await loadVerdict(root, id);
  const live = liveCoordinates(project, pullRequest);
  const passing = verdict
    && ["PASS", "PASS+NOTES"].includes(verdict.verdict)
    && verdict.reviewerSession !== pullRequest.writerSession
    && verdict.baseSha === live.baseSha
    && verdict.headSha === live.headSha
    && verdict.patchId === live.patchId;
  if (!passing) {
    gap = { id, reason: verdict?.verdict === "FAIL" ? "failed-verdict" : verdict ? "stale-or-invalid-verdict" : "missing-verdict" };
    break;
  }
  landable.push(id);
}

process.stdout.write(`${JSON.stringify({
  authorizedMode: state.authorizedMode,
  landable,
  ceiling: landable.at(-1) ?? null,
  gap
}, null, 2)}\n`);
