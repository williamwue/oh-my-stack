import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { configure } from "../tools/configure-models.mjs";
import { prepareDelegation } from "../tools/codex-delegation.mjs";
import { repoRoot } from "../tools/generate.mjs";
import { resolveActiveResolution, resolveTaskSelection } from "../tools/model-resolution.mjs";
import { inspectSetup } from "../tools/setup-acceptance.mjs";

const execFileAsync = promisify(execFile);

for (const [runtime, option, variable] of [["codex", "codexHome", "CODEX_HOME"], ["pi", "piCodingAgentDir", "PI_CODING_AGENT_DIR"]]) {
  test(`${runtime} resolution honors explicit and ambient native homes with isolated user roots`, async t => {
    const root = await mkdtemp(join(tmpdir(), "oms-native-home-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const project = join(root, "project"), nativeHome = join(root, "native"), name = "oh-my-stack.resolution.json";
    await mkdir(project); await mkdir(nativeHome);
    await writeFile(join(nativeHome, name), JSON.stringify({ schemaVersion: 1, owner: "oh-my-stack", target: runtime,
      roles: { reviewer: { model: "native-home-model", reasoning: "high" } } }));
    const explicit = await resolveActiveResolution({ runtime, cwd: project, userRoot: root, [option]: nativeHome });
    assert.equal(explicit?.path, join(nativeHome, name));
    const script = join(repoRoot, "tools/model-resolution.mjs");
    const env = { ...process.env, HOME: root, [variable]: nativeHome };
    const ambient = await execFileAsync(process.execPath, [script, "--runtime", runtime, "--cwd", project], { env });
    assert.equal(JSON.parse(ambient.stdout).path, join(nativeHome, name));
    if (runtime === "codex") {
      const source = `const { prepareDelegation } = await import(${JSON.stringify(new URL("../tools/codex-delegation.mjs", import.meta.url).href)});
        console.log(JSON.stringify(await prepareDelegation(${JSON.stringify({ bundleRoot: join(repoRoot, "packages/codex"),
          cwd: project, roleName: "reviewer", taskName: "native_home", task: "Inspect the assigned fixture." })})));`;
      const delegated = await execFileAsync(process.execPath, ["--input-type=module", "--eval", source], { env });
      const prepared = JSON.parse(delegated.stdout);
      assert.equal(prepared.model, "native-home-model");
      assert.equal(prepared.audit.resolutionScope, "user");
      assert.equal(prepared.audit.requestScope.resolutionPath, await realpath(join(nativeHome, name)));
    }
    const isolated = await execFileAsync(process.execPath, [script, "--runtime", runtime, "--cwd", project, "--user-root", root], { env });
    assert.equal(JSON.parse(isolated.stdout).path, null);
    await assert.rejects(resolveActiveResolution({ runtime, cwd: project, userRoot: root, [option]: "relative" }), /absolute path/);
    await assert.rejects(execFileAsync(process.execPath, [script, "--runtime", runtime, "--cwd", project],
      { env: { ...env, [variable]: "relative" } }), /absolute path/);
    const local = join(project, runtime === "codex" ? ".codex" : ".pi");
    await mkdir(local);
    await writeFile(join(local, name), JSON.stringify({ schemaVersion: 1, owner: "oh-my-stack", target: runtime }));
    const shadowed = await resolveActiveResolution({ runtime, cwd: project, userRoot: root, [option]: nativeHome });
    assert.equal(shadowed.scope, "project"); assert.equal(shadowed.path, join(local, name));
  });
}

test("Pi uses independent native user and nearest project resolution without OMP fallthrough", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-pi-native-resolution-"));
  const project = join(root, "project");
  await mkdir(join(root, ".omp/agent"), { recursive: true });
  await mkdir(join(root, ".pi/agent"), { recursive: true });
  await mkdir(join(project, ".pi"), { recursive: true });
  await mkdir(join(project, "nested"), { recursive: true });
  const name = "oh-my-stack.resolution.json";
  const manifest = { schemaVersion: 1, owner: "oh-my-stack", target: "pi", routes: {} };
  await writeFile(join(root, ".omp/agent", name), JSON.stringify({ ...manifest, target: "omp" }));
  assert.equal(await resolveActiveResolution({ runtime: "pi", cwd: project, userRoot: root }), null);
  await writeFile(join(root, ".pi/agent", name), JSON.stringify(manifest));
  assert.equal((await resolveActiveResolution({ runtime: "pi", cwd: project, userRoot: root })).scope, "user");
  await writeFile(join(project, ".pi", name), JSON.stringify(manifest));
  const resolution = await resolveActiveResolution({ runtime: "pi", cwd: join(project, "nested"), userRoot: root });
  assert.equal(resolution.scope, "project");
  assert.equal(resolution.path, join(project, ".pi", name));
  await writeFile(resolution.path, JSON.stringify({ ...manifest, target: "omp" }));
  await assert.rejects(resolveActiveResolution({ runtime: "pi", cwd: project, userRoot: root }), /invalid pi/);
});

async function inventory(root, runtime) {
  const prefix = runtime === "omp" ? "openai-codex/" : "";
  const path = join(root, `${runtime}-models.json`);
  await writeFile(path, `${JSON.stringify({
    schemaVersion: 1, runtime, observedAt: "2026-09-24T00:00:00Z", source: "test inventory",
    models: ["gpt-6-luna", "gpt-6.1-sol", "gpt-6-astra"].map((name) => ({
      id: `${prefix}${name}`, reasoningEfforts: ["low", "medium", "high", "xhigh"],
    })),
  })}\n`);
  return path;
}

test("user setup is inherited in two projects and a project manifest overrides only its project", async () => {
  const root = await mkdtemp(join(tmpdir(), "ohmystack-user-scope-"));
  for (const runtime of ["omp", "codex"]) {
    const packageRoot = join(repoRoot, "packages", runtime);
    const inventoryPath = await inventory(root, runtime);
    const presetName = runtime === "omp" ? "pstack-openai-codex" : "pstack";
    const nativeUser = join(root, runtime === "omp" ? ".omp/agent" : ".codex");
    const projectA = join(root, `${runtime}-a`);
    const projectB = join(root, `${runtime}-b`);
    await mkdir(join(projectA, "src"), { recursive: true });
    await mkdir(join(projectB, "src"), { recursive: true });
    const preview = await configure({ packageRoot, inventoryPath, userRoot: root, presetName, budget: "medium", apply: false });
    assert.equal(preview.manifest.routes["code.bug-fix"].entries[0].reasoning, "high");
    const globalPath = join(nativeUser, "oh-my-stack.resolution.json");
    assert.equal(preview.configuration.status, "preview");
    assert.equal(preview.configuration.scope, "user");
    assert.equal(preview.configuration.manifestPath, globalPath);
    await assert.rejects(readFile(globalPath));
    await configure({ packageRoot, inventoryPath, userRoot: root, presetName, budget: "medium", apply: true });
    const globalBefore = await readFile(globalPath, "utf8");
    const extension = runtime === "omp" ? "md" : "toml";
    assert.match(await readFile(join(nativeUser, "agents", `ohmystack-code-bug-fix.${extension}`), "utf8"),
      /gpt-6.1-sol/);
    assert.match(await readFile(join(nativeUser, "agents", `ohmystack-role-reviewer.${extension}`), "utf8"),
      /ohmystack-role-reviewer/);
    const inheritedA = await resolveActiveResolution({ runtime, cwd: join(projectA, "src"), userRoot: root });
    const inheritedB = await resolveActiveResolution({ runtime, cwd: join(projectB, "src"), userRoot: root });
    assert.equal(inheritedA.scope, "user");
    assert.equal(inheritedB.path, globalPath);

    const override = runtime === "omp" ? "openai-codex/gpt-6-luna@low" : "gpt-6-luna@low";
    await configure({ packageRoot, inventoryPath, projectRoot: projectA, presetName, budget: "medium",
      routeSelections: { "code.bug-fix": override }, apply: true });
    const selectedA = await resolveActiveResolution({ runtime, cwd: join(projectA, "src"), userRoot: root });
    const selectedB = await resolveActiveResolution({ runtime, cwd: join(projectB, "src"), userRoot: root });
    assert.equal(selectedA.scope, "project");
    assert.equal(selectedA.manifest.routes["code.bug-fix"].entries[0].model, override.slice(0, override.lastIndexOf("@")));
    assert.equal(selectedB.scope, "user");
    assert.equal(await readFile(globalPath, "utf8"), globalBefore);

    // A successful file audit must not imply the current project uses that file.
    const shadowed = await inspectSetup({ resolutionPath: globalPath, cwd: projectA, userRoot: root });
    assert.equal(shadowed.configuration, "verified");
    assert.equal(shadowed.activation, "unverified");
    assert.equal(shadowed.effectiveConfiguration.scope, "project");
    assert.equal(shadowed.effectiveConfiguration.path, selectedA.path);
    assert.equal(shadowed.effectiveConfiguration.matchesAuditedResolution, false);
    const inherited = await inspectSetup({ resolutionPath: globalPath, cwd: projectB, userRoot: root });
    assert.equal(inherited.effectiveConfiguration.scope, "user");
    assert.equal(inherited.effectiveConfiguration.matchesAuditedResolution, true);
    const unchecked = await inspectSetup({ resolutionPath: globalPath });
    assert.equal(unchecked.effectiveConfiguration, null);
    assert.equal(await readFile(globalPath, "utf8"), globalBefore);

    const rerun = await configure({ packageRoot, inventoryPath, userRoot: root, presetName, apply: false });
    assert.equal(rerun.manifest.budget, "medium");
    assert.deepEqual(rerun.manifest.budgetPolicy, { version: 2, kind: "reasoning-target", level: "high", costLimit: false });
    assert.equal((await resolveActiveResolution({ runtime, cwd: join(projectA, "src"), userRoot: root })).scope, "project");
    if (runtime === "codex") {
      const task = { bundleRoot: packageRoot, routeName: "code.bug-fix", taskName: "fix_probe", task: "Read one file." };
      const fromA = await prepareDelegation({ ...task, cwd: projectA, userRoot: root });
      const fromB = await prepareDelegation({ ...task, cwd: projectB, userRoot: root });
      assert.equal(fromA.model, "gpt-6-luna");
      assert.equal(fromA.audit.resolutionScope, "project");
      assert.equal(fromB.model, "gpt-6.1-sol");
      assert.equal(fromB.audit.resolutionScope, "user");
    }
  }
});

test("Claude Code uses native user and project agent scopes without claiming activation", async () => {
  const root = await mkdtemp(join(tmpdir(), "ohmystack-claude-scope-"));
  const project = join(root, "project");
  await mkdir(project);
  const inventoryPath = join(root, "claude-models.json");
  await writeFile(inventoryPath, `${JSON.stringify({
    schemaVersion: 1, runtime: "claude-code", observedAt: "2026-09-25T00:00:00Z", source: "fixture model probes",
    models: [
      { id: "claude-haiku-4-5", reasoningEfforts: ["none"] },
      { id: "claude-sonnet-5", reasoningEfforts: ["low", "medium", "high"] },
      { id: "claude-opus-5-5", reasoningEfforts: ["low", "medium", "high"] },
    ],
  })}\n`);
  const packageRoot = join(repoRoot, "packages", "claude-code");
  const selections = { fast: "claude-haiku-4-5@none", balanced: "claude-sonnet-5@medium", deep: "claude-opus-5-5@high" };
  const options = { packageRoot, inventoryPath, selections, routeSelections: { "how.explorer": "claude-haiku-4-5@none" }, apply: true };
  await configure({ ...options, userRoot: root });
  const userPath = join(root, ".claude", "oh-my-stack.resolution.json");
  assert.match(await readFile(join(root, ".claude", "agents", "ohmystack-role-explorer.md"), "utf8"), /effort: "high"/);
  assert.doesNotMatch(await readFile(join(root, ".claude", "agents", "ohmystack-how-explorer.md"), "utf8"), /effort:/);
  assert.equal((await resolveActiveResolution({ runtime: "claude-code", cwd: project, userRoot: root })).scope, "user");
  const audit = await inspectSetup({ resolutionPath: userPath, cwd: project, userRoot: root });
  assert.equal(audit.configuration, "verified");
  assert.equal(audit.activation, "unverified");
  assert.equal(audit.effectiveConfiguration.matchesAuditedResolution, true);
  await configure({ ...options, projectRoot: project });
  const active = await resolveActiveResolution({ runtime: "claude-code", cwd: project, userRoot: root });
  assert.equal(active.scope, "project");
  const packaged = await execFileAsync(process.execPath, [join(packageRoot, "scripts", "model-resolution.mjs"),
    "--runtime", "claude-code", "--cwd", project, "--user-root", root]);
  assert.equal(JSON.parse(packaged.stdout).path, active.path);
  const receipt = await execFileAsync(process.execPath, [join(packageRoot, "scripts", "setup-acceptance.mjs"),
    "--resolution", active.path, "--cwd", project]);
  assert.equal(JSON.parse(receipt.stdout).activation, "unverified");
  assert.equal((await inspectSetup({ resolutionPath: userPath, cwd: project, userRoot: root })).effectiveConfiguration.matchesAuditedResolution, false);
  await assert.rejects(inspectSetup({ resolutionPath: active.path, routeName: "how.explorer",
    parentRecord: "parent", childRecord: "child", requestPath: "request" }),
  /does not accept an explicit-spawn request/);
});

test("Claude user setup and audit honor CLAUDE_CONFIG_DIR without touching the normal home scope", async () => {
  const root = await mkdtemp(join(tmpdir(), "ohmystack-claude-custom-config-"));
  const configDir = join(root, "custom-config");
  const project = join(root, "project");
  await mkdir(project);
  const inventoryPath = join(root, "inventory.json");
  await writeFile(inventoryPath, `${JSON.stringify({ schemaVersion: 1, runtime: "claude-code",
    observedAt: "2026-09-25T00:00:00Z", source: "fixture probe",
    models: [{ id: "claude-sonnet-5", reasoningEfforts: ["high"] },
      { id: "claude-opus-5-5", reasoningEfforts: ["high"] }],
  })}\n`);
  const packageRoot = join(repoRoot, "packages", "claude-code");
  const environment = { ...process.env, CLAUDE_CONFIG_DIR: configDir };
  const apply = await execFileAsync(process.execPath, [join(packageRoot, "scripts", "configure-models.mjs"),
    "--inventory", inventoryPath, "--user", "--fast", "claude-sonnet-5@high",
    "--balanced", "claude-sonnet-5@high", "--deep", "claude-opus-5-5@high",
    "--route", "how.explorer=claude-sonnet-5@high", "--apply"], { env: environment });
  const applied = JSON.parse(apply.stdout);
  assert.equal(applied.configuration.manifestPath, join(configDir, "oh-my-stack.resolution.json"));
  await assert.rejects(readFile(join(root, ".claude", "oh-my-stack.resolution.json")));
  const selected = await resolveActiveResolution({ runtime: "claude-code", cwd: project,
    userRoot: root, claudeConfigDir: configDir });
  assert.equal(selected.scope, "user");
  assert.equal(selected.path, applied.configuration.manifestPath);
  const receipt = await inspectSetup({ resolutionPath: selected.path, cwd: project,
    userRoot: root, claudeConfigDir: configDir });
  assert.equal(receipt.effectiveConfiguration.matchesAuditedResolution, true);
  await assert.rejects(configure({ packageRoot, inventoryPath, userRoot: root,
    claudeConfigDir: "relative-path", selections: { fast: "claude-sonnet-5@high",
      balanced: "claude-sonnet-5@high", deep: "claude-opus-5-5@high" } }), /must be an absolute path/);
});

test("user setup preserves unrelated personal agents and refuses an owned-name collision", async () => {
  const root = await mkdtemp(join(tmpdir(), "ohmystack-user-collision-"));
  const inventoryPath = await inventory(root, "codex");
  const agents = join(root, ".codex", "agents");
  await mkdir(agents, { recursive: true });
  const role = join(agents, "reviewer.toml");
  await writeFile(role, "personal agent\n");
  await configure({ packageRoot: join(repoRoot, "packages", "codex"),
    inventoryPath, userRoot: root, presetName: "pstack", apply: true });
  assert.equal(await readFile(role, "utf8"), "personal agent\n");
  const ownedRole = join(agents, "ohmystack-role-reviewer.toml");
  await writeFile(ownedRole, "personal modification\n");
  await assert.rejects(configure({ packageRoot: join(repoRoot, "packages", "codex"),
    inventoryPath, userRoot: root, presetName: "pstack", apply: true }), /refusing to overwrite an unowned or modified file/);
  assert.equal(await readFile(role, "utf8"), "personal agent\n");
  assert.equal(await readFile(ownedRole, "utf8"), "personal modification\n");

  const anotherHome = await mkdtemp(join(tmpdir(), "ohmystack-unowned-collision-"));
  const anotherAgents = join(anotherHome, ".codex", "agents");
  await mkdir(anotherAgents, { recursive: true });
  const collision = join(anotherAgents, "ohmystack-role-reviewer.toml");
  await writeFile(collision, "unowned namespaced role\n");
  await assert.rejects(configure({ packageRoot: join(repoRoot, "packages", "codex"),
    inventoryPath, userRoot: anotherHome, presetName: "pstack", apply: true }), /refusing to overwrite an unowned or modified file/);
  assert.equal(await readFile(collision, "utf8"), "unowned namespaced role\n");
  await assert.rejects(readFile(join(anotherHome, ".codex", "oh-my-stack.resolution.json")));
});

test("invalid project resolution fails closed and does not silently use the user default", async () => {
  const root = await mkdtemp(join(tmpdir(), "ohmystack-resolution-invalid-"));
  const project = join(root, "project");
  await mkdir(join(project, ".codex"), { recursive: true });
  await writeFile(join(project, ".codex", "oh-my-stack.resolution.json"), '{"owner":"other"}\n');
  await assert.rejects(resolveActiveResolution({ runtime: "codex", cwd: project, userRoot: root }), /invalid codex/);
});

test("the CLI defaults to user scope without touching the real home directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "ohmystack-user-cli-"));
  const inventoryPath = await inventory(root, "codex");
  const packageRoot = join(repoRoot, "packages", "codex");
  const args = [join(packageRoot, "scripts", "configure-models.mjs"),
    "--inventory", inventoryPath, "--preset", "pstack", "--budget", "medium"];
  const environment = { ...process.env, HOME: root, USERPROFILE: root };
  const preview = JSON.parse((await execFileAsync(process.execPath, args, { env: environment })).stdout);
  assert.equal(preview.applied, false);
  assert.ok(preview.writes.every((path) => path.startsWith(join(root, ".codex", "agents"))));
  await assert.rejects(readFile(join(root, ".codex", "oh-my-stack.resolution.json")));
  await execFileAsync(process.execPath, [...args, "--apply"], { env: environment });
  const project = join(root, "project");
  await mkdir(project);
  const selected = JSON.parse((await execFileAsync(process.execPath,
    [join(packageRoot, "scripts", "model-resolution.mjs"), "--runtime", "codex", "--cwd", project],
    { env: environment })).stdout);
  assert.equal(selected.scope, "user");
  assert.equal(selected.path, join(root, ".codex", "oh-my-stack.resolution.json"));
});


