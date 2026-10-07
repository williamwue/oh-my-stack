#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configName = "routing.json";
const modes = new Set(["auto", "manual"]);

async function exists(path) {
  try { await lstat(path); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

async function assertNoSymlinks(path) {
  for (const current of [resolve(path), dirname(resolve(path))]) {
    if (await exists(current) && (await lstat(current)).isSymbolicLink()) {
      throw new Error(`routing configuration must not use symlinks: ${current}`);
    }
  }
}

function configurationHome(input) {
  const path = input ?? process.env.CODEX_HOME ?? join(homedir(), ".codex");
  if (!isAbsolute(path)) throw new Error("CODEX_HOME must be an absolute path");
  return resolve(path);
}

export function routingProjectRoot(cwd) {
  const directory = realpathSync(resolve(cwd));
  try {
    return realpathSync(execFileSync("git", ["-C", directory, "rev-parse", "--show-toplevel"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000,
    }).trim());
  } catch { return directory; }
}

async function checkedConfiguration(path) {
  await assertNoSymlinks(path);
  const text = await readFile(path, "utf8");
  if (Buffer.byteLength(text) > 4096) throw new Error("routing configuration exceeds 4096 bytes");
  const value = JSON.parse(text);
  if (!value || Array.isArray(value) || value.schemaVersion !== 1
    || value.owner !== "oh-my-stack" || value.target !== "codex" || !modes.has(value.mode)
    || Object.keys(value).some((key) => !["schemaVersion", "owner", "target", "mode"].includes(key))) {
    throw new Error(`invalid OMS routing configuration: ${path}`);
  }
  return value;
}

export async function resolveRouting({ cwd = process.cwd(), configHome } = {}) {
  const projectRoot = routingProjectRoot(cwd);
  let directory = realpathSync(resolve(cwd));
  while (true) {
    const path = join(directory, ".oh-my-stack", configName);
    await assertNoSymlinks(path);
    if (await exists(path)) {
      const config = await checkedConfiguration(path);
      return { mode: config.mode, enabled: config.mode === "auto", scope: "project", path };
    }
    if (directory === projectRoot) break;
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  const path = join(configurationHome(configHome), "oh-my-stack", configName);
  await assertNoSymlinks(path);
  if (await exists(path)) {
    const config = await checkedConfiguration(path);
    return { mode: config.mode, enabled: config.mode === "auto", scope: "user", path };
  }
  return { mode: "manual", enabled: false, scope: "default", path: null };
}

export async function configureRouting({ mode, scope, cwd = process.cwd(), configHome, apply = false } = {}) {
  if (!modes.has(mode)) throw new Error("--mode must be auto or manual");
  if (!["user", "project"].includes(scope)) throw new Error("--scope must be user or project");
  const path = scope === "project"
    ? join(routingProjectRoot(cwd), ".oh-my-stack", configName)
    : join(configurationHome(configHome), "oh-my-stack", configName);
  await assertNoSymlinks(path);
  const prior = await exists(path) ? await checkedConfiguration(path) : null;
  // Validate the current lookup before mutating any scope. A broken nearer
  // override must not turn a failed command into a partial settings write.
  await resolveRouting({ cwd, configHome });
  const config = { schemaVersion: 1, owner: "oh-my-stack", target: "codex", mode };
  const changed = !prior || prior.mode !== mode;
  if (apply && changed) {
    await mkdir(dirname(path), { recursive: true });
    await assertNoSymlinks(path);
    const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx", mode: 0o600 });
      await rename(temporary, path);
    } finally { await rm(temporary, { force: true }); }
  }
  return { scope, path, config, changed, applied: apply, effective: await resolveRouting({ cwd, configHome }) };
}

export async function main(argv = process.argv.slice(2)) {
  const command = argv[0];
  if (!["status", "set"].includes(command)) throw new Error("Usage: routing.mjs status | set --scope user|project --mode auto|manual [--apply] [--cwd PATH]");
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply" && command === "set" && !options.apply) options.apply = true;
    else if (["--scope", "--mode", "--cwd"].includes(arg) && !(arg.slice(2) in options)) {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error(`missing value for ${arg}`);
      options[arg.slice(2)] = value;
    } else throw new Error(`invalid option ${arg}`);
  }
  if (command === "status" && (options.scope || options.mode)) throw new Error("status accepts only --cwd");
  const result = command === "status" ? await resolveRouting(options) : await configureRouting(options);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
