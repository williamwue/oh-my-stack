import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const execFileAsync = promisify(execFile);
const fixture = join(repoRoot, "evals", "fixtures", "orchestrate");

async function prepare() {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-orchestrate-"));
  await cp(fixture, root, { recursive: true });
  await execFileAsync(process.execPath, [join(root, "setup.mjs"), root]);
  return root;
}

async function program(root, ...args) {
  return execFileAsync(process.execPath, [join(root, "program.mjs"), ...args, root]);
}

async function action(root, actionName, id, actor, verdict) {
  const args = [join(root, "program.mjs"), actionName, root];
  if (id !== undefined) args.push(id);
  if (actor !== undefined) args.push(actor);
  if (verdict !== undefined) args.push(verdict);
  return execFileAsync(process.execPath, args);
}

async function execute(root, id, worker) {
  return execFileAsync(process.execPath, [join(root, "unit.mjs"), "execute", root, id, worker]);
}

async function verifyAndRecord(root, id, reviewer) {
  const verification = JSON.parse((await execFileAsync(process.execPath, [join(root, "unit.mjs"), "verify", root, id])).stdout);
  assert.equal(verification.passed, true);
  await action(root, "verdict", id, reviewer, "PASS");
}

async function runUnit(root, id, worker, reviewer) {
  await action(root, "brief", id);
  await action(root, "start", id, worker);
  await execute(root, id, worker);
  await action(root, "drain");
  await verifyAndRecord(root, id, reviewer);
  await action(root, "integrate", id);
}

test("orchestrate pilots, drains a rolling window, relays receipts, and closes at 4/4", async () => {
  const root = await prepare();
  try {
    await runUnit(root, "pilot", "worker-/root/pilot_writer", "reviewer-/root/pilot_reviewer");

    await action(root, "brief", "alpha");
    await action(root, "brief", "beta");
    await action(root, "start", "alpha", "worker-/root/alpha_writer");
    await action(root, "start", "beta", "worker-/root/beta_writer");
    await execute(root, "alpha", "worker-/root/alpha_writer");
    await action(root, "drain");
    await verifyAndRecord(root, "alpha", "reviewer-/root/alpha_reviewer");
    await action(root, "integrate", "alpha");

    const mid = JSON.parse((await action(root, "status")).stdout);
    assert.deepEqual(mid.inFlight, ["beta"]);
    assert.equal(mid.states.beta, "running");

    await execute(root, "beta", "worker-/root/beta_writer");
    await action(root, "drain");
    await verifyAndRecord(root, "beta", "reviewer-/root/beta_reviewer");
    await action(root, "integrate", "beta");

    await runUnit(root, "join", "worker-/root/join_writer", "reviewer-/root/join_reviewer");
    await action(root, "report");
    const verified = await execFileAsync(process.execPath, [join(root, "verify.mjs"), root]);
    assert.match(verified.stdout, /^ORCHESTRATE_OK=[0-9a-f]{40}\n$/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("orchestrate rejects fan-out before the pilot and integration without a current verdict", async () => {
  const root = await prepare();
  try {
    await assert.rejects(action(root, "brief", "alpha"), /dependencies are not integrated/);
    await action(root, "brief", "pilot");
    await action(root, "start", "pilot", "worker-pilot");
    await execute(root, "pilot", "worker-pilot");
    await action(root, "drain");
    await assert.rejects(action(root, "integrate", "pilot"), /is not verified/);
    await verifyAndRecord(root, "pilot", "reviewer-pilot");
    await writeFile(join(root, "outputs", "pilot.txt"), "changed-after-verdict\n");
    await assert.rejects(action(root, "integrate", "pilot"), /verdict is stale/);
    const state = JSON.parse(await readFile(join(root, "program.json"), "utf8"));
    assert.equal(state.integrations.length, 0);
    assert.equal(state.units[0].state, "verified");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
