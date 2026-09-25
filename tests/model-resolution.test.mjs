import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { configure } from "../tools/configure-models.mjs";
import { prepareDelegation } from "../tools/codex-delegation.mjs";
import { repoRoot } from "../tools/generate.mjs";
import { resolveActiveResolution } from "../tools/model-resolution.mjs";
import { inspectSetup } from "../tools/setup-acceptance.mjs";

const execFileAsync = promisify(execFile);

async function inventory(root, runtime) {
  const prefix = runtime === "omp" ? "openai-codex/" : "";
  const path = join(root, `${runtime}-models.json`);
  await writeFile(path, `${JSON.stringify({
    schemaVersion: 1, runtime, observedAt: "2026-09-24T00:00:00Z", source: "test inventory",
    models: ["gpt-6-luna", "gpt-6-sol", "gpt-6-astra"].map((name) => ({
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
      /gpt-6-sol/);
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
    assert.equal((await resolveActiveResolution({ runtime, cwd: join(projectA, "src"), userRoot: root })).scope, "project");
    if (runtime === "codex") {
      const task = { bundleRoot: packageRoot, routeName: "code.bug-fix", taskName: "fix_probe", task: "Read one file." };
      const fromA = await prepareDelegation({ ...task, cwd: projectA, userRoot: root });
      const fromB = await prepareDelegation({ ...task, cwd: projectB, userRoot: root });
      assert.equal(fromA.model, "gpt-6-luna");
      assert.equal(fromA.audit.resolutionScope, "project");
      assert.equal(fromB.model, "gpt-6-sol");
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
  assert.match(await readFile(join(root, ".claude", "agents", "ohmystack-role-explorer.md"), "utf8"), /effort: "medium"/);
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
  const environment = { ...process.env, HOME: root };
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
