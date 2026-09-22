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
    await record(root, 41, "reviewer-a", "PASS");
    await record(root, 42, "reviewer-b", "PASS+NOTES");
    await record(root, 43, "reviewer-c", "FAIL");
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
