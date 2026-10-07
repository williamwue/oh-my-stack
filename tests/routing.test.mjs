import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { configureRouting, resolveRouting } from "../tools/routing.mjs";
import { routingHook } from "../tools/codex-routing-hook.mjs";
import { loadModel, renderTarget, repoRoot } from "../tools/generate.mjs";

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), "oms-routing-"));
  try {
    const cwd = join(root, "project");
    const configHome = join(root, "codex-home");
    await mkdir(cwd);
    execFileSync("git", ["init", "--quiet", cwd]);
    await run({ root, cwd, configHome });
  } finally { await rm(root, { recursive: true, force: true }); }
}

test("routing defaults to manual and previews never create configuration", () => fixture(async (options) => {
  assert.equal((await resolveRouting(options)).enabled, false);
  const preview = await configureRouting({ ...options, scope: "project", mode: "auto" });
  assert.equal(preview.applied, false);
  await assert.rejects(readFile(preview.path), { code: "ENOENT" });
  assert.equal((await resolveRouting(options)).enabled, false);
}));

test("project manual overrides user auto without modifying the personal default", () => fixture(async (options) => {
  const user = await configureRouting({ ...options, scope: "user", mode: "auto", apply: true });
  const before = await readFile(user.path, "utf8");
  const project = await configureRouting({ ...options, scope: "project", mode: "manual", apply: true });
  assert.equal(project.effective.enabled, false);
  assert.equal(project.effective.scope, "project");
  assert.equal(await readFile(user.path, "utf8"), before);
  await rm(project.path);
  assert.equal((await resolveRouting(options)).enabled, true);
}));

test("lookup stops at the worktree boundary and uses the nearest project override", () => fixture(async (options) => {
  const outer = join(options.root, ".oh-my-stack");
  await mkdir(outer);
  await writeFile(join(outer, "routing.json"), JSON.stringify({ schemaVersion: 1, owner: "oh-my-stack", target: "codex", mode: "auto" }));
  assert.equal((await resolveRouting(options)).enabled, false);
  await configureRouting({ ...options, scope: "project", mode: "auto", apply: true });
  const nested = join(options.cwd, "nested");
  await mkdir(join(nested, ".oh-my-stack"), { recursive: true });
  await writeFile(join(nested, ".oh-my-stack", "routing.json"), JSON.stringify({ schemaVersion: 1, owner: "oh-my-stack", target: "codex", mode: "manual" }));
  assert.equal((await resolveRouting({ ...options, cwd: nested })).enabled, false);
  const rootSet = await configureRouting({ ...options, cwd: nested, scope: "project", mode: "auto", apply: true });
  assert.equal(rootSet.effective.enabled, false, "report the still-active nearer override");
}));

test("applying the same mode is idempotent and leaves other settings untouched", () => fixture(async (options) => {
  await mkdir(options.configHome);
  const unrelated = join(options.configHome, "config.toml");
  await writeFile(unrelated, "model = 'existing'\n");
  const first = await configureRouting({ ...options, scope: "user", mode: "auto", apply: true });
  const before = (await stat(first.path)).mtimeMs;
  const second = await configureRouting({ ...options, scope: "user", mode: "auto", apply: true });
  assert.equal(second.changed, false);
  assert.equal((await stat(first.path)).mtimeMs, before);
  assert.equal(await readFile(unrelated, "utf8"), "model = 'existing'\n");
}));

test("invalid or unowned project configuration never falls back to enabled user routing", () => fixture(async (options) => {
  await configureRouting({ ...options, scope: "user", mode: "auto", apply: true });
  await mkdir(join(options.cwd, ".oh-my-stack"));
  const path = join(options.cwd, ".oh-my-stack", "routing.json");
  for (const text of ["{bad", JSON.stringify({ schemaVersion: 1, owner: "another-tool", target: "codex", mode: "auto" }),
    JSON.stringify({ schemaVersion: 1, owner: "oh-my-stack", target: "codex", mode: "auto", instruction: "injected" })]) {
    await writeFile(path, text);
    await assert.rejects(resolveRouting(options));
    await assert.rejects(configureRouting({ ...options, scope: "project", mode: "auto", apply: true }));
    const userPath = join(options.configHome, "oh-my-stack", "routing.json");
    const userBefore = await readFile(userPath, "utf8");
    await assert.rejects(configureRouting({ ...options, scope: "user", mode: "manual", apply: true }));
    assert.equal(await readFile(userPath, "utf8"), userBefore, "a failed lookup must not partially write user settings");
    assert.equal(await readFile(path, "utf8"), text);
  }
}));

