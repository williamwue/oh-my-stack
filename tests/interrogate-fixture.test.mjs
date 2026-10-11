import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { repoRoot } from "../tools/generate.mjs";

test("interrogate fixture contains both intended reachable defects", async () => {
  const modulePath = join(repoRoot, "evals/fixtures/interrogate/project/lib/window.mjs");
  const { parseWindow } = await import(`${pathToFileURL(modulePath)}?test=${Date.now()}`);
  assert.equal(parseWindow("25"), 25);
  assert.equal(parseWindow("25px"), 25);
  assert.equal(parseWindow("0"), 0);
  assert.equal(parseWindow("-3"), -3);
  assert.equal(parseWindow("101"), 100);
  const source = await readFile(modulePath, "utf8");
  assert.match(source, /Number\.parseInt/);
  assert.doesNotMatch(source, /throw|eval|process|globalThis/);
});

test("interrogate preserves independent reviewers, source evidence, and lead synthesis", async () => {
  const skill = await readFile(join(repoRoot, "src/core/skills/interrogate/SKILL.md"), "utf8");
  const reviewerPrompt = await readFile(join(repoRoot, "src/core/skills/interrogate/references/reviewer-prompt.md"), "utf8");
  assert.deepEqual([...skill.matchAll(/^## Step (\d[^\n]*)/gm)].map((match) => match[1].trim()),
    ["1, Scope", "2, Intent", "3, Spawn Reviewers", "4, Synthesize", "5, Lead Judgment"]);
  assert.match(skill, /Launch all reviewers in a single message/);
  assert.match(skill, /read-only workspace authority/);
  assert.match(skill, /fill in the same template for every reviewer/);
  assert.match(skill, /references\/rubric.md/);
  assert.match(skill, /references\/code-quality-review.md/);
  assert.match(skill, /As results come back, build a unified picture/);
  assert.match(skill, /You are the lead reviewer/);
  assert.match(skill, /Do NOT auto-apply changes/);
  assert.match(reviewerPrompt, /\*\*Location\*\*: file:line or function name/);
  assert.match(reviewerPrompt, /\*\*Evidence\*\*: Why this matters/);
  assert.doesNotMatch(skill, /new read-only synthesizer|frozen synthesis/);
  const binding = await readFile(join(repoRoot, "packages/pi/docs/runtime-binding.md"), "utf8");
  assert.match(binding, /observed model and effort remain unknown unless independently returned/);
});

test("arena judges completed candidate artifacts against the common task rubric", async () => {
  const skill = await readFile(join(repoRoot, "src/core/skills/arena/SKILL.md"), "utf8");
  assert.match(skill, /Every candidate gets the same prompt/);
  assert.match(skill, /Give each candidate its own output location/);
  assert.match(skill, /After all Phase B candidates complete/);
  assert.match(skill, /Spawn one readonly judge subagent/);
  assert.match(skill, /sees the rubric and the candidates by path label/);
  assert.match(skill, /Don't spawn it while candidates are still writing/);
  assert.match(skill, /Read every candidate end to end before picking/);
  assert.match(skill, /Score each against the rubric criterion by criterion/);
  assert.match(skill, /Verify the synthesized artifact like any other output/);
});
