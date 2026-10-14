import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, parse } from "node:path";
import { promisify } from "node:util";
import test, { after, before } from "node:test";
import { compareTrees, generate, generateProbeTargets, loadModel, renderTarget, repoRoot, validateRenderedTarget } from "../tools/generate.mjs";
import { configureT3Resolution, prepareT3Delegation } from "../tools/t3-orchestration.mjs";
import { pathToFileURL } from "node:url";

const run = promisify(execFile);
const artifacts = {
  "scripts/t3-orchestration.mjs": ["tools/t3-orchestration.mjs", "export const fixtureRequest = Object.freeze({ tool: 'delegate_task' });\n"],
  "config/t3-resolution.schema.json": ["src/schemas/t3-resolution.schema.json", '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}\n'],
  "docs/t3-orchestration.md": ["docs/t3-orchestration.md", "# T3 fixture guide\n\nThe host invokes prepared requests.\n"],
  "docs/zh-CN/t3-orchestration.md": ["docs/zh-CN/t3-orchestration.md", "# T3 fixture guide in Chinese\n"],
};
let directory;
let source;
let nativeModel;
let selectedModel;
let nativeStage;
let selectedStage;

async function completeSkill(target, name) {
  const path = join(target, "skills", name);
  const skill = await readFile(join(path, "SKILL.md"), "utf8");
  return skill.includes("](WORKFLOW.md)") ? readFile(join(path, "WORKFLOW.md"), "utf8") : skill;
}

before(async () => {
  directory = await realpath(await mkdtemp(join(tmpdir(), "oms-t3-generation-")));
  source = join(directory, "source");
  await mkdir(source);
  await Promise.all(["src", "tools", "docs", "upstream", "LICENSE"].map((name) =>
    cp(join(repoRoot, name), join(source, name), { recursive: true })));
  for (const [path, bytes] of Object.values(artifacts)) {
    await mkdir(dirname(join(source, path)), { recursive: true });
    await writeFile(join(source, path), bytes);
  }
  nativeModel = await loadModel(source);
  selectedModel = await loadModel(source, { orchestration: "t3" });
  nativeStage = join(directory, "native");
  selectedStage = join(directory, "selected");
  for (const adapter of nativeModel.adapters) {
    await renderTarget(nativeStage, nativeModel, adapter);
    const target = await renderTarget(selectedStage, selectedModel, adapter);
    await validateRenderedTarget(target, adapter, selectedModel);
  }
});

after(async () => { await rm(directory, { recursive: true, force: true }); });

test("native defaults retain all four published trees and T3 leaves OMP/Pi unchanged", async () => {
  for (const adapter of nativeModel.adapters) {
    assert.deepEqual(await compareTrees(join(nativeStage, adapter.packageDir), join(repoRoot, adapter.packageDir)), [], adapter.id);
    if (["omp", "pi"].includes(adapter.id)) {
      assert.deepEqual(await compareTrees(join(nativeStage, adapter.packageDir), join(selectedStage, adapter.packageDir)), [], adapter.id);
    }
    const generation = JSON.parse(await readFile(join(selectedStage, adapter.packageDir, "GENERATION.json"), "utf8"));
    assert.deepEqual(generation.selection, ["omp", "pi"].includes(adapter.id)
      ? { base: "pstack", extensions: [] } : { base: "pstack", extensions: [], orchestration: "t3" });
  }
  const explicit = await loadModel(source, { orchestration: "native" });
  const stage = join(directory, "explicit-native");
  for (const adapter of explicit.adapters) {
    await renderTarget(stage, explicit, adapter);
    assert.deepEqual(await compareTrees(join(nativeStage, adapter.packageDir), join(stage, adapter.packageDir)), [], adapter.id);
  }
});

