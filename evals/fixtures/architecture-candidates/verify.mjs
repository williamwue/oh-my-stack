#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const expected = process.argv[2];
assert.equal(expected, "durable-log", "the frozen requirements select durable-log");

const files = [
  "requirements.md",
  "candidates/memory-queue.md",
  "candidates/durable-log.md",
];
const hashes = {};
for (const path of files) {
  const content = await readFile(path);
  hashes[path] = createHash("sha256").update(content).digest("hex");
}

const requirements = await readFile("requirements.md", "utf8");
const memory = await readFile("candidates/memory-queue.md", "utf8");
const durable = await readFile("candidates/durable-log.md", "utf8");
assert.match(requirements, /recover it following an immediate process\n  crash/);
assert.match(requirements, /without replaying already committed events/);
assert.match(memory, /crash discards every acknowledged but unprocessed event/);
assert.match(memory, /no\n+durable committed offset/);
assert.match(durable, /acknowledge only after the flush succeeds/);
assert.match(durable, /resume after the committed sequence/);

process.stdout.write(`${JSON.stringify({ winner: expected, hashes })}\n`);
