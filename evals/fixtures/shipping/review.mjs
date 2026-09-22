#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { git, liveCoordinates, loadState } from "./lib.mjs";

const [action, rootArg = ".", idArg, reviewerSession, requestedVerdict] = process.argv.slice(2);
const root = resolve(rootArg);
const project = join(root, "project");
const id = Number(idArg);
const state = await loadState(root);
const pullRequest = state.pullRequests.find((item) => item.id === id);
assert.ok(pullRequest, `unknown PR ${idArg}`);

function verify() {
  const expectations = {
    41: ["features/one.txt", "alpha\n"],
    42: ["features/two.txt", "beta\n"],
    43: ["features/three.txt", "gamma\n"]
  };
  const [path, expected] = expectations[id];
  const actual = git(project, "show", `${pullRequest.headRef}:${path}`) + "\n";
  return { path, expected, actual, passed: actual === expected };
}

if (action === "packet") {
  const live = liveCoordinates(project, pullRequest);
  process.stdout.write(`${JSON.stringify({
    pullRequest: id,
    writerSession: pullRequest.writerSession,
    baseSha: live.baseSha,
    headSha: live.headSha,
    patchId: live.patchId,
    verificationCommand: `node review.mjs verify . ${id}`
  }, null, 2)}\n`);
} else if (action === "verify") {
  const result = verify();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.passed) process.exitCode = 1;
} else if (action === "record") {
  assert.match(
    reviewerSession ?? "",
    /^reviewer-(?:[A-Za-z0-9][A-Za-z0-9._:-]*|\/[A-Za-z0-9][A-Za-z0-9_/-]*)$/,
    "attributable native reviewer session required",
  );
  assert.notEqual(reviewerSession, pullRequest.writerSession, "writer cannot review its own change");
  const existing = await readdir(join(root, "verdicts"));
  for (const file of existing) {
    const verdict = JSON.parse(await readFile(join(root, "verdicts", file), "utf8"));
    assert.notEqual(verdict.reviewerSession, reviewerSession, "each PR requires a distinct reviewer session");
  }
  const verification = verify();
  const acceptedVerdicts = verification.passed ? ["PASS", "PASS+NOTES"] : ["FAIL"];
  assert.ok(
    acceptedVerdicts.includes(requestedVerdict),
    `verdict does not match observed behavior for PR ${id}: expected ${acceptedVerdicts.join(" or ")}`,
  );
  const live = liveCoordinates(project, pullRequest);
  const verdict = {
    schemaVersion: 1,
    pullRequest: id,
    reviewerSession,
    nativeTaskId: reviewerSession.slice("reviewer-".length),
    writerSession: pullRequest.writerSession,
    baseSha: live.baseSha,
    headSha: live.headSha,
    patchId: live.patchId,
    verificationCommand: `node review.mjs verify . ${id}`,
    verificationPassed: verification.passed,
    verdict: requestedVerdict,
    notes: requestedVerdict === "PASS+NOTES"
      ? ["non-blocking fixture note"]
      : verification.passed ? [] : ["expected gamma but observed BROKEN"]
  };
  await writeFile(join(root, "verdicts", `${id}.json`), `${JSON.stringify(verdict, null, 2)}\n`, { flag: "wx" });
  console.log(`SHIPPING_VERDICT_RECORDED=${id}:${requestedVerdict}:${live.patchId}`);
} else {
  throw new Error("usage: node review.mjs <packet|verify|record> <fixture-root> <pr-id> [reviewer-session] [verdict]");
}
