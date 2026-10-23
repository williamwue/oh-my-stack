#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { StringDecoder } from "node:string_decoder";
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
    if (argument === "--confirm-claude-probes") {
      result.confirmClaudeProbes = true;
      continue;
    }
    const value = argv[index + 1];
    assert(value && !value.startsWith("--"), `${argument}: value is required`);
    index += 1;
    if (["--runtime", "--output", "--package", "--omp-bin", "--codex-bin", "--claude-bin", "--claude-models", "--pi-bin", "--pi-cli"].includes(argument)) {
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

const claudeEfforts = ["low", "medium", "high", "xhigh", "max"];

function claudeReasoningEfforts(alias, id) {
  assert(id.startsWith(`claude-${alias}-`), `${alias}: observed model ${id} is a different family or fallback`);
  let reasoningEfforts;
  if (/^claude-(?:opus-5-5|sonnet-5-5|haiku-5-5|opus-5|sonnet-5|opus-4-8|opus-4-7)$/.test(id)) {
    reasoningEfforts = claudeEfforts;
  } else if (/^claude-(?:opus-4-6|sonnet-4-6)$/.test(id)) {
    reasoningEfforts = ["low", "medium", "high", "max"];
  } else if (/^claude-haiku-4-5(?:-20251001)?$/.test(id)) {
    reasoningEfforts = ["none"];
  } else {
    throw new Error(`${alias}: ${id} has no reviewed effort policy; stop before configuration`);
  }
  return reasoningEfforts;
}

export function normalizeClaudeProbe(alias, result) {
  assert(["haiku", "sonnet", "opus"].includes(alias), `${alias}: only haiku, sonnet, and opus may be probed without a separate usage-credit policy`);
  assert(result?.is_error === false && result?.subtype === "success", `${alias}: Claude model probe did not complete successfully`);
  const models = Object.keys(result.modelUsage ?? {});
  assert(models.length === 1, `${alias}: expected one observed model, found ${models.length}`);
  const id = result.modelUsage[models[0]].canonicalModel ?? models[0];
  return { id, reasoningEfforts: claudeReasoningEfforts(alias, id) };
}

function inventoryLimits(runtime, overrides) {
  const limits = {
    timeoutMs: runtime === "codex" ? 30_000 : 60_000,
    terminateGraceMs: 1000,
    exitWaitMs: 1000,
    postExitDrainMs: 250,
    stdoutLimitBytes: 8 * 1024 * 1024,
    stderrLimitBytes: 64 * 1024,
    requestLimitBytes: 64 * 1024,
    maxModels: 10_000,
    maxPages: 100,
  };
  for (const [key, value] of Object.entries(overrides)) {
    assert(Object.hasOwn(limits, key) && Number.isSafeInteger(value) && value > 0 && value <= limits[key],
      `invalid inventory limit ${key}`);
    limits[key] = value;
  }
  return limits;
}

function inventoryProcess(command, args, limits, { input = false, timeoutMessage } = {}) {
  const javascript = /\.(?:mjs|cjs|js)$/i.test(command);
  const child = spawn(javascript ? process.execPath : command, javascript ? [command, ...args] : args,
    { stdio: [input ? "pipe" : "ignore", "pipe", "pipe"] });
  const label = `${command} ${args.join(" ")}`;
  const chunks = { stdout: [], stderr: [] };
  const bytes = { stdout: 0, stderr: 0 };
  let failure, exited, finished = false, killTimer, exitTimer, drainTimer;
  let resolveClosed, rejectClosed;
  const closed = new Promise((resolvePromise, reject) => { resolveClosed = resolvePromise; rejectClosed = reject; });
  const timeout = setTimeout(() => fail(new Error(timeoutMessage ?? `${label} timed out`)), limits.timeoutMs);

  function signalChild(signal) {
    try { child.kill(signal); }
    catch (error) { failure = new Error(`${failure.message}; ${signal} failed: ${error.message}`, { cause: failure }); }
  }

  function finish(code, exitSignal) {
    if (finished) return;
    finished = true;
    for (const timer of [timeout, killTimer, exitTimer, drainTimer]) clearTimeout(timer);
    child.stdin?.destroy();
    child.stdout.destroy();
    child.stderr.destroy();
    const stdout = Buffer.concat(chunks.stdout).toString("utf8");
    const stderr = Buffer.concat(chunks.stderr).toString("utf8");
    if (!failure && (code !== 0 || exitSignal)) {
      failure = new Error(`${label} exited ${code}, signal ${exitSignal ?? "none"}: ${stderr.trim()}`);
    }
    if (failure) rejectClosed(failure);
    else resolveClosed({ stdout, stderr });
  }

  function fail(error) {
    if (finished || failure) return;
    failure = error;
    clearTimeout(timeout);
    child.stdin?.destroy();
    if (exited) return;
    signalChild("SIGTERM");
    killTimer = setTimeout(() => {
      if (exited || finished) return;
      signalChild("SIGKILL");
      exitTimer = setTimeout(() => {
        failure = new Error(`${failure.message}; direct-child exit was not observed after SIGKILL`, { cause: failure });
        child.unref();
        finish(null, null);
      }, limits.exitWaitMs);
    }, limits.terminateGraceMs);
  }

  for (const stream of ["stdout", "stderr"]) {
    child[stream].on("data", chunk => {
      if (finished || failure) return;
      bytes[stream] += chunk.length;
      if (bytes[stream] > limits[`${stream}LimitBytes`]) {
        fail(new Error(`${label} ${stream} limit exceeded`));
        return;
      }
      if (stream === "stderr" || !input) chunks[stream].push(chunk);
    });
    child[stream].on("error", fail);
  }
  child.stdin?.on("error", fail);
  child.on("error", error => {
    fail(error);
    if (!child.pid) finish(null, null);
  });
  child.on("exit", (code, exitSignal) => {
    exited = { code, signal: exitSignal };
    clearTimeout(killTimer);
    clearTimeout(exitTimer);
    drainTimer = setTimeout(() => {
      fail(new Error(`${label} stdio did not close after direct-child exit`));
      finish(exited.code, exited.signal);
    }, limits.postExitDrainMs);
  });
  child.on("close", finish);
  return { child, closed, fail, get failed() { return Boolean(failure); } };
}

async function run(command, args, limits) {
  return inventoryProcess(command, args, limits).closed;
}

async function collectOmp(binary, limits) {
  const { stdout } = await run(binary, ["models", "--json", "--no-extensions"], limits);
  const payload = JSON.parse(stdout);
  assert(!Array.isArray(payload?.models) || payload.models.length <= limits.maxModels, "omp model count limit exceeded");
  return {
    source: `${binary} models --json --no-extensions`,
    models: normalizeOmpModels(payload),
  };
}

async function collectClaude(binary, aliases, confirmed, limits) {
  assert(confirmed, "Claude model probes consume account usage; pass --confirm-claude-probes after reviewing the aliases");
  assert(Array.isArray(aliases) && aliases.length > 0, "provide --claude-models haiku,sonnet,opus (or a reviewed subset)");
  const requests = aliases.map((entry) => {
    const [alias, pin, ...extra] = entry.split("=");
    assert(extra.length === 0 && (!entry.includes("=") || pin), `invalid Claude family pin ${entry}`);
    assert(["haiku", "sonnet", "opus"].includes(alias), `${alias}: Fable and other models require a separate usage-credit policy`);
    if (pin) claudeReasoningEfforts(alias, pin);
    return { alias, model: pin ?? alias, pinned: Boolean(pin) };
  });
  assert(new Set(requests.map(({ alias }) => alias)).size === requests.length, "Claude model probe aliases must be unique");
  const models = [];
  for (const { alias, model, pinned } of requests) {
    const { stdout } = await run(binary, ["-p", "Reply with exactly OK.", "--model", model,
      "--output-format", "json", "--max-turns", "1", "--permission-mode", "plan",
      "--permission-prompts", "none", "--restricted"], limits);
    const result = JSON.parse(stdout);
    const observed = normalizeClaudeProbe(alias, result);
    assert(!pinned || observed.id === model, `${alias}: requested ${model} but observed ${observed.id}; refusing fallback`);
    models.push(observed);
  }
  return {
    source: `${binary} --model <${aliases.join(",")}> bounded live probes; effort support from https://code.claude.com/docs/en/model-config (account caps require runtime acceptance)`,
    models: assertUniqueModels(models),
  };
}

async function collectCodex(binary, limits) {
  const process_ = inventoryProcess(binary, ["app-server", "--stdio"], limits,
    { input: true, timeoutMessage: "codex app-server model/list timed out" });
  const { child, fail } = process_;
  const decoder = new StringDecoder("utf8");
  const models = [];
  const cursors = new Set();
  let requestId = 2, complete = false, buffer = "", pages = 0, requestBytes = 0;

  function send(message) {
    if (process_.failed) return;
    const request = `${JSON.stringify(message)}\n`;
    const bytes = Buffer.byteLength(request);
    if (requestBytes + bytes > limits.requestLimitBytes || child.stdin.writableLength + bytes > limits.requestLimitBytes) {
      fail(new Error("codex request buffer limit exceeded"));
      return;
    }
    requestBytes += bytes;
    child.stdin.write(request);
  }

  function receive(line) {
    if (!line.trim() || process_.failed) return;
    try {
      const message = JSON.parse(line);
      assert(message && typeof message === "object" && !Array.isArray(message), "codex emitted invalid RPC message");
      if (message.id !== requestId && message.id !== 1) return;
      if (message.error) {
        throw new Error(`codex ${message.id === 1 ? "initialize" : "model/list"} failed: ${message.error.message ?? JSON.stringify(message.error)}`);
      }
      if (message.id === 1 || complete) return;
      assert(Array.isArray(message.result?.data), "codex model/list result must contain a data array");
      const cursor = message.result.nextCursor;
      assert(cursor === undefined || cursor === null || typeof cursor === "string", "codex model/list returned an invalid cursor");
      pages += 1;
      assert(pages <= limits.maxPages, "codex model/list page limit exceeded");
      assert(models.length + message.result.data.length <= limits.maxModels, "codex model count limit exceeded");
      models.push(...message.result.data);
      if (cursor) {
        assert(!cursors.has(cursor), "codex model/list repeated pagination cursor");
        assert(pages < limits.maxPages, "codex model/list page limit exceeded");
        assert(Buffer.byteLength(cursor) <= limits.requestLimitBytes, "codex request buffer limit exceeded");
        cursors.add(cursor);
        requestId += 1;
        send({ method: "model/list", id: requestId, params: { cursor, limit: 100, includeHidden: false } });
      } else {
        complete = true;
        child.stdin.end();
      }
    } catch (error) {
      fail(error instanceof SyntaxError ? new Error("codex emitted invalid or incomplete RPC JSON", { cause: error }) : error);
    }
  }

  child.stdout.on("data", chunk => {
    if (process_.failed) return;
    buffer += decoder.write(chunk);
    let index;
    while (!process_.failed && (index = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      receive(line);
    }
  });
  child.stdout.on("end", () => {
    if (process_.failed) return;
    buffer += decoder.end();
    if (buffer.trim()) receive(buffer);
    buffer = "";
  });

  send({
    method: "initialize",
    id: 1,
    params: { clientInfo: { name: "oh_my_stack", title: "Oh My Stack", version: "0.1.0" } },
  });
  send({ method: "initialized", params: {} });
  send({ method: "model/list", id: requestId, params: { limit: 100, includeHidden: false } });
  const { stderr } = await process_.closed;
  assert(complete, `${binary} app-server exited before model/list completed: ${stderr.trim()}`);
  return {
    source: `${binary} app-server model/list (includeHidden=false)`,
    models: normalizeCodexModels(models),
  };
}

export async function collectInventory({ runtime, ompBin = "omp", codexBin = "codex", claudeBin = "claude",
  piBin = "pi", piCli, cwd = process.cwd(), signal, limits = {},
  claudeModels = ["haiku", "sonnet", "opus"], confirmClaudeProbes = false, now = new Date() }) {
  const budgets = inventoryLimits(runtime, limits);
  let observed;
  if (runtime === "omp") observed = await collectOmp(ompBin, budgets);
  else if (runtime === "codex") observed = await collectCodex(codexBin, budgets);
  else if (runtime === "claude-code") observed = await collectClaude(claudeBin, claudeModels, confirmClaudeProbes, budgets);
  else if (runtime === "pi") {
    const { collectPiInventory } = await import("./pi-inventory.mjs");
    observed = await collectPiInventory({ binary: piCli ? { command: piBin, args: [resolve(piCli)] } : piBin, cwd, signal });
  }
  else {
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
    claudeBin: arguments_.claudeBin,
    piBin: arguments_.piBin,
    piCli: arguments_["pi-cli"],
    claudeModels: arguments_["claude-models"]?.split(","),
    confirmClaudeProbes: arguments_.confirmClaudeProbes,
  });
  const output = `${JSON.stringify(inventory, null, 2)}\n`;
  if (arguments_.output) {
    const outputPath = resolve(arguments_.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output);
  }
  console.log(output.trimEnd());
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
