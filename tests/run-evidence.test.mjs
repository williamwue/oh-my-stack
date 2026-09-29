import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { DurableRunState } from "../tools/durable-run-state.mjs";
import { formatEvidenceStatus, getEvidenceStatus, recordReceipt } from "../tools/run-evidence.mjs";

const execFileAsync = promisify(execFile);
const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "tools", "run-evidence.mjs");
const commitA = "a".repeat(40);
const commitB = "b".repeat(40);

async function fixture(t) {
  const storeRoot = await mkdtemp(join(tmpdir(), "oms-run-evidence-"));
  t.after(() => rm(storeRoot, { recursive: true, force: true }));
  const runStorePath = join(storeRoot, "run.json");
  const evidenceStorePath = join(storeRoot, "evidence.json");
  const run = await DurableRunState.create({ storePath: runStorePath, storeRoot, runId: "run-1", generation: 2 });
  await run.append({ eventId: "start", generation: 2, revision: 1, type: "start", payload: {} });
  await run.append({ eventId: "done", generation: 2, revision: 2, type: "completed", payload: {} });
  return { storeRoot, runStorePath, evidenceStorePath };
}

function receipt(overrides = {}) {
  return {
    receiptId: "verify-1", runId: "run-1", generation: 2, runRevision: 2,
    sourceCommit: commitA,
    command: ["node", "--test", "tests/unit.test.mjs"],
    result: { exitCode: 0 },
    checks: [{ name: "unit", status: "pass" }, { name: "browser", status: "unknown" }],
    ...overrides,
  };
}

test("a recovered terminal run accepts revision-bound receipts and keeps unknown explicit", async (t) => {
  const paths = await fixture(t);
  const common = { ...paths, currentSourceCommit: commitA };
  const before = await getEvidenceStatus({ ...common, runId: "run-1", generation: 2 });
  assert.equal(before.status, "unknown");
  assert.deepEqual(before.checks, []);
  const first = await recordReceipt({ ...common, receipt: receipt() });
  assert.equal(first.duplicate, false);
  assert.equal(first.evidenceRevision, 2);
  const after = await getEvidenceStatus({ ...common, runId: "run-1", generation: 2 });
  assert.equal(after.runStatus, "completed");
  assert.equal(after.status, "unknown");
  assert.deepEqual(after.checks.map(({ status }) => status), ["pass", "unknown"]);
  assert.match(formatEvidenceStatus(after), /Verification: unknown/);
  const onDisk = JSON.parse(await readFile(paths.evidenceStorePath, "utf8"));
  assert.deepEqual(onDisk.events.map(({ type }) => type), ["start", "checkpoint"]);
});

test("receipt replay is idempotent and a conflicting receipt ID is refused", async (t) => {
  const paths = await fixture(t);
  const common = { ...paths, currentSourceCommit: commitA };
  await recordReceipt({ ...common, receipt: receipt() });
  assert.equal((await recordReceipt({ ...common, receipt: receipt() })).duplicate, true);
  await assert.rejects(recordReceipt({ ...common, receipt: receipt({ command: ["node", "--test", "tests/other.test.mjs"] }) }), (error) => error.code === "RECEIPT_CONFLICT");
  const evidence = await DurableRunState.load({ storePath: paths.evidenceStorePath, storeRoot: paths.storeRoot, runId: "run-1", generation: 2 });
  assert.equal(evidence.state.revision, 2);
});

test("run identity, generation, revision, source, and secret-bearing fields fail closed", async (t) => {
  const paths = await fixture(t);
  const common = { ...paths, currentSourceCommit: commitA };
  for (const [changed, code] of [
    [{ runId: "other" }, "RUN_MISMATCH"],
    [{ generation: 1 }, "STALE_GENERATION"],
    [{ runRevision: 1 }, "STALE_REVISION"],
    [{ sourceCommit: commitB }, "STALE_SOURCE"],
    [{ token: "not-allowed" }, "SECRET_DATA"],
    [{ command: ["tool", "--api-key=value"] }, "SECRET_DATA"],
  ]) {
    await assert.rejects(recordReceipt({ ...common, receipt: receipt(changed) }), (error) => error.code === code);
  }
  await assert.rejects(recordReceipt({ ...common, currentSourceCommit: commitB, receipt: receipt() }), (error) => error.code === "STALE_SOURCE");
});

