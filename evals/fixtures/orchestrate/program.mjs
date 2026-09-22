#!/usr/bin/env node

import assert from "node:assert/strict";
import { cp, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  expectedOutput,
  git,
  loadProgram,
  publicStatus,
  readJson,
  saveProgram,
  sha256,
  writeJson,
} from "./lib.mjs";

const [action, rootArg = ".", id, actor, requestedVerdict] = process.argv.slice(2);
const root = resolve(rootArg);
const program = await loadProgram(root);
const unit = program.units.find((item) => item.id === id);

function findUnit(unitId) {
  const found = program.units.find((item) => item.id === unitId);
  assert.ok(found, `unknown unit ${unitId}`);
  return found;
}

function dependenciesIntegrated(target) {
  return target.dependencies.every((dependency) => findUnit(dependency).state === "integrated");
}

if (action === "status") {
  process.stdout.write(`${JSON.stringify(publicStatus(program), null, 2)}\n`);
} else if (action === "brief") {
  assert.ok(unit, `unknown unit ${id}`);
  assert.ok(["ready", "blocked"].includes(unit.state), `${id} cannot be briefed from ${unit.state}`);
  assert.ok(dependenciesIntegrated(unit), `${id} dependencies are not integrated`);
  if (id !== "pilot") assert.equal(findUnit("pilot").state, "integrated", "pilot must integrate before scale");
  const standingOrders = await readFile(join(root, program.standingOrders), "utf8");
  const brief = {
    schemaVersion: 1,
    programId: program.programId,
    generation: program.generation,
    unit: id,
    goal: `Produce the ${id} program artifact`,
    scope: { writable: [unit.scope], forbidden: ["program.json", "briefs", "verdicts", "project"] },
    upstreamReceipts: unit.dependencies.map((dependency) => ({
      unit: dependency,
      headSha: findUnit(dependency).integratedHead,
    })),
    acceptance: [`${unit.scope} exactly matches the generation-bound expected content`],
    verificationCommand: `node unit.mjs verify . ${id}`,
    timeboxMinutes: 5,
    report: ["native task identifier", "generation", "unit", "output hash", "command result"],
    standingOrders,
  };
  const serialized = `${JSON.stringify(brief, null, 2)}\n`;
  await writeFile(join(root, "briefs", `${id}.json`), serialized, { flag: "wx" });
  unit.briefSha256 = sha256(serialized);
  unit.state = "ready";
  await saveProgram(root, program);
  console.log(`ORCHESTRATE_BRIEF=${id}:${unit.briefSha256}`);
} else if (action === "start") {
  assert.ok(unit, `unknown unit ${id}`);
  assert.match(actor ?? "", /^worker-[A-Za-z0-9_./:-]+$/, "native worker identity required");
  assert.equal(unit.state, "ready", `${id} is not ready`);
  assert.ok(unit.briefSha256, `${id} has no frozen brief`);
  assert.ok(dependenciesIntegrated(unit), `${id} dependencies are not integrated`);
  if (id !== "pilot") assert.equal(findUnit("pilot").state, "integrated", "pilot must integrate before scale");
  const inFlight = program.units.filter((item) => item.state === "running");
  assert.ok(inFlight.length < program.maxInFlight, `rolling window ${program.maxInFlight} is full`);
  assert.ok(!program.units.some((item) => item.workerSession === actor), "worker identity must be unique");
  unit.state = "running";
  unit.workerSession = actor;
  unit.startedGeneration = program.generation;
  await writeJson(join(root, "assignments", `${id}.json`), {
    schemaVersion: 1,
    programId: program.programId,
    generation: program.generation,
    unit: id,
    workerSession: actor,
    briefSha256: unit.briefSha256,
  }, { flag: "wx" });
  await saveProgram(root, program);
  console.log(`ORCHESTRATE_STARTED=${id}:${actor}`);
} else if (action === "drain") {
  const files = (await readdir(join(root, "inbox"))).filter((file) => file.endsWith(".json")).sort();
  const selected = id ? new Set(id.split(",")) : null;
  const batch = [];
  for (const file of files) {
    if (program.processedInbox.includes(file)) continue;
    const pointer = await readJson(join(root, "inbox", file));
    if (selected && !selected.has(pointer.unit)) continue;
    const target = findUnit(pointer.unit);
    assert.equal(target.state, "running", `${pointer.unit} completion arrived from ${target.state}`);
    assert.equal(pointer.generation, program.generation, `${pointer.unit} completion has stale generation`);
    assert.equal(pointer.workerSession, target.workerSession, `${pointer.unit} worker attribution changed`);
    const output = await readFile(join(root, target.scope));
    assert.equal(sha256(output), pointer.outputSha256, `${pointer.unit} output hash changed`);
    target.state = "needs-verify";
    target.outputSha256 = pointer.outputSha256;
    program.processedInbox.push(file);
    batch.push(pointer.unit);
  }
  assert.ok(!selected || batch.length > 0, `selected drain ${id} has no arrivals`);
  program.drains.push({ sequence: program.drains.length + 1, arrivals: batch });
  await saveProgram(root, program);
  console.log(`ORCHESTRATE_DRAIN=${batch.join(",") || "empty"}`);
} else if (action === "verdict") {
  assert.ok(unit, `unknown unit ${id}`);
  assert.equal(unit.state, "needs-verify", `${id} is not awaiting verification`);
  assert.match(actor ?? "", /^reviewer-[A-Za-z0-9_./:-]+$/, "native reviewer identity required");
  assert.notEqual(actor, unit.workerSession, "worker cannot verify its own unit");
  assert.equal(requestedVerdict, "PASS", "fixture accepts only an observed PASS");
  const brief = await readJson(join(root, "briefs", `${id}.json`));
  assert.equal(brief.generation, program.generation, `${id} brief generation changed`);
  const actual = await readFile(join(root, unit.scope), "utf8");
  assert.equal(actual, expectedOutput(unit, brief), `${id} observed output failed verification`);
  const verdict = {
    schemaVersion: 1,
    programId: program.programId,
    generation: program.generation,
    unit: id,
    workerSession: unit.workerSession,
    reviewerSession: actor,
    outputSha256: unit.outputSha256,
    verificationCommand: `node unit.mjs verify . ${id}`,
    verdict: requestedVerdict,
  };
  await writeJson(join(root, "verdicts", `${id}.json`), verdict, { flag: "wx" });
  unit.state = "verified";
  unit.reviewerSession = actor;
  await saveProgram(root, program);
  console.log(`ORCHESTRATE_VERDICT=${id}:${actor}:PASS`);
} else if (action === "integrate") {
  assert.ok(unit, `unknown unit ${id}`);
  assert.equal(unit.state, "verified", `${id} is not verified`);
  const frontier = program.units.find((item) => item.state !== "integrated");
  assert.equal(id, frontier?.id, `only frontier unit ${frontier?.id} may integrate`);
  assert.ok(dependenciesIntegrated(unit), `${id} dependencies changed before integration`);
  const verdict = await readJson(join(root, "verdicts", `${id}.json`));
  const output = await readFile(join(root, unit.scope));
  assert.equal(verdict.outputSha256, sha256(output), `${id} verdict is stale`);
  await cp(join(root, unit.scope), join(root, "project", "delivered", `${id}.txt`));
  git(join(root, "project"), "add", `delivered/${id}.txt`);
  git(join(root, "project"), "commit", "-qm", `integrate ${id}`);
  unit.state = "integrated";
  unit.integratedHead = git(join(root, "project"), "rev-parse", "HEAD");
  program.integrations.push({ unit: id, headSha: unit.integratedHead, generation: program.generation });
  for (const candidate of program.units) {
    if (candidate.state === "blocked" && dependenciesIntegrated(candidate)) candidate.state = "ready";
  }
  await saveProgram(root, program);
  console.log(`ORCHESTRATE_INTEGRATED=${id}:${unit.integratedHead}`);
} else if (action === "report") {
  assert.ok(program.units.every((item) => item.state === "integrated"), "all units must integrate before report");
  const report = {
    schemaVersion: 1,
    programId: program.programId,
    generation: program.generation,
    predicate: `${program.units.length}/${program.predicate.target}`,
    states: Object.fromEntries(program.units.map((item) => [item.id, item.state])),
    integrations: program.integrations,
    drains: program.drains,
    gates: program.gates,
    externalPublication: false,
    stopReason: "predicate-met",
  };
  await writeJson(join(root, "report.json"), report, { flag: "wx" });
  console.log(`ORCHESTRATE_REPORT_OK=${report.predicate}`);
} else {
  throw new Error("usage: node program.mjs <status|brief|start|drain|verdict|integrate|report> <root> [unit-or-drain-selection] [actor] [verdict]");
}
