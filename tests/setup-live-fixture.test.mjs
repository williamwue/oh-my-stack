import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const childEnvironment = { ...process.env };
delete childEnvironment.NODE_TEST_CONTEXT;

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: childEnvironment });
  assert.equal(result.status, 0, `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

test("setup-live verifier accepts a fully bound dedicated configuration", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-setup-live-"));
  const fixture = join(repoRoot, "evals", "fixtures", "setup-live");
  await cp(join(fixture, "workspace"), join(root, "workspace"), { recursive: true });
  await cp(join(fixture, "verify.mjs"), join(root, "verify.mjs"));
  await cp(join(repoRoot, "packages", "codex"), join(root, "package"), { recursive: true });
  run("git", ["init", "-q", "-b", "main"], root);
  run("git", ["config", "user.name", "Oh My Stack Fixture"], root);
  run("git", ["config", "user.email", "fixture@oh-my-stack.invalid"], root);
  run("git", ["add", "."], root);
  run("git", ["commit", "-qm", "test: add setup fixture"], root);

  const inventory = {
    schemaVersion: 1,
    runtime: "codex",
    observedAt: "2026-09-21T00:00:00.000Z",
    source: "fixture model/list",
    models: [{ id: "observed/live", reasoningEfforts: ["low", "medium", "high"] }],
  };
  await writeFile(join(root, "workspace", "inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);
  await mkdir(join(root, "workspace", "configured"), { recursive: true });
  run("node", [
    "package/scripts/configure-models.mjs",
    "--package", "package",
    "--inventory", "workspace/inventory.json",
    "--output", "workspace/configured",
    "--fast", "observed/live@low",
    "--balanced", "observed/live@medium",
    "--deep", "observed/live@high",
    "--budget", "medium",
    "--apply",
  ], root);

  const verified = JSON.parse(run("node", ["verify.mjs"], root));
  assert.equal(verified.runtime, "codex");
  assert.equal(verified.selectedModel, "observed/live");
  const descriptor = JSON.parse(await readFile(join(root, "package/config/runtime-resolution.json"), "utf8"));
  const manifest = JSON.parse(await readFile(join(root, "workspace/configured/oh-my-stack.resolution.json"), "utf8"));
  assert.equal(verified.roleCount, descriptor.roles.length);
  assert.equal(verified.routeCount, Object.keys(descriptor.routes).length);
  assert.equal(verified.ownedFileCount, Object.keys(manifest.ownedFiles).length);
  const routeName = Object.keys(manifest.routes).find((name) => manifest.routes[name].kind === "panel");
  const baseline = JSON.stringify(manifest);
  manifest.routes[routeName].entries.pop();
  await writeFile(join(root, "workspace/configured/oh-my-stack.resolution.json"), JSON.stringify(manifest));
  const invalid = spawnSync(process.execPath, ["verify.mjs"], { cwd: root, encoding: "utf8", env: childEnvironment });
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /fresh membership drift/);
  await writeFile(join(root, "workspace/configured/oh-my-stack.resolution.json"), baseline);
  const ownedPath = Object.keys(manifest.ownedFiles)[0];
  await writeFile(join(root, "workspace/configured", ownedPath), "changed configuration\n");
  const changed = spawnSync(process.execPath, ["verify.mjs"], { cwd: root, encoding: "utf8", env: childEnvironment });
  assert.notEqual(changed.status, 0);
  assert.match(changed.stderr, /configured hash drift|text.includes/);
});
