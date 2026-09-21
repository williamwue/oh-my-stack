import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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

test("loads thirty-nine portable Skills, three roles, and three adapters", async () => {
  const model = await loadModel();
  assert.equal(model.skills.length, 39);
  assert.deepEqual(model.skills.map((skill) => skill.metadata.name), [
    "bug-fix",
    "check-cancellation",
    "check-custom-role",
    "check-delegation",
    "check-follow-up",
    "check-interaction",
    "check-model-routing",
    "check-panel",
    "check-parallel",
    "check-resources",
    "check-stale-replay",
    "check-transcript",
    "check-writer-isolation",
    "principle-attack-the-premise",
    "principle-boundary-discipline",
    "principle-build-the-lever",
    "principle-encode-lessons-in-structure",
    "principle-exhaust-the-design-space",
    "principle-experience-first",
    "principle-fix-root-causes",
    "principle-foundational-thinking",
    "principle-guard-the-context-window",
    "principle-laziness-protocol",
    "principle-make-operations-idempotent",
    "principle-migrate-callers-then-delete-legacy-apis",
    "principle-minimize-reader-load",
    "principle-model-the-domain",
    "principle-never-block-on-the-human",
    "principle-outcome-oriented-execution",
    "principle-prove-it-works",
    "principle-redesign-from-first-principles",
    "principle-separate-before-serializing-shared-state",
    "principle-sequence-verifiable-units",
    "principle-subtract-before-you-add",
    "principle-test-behavior-not-implementation",
    "principle-type-system-discipline",
    "prove-it-works",
    "show-me-your-work",
    "tdd",
  ]);
  assert.equal(
    model.skills.filter((skill) => skill.metadata.name.startsWith("principle-")).every(
      (skill) => skill.metadata.invocation === "explicit",
    ),
    true,
  );
  assert.equal(model.skills.find((skill) => skill.metadata.name === "tdd").metadata.invocation, "explicit");
  assert.deepEqual(model.adapters.map((adapter) => adapter.id), ["omp", "codex", "claude-code"]);
  assert.deepEqual(model.roles.map((role) => role.metadata.name), ["evidence-reader", "implementer", "trail-reviewer"]);
  assert.equal(model.profiles.size, 7);
});

