import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

test("how preserves the upstream four-phase read-only explanation workflow", async () => {
  const skill = await readFile(join(repoRoot, "src/core/skills/how/SKILL.md"), "utf8");
  const metadata = JSON.parse(
    await readFile(join(repoRoot, "src/core/skills/how/skill.json"), "utf8"),
  );

  assert.deepEqual([...skill.matchAll(/^## (\d\.[^\n]*)/gm)].map((match) => match[1].trim()),
    ["1. Assess complexity", "2. Explore (complex only)", "3. Synthesize (complex only)", "4. Present"]);
  assert.match(skill, /read-only workspace authority/);
  assert.match(skill, /no explorers\. Spawn one explainer[^\n]*Go to step 4/);
  assert.match(skill, /2 to 4 angles, each a distinct slice/);
  assert.match(skill, /Spawn all explorers in a single message/);
  assert.match(skill, /Once all explorers have returned, spawn one explainer[^\n]*every explorer's findings/);
  assert.match(skill, /Present the explainer's output[^\n]*Do not substantially rewrite it/);
  assert.doesNotMatch(skill, /root independently verifies|oms-enhanced-delivery|delivery-evidence/);
  for (const path of ["explorer-prompt.md", "explainer-prompt.md"]) {
    await readFile(join(repoRoot, "src/core/skills/how/references", path));
  }
  assert.doesNotMatch(skill, /grok-|claude-|generalPurpose|Task subagent/);
  assert.equal(metadata.invocation, "explicit");
  assert.equal(metadata.workflowTarget, "W3");
  assert.equal(metadata.fallbacks["agents.spawn_parallel"], "run_independent_exploration_angles_sequentially");
});

test("the additional root verification stage belongs to explicitly selected enhanced delivery", async () => {
  const overrides = await readFile(join(repoRoot, "src/core/skills/oms-enhanced-delivery/references/workflow-overrides.md"), "utf8");
  assert.match(overrides, /only after selecting OMS Enhanced Delivery/);
  assert.match(overrides, /root independently verifies the critical\s+entry point/);
});
