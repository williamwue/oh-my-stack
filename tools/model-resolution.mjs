#!/usr/bin/env node

import { existsSync, realpathSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manifestName = "oh-my-stack.resolution.json";

function runtimeDirectory(runtime, scope) {
  if (!['codex', 'omp', 'claude-code', 'pi'].includes(runtime)) throw new Error(`unsupported runtime ${runtime}`);
  if (runtime === 'pi') return scope === 'user' ? join('.pi', 'agent') : '.pi';
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

const effortOrder = ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"];
const jobEffortSteps = { hardest: 1, judgment: -1, routine: -2, verification: 0 };

export function resolveTaskSelection({ selection, jobContext, inventory, runtime, rejectedAdjustment }) {
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) throw new Error("a saved selection is required");
  if (jobContext !== undefined) {
    if (!jobContext || typeof jobContext !== "object" || Array.isArray(jobContext)
      || Object.keys(jobContext).some((key) => !["kind", "urgent"].includes(key))
      || !Object.hasOwn(jobEffortSteps, jobContext.kind)
      || jobContext.urgent !== undefined && typeof jobContext.urgent !== "boolean") {
      throw new Error("jobContext requires kind hardest, judgment, routine, or verification and optional boolean urgent");
    }
  }
  const configured = { model: selection.model ?? null, reasoning: selection.reasoning ?? null,
    inheritParent: selection.inheritParent === true, speed: selection.speed ?? null };
  const selected = { ...selection };
  const audit = { configured, configuredSelection: { ...selection }, selected: null, jobContext: jobContext ?? null,
    reason: "saved-role-line", inventorySource: null, rejectedAdjustment: null,
    speed: { requested: selection.inheritParent || jobContext?.kind === "verification" ? configured.speed
      : jobContext ? jobContext.urgent ? "fast" : "standard" : configured.speed,
    applied: false, reason: "native-helper-has-no-speed-selector" } };
  if (selection.inheritParent) audit.reason = "inherited-alias-unchanged";
  else if (jobContext && jobContext.kind !== "verification") {
    let supported = [selection.reasoning];
    if (inventory) {
      if (inventory.schemaVersion !== 1 || inventory.runtime !== runtime || !Array.isArray(inventory.models)
        || typeof inventory.source !== "string" || !inventory.source
        || Number.isNaN(Date.parse(inventory.observedAt))) throw new Error("a matching observed native inventory is required");
      const models = inventory.models.filter((model) => model?.id === selection.model);
      if (models.length !== 1 || !Array.isArray(models[0].reasoningEfforts)
        || !models[0].reasoningEfforts.includes(selection.reasoning)) {
        throw new Error("the saved model and reasoning must be present in the observed inventory");
      }
      supported = [...new Set(models[0].reasoningEfforts)].filter((value) => effortOrder.includes(value))
        .sort((left, right) => effortOrder.indexOf(left) - effortOrder.indexOf(right));
      audit.inventorySource = inventory.source;
    }
    const start = supported.indexOf(selection.reasoning);
    if (start === -1) throw new Error("the saved reasoning effort has no supported adjustment order");
    const ceiling = jobContext.kind === "hardest"
      ? Math.max(start, supported.findLastIndex((effort) => effortOrder.indexOf(effort) <= effortOrder.indexOf("max")))
      : supported.length - 1;
    selected.reasoning = supported[Math.max(0, Math.min(ceiling, start + jobEffortSteps[jobContext.kind]))];
    audit.reason = inventory ? "observed-job-effort-adjustment" : "saved-entry-only-no-observed-alternatives";
  } else if (jobContext) audit.reason = "verification-keeps-role-line";
  if (rejectedAdjustment !== undefined) {
    if (!rejectedAdjustment || typeof rejectedAdjustment !== "object"
      || Object.keys(rejectedAdjustment).some((key) => !["model", "reasoning", "reason"].includes(key))
      || typeof rejectedAdjustment.reason !== "string" || !rejectedAdjustment.reason.trim()
      || rejectedAdjustment.model !== selected.model || rejectedAdjustment.reasoning !== selected.reasoning
      || selected.reasoning === selection.reasoning || selection.inheritParent) {
      throw new Error("rejectedAdjustment must identify this adjusted model and reasoning with the host rejection reason");
    }
    audit.rejectedAdjustment = { ...rejectedAdjustment };
    selected.reasoning = selection.reasoning;
    audit.reason = "adjustment-rejected-retry-original-role-line";
  }
  audit.selected = { model: selected.model ?? null, reasoning: selected.reasoning ?? null,
    inheritParent: selected.inheritParent === true, speed: selected.speed ?? null };
  return { selection: selected, audit };
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
