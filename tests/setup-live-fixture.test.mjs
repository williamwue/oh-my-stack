import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, mkdir, writeFile } from "node:fs/promises";
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
    "--apply",
  ], root);

  const verified = JSON.parse(run("node", ["verify.mjs"], root));
  assert.equal(verified.runtime, "codex");
  assert.equal(verified.selectedModel, "observed/live");
  assert.equal(verified.roleCount, 7);
});
