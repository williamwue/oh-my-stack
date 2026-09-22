#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const [action, rootArg = "."] = process.argv.slice(2);
const root = resolve(rootArg);
const statePath = join(root, "state.json");
const state = JSON.parse(await readFile(statePath, "utf8"));

if (action === "status") {
  process.stdout.write(`${JSON.stringify({
    revision: state.providerRevision,
    state: state.providerState,
    completionCount: state.completionCount,
  }, null, 2)}\n`);
} else if (action === "release") {
  assert.equal(state.providerRevision, "provider-r1", "provider revision drifted");
  assert.equal(state.providerState, "WAITING", "provider is not waiting");
  assert.equal(state.releaseCount, 0, "provider was already released");
  state.providerState = "READY";
  state.releaseCount = 1;
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  console.log("AUTONOMOUS_WAKE_RELEASED=provider-r1");
} else {
  throw new Error("usage: node provider.mjs <status|release> <fixture-root>");
}
