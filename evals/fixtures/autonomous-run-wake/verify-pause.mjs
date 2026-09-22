#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const state = JSON.parse(await readFile(join(root, "state.json"), "utf8"));
const checkpoint = JSON.parse(await readFile(join(root, "checkpoint.json"), "utf8"));
const decisions = (await readFile(join(root, "decisions.tsv"), "utf8")).trimEnd().split("\n");
assert.deepEqual(state, {
  schemaVersion: 1,
  providerRevision: "provider-r1",
  providerState: "WAITING",
  releaseCount: 0,
  completionCount: 0,
});
assert.equal(checkpoint.providerRevision, "provider-r1");
assert.equal(checkpoint.observedState, "WAITING");
assert.equal(checkpoint.wakeStrategy, "codex-thread-heartbeat");
assert.equal(checkpoint.wakeCount, 0);
assert.equal(checkpoint.status, "waiting");
assert.match(checkpoint.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
assert.equal(Date.parse(checkpoint.nextObservationAt) - Date.parse(checkpoint.createdAt), 60_000);
assert.equal(Date.parse(checkpoint.deadlineAt) - Date.parse(checkpoint.createdAt), 15 * 60_000);
assert.equal(decisions.length, 2);
await assert.rejects(access(join(root, "report.json"), constants.F_OK));
console.log(`AUTONOMOUS_WAKE_PAUSE_OK=${checkpoint.automationId}`);
