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

test("interrogate requires root-verified runtime metadata for model claims", async () => {
  const skill = await readFile(join(repoRoot, "src/core/skills/interrogate/SKILL.md"), "utf8");
  const reviewerPrompt = await readFile(join(repoRoot, "src/core/skills/interrogate/references/reviewer-prompt.md"), "utf8");
  assert.match(skill, /runtime\s+metadata inspected by the root/);
  assert.match(skill, /record each model as\s*`unverified`/);
  assert.match(skill, /even\s+when a reviewer says it read its own runtime metadata/);
  assert.match(reviewerPrompt, /Do not report your own model, provider, or reasoning level/);
});

test("arena cross-judge receives complete frozen candidate artifacts", async () => {
  const skill = await readFile(join(repoRoot, "src/core/skills/arena/SKILL.md"), "utf8");
  assert.match(skill, /Pass each candidate's full\s+frozen output verbatim/);
  assert.match(skill, /root-written summaries are not a substitute/);
  assert.match(skill, /do not claim an\s+independent cross-judge comparison/);
});
