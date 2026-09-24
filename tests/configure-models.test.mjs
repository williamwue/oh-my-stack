import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import test from "node:test";

import { configure } from "../tools/configure-models.mjs";
import { repoRoot } from "../tools/generate.mjs";

const selections = {
  fast: "observed-fast@low",
  balanced: "observed-balanced@medium",
  deep: "observed-deep@high",
};
const execFileAsync = promisify(execFile);

async function inventoryFile(root, runtime) {
  const path = join(root, `${runtime}-inventory.json`);
  await writeFile(path, `${JSON.stringify({
    schemaVersion: 1,
    runtime,
    observedAt: "2026-09-21T00:00:00.000Z",
    source: "fixture runtime inventory command",
    models: [
      { id: "observed-fast", reasoningEfforts: ["low"] },
      { id: "observed-balanced", reasoningEfforts: ["medium"] },
      { id: "observed-deep", reasoningEfforts: ["high"] },
    ],
  }, null, 2)}\n`);
  return path;
}

async function presetInventoryFile(root, runtime) {
  const descriptor = JSON.parse(await readFile(join(repoRoot, "packages", runtime, "config", "runtime-resolution.json"), "utf8"));
  const preset = descriptor.presets.pstack;
  const values = [...Object.values(preset.workloads), ...Object.values(preset.routes).flat()];
  const ids = [...new Set(values.map((value) => value.slice(0, value.lastIndexOf("@"))))];
  const path = join(root, `${runtime}-preset-inventory.json`);
  await writeFile(path, `${JSON.stringify({
    schemaVersion: 1,
    runtime,
    observedAt: "2026-09-23T00:00:00.000Z",
    source: "fixture native model inventory",
    models: ids.map((id) => ({ id, reasoningEfforts: ["low", "medium", "high", "xhigh", "max"] })),
  }, null, 2)}\n`);
  return path;
}

test("setup resolves only observed models into every target-native role format", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-configure-"));
  for (const runtime of ["omp", "codex", "claude-code"]) {
    const inventoryPath = await inventoryFile(root, runtime);
    const outputRoot = join(root, `${runtime}-output`);
    const packageRoot = join(repoRoot, "packages", runtime);

    const dryRun = await configure({
      packageRoot,
      inventoryPath,
      outputRoot,
      selections,
      apply: false,
    });
    assert.equal(dryRun.applied, false);
    await assert.rejects(readFile(join(outputRoot, "oh-my-stack.resolution.json")));

    const applied = await configure({
      packageRoot,
      inventoryPath,
      outputRoot,
      selections,
      apply: true,
    });
    assert.equal(applied.applied, true);
    const manifest = JSON.parse(await readFile(join(outputRoot, "oh-my-stack.resolution.json"), "utf8"));
    assert.equal(manifest.target, runtime);
    assert.equal(manifest.roles.reviewer.model, "observed-deep");
    assert.equal(manifest.roles.explorer.model, "observed-balanced");
    assert.equal(manifest.roles.reviewer.diversityEstablished, false);
    assert.deepEqual(manifest.configuredModelIds, ["observed-balanced", "observed-deep", "observed-fast"]);

    const extension = runtime === "codex" ? "toml" : "md";
    const reviewer = await readFile(join(outputRoot, "agents", `reviewer.${extension}`), "utf8");
    assert.match(reviewer, /observed-deep/);
    if (runtime === "codex") assert.match(reviewer, /model_reasoning_effort = "high"/);
    if (runtime === "omp") assert.match(reviewer, /thinkingLevel: "high"/);
    if (runtime === "claude-code") assert.doesNotMatch(reviewer, /reasoning|thinkingLevel/);
  }
});

