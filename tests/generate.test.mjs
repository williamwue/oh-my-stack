import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
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

function expectedCodexBody(name, sourceText) {
  const routes = {
    feature: "code.feature-refactoring", refactoring: "code.feature-refactoring",
    "bug-fix": "code.bug-fix", "perf-issue": "code.perf-issue", hillclimb: "code.hillclimb",
  };
  let body = sourceText.replace(/^---\n[\s\S]*?\n---\n/, "").trim().replace(/^# .+\n/, "").trim();
  if (routes[name]) body = body.replaceAll("`code.delegates`", `\`${routes[name]}\``);
  if (name === "reflect") body = body.replace(
    "use `reflect.tooling` for tooling and `reflect.judgment` for judgment and the\ndivergent lens; keep all three sessions independent.",
    "use `reflect.tooling`, `reflect.judgment`, and `reflect.divergent` for\nthe respective lenses; keep all three sessions independent. Use\n`reflect.synthesizer` for the later synthesis pass.",
  );
  return body;
}

test("Codex long direct entries preserve complete procedures outside the injection budget", async () => {
  const model = await loadModel();
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-long-skills-"));
  try {
    const adapter = model.adapters.find((entry) => entry.id === "codex");
    const target = await renderTarget(root, model, adapter);
    for (const name of model.skillCatalog.public) {
      const path = join(target, "skills", name);
      const entry = await readFile(join(path, "SKILL.md"), "utf8");
      assert.ok(Buffer.byteLength(entry) <= 7500, `${name}: direct entry exceeds safe injection budget`);
      const source = model.skills.find((skill) => skill.metadata.name === name);
      const body = (text) => text.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
      const complete = entry.includes("](WORKFLOW.md)") ? await readFile(join(path, "WORKFLOW.md"), "utf8") : entry;
      const sourceAfterHeading = expectedCodexBody(name, source.text);
      assert.ok(body(complete).endsWith(sourceAfterHeading), `${name}: complete procedure must remain lossless`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("OMP delegated workflows describe the current background-job lifecycle", async () => {
  const model = await loadModel();
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-omp-lifecycle-"));
  try {
    const adapter = model.adapters.find((entry) => entry.id === "omp");
    const target = await renderTarget(root, model, adapter);
    const swarm = await readFile(join(target, "skills/swarm/SKILL.md"), "utf8");
    assert.match(swarm, /read proc:\/\/<id>/);
    assert.match(swarm, /write proc:\/\/<id>\/kill/);
    assert.match(swarm, /Do not assume the deprecated `hub` tool exists/);
    const setup = await readFile(join(target, "skills/setup-oh-my-stack/SKILL.md"), "utf8");
    assert.doesNotMatch(setup, /write proc:\/\/<id>\/kill/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Codex keeps all direct entries with concise metadata and unchanged bodies", async () => {
  const model = await loadModel();
  const catalog = JSON.parse(await readFile(join(repoRoot, "packages/codex/SKILL_CATALOG.json"), "utf8"));
  assert.deepEqual(catalog.skills.map((skill) => skill.name), model.skillCatalog.public);
  assert.equal(catalog.skills.filter((skill) => skill.category === "workflow").length, 51);
  assert.equal(catalog.skills.filter((skill) => skill.category === "principle").length, 23);
  let originalLength = 0;
  let generatedLength = 0;
  for (const name of model.skillCatalog.public) {
    const source = model.skills.find((skill) => skill.metadata.name === name);
    const document = await readFile(join(repoRoot, "packages/codex/skills", name, "SKILL.md"), "utf8");
    const description = JSON.parse(document.match(/^description: (.+)$/m)[1]);
    assert.ok(description.length <= 120, name);
    const body = (text) => text.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    const complete = document.includes("](WORKFLOW.md)")
      ? await readFile(join(repoRoot, "packages/codex/skills", name, "WORKFLOW.md"), "utf8") : document;
    const sourceAfterHeading = expectedCodexBody(name, source.text);
    assert.ok(body(complete).endsWith(sourceAfterHeading), name);
    const metadata = await readFile(join(repoRoot, "packages/codex/skills", name, "agents/openai.yaml"), "utf8");
    assert.ok(metadata.includes(`Use $${name} for this task.`), name);
    assert.ok(metadata.includes(`allow_implicit_invocation: ${source.metadata.invocation === "automatic"}`), name);
    assert.ok(metadata.includes(name.startsWith("principle-") ? "Principle: " : "Workflow: "), name);
    originalLength += source.frontmatter.description.length;
    generatedLength += description.length;
  }
  assert.ok(generatedLength < originalLength * 0.6, "description character budget should decrease by at least 40%");
});

test("loads eighty-six portable Skills, seven roles, and three adapters", async () => {
  const model = await loadModel();
  assert.equal(model.skills.length, 86);
  assert.deepEqual(model.skills.map((skill) => skill.metadata.name), [
    "architect",
    "arena",
    "authoring-a-skill",
    "automate-me",
    "autonomous-run",
    "autopilot-full",
    "autopilot-stack",
    "babysit",
    "blast-radius",
    "bro",
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
    "create-verification-skill",
    "eval",
    "feature",
    "figure-it-out",
    "hillclimb",
    "how",
    "interrogate",
    "investigation",
    "maintain-verification-skill",
    "make-bot-ui",
    "multi-phase-plan",
    "no-comments",
    "opening-a-pr",
    "orchestrate",
    "pause-safely",
    "perf-issue",
    "poteto-mode",
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
    "prototype",
    "prove-it-works",
    "recall",
    "refactoring",
    "reflect",
    "reproduce-and-fix-issues",
    "runtime-forensics",
    "session-pickup",
    "setup-benny",
    "setup-oh-my-stack",
    "shipping",
    "show-me-your-work",
    "swarm",
    "tdd",
    "teach",
    "technical-writing",
    "trace-forensics",
    "triage-issue-reports",
    "typescript-best-practices",
    "unslop",
    "visual-parity",
    "why",
    "worktree-cleanup",
  ]);
  assert.equal(
    model.skills.filter((skill) => skill.metadata.name.startsWith("principle-")).every(
      (skill) => skill.metadata.invocation === "explicit",
    ),
    true,
  );
  assert.equal(model.skills.find((skill) => skill.metadata.name === "tdd").metadata.invocation, "explicit");
  assert.equal(model.skillCatalog.public.length, 74);
  assert.equal(model.skillCatalog.probes.length, 12);
  assert.deepEqual(model.skillCatalog.probes, model.skills
    .map((skill) => skill.metadata.name)
    .filter((name) => name.startsWith("check-")));
  assert.equal(model.skillCatalog.public.includes("bug-fix"), true);
  assert.equal(model.skillCatalog.public.includes("prove-it-works"), true);
  assert.deepEqual(model.adapters.map((adapter) => adapter.id), ["omp", "codex", "claude-code"]);
  assert.deepEqual(model.roles.map((role) => role.metadata.name), [
    "evidence-reader",
    "explainer",
    "explorer",
    "implementer",
    "reviewer",
    "synthesizer",
    "trail-reviewer",
  ]);
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
  assert.equal(omp.capabilities["commands.run"].status, "native");
  assert.equal(omp.capabilities["scm.pull_requests"].status, "unknown");
  assert.equal(omp.capabilities["agents.custom_roles"].status, "native");
  assert.equal(omp.capabilities["agents.model_override"].status, "native");
  assert.equal(omp.capabilities["agents.reasoning_override"].status, "native");
  assert.equal(omp.capabilities["agents.spawn"].status, "native");
  assert.equal(omp.capabilities["agents.follow_up"].status, "native");
  assert.equal(omp.capabilities["agents.spawn_parallel"].status, "native");
  assert.equal(omp.capabilities["agents.wait"].status, "native");
  assert.equal(omp.capabilities["agents.read_result"].status, "native");
  assert.equal(omp.capabilities["agents.read_transcript"].status, "native");
  assert.equal(omp.capabilities["coordination.peer_messages"].status, "native");
  assert.match(omp.capabilities["coordination.peer_messages"].evidence, /omp-18\.2\.10\/check-peer-message/);
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
  assert.equal(codexCli.capabilities["commands.run"].status, "native");
  assert.equal(codexCli.capabilities["scm.pull_requests"].status, "unknown");
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
  assert.equal(codexDesktop.target.runtimeVersion, "26.915.31945");
  assert.equal(codexDesktop.capabilities["automation.recurring"].status, "native");
  assert.equal(codexDesktop.capabilities["commands.run"].status, "native");
  assert.equal(codexDesktop.capabilities["coordination.durable_state"].status, "fallback");
  assert.equal(codexDesktop.capabilities["coordination.scheduled_wake"].status, "native");
  assert.match(codexDesktop.capabilities["coordination.scheduled_wake"].evidence, /codex-desktop-26\.915\.31945/);
  assert.equal(codexDesktop.capabilities["workspace.isolate"].status, "unknown");
  assert.equal(codexDesktop.capabilities["workspace.write"].status, "native");
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

test("release packages expose public Skills while probe Skills remain test-only", async () => {
  const model = await loadModel();
  for (const adapter of model.adapters) {
    const skillRoot = join(repoRoot, adapter.packageDir, adapter.skillsDir);
    const installed = (await readdir(skillRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    assert.deepEqual(installed, model.skillCatalog.public);
    const catalog = JSON.parse(await readFile(
      join(repoRoot, adapter.packageDir, "SKILL_CATALOG.json"),
      "utf8",
    ));
    assert.deepEqual(catalog.skills.map((entry) => entry.name), model.skillCatalog.public);
    assert.equal(catalog.skills.every((entry) => entry.audience === "public"), true);
  }

  const stage = await mkdtemp(join(tmpdir(), "oh-my-stack-probe-packages-"));
  try {
    for (const adapter of model.adapters) {
      await renderTarget(stage, model, adapter, { includeProbes: true });
      const catalog = JSON.parse(await readFile(
        join(stage, adapter.packageDir, "SKILL_CATALOG.json"),
        "utf8",
      ));
      assert.equal(catalog.skills.length, model.skills.length);
      assert.equal(catalog.skills.filter((entry) => entry.audience === "probe").length, 12);
    }
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
});

test("generated manifests identify the public source repository", async () => {
  const model = await loadModel();
  const stage = await mkdtemp(join(tmpdir(), "oh-my-stack-public-metadata-"));
  try {
    for (const adapter of model.adapters) await renderTarget(stage, model, adapter);
    const manifests = [
      "packages/omp/package.json",
      "packages/codex/plugin.json",
      "packages/codex/.codex-plugin/plugin.json",
      "packages/claude-code/.claude-plugin/plugin.json",
    ];
    for (const path of manifests) {
      const manifest = JSON.parse(await readFile(join(stage, path), "utf8"));
      const repository = typeof manifest.repository === "string"
        ? manifest.repository
        : manifest.repository?.url;
      assert.match(repository, /github\.com\/williamwue\/oh-my-stack/);
      assert.match(manifest.homepage, /github\.com\/williamwue\/oh-my-stack/);
    }
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
});

test("source and generated packages satisfy repository validation", async () => {
  const model = await validate();
  const pkg = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
  assert.equal(model.project.version, pkg.version);
});
