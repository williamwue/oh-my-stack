#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { git, loadProgram, readJson } from "./lib.mjs";

const root = resolve(process.argv[2] ?? ".");
const program = await loadProgram(root);
const report = await readJson(join(root, "report.json"));
assert.equal(program.generation, 1);
assert.deepEqual(program.units.map((unit) => unit.state), ["integrated", "integrated", "integrated", "integrated"]);
assert.deepEqual(program.integrations.map((item) => item.unit), ["pilot", "alpha", "beta", "join"]);
assert.deepEqual(program.drains.map((item) => item.arrivals), [["pilot"], ["alpha"], ["beta"], ["join"]]);
assert.equal(new Set(program.units.map((unit) => unit.workerSession)).size, 4);
assert.equal(new Set(program.units.map((unit) => unit.reviewerSession)).size, 4);
for (const unit of program.units) {
  assert.notEqual(unit.workerSession, unit.reviewerSession);
  assert.equal(git(join(root, "project"), "show", `${unit.integratedHead}:delivered/${unit.id}.txt`), (await readFile(join(root, unit.scope), "utf8")).trim());
}
const alphaBrief = await readJson(join(root, "briefs", "alpha.json"));
const betaBrief = await readJson(join(root, "briefs", "beta.json"));
const joinBrief = await readJson(join(root, "briefs", "join.json"));
assert.equal(alphaBrief.upstreamReceipts[0].headSha, program.units[0].integratedHead);
assert.equal(betaBrief.upstreamReceipts[0].headSha, program.units[0].integratedHead);
assert.deepEqual(joinBrief.upstreamReceipts.map((item) => item.headSha), [program.units[1].integratedHead, program.units[2].integratedHead]);
assert.equal(report.predicate, "4/4");
assert.equal(report.externalPublication, false);
assert.equal(report.stopReason, "predicate-met");
assert.equal(git(join(root, "project"), "rev-list", "--count", "HEAD"), "5");
console.log(`ORCHESTRATE_OK=${git(join(root, "project"), "rev-parse", "HEAD")}`);
