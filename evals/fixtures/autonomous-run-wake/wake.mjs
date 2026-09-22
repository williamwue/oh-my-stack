#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const [action, rootArg = ".", automationId] = process.argv.slice(2);
const root = resolve(rootArg);
const statePath = join(root, "state.json");
const checkpointPath = join(root, "checkpoint.json");
const decisionsPath = join(root, "decisions.tsv");
const reportPath = join(root, "report.json");
const state = JSON.parse(await readFile(statePath, "utf8"));
const fixtureNow = process.env.OMS_FIXTURE_NOW;
if (fixtureNow !== undefined) {
  assert.match(fixtureNow, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, "OMS_FIXTURE_NOW must be an ISO UTC second");
  assert.ok(Number.isFinite(Date.parse(fixtureNow)), "OMS_FIXTURE_NOW must be a valid instant");
}
const now = () => fixtureNow === undefined ? new Date() : new Date(fixtureNow);
const timestamp = () => now().toISOString().replace(/\.\d{3}Z$/, "Z");
const requireAutomationId = () => {
  assert.match(automationId ?? "", /^[A-Za-z0-9][A-Za-z0-9._:-]{2,}$/, "runtime-issued automation id required");
};

function validateWaitingCheckpoint(checkpoint) {
  requireAutomationId();
  assert.equal(checkpoint.automationId, automationId, "automation id does not match checkpoint");
  assert.equal(checkpoint.providerRevision, state.providerRevision, "provider revision drifted");
  assert.equal(checkpoint.status, "waiting", "checkpoint is not waiting");
  assert.ok(Number.isInteger(checkpoint.wakeCount) && checkpoint.wakeCount >= 0, "wake count is invalid");
  assert.ok(checkpoint.wakeCount < checkpoint.budget.maxWakeRuns, "wake budget exhausted");
  assert.ok(now().getTime() >= Date.parse(checkpoint.nextObservationAt), "next observation time has not arrived");
  assert.ok(now().getTime() <= Date.parse(checkpoint.deadlineAt), "wake deadline exceeded");
}

async function pauseScheduled(wakeStrategy) {
  requireAutomationId();
  assert.equal(state.providerRevision, "provider-r1");
  assert.equal(state.providerState, "WAITING", "pause requires a waiting provider");
  assert.equal(state.releaseCount, 0);
  assert.equal(state.completionCount, 0);
  const createdAt = now();
  const checkpoint = {
    schemaVersion: 1,
    workflow: "autonomous-run",
    exitPredicate: "provider-r1 READY, receipt accepted, heartbeat disarmed",
    measurement: "node provider.mjs status .",
    budget: { maxWakeRuns: 2, maxMinutes: 15 },
    authorizedWrites: ["state.json", "checkpoint.json", "decisions.tsv", "report.json"],
    stopConditions: ["predicate-met", "budget", "deadline", "revision-drift", "checkpoint-mismatch", "wake-unavailable", "cleanup-failure"],
    providerRevision: "provider-r1",
    observedState: "WAITING",
    wakeStrategy,
    automationId,
    createdAt: createdAt.toISOString().replace(/\.\d{3}Z$/, "Z"),
    nextObservationAt: new Date(createdAt.getTime() + 60_000).toISOString().replace(/\.\d{3}Z$/, "Z"),
    deadlineAt: new Date(createdAt.getTime() + 15 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z"),
    wakeCount: 0,
    status: "waiting",
  };
  await writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, { flag: "wx" });
  await writeFile(decisionsPath, [
    "ts\tphase\tdecision\twhy\tevidence\tresult",
    `${timestamp()}\twake-0\tschedule heartbeat\tprovider waiting\tprovider-r1 WAITING\twaiting`,
    "",
  ].join("\n"), { flag: "wx" });
  console.log(`AUTONOMOUS_WAKE_PAUSED=${automationId}`);
}

