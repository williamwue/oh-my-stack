import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

async function readSkill(name) {
  return readFile(join(repoRoot, "src/core/skills", name, "SKILL.md"), "utf8");
}

test("poteto-mode preserves the upstream playbook index, triggers, and authority gates", async () => {
  const router = await readSkill("poteto-mode");
  const expected = [
    ["Investigation", "Read-only question"],
    ["Bug fix", "reported defect"],
    ["Feature", "New or changed behavior"],
    ["Refactoring", "behavior-preserving change"],
    ["Prototype", "throwaway sketch"],
    ["Autonomous run", "drive to completion"],
    ["Orchestrate", "standing project"],
    ["Autopilot-full", "owner per PR"],
    ["Autopilot-stack", "operator lands"],
  ];
  for (const [intent, workflow] of expected) {
    assert.match(router, new RegExp(`\\*\\*${intent}\\.\\*\\*[^\\n]*${workflow}`));
  }
  assert.match(router, /Contested design[^\n]*\*\*interrogate\*\*/);
  assert.match(router, /Before review[^\n]*\*\*no-comments\*\*/);
  assert.match(router, /Any PR-status request[^\n]*\*\*Babysit\*\*/);
  assert.match(router, /Never triggered by merely opening a PR/);
  assert.match(router, /large or cross-cutting effort[^\n]*\*\*figure-it-out\*\*[^\n]*even when a narrower playbook like Feature fits/);
  assert.match(router, /Publication, merge, deployment, billable requests, credential access, and user-scope configuration retain the host and project authorization gates/);
  assert.match(router, /A workflow step naming one of these actions does not grant that authority/);
  assert.match(router, /full-autonomy grant applies only to the named scope/);
  for (const path of ["investigation", "bug-fix", "feature", "refactoring", "prototype", "autonomous-run", "orchestrate", "autopilot-full", "autopilot-stack"]) {
    await readFile(join(repoRoot, "src/core/skills/poteto-mode/playbooks", `${path}.md`));
  }
});

test("alpha three playbooks preserve their safety boundaries", async () => {
  const investigation = await readSkill("investigation");
  const feature = await readSkill("feature");
  const refactoring = await readSkill("refactoring");
  const prototype = await readSkill("prototype");
  const opening = await readSkill("opening-a-pr");

  assert.match(investigation, /Investigation requests are read-only/);
  assert.match(investigation, /No PR, no babysit/);
  assert.match(feature, /You own the design\. Plan, review, verify/);
  assert.match(feature, /Delegate implementation\. Stay in the lead/);
  assert.match(feature, /"Inconclusive" or wrong-surface is not a pass/);
  assert.match(refactoring, /Pin the behavior contract first/);
  assert.match(refactoring, /missing feature or a real bug, split it out/);
  assert.match(refactoring, /Type check and lint are not a pin/);
  assert.match(prototype, /isolated scratch dir, separate from production source/);
  assert.match(prototype, /decision plus the throwaway artifact, not shippable code/);
  assert.match(opening, /Publication, merge, deployment[^\n]*authorization gates/);
  assert.match(opening, /Opening a PR does not start a babysit/);
  assert.match(opening, /built-in PR tool, create, edit, retarget, and mark ready through it/);
});