test("setup rejects unobserved choices and modified owned files without touching unrelated files", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-configure-safety-"));
  const inventoryPath = await inventoryFile(root, "codex");
  const outputRoot = join(root, "output");
  const packageRoot = join(repoRoot, "packages", "codex");

  await assert.rejects(
    configure({
      packageRoot,
      inventoryPath,
      outputRoot,
      selections: { ...selections, deep: "invented-model@high" },
      apply: true,
    }),
    /was not present in the observed inventory/,
  );

  await configure({ packageRoot, inventoryPath, outputRoot, selections, apply: true });
  const unrelated = join(outputRoot, "keep-me.txt");
  await writeFile(unrelated, "user-owned\n");
  await configure({ packageRoot, inventoryPath, outputRoot, selections, apply: true });
  assert.equal(await readFile(unrelated, "utf8"), "user-owned\n");

  const reviewer = join(outputRoot, "agents", "reviewer.toml");
  await writeFile(reviewer, "user modification\n");
  const evidenceReader = join(outputRoot, "agents", "evidence-reader.toml");
  const evidenceReaderBefore = await readFile(evidenceReader, "utf8");
  await assert.rejects(
    configure({
      packageRoot,
      inventoryPath,
      outputRoot,
      selections,
      roleSelections: { "evidence-reader": "observed-balanced@medium" },
      apply: true,
    }),
    /refusing to overwrite an unowned or modified file/,
  );
  assert.equal(await readFile(unrelated, "utf8"), "user-owned\n");
  assert.equal(await readFile(evidenceReader, "utf8"), evidenceReaderBefore);
});

test("project activation previews and writes only native Codex and OMP role directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-project-roles-"));
  for (const runtime of ["codex", "omp"]) {
    const inventoryPath = await inventoryFile(root, runtime);
    const projectRoot = join(root, `${runtime}-project`);
    const nativeDirectory = join(projectRoot, runtime === "codex" ? ".codex" : ".omp");
    const packageRoot = join(repoRoot, "packages", runtime);
    await mkdir(join(nativeDirectory, "agents"), { recursive: true });
    const unrelated = join(nativeDirectory, "config.toml");
    await writeFile(unrelated, "user-owned configuration\n");

    const dryRun = await configure({ packageRoot, inventoryPath, projectRoot, selections, apply: false });
    assert.equal(dryRun.applied, false);
    await assert.rejects(readFile(join(nativeDirectory, "oh-my-stack.resolution.json")));

    await configure({ packageRoot, inventoryPath, projectRoot, selections, apply: true });
    assert.equal(await readFile(unrelated, "utf8"), "user-owned configuration\n");
    const extension = runtime === "codex" ? "toml" : "md";
    assert.match(await readFile(join(nativeDirectory, "agents", `reviewer.${extension}`), "utf8"), /observed-deep/);
    assert.equal(JSON.parse(await readFile(join(nativeDirectory, "oh-my-stack.resolution.json"), "utf8")).target, runtime);
  }
});

test("project activation CLI and safety gate reject symlinks and unowned roles", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-project-roles-cli-"));
  const inventoryPath = await inventoryFile(root, "codex");
  const projectRoot = join(root, "project");
  const agentsDirectory = join(projectRoot, ".codex", "agents");
  await mkdir(agentsDirectory, { recursive: true });
  const packageRoot = join(repoRoot, "packages", "codex");
  const args = [
    join(repoRoot, "tools", "configure-models.mjs"),
    "--package", packageRoot,
    "--inventory", inventoryPath,
    "--project-root", projectRoot,
    "--fast", selections.fast,
    "--balanced", selections.balanced,
    "--deep", selections.deep,
  ];
  const preview = JSON.parse((await execFileAsync(process.execPath, args)).stdout);
  assert.equal(preview.applied, false);
  assert.ok(preview.writes.every((path) => path.startsWith(agentsDirectory)));

  const unrelated = join(root, "outside.toml");
  await writeFile(unrelated, "outside\n");
  await symlink(unrelated, join(agentsDirectory, "reviewer.toml"));
  await assert.rejects(configure({ packageRoot, inventoryPath, projectRoot, selections, apply: true }), /symbolic links are not allowed/);
  assert.equal(await readFile(unrelated, "utf8"), "outside\n");

  const otherProject = join(root, "other-project");
  await mkdir(join(otherProject, ".codex", "agents"), { recursive: true });
  const otherReviewer = join(otherProject, ".codex", "agents", "reviewer.toml");
  await writeFile(otherReviewer, "user role\n");
  await assert.rejects(configure({ packageRoot, inventoryPath, projectRoot: otherProject, selections, apply: true }), /refusing to overwrite an unowned or modified file/);
  assert.equal(await readFile(otherReviewer, "utf8"), "user role\n");
});

