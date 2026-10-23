#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { access, lstat, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { runtimeDirectory } from "./model-resolution.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultPackageRoot = resolve(scriptDirectory, "..");
const workloads = ["fast", "balanced", "deep"];
const effortOrder = ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"];
const budgetCaps = { unlimited: "max", large: "xhigh", medium: "high", small: "medium" };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArguments(argv) {
  const result = { selections: {}, roles: {}, routes: {}, panels: {}, apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") {
      result.apply = true;
      continue;
    }
    if (argument === "--user") {
      result.user = true;
      continue;
    }
    const value = argv[index + 1];
    assert(value && !value.startsWith("--"), `${argument}: value is required`);
    index += 1;
    if (["--inventory", "--output", "--package", "--project-root", "--preset", "--budget", "--uniform-reasoning"].includes(argument)) {
      result[argument.slice(2).replace("-root", "Root").replace("-reasoning", "Reasoning")] = value;
    } else if (workloads.map((name) => `--${name}`).includes(argument)) {
      result.selections[argument.slice(2)] = value;
    } else if (["--role", "--route", "--panel"].includes(argument)) {
      const separator = value.indexOf("=");
      assert(separator > 0, `${argument} must be NAME=MODEL@REASONING or NAME=inherit-parent`);
      const destination = argument === "--role" ? result.roles : argument === "--route" ? result.routes : result.panels;
      assert(!Object.hasOwn(destination, value.slice(0, separator)), `${argument}: duplicate ${value.slice(0, separator)}`);
      destination[value.slice(0, separator)] = value.slice(separator + 1);
    } else {
      throw new Error(`unknown argument ${argument}`);
    }
  }
  assert(result.inventory, "--inventory is required");
  assert([result.output, result.projectRoot, result.user].filter(Boolean).length <= 1,
    "choose at most one of --user, --project-root, or --output");
  if (!result.output && !result.projectRoot) result.user = true;
  assert(!result.budget || Object.hasOwn(budgetCaps, result.budget), "--budget must be unlimited, large, medium, or small");
  assert(!result.uniformReasoning || result.uniformReasoning === "preset" || effortOrder.includes(result.uniformReasoning),
    "--uniform-reasoning must be a supported effort name or preset");
  if (!result.preset) for (const workload of workloads) assert(result.selections[workload], `--${workload} is required without --preset`);
  return result;
}

function parseSelection(value, label) {
  if (["inherit-parent", "auto"].includes(value)) return { model: null, reasoning: null, inheritParent: true };
  const separator = value.lastIndexOf("@");
  assert(separator > 0 && separator < value.length - 1, `${label} must be MODEL@REASONING`);
  return { model: value.slice(0, separator), reasoning: value.slice(separator + 1) };
}

function selectionText(selection) {
  return selection.inheritParent ? "inherit-parent" : `${selection.model}@${selection.reasoning}`;
}

function legacyOverrides(prior) {
  return {
    workloads: Object.fromEntries(Object.entries(prior.workloads ?? {}).map(([name, value]) => [name, selectionText(value)])),
    roles: Object.fromEntries(Object.entries(prior.roles ?? {}).map(([name, value]) => [name, selectionText(value)])),
    routes: Object.fromEntries(Object.entries(prior.routes ?? {}).filter(([, value]) => value.kind === "single")
      .map(([name, value]) => [name, selectionText(value.entries[0])])),
    panels: Object.fromEntries(Object.entries(prior.routes ?? {}).filter(([, value]) => value.kind === "panel")
      .map(([name, value]) => [name, value.entries.map(selectionText).join(",")])),
  };
}

