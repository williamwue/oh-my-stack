#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultPackageRoot = resolve(scriptDirectory, "..");
const allowedEfforts = new Set(["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    assert(value && !value.startsWith("--"), `${argument}: value is required`);
    index += 1;
    if (["--runtime", "--output", "--package", "--omp-bin", "--codex-bin"].includes(argument)) {
      result[argument.slice(2).replace("-bin", "Bin")] = value;
    } else {
      throw new Error(`unknown argument ${argument}`);
    }
  }
  return result;
}

function normalizeEfforts(values, label) {
  assert(Array.isArray(values), `${label}: reasoning efforts must be an array`);
  const efforts = [];
  for (const value of values) {
    assert(allowedEfforts.has(value), `${label}: unsupported reasoning effort ${value}`);
    if (!efforts.includes(value)) efforts.push(value);
  }
  return efforts;
}

function assertUniqueModels(models) {
  const ids = new Set();
  for (const model of models) {
    assert(!ids.has(model.id), `runtime inventory repeats model ${model.id}`);
    ids.add(model.id);
  }
  assert(models.length > 0, "runtime inventory returned no models");
  return models;
}

export function normalizeOmpModels(payload) {
  assert(Array.isArray(payload?.models), "omp models output must contain a models array");
  return assertUniqueModels(payload.models.map((model, index) => {
    assert(typeof model.selector === "string" && model.selector.length > 0, `omp model ${index}: selector is required`);
    return {
      id: model.selector,
      reasoningEfforts: normalizeEfforts(model.thinking ?? [], model.selector),
    };
  }));
}

export function normalizeCodexModels(models) {
  assert(Array.isArray(models), "codex model/list result must be an array");
  return assertUniqueModels(models.map((model, index) => {
    const id = model.model ?? model.id;
    assert(typeof id === "string" && id.length > 0, `codex model ${index}: id is required`);
    const efforts = (model.supportedReasoningEfforts ?? []).map((entry) => entry.reasoningEffort);
    return { id, reasoningEfforts: normalizeEfforts(efforts, id) };
  }));
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise({ stdout, stderr });
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}: ${stderr.trim()}`));
    });
  });
}

async function collectOmp(binary) {
  const { stdout } = await run(binary, ["models", "--json", "--no-extensions"]);
  return {
    source: `${binary} models --json --no-extensions`,
    models: normalizeOmpModels(JSON.parse(stdout)),
  };
}

function collectCodex(binary) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(binary, ["app-server", "--stdio"], { stdio: ["pipe", "pipe", "pipe"] });
    const lines = createInterface({ input: child.stdout });
    const models = [];
    let requestId = 2;
    let complete = false;
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("codex app-server model/list timed out"));
    }, 30_000);

    function send(message) {
      child.stdin.write(`${JSON.stringify(message)}\n`);
    }

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    lines.on("line", (line) => {
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }
      if (message.id !== requestId) return;
      if (message.error) {
        clearTimeout(timeout);
        child.kill();
        reject(new Error(`codex model/list failed: ${message.error.message ?? JSON.stringify(message.error)}`));
        return;
      }
      models.push(...(message.result?.data ?? []));
      const cursor = message.result?.nextCursor;
      if (cursor) {
        requestId += 1;
        send({ method: "model/list", id: requestId, params: { cursor, limit: 100, includeHidden: false } });
      } else {
        complete = true;
        child.stdin.end();
      }
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (!complete) {
        reject(new Error(`${binary} app-server exited ${code} before model/list completed: ${stderr.trim()}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${binary} app-server exited ${code}: ${stderr.trim()}`));
        return;
      }
      try {
        resolvePromise({
          source: `${binary} app-server model/list (includeHidden=false)`,
          models: normalizeCodexModels(models),
        });
      } catch (error) {
        reject(error);
      }
    });

    send({
      method: "initialize",
      id: 1,
      params: {
        clientInfo: { name: "oh_my_stack", title: "Oh My Stack", version: "0.1.0" },
      },
    });
    send({ method: "initialized", params: {} });
    send({ method: "model/list", id: requestId, params: { limit: 100, includeHidden: false } });
  });
}

export async function collectInventory({ runtime, ompBin = "omp", codexBin = "codex", now = new Date() }) {
  let observed;
  if (runtime === "omp") observed = await collectOmp(ompBin);
  else if (runtime === "codex") observed = await collectCodex(codexBin);
  else if (runtime === "claude-code") {
    throw new Error("claude-code live model inventory is not verified; stop before writing configuration");
  } else {
    throw new Error(`unsupported runtime ${runtime}`);
  }
  return {
    schemaVersion: 1,
    runtime,
    observedAt: now.toISOString(),
    source: observed.source,
    models: observed.models,
  };
}

async function runtimeFromPackage(packageRoot) {
  const descriptor = JSON.parse(await readFile(join(resolve(packageRoot), "config", "runtime-resolution.json"), "utf8"));
  return descriptor.target;
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const packageRoot = resolve(arguments_.package ?? defaultPackageRoot);
  const runtime = arguments_.runtime ?? await runtimeFromPackage(packageRoot);
  const inventory = await collectInventory({
    runtime,
    ompBin: arguments_.ompBin,
    codexBin: arguments_.codexBin,
  });
  const output = `${JSON.stringify(inventory, null, 2)}\n`;
  if (arguments_.output) {
    const outputPath = resolve(arguments_.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output);
  }
  console.log(output.trimEnd());
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
