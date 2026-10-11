#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(fixtureRoot, "../../..");
const reportPath = process.argv[2];
assert(reportPath, "usage: node verify.mjs <report.json>");

const report = JSON.parse(await readFile(resolve(reportPath), "utf8"));
assert(["omp", "codex", "claude-code", "pi"].includes(report.runtime), "report.runtime must be a supported host");
const packageRoot = join(repoRoot, "packages", report.runtime);
const catalog = JSON.parse(await readFile(join(packageRoot, "SKILL_CATALOG.json"), "utf8"));
const generation = JSON.parse(await readFile(join(packageRoot, "GENERATION.json"), "utf8"));
assert.equal(catalog.target, report.runtime, "selected catalog target drift");
assert.deepEqual(catalog.selection, generation.selection, "selected catalog generation drift");
const publicNames = catalog.skills.filter((entry) => entry.audience === "public").map((entry) => entry.name);
const probeNames = catalog.skills.filter((entry) => entry.audience === "probe").map((entry) => entry.name);
assert(Array.isArray(report.batches) && report.batches.length > 0, "report.batches are required");

const requested = [];
const observed = [];
for (const batch of report.batches) {
  assert(Array.isArray(batch.requested) && batch.requested.length > 0, "batch.requested is required");
  assert(Array.isArray(batch.observed), "batch.observed is required");
  assert.equal(batch.noWorkflowExecution, true, "batch executed a workflow");
  assert.equal(batch.noWrites, true, "batch wrote project files");
  assert.equal(batch.noDelegation, true, "batch delegated");
  assert.equal(batch.noPublication, true, "batch published external state");
  assert.deepEqual(batch.observed.map((entry) => entry.name), batch.requested, "batch order or membership drift");
  requested.push(...batch.requested);
  observed.push(...batch.observed);
}

assert.deepEqual(requested, publicNames, "report does not cover the exact public catalog");
assert.equal(new Set(requested).size, requested.length, "report contains a duplicate public Skill");
assert.equal(requested.some((name) => probeNames.includes(name)), false, "report includes a probe Skill");

for (const entry of observed) {
  const text = await readFile(join(packageRoot, "skills", entry.name, "SKILL.md"), "utf8");
  const name = text.match(/^name:\s*(.+)$/m)?.[1]?.replace(/^["']|["']$/g, "");
  const heading = text.match(/^#\s+(.+)$/m)?.[1] ?? null;
  assert.equal(entry.name, name, `${entry.name}: frontmatter name drift`);
  assert.equal(entry.heading, heading, `${entry.name}: first heading drift`);
}

process.stdout.write(`${JSON.stringify({
  runtime: report.runtime,
  publicSkillCount: observed.length,
  batchCount: report.batches.length,
  probeSkillCount: probeNames.length + generation.skills.omittedProbes,
})}\n`);
