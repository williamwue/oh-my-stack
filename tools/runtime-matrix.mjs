#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { arch, platform } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 1;
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_OUTPUT_BYTES = 65536;
const RUNTIMES = new Set(["node", "bun"]);
const PLATFORM_CLASSES = new Set(["windows", "posix"]);
const STATUSES = new Set(["passed", "failed", "unsupported", "unknown"]);

function assert(condition, message, code = "RUNTIME_MATRIX_INVALID") {
  if (!condition) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }
}

function now() {
  return new Date().toISOString();
}

function platformClass(value = platform()) {
  if (value === "win32" || value === "windows") return "windows";
  if (["linux", "darwin", "freebsd", "openbsd", "sunos", "aix", "posix"].includes(value)) return "posix";
  return "unknown";
}

function commandParts(command) {
  if (Array.isArray(command)) {
    assert(command.length > 0 && command.every((part) => typeof part === "string" && part.length > 0),
      "probe command must be a non-empty string array");
    return { executable: command[0], args: command.slice(1), display: command.join(" ") };
  }
  assert(command && typeof command === "object", "probe command must be an object or string array");
  assert(typeof command.executable === "string" && command.executable.length > 0,
    "probe command executable is required");
  const args = command.args ?? [];
  assert(Array.isArray(args) && args.every((part) => typeof part === "string"),
    "probe command args must be strings");
  return { executable: command.executable, args, display: [command.executable, ...args].join(" ") };
}

function runtimeExecutable(runtime, runtimes = {}) {
  const configured = runtimes[runtime];
  if (configured) return configured;
  if (runtime === "node") return process.execPath;
  return process.env.OMS_BUN_BINARY || "bun";
}

async function runtimeMetadata(runtime, executable, limits) {
  const versionCommand = [executable, "--version"];
  const run = await executeCommand({ command: versionCommand, ...limits });
  if (run.error || run.timedOut || run.outputLimited || run.exitCode !== 0) {
    return {
      name: runtime,
      executable,
      version: null,
      versionCommand,
      unavailable: ["ENOENT", "EACCES"].includes(run.error?.code),
      failure: run.timedOut ? "runtime-version-timeout" : run.outputLimited ? "runtime-version-output-limit" : "runtime-version-failed",
      error: run.error?.code || run.error?.message || `exit ${run.exitCode}`,
    };
  }
  const version = run.stdout.trim() || run.stderr.trim();
  return { name: runtime, executable, version: version || "unknown", versionCommand };
}

function validateProbe(probe, index = 0) {
  assert(probe && typeof probe === "object" && !Array.isArray(probe), `probe ${index}: declaration must be an object`);
  assert(typeof probe.id === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(probe.id),
    `probe ${index}: id is invalid`);
  assert(RUNTIMES.has(probe.runtime), `${probe.id}: runtime must be node or bun`);
  const classes = Array.isArray(probe.platform) ? probe.platform : [probe.platform ?? platformClass()];
  assert(classes.length > 0 && classes.every((entry) => PLATFORM_CLASSES.has(entry)),
    `${probe.id}: platform must be windows or posix`);
  assert(probe.command !== undefined || typeof probe.script === "string",
    `${probe.id}: command or script is required`);
  if (probe.command !== undefined) commandParts(probe.command);
  if (probe.script !== undefined) assert(typeof probe.script === "string", `${probe.id}: script must be a string`);
  if (probe.unavailableStatus !== undefined) assert(["unknown", "unsupported"].includes(probe.unavailableStatus),
    `${probe.id}: unavailableStatus must be unknown or unsupported`);
  return { ...probe, platform: classes };
}

function normalizePayload(payload, probe) {
  assert(payload !== undefined, `${probe.id}: missing JSON probe result`, "MALFORMED_PROBE_RESULT");
  assert(payload && typeof payload === "object" && !Array.isArray(payload), `${probe.id}: malformed probe result`, "MALFORMED_PROBE_RESULT");
  const status = payload.status ?? (payload.result === "pass" ? "passed" : payload.result === "fail" ? "failed" : undefined);
  assert(STATUSES.has(status), `${probe.id}: malformed probe result status`, "MALFORMED_PROBE_RESULT");
  if (status === "passed") assert(payload.ok !== false, `${probe.id}: passed probe reported ok=false`, "MALFORMED_PROBE_RESULT");
  return {
    status,
    result: status === "passed" ? "pass" : status === "failed" ? "fail" : status,
    ...(Object.hasOwn(payload, "ok") ? { ok: payload.ok } : {}),
    payload,
  };
}