test("live profiles cite surface-specific evidence", async () => {
  const model = await loadModel();
  const omp = model.profiles.get("omp-default");
  const codexCli = model.profiles.get("codex-cli");
  assert.equal(omp.capabilities["skills.discover"].status, "native");
  assert.match(omp.capabilities["skills.discover"].evidence, /omp-18\.2\.6/);
  assert.equal(omp.capabilities["resources.relative_paths"].status, "native");
  assert.equal(omp.capabilities["scripts.execute"].status, "external");
  assert.equal(omp.capabilities["agents.cancel"].status, "native");
  assert.equal(omp.capabilities["agents.custom_roles"].status, "native");
  assert.equal(omp.capabilities["agents.model_override"].status, "native");
  assert.equal(omp.capabilities["agents.reasoning_override"].status, "native");
  assert.equal(omp.capabilities["agents.spawn"].status, "native");
  assert.equal(omp.capabilities["agents.follow_up"].status, "native");
  assert.equal(omp.capabilities["agents.spawn_parallel"].status, "native");
  assert.equal(omp.capabilities["agents.wait"].status, "native");
  assert.equal(omp.capabilities["agents.read_result"].status, "native");
  assert.equal(omp.capabilities["agents.read_transcript"].status, "native");
  assert.equal(omp.capabilities["coordination.peer_messages"].status, "unknown");
  assert.equal(omp.capabilities["interaction.fixed_choice"].status, "fallback");
  assert.equal(omp.capabilities["interaction.free_text"].status, "fallback");
  assert.equal(omp.capabilities["workspace.isolate"].status, "native");
  assert.equal(omp.capabilities["workspace.write"].status, "native");
  assert.equal(codexCli.capabilities["skills.invoke.explicit"].status, "native");
  assert.match(codexCli.capabilities["skills.invoke.explicit"].evidence, /codex-cli-0\.155\.1/);
  assert.equal(codexCli.capabilities["resources.relative_paths"].status, "native");
  assert.equal(codexCli.capabilities["scripts.execute"].status, "external");
  assert.equal(codexCli.capabilities["agents.custom_roles"].status, "unsupported");
  assert.equal(codexCli.capabilities["agents.model_override"].status, "native");
  assert.equal(codexCli.capabilities["agents.reasoning_override"].status, "native");
  assert.equal(codexCli.capabilities["agents.cancel"].status, "native");
  assert.equal(codexCli.capabilities["agents.spawn"].status, "native");
  assert.equal(codexCli.capabilities["agents.follow_up"].status, "native");
  assert.equal(codexCli.capabilities["agents.spawn_parallel"].status, "native");
  assert.equal(codexCli.capabilities["agents.wait"].status, "native");
  assert.equal(codexCli.capabilities["agents.read_result"].status, "native");
  assert.equal(codexCli.capabilities["agents.read_transcript"].status, "external");
  assert.equal(codexCli.capabilities["coordination.peer_messages"].status, "native");
  assert.equal(codexCli.capabilities["workspace.isolate"].status, "native");
  assert.equal(codexCli.capabilities["workspace.write"].status, "native");
  assert.equal(codexCli.capabilities["interaction.fixed_choice"].status, "fallback");
  assert.equal(codexCli.capabilities["interaction.free_text"].status, "fallback");
  const ompInteractive = model.profiles.get("omp-interactive");
  assert.equal(ompInteractive.target.surface, "cli-interactive");
  assert.equal(ompInteractive.capabilities["interaction.fixed_choice"].status, "native");
  assert.equal(ompInteractive.capabilities["interaction.free_text"].status, "native");
  const codexCliInteractive = model.profiles.get("codex-cli-interactive");
  assert.equal(codexCliInteractive.target.surface, "cli-interactive");
  assert.equal(codexCliInteractive.capabilities["interaction.fixed_choice"].status, "native");
  assert.equal(codexCliInteractive.capabilities["interaction.free_text"].status, "native");
  const codexDesktop = model.profiles.get("codex-desktop");
  assert.equal(codexDesktop.capabilities["workspace.isolate"].status, "unknown");
  assert.equal(codexDesktop.capabilities["workspace.write"].status, "unknown");
  const codexIde = model.profiles.get("codex-ide");
  assert.equal(codexIde.capabilities["workspace.isolate"].status, "unknown");
  assert.equal(codexIde.capabilities["workspace.write"].status, "unknown");
  const claude = model.profiles.get("claude-code-default");
  assert.equal(claude.capabilities["skills.discover"].status, "unknown");
  assert.equal(claude.capabilities["agents.cancel"].status, "unknown");
  assert.equal(claude.capabilities["agents.custom_roles"].status, "unknown");
  assert.equal(claude.capabilities["agents.model_override"].status, "unknown");
  assert.equal(claude.capabilities["agents.reasoning_override"].status, "unknown");
  assert.equal(claude.capabilities["agents.spawn"].status, "unknown");
  assert.equal(claude.capabilities["agents.follow_up"].status, "unknown");
  assert.equal(claude.capabilities["agents.read_transcript"].status, "unknown");
  assert.equal(claude.capabilities["agents.spawn_parallel"].status, "unknown");
  assert.equal(claude.capabilities["workspace.isolate"].status, "unknown");
  assert.equal(claude.capabilities["workspace.write"].status, "unknown");
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
  const skill = structuredClone(model.skills.find((entry) => entry.metadata.name === "prove-it-works"));
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

test("explicit invocation renders as target-native policy", async () => {
  const model = await loadModel();
  const skill = model.skills.find((entry) => entry.metadata.name === "prove-it-works");
  skill.metadata.invocation = "explicit";
  const stage = await mkdtemp(join(tmpdir(), "oh-my-stack-invocation-"));
  try {
    for (const adapter of model.adapters) await renderTarget(stage, model, adapter);
    const ompSkill = await readFile(join(stage, "packages/omp/skills/prove-it-works/SKILL.md"), "utf8");
    const claudeSkill = await readFile(join(stage, "packages/claude-code/skills/prove-it-works/SKILL.md"), "utf8");
    const codexSkill = await readFile(join(stage, "packages/codex/skills/prove-it-works/SKILL.md"), "utf8");
    const codexPolicy = await readFile(
      join(stage, "packages/codex/skills/prove-it-works/agents/openai.yaml"),
      "utf8",
    );
    assert.match(ompSkill, /disable-model-invocation: true/);
    assert.match(claudeSkill, /disable-model-invocation: true/);
    assert.doesNotMatch(codexSkill, /disable-model-invocation/);
    assert.match(codexPolicy, /allow_implicit_invocation: false/);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
});

test("writable roles render native write permissions while read-only roles stay constrained", async () => {
  const model = await loadModel();
  const stage = await mkdtemp(join(tmpdir(), "oh-my-stack-role-permissions-"));
  try {
    for (const adapter of model.adapters) await renderTarget(stage, model, adapter);
    const ompWriter = await readFile(join(stage, "packages/omp/agents/implementer.md"), "utf8");
    const ompReader = await readFile(join(stage, "packages/omp/agents/evidence-reader.md"), "utf8");
    const codexWriter = await readFile(join(stage, "packages/codex/agents/implementer.toml"), "utf8");
    const codexReader = await readFile(join(stage, "packages/codex/agents/evidence-reader.toml"), "utf8");
    const claudeWriter = await readFile(join(stage, "packages/claude-code/agents/implementer.md"), "utf8");
    const claudeReader = await readFile(join(stage, "packages/claude-code/agents/evidence-reader.md"), "utf8");
    assert.match(ompWriter, /  - write\n/);
    assert.doesNotMatch(ompReader, /  - write\n/);
    assert.match(codexWriter, /sandbox_mode = "workspace-write"/);
    assert.match(codexReader, /sandbox_mode = "read-only"/);
    assert.match(claudeWriter, /tools: Read, Grep, Glob, Bash, Edit, Write/);
    assert.match(claudeReader, /tools: Read, Grep, Glob\n/);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
});

test("committed packages match generator output", async () => {
  await generate({ root: repoRoot, check: true });
});

test("source and generated packages satisfy repository validation", async () => {
  const model = await validate();
  assert.equal(model.project.version, "0.1.0-alpha.0");
});
