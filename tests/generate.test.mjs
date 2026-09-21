import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  compareTrees,
  generate,
  loadModel,
  renderTarget,
  repoRoot,
  validateCoreText,
  validateRequirementSupport,
} from "../tools/generate.mjs";
import { validate } from "../tools/validate.mjs";

test("loads one portable Skill and three adapters", async () => {
  const model = await loadModel();
  assert.equal(model.skills.length, 1);
  assert.equal(model.skills[0].metadata.name, "prove-it-works");
  assert.deepEqual(model.adapters.map((adapter) => adapter.id), ["omp", "codex", "claude-code"]);
  assert.equal(model.profiles.size, 5);
});

test("live profiles cite surface-specific evidence", async () => {
  const model = await loadModel();
  const omp = model.profiles.get("omp-default");
  const codexCli = model.profiles.get("codex-cli");
  assert.equal(omp.capabilities["skills.discover"].status, "native");
  assert.match(omp.capabilities["skills.discover"].evidence, /omp-18\.2\.6/);
  assert.equal(codexCli.capabilities["skills.invoke.explicit"].status, "native");
  assert.match(codexCli.capabilities["skills.invoke.explicit"].evidence, /codex-cli-0\.155\.1/);
  const claude = model.profiles.get("claude-code-default");
  assert.equal(claude.capabilities["skills.discover"].status, "unknown");
  assert.equal(claude.verification.status, "pending");
});

test("portable core rejects runtime bindings", () => {
  assert.throws(
    () => validateCoreText("fixture.md", "Call spawn_agent for this work."),
    /spawn_agent tool/,
  );
  assert.throws(
    () => validateCoreText("fixture.md", "Use Codex for this work."),
    /runtime name Codex/,
  );
});

test("unsupported requirements need an explicit fallback", async () => {
  const model = await loadModel();
  const skill = structuredClone(model.skills[0]);
  const profile = structuredClone(model.profiles.get("omp-default"));
  profile.capabilities["workspace.inspect"].status = "unsupported";
  assert.throws(
    () => validateRequirementSupport(skill, [profile]),
    /does not support workspace\.inspect and has no fallback/,
  );
  skill.metadata.fallbacks["workspace.inspect"] = "report_workspace_unknown";
  assert.doesNotThrow(() => validateRequirementSupport(skill, [profile]));
});

test("rendering is deterministic for every adapter", async () => {
  const model = await loadModel();
  const first = await mkdtemp(join(tmpdir(), "oh-my-stack-first-"));
  const second = await mkdtemp(join(tmpdir(), "oh-my-stack-second-"));
  try {
    for (const adapter of model.adapters) {
      await renderTarget(first, model, adapter);
      await renderTarget(second, model, adapter);
      assert.deepEqual(
        await compareTrees(join(first, adapter.packageDir), join(second, adapter.packageDir)),
        [],
      );
    }
  } finally {
    await rm(first, { recursive: true, force: true });
    await rm(second, { recursive: true, force: true });
  }
});

test("committed packages match generator output", async () => {
  await generate({ root: repoRoot, check: true });
});

test("source and generated packages satisfy repository validation", async () => {
  const model = await validate();
  assert.equal(model.project.version, "0.1.0-alpha.0");
});
