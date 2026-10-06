#!/usr/bin/env node

import { existsSync, realpathSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manifestName = "oh-my-stack.resolution.json";

function runtimeDirectory(runtime, scope) {
  if (!['codex', 'omp', 'claude-code'].includes(runtime)) throw new Error(`unsupported runtime ${runtime}`);
  return runtime === 'codex' ? '.codex' : runtime === 'claude-code' ? '.claude' : scope === 'user' ? join('.omp', 'agent') : '.omp';
}

async function exists(path) {
  try { await access(path); return true; }
  catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
}

async function checkedManifest(path, runtime) {
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.owner !== 'oh-my-stack' || manifest.target !== runtime) {
    throw new Error(`${path}: invalid ${runtime} Oh My Stack resolution`);
  }
  return manifest;
}

export async function resolveActiveResolution({ runtime, cwd = process.cwd(), userRoot = homedir(),
  claudeConfigDir = process.env.CLAUDE_CONFIG_DIR ?? null }) {
  const userDirectory = resolve(userRoot);
  let directory = resolve(cwd);
  while (directory !== userDirectory) {
    const path = join(directory, runtimeDirectory(runtime, 'project'), manifestName);
    if (await exists(path)) return { scope: 'project', path, manifest: await checkedManifest(path, runtime) };
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  if (runtime === 'claude-code' && claudeConfigDir && !isAbsolute(claudeConfigDir)) {
    throw new Error('CLAUDE_CONFIG_DIR must be an absolute path');
  }
  const path = join(runtime === 'claude-code' && claudeConfigDir
    ? resolve(claudeConfigDir) : join(userDirectory, runtimeDirectory(runtime, 'user')), manifestName);
  if (await exists(path)) return { scope: 'user', path, manifest: await checkedManifest(path, runtime) };
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!['--runtime', '--cwd', '--user-root', '--claude-config-dir'].includes(key) || !value || value.startsWith('--')) {
      throw new Error(`invalid option ${key ?? '<missing>'}`);
    }
    options[key.slice(2)] = value;
  }
  if (!options.runtime) throw new Error('--runtime is required');
  const selected = await resolveActiveResolution({
    runtime: options.runtime, cwd: options.cwd ?? process.cwd(), userRoot: options['user-root'] ?? homedir(),
    claudeConfigDir: options['claude-config-dir'] ?? process.env.CLAUDE_CONFIG_DIR ?? null,
  });
  console.log(JSON.stringify(selected ? { scope: selected.scope, path: selected.path } : { scope: null, path: null }));
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
