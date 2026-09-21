#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { selectWindow as baseline } from "./baseline.mjs";
import { selectWindow as proposed } from "./proposed.mjs";

assert.deepEqual(process.argv.slice(2), ["F1", "F2-dismissed"]);

const rows = ["a", "b", "c"];
assert.deepEqual(baseline(rows, 1, 3), ["b", "c"]);
assert.deepEqual(proposed(rows, 1, 3), ["b", "c", undefined]);
assert.throws(() => proposed(rows, -1, 2), RangeError);

const files = [
  "intent.md",
  "baseline.mjs",
  "proposed.mjs",
  "review-seeds.md",
];
const hashes = {};
for (const path of files) {
  hashes[path] = createHash("sha256").update(await readFile(path)).digest("hex");
}

process.stdout.write(`${JSON.stringify({ actOn: ["F1"], dismissed: ["F2"], hashes })}\n`);
