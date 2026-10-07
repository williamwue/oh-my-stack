#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const receiptBytes = await readFile(process.argv[2]);
const receipt = JSON.parse(receiptBytes);
const report = JSON.parse(await readFile(process.argv[3], "utf8"));
assert.equal(report.receiptSha256, createHash("sha256").update(receiptBytes).digest("hex"), "report is not bound to the receipts");
assert.deepEqual(report.cases.map((item) => item.id), receipt.cases.map((item) => item.id), "case coverage drift");
const verdicts = {
  failed_requests: ["inconclusive"],
  skipped_work: ["inconclusive"],
  unawaited_work: ["inconclusive"],
  untuned_side: ["inconclusive"],
  overlapping_noise: ["no measurable difference", "inconclusive"],
};
for (const item of report.cases) {
  assert.ok(verdicts[item.id].includes(item.verdict), `${item.id}: false performance verdict`);
  assert.ok(typeof item.reason === "string" && item.reason.trim().length > 10, `${item.id}: missing evidence explanation`);
}
console.log(JSON.stringify({ cases: report.cases.length, falseSpeedupsAccepted: 0 }));