function commandLimits({ timeoutMs = DEFAULT_TIMEOUT_MS, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES } = {}) {
  assert(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 60000, "timeoutMs must be 1..60000");
  assert(Number.isSafeInteger(maxOutputBytes) && maxOutputBytes > 0 && maxOutputBytes <= 1048576, "maxOutputBytes must be 1..1048576");
  return { timeoutMs, maxOutputBytes };
}

async function executeCommand({ command, cwd, env, timeoutMs, maxOutputBytes }) {
  const parts = commandParts(command);
  const limits = commandLimits({ timeoutMs, maxOutputBytes });
  return new Promise((resolveResult) => {
    const startedAt = now();
    const child = spawn(parts.executable, parts.args, {
      cwd,
      env: { ...process.env, ...env },
      shell: false,
      windowsHide: true,
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let outputBytes = 0;
    let timedOut = false;
    let outputLimited = false;
    let spawnError;
    const terminate = () => {
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.kill("SIGKILL");
    };
    const timer = setTimeout(() => { timedOut = true; terminate(); }, limits.timeoutMs);
    const collect = (stream, chunk) => {
      const remaining = Math.max(0, limits.maxOutputBytes - outputBytes);
      const kept = chunk.subarray(0, remaining);
      outputBytes += chunk.length;
      if (stream === "stdout") stdoutChunks.push(kept);
      else stderrChunks.push(kept);
      if (outputBytes > limits.maxOutputBytes && !outputLimited) {
        outputLimited = true;
        terminate();
      }
    };
    child.stdout?.on("data", (chunk) => collect("stdout", chunk));
    child.stderr?.on("data", (chunk) => collect("stderr", chunk));
    child.on("error", (error) => { spawnError = error; });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolveResult({ ...parts, startedAt, endedAt: now(),
        stdout: Buffer.concat(stdoutChunks).toString("utf8"), stderr: Buffer.concat(stderrChunks).toString("utf8"), exitCode, signal,
        timedOut, outputLimited, error: spawnError });
    });
  });
}

async function probeOne(probeInput, { cwd, env, runtimes = {}, actualPlatform = platform(), actualArch = arch(), timeoutMs, maxOutputBytes } = {}) {
  const probe = validateProbe(probeInput);
  const limits = commandLimits({ timeoutMs: probe.timeoutMs ?? timeoutMs, maxOutputBytes: probe.maxOutputBytes ?? maxOutputBytes });
  const startedAt = now();
  const runtime = runtimeMetadata(probe.runtime, runtimeExecutable(probe.runtime, runtimes), limits);
  const runtimeInfo = await runtime;
  const command = probe.command ?? { executable: runtimeInfo.executable, args: ["-e", probe.script] };
  const commandMeta = commandParts(command);
  const className = platformClass(actualPlatform);
  const base = {
    schemaVersion: SCHEMA_VERSION,
    probe: probe.id,
    capabilityClass: probe.capabilityClass ?? `${probe.runtime}.${probe.platform.join("+")}`,
    requested: { runtime: probe.runtime, platform: probe.platform },
    runtime: runtimeInfo,
    platform: { name: actualPlatform, class: className, architecture: actualArch },
    command: commandMeta,
    startedAt,
    endedAt: now(),
  };
  if (!probe.platform.includes(className)) {
    return { ...base, status: "unsupported", result: "unsupported", reason: "platform-class-unavailable", endedAt: now() };
  }
  if (runtimeInfo.unavailable) {
    const status = probe.unavailableStatus ?? "unknown";
    return { ...base, status, result: status, reason: "runtime-unavailable", endedAt: now() };
  }
  if (runtimeInfo.failure) {
    return { ...base, status: "failed", result: "fail", reason: runtimeInfo.failure, endedAt: now() };
  }
  const run = await executeCommand({ command, cwd, env, ...limits });
  const result = { ...base, command: { executable: run.executable, args: run.args, display: run.display }, stdout: run.stdout, stderr: run.stderr, exitCode: run.exitCode ?? null,
    signal: run.signal ?? null, endedAt: run.endedAt };
  if (run.error) {
    return { ...result, status: "failed", result: "fail", reason: run.error.code || run.error.message, error: run.error.message };
  }
  if (run.timedOut) return { ...result, status: "failed", result: "fail", reason: "command-timeout" };
  if (run.outputLimited) return { ...result, status: "failed", result: "fail", reason: "command-output-limit" };
  if (run.exitCode !== 0) return { ...result, status: "failed", result: "fail", reason: "non-zero-exit" };
  let payload;
  const text = run.stdout.trim();
  if (text) {
    try { payload = JSON.parse(text); }
    catch (error) { return { ...result, status: "failed", result: "fail", reason: "malformed-probe-result", error: error.message }; }
  }
  try {
    const normalized = normalizePayload(payload, probe);
    return { ...result, ...normalized };
  } catch (error) {
    return { ...result, status: "failed", result: "fail", reason: "malformed-probe-result", error: error.message };
  }
}

