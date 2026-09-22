import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

async function readSkill(name) {
  return readFile(join(repoRoot, "src/core/skills", name, "SKILL.md"), "utf8");
}

test("poteto-mode routes every admitted alpha outcome without implicit publication", async () => {
  const router = await readSkill("poteto-mode");
  const expected = [
    ["read-only engineering question", "investigation"],
    ["defective behavior", "bug-fix"],
    ["product behavior", "feature"],
    ["preserving behavior", "refactoring"],
    ["throwaway experiment", "prototype"],
    ["Adversarially review", "interrogate"],
  ];
  for (const [intent, workflow] of expected) {
    assert.match(router, new RegExp(`${intent}[^\\n]*${workflow}`));
  }
  assert.match(router, /explicitly requested by the user[^\n]*`opening-a-pr`/);
  assert.match(router, /existing pull request merge-ready[^\n]*`babysit`/);
  assert.match(router, /land, merge, or ship[^\n]*`shipping`/);
  assert.match(router, /bounded task to a checkable predicate[^\n]*`autonomous-run`/);
  assert.match(router, /standing multi-session program[^\n]*`orchestrate`/);
  assert.match(router, /linear operator-landed stack[^\n]*`autopilot-stack`/);
  assert.match(router, /autopilot that also owns landing remain outside the admitted\s+set/);
  assert.match(router, /Do not simulate `autopilot-full`/);
});

test("alpha three playbooks preserve their safety boundaries", async () => {
  const investigation = await readSkill("investigation");
  const feature = await readSkill("feature");
  const refactoring = await readSkill("refactoring");
  const prototype = await readSkill("prototype");
  const opening = await readSkill("opening-a-pr");

  assert.match(investigation, /Keep the workspace unchanged/);
  assert.match(feature, /root inspects the actual diff/);
  assert.match(feature, /unless the user explicitly requested that external action/);
  assert.match(refactoring, /Pin the current\s+contract/);
  assert.match(refactoring, /behavior changes, split it/);
  assert.match(prototype, /isolated scratch directory outside\s+production source/);
  assert.match(prototype, /artifact is\s+throwaway/);
  assert.match(opening, /only when the user explicitly asks/);
  assert.match(opening, /Never claim a URL that was not returned/);
});