test("pstack preset creates named workflow routes and ordered native panels on both runtimes", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-preset-"));
  for (const runtime of ["codex", "omp"]) {
    const inventoryPath = await presetInventoryFile(root, runtime);
    const outputRoot = join(root, `${runtime}-preset-output`);
    const packageRoot = join(repoRoot, "packages", runtime);
    const preview = await configure({ packageRoot, inventoryPath, outputRoot, presetName: "pstack", apply: false });
    assert.equal(preview.manifest.preset, "pstack");
    assert.equal(preview.manifest.routes["interrogate.reviewers"].entries.length, 3);
    assert.equal(preview.manifest.routes["how.explorer"].entries.length, 1);
    assert.equal(new Set(preview.manifest.routes["interrogate.reviewers"].entries.map((entry) => entry.model)).size, 3);
    await assert.rejects(readFile(join(outputRoot, "oh-my-stack.resolution.json")));

    await configure({ packageRoot, inventoryPath, outputRoot, presetName: "pstack", apply: true });
    const extension = runtime === "codex" ? "toml" : "md";
    const firstReviewer = await readFile(join(outputRoot, "agents", `ohmystack-interrogate-reviewers-1.${extension}`), "utf8");
    assert.match(firstReviewer, new RegExp(preview.manifest.routes["interrogate.reviewers"].entries[0].model));
    assert.match(firstReviewer, /ohmystack-interrogate-reviewers-1/);
    const manifest = JSON.parse(await readFile(join(outputRoot, "oh-my-stack.resolution.json"), "utf8"));
    assert.equal(manifest.routes["interrogate.reviewers"].entries[2].agent, "ohmystack-interrogate-reviewers-3");
    assert.ok(Object.hasOwn(manifest.ownedFiles, `agents/ohmystack-interrogate-reviewers-3.${extension}`));
  }
});

test("OMP OpenAI-Codex alternative previews current tiers without selecting legacy GPT-5.5", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-omp-openai-preset-"));
  const inventoryPath = join(root, "inventory.json");
  const outputRoot = join(root, "output");
  const packageRoot = join(repoRoot, "packages", "omp");
  const observed = {
    schemaVersion: 1,
    runtime: "omp",
    observedAt: "2026-09-24T00:16:46.021Z",
    source: "fixture omp models --json --no-extensions",
    models: ["gpt-5.5", "gpt-6-luna", "gpt-6-sol", "gpt-6-astra"].map((name) => ({
      id: `openai-codex/${name}`,
      reasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
    })),
  };
  await writeFile(inventoryPath, `${JSON.stringify(observed)}\n`);

  await assert.rejects(
    configure({ packageRoot, inventoryPath, outputRoot, presetName: "pstack", budget: "medium", apply: false }),
    /cursor\/grok-4\.7-xhigh-fast was not present in the observed inventory/,
  );
  const preview = await configure({
    packageRoot, inventoryPath, outputRoot, presetName: "pstack-openai-codex", budget: "medium", apply: false,
  });
  assert.equal(preview.applied, false);
  assert.deepEqual(preview.manifest.workloads, {
    fast: { model: "openai-codex/gpt-6-luna", reasoning: "high" },
    balanced: { model: "openai-codex/gpt-6-sol", reasoning: "high" },
    deep: { model: "openai-codex/gpt-6-astra", reasoning: "high" },
  });
  assert.equal(preview.manifest.routes["code.bug-fix"].entries[0].model, "openai-codex/gpt-6-sol");
  assert.deepEqual(preview.manifest.routes["arena.runners"].entries.map((entry) => entry.model), [
    "openai-codex/gpt-6-astra", "openai-codex/gpt-6-sol", "openai-codex/gpt-6-luna",
  ]);
  assert.ok(!preview.manifest.configuredModelIds.includes("openai-codex/gpt-5.5"));
  await assert.rejects(readFile(join(outputRoot, "oh-my-stack.resolution.json")));

  observed.models = observed.models.filter((model) => model.id !== "openai-codex/gpt-6-astra");
  await writeFile(inventoryPath, `${JSON.stringify(observed)}\n`);
  await assert.rejects(
    configure({ packageRoot, inventoryPath, outputRoot, presetName: "pstack-openai-codex", budget: "medium", apply: true }),
    /gpt-6-astra was not present in the observed inventory/,
  );
  await assert.rejects(readFile(join(outputRoot, "oh-my-stack.resolution.json")));
});

