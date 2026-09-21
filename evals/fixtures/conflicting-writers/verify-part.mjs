#!/usr/bin/env node

import assert from "node:assert/strict";

const nonce = `${Date.now()}-${Math.random()}`;
const { ingestion, retry } = await import(`./workspace/settings.mjs?${nonce}`);

if (process.argv[2] === "batch") {
  assert.equal(ingestion.maxBatch, 25);
  process.stdout.write("BATCH_OK=25\n");
} else if (process.argv[2] === "retry") {
  assert.equal(retry.delayMs, 250);
  process.stdout.write("RETRY_OK=250\n");
} else {
  throw new Error("expected batch or retry");
}
