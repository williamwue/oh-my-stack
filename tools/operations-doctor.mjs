import { execFile } from "node:child_process";
import { lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { DurableRunState } from "./durable-run-state.mjs";
import { getEvidenceStatus } from "./run-evidence.mjs";
import { loadRuntimeMatrix } from "./runtime-matrix.mjs";

const execFileAsync = promisify(execFile);
const USAGE = "node tools/operations-doctor.mjs --store-root DIR --run-store FILE --evidence-store FILE --matrix FILE --run-id ID --generation N [--source-root DIR] [--json]";
const OPTIONS = new Set(["--store-root", "--run-store", "--evidence-store", "--matrix", "--run-id", "--generation", "--source-root", "--json"]);
const REQUIRED = ["--store-root", "--run-store", "--evidence-store", "--matrix", "--run-id", "--generation"];

function check(name, code, message, action, ok = false) {
  return { name, status: ok ? "pass" : "fail", code, message, ...(!ok && action ? { action } : {}) };
}

function classify(error, missing, invalid) {
  if (["STORE_MISSING", "ENOENT"].includes(error?.code)) return missing;
  if (["STORE_INVALID", "INVALID_JSON", "INVALID_EVENT", "INVALID_GENERATION", "INVALID_RECEIPT", "EVIDENCE_INVALID", "EVIDENCE_MISMATCH", "SECRET_DATA", "RUNTIME_MATRIX_INVALID", "MALFORMED_PROBE_RESULT"].includes(error?.code) || error instanceof SyntaxError) return invalid;
  if (["RUN_MISMATCH", "STALE_GENERATION"].includes(error?.code)) return "RUN_IDENTITY_MISMATCH";
  if (["PATH_OUTSIDE_STORE", "INVALID_PATH"].includes(error?.code)) return "INVALID_STORE_PATH";
  return "READ_ERROR";
}

function failure(name, code) {
  const guidance = {
    SOURCE_UNAVAILABLE: ["Cannot determine current source commit.", "Run from a Git checkout or pass --source-root for the checkout being checked."],
    SOURCE_DIRTY: ["Tracked source files differ from the current commit.", "Commit or restore tracked changes, then regenerate evidence and the matrix."],
    RUN_MISSING: ["Run store is missing.", "Supply an existing run store; do not recreate an in-progress run."],
    RUN_INVALID: ["Run store is malformed or unsupported.", "Inspect a backup and the store schema before recovering the run."],
    EVIDENCE_MISSING: ["Evidence store is missing.", "Record verification receipts for this run and revision."],
    EVIDENCE_INVALID: ["Evidence store is malformed or mismatched.", "Inspect a backup and verify the evidence belongs to this run store."],
    RUN_IDENTITY_MISMATCH: ["Run identity or generation differs.", "Check --run-id and --generation against the saved run."],
    INVALID_STORE_PATH: ["Store path is invalid or outside the store root.", "Use separate files beneath --store-root without symlink traversal."],
    EVIDENCE_STALE: ["Evidence belongs to an older run revision or source commit.", "Rerun verification and record a receipt for the current revision and commit."],
    EVIDENCE_UNKNOWN: ["No passing current verification is available.", "Record current checks and resolve unknown results."],
    EVIDENCE_FAILED: ["A current verification check failed.", "Fix the failing check and record a new receipt."],
    MATRIX_MISSING: ["Runtime matrix is missing.", "Run the local matrix probe and provide its persisted output."],
    MATRIX_INVALID: ["Runtime matrix is malformed or unsupported.", "Regenerate the matrix using the current source tooling."],
    MATRIX_STALE: ["Runtime matrix belongs to a different source revision.", "Rerun the matrix against the current checkout."],
    RUNTIME_UNKNOWN: ["A runtime probe is unknown or absent.", "Install or probe the runtime and record a fresh matrix result."],
    RUNTIME_UNSUPPORTED: ["A runtime probe is unsupported on this coordinate.", "Use a supported coordinate or document a verified fallback."],
    RUNTIME_FAILED: ["A runtime probe failed.", "Inspect the private probe artifact and rerun after fixing the cause."],
    LOCK_PRESENT: ["A store lock file is present.", "Inspect the owning process and filesystem state; never delete a lock while its writer may be active."],
    READ_ERROR: ["A local read failed.", "Check file permissions and retry after the filesystem issue is resolved."],
  };
  const [message, action] = guidance[code] ?? guidance.READ_ERROR;
  return check(name, code, message, action);
}

async function sourceCommit(sourceRoot) {
  const { stdout } = await execFileAsync("git", ["-C", sourceRoot, "rev-parse", "--verify", "HEAD"], { windowsHide: true, timeout: 5000 });
  const commit = stdout.trim();
  if (!/^[a-fA-F0-9]{40}(?:[a-fA-F0-9]{24})?$/.test(commit)) throw new Error("invalid Git commit");
  const status = await execFileAsync("git", ["--no-optional-locks", "-C", sourceRoot, "status", "--porcelain", "--untracked-files=no"], { windowsHide: true, timeout: 5000 });
  if (status.stdout.trim()) {
    const error = new Error("tracked files differ from HEAD");
    error.code = "SOURCE_DIRTY";
    throw error;
  }
  return commit.toLowerCase();
}

async function lockCheck(path, name) {
  try {
    await lstat(`${path}.lock`);
    return failure(name, "LOCK_PRESENT");
  } catch (error) {
    if (error.code === "ENOENT") return check(name, "LOCK_ABSENT", "No store lock is present.", null, true);
    return failure(name, "READ_ERROR");
  }
}

export function parseArgs(argv) {
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) return { help: true };
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!OPTIONS.has(flag) || Object.hasOwn(flags, flag)) throw new Error(USAGE);
    if (flag === "--json") flags[flag] = true;
    else {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error(USAGE);
      flags[flag] = value;
    }
  }
  if (REQUIRED.some((flag) => !flags[flag]) || !/^(0|[1-9]\d*)$/.test(flags["--generation"]) || !Number.isSafeInteger(Number(flags["--generation"]))) throw new Error(USAGE);
  return { flags };
}