export async function executeProbe(probe, options = {}) {
  return probeOne(probe, options);
}

export async function runRuntimeMatrix({ probes, revision, cwd, env, runtimes, fixture, persistPath, actualPlatform = platform(), actualArch = arch(), timeoutMs, maxOutputBytes } = {}) {
  assert(Array.isArray(probes) && probes.length > 0, "probes must be a non-empty array");
  assert(typeof revision === "string" && revision.length > 0, "revision is required", "REVISION_REQUIRED");
  let fixtureRoot = cwd;
  let cleanup;
  if (fixture) {
    assert(typeof fixture === "function", "fixture must be a function");
    const created = await fixture();
    fixtureRoot = typeof created === "string" ? created : created?.root;
    cleanup = typeof created === "object" ? created.cleanup : undefined;
    assert(typeof fixtureRoot === "string" && fixtureRoot.length > 0, "fixture must return a root path");
  }
  const results = [];
  try {
    for (const [index, declaration] of probes.entries()) {
      results.push({ ...(await probeOne(declaration, { cwd: fixtureRoot, env, runtimes, actualPlatform, actualArch, timeoutMs, maxOutputBytes })), revision });
    }
  } finally {
    if (cleanup) await cleanup();
  }
  const document = {
    schemaVersion: SCHEMA_VERSION,
    id: randomUUID(),
    revision,
    coordinate: { platform: actualPlatform, platformClass: platformClass(actualPlatform), architecture: actualArch },
    recordedAt: now(),
    results,
  };
  if (persistPath) await persistRuntimeMatrix(persistPath, document);
  return document;
}

function validateDocument(document) {
  assert(document && typeof document === "object" && !Array.isArray(document), "matrix document must be an object");
  assert(document.schemaVersion === SCHEMA_VERSION, "unsupported runtime matrix schema");
  assert(typeof document.revision === "string" && document.revision.length > 0, "matrix revision is required", "REVISION_REQUIRED");
  assert(Array.isArray(document.results), "matrix results are required");
  for (const result of document.results) {
    assert(result && typeof result === "object" && STATUSES.has(result.status), "matrix result has invalid status", "MALFORMED_PROBE_RESULT");
    assert(result.revision === document.revision, "result revision differs from matrix revision", "REVISION_MISMATCH");
    assert(result.runtime?.name && result.runtime?.versionCommand, "matrix result is missing exact runtime metadata", "MALFORMED_PROBE_RESULT");
    assert(result.platform?.class && result.command && typeof result.command === "object" && !Array.isArray(result.command)
      && typeof result.command.executable === "string" && result.command.executable.trim().length > 0
      && Array.isArray(result.command.args) && result.command.args.every((part) => typeof part === "string"),
    "matrix result is missing exact command metadata", "MALFORMED_PROBE_RESULT");
  }
  return document;
}

export async function persistRuntimeMatrix(path, document) {
  const target = resolve(path);
  validateDocument(document);
  try {
    const existing = JSON.parse(await readFile(target, "utf8"));
    assert(existing.revision === document.revision, "cannot replace a result from another revision", "REVISION_MISMATCH");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try { await rename(temporary, target); }
  catch (error) { await rm(temporary, { force: true }); throw error; }
  return document;
}

export async function loadRuntimeMatrix(path, { revision } = {}) {
  const document = validateDocument(JSON.parse(await readFile(resolve(path), "utf8")));
  if (revision !== undefined) assert(document.revision === revision, "persisted result belongs to another revision", "REVISION_MISMATCH");
  return document;
}

export function classifyUnavailableRuntime({ unavailableStatus = "unknown" } = {}) {
  assert(["unknown", "unsupported"].includes(unavailableStatus), "unavailableStatus must be unknown or unsupported");
  return unavailableStatus;
}

export const runtimeMatrix = runRuntimeMatrix;

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) return;
  const revisionIndex = args.indexOf("--revision");
  const outputIndex = args.indexOf("--output");
  assert(revisionIndex >= 0 && args[revisionIndex + 1], "--revision is required");
  assert(outputIndex >= 0 && args[outputIndex + 1], "--output is required");
  const result = await runRuntimeMatrix({ revision: args[revisionIndex + 1], persistPath: args[outputIndex + 1], probes: [
    { id: "node-self-check", runtime: "node", platform: ["windows", "posix"], script: "process.stdout.write(JSON.stringify({status:'passed', ok:true}))" },
  ] });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
