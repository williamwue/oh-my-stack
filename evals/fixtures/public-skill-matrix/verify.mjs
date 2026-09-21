#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(fixtureRoot, "../../..");
const reportPath = process.argv[2];
assert(reportPath, "usage: node verify.mjs <report.json>");

const catalog = JSON.parse(await readFile(join(repoRoot, "src/core/skill-catalog.json"), "utf8"));
const report = JSON.parse(await readFile(resolve(reportPath), "utf8"));
assert(["omp", "codex"].includes(report.runtime), "report.runtime must be omp or codex");
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

assert.deepEqual(requested, catalog.public, "report does not cover the exact public catalog");
assert.equal(new Set(requested).size, requested.length, "report contains a duplicate public Skill");
assert.equal(requested.some((name) => catalog.probes.includes(name)), false, "report includes a probe Skill");

const packageRoot = join(repoRoot, "packages", report.runtime);
for (const entry of observed) {
  const text = await readFile(join(packageRoot, "skills", entry.name, "SKILL.md"), "utf8");
  const name = text.match(/^name:\s*(.+)$/m)?.[1]?.replace(/^["']|["']$/g, "");
  const heading = text.match(/^#\s+(.+)$/m)?.[1];
  assert.equal(entry.name, name, `${entry.name}: frontmatter name drift`);
  assert.equal(entry.heading, heading, `${entry.name}: first heading drift`);
}

process.stdout.write(`${JSON.stringify({
  runtime: report.runtime,
  publicSkillCount: observed.length,
  batchCount: report.batches.length,
  probeSkillCount: catalog.probes.length,
})}\n`);