test("task effort uses the saved model and observed options without mutating the role line", () => {
  const selection = { model: "observed-model", reasoning: "high", speed: "standard", agent: "saved-agent" };
  const inventory = { schemaVersion: 1, runtime: "codex", source: "fixture model/list",
    observedAt: "2026-10-14T00:00:00Z",
    models: [{ id: "observed-model", reasoningEfforts: ["xhigh", "low", "medium", "high"] }] };
  const prepare = (kind, extra = {}) => resolveTaskSelection({ selection,
    jobContext: { kind }, inventory, runtime: "codex", ...extra });
  for (const [kind, reasoning] of [["hardest", "xhigh"], ["judgment", "medium"],
    ["routine", "low"], ["verification", "high"]]) {
    const result = prepare(kind);
    assert.deepEqual(result.selection, { model: "observed-model", reasoning, speed: "standard", agent: "saved-agent" });
    assert.equal(result.audit.configured.reasoning, "high");
    assert.equal(result.audit.selected.reasoning, reasoning);
  }
  assert.deepEqual(selection, { model: "observed-model", reasoning: "high", speed: "standard", agent: "saved-agent" });
  assert.equal(prepare("hardest", { selection: { ...selection, reasoning: "xhigh" } }).selection.reasoning, "xhigh");
  assert.equal(prepare("routine", { selection: { ...selection, reasoning: "low" } }).selection.reasoning, "low");
  const noInventory = prepare("routine", { inventory: undefined });
  assert.equal(noInventory.selection.reasoning, "high");
  assert.equal(noInventory.audit.reason, "saved-entry-only-no-observed-alternatives");
  const urgent = prepare("routine", { jobContext: { kind: "routine", urgent: true } });
  assert.deepEqual(urgent.audit.speed, { requested: "fast", applied: false, reason: "native-helper-has-no-speed-selector" });
  assert.equal(prepare("verification", { selection: { ...selection, speed: "fast" } }).audit.speed.requested, "fast");
  const rejection = { model: "observed-model", reasoning: "xhigh", reason: "host rejected xhigh" };
  const retry = prepare("hardest", { rejectedAdjustment: rejection });
  assert.deepEqual(retry.selection, selection);
  assert.equal(retry.audit.reason, "adjustment-rejected-retry-original-role-line");
  assert.deepEqual(retry.audit.rejectedAdjustment, rejection);
  assert.throws(() => prepare("hardest", { rejectedAdjustment: { ...rejection, model: "guessed-model" } }), /must identify/);
  assert.throws(() => prepare("routine", { inventory: { ...inventory, runtime: "pi" } }), /matching observed/);
  assert.throws(() => prepare("routine", { inventory: { ...inventory, models: [] } }), /saved model and reasoning/);
  assert.throws(() => prepare("unknown"), /jobContext requires/);
  assert.throws(() => prepare("routine", { jobContext: { kind: "routine", urgent: "yes" } }), /boolean urgent/);
});