test("OMP and Codex raise matching OpenAI route efforts to the budget target", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-cross-runtime-effort-"));
  const previews = {};
  for (const runtime of ["omp", "codex"]) {
    const inventoryPath = join(root, `${runtime}-inventory.json`);
    await writeFile(inventoryPath, `${JSON.stringify({ schemaVersion: 1, runtime,
      observedAt: "2026-09-24T00:00:00Z", source: "fixture native inventory",
      models: ["gpt-6-luna", "gpt-6-sol", "gpt-6-astra"].map((name) => ({
        id: runtime === "omp" ? `openai-codex/${name}` : name,
        reasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
      })),
    })}\n`);
    previews[runtime] = (await configure({
      packageRoot: join(repoRoot, "packages", runtime), inventoryPath,
      outputRoot: join(root, runtime), presetName: runtime === "omp" ? "pstack-openai-codex" : "pstack",
      budget: "medium", apply: false,
    })).manifest;
    assert.equal(previews[runtime].budgetPolicy.kind, "reasoning-target");
  }
  for (const workload of ["fast", "balanced", "deep"]) {
    assert.equal(previews.omp.workloads[workload].reasoning, previews.codex.workloads[workload].reasoning);
  }
  for (const name of ["arena.runners", "arena.cross-judge-pool", "architect.runners", "interrogate.reviewers"]) {
    assert.deepEqual(previews.omp.routes[name].entries.map((entry) => entry.reasoning),
      previews.codex.routes[name].entries.map((entry) => entry.reasoning));
  }
  assert.deepEqual(previews.omp.routes["arena.runners"].entries.map((entry) => entry.reasoning),
    ["high", "high", "high"]);
});

test("uniform high override is explicit, checked against inventory and budget, and reversible", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-uniform-effort-"));
  const inventoryPath = join(root, "omp-inventory.json");
  await writeFile(inventoryPath, `${JSON.stringify({ schemaVersion: 1, runtime: "omp",
    observedAt: "2026-09-24T00:00:00Z", source: "fixture native inventory",
    models: ["gpt-6-luna", "gpt-6-sol", "gpt-6-astra"].map((name) => ({
      id: `openai-codex/${name}`, reasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
    })),
  })}\n`);
  const options = { packageRoot: join(repoRoot, "packages", "omp"), inventoryPath,
    outputRoot: join(root, "output"), presetName: "pstack-openai-codex", budget: "large" };
  const uniform = await configure({ ...options, uniformReasoning: "high", apply: true });
  assert.equal(uniform.manifest.uniformReasoning, "high");
  assert.ok(Object.values(uniform.manifest.workloads).every((choice) => choice.reasoning === "high"));
  assert.ok(Object.values(uniform.manifest.routes).flatMap((route) => route.entries)
    .every((choice) => choice.reasoning === "high"));
  assert.equal((await configure({ ...options, apply: false })).manifest.uniformReasoning, "high");
  const reset = await configure({ ...options, uniformReasoning: "preset", apply: false });
  assert.equal(reset.manifest.uniformReasoning, null);
  assert.equal(reset.manifest.workloads.fast.reasoning, "xhigh");
  await assert.rejects(configure({ ...options, budget: "small", uniformReasoning: "high", apply: false }),
    /exceeds small budget target/);
  const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  inventory.models.find((model) => model.id === "openai-codex/gpt-6-luna").reasoningEfforts = ["low", "medium"];
  await writeFile(inventoryPath, `${JSON.stringify(inventory)}\n`);
  await assert.rejects(configure({ ...options, uniformReasoning: "high", apply: false }),
    /did not advertise uniform reasoning effort high/);
});

