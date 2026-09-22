import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const execFileAsync = promisify(execFile);
const fixture = join(repoRoot, "evals", "fixtures", "shipping");

async function prepare() {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-shipping-"));
  await cp(fixture, root, { recursive: true });
  await execFileAsync(process.execPath, [join(root, "setup.mjs"), root]);
  return root;
}

async function record(root, id, reviewer, verdict) {
  return execFileAsync(process.execPath, [join(root, "review.mjs"), "record", root, String(id), reviewer, verdict]);
}

test("shipping lands only the revision-bound contiguous passing run", async () => {
  const root = await prepare();
  try {
    const packet = JSON.parse((await execFileAsync(process.execPath, [join(root, "review.mjs"), "packet", root, "41"])).stdout);
    assert.equal(packet.pullRequest, 41);
    assert.match(packet.patchId, /^[0-9a-f]{40}$/);
    await record(root, 41, "reviewer-Review41", "PASS");
    await record(root, 42, "reviewer-Review42", "PASS+NOTES");
    await record(root, 43, "reviewer-Review43", "FAIL");
    const initial = JSON.parse((await execFileAsync(process.execPath, [join(root, "frontier.mjs"), root])).stdout);
    assert.deepEqual(initial, { authorizedMode: "merge-now", landable: [41, 42], ceiling: 42, gap: { id: 43, reason: "failed-verdict" } });
    await execFileAsync(process.execPath, [join(root, "forge.mjs"), "status", root]);
    await execFileAsync(process.execPath, [join(root, "forge.mjs"), "merge", root, "41"]);
    const afterFirst = JSON.parse((await execFileAsync(process.execPath, [join(root, "frontier.mjs"), root])).stdout);
    assert.deepEqual(afterFirst.landable, [42]);
    await execFileAsync(process.execPath, [join(root, "forge.mjs"), "merge", root, "42"]);
    const terminal = JSON.parse((await execFileAsync(process.execPath, [join(root, "frontier.mjs"), root])).stdout);
    assert.deepEqual(terminal, { authorizedMode: "merge-now", landable: [], ceiling: null, gap: { id: 43, reason: "failed-verdict" } });
    await execFileAsync(process.execPath, [join(root, "forge.mjs"), "report", root]);
    const verified = await execFileAsync(process.execPath, [join(root, "verify.mjs"), root]);
    assert.match(verified.stdout, /^SHIPPING_OK=[0-9a-f]{40}\n$/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("shipping refuses an upper PR and a verdict whose reviewed head changed", async () => {
  const root = await prepare();
  try {
    await record(root, 41, "reviewer-a", "PASS");
    await assert.rejects(
      execFileAsync(process.execPath, [join(root, "forge.mjs"), "merge", root, "42"]),
      /only current bottom PR 41 may merge/,
    );
    const project = join(root, "project");
    await execFileAsync("git", ["checkout", "-q", "stack-1"], { cwd: project });
    await writeFile(join(project, "features", "one.txt"), "changed-after-review\n");
    await execFileAsync("git", ["add", "features/one.txt"], { cwd: project });
    await execFileAsync("git", ["commit", "-qm", "change reviewed head"], { cwd: project });
    await execFileAsync("git", ["checkout", "-q", "main"], { cwd: project });
    await assert.rejects(
      execFileAsync(process.execPath, [join(root, "forge.mjs"), "merge", root, "41"]),
      /stale head revision for PR 41/,
    );
    const state = JSON.parse(await readFile(join(root, "provider.json"), "utf8"));
    assert.deepEqual(state.merges, []);
    assert.equal(state.pullRequests[0].state, "OPEN");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("shipping accepts a clean PASS without fabricating reviewer notes", async () => {
  const root = await prepare();
  try {
    await record(root, 42, "reviewer-Review42", "PASS");
    const verdict = JSON.parse(await readFile(join(root, "verdicts", "42.json"), "utf8"));
    assert.equal(verdict.reviewerSession, "reviewer-Review42");
    assert.equal(verdict.nativeTaskId, "Review42");
    assert.equal(verdict.verdict, "PASS");
    assert.deepEqual(verdict.notes, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("shipping preserves a Codex canonical task name as native attribution", async () => {
  const root = await prepare();
  try {
    await record(root, 41, "reviewer-/root/pr41_review", "PASS");
    const verdict = JSON.parse(await readFile(join(root, "verdicts", "41.json"), "utf8"));
    assert.equal(verdict.reviewerSession, "reviewer-/root/pr41_review");
    assert.equal(verdict.nativeTaskId, "/root/pr41_review");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