test("task contexts preserve inherited aliases without selecting a guessed replacement", () => {
  for (const alias of ["inherit-parent", "auto"]) {
    const selection = { model: null, reasoning: null, inheritParent: true, alias };
    const result = resolveTaskSelection({ selection, runtime: "codex",
      jobContext: { kind: "hardest", urgent: true } });
    assert.deepEqual(result.selection, selection);
    assert.equal(result.audit.reason, "inherited-alias-unchanged");
    assert.equal(result.audit.speed.requested, null);
  }
});


test("hardest effort stops at advertised max without selecting ultra or inventing a missing level", () => {
  const inventory = { schemaVersion: 1, runtime: "codex", source: "fixture native options",
    observedAt: "2026-10-14T00:00:00Z",
    models: [{ id: "saved-model", reasoningEfforts: ["low", "high", "max", "ultra"] }] };
  const prepare = (reasoning, observed = inventory) => resolveTaskSelection({
    selection: { model: "saved-model", reasoning }, inventory: observed, runtime: "codex", jobContext: { kind: "hardest" } });
  assert.equal(prepare("high").selection.reasoning, "max");
  assert.equal(prepare("max").selection.reasoning, "max");
  assert.equal(prepare("ultra").selection.reasoning, "ultra");
  assert.equal(prepare("high", { ...inventory,
    models: [{ id: "saved-model", reasoningEfforts: ["high", "ultra"] }] }).selection.reasoning, "high");
});