test("budget, inheritance, route overrides, and panel shrink stay owned and deterministic", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-preset-overrides-"));
  const inventoryPath = await presetInventoryFile(root, "codex");
  const outputRoot = join(root, "output");
  const packageRoot = join(repoRoot, "packages", "codex");
  const options = {
    packageRoot, inventoryPath, outputRoot, presetName: "pstack", budget: "small",
    roleSelections: { reviewer: "inherit-parent" },
    routeSelections: { "how.explainer": "auto" },
    panelSelections: { "interrogate.reviewers": "gpt-6-sol@max,inherit-parent" },
    apply: true,
  };
  const first = await configure(options);
  assert.equal(first.manifest.roles.reviewer.inheritParent, true);
  assert.equal(first.manifest.routes["how.explainer"].entries[0].inheritParent, true);
  assert.equal(first.manifest.routes["interrogate.reviewers"].entries.length, 2);
  assert.equal(first.manifest.routes["interrogate.reviewers"].entries[0].reasoning, "medium");
  assert.equal(first.manifest.routes["interrogate.reviewers"].entries[1].inheritParent, true);
  assert.doesNotMatch(await readFile(join(outputRoot, "agents", "reviewer.toml"), "utf8"), /^model =/m);
  assert.doesNotMatch(await readFile(join(outputRoot, "agents", "ohmystack-how-explainer.toml"), "utf8"), /^model =/m);
  assert.doesNotMatch(await readFile(join(outputRoot, "agents", "ohmystack-interrogate-reviewers-2.toml"), "utf8"), /^model =/m);

  const smaller = { ...options, panelSelections: { "interrogate.reviewers": "gpt-6-sol@medium" } };
  await configure(smaller);
  await assert.rejects(readFile(join(outputRoot, "agents", "ohmystack-interrogate-reviewers-2.toml")));
  assert.equal((await configure({ ...smaller, apply: false })).manifest.routes["interrogate.reviewers"].entries.length, 1);
});

test("unobserved preset and modified obsolete panel agent fail without partial writes", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-preset-safety-"));
  const inventoryPath = await inventoryFile(root, "codex");
  const outputRoot = join(root, "output");
  const packageRoot = join(repoRoot, "packages", "codex");
  await assert.rejects(
    configure({ packageRoot, inventoryPath, outputRoot, presetName: "pstack", apply: true }),
    /was not present in the observed inventory/,
  );
  await assert.rejects(readFile(join(outputRoot, "oh-my-stack.resolution.json")));

  const observed = await presetInventoryFile(root, "codex");
  await configure({ packageRoot, inventoryPath: observed, outputRoot, presetName: "pstack", apply: true });
  const stale = join(outputRoot, "agents", "ohmystack-interrogate-reviewers-3.toml");
  await writeFile(stale, "user modification\n");
  await assert.rejects(
    configure({ packageRoot, inventoryPath: observed, outputRoot, presetName: "pstack", panelSelections: { "interrogate.reviewers": "gpt-6-sol@medium" }, apply: true }),
    /refusing to remove a modified owned file/,
  );
  assert.equal(await readFile(stale, "utf8"), "user modification\n");
});

