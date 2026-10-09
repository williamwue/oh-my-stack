import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { configureRouting, resolveRouting } from "../tools/routing.mjs";
import { routingHook } from "../tools/codex-routing-hook.mjs";
import { loadModel, renderTarget, repoRoot } from "../tools/generate.mjs";

async function fixture(run) {
  const root = realpathSync(await mkdtemp(join(tmpdir(), "oms-routing-")));
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
    assert.ok(context.includes(JSON.stringify(join(pluginRoot, "skills", "oms-auto", "SKILL.md"))));
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

test("Claude routing is opt-in and its project switch is independent of Codex", () => fixture(async (options) => {
  const claude = { ...options, runtime: "claude-code", configHome: join(options.root, "claude-home") };
  await configureRouting({ ...options, scope: "project", mode: "auto", apply: true });
  assert.equal((await resolveRouting(claude)).enabled, false);
  const preview = await configureRouting({ ...claude, scope: "user", mode: "auto" });
  await assert.rejects(readFile(preview.path), { code: "ENOENT" });
  await configureRouting({ ...claude, scope: "user", mode: "auto", apply: true });
  const project = await configureRouting({ ...claude, scope: "project", mode: "manual", apply: true });
  assert.equal(project.config.target, "claude-code");
  assert.equal(project.path, join(realpathSync(options.cwd), ".oh-my-stack", "routing.claude-code.json"));
  assert.equal(project.effective.enabled, false);
  assert.equal((await resolveRouting(options)).enabled, true);
  await rm(project.path);
  assert.equal((await resolveRouting(claude)).scope, "user");
  await configureRouting({ ...options, scope: "project", mode: "manual", apply: true });
  assert.equal((await resolveRouting(claude)).enabled, true);
  await assert.rejects(resolveRouting({ ...options, runtime: "unknown" }), /runtime/);
}));

test("Claude nearest override and invalid configuration preserve the user setting", () => fixture(async (options) => {
  const claude = { ...options, runtime: "claude-code" };
  const user = await configureRouting({ ...claude, scope: "user", mode: "auto", apply: true });
  const before = await readFile(user.path, "utf8");
  const nested = join(options.cwd, "nested");
  await mkdir(nested);
  const project = await configureRouting({ ...claude, scope: "project", mode: "auto", apply: true });
  const nestedPath = join(nested, ".oh-my-stack", "routing.claude-code.json");
  await mkdir(join(nested, ".oh-my-stack"));
  await writeFile(nestedPath, JSON.stringify({ ...project.config, mode: "manual" }));
  assert.equal((await resolveRouting({ ...claude, cwd: nested })).path, realpathSync(nestedPath));
  assert.equal((await resolveRouting({ ...claude, cwd: nested })).enabled, false);
  for (const text of ["{bad", JSON.stringify({ ...project.config, target: "codex" }),
    JSON.stringify({ ...project.config, owner: "other" })]) {
    await writeFile(nestedPath, text);
    await assert.rejects(resolveRouting({ ...claude, cwd: nested }));
    await assert.rejects(configureRouting({ ...claude, cwd: nested, scope: "user", mode: "manual", apply: true }));
    assert.equal(await readFile(user.path, "utf8"), before);
  }
  await rm(nestedPath);
  await symlink(user.path, nestedPath);
  await assert.rejects(resolveRouting({ ...claude, cwd: nested }), /symlinks/);
}));

test("Claude CLI uses CLAUDE_CONFIG_DIR and leaves Codex and model settings untouched", () => fixture(async (options) => {
  const command = join(repoRoot, "tools", "routing.mjs");
  const configHome = join(options.root, "claude home");
  await mkdir(configHome);
  const settings = join(configHome, "settings.json");
  const modelSetup = join(configHome, "oh-my-stack.resolution.json");
  await writeFile(settings, '{"model":"opus"}\n');
  await writeFile(modelSetup, '{"preset":"pstack","budget":"medium"}\n');
  const env = { ...process.env, CODEX_HOME: options.configHome, CLAUDE_CONFIG_DIR: configHome };
  const call = (args, environment = env) => JSON.parse(execFileSync(process.execPath,
    [command, ...args], { cwd: options.cwd, env: environment, encoding: "utf8", stdio: "pipe" }));
  assert.equal(call(["status", "--runtime", "claude-code"]).enabled, false);
  const saved = call(["set", "--runtime", "claude-code", "--scope", "user", "--mode", "auto", "--apply"]);
  assert.equal(saved.path, join(configHome, "oh-my-stack", "routing.json"));
  assert.equal(call(["status", "--runtime", "claude-code"]).enabled, true);
  assert.equal(call(["status"]).enabled, false);
  assert.throws(() => call(["status", "--runtime", "claude-code"], { ...env, CLAUDE_CONFIG_DIR: "relative" }));
  assert.throws(() => call(["status", "--runtime", "omp"]));
  assert.equal(await readFile(settings, "utf8"), '{"model":"opus"}\n');
  assert.equal(await readFile(modelSetup, "utf8"), '{"preset":"pstack","budget":"medium"}\n');
}));

test("generated Claude plugin hook and setup use the Claude switch and fail closed", () => fixture(async (options) => {
  const model = await loadModel();
  const pluginRoot = await renderTarget(options.root, model, model.adapters.find((entry) => entry.id === "claude-code"));
  const definition = JSON.parse(await readFile(join(pluginRoot, "hooks/hooks.json")));
  const hook = definition.hooks.SessionStart[0];
  assert.equal(hook.matcher, "startup|resume|clear|compact");
  assert.equal(hook.hooks[0].command, 'node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-routing-hook.mjs"');
  const entry = await readFile(join(pluginRoot, "skills/oms-auto/SKILL.md"), "utf8");
  const setup = await readFile(join(pluginRoot, "skills/setup-oh-my-stack/SKILL.md"), "utf8");
  assert.match(entry, /status --runtime claude-code/);
  assert.doesNotMatch(entry, /disable-model-invocation: true|not configured on this target/);
  assert.match(setup, /set --runtime claude-code/);
  assert.match(setup, /Enable automatic routing/);
  assert.match(setup, /routing-only request ends here without model inventory/);
  const script = join(pluginRoot, "scripts/claude-routing-hook.mjs");
  const env = { ...process.env, CLAUDE_CONFIG_DIR: options.configHome };
  const run = (input) => JSON.parse(execFileSync(process.execPath, [script],
    { env, input: typeof input === "string" ? input : JSON.stringify(input), encoding: "utf8", stdio: "pipe" }));
  const input = { hook_event_name: "SessionStart", source: "startup", cwd: options.cwd };
  assert.deepEqual(run(input), {});
  const claude = { ...options, runtime: "claude-code" };
  await configureRouting({ ...claude, scope: "user", mode: "auto", apply: true });
  for (const source of ["startup", "resume", "clear", "compact"]) {
    const context = run({ ...input, source }).hookSpecificOutput.additionalContext;
    assert.ok(context.includes(JSON.stringify(join(pluginRoot, "skills/oms-auto/SKILL.md"))));
    assert.match(context, /Skill tool.*oh-my-stack:oms-auto/);
    assert.match(context, /Only enabled=true/);
    assert.match(context, /explicit Skill.*bounded child assignment.*skip OMS/);
    assert.match(context, /chat, translation, and tool-use questions/);
    assert.ok(context.length < 1500);
  }
  for (const bad of ["{bad", "x".repeat(65537), {}, { ...input, source: "unknown" },
    { ...input, hook_event_name: "PreToolUse" }]) assert.deepEqual(run(bad), {});
  const project = await configureRouting({ ...claude, scope: "project", mode: "manual", apply: true });
  assert.deepEqual(run(input), {});
  await writeFile(project.path, "{bad");
  assert.deepEqual(run(input), {});
}));
