import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const execFileAsync = promisify(execFile);
const fixture = join(repoRoot, "evals", "fixtures", "autonomous-run-wake");
const at = (instant) => ({ env: { ...process.env, OMS_FIXTURE_NOW: instant } });

async function prepare() {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-autonomous-wake-"));
  await cp(fixture, root, { recursive: true });
  await execFileAsync(process.execPath, [join(root, "setup.mjs"), root]);
  return root;
}

test("autonomous wake persists one bounded heartbeat handoff and consumes one ready event", async () => {
  const root = await prepare();
  const automationId = "fixture-heartbeat-1";
  try {
    await execFileAsync(process.execPath, [join(root, "wake.mjs"), "pause", root, automationId], at("2026-09-22T00:00:00Z"));
    await execFileAsync(process.execPath, [join(root, "verify-pause.mjs"), root]);
    await execFileAsync(process.execPath, [join(root, "provider.mjs"), "release", root]);
    await execFileAsync(process.execPath, [join(root, "wake.mjs"), "resume", root, automationId], at("2026-09-22T00:01:00Z"));
    await execFileAsync(process.execPath, [join(root, "wake.mjs"), "cleanup", root, automationId]);
    const verified = await execFileAsync(process.execPath, [join(root, "verify-final.mjs"), root]);
    assert.match(verified.stdout, /AUTONOMOUS_WAKE_OK=fixture-heartbeat-1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("autonomous wake rejects an early or mismatched resume without consuming the wake", async () => {
  const root = await prepare();
  try {
    await execFileAsync(process.execPath, [join(root, "wake.mjs"), "pause", root, "fixture-heartbeat-1"], at("2026-09-22T00:00:00Z"));
    await assert.rejects(
      execFileAsync(process.execPath, [join(root, "wake.mjs"), "resume", root, "wrong-heartbeat"], at("2026-09-22T00:00:30Z")),
      /automation id does not match checkpoint/,
    );
    await assert.rejects(
      execFileAsync(process.execPath, [join(root, "wake.mjs"), "resume", root, "fixture-heartbeat-1"], at("2026-09-22T00:00:30Z")),
      /next observation time has not arrived/,
    );
    const checkpoint = JSON.parse(await readFile(join(root, "checkpoint.json"), "utf8"));
    const state = JSON.parse(await readFile(join(root, "state.json"), "utf8"));
    assert.equal(checkpoint.wakeCount, 0);
    assert.equal(checkpoint.status, "waiting");
    assert.equal(state.completionCount, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("autonomous wake rejects an expired deadline without consuming the ready event", async () => {
  const root = await prepare();
  const automationId = "fixture-heartbeat-1";
  try {
    await execFileAsync(process.execPath, [join(root, "wake.mjs"), "pause", root, automationId], at("2026-09-22T00:00:00Z"));
    await execFileAsync(process.execPath, [join(root, "provider.mjs"), "release", root]);
    await assert.rejects(
      execFileAsync(process.execPath, [join(root, "wake.mjs"), "resume", root, automationId], at("2026-09-22T00:15:01Z")),
      /wake deadline exceeded/,
    );
    const checkpoint = JSON.parse(await readFile(join(root, "checkpoint.json"), "utf8"));
    const state = JSON.parse(await readFile(join(root, "state.json"), "utf8"));
    assert.equal(checkpoint.wakeCount, 0);
    assert.equal(checkpoint.status, "waiting");
    assert.equal(state.completionCount, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("autonomous wake rejects an exhausted wake budget before consuming the ready event", async () => {
  const root = await prepare();
  const automationId = "fixture-heartbeat-1";
  try {
    await execFileAsync(process.execPath, [join(root, "wake.mjs"), "pause", root, automationId], at("2026-09-22T00:00:00Z"));
    await execFileAsync(process.execPath, [join(root, "provider.mjs"), "release", root]);
    const checkpointPath = join(root, "checkpoint.json");
    const checkpoint = JSON.parse(await readFile(checkpointPath, "utf8"));
    checkpoint.wakeCount = checkpoint.budget.maxWakeRuns;
    await writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`);
    await assert.rejects(
      execFileAsync(process.execPath, [join(root, "wake.mjs"), "resume", root, automationId], at("2026-09-22T00:01:00Z")),
      /wake budget exhausted/,
    );
    const unchanged = JSON.parse(await readFile(checkpointPath, "utf8"));
    const state = JSON.parse(await readFile(join(root, "state.json"), "utf8"));
    assert.equal(unchanged.wakeCount, 2);
    assert.equal(unchanged.status, "waiting");
    assert.equal(state.completionCount, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