test("bare rejection cannot authorize a stale retry and the original model options remain intact", () => {
  const selection = { model: "saved-model", reasoning: "high", speed: "standard",
    modelOptions: { verbosity: "low" } };
  const inventory = { schemaVersion: 1, runtime: "codex", source: "local host rejection fixture",
    observedAt: "2026-10-14T00:00:00Z",
    models: [{ id: "saved-model", reasoningEfforts: ["low", "high", "max"] }] };
  const input = { selection, inventory, runtime: "codex", jobContext: { kind: "hardest" } };
  const prepared = resolveTaskSelection(input);
  assert.equal(prepared.selection.reasoning, "max");
  assert.deepEqual(prepared.audit.configuredSelection, { model: "saved-model", reasoning: "high",
    speed: "standard", modelOptions: { verbosity: "low" } });
  const rejectedAdjustment = { model: "saved-model", reasoning: "max", reason: "fixture rejection, backend not verified" };
  const sameCatalog = resolveTaskSelection({ ...input, rejectedAdjustment });
  assert.deepEqual(sameCatalog.selection, { model: "saved-model", reasoning: "high",
    speed: "standard", modelOptions: { verbosity: "low" } });
  for (const observed of [undefined, { ...inventory,
    models: [{ id: "saved-model", reasoningEfforts: ["low", "high"] }] }]) {
    assert.throws(() => resolveTaskSelection({ ...input, inventory: observed, rejectedAdjustment }), /must identify/);
    const unchanged = resolveTaskSelection({ ...input, inventory: observed });
    assert.equal(unchanged.selection.reasoning, "high");
    assert.equal(unchanged.selection.model, "saved-model");
  }
});