test("a failed command cannot be reported as an all-pass verification", async (t) => {
  const paths = await fixture(t);
  const common = { ...paths, currentSourceCommit: commitA };
  await assert.rejects(recordReceipt({ ...common, receipt: receipt({ result: { exitCode: 1 }, checks: [{ name: "unit", status: "pass" }] }) }), (error) => error.code === "INVALID_RECEIPT");
  await recordReceipt({ ...common, receipt: receipt({ result: { exitCode: 1 }, checks: [{ name: "unit", status: "fail" }] }) });
  const status = await getEvidenceStatus({ ...common, runId: "run-1", generation: 2 });
  assert.equal(status.status, "fail");
});

test("reserved receipt ID is rejected before an evidence store is created", async (t) => {
  const paths = await fixture(t);
  await assert.rejects(
    recordReceipt({ ...paths, currentSourceCommit: commitA, receipt: receipt({ receiptId: "evidence-start" }) }),
    (error) => error.code === "INVALID_RECEIPT",
  );
  await assert.rejects(stat(paths.evidenceStorePath), (error) => error.code === "ENOENT");
});

test("source changes make old evidence stale and a fresh receipt restores current status", async (t) => {
  const paths = await fixture(t);
  await recordReceipt({ ...paths, currentSourceCommit: commitA, receipt: receipt({ checks: [{ name: "unit", status: "pass" }] }) });
  const stale = await getEvidenceStatus({ ...paths, runId: "run-1", generation: 2, currentSourceCommit: commitB });
  assert.equal(stale.status, "stale");
  assert.deepEqual(stale.checks, []);
  assert.equal(stale.staleReceipts[0].receiptId, "verify-1");
  await recordReceipt({ ...paths, currentSourceCommit: commitB, receipt: receipt({ receiptId: "verify-2", sourceCommit: commitB, checks: [{ name: "unit", status: "fail" }] }) });
  const current = await getEvidenceStatus({ ...paths, runId: "run-1", generation: 2, currentSourceCommit: commitB });
  assert.equal(current.status, "fail");
  assert.equal(current.staleReceipts.length, 1);
});

test("advancing the recovered run revision makes previous receipts stale", async (t) => {
  const storeRoot = await mkdtemp(join(tmpdir(), "oms-run-evidence-revision-"));
  t.after(() => rm(storeRoot, { recursive: true, force: true }));
  const paths = { storeRoot, runStorePath: join(storeRoot, "run.json"), evidenceStorePath: join(storeRoot, "evidence.json") };
  const run = await DurableRunState.create({ storePath: paths.runStorePath, storeRoot, runId: "run-1", generation: 2 });
  await run.append({ eventId: "start", generation: 2, revision: 1, type: "start", payload: {} });
  await recordReceipt({ ...paths, currentSourceCommit: commitA, receipt: receipt({ runRevision: 1, checks: [{ name: "unit", status: "pass" }] }) });
  const recovered = await DurableRunState.load({ storePath: paths.runStorePath, storeRoot, runId: "run-1", generation: 2 });
  await recovered.append({ eventId: "step", generation: 2, revision: 2, type: "checkpoint", payload: {} });
  const status = await getEvidenceStatus({ ...paths, runId: "run-1", generation: 2, currentSourceCommit: commitA });
  assert.equal(status.status, "stale");
  assert.deepEqual(status.checks, []);
  assert.equal(status.staleReceipts[0].runRevision, 1);
});

test("CLI status reports JSON and human status without writing to the evidence store", async (t) => {
  const paths = await fixture(t);
  const baseArgs = ["--run-store", paths.runStorePath, "--evidence-store", paths.evidenceStorePath, "--store-root", paths.storeRoot, "--source-commit", commitA];
  const statusArgs = [...baseArgs, "--run-id", "run-1", "--generation", "2"];
  const first = await execFileAsync(process.execPath, [cli, "status", ...statusArgs, "--json"]);
  assert.equal(JSON.parse(first.stdout).status, "unknown");
  const receiptPath = join(paths.storeRoot, "receipt.json");
  await writeFile(receiptPath, JSON.stringify(receipt()));
  const recorded = await execFileAsync(process.execPath, [cli, "record", ...baseArgs, "--receipt", receiptPath]);
  assert.equal(JSON.parse(recorded.stdout).duplicate, false);
  const human = await execFileAsync(process.execPath, [cli, "status", ...statusArgs]);
  assert.match(human.stdout, /Verification: unknown/);
  const json = await execFileAsync(process.execPath, [cli, "status", ...statusArgs, "--json"]);
  assert.deepEqual(JSON.parse(json.stdout).checks.map(({ name }) => name), ["unit", "browser"]);
  const before = await readFile(paths.evidenceStorePath, "utf8");
  await execFileAsync(process.execPath, [cli, "status", ...statusArgs]);
  assert.equal(await readFile(paths.evidenceStorePath, "utf8"), before);
});