function validateInventory(inventory) {
  assert(inventory.schemaVersion === 1, "inventory schemaVersion must be 1");
  assert(["omp", "codex", "claude-code", "pi"].includes(inventory.runtime), "inventory runtime is invalid");
  assert(!Number.isNaN(Date.parse(inventory.observedAt)), "inventory observedAt must be an ISO timestamp");
  assert(typeof inventory.source === "string" && inventory.source.length > 0, "inventory source is required");
  assert(Array.isArray(inventory.models) && inventory.models.length > 0, "inventory models are required");
  const ids = new Set();
  for (const model of inventory.models) {
    assert(typeof model.id === "string" && model.id.length > 0, "inventory model id is required");
    assert(!ids.has(model.id), `inventory repeats model ${model.id}`);
    ids.add(model.id);
    assert(Array.isArray(model.reasoningEfforts), `${model.id}: reasoningEfforts must be an array`);
  }
}

function validateSelection(selection, models, label) {
  if (selection.inheritParent) return;
  assert(effortOrder.includes(selection.reasoning), `${label}: unknown reasoning effort ${selection.reasoning}`);
  const model = models.get(selection.model);
  assert(model, `${label}: model ${selection.model} was not present in the observed inventory`);
  assert(
    model.reasoningEfforts.includes(selection.reasoning),
    `${label}: ${selection.model} did not advertise reasoning effort ${selection.reasoning}`,
  );
}

function claudePreset(inventory, descriptor) {
  const choices = {};
  for (const [workload, family, target] of [["fast", "haiku", "low"],
    ["balanced", "sonnet", "medium"], ["deep", "opus", "high"]]) {
    const models = inventory.models.filter((model) => model.id.startsWith(`claude-${family}-`));
    assert(models.length === 1,
      `Claude pstack requires exactly one observed ${family} model; found ${models.length}. Refresh the three-family inventory or choose explicit workloads`);
    const model = models[0];
    const effort = model.reasoningEfforts.filter((value) => effortOrder.includes(value)
      && effortOrder.indexOf(value) <= effortOrder.indexOf(target))
      .sort((left, right) => effortOrder.indexOf(right) - effortOrder.indexOf(left))[0];
    assert(effort, `${model.id}: no supported effort at or below ${target}`);
    choices[workload] = `${model.id}@${effort}`;
  }
  return {
    workloads: choices,
    routes: Object.fromEntries(Object.entries(descriptor.routes ?? {})
      .filter(([, route]) => route.kind === "panel")
      .map(([name]) => [name, [choices.deep, choices.balanced]])),
  };
}

function applyBudget(selection, models, policy, label, uniformReasoning) {
  if (selection.inheritParent) return selection;
  const model = models.get(selection.model);
  assert(model, `${label}: model ${selection.model} was not present in the observed inventory`);
  if (uniformReasoning) {
    assert(model.reasoningEfforts.includes(uniformReasoning),
      `${label}: ${selection.model} did not advertise uniform reasoning effort ${uniformReasoning}`);
    return { ...selection, reasoning: uniformReasoning };
  }
  if (policy.kind === "preserve-effort") return selection;
  const cap = effortOrder.indexOf(policy.level);
  const requested = effortOrder.indexOf(selection.reasoning);
  assert(requested >= 0, `${label}: unknown reasoning effort ${selection.reasoning}`);
  const target = cap;
  const supported = model.reasoningEfforts
    .filter((effort) => effortOrder.includes(effort) && effortOrder.indexOf(effort) <= target)
    .sort((left, right) => effortOrder.indexOf(right) - effortOrder.indexOf(left));
  assert(supported.length > 0, `${label}: no supported effort at or below ${policy.level} budget for ${selection.model}`);
  return { ...selection, reasoning: supported[0] };
}