test("OMP mirrors source slots, targets budget effort, and retains explicit choices on re-run", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-omp-source-policy-"));
  const inventoryPath = await presetInventoryFile(root, "omp");
  const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  inventory.models.find((model) => model.id === "cursor/grok-4.7-xhigh-fast").reasoningEfforts = ["low", "medium", "high"];
  await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
  const options = {
    packageRoot: join(repoRoot, "packages", "omp"), inventoryPath,
    outputRoot: join(root, "output"), presetName: "pstack", budget: "large", apply: true,
    routeSelections: { "code.perf-issue": "cursor/gpt-5.6-sol@low", "reflect.divergent": "inherit-parent" },
    panelSelections: { "interrogate.reviewers": "cursor/gpt-5.6-sol@low,auto" },
  };
  const first = await configure(options);
  assert.equal(first.manifest.routes["code.perf-issue"].entries[0].reasoning, "xhigh");
  assert.equal(first.manifest.routes["code.bug-fix"].entries[0].reasoning, "high");
  assert.equal(first.manifest.routes["reflect.synthesizer"].entries[0].reasoning, "xhigh");
  assert.equal(first.manifest.routes["reflect.divergent"].entries[0].inheritParent, true);
  assert.equal(first.manifest.routes["interrogate.reviewers"].entries.length, 2);
  assert.equal(first.manifest.routes["interrogate.reviewers"].entries[0].reasoning, "xhigh");
  const rerun = await configure({
    packageRoot: options.packageRoot, inventoryPath, outputRoot: options.outputRoot,
    presetName: "pstack", apply: true,
  });
  assert.equal(rerun.manifest.budget, "large");
  assert.equal(rerun.manifest.routes["code.perf-issue"].entries[0].model, "cursor/gpt-5.6-sol");
  assert.equal(rerun.manifest.routes["interrogate.reviewers"].entries.length, 2);
  assert.equal(rerun.manifest.routes["reflect.divergent"].entries[0].inheritParent, true);
  const changedBudget = await configure({
    packageRoot: options.packageRoot, inventoryPath, outputRoot: options.outputRoot,
    presetName: "pstack", budget: "small", apply: false,
  });
  assert.equal(changedBudget.manifest.routes["code.perf-issue"].entries[0].reasoning, "medium");
  assert.equal(changedBudget.manifest.routes["interrogate.reviewers"].entries[0].reasoning, "medium");
  assert.equal(changedBudget.manifest.routes["interrogate.reviewers"].entries.length, 2);
  const roleText = await readFile(join(options.outputRoot, "agents", "ohmystack-code-perf-issue.md"), "utf8");
  assert.match(roleText, /thinkingLevel: "xhigh"/);
  const manifestPath = join(options.outputRoot, "oh-my-stack.resolution.json");
  const legacy = JSON.parse(await readFile(manifestPath, "utf8"));
  delete legacy.overrides;
  await writeFile(manifestPath, `${JSON.stringify(legacy, null, 2)}\n`);
  const migrated = await configure({
    packageRoot: options.packageRoot, inventoryPath, outputRoot: options.outputRoot,
    presetName: "pstack", apply: true,
  });
  assert.equal(migrated.manifest.routes["code.perf-issue"].entries[0].model, "cursor/gpt-5.6-sol");
  assert.equal(migrated.manifest.routes["interrogate.reviewers"].entries.length, 2);
  assert.equal(migrated.manifest.routes["reflect.divergent"].entries[0].inheritParent, true);
});

test("OMP generated workflows bind source-style slots without changing Codex routing", async () => {
  const omp = join(repoRoot, "packages", "omp");
  const codex = join(repoRoot, "packages", "codex");
  const ompDescriptor = JSON.parse(await readFile(join(omp, "config", "runtime-resolution.json"), "utf8"));
  const codexDescriptor = JSON.parse(await readFile(join(codex, "config", "runtime-resolution.json"), "utf8"));
  for (const name of ["code.feature-refactoring", "code.bug-fix", "code.perf-issue", "code.hillclimb", "reflect.divergent", "reflect.synthesizer"]) {
    assert.ok(ompDescriptor.routes[name], name);
    assert.equal(codexDescriptor.routes[name], undefined, `${name}: OMP adaptation must not leak into Codex`);
  }
  const cases = [
    ["feature", "code.feature-refactoring"], ["refactoring", "code.feature-refactoring"],
    ["bug-fix", "code.bug-fix"], ["perf-issue", "code.perf-issue"],
    ["hillclimb", "code.hillclimb"], ["reflect", "reflect.divergent"],
  ];
  for (const [skill, route] of cases) {
    const text = await readFile(join(omp, "skills", skill, "SKILL.md"), "utf8");
    assert.ok(text.includes(`\`${route}\``), `${skill}: missing OMP source-style route`);
    assert.match(text, /\.omp\/oh-my-stack\.resolution\.json/);
  }
  const setup = await readFile(join(omp, "skills", "setup-oh-my-stack", "SKILL.md"), "utf8");
  assert.match(setup, /target xhigh/);
  assert.doesNotMatch(setup, /cap at xhigh/);
  assert.match(setup, /--uniform-reasoning EFFORT/);
  assert.match(setup, /preserves those overrides/);
});
