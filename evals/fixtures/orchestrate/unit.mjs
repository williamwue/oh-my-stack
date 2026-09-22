#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { expectedOutput, loadProgram, readJson, sha256, writeJson } from "./lib.mjs";

const [action, rootArg = ".", id, workerSession] = process.argv.slice(2);
const root = resolve(rootArg);
const program = await loadProgram(root);
const unit = program.units.find((item) => item.id === id);
assert.ok(unit, `unknown unit ${id}`);
const brief = await readJson(join(root, "briefs", `${id}.json`));

if (action === "execute") {
  const assignment = await readJson(join(root, "assignments", `${id}.json`));
  assert.equal(unit.state, "running", `${id} is not running`);
  assert.equal(workerSession, assignment.workerSession, `${id} worker attribution changed`);
  assert.equal(assignment.generation, program.generation, `${id} assignment generation is stale`);
  assert.equal(brief.generation, assignment.generation, `${id} brief generation is stale`);
  const output = expectedOutput(unit, brief);
  await writeFile(join(root, unit.scope), output, { flag: "wx" });
  const outputSha256 = sha256(output);
  await writeJson(join(root, "inbox", `${id}.json`), {
    schemaVersion: 1,
    programId: program.programId,
    generation: program.generation,
    unit: id,
    workerSession,
    outputSha256,
  }, { flag: "wx" });
  console.log(`ORCHESTRATE_COMPLETION=${id}:${outputSha256}`);
} else if (action === "verify") {
  const actual = await readFile(join(root, unit.scope), "utf8");
  const expected = expectedOutput(unit, brief);
  const result = {
    programId: program.programId,
    generation: program.generation,
    unit: id,
    outputSha256: sha256(actual),
    expected,
    actual,
    passed: actual === expected,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.passed) process.exitCode = 1;
} else {
  throw new Error("usage: node unit.mjs <execute|verify> <root> <unit> [worker-session]");
}
