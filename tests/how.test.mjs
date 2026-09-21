import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

test("how preserves staged read-only exploration and root verification", async () => {
  const skill = await readFile(join(repoRoot, "src/core/skills/how/SKILL.md"), "utf8");
  const metadata = JSON.parse(
    await readFile(join(repoRoot, "src/core/skills/how/skill.json"), "utf8"),
  );

  assert.match(skill, /two to four non-overlapping exploration angles/);
  assert.match(skill, /Start all available read-only explorer sessions before waiting/);
  assert.match(skill, /preserve each attributable result exactly\s+as returned/);
  assert.match(skill, /start one new read-only explainer\s+session/);
  assert.match(skill, /root independently verifies the critical\s+entry point/);
  assert.match(skill, /no implementation files were changed/);
  assert.doesNotMatch(skill, /grok-|claude-|generalPurpose|Task subagent/);
  assert.equal(metadata.invocation, "explicit");
  assert.equal(metadata.workflowTarget, "W3");
  assert.equal(metadata.fallbacks["agents.spawn_parallel"], "run_independent_exploration_angles_sequentially");
});