function normalizeConfiguration({ prior, retainChoices, descriptor, preset, budget, uniformReasoning,
  selections, roleSelections, routeSelections, panelSelections }) {
  const savedPolicy = prior?.budgetPolicy;
  if (savedPolicy?.version !== undefined) {
    assert(savedPolicy.version === 2, `unknown budget policy version ${savedPolicy.version}`);
    assert(savedPolicy.costLimit === false && (savedPolicy.kind === "preserve-effort" && savedPolicy.level === null
      || savedPolicy.kind === "reasoning-target" && Object.values(budgetCaps).includes(savedPolicy.level)),
    "invalid version 2 budget policy");
  }
  const effectiveBudget = budget ?? (retainChoices ? prior.budget : null) ?? "large";
  assert(Object.hasOwn(budgetCaps, effectiveBudget), `unknown budget ${effectiveBudget}`);
  const policy = budget !== undefined || !retainChoices
    ? { version: 2, kind: "reasoning-target", level: budgetCaps[effectiveBudget], costLimit: false }
    : savedPolicy?.version === 2 ? { ...savedPolicy }
      : { version: 2, kind: effectiveBudget === "unlimited" ? "preserve-effort" : "reasoning-target",
        level: effectiveBudget === "unlimited" ? null : budgetCaps[effectiveBudget], costLimit: false };
  assert(policy.kind !== "preserve-effort" || effectiveBudget === "unlimited", "preserve-effort policy requires unlimited budget");
  assert(policy.kind !== "reasoning-target" || policy.level === budgetCaps[effectiveBudget], "budget policy does not match budget");
  const uniform = uniformReasoning === "preset" ? null
    : uniformReasoning ?? (retainChoices ? prior.uniformReasoning : null) ?? null;
  assert(uniform === null || effortOrder.includes(uniform), `unknown uniform reasoning ${uniform}`);
  assert(!uniform || policy.kind === "preserve-effort" || effortOrder.indexOf(uniform) <= effortOrder.indexOf(policy.level),
    `uniform reasoning ${uniform} exceeds ${effectiveBudget} budget target`);
  const retained = retainChoices ? legacyOverrides(prior) : {};
  for (const name of Object.keys(retained.workloads ?? {})) assert(workloads.includes(name), `retired saved workload ${name}`);
  for (const name of Object.keys(retained.roles ?? {})) assert(descriptor.roles.some((role) => role.name === name), `retired saved role ${name}`);
  for (const kind of ["routes", "panels"]) for (const name of Object.keys(retained[kind] ?? {})) {
    assert(descriptor.routes?.[name]?.kind === (kind === "panels" ? "panel" : "single"), `retired saved ${kind} entry ${name}`);
  }
  const intent = retainChoices ? prior.overrides ?? {} : {};
  const patches = { workloads: selections, roles: roleSelections, routes: routeSelections, panels: panelSelections };
  const overrides = Object.fromEntries(Object.entries(patches).map(([kind, patch]) => [kind, { ...intent[kind], ...patch }]));
  for (const name of Object.keys(overrides.workloads)) assert(workloads.includes(name), `unknown workload ${name}`);
  const bindings = retainChoices ? structuredClone(intent.bindings ?? { roles: {}, routes: {} }) : { roles: {}, routes: {} };
  // Legacy manifests without intent cannot recover which effective choices were derived.
  if (!retainChoices || prior.overrides && !intent.bindings) {
    for (const role of descriptor.roles) if (!Object.hasOwn(overrides.roles, role.name)) bindings.roles[role.name] = role.workload;
    for (const [name, route] of Object.entries(descriptor.routes ?? {})) {
      const kind = route.kind === "panel" ? "panels" : "routes";
      if (!Object.hasOwn(overrides[kind], name) && preset?.routes?.[name] === undefined) bindings.routes[name] = route.workload;
    }
  }
  for (const name of Object.keys(roleSelections)) delete bindings.roles[name];
  for (const name of [...Object.keys(routeSelections), ...Object.keys(panelSelections)]) delete bindings.routes[name];
  return { budget: effectiveBudget, policy, uniform, retained, overrides, bindings, patches,
    globalChange: budget !== undefined || uniformReasoning !== undefined,
    recoverUniformBase: retainChoices && prior.uniformReasoning && prior.overrides && !intent.uniformBase,
    uniformBase: retainChoices ? intent.uniformBase ?? {} : {} };
}

function insertYamlFields(text, fields) {
  const end = text.indexOf("\n---\n", 4);
  assert(text.startsWith("---\n") && end > 0, "generated role lacks YAML frontmatter");
  const additions = Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n");
  return `${text.slice(0, end)}\n${additions}${text.slice(end)}`;
}

