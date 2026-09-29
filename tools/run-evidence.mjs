import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DurableRunState, DurableRunStateError } from "./durable-run-state.mjs";

const COMMIT = /^[a-fA-F0-9]{40}(?:[a-fA-F0-9]{24})?$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const DIGEST = /^[a-fA-F0-9]{64}$/;
const SECRET = /(?:secret|token|password|passwd|credential|private.?key|api.?key)/i;
const STATUSES = new Set(["pass", "fail", "unknown"]);

function fail(code, message) {
  throw new DurableRunStateError(code, message);
}

function ensure(condition, code, message) {
  if (!condition) fail(code, message);
}

function exactKeys(object, required, optional = []) {
  ensure(object !== null && typeof object === "object" && !Array.isArray(object), "INVALID_RECEIPT", "receipt fields must be objects");
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(object)) {
    ensure(!SECRET.test(key), "SECRET_DATA", `secret-bearing field ${key} is refused`);
    ensure(allowed.has(key), "INVALID_RECEIPT", `unexpected receipt field ${key}`);
  }
  for (const key of required) ensure(Object.hasOwn(object, key), "INVALID_RECEIPT", `missing receipt field ${key}`);
}

function validateReceipt(receipt) {
  exactKeys(receipt, ["receiptId", "runId", "generation", "runRevision", "sourceCommit", "command", "result", "checks"]);
  ensure(ID.test(receipt.receiptId) && ID.test(receipt.runId), "INVALID_RECEIPT", "receiptId and runId must be stable IDs");
  ensure(Number.isSafeInteger(receipt.generation) && receipt.generation >= 0, "INVALID_RECEIPT", "invalid generation");
  ensure(Number.isSafeInteger(receipt.runRevision) && receipt.runRevision >= 0, "INVALID_RECEIPT", "invalid run revision");
  ensure(typeof receipt.sourceCommit === "string" && COMMIT.test(receipt.sourceCommit), "INVALID_RECEIPT", "sourceCommit must be a full Git commit ID");
  ensure(Array.isArray(receipt.command) && receipt.command.length > 0 && receipt.command.length <= 64, "INVALID_RECEIPT", "command must be a nonempty argv array");
  for (const argument of receipt.command) {
    ensure(typeof argument === "string" && argument.length > 0 && argument.length <= 2048 && !/[\r\n\0]/.test(argument), "INVALID_RECEIPT", "invalid command argument");
    ensure(!SECRET.test(argument) && !/:\/\/[^/\s]*@/.test(argument), "SECRET_DATA", "command appears to contain credentials");
  }
  exactKeys(receipt.result, ["exitCode"], ["stdoutSha256", "stderrSha256"]);
  ensure(Number.isSafeInteger(receipt.result.exitCode) && receipt.result.exitCode >= 0 && receipt.result.exitCode <= 255, "INVALID_RECEIPT", "exitCode must be an integer from 0 to 255");
  for (const key of ["stdoutSha256", "stderrSha256"]) {
    if (Object.hasOwn(receipt.result, key)) ensure(typeof receipt.result[key] === "string" && DIGEST.test(receipt.result[key]), "INVALID_RECEIPT", `${key} must be a SHA-256 digest`);
  }
  ensure(Array.isArray(receipt.checks) && receipt.checks.length > 0, "INVALID_RECEIPT", "at least one check is required");
  const names = new Set();
  for (const check of receipt.checks) {
    exactKeys(check, ["name", "status"]);
    ensure(typeof check.name === "string" && ID.test(check.name) && !SECRET.test(check.name), "INVALID_RECEIPT", "invalid check name");
    ensure(!names.has(check.name), "INVALID_RECEIPT", `duplicate check ${check.name}`);
    ensure(STATUSES.has(check.status), "INVALID_RECEIPT", "check status must be pass, fail, or unknown");
    names.add(check.name);
  }
  ensure(receipt.result.exitCode === 0 || receipt.checks.some((check) => check.status === "fail"), "INVALID_RECEIPT", "a nonzero exit code requires a failed check");
  return receipt;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

function sameReceipt(a, b) {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

async function loadContext({ runStorePath, evidenceStorePath, storeRoot, runId, generation }) {
  ensure(typeof runStorePath === "string" && typeof evidenceStorePath === "string" && resolve(runStorePath) !== resolve(evidenceStorePath), "INVALID_PATH", "separate run and evidence stores are required");
  const run = await DurableRunState.load({ storePath: runStorePath, storeRoot, runId, generation });
  const root = resolve(storeRoot ?? dirname(resolve(runStorePath)));
  const evidenceOptions = { storePath: evidenceStorePath, storeRoot: root, runId: run.state.runId, generation: run.state.generation };
  const runStore = relative(root, resolve(runStorePath));
  return { run, evidenceOptions, runStore };
}

function verifyEvidence(evidence, runStore) {
  const state = evidence.state;
  ensure(state.metadata.kind === "run-evidence" && state.metadata.runStore === runStore, "EVIDENCE_MISMATCH", "evidence store belongs to another run store");
  for (const [index, event] of state.events.entries()) {
    if (index === 0) {
      ensure(event.type === "start" && event.payload.kind === "run-evidence", "EVIDENCE_INVALID", "evidence log has an invalid start event");
    } else {
      ensure(event.type === "checkpoint" && event.payload?.receipt, "EVIDENCE_INVALID", "evidence log contains a non-receipt event");
      const receipt = validateReceipt(event.payload.receipt);
      ensure(event.eventId === receipt.receiptId && receipt.runId === state.runId && receipt.generation === state.generation, "EVIDENCE_INVALID", "receipt identity does not match evidence log");
    }
  }
  return state;
}

async function loadEvidence(options, runStore) {
  try {
    return verifyEvidence(await DurableRunState.load(options), runStore);
  } catch (error) {
    if (error.code === "STORE_MISSING") return null;
    throw error;
  }
}

export async function recordReceipt({ runStorePath, evidenceStorePath, storeRoot, receipt, currentSourceCommit }) {
  validateReceipt(receipt);
  ensure(typeof currentSourceCommit === "string" && COMMIT.test(currentSourceCommit), "INVALID_SOURCE", "currentSourceCommit must be a full Git commit ID");
  const { run, evidenceOptions, runStore } = await loadContext({ runStorePath, evidenceStorePath, storeRoot, runId: receipt.runId, generation: receipt.generation });
  ensure(receipt.runRevision === run.state.revision, "STALE_REVISION", "receipt run revision differs from the current run");
  ensure(receipt.sourceCommit.toLowerCase() === currentSourceCommit.toLowerCase(), "STALE_SOURCE", "receipt source commit differs from current source");

  let evidence = await loadEvidence(evidenceOptions, runStore);
  if (!evidence) {
    try {
      evidence = await DurableRunState.create({ ...evidenceOptions, metadata: { kind: "run-evidence", runStore } });
    } catch (error) {
      if (error.code !== "STORE_EXISTS") throw error;
      evidence = await DurableRunState.load(evidenceOptions);
      verifyEvidence(evidence, runStore);
    }
  } else {
    evidence = await DurableRunState.load(evidenceOptions);
    verifyEvidence(evidence, runStore);
  }
  if (evidence.state.revision === 0) {
    await evidence.append({ eventId: "evidence-start", generation: receipt.generation, revision: 1, type: "start", payload: { kind: "run-evidence" } });
  }
  const previous = evidence.state.events.find((event) => event.eventId === receipt.receiptId);
  if (previous) {
    ensure(previous.payload?.receipt && sameReceipt(previous.payload.receipt, receipt), "RECEIPT_CONFLICT", "receiptId already belongs to a different receipt");
    return { duplicate: true, receipt: previous.payload.receipt, evidenceRevision: evidence.state.revision };
  }
  ensure(receipt.receiptId !== "evidence-start", "INVALID_RECEIPT", "receiptId is reserved");
  const appended = await evidence.append({ eventId: receipt.receiptId, generation: receipt.generation, revision: evidence.state.revision + 1, type: "checkpoint", payload: { receipt } });
  return { duplicate: false, receipt, evidenceRevision: appended.state.revision };
}

export async function getEvidenceStatus({ runStorePath, evidenceStorePath, storeRoot, runId, generation, currentSourceCommit }) {
  ensure(typeof currentSourceCommit === "string" && COMMIT.test(currentSourceCommit), "INVALID_SOURCE", "currentSourceCommit must be a full Git commit ID");
  const { run, evidenceOptions, runStore } = await loadContext({ runStorePath, evidenceStorePath, storeRoot, runId, generation });
  const evidence = await loadEvidence(evidenceOptions, runStore);
  const receipts = evidence?.events.slice(1).map((event) => event.payload.receipt) ?? [];
  const current = receipts.filter((receipt) => receipt.runRevision === run.state.revision && receipt.sourceCommit.toLowerCase() === currentSourceCommit.toLowerCase());
  const stale = receipts.filter((receipt) => !current.includes(receipt));
  const checks = new Map();
  for (const receipt of current) for (const check of receipt.checks) checks.set(check.name, { ...check, receiptId: receipt.receiptId });
  const values = [...checks.values()];
  const status = values.length === 0 ? stale.length ? "stale" : "unknown"
    : values.some((check) => check.status === "fail") ? "fail"
      : values.some((check) => check.status === "unknown") ? "unknown" : "pass";
  return {
    runId: run.state.runId,
    generation: run.state.generation,
    runRevision: run.state.revision,
    runStatus: run.state.status,
    sourceCommit: currentSourceCommit.toLowerCase(),
    status,
    checks: values,
    currentReceipts: current,
    staleReceipts: stale.map(({ receiptId, runRevision, sourceCommit }) => ({ receiptId, runRevision, sourceCommit })),
  };
}

export function formatEvidenceStatus(report) {
  const lines = [`Run ${report.runId} generation ${report.generation} revision ${report.runRevision} (${report.runStatus})`, `Source ${report.sourceCommit}`, `Verification: ${report.status}`];
  for (const check of report.checks) lines.push(`  ${check.name}: ${check.status} (${check.receiptId})`);
  if (report.staleReceipts.length) lines.push(`Stale receipts: ${report.staleReceipts.map((receipt) => receipt.receiptId).join(", ")}`);
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const [action, ...args] = argv;
  ensure(["record", "status"].includes(action), "USAGE", "usage: run-evidence.mjs <record|status> --run-store FILE --evidence-store FILE --store-root DIR --source-commit SHA [--receipt FILE] [--run-id ID --generation N] [--json]");
  const flags = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    ensure(["--run-store", "--evidence-store", "--store-root", "--source-commit", "--receipt", "--run-id", "--generation", "--json"].includes(flag) && !Object.hasOwn(flags, flag), "USAGE", `invalid or repeated argument ${flag}`);
    flags[flag] = flag === "--json" ? true : args[++index];
    ensure(flags[flag] !== undefined, "USAGE", `missing value for ${flag}`);
  }
  for (const flag of ["--run-store", "--evidence-store", "--store-root", "--source-commit"]) ensure(flags[flag], "USAGE", `${flag} is required`);
  if (action === "record") ensure(flags["--receipt"] && !flags["--run-id"] && flags["--generation"] === undefined, "USAGE", "record requires --receipt");
  if (action === "status") ensure(flags["--run-id"] && flags["--generation"] !== undefined && !flags["--receipt"], "USAGE", "status requires --run-id and --generation");
  return { action, flags };
}

export async function main(argv = process.argv.slice(2)) {
  const { action, flags } = parseArgs(argv);
  const common = { runStorePath: flags["--run-store"], evidenceStorePath: flags["--evidence-store"], storeRoot: flags["--store-root"], currentSourceCommit: flags["--source-commit"] };
  if (action === "record") {
    const receipt = JSON.parse(await readFile(flags["--receipt"], "utf8"));
    const result = await recordReceipt({ ...common, receipt });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else {
    const report = await getEvidenceStatus({ ...common, runId: flags["--run-id"], generation: Number(flags["--generation"]) });
    process.stdout.write(flags["--json"] ? `${JSON.stringify(report, null, 2)}\n` : formatEvidenceStatus(report));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.code ?? error.name}: ${error.message}\n`);
    process.exitCode = 1;
  });
}
