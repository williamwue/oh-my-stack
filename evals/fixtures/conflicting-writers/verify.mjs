#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const mode = process.argv[2];
assert.ok(["baseline", "combined"].includes(mode));

const nonce = `${Date.now()}-${Math.random()}`;
const { ingestion, retry } = await import(`./workspace/settings.mjs?${nonce}`);
const expected = mode === "baseline"
  ? { maxBatch: 10, delayMs: 100 }
  : { maxBatch: 25, delayMs: 250 };
assert.equal(ingestion.maxBatch, expected.maxBatch);
assert.equal(retry.delayMs, expected.delayMs);

const workspace = await readFile("workspace/settings.mjs");
const expectedFile = await readFile("expected/settings.mjs");
if (mode === "combined") assert.deepEqual(workspace, expectedFile);

const files = ["intent.md", "ownership.md", "workspace/settings.mjs", "expected/settings.mjs"];
const hashes = {};
for (const path of files) {
  hashes[path] = createHash("sha256").update(await readFile(path)).digest("hex");
}

process.stdout.write(`${JSON.stringify({ mode, settings: expected, hashes })}\n`);