function insertTomlFields(text, fields) {
  const lines = text.split("\n");
  const insertAt = lines.findIndex((line) => line.startsWith("developer_instructions"));
  assert(insertAt > 0, "generated role lacks developer_instructions");
  lines.splice(insertAt, 0, ...Object.entries(fields).map(([key, value]) => `${key} = ${JSON.stringify(value)}`));
  return lines.join("\n");
}

function configuredRole(text, adapter, selection, nativeName) {
  if (adapter.format === "json") {
    const role = JSON.parse(text);
    role.name = nativeName ?? role.name;
    if (!selection.inheritParent) {
      role[adapter.modelField] = selection.model;
      role[adapter.reasoningField] = selection.reasoning;
    }
    return `${JSON.stringify(role, null, 2)}\n`;
  }
  if (adapter.format === "toml") {
    const renamed = nativeName ? text.replace(/^name = .+$/m, `name = ${JSON.stringify(nativeName)}`) : text;
    if (selection.inheritParent) return renamed;
    const fields = { [adapter.modelField]: selection.model };
    if (adapter.reasoningField && selection.reasoning !== "none") fields[adapter.reasoningField] = selection.reasoning;
    return insertTomlFields(renamed, fields);
  }
  const renamed = nativeName ? text.replace(/^name: .+$/m, `name: ${nativeName}`) : text;
  if (selection.inheritParent) return renamed;
  const fields = { [adapter.modelField]: selection.model };
  if (adapter.reasoningField && selection.reasoning !== "none") fields[adapter.reasoningField] = selection.reasoning;
  return insertYamlFields(renamed, fields);
}

async function assertSafeTarget(path, outputDirectory, priorHashes) {
  if (await exists(path)) {
    const key = relative(outputDirectory, path).split(sep).join("/");
    const current = await readFile(path);
    assert(priorHashes.get(key) === sha256(current), `${path}: refusing to overwrite an unowned or modified file`);
  }
}

