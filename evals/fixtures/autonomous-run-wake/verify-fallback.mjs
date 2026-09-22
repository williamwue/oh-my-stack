#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const state = JSON.parse(await readFile(join(root, "state.json"), "utf8"));
const checkpoint = JSON.parse(await readFile(join(root, "checkpoint.json"), "utf8"));
const decisions = (await readFile(join(root, "decisions.tsv"), "utf8").then((value) => value.trimEnd().split("\n")));
assert.deepEqual(state, {
  schemaVersion: 1,
  providerRevision: "provider-r1",
  providerState: "WAITING",
  releaseCount: 0,
  completionCount: 0,
  measurementCount: 1,
});
assert.equal(checkpoint.providerRevision, "provider-r1");
assert.equal(checkpoint.observedState, "WAITING");
assert.equal(checkpoint.wakeStrategy, "durable-pause-no-scheduled-wake");
assert.equal(checkpoint.automationId, null);
assert.deepEqual(checkpoint.budget, { maxWakeRuns: 0, maxMinutes: 15 });
assert.equal(checkpoint.wakeCount, 0);
assert.equal(checkpoint.status, "paused-no-wake");
assert.equal(Date.parse(checkpoint.nextObservationAt) - Date.parse(checkpoint.createdAt), 60_000);
assert.equal(Date.parse(checkpoint.deadlineAt) - Date.parse(checkpoint.createdAt), 15 * 60_000);
assert.equal(decisions.length, 2);
assert.match(decisions[1], /\twake-0\tpause durably\twake unavailable\tprovider-r1 WAITING\tpaused$/);
await assert.rejects(access(join(root, "report.json"), constants.F_OK));
console.log("AUTONOMOUS_WAKE_FALLBACK_OK=provider-r1");
