#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const expectedWakeStrategy = process.argv[3] ?? "codex-thread-heartbeat";
const state = JSON.parse(await readFile(join(root, "state.json"), "utf8"));
const checkpoint = JSON.parse(await readFile(join(root, "checkpoint.json"), "utf8"));
const report = JSON.parse(await readFile(join(root, "report.json"), "utf8"));
const decisions = (await readFile(join(root, "decisions.tsv"), "utf8")).trimEnd().split("\n");
assert.deepEqual(state, {
  schemaVersion: 1,
  providerRevision: "provider-r1",
  providerState: "READY",
  releaseCount: 1,
  completionCount: 1,
  measurementCount: 2,
});
assert.equal(checkpoint.automationId, report.automationId);
assert.equal(checkpoint.wakeCount, 1);
assert.equal(checkpoint.observedState, "READY");
assert.equal(checkpoint.status, "complete");
assert.equal(decisions.length, 3);
assert.match(decisions[1], /\twake-0\tschedule heartbeat\tprovider waiting\tprovider-r1 WAITING\twaiting$/);
assert.match(decisions[2], /\twake-1\taccept provider receipt\tpredicate advanced\tprovider-r1 READY\tpredicate-met$/);
assert.deepEqual(report, {
  workflow: "autonomous-run",
  exitPredicate: "provider-r1 READY, receipt accepted, heartbeat disarmed",
  budget: { maxWakeRuns: 2, maxMinutes: 15 },
  wakeStrategy: expectedWakeStrategy,
  automationId: checkpoint.automationId,
  wakeRuns: 1,
  finalProviderRevision: "provider-r1",
  finalProviderState: "READY",
  completionReceipt: "accepted",
  cleanup: "verified-disarmed",
  stopReason: "predicate-met",
  published: false,
  result: "complete",
});
console.log(`AUTONOMOUS_WAKE_OK=${checkpoint.automationId}`);
