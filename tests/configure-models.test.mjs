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
