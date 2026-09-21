#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultPackageRoot = resolve(scriptDirectory, "..");
const workloads = ["fast", "balanced", "deep"];

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
  const result = { selections: {}, roles: {}, apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") {
      result.apply = true;
      continue;
    }
    const value = argv[index + 1];
    assert(value && !value.startsWith("--"), `${argument}: value is required`);
    index += 1;
    if (["--inventory", "--output", "--package"].includes(argument)) {
      result[argument.slice(2)] = value;
    } else if (workloads.map((name) => `--${name}`).includes(argument)) {
      result.selections[argument.slice(2)] = value;
    } else if (argument === "--role") {
      const separator = value.indexOf("=");
      assert(separator > 0, "--role must be ROLE=MODEL@REASONING");
      result.roles[value.slice(0, separator)] = value.slice(separator + 1);
    } else {
      throw new Error(`unknown argument ${argument}`);
    }
  }
  assert(result.inventory, "--inventory is required");
  assert(result.output, "--output is required");
  for (const workload of workloads) {
    assert(result.selections[workload], `--${workload} is required`);
  }
  return result;
}

function parseSelection(value, label) {
  const separator = value.lastIndexOf("@");
  assert(separator > 0 && separator < value.length - 1, `${label} must be MODEL@REASONING`);
  return { model: value.slice(0, separator), reasoning: value.slice(separator + 1) };
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
  const model = models.get(selection.model);
  assert(model, `${label}: model ${selection.model} was not present in the observed inventory`);
  assert(
    model.reasoningEfforts.includes(selection.reasoning),
    `${label}: ${selection.model} did not advertise reasoning effort ${selection.reasoning}`,
  );
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

function configuredRole(text, adapter, selection) {
  if (adapter.format === "toml") {
    const fields = { [adapter.modelField]: selection.model };
    if (adapter.reasoningField) fields[adapter.reasoningField] = selection.reasoning;
    return insertTomlFields(text, fields);
  }
  const fields = { [adapter.modelField]: selection.model };
  if (adapter.reasoningField) fields[adapter.reasoningField] = selection.reasoning;
  return insertYamlFields(text, fields);
}

async function assertSafeTarget(path, outputDirectory, priorHashes) {
  if (await exists(path)) {
    const key = relative(outputDirectory, path).split(sep).join("/");
    const current = await readFile(path);
    assert(priorHashes.get(key) === sha256(current), `${path}: refusing to overwrite an unowned or modified file`);
  }
}

async function safeWrite(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

export async function configure({ packageRoot, inventoryPath, outputRoot, selections, roleSelections = {}, apply }) {
  const packageDirectory = resolve(packageRoot ?? defaultPackageRoot);
  const outputDirectory = resolve(outputRoot);
  assert(outputDirectory !== resolve("/"), "output directory cannot be the filesystem root");
  const descriptor = JSON.parse(await readFile(join(packageDirectory, "config", "runtime-resolution.json"), "utf8"));
  const inventoryRaw = await readFile(resolve(inventoryPath));
  const inventory = JSON.parse(inventoryRaw);
  validateInventory(inventory);
  assert(inventory.runtime === descriptor.target, `inventory runtime ${inventory.runtime} does not match ${descriptor.target}`);

  const modelMap = new Map(inventory.models.map((model) => [model.id, model]));
  const resolvedWorkloads = Object.fromEntries(
    workloads.map((workload) => [workload, parseSelection(selections[workload], workload)]),
  );
  for (const [workload, selection] of Object.entries(resolvedWorkloads)) {
    validateSelection(selection, modelMap, workload);
  }

  const roles = {};
  for (const role of descriptor.roles) {
    const selection = roleSelections[role.name]
      ? parseSelection(roleSelections[role.name], role.name)
      : resolvedWorkloads[role.workload];
    validateSelection(selection, modelMap, role.name);
    roles[role.name] = {
      ...selection,
      workload: role.workload,
      constraints: role.constraints,
      diversityEstablished: false,
    };
  }

  const manifestPath = join(outputDirectory, "oh-my-stack.resolution.json");
  const prior = (await exists(manifestPath)) ? JSON.parse(await readFile(manifestPath, "utf8")) : null;
  assert(!prior || prior.owner === "oh-my-stack", `${manifestPath}: refusing to replace an unowned manifest`);
  const priorHashes = new Map(Object.entries(prior?.ownedFiles ?? {}));
  const extension = descriptor.adapter.format === "toml" ? "toml" : "md";
  const writes = [];
  for (const role of descriptor.roles) {
    const source = join(packageDirectory, "agents", `${role.name}.${extension}`);
    const target = join(outputDirectory, "agents", `${role.name}.${extension}`);
    const content = configuredRole(await readFile(source, "utf8"), descriptor.adapter, roles[role.name]);
    writes.push({ path: target, content });
  }

  const manifest = {
    schemaVersion: 1,
    owner: "oh-my-stack",
    target: descriptor.target,
    observedInventory: {
      observedAt: inventory.observedAt,
      source: inventory.source,
      sha256: sha256(inventoryRaw),
    },
    workloads: resolvedWorkloads,
    roles,
    ownedFiles: Object.fromEntries(
      writes.map(({ path, content }) => [
        relative(outputDirectory, path).split(sep).join("/"),
        sha256(content),
      ]),
    ),
  };

  if (apply) {
    for (const write of writes) await assertSafeTarget(write.path, outputDirectory, priorHashes);
    for (const write of writes) await safeWrite(write.path, write.content);
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  return { manifest, writes: writes.map(({ path }) => path), applied: apply };
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const result = await configure({
    packageRoot: arguments_.package,
    inventoryPath: arguments_.inventory,
    outputRoot: arguments_.output,
    selections: arguments_.selections,
    roleSelections: arguments_.roles,
    apply: arguments_.apply,
  });
  console.log(JSON.stringify(result, null, 2));
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