test("selected hosts retain their native manifests and complete pstack bodies with one T3 binding", async () => {
  for (const adapter of selectedModel.adapters.filter((entry) => ["codex", "claude-code"].includes(entry.id))) {
    const target = join(selectedStage, adapter.packageDir);
    assert.equal(await readFile(join(target, adapter.manifestPath), "utf8"),
      await readFile(join(nativeStage, adapter.packageDir, adapter.manifestPath), "utf8"));
    for (const entry of selectedModel.entries.filter((entry) => entry.kind === "skill" && entry.origin === "pstack" && entry.audience === "public")) {
      const document = await completeSkill(target, entry.name);
      const body = (await readFile(join(source, entry.path, "SKILL.md"), "utf8")).replace(/^---\n[\s\S]*?\n---\n/, "").trim();
      assert.equal(document.endsWith(`${body}\n`), true, `${adapter.id}/${entry.name} full source body`);
      assert.equal(document.split("## T3 orchestration binding").length - 1, 1);
      assert.doesNotMatch(document, /## Codex delegation binding|## Codex activation boundary|## Claude Code setup boundary|## Codex GitHub workflow binding/);
    }
    const feature = await completeSkill(target, "feature");
    assert.match(feature, /Use `delegate_task` for every selected unit, including same-provider work/);
    assert.match(feature, /Omitted options remain\ninherited or unpinned/);
    assert.match(feature, /Another project cannot\nbind to it/);
    assert.match(feature, /Do not override prepared\ntargets manually/);
    assert.match(feature, /Never attribute an agent-selected target to T3's automatic choice/);
    const entry = await readFile(join(target, "skills/poteto-mode/SKILL.md"), "utf8");
    if (adapter.id === "codex") assert.match(entry, /Read the \[complete workflow\]\(WORKFLOW.md\)/);
    const runtimeGuide = await readFile(join(target, "docs/runtime-binding.md"), "utf8");
    assert.match(runtimeGuide, /\(\.\.\/docs\/t3-orchestration.md\)/);
    assert.match(runtimeGuide, /node "<absolute-package-root>\/skills\/poteto-mode\/scripts\/check-plan.mjs" "<absolute-plan.md>"/);
    assert.match(runtimeGuide, /Do not execute Cursor worktree-audit.sh/);
    assert.match(runtimeGuide, /Missing active-thread or pinned-thread\nevidence leaves deletion candidates unresolved/);
    if (adapter.id === "codex") {
      assert.match(runtimeGuide, /PR monitoring uses T3 watch_pull_request/);
      assert.match(runtimeGuide, /Read docs\/github-workflow.md/);
    }
    assert.doesNotMatch(runtimeGuide, /Prepare each worker with scripts\/codex-delegation|native Agent tool/);
  }
});

test("actual packaged helpers prepare fresh default panels and explicit Poteto entry paths on both hosts", async () => {
  const model = await loadModel(repoRoot, { orchestration: "t3" });
  const catalog = JSON.parse(await readFile(join(repoRoot, "tests/fixtures/t3-catalog.json"), "utf8"));
  for (const host of ["codex", "claude-code"]) {
    const adapter = model.adapters.find(entry => entry.id === host);
    const bundleRoot = await renderTarget(join(directory, "actual-helpers"), model, adapter);
    const { configureT3Resolution, prepareT3Delegation } = await import(pathToFileURL(join(bundleRoot, "scripts/t3-orchestration.mjs")).href);
    const contracts = JSON.parse(await readFile(join(bundleRoot, "config/t3-role-contracts.json"), "utf8"));
    const resolution = configureT3Resolution({ catalog, contracts });
    for (const routeName of ["interrogate.reviewers", "architect.runners", "arena.runners", "arena.cross-judge-pool"]) {
      assert.deepEqual(resolution.routes[routeName].entries, [{ inheritParent: true }, { inheritParent: true }]);
      const requests = await Promise.all([1, 2].map(entry => prepareT3Delegation({ bundleRoot, catalog, routeName, entry,
        cwd: directory, userRoot: directory, ownedPaths: [join(directory, "owned")],
        task: "Execute the frozen bounded assignment.", runId: host, stepId: routeName })));
      assert.deepEqual(requests.map(request => request.audit.identity.entry), [1, 2]);
      assert.notEqual(requests[0].arguments.clientRequestId, requests[1].arguments.clientRequestId);
      assert.deepEqual(requests.map(request => request.tool), ["delegate_task", "delegate_task"]);
      assert.equal(requests.every(request => !Object.hasOwn(request.arguments, "target")), true);
    }
    const request = await prepareT3Delegation({ bundleRoot, catalog, roleName: "poteto-agent", cwd: directory,
      userRoot: directory, ownedPaths: [join(directory, "owned")], task: "Implement the bounded assignment.", runId: host, stepId: "poteto" });
    assert.equal(request.arguments.task.includes(join(bundleRoot, "skills/poteto-mode/SKILL.md")), true);
    assert.equal(request.arguments.task.includes(join(bundleRoot, "skills/poteto-mode/WORKFLOW.md")), true);
    assert.match(request.arguments.task, /parent owns playbook coordination and independent review/);
    await access(join(bundleRoot, "skills/poteto-mode/scripts/check-plan.mjs"));
  }
});

test("both host contracts derive canonical roles and target-effective routes, with declared exact source assets", async () => {
  for (const host of ["codex", "claude-code"]) {
    const target = join(selectedStage, "packages", host);
    const contracts = JSON.parse(await readFile(join(target, "config/t3-role-contracts.json"), "utf8"));
    assert.deepEqual({ schemaVersion: contracts.schemaVersion, orchestration: contracts.orchestration, host: contracts.host },
      { schemaVersion: 1, orchestration: "t3", host });
    const original = await readFile(join(source, "src/core/roles/poteto-agent/instructions.md"), "utf8");
    assert.deepEqual(contracts.roles["poteto-agent"], {
      description: "Full upstream Poteto Mode worker for bounded authorized tasks.",
      instructions: original.trim(), writes: true, constraints: ["independent_session", "reasoning_required"],
    });
    assert.deepEqual(contracts.routes["architect.runners"], { kind: "panel", role: "design-runner", defaultCount: 2 });
    assert.deepEqual(contracts.routes["code.delegates"], { kind: "single", role: "poteto-agent", defaultCount: 1 });
    assert.equal(Object.hasOwn(contracts.routes, "code.feature-refactoring"), true);
    const catalog = JSON.parse(await readFile(join(target, "SKILL_CATALOG.json"), "utf8"));
    assert.deepEqual(catalog.resources.filter((entry) => entry.orchestration === "t3").map((entry) => entry.output),
      ["scripts/t3-orchestration.mjs", "config/t3-resolution.schema.json", "docs/t3-orchestration.md", "docs/zh-CN/t3-orchestration.md", "config/t3-role-contracts.json"]);
    for (const [output, [, bytes]] of Object.entries(artifacts)) assert.equal(await readFile(join(target, output), "utf8"), bytes);
  }
});

test("one saved T3 selection prepares the same panel member on both installation hosts", async () => {
  const codexRoot = join(selectedStage, "packages/codex");
  const claudeRoot = join(selectedStage, "packages/claude-code");
  const codexContracts = JSON.parse(await readFile(join(codexRoot, "config/t3-role-contracts.json"), "utf8"));
  const claudeContracts = JSON.parse(await readFile(join(claudeRoot, "config/t3-role-contracts.json"), "utf8"));
  assert.deepEqual(claudeContracts.routes, codexContracts.routes);
  const catalog = JSON.parse(await readFile(join(repoRoot, "tests/fixtures/t3-catalog.json"), "utf8"));
  const target = { providerInstanceId: "provider/person:one", model: "custom/opaque:model@1", options: { "switch-id": false } };
  const resolution = configureT3Resolution({ catalog, contracts: codexContracts, preset: "shared-t3", overrides: {
    routes: { "interrogate.reviewers": [target, target] }
  } });
  for (const bundleRoot of [codexRoot, claudeRoot]) {
    const prepared = await prepareT3Delegation({ bundleRoot, catalog, resolution, routeName: "interrogate.reviewers", entry: 2,
      cwd: directory, ownedPaths: [], task: "Review the frozen contract.", runId: "shared-config", stepId: "review" });
    assert.deepEqual(prepared.arguments.target, target);
    assert.equal(prepared.audit.identity.roleName, "reviewer");
  }
});

test("selected generation is deterministic, detached, and checks the actual emitted trees", async () => {
  const outputRoot = join(directory, "generated");
  await generate({ root: source, orchestration: "t3", outputRoot });
  await generate({ root: source, orchestration: "t3", outputRoot, check: true });
  for (const adapter of selectedModel.adapters) {
    assert.deepEqual(await compareTrees(join(outputRoot, adapter.packageDir), join(selectedStage, adapter.packageDir)), [], adapter.id);
  }
  await writeFile(join(outputRoot, "packages/codex/docs/t3-orchestration.md"), "modified\n");
  await assert.rejects(generate({ root: source, orchestration: "t3", outputRoot, check: true }), /generated packages are stale/);
  await assert.rejects(generate({ root: source, orchestration: "t3" }), /detached outputRoot/);
  await assert.rejects(generate({ root: source, orchestration: "t3", outputRoot: join(source, "packages/nested") }), /detached outputRoot/);
  const alias = join(directory, "source-alias");
  await symlink(source, alias);
  await assert.rejects(generate({ root: source, orchestration: "t3", outputRoot: alias }), /detached outputRoot/);
  const nestedAlias = join(directory, "nested-alias");
  await mkdir(nestedAlias);
  await mkdir(join(source, "packages"));
  await symlink(join(source, "packages"), join(nestedAlias, "packages"));
  await assert.rejects(generate({ root: source, orchestration: "t3", outputRoot: nestedAlias }), /detached outputRoot/);
  await assert.rejects(renderTarget(nestedAlias, selectedModel, selectedModel.adapters[0]), /detached outputRoot/);
  await assert.rejects(renderTarget(source, selectedModel, selectedModel.adapters[0]), /detached outputRoot/);
  const adapter = nativeModel.adapters.find((entry) => entry.id === "claude-code");
  const override = await renderTarget(join(directory, "render-override"), nativeModel, adapter, { orchestration: "t3" });
  await validateRenderedTarget(override, adapter, nativeModel, { orchestration: "t3" });
  assert.deepEqual(await compareTrees(override, join(selectedStage, adapter.packageDir)), []);
});

test("T3 probe generation protects source paths and preserves unrelated destination files", async () => {
  for (const out of [source, directory, parse(directory).root, join(source, "src"), join(source, "tools"), join(source, "docs")]) {
    await assert.rejects(generateProbeTargets({ root: source, orchestration: "t3", out }), /detached outputRoot/);
    await access(join(source, "src/core/roles/poteto-agent/instructions.md"));
  }
  const sourceAlias = join(directory, "protected-source-alias");
  await symlink(join(source, "src"), sourceAlias);
  await assert.rejects(generateProbeTargets({ root: source, orchestration: "t3", out: sourceAlias }), /detached outputRoot/);
  const out = join(directory, "probe-output");
  await mkdir(out);
  await writeFile(join(out, "keep.txt"), "unrelated work\n");
  await generateProbeTargets({ root: source, orchestration: "t3", out });
  assert.equal(await readFile(join(out, "keep.txt"), "utf8"), "unrelated work\n");
  await access(join(out, "packages/codex/config/t3-role-contracts.json"));
});

test("unknown orchestration and CLI selectors fail before generation, and selected CLI requires an explicit destination", async () => {
  await assert.rejects(loadModel(source, { orchestration: "unknown" }), /unknown orchestration unknown/);
  await assert.rejects(renderTarget(join(directory, "invalid-render"), nativeModel, nativeModel.adapters[0], { orchestration: "unknown" }), /unknown orchestration unknown/);
  for (const [args, error] of [
    [["--orchestration", "unknown"], /unknown orchestration unknown/],
    [["--orchestration", "t3"], /detached --output-root/],
    [["--orchestration"], /value is required/],
  ]) await assert.rejects(run(process.execPath, [join(source, "tools/generate.mjs"), ...args]), error);
  const outputRoot = join(directory, "cli");
  await run(process.execPath, [join(source, "tools/generate.mjs"), "--orchestration", "t3", "--output-root", outputRoot]);
  assert.deepEqual(await compareTrees(join(outputRoot, "packages/codex"), join(selectedStage, "packages/codex")), []);
});

test("extensions compose with T3 while unaffected host outputs retain extension-only bytes", async () => {
  const extensions = ["extras", "aihero", "enhanced-delivery"];
  const selected = await loadModel(source, { orchestration: "t3", extensions });
  const native = await loadModel(source, { extensions });
  for (const adapter of selected.adapters) {
    const target = await renderTarget(join(directory, "selected-extensions"), selected, adapter);
    await validateRenderedTarget(target, adapter, selected);
    await access(join(target, "skills/setup-benny/SKILL.md"));
    await access(join(target, "skills/codebase-design/SKILL.md"));
    await access(join(target, "scripts/delivery-evidence.mjs"));
    if (["omp", "pi"].includes(adapter.id)) {
      const baseline = await renderTarget(join(directory, "native-extensions"), native, adapter);
      assert.deepEqual(await compareTrees(target, baseline), [], adapter.id);
    }
  }
});

test("selected validation rejects missing or modified resources, contracts, bindings, and declarations", async () => {
  const adapter = selectedModel.adapters.find((entry) => entry.id === "codex");
  const original = join(selectedStage, adapter.packageDir);
  const target = join(directory, "tampered");
  const failures = [
    ["scripts/t3-orchestration.mjs", "modified\n", /T3 artifact source drift/],
    ["config/t3-resolution.schema.json", null, /T3 artifact is missing/],
    ["docs/t3-orchestration.md", "modified\n", /T3 artifact source drift/],
    ["config/t3-role-contracts.json", "{}\n", /T3 role contracts drift/],
    ["docs/model-selection.md", "native\n", /T3 model-selection.md drift/],
    ["skills/poteto-mode/WORKFLOW.md", "---\nname: poteto-mode\ndescription: fixture\n---\n\n# Changed\n", /T3 Skill binding drift/],
    ["skills/poteto-mode/SKILL.md", "---\nname: poteto-mode\ndescription: fixture\n---\n\n# Changed\n", /T3 entry binding drift/],
  ];
  for (const [path, bytes, error] of failures) {
    await rm(target, { recursive: true, force: true });
    await cp(original, target, { recursive: true });
    if (bytes === null) await rm(join(target, path));
    else await writeFile(join(target, path), bytes);
    await assert.rejects(validateRenderedTarget(target, adapter, selectedModel), error);
  }
  await rm(target, { recursive: true, force: true });
  await cp(original, target, { recursive: true });
  const catalog = JSON.parse(await readFile(join(target, "SKILL_CATALOG.json"), "utf8"));
  catalog.resources = catalog.resources.filter((entry) => entry.output !== "scripts/t3-orchestration.mjs");
  await writeFile(join(target, "SKILL_CATALOG.json"), JSON.stringify(catalog));
  await assert.rejects(validateRenderedTarget(target, adapter, selectedModel), /T3 artifact declaration drift/);
  const schemaPath = join(source, "src/schemas/t3-resolution.schema.json");
  const schema = await readFile(schemaPath);
  await rm(schemaPath);
  await assert.rejects(loadModel(source, { orchestration: "t3" }), /source artifact is missing/);
  const external = join(directory, "external-schema.json");
  await writeFile(external, schema);
  await symlink(external, schemaPath);
  await assert.rejects(loadModel(source, { orchestration: "t3" }), /regular file inside the source root/);
  await rm(schemaPath);
  await writeFile(schemaPath, schema);
});
