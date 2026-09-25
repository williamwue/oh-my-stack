#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { access, lstat, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultPackageRoot = resolve(scriptDirectory, "..");
const workloads = ["fast", "balanced", "deep"];
const effortOrder = ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"];
const budgetCaps = { unlimited: null, large: "xhigh", medium: "high", small: "medium" };

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
  assert(["omp", "codex", "claude-code"].includes(inventory.runtime), "inventory runtime is invalid");
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
  const model = models.get(selection.model);
  assert(model, `${label}: model ${selection.model} was not present in the observed inventory`);
  assert(
    model.reasoningEfforts.includes(selection.reasoning),
    `${label}: ${selection.model} did not advertise reasoning effort ${selection.reasoning}`,
  );
}

function applyBudget(selection, models, budget, label, uniformReasoning) {
  if (selection.inheritParent) return selection;
  const model = models.get(selection.model);
  assert(model, `${label}: model ${selection.model} was not present in the observed inventory`);
  if (uniformReasoning) {
    assert(!budgetCaps[budget] || effortOrder.indexOf(uniformReasoning) <= effortOrder.indexOf(budgetCaps[budget]),
      `${label}: uniform reasoning ${uniformReasoning} exceeds ${budget} budget target`);
    assert(model.reasoningEfforts.includes(uniformReasoning),
      `${label}: ${selection.model} did not advertise uniform reasoning effort ${uniformReasoning}`);
    return { ...selection, reasoning: uniformReasoning };
  }
  if (!budgetCaps[budget]) return selection;
  const cap = effortOrder.indexOf(budgetCaps[budget]);
  const requested = effortOrder.indexOf(selection.reasoning);
  assert(requested >= 0, `${label}: unknown reasoning effort ${selection.reasoning}`);
  const target = cap;
  const supported = model.reasoningEfforts
    .filter((effort) => effortOrder.indexOf(effort) <= target)
    .sort((left, right) => effortOrder.indexOf(right) - effortOrder.indexOf(left));
  assert(supported.length > 0, `${label}: no supported effort at or below ${budget} budget for ${selection.model}`);
  return { ...selection, reasoning: supported[0] };
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
  packageRoot, inventoryPath, outputRoot, projectRoot, userRoot, selections = {}, roleSelections = {},
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
  const preset = presetName ? descriptor.presets?.[presetName] : null;
  assert(!presetName || preset, `preset ${presetName} is unavailable for ${descriptor.target}; choose explicit models from the observed inventory`);
  assert(!projectDirectory || ["codex", "omp", "claude-code"].includes(descriptor.target), "project role activation is unsupported for this target");
  assert(!userDirectory || ["codex", "omp", "claude-code"].includes(descriptor.target), "user role activation is unsupported for this target");
  const outputDirectory = projectDirectory
    ? join(projectDirectory, descriptor.target === "codex" ? ".codex" : descriptor.target === "omp" ? ".omp" : ".claude")
    : userDirectory
      ? join(userDirectory, descriptor.target === "codex" ? ".codex" : descriptor.target === "omp" ? join(".omp", "agent") : ".claude")
      : resolve(outputRoot);
  assert(outputDirectory !== resolve("/"), "output directory cannot be the filesystem root");
  if (userDirectory && descriptor.target === "omp") await assertNotSymlink(join(userDirectory, ".omp"));
  await assertNotSymlink(outputDirectory);
  await assertNotSymlink(join(outputDirectory, "agents"));
  const inventoryRaw = await readFile(resolve(inventoryPath));
  const inventory = JSON.parse(inventoryRaw);
  validateInventory(inventory);
  assert(inventory.runtime === descriptor.target, `inventory runtime ${inventory.runtime} does not match ${descriptor.target}`);

  const manifestPath = join(outputDirectory, "oh-my-stack.resolution.json");
  await assertNotSymlink(manifestPath);
  const prior = (await exists(manifestPath)) ? JSON.parse(await readFile(manifestPath, "utf8")) : null;
  assert(!prior || prior.owner === "oh-my-stack", `${manifestPath}: refusing to replace an unowned manifest`);
  const retainChoices = ["omp", "codex"].includes(descriptor.target) && presetName && prior?.target === descriptor.target && prior?.preset === presetName;
  const effectiveBudget = budget ?? (retainChoices ? prior.budget : null) ?? "unlimited";
  const effectiveUniformReasoning = uniformReasoning === "preset" ? null
    : uniformReasoning ?? (retainChoices ? prior.uniformReasoning : null) ?? null;
  const retained = retainChoices ? (prior.overrides ?? legacyOverrides(prior)) : {};
  const overrides = {
    workloads: { ...retained.workloads, ...selections },
    roles: { ...retained.roles, ...roleSelections },
    routes: { ...retained.routes, ...routeSelections },
    panels: { ...retained.panels, ...panelSelections },
  };
  const modelMap = new Map(inventory.models.map((model) => [model.id, model]));
  const resolvedWorkloads = Object.fromEntries(
    workloads.map((workload) => {
      const raw = overrides.workloads[workload] ?? preset?.workloads?.[workload];
      assert(raw, `${workload}: no observed-model choice was supplied`);
      const selection = applyBudget(parseSelection(raw, workload), modelMap, effectiveBudget, workload, effectiveUniformReasoning);
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
    const selection = overrides.roles[role.name]
      ? applyBudget(parseSelection(overrides.roles[role.name], role.name), modelMap, effectiveBudget, role.name, effectiveUniformReasoning)
      : resolvedWorkloads[role.workload];
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
  const routeMode = Boolean(presetName || Object.keys(overrides.routes).length || Object.keys(overrides.panels).length);
  const routes = {};
  if (routeMode) {
    for (const [name, route] of Object.entries(descriptor.routes ?? {})) {
      const explicit = route.kind === "panel" ? overrides.panels[name] : overrides.routes[name];
      const raw = explicit ?? preset?.routes?.[name];
      const values = raw === undefined
        ? Array.from({ length: route.kind === "panel" ? route.defaultCount : 1 }, () => resolvedWorkloads[route.workload])
        : route.kind === "panel" ? (Array.isArray(raw) ? raw : raw.split(",")) : [raw];
      assert(values.length > 0 && values.length <= 8, `${name}: route must have 1-8 entries`);
      const entries = values.map((value, index) => {
        const label = `${name}[${index + 1}]`;
        const selection = typeof value === "string"
          ? applyBudget(parseSelection(value.trim(), label), modelMap, effectiveBudget, label, effectiveUniformReasoning)
          : value;
        validateSelection(selection, modelMap, label);
        const agent = `ohmystack-${name.replaceAll(".", "-")}${route.kind === "panel" ? `-${index + 1}` : ""}`;
        return { ...selection, agent };
      });
      routes[name] = { kind: route.kind, role: route.role, entries };
    }
  }

  const priorHashes = new Map(Object.entries(prior?.ownedFiles ?? {}));
  const extension = descriptor.adapter.format === "toml" ? "toml" : "md";
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

  const manifest = {
    schemaVersion: 1,
    owner: "oh-my-stack",
    target: descriptor.target,
    preset: presetName ?? null,
    budget: effectiveBudget,
    budgetPolicy: {
      kind: "reasoning-target",
      level: budgetCaps[effectiveBudget],
      costLimit: false,
    },
    uniformReasoning: effectiveUniformReasoning,
    ...(["omp", "codex", "claude-code"].includes(descriptor.target) && presetName ? { overrides } : {}),
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
      assert(/^agents\/[a-z0-9.-]+\.(?:toml|md)$/.test(key), `unsafe prior owned path ${key}`);
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