test("symlinked configuration files and directories cannot be read or replaced", () => fixture(async (options) => {
  const outside = join(options.root, "outside.json");
  await writeFile(outside, JSON.stringify({ schemaVersion: 1, owner: "oh-my-stack", target: "codex", mode: "auto" }));
  const directory = join(options.cwd, ".oh-my-stack");
  await mkdir(directory);
  await symlink(outside, join(directory, "routing.json"));
  await assert.rejects(resolveRouting(options), /symlinks/);
  await assert.rejects(configureRouting({ ...options, scope: "project", mode: "manual", apply: true }), /symlinks/);
  await rm(directory, { recursive: true });
  await symlink(options.root, directory);
  await assert.rejects(configureRouting({ ...options, scope: "project", mode: "auto", apply: true }), /symlinks/);
  assert.equal(JSON.parse(await readFile(outside)).mode, "auto");
}));

test("CLI honors CODEX_HOME and rejects malformed actions without writes", () => fixture(async (options) => {
  const command = join(repoRoot, "tools", "routing.mjs");
  const env = { ...process.env, CODEX_HOME: options.configHome };
  execFileSync(process.execPath, [command, "set", "--scope", "user", "--mode", "auto", "--apply"], { cwd: options.cwd, env });
  const result = JSON.parse(execFileSync(process.execPath, [command, "status"], { cwd: options.cwd, env, encoding: "utf8" }));
  assert.equal(result.scope, "user");
  for (const args of [["set", "--scope", "user", "--mode", "unknown", "--apply"], ["status", "--apply"], ["set", "--scope", "project", "--mode", "manual", "--cwd"]]) {
    assert.throws(() => execFileSync(process.execPath, [command, ...args], { cwd: options.cwd, env, stdio: "pipe" }));
  }
  assert.equal((await resolveRouting(options)).enabled, true);
  await assert.rejects(resolveRouting({ ...options, configHome: "relative" }), /absolute/);
}));

test("generated hook injects a bounded hint only for enabled startup/resume/clear/compact", () => fixture(async (options) => {
  const model = await loadModel();
  const pluginRoot = await renderTarget(options.root, model, model.adapters.find((entry) => entry.id === "codex"));
  const hookOptions = { ...options, pluginRoot };
  const input = { hook_event_name: "SessionStart", source: "startup", cwd: options.cwd };
  assert.deepEqual(await routingHook(input, hookOptions), {});
  await configureRouting({ ...options, scope: "user", mode: "auto", apply: true });
  for (const source of ["startup", "resume", "clear", "compact"]) {
    const output = await routingHook({ ...input, source }, hookOptions);
    const context = output.hookSpecificOutput.additionalContext;
    assert.ok(context.includes(join(pluginRoot, "skills", "oms-auto", "SKILL.md")));
    assert.ok(context.length < 1500);
  }
  assert.deepEqual(await routingHook({ ...input, hook_event_name: "PreToolUse" }, hookOptions), {});
  await configureRouting({ ...options, scope: "project", mode: "manual", apply: true });
  assert.deepEqual(await routingHook(input, hookOptions), {});
  const entry = await readFile(join(pluginRoot, "skills/oms-auto/agents/openai.yaml"), "utf8");
  const explicit = await readFile(join(pluginRoot, "skills/poteto-mode/agents/openai.yaml"), "utf8");
  assert.match(entry, /allow_implicit_invocation: true/);
  assert.match(explicit, /allow_implicit_invocation: false/);
  const definition = JSON.parse(await readFile(join(pluginRoot, "hooks/hooks.json")));
  const manifest = JSON.parse(await readFile(join(pluginRoot, ".codex-plugin/plugin.json")));
  assert.equal(manifest.hooks, "./hooks/hooks.json");
  await assert.rejects(readFile(join(pluginRoot, "plugin.json")), { code: "ENOENT" });
  assert.equal(definition.hooks.SessionStart.length, 1);
  const script = join(pluginRoot, "scripts/codex-routing-hook.mjs");
  const bad = execFileSync(process.execPath, [script], { input: "{bad", encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
  assert.deepEqual(JSON.parse(bad), {}, "bad input leaves the host session running");
}));