if (action === "pause") {
  await pauseScheduled("codex-thread-heartbeat");
} else if (action === "pause-cron") {
  await pauseScheduled("codex-standalone-cron");
} else if (action === "pause-fallback") {
  assert.equal(automationId, undefined, "fallback must not invent an automation id");
  assert.equal(state.providerRevision, "provider-r1");
  assert.equal(state.providerState, "WAITING", "fallback pause requires a waiting provider");
  assert.equal(state.releaseCount, 0);
  assert.equal(state.completionCount, 0);
  const createdAt = now();
  const checkpoint = {
    schemaVersion: 1,
    workflow: "autonomous-run",
    exitPredicate: "provider-r1 READY, receipt accepted by a later authorized pickup",
    measurement: "node provider.mjs status .",
    budget: { maxWakeRuns: 0, maxMinutes: 15 },
    authorizedWrites: ["state.json", "checkpoint.json", "decisions.tsv"],
    stopConditions: ["wake-unavailable", "budget", "deadline", "revision-drift", "checkpoint-mismatch"],
    providerRevision: "provider-r1",
    observedState: "WAITING",
    wakeStrategy: "durable-pause-no-scheduled-wake",
    automationId: null,
    createdAt: createdAt.toISOString().replace(/\.\d{3}Z$/, "Z"),
    nextObservationAt: new Date(createdAt.getTime() + 60_000).toISOString().replace(/\.\d{3}Z$/, "Z"),
    deadlineAt: new Date(createdAt.getTime() + 15 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z"),
    wakeCount: 0,
    status: "paused-no-wake",
  };
  await writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, { flag: "wx" });
  await writeFile(decisionsPath, [
    "ts\tphase\tdecision\twhy\tevidence\tresult",
    `${timestamp()}\twake-0\tpause durably\twake unavailable\tprovider-r1 WAITING\tpaused`,
    "",
  ].join("\n"), { flag: "wx" });
  console.log("AUTONOMOUS_WAKE_FALLBACK_PAUSED=provider-r1");
} else if (action === "preflight") {
  const checkpoint = JSON.parse(await readFile(checkpointPath, "utf8"));
  validateWaitingCheckpoint(checkpoint);
  console.log(`AUTONOMOUS_WAKE_PREFLIGHT_OK=${automationId}`);
} else if (action === "resume") {
  const checkpoint = JSON.parse(await readFile(checkpointPath, "utf8"));
  validateWaitingCheckpoint(checkpoint);
  assert.equal(state.providerState, "READY", "provider is not ready");
  assert.equal(state.releaseCount, 1, "provider release count is not exactly one");
  assert.equal(state.completionCount, 0, "completion already recorded");
  checkpoint.wakeCount += 1;
  checkpoint.observedState = "READY";
  checkpoint.status = "predicate-met-pending-cleanup";
  state.completionCount = 1;
  await writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`);
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await writeFile(decisionsPath, `${timestamp()}\twake-${checkpoint.wakeCount}\taccept provider receipt\tpredicate advanced\tprovider-r1 READY\tpredicate-met\n`, { flag: "a" });
  await writeFile(reportPath, `${JSON.stringify({
    workflow: "autonomous-run",
    exitPredicate: checkpoint.exitPredicate,
    budget: checkpoint.budget,
    wakeStrategy: checkpoint.wakeStrategy,
    automationId,
    wakeRuns: checkpoint.wakeCount,
    finalProviderRevision: "provider-r1",
    finalProviderState: "READY",
    completionReceipt: "accepted",
    cleanup: "pending-disarm-verification",
    stopReason: "predicate-met",
    published: false,
    result: "complete-pending-cleanup",
  }, null, 2)}\n`, { flag: "wx" });
  console.log(`AUTONOMOUS_WAKE_RESUMED=${automationId}`);
} else if (action === "cleanup") {
  requireAutomationId();
  const checkpoint = JSON.parse(await readFile(checkpointPath, "utf8"));
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(checkpoint.automationId, automationId, "automation id does not match checkpoint");
  assert.equal(checkpoint.status, "predicate-met-pending-cleanup", "predicate is not awaiting cleanup");
  assert.equal(checkpoint.wakeCount, 1, "exactly one wake must be consumed before cleanup");
  assert.equal(state.completionCount, 1, "completion receipt is missing");
  assert.equal(report.cleanup, "pending-disarm-verification");
  assert.equal(report.result, "complete-pending-cleanup");
  checkpoint.status = "complete";
  report.cleanup = "verified-disarmed";
  report.result = "complete";
  await writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`AUTONOMOUS_WAKE_CLEAN=${automationId}`);
} else {
  throw new Error("usage: node wake.mjs <pause|pause-cron|pause-fallback|preflight|resume|cleanup> <fixture-root> [automation-id]");
}