export async function diagnose(flags) {
  const checks = [];
  const storeRoot = resolve(flags["--store-root"]);
  const runStorePath = resolve(flags["--run-store"]);
  const evidenceStorePath = resolve(flags["--evidence-store"]);
  let revision;
  try {
    revision = await sourceCommit(resolve(flags["--source-root"] ?? process.cwd()));
    checks.push(check("source", "SOURCE_CURRENT", "Current source commit resolved.", null, true));
  } catch (error) {
    checks.push(failure("source", error.code === "SOURCE_DIRTY" ? "SOURCE_DIRTY" : "SOURCE_UNAVAILABLE"));
  }

  let run;
  try {
    run = await DurableRunState.load({ storePath: runStorePath, storeRoot, runId: flags["--run-id"], generation: Number(flags["--generation"]) });
    checks.push(check("run", "RUN_VALID", "Run store is valid for the requested identity.", null, true));
  } catch (error) {
    checks.push(failure("run", classify(error, "RUN_MISSING", "RUN_INVALID")));
  }

  if (run && revision) {
    try {
      const status = await getEvidenceStatus({ runStorePath, evidenceStorePath, storeRoot, runId: flags["--run-id"], generation: Number(flags["--generation"]), currentSourceCommit: revision });
      // The status reader treats an absent store as unknown; the doctor requires it.
      await lstat(evidenceStorePath);
      const code = { pass: "EVIDENCE_CURRENT", stale: "EVIDENCE_STALE", fail: "EVIDENCE_FAILED", unknown: "EVIDENCE_UNKNOWN" }[status.status];
      checks.push(code === "EVIDENCE_CURRENT" ? check("evidence", code, "Current verification checks pass.", null, true) : failure("evidence", code));
    } catch (error) {
      checks.push(failure("evidence", classify(error, "EVIDENCE_MISSING", "EVIDENCE_INVALID")));
    }
  } else {
    checks.push(check("evidence", "EVIDENCE_NOT_CHECKED", "Run or source could not be checked.", "Resolve the run and source checks, then rerun the doctor."));
  }

  if (revision) {
    try {
      const matrix = await loadRuntimeMatrix(flags["--matrix"], { revision });
      if (matrix.results.some((result) => result.status === "failed")) checks.push(failure("matrix", "RUNTIME_FAILED"));
      else if (matrix.results.length === 0 || matrix.results.some((result) => result.status === "unknown")) checks.push(failure("matrix", "RUNTIME_UNKNOWN"));
      else if (matrix.results.some((result) => result.status === "unsupported")) checks.push(failure("matrix", "RUNTIME_UNSUPPORTED"));
      else checks.push(check("matrix", "MATRIX_CURRENT", "Runtime matrix is current and all probes pass.", null, true));
    } catch (error) {
      const code = error?.code === "REVISION_MISMATCH" ? "MATRIX_STALE" : classify(error, "MATRIX_MISSING", "MATRIX_INVALID");
      checks.push(failure("matrix", code === "READ_ERROR" && error instanceof SyntaxError ? "MATRIX_INVALID" : code));
    }
  } else checks.push(check("matrix", "MATRIX_NOT_CHECKED", "Source could not be checked.", "Resolve the source check, then rerun the doctor."));

  checks.push(await lockCheck(runStorePath, "run-lock"));
  checks.push(await lockCheck(evidenceStorePath, "evidence-lock"));
  return { ok: checks.every((entry) => entry.status === "pass"), sourceCommit: revision ?? null, checks };
}

export function formatReport(report) {
  return `${report.ok ? "Operations doctor: pass" : "Operations doctor: fail"}\n${report.checks.map((entry) => `${entry.status.toUpperCase()} ${entry.name} [${entry.code}]: ${entry.message}${entry.action ? ` Action: ${entry.action}` : ""}`).join("\n")}\n`;
}

export async function main(argv = process.argv.slice(2)) {
  let parsed;
  try { parsed = parseArgs(argv); }
  catch { process.stderr.write(`${USAGE}\n`); process.exitCode = 2; return; }
  if (parsed.help) { process.stdout.write(`${USAGE}\n`); return; }
  const report = await diagnose(parsed.flags);
  process.stdout.write(parsed.flags["--json"] ? `${JSON.stringify(report, null, 2)}\n` : formatReport(report));
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { process.stderr.write("READ_ERROR: operations doctor failed to read local state.\n"); process.exitCode = 1; });
}