async function assertNotSymlink(path) {
  try {
    assert(!(await lstat(path)).isSymbolicLink(), `${path}: symbolic links are not allowed in role output`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function safeWrite(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

export async function configure({
  packageRoot, inventoryPath, outputRoot, projectRoot, userRoot,
  claudeConfigDir, codexHome, piCodingAgentDir, selections = {}, roleSelections = {},
  routeSelections = {}, panelSelections = {}, presetName, budget, uniformReasoning, apply,
}) {
  const packageDirectory = resolve(packageRoot ?? defaultPackageRoot);
  assert([outputRoot, projectRoot, userRoot].filter(Boolean).length === 1,
    "provide exactly one of outputRoot, projectRoot, or userRoot");
  const projectDirectory = projectRoot ? resolve(projectRoot) : null;
  const userDirectory = userRoot ? resolve(userRoot) : null;
  assert(!projectDirectory || ![resolve("/"), homedir()].includes(projectDirectory), "project root must be a dedicated project directory");
  assert(!userDirectory || userDirectory !== resolve("/"), "user root cannot be the filesystem root");
  for (const [directory, label] of [[projectDirectory, "project"], [userDirectory, "user"]]) {
    if (!directory) continue;
    const stat = await lstat(directory);
    assert(stat.isDirectory() && !stat.isSymbolicLink(), `${label} root must be an existing real directory`);
  }
  const descriptor = JSON.parse(await readFile(join(packageDirectory, "config", "runtime-resolution.json"), "utf8"));
  assert(!budget || Object.hasOwn(budgetCaps, budget), `unknown budget ${budget}`);
  assert(!uniformReasoning || uniformReasoning === "preset" || effortOrder.includes(uniformReasoning),
    `unknown uniform reasoning ${uniformReasoning}`);
  assert(["codex", "omp", "claude-code", "pi"].includes(descriptor.target), "role configuration is unsupported for this target");
  const outputDirectory = projectDirectory
    ? join(projectDirectory, runtimeDirectory(descriptor.target, "project"))
    : userDirectory
      ? runtimeDirectory(descriptor.target, "user", { userRoot, claudeConfigDir, codexHome, piCodingAgentDir })
      : resolve(outputRoot);
  assert(outputDirectory !== resolve("/"), "output directory cannot be the filesystem root");
  if (userDirectory && descriptor.target === "omp") await assertNotSymlink(join(userDirectory, ".omp"));
  if (userDirectory && descriptor.target === "pi") await assertNotSymlink(dirname(outputDirectory));
  await assertNotSymlink(outputDirectory);
  await assertNotSymlink(join(outputDirectory, "agents"));
  const inventoryRaw = await readFile(resolve(inventoryPath));
  const inventory = JSON.parse(inventoryRaw);
  validateInventory(inventory);
  assert(inventory.runtime === descriptor.target, `inventory runtime ${inventory.runtime} does not match ${descriptor.target}`);
  const preset = presetName === "pstack" && descriptor.target === "claude-code"
    ? claudePreset(inventory, descriptor)
    : presetName ? descriptor.presets?.[presetName] : null;
  assert(!presetName || preset, `preset ${presetName} is unavailable for ${descriptor.target}; choose explicit models from the observed inventory`);

  const manifestPath = join(outputDirectory, "oh-my-stack.resolution.json");
  await assertNotSymlink(manifestPath);
  const prior = (await exists(manifestPath)) ? JSON.parse(await readFile(manifestPath, "utf8")) : null;
  assert(!prior || prior.owner === "oh-my-stack", `${manifestPath}: refusing to replace an unowned manifest`);
  const retainChoices = ["omp", "codex", "claude-code", "pi"].includes(descriptor.target)
    && prior?.target === descriptor.target && prior?.preset === (presetName ?? null);
  const state = normalizeConfiguration({ prior, retainChoices, descriptor, preset, budget, uniformReasoning,
    selections, roleSelections, routeSelections, panelSelections });
  const { overrides } = state;
  const modelMap = new Map(inventory.models.map((model) => [model.id, model]));
  const baseChoices = { workloads: {}, roles: {}, routes: {}, panels: {} };
  const recoverUniformSelection = (saved, raw, workload, label) => {
    const retained = parseSelection(saved, label);
    const original = typeof raw === "string" ? parseSelection(raw.trim(), label)
      : workload ? parseSelection(baseChoices.workloads[workload], label) : raw;
    return original && retained.model === original.model && !retained.inheritParent
      && modelMap.get(retained.model)?.reasoningEfforts.includes(original.reasoning)
      ? { ...retained, reasoning: original.reasoning } : retained;
  };
  const resolveChoice = (kind, name, raw, label, workload, index) => {
    const pick = (value) => kind === "panels" && value !== undefined
      ? (Array.isArray(value) ? value : value.split(","))[index] : value;
    const explicit = Object.hasOwn(state.patches[kind], name);
    const dependentChange = workload && Object.hasOwn(selections, workload);
    const saved = pick(state.retained[kind]?.[name]);
    const savedBase = pick(state.uniformBase[kind]?.[name]);
    let choice;
    let base;
    if (saved !== undefined && !explicit && !dependentChange && !state.globalChange) {
      choice = parseSelection(saved, label);
      base = savedBase ? parseSelection(savedBase, label) : choice;
      if (!savedBase && state.recoverUniformBase) base = applyBudget(recoverUniformSelection(saved, raw, workload, label), modelMap, state.policy, label);
    } else {
      let value = explicit || dependentChange ? raw : savedBase ?? saved ?? raw;
      if (state.recoverUniformBase && saved !== undefined && !explicit && !dependentChange && raw !== undefined) {
        value = recoverUniformSelection(saved, raw, workload, label);
      }
      const requested = typeof value === "string" ? parseSelection(value.trim(), label) : value;
      assert(requested, `${label}: no observed-model choice was supplied`);
      if (explicit) validateSelection(requested, modelMap, label);
      // Workload-derived objects have already passed through the same policy.
      const derived = typeof raw !== "string" && value === raw && workload;
      base = derived ? parseSelection(baseChoices.workloads[workload], label) : applyBudget(requested, modelMap, state.policy, label);
      choice = derived ? requested : applyBudget(base, modelMap, state.policy, label, state.uniform);
    }
    validateSelection(choice, modelMap, label);
    validateSelection(base, modelMap, `${label} reset base`);
    if (kind === "panels") {
      (baseChoices[kind][name] ??= [])[index] = selectionText(base);
    } else baseChoices[kind][name] = selectionText(base);
    return choice;
  };
  const resolvedWorkloads = Object.fromEntries(
    workloads.map((workload) => {
      const raw = overrides.workloads[workload] ?? preset?.workloads?.[workload];
      const selection = resolveChoice("workloads", workload, raw, workload);
      return [workload, selection];
    }),
  );
  for (const [workload, selection] of Object.entries(resolvedWorkloads)) {
    validateSelection(selection, modelMap, workload);
  }

  const roles = {};
  for (const name of Object.keys(overrides.roles)) {
    assert(descriptor.roles.some((role) => role.name === name), `unknown role ${name}`);
  }
  for (const role of descriptor.roles) {
    const selection = resolveChoice("roles", role.name,
      overrides.roles[role.name] ?? resolvedWorkloads[role.workload], role.name, state.bindings.roles[role.name]);
    validateSelection(selection, modelMap, role.name);
    roles[role.name] = {
      ...selection,
      agent: userDirectory ? `ohmystack-role-${role.name}` : role.name,
      workload: role.workload,
      constraints: role.constraints,
      diversityEstablished: false,
    };
  }

  for (const name of Object.keys(overrides.routes)) {
    assert(descriptor.routes?.[name]?.kind === "single", `unknown single route ${name}`);
  }
  for (const name of Object.keys(overrides.panels)) {
    assert(descriptor.routes?.[name]?.kind === "panel", `unknown panel route ${name}`);
  }
  const routeMode = true;
  const routes = {};
  if (routeMode) {
    for (const [name, route] of Object.entries(descriptor.routes ?? {})) {
      const kind = route.kind === "panel" ? "panels" : "routes";
      const explicit = overrides[kind][name];
      const raw = state.patches[kind][name] ?? state.retained[kind]?.[name] ?? explicit ?? preset?.routes?.[name];
      const binding = state.bindings.routes[name];
      const derivedChange = binding && Object.hasOwn(selections, binding);
      const values = raw === undefined
        ? Array.from({ length: route.kind === "panel" ? route.defaultCount : 1 }, () => resolvedWorkloads[route.workload])
        : route.kind === "panel" ? (Array.isArray(raw) ? raw : raw.split(",")) : [raw];
      assert(values.length > 0 && values.length <= 8, `${name}: route must have 1-8 entries`);
      const entries = values.map((value, index) => {
        const label = `${name}[${index + 1}]`;
        const original = explicit ?? preset?.routes?.[name];
        const originalValue = original === undefined ? binding ? resolvedWorkloads[binding] : undefined
          : route.kind === "panel" ? (Array.isArray(original) ? original : original.split(","))[index] : original;
        const selection = resolveChoice(route.kind === "panel" ? "panels" : "routes", name,
          derivedChange ? resolvedWorkloads[binding] : state.recoverUniformBase ? originalValue : value, label, binding, index);
        validateSelection(selection, modelMap, label);
        const agent = `ohmystack-${name.replaceAll(".", "-")}${route.kind === "panel" ? `-${index + 1}` : ""}`;
        return { ...selection, agent };
      });
      routes[name] = { kind: route.kind, role: route.role, entries };
    }
  }

  const priorHashes = new Map(Object.entries(prior?.ownedFiles ?? {}));
  const extension = descriptor.adapter.format === "toml" ? "toml" : descriptor.adapter.format === "json" ? "json" : "md";
  const writes = [];
  for (const role of descriptor.roles) {
    const source = join(packageDirectory, "agents", `${role.name}.${extension}`);
    const nativeName = roles[role.name].agent;
    const target = join(outputDirectory, "agents", `${nativeName}.${extension}`);
    await assertNotSymlink(target);
    const content = configuredRole(await readFile(source, "utf8"), descriptor.adapter, roles[role.name], nativeName);
    writes.push({ path: target, content });
  }
  for (const [name, route] of Object.entries(routes)) {
    const source = join(packageDirectory, "agents", `${route.role}.${extension}`);
    const template = await readFile(source, "utf8");
    for (const entry of route.entries) {
      const target = join(outputDirectory, "agents", `${entry.agent}.${extension}`);
      await assertNotSymlink(target);
      writes.push({ path: target, content: configuredRole(template, descriptor.adapter, entry, entry.agent) });
    }
  }

  overrides.bindings = state.bindings;
  if (state.uniform) overrides.uniformBase = Object.fromEntries(Object.entries(baseChoices)
    .map(([kind, values]) => [kind, Object.fromEntries(Object.entries(values).map(([name, value]) => [name, Array.isArray(value) ? value.join(",") : value]))]));
  const manifest = {
    schemaVersion: 1,
    owner: "oh-my-stack",
    target: descriptor.target,
    preset: presetName ?? null,
    budget: state.budget,
    budgetPolicy: state.policy,
    uniformReasoning: state.uniform,
    overrides,
    observedInventory: {
      observedAt: inventory.observedAt,
      source: inventory.source,
      sha256: sha256(inventoryRaw),
    },
    workloads: resolvedWorkloads,
    roles,
    routes,
    configuredModelIds: [...new Set([
      ...Object.values(roles).map((role) => role.model),
      ...Object.values(routes).flatMap((route) => route.entries.map((entry) => entry.model)),
    ].filter(Boolean))].sort(),
    ownedFiles: Object.fromEntries(
      writes.map(({ path, content }) => [
        relative(outputDirectory, path).split(sep).join("/"),
        sha256(content),
      ]),
    ),
  };

  if (apply) {
    for (const write of writes) await assertSafeTarget(write.path, outputDirectory, priorHashes);
    const obsolete = [];
    for (const [key, hash] of priorHashes) {
      if (Object.hasOwn(manifest.ownedFiles, key)) continue;
      assert(/^agents\/[a-z0-9.-]+\.(?:toml|md|json)$/.test(key), `unsafe prior owned path ${key}`);
      const path = join(outputDirectory, key);
      await assertNotSymlink(path);
      if (await exists(path)) {
        assert(sha256(await readFile(path)) === hash, `${path}: refusing to remove a modified owned file`);
        obsolete.push(path);
      }
    }
    for (const write of writes) await safeWrite(write.path, write.content);
    for (const path of obsolete) await unlink(path);
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  return { manifest, writes: writes.map(({ path }) => path), applied: apply,
    configuration: {
      status: apply ? "applied" : "preview",
      scope: projectDirectory ? "project" : userDirectory ? "user" : "detached",
      manifestPath,
      runtimeSettingsChanged: false,
      runtimeVerification: "not performed by configuration",
    } };
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const result = await configure({
    packageRoot: arguments_.package,
    inventoryPath: arguments_.inventory,
    outputRoot: arguments_.output,
    projectRoot: arguments_.projectRoot,
    userRoot: arguments_.user ? homedir() : undefined,
    codexHome: process.env.CODEX_HOME, piCodingAgentDir: process.env.PI_CODING_AGENT_DIR,
    selections: arguments_.selections,
    roleSelections: arguments_.roles,
    routeSelections: arguments_.routes,
    panelSelections: arguments_.panels,
    presetName: arguments_.preset,
    budget: arguments_.budget,
    uniformReasoning: arguments_.uniformReasoning,
    apply: arguments_.apply,
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
