import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import test from "node:test";

import {
  compareTrees,
  generate,
  loadModel,
  renderTarget,
  repoRoot,
  validateCoreText,
  validateRequirementSupport,
  validateRenderedTarget,
} from "../tools/generate.mjs";

const execFileAsync = promisify(execFile);

test("all host descriptors preserve Poteto code contracts and bounded Architect writers", async () => {
  const stage = await mkdtemp(join(tmpdir(), "oms-worker-role-generation-"));
  try {
    const model = await loadModel();
    for (const adapter of model.adapters) {
      const target = await renderTarget(stage, model, adapter);
      const descriptor = JSON.parse(await readFile(join(target, "config/runtime-resolution.json"), "utf8"));
      for (const [name, route] of Object.entries(descriptor.routes).filter(([name]) => name.startsWith("code."))) {
        assert.equal(route.role, "poteto-agent", `${adapter.id}/${name}`);
      }
      assert.equal(descriptor.routes["hardest.tasks"].role, "implementer");
      assert.equal(descriptor.routes["how.explorer"].role, "explorer");
      assert.equal(descriptor.routes["architect.runners"].role, "design-runner");
      assert.equal(descriptor.routes["architect.runners"].defaultCount, 2);
      const role = descriptor.roles.find((role) => role.name === "design-runner");
      assert.equal(role.writes, true);
      assert.equal(role.workload, "deep");
      assert.ok(!role.constraints.includes("read_only"));
      if (["codex", "pi"].includes(adapter.id)) {
        const contracts = JSON.parse(await readFile(join(target, "config/role-contracts.json"), "utf8"));
        assert.deepEqual(contracts.routeRoles, Object.fromEntries(Object.entries(descriptor.routes).map(([name, route]) => [name, route.role])));
        assert.match(contracts.roles["poteto-agent"].instructions, /Read the `poteto-mode` skill's `SKILL.md` in full/);
        assert.match(contracts.roles["design-runner"].instructions, /Do not implement or modify application code/);
      }
      const extension = adapter.id === "codex" ? "toml" : adapter.id === "pi" ? "json" : "md";
      const writer = await readFile(join(target, "agents", `design-runner.${extension}`), "utf8");
      if (adapter.id === "codex") assert.match(writer, /sandbox_mode = "workspace-write"/);
      if (adapter.id === "pi") assert.equal(JSON.parse(writer).writes, true);
      if (adapter.id === "omp") {
        assert.match(writer, /  - edit\n/);
        assert.match(writer, /  - write\n/);
      }
      if (adapter.id === "claude-code") {
        assert.match(writer, /tools: Read, Grep, Glob, Bash, Edit, Write/);
        const setup = await readFile(join(target, "skills/setup-oh-my-stack/SKILL.md"), "utf8");
        assert.match(setup, /Fresh ordered two-worker panels use\nOpus\/Sonnet/);
        assert.match(setup, /Haiku remains the fast workload choice/);
        assert.match(setup, /membership, order and size \(including three-member panels\)/);
        assert.doesNotMatch(setup, /ordered three-worker panels|Opus\/Sonnet\/Haiku|Astra\/Sol\/Luna arrangement/);
      }
    }
  } finally { await rm(stage, { recursive: true, force: true }); }
});

test("default routing resources remain present with every extension selection", async () => {
  const stage = await mkdtemp(join(tmpdir(), "oms-extension-closure-"));
  try {
    for (const extensions of [[], ["enhanced-delivery"], ["auto-routing"], ["extras"], ["aihero"]]) {
      const model = await loadModel(repoRoot, { extensions });
      const directory = join(stage, extensions[0] ?? "strict");
      for (const adapter of model.adapters) {
        const target = await renderTarget(directory, model, adapter);
        await validateRenderedTarget(target, adapter, model);
        const has = async (path) => access(join(target, path)).then(() => true, () => false);
        assert.equal(await has("scripts/delivery-evidence.mjs"), extensions.includes("enhanced-delivery"), adapter.id);
        assert.equal(await has("docs/delivery-evidence.md"), extensions.includes("enhanced-delivery"), adapter.id);
        assert.equal(await has("skills/oms-enhanced-delivery/SKILL.md"), extensions.includes("enhanced-delivery"), adapter.id);
        assert.equal(await has("skills/oms-auto/SKILL.md"), true, adapter.id);
        assert.equal(await has("skills/setup-benny/SKILL.md"), extensions.includes("extras"), adapter.id);
        assert.equal(await has("skills/codebase-design/SKILL.md"), extensions.includes("aihero"), adapter.id);
        const routing = ["codex", "claude-code"].includes(adapter.id);
        assert.equal(await has("scripts/routing.mjs"), routing, adapter.id);
        assert.equal(await has("docs/automatic-routing.md"), routing, adapter.id);
        const entry = await readFile(join(target, "skills/oms-auto/SKILL.md"), "utf8");
        assert.match(entry, routing ? /automatic routing binding/ : /Automatic routing availability/, adapter.id);
        assert.equal(await has("hooks/hooks.json"), routing, adapter.id);
        const manifest = JSON.parse(await readFile(join(target, adapter.manifestPath), "utf8"));
        assert.equal(Boolean(manifest.hooks), routing, adapter.id);
        if (extensions.includes("enhanced-delivery")) {
          await execFileAsync(process.execPath, ["--input-type=module", "-e",
            `await import(${JSON.stringify(pathToFileURL(join(target, "scripts/delivery-native-attribution.mjs")).href)})`]);
        }
        for (const name of ["feature", "poteto-mode", "figure-it-out", "interrogate"]) {
          const path = join(target, "skills", name);
          const entry = await readFile(join(path, "SKILL.md"), "utf8");
          const complete = entry.includes("](WORKFLOW.md)") ? await readFile(join(path, "WORKFLOW.md"), "utf8") : entry;
          assert.doesNotMatch(complete, /Local delivery evidence binding|Child session handoff|reflect\.synthesizer.*later synthesis pass/);
        }
      }
    }
    await assert.rejects(loadModel(repoRoot, { extensions: ["unknown"] }), /unknown extension/);
    await assert.rejects(loadModel(repoRoot, { extensions: ["extras", "extras"] }), /duplicate extension/);
  } finally { await rm(stage, { recursive: true, force: true }); }
});

test("generator CLI writes isolated strict or opt-in outputs and rejects unknown selections", async () => {
  const outputRoot = await mkdtemp(join(tmpdir(), "oms CLI output with spaces "));
  const before = await readFile(join(repoRoot, "packages/codex/GENERATION.json"));
  try {
    await execFileAsync(process.execPath, [join(repoRoot, "tools/generate.mjs"), "--output-root", outputRoot, "--extensions", "extras"]);
    const catalog = JSON.parse(await readFile(join(outputRoot, "packages/codex/SKILL_CATALOG.json"), "utf8"));
    assert.deepEqual(catalog.selection, { base: "pstack", extensions: ["extras"] });
    assert.ok(catalog.skills.some((entry) => entry.name === "setup-benny"));
    assert.equal(catalog.skills.find((entry) => entry.name === "setup-benny").source, undefined);
    assert.ok(catalog.resources.some((entry) => entry.name === "setup-benny" && entry.origin === "pstack"));
    assert.deepEqual(await readFile(join(repoRoot, "packages/codex/GENERATION.json")), before);
    await assert.rejects(execFileAsync(process.execPath, [join(repoRoot, "tools/generate.mjs"), "--output-root", outputRoot, "--extensions", "unknown"]), /unknown extension/);
  } finally { await rm(outputRoot, { recursive: true, force: true }); }
});


function expectedCodexBody(name, sourceText) {
  const routes = {
    feature: "code.feature-refactoring", refactoring: "code.feature-refactoring",
    "bug-fix": "code.bug-fix", "perf-issue": "code.perf-issue", hillclimb: "code.hillclimb",
  };
  let body = sourceText.replace(/^---\n[\s\S]*?\n---\n/, "").trim().replace(/^# .+\n/, "").trim();
  if (routes[name]) body = body.replaceAll("`code.delegates`", `\`${routes[name]}\``);
  return body;
}

test("Codex bundles the bounded GitHub workflow and its dependencies", async () => {
  const model = await loadModel();
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-github-binding-"));
  try {
    const target = await renderTarget(root, model, model.adapters.find((entry) => entry.id === "codex"));
    for (const name of ["github-workflow.mjs", "github-autopilot-provider.mjs", "durable-run-state.mjs"]) {
      assert.equal(await readFile(join(target, "scripts", name), "utf8"),
        await readFile(join(repoRoot, "tools", name), "utf8"));
    }
    assert.equal(await readFile(join(target, "docs", "github-workflow.md"), "utf8"),
      await readFile(join(repoRoot, "docs", "github-workflow.md"), "utf8"));
    for (const name of ["opening-a-pr", "babysit", "shipping"]) {
      const skill = await readFile(join(target, "skills", name, "SKILL.md"), "utf8");
      const complete = skill.includes("](WORKFLOW.md)")
        ? await readFile(join(target, "skills", name, "WORKFLOW.md"), "utf8") : skill;
      assert.match(complete, /Codex GitHub workflow binding/);
      assert.match(complete, /\.\.\/\.\.\/docs\/github-workflow\.md/);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("Codex wraps long core entries and preserves source originals byte for byte", async () => {
  const model = await loadModel();
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-long-skills-"));
  try {
    const adapter = model.adapters.find((entry) => entry.id === "codex");
    const target = await renderTarget(root, model, adapter);
    for (const name of model.skillCatalog.public) {
      const path = join(target, "skills", name);
      const entry = await readFile(join(path, "SKILL.md"), "utf8");
      const source = model.skills.find((skill) => skill.metadata.name === name);
      if (source.source) {
        assert.equal(entry, source.text, `${name}: original cannot be rewritten to meet the core injection budget`);
        continue;
      }
      assert.ok(Buffer.byteLength(entry) <= 7500, `${name}: direct core entry exceeds safe injection budget`);
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
  const stage = await mkdtemp(join(tmpdir(), "oms-codex-metadata-"));
  const target = await renderTarget(stage, model, model.adapters.find((adapter) => adapter.id === "codex"));
  const catalog = JSON.parse(await readFile(join(target, "SKILL_CATALOG.json"), "utf8"));
  assert.deepEqual(catalog.skills.map((skill) => skill.name), model.skillCatalog.public);
  assert.equal(catalog.skills.filter((skill) => skill.category === "workflow").length, model.skillCatalog.public.length - 24);
  assert.equal(catalog.skills.filter((skill) => skill.category === "principle").length, 24);
  let originalLength = 0;
  let generatedLength = 0;
  for (const name of model.skillCatalog.public) {
    const source = model.skills.find((skill) => skill.metadata.name === name);
    const document = await readFile(join(target, "skills", name, "SKILL.md"), "utf8");
    if (source.source) {
      assert.equal(document, source.text, `${name}: preserve original frontmatter and instructions`);
      continue;
    }
    const description = JSON.parse(document.match(/^description: (.+)$/m)[1]);
    assert.ok(description.length <= 120, name);
    const body = (text) => text.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    const complete = document.includes("](WORKFLOW.md)")
      ? await readFile(join(target, "skills", name, "WORKFLOW.md"), "utf8") : document;
    const sourceAfterHeading = expectedCodexBody(name, source.text);
    assert.ok(body(complete).endsWith(sourceAfterHeading), name);
    const metadata = await readFile(join(target, "skills", name, "agents/openai.yaml"), "utf8");
    assert.ok(metadata.includes(`Use $${name} for this task.`), name);
    assert.ok(metadata.includes(`allow_implicit_invocation: ${source.metadata.invocation === "automatic"}`), name);
    assert.ok(metadata.includes(name.startsWith("principle-") ? "Principle: " : "Workflow: "), name);
    originalLength += source.frontmatter.description.length;
    generatedLength += description.length;
  }
  assert.ok(generatedLength < originalLength * 0.6, "description character budget should decrease by at least 40%");
  await rm(stage, { recursive: true, force: true });
});

test("default selection includes routing and excludes optional additions across four adapters", async () => {
  const model = await loadModel();
  assert.deepEqual(model.selection, { base: "pstack", extensions: [] });
  assert.ok(model.skills.some((skill) => skill.metadata.name === "oms-auto"));
  assert.equal(model.entries.find((entry) => entry.name === "oms-auto").distribution, "core");
  assert.deepEqual((await loadModel(repoRoot, { extensions: ["auto-routing"] })).selection, model.selection);
  assert.deepEqual((await loadModel(repoRoot, { extensions: ["auto-routing", "extras"] })).selection,
    { base: "pstack", extensions: ["extras"] });
  for (const name of ["prove-it-works", "reproduce-and-fix-issues", "setup-benny", "triage-issue-reports", "oms-enhanced-delivery"]) {
    assert.equal(model.skills.some((skill) => skill.metadata.name === name), false, name);
  }
  assert.equal(model.sourceSkills.length, 0);
  assert.ok(model.skillCatalog.public.includes("setup-oh-my-stack"));
  assert.deepEqual(model.adapters.map((adapter) => adapter.id), ["omp", "codex", "claude-code", "pi"]);
  assert.equal(model.resolutionPolicy.routes["hardest.tasks"].role, "implementer");
  for (const route of Object.values(model.resolutionPolicy.routes)) if (route.kind === "panel") assert.equal(route.defaultCount, 2);
  for (const presets of Object.values(model.resolutionPresets).filter((value) => typeof value === "object")) {
    for (const preset of Object.values(presets)) for (const route of Object.values(preset.routes ?? {})) if (Array.isArray(route)) assert.equal(route.length, 2);
  }
  const profile = model.profiles.get("pi-default");
  assert.equal(profile.verification.status, "pending");
  assert.ok(Object.values(profile.capabilities).every((record) => record.status === "unknown" && record.evidence === null));
});

test("Pi renders independent JSON roles contracts and explicit canonical-role routes", async () => {
  const model = await loadModel();
  const stage = await mkdtemp(join(tmpdir(), "oms-pi-role-contracts-"));
  try {
    const target = await renderTarget(stage, model, model.adapters.find((adapter) => adapter.id === "pi"));
    const descriptor = JSON.parse(await readFile(join(target, "config/runtime-resolution.json"), "utf8"));
    const contracts = JSON.parse(await readFile(join(target, "config/role-contracts.json"), "utf8"));
    assert.equal(descriptor.adapter.format, "json");
    assert.equal(contracts.target, "pi");
    for (const role of model.roles) {
      const record = JSON.parse(await readFile(join(target, "agents", `${role.metadata.name}.json`), "utf8"));
      assert.equal(record.instructions, role.instructions.trim());
      assert.equal(record.writes, role.metadata.writes);
      assert.equal(contracts.roles[role.metadata.name].writes, role.metadata.writes);
      assert.equal(descriptor.routes[`role.${role.metadata.name}`].role, role.metadata.name);
    }
    assert.equal(contracts.roles["comment-sicko"].writes, true);
    assert.equal(descriptor.routes["role.poteto-agent"].role, "poteto-agent");
  } finally { await rm(stage, { recursive: true, force: true }); }
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
  assert.equal(claude.capabilities["skills.discover"].status, "native");
  assert.equal(claude.capabilities["agents.cancel"].status, "unknown");
  assert.equal(claude.capabilities["agents.custom_roles"].status, "native");
  assert.equal(claude.capabilities["agents.model_override"].status, "unknown");
  assert.equal(claude.capabilities["agents.reasoning_override"].status, "unknown");
  assert.equal(claude.capabilities["agents.spawn"].status, "native");
  assert.equal(claude.capabilities["agents.follow_up"].status, "unknown");
  assert.equal(claude.capabilities["agents.read_transcript"].status, "native");
  assert.equal(claude.capabilities["agents.spawn_parallel"].status, "unknown");
  assert.equal(claude.capabilities["workspace.isolate"].status, "unknown");
  assert.equal(claude.capabilities["workspace.write"].status, "unknown");
  assert.equal(claude.verification.status, "active");
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
  const skill = structuredClone(model.skills.find((entry) => entry.metadata.name === "setup-oh-my-stack"));
  skill.metadata.requires.push("workspace.inspect");
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
  const skill = model.skills.find((entry) => entry.metadata.name === "setup-oh-my-stack");
  skill.metadata.invocation = "explicit";
  const stage = await mkdtemp(join(tmpdir(), "oh-my-stack-invocation-"));
  try {
    for (const adapter of model.adapters) await renderTarget(stage, model, adapter);
    const ompSkill = await readFile(join(stage, "packages/omp/skills/setup-oh-my-stack/SKILL.md"), "utf8");
    const claudeSkill = await readFile(join(stage, "packages/claude-code/skills/setup-oh-my-stack/SKILL.md"), "utf8");
    const codexSkill = await readFile(join(stage, "packages/codex/skills/setup-oh-my-stack/SKILL.md"), "utf8");
    const codexPolicy = await readFile(
      join(stage, "packages/codex/skills/setup-oh-my-stack/agents/openai.yaml"),
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

test("isolated generation and check leave committed packages unchanged", async () => {
  const outputRoot = await mkdtemp(join(tmpdir(), "oms-isolated-generation-"));
  try {
    await generate({ root: repoRoot, outputRoot });
    await generate({ root: repoRoot, outputRoot, check: true });
  } finally { await rm(outputRoot, { recursive: true, force: true }); }
});

test("release packages expose public Skills while probe Skills remain test-only", async () => {
  const model = await loadModel();
  const publicStage = await mkdtemp(join(tmpdir(), "oms-public-stage-"));
  for (const adapter of model.adapters) {
    await renderTarget(publicStage, model, adapter);
    const skillRoot = join(publicStage, adapter.packageDir, adapter.skillsDir);
    const installed = (await readdir(skillRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    assert.deepEqual(installed, model.skillCatalog.public);
    const catalog = JSON.parse(await readFile(
      join(publicStage, adapter.packageDir, "SKILL_CATALOG.json"),
      "utf8",
    ));
    assert.deepEqual(catalog.skills.map((entry) => entry.name), model.skillCatalog.public);
    assert.equal(catalog.skills.every((entry) => entry.audience === "public"), true);
  }

  await rm(publicStage, { recursive: true, force: true });
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
