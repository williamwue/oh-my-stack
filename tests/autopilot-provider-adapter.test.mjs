import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { AutopilotProviderAdapter, AutopilotProviderError } from "../tools/autopilot-provider-adapter.mjs";

const execFileAsync = promisify(execFile);

async function providerFixture() {
  const root = await mkdtemp(join(tmpdir(), "oms-autopilot-provider-"));
  const provider = await AutopilotProviderAdapter.create({
    storeRoot: root,
    storePath: join(root, "run.json"),
    runId: "autopilot-test",
    generation: 1,
  });
  return { root, provider };
}

test("local provider drives a PR through CI failure, retry, approval, and merge", async () => {
  const { root, provider } = await providerFixture();
  try {
    const branch = await provider.createBranchIntent({ branch: "change/one", operationId: "branch-one" });
    assert.equal(branch.status, "created");
    const created = await provider.createPullRequestIntent({
      branch: "change/one",
      checks: ["lint", "test"],
      operationId: "pr-one",
      expectedRevision: branch.revision,
    });
    const prId = created.pullRequest.id;
    const pending = await provider.recordCiStatus({ pullRequestId: prId, check: "lint", status: "pending", operationId: "ci-lint-pending", expectedRevision: created.revision });
    const failed = await provider.recordCiStatus({ pullRequestId: prId, check: "test", status: "failed", operationId: "ci-test-failed", expectedRevision: pending.revision });
    const retried = await provider.retryFailedChecks({ pullRequestId: prId, operationId: "retry-test", expectedRevision: failed.revision });
    assert.deepEqual(retried.retried, ["test"]);
    const duplicate = await provider.retryFailedChecks({ pullRequestId: prId, operationId: "retry-test", expectedRevision: failed.revision });
    assert.equal(duplicate.duplicate, true);
    const passedLint = await provider.recordCiStatus({ pullRequestId: prId, check: "lint", status: "passed", operationId: "ci-lint-passed", expectedRevision: retried.revision });
    const passedTest = await provider.recordCiStatus({ pullRequestId: prId, check: "test", status: "passed", operationId: "ci-test-passed", expectedRevision: passedLint.revision });
    const approved = await provider.recordApproval({ pullRequestId: prId, approver: "reviewer-1", operationId: "approval-one", expectedRevision: passedTest.revision });
    const merged = await provider.mergePullRequest({ pullRequestId: prId, operationId: "merge-one", expectedRevision: approved.revision });
    assert.equal(merged.status, "merged");
    assert.equal(provider.state.pullRequests[prId].status, "MERGED");
    assert.equal(provider.durableState.status, "completed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("stale revisions fail closed and a blocked merge records a deterministic failure", async () => {
  const { root, provider } = await providerFixture();
  try {
    const branch = await provider.createBranch({ branch: "change/two", operationId: "branch-two" });
    const created = await provider.createPullRequest({ branch: "change/two", checks: ["test"], operationId: "pr-two", expectedRevision: branch.revision });
    await assert.rejects(
      provider.recordCiStatus({ pullRequestId: created.pullRequest.id, check: "test", status: "failed", operationId: "stale-ci", expectedRevision: branch.revision }),
      (error) => error instanceof AutopilotProviderError && error.code === "STALE_REVISION",
    );
    const failedMerge = await provider.merge({ pullRequestId: created.pullRequest.id, operationId: "merge-blocked", expectedRevision: created.revision });
    assert.deepEqual({ status: failedMerge.status, reason: failedMerge.reason }, { status: "failed", reason: "CHECKS_NOT_PASSED" });
    assert.equal(provider.state.pullRequests[created.pullRequest.id].mergeAttempts.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("state recovers across a subprocess boundary without provider credentials", async () => {
  const { root, provider } = await providerFixture();
  try {
    const created = await provider.createBranch({ branch: "change/subprocess", operationId: "branch-subprocess" });
    const script = [
      "import { AutopilotProviderAdapter } from './tools/autopilot-provider-adapter.mjs';",
      "const [root] = process.argv.slice(1);",
      "const p = await AutopilotProviderAdapter.load({ storeRoot: root, storePath: root + '/run.json', runId: 'autopilot-test', generation: 1 });",
      "console.log(JSON.stringify({ revision: p.state.revision, branch: p.state.branches['change/subprocess'].name, durable: p.durableState.revision }));",
    ].join(" ");
    const output = await execFileAsync(process.execPath, ["--input-type=module", "-e", script, root], { cwd: process.cwd(), encoding: "utf8" });
    assert.deepEqual(JSON.parse(output.stdout.trim()), { revision: created.revision, branch: "change/subprocess", durable: created.revision });
    const source = await readFile(join(process.cwd(), "tools", "autopilot-provider-adapter.mjs"), "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /https?:\/\//);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
