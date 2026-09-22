#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { git, loadState, loadVerdict } from "./lib.mjs";

const root = resolve(process.argv[2] ?? ".");
const project = join(root, "project");
const state = await loadState(root);
const report = JSON.parse(await readFile(join(root, "report.json"), "utf8"));
assert.deepEqual(state.pullRequests.map(({ id, state: status }) => [id, status]), [[41, "MERGED"], [42, "MERGED"], [43, "OPEN"]]);
assert.deepEqual(state.merges.map((item) => item.id), [41, 42]);
assert.equal(git(project, "rev-parse", "main"), git(project, "rev-parse", "stack-2"));
assert.throws(() => git(project, "merge-base", "--is-ancestor", "stack-3", "main"));
const verdicts = await Promise.all(state.order.map((id) => loadVerdict(root, id)));
assert.equal(new Set(verdicts.map((item) => item.reviewerSession)).size, 3);
assert.equal(verdicts[0].verdict, "PASS");
assert.ok(["PASS", "PASS+NOTES"].includes(verdicts[1].verdict));
assert.equal(verdicts[2].verdict, "FAIL");
assert.deepEqual(report.frozenStack, [41, 42, 43]);
assert.equal(report.verifiedCeiling, 42);
assert.deepEqual(report.armed, []);
assert.deepEqual(report.landed.map((item) => item.id), [41, 42]);
assert.deepEqual(report.nextGap, { id: 43, reason: "failed-verdict" });
assert.equal(report.result, "stopped-at-ceiling");
console.log(`SHIPPING_OK=${report.landed.at(-1).landedSha}`);
