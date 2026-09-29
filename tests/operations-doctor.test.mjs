import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { DurableRunState } from "../tools/durable-run-state.mjs";
import { recordReceipt } from "../tools/run-evidence.mjs";
import { runRuntimeMatrix } from "../tools/runtime-matrix.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(repoRoot, "tools", "operations-doctor.mjs");

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function fixture(t) {
  const storeRoot = await mkdtemp(join(tmpdir(), "oms-doctor-"));
  t.after(() => rm(storeRoot, { recursive: true, force: true }));
  const sourceRoot = join(storeRoot, "source");
  await mkdir(sourceRoot);
  git(sourceRoot, "init", "--quiet");
  git(sourceRoot, "config", "core.autocrlf", "false");
  await writeFile(join(sourceRoot, "source.txt"), "original\n");
  git(sourceRoot, "add", "source.txt");
  git(sourceRoot, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--quiet", "-m", "fixture");
  const revision = git(sourceRoot, "rev-parse", "HEAD");
  const runStorePath = join(storeRoot, "run.json");
  const evidenceStorePath = join(storeRoot, "evidence.json");
  const matrixPath = join(storeRoot, "matrix.json");
  const run = await DurableRunState.create({ storePath: runStorePath, storeRoot, runId: "run-1", generation: 0 });
  await run.append({ eventId: "start", generation: 0, revision: 1, type: "start", payload: {} });
  await run.append({ eventId: "done", generation: 0, revision: 2, type: "completed", payload: {} });
  await recordReceipt({ runStorePath, evidenceStorePath, storeRoot, currentSourceCommit: revision,
    receipt: { receiptId: "verify-1", runId: "run-1", generation: 0, runRevision: 2, sourceCommit: revision,
      command: ["node", "--test"], result: { exitCode: 0 }, checks: [{ name: "unit", status: "pass" }] } });
  await runRuntimeMatrix({ revision, persistPath: matrixPath,
    probes: [{ id: "node", runtime: "node", platform: ["windows", "posix"], script: "process.stdout.write(JSON.stringify({status:'passed'}))" }] });
  const args = ["--store-root", storeRoot, "--run-store", runStorePath, "--evidence-store", evidenceStorePath,
    "--matrix", matrixPath, "--run-id", "run-1", "--generation", "0", "--source-root", sourceRoot];
  return { storeRoot, sourceRoot, revision, runStorePath, evidenceStorePath, matrixPath, args };
}

function invoke(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", cwd: repoRoot });
}

test("healthy local run, receipts, matrix and absent locks pass in human and JSON output", async (t) => {
  const { args, revision } = await fixture(t);
  const human = invoke(args);
  assert.equal(human.status, 0, human.stderr);
  assert.match(human.stdout, /Operations doctor: pass/);
  const json = invoke([...args, "--json"]);
  assert.equal(json.status, 0, json.stderr);
  const report = JSON.parse(json.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.sourceCommit, revision);
  assert.deepEqual(report.checks.map(({ status }) => status), Array(6).fill("pass"));
});

test("missing and malformed stores report fixed codes without echoing private content", async (t) => {
  const { args, runStorePath, evidenceStorePath } = await fixture(t);
  await rm(evidenceStorePath);
  let result = invoke([...args, "--json"]);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).checks.find(({ name }) => name === "evidence").code, "EVIDENCE_MISSING");
  await writeFile(evidenceStorePath, "private-api-key=do-not-echo{");
  result = invoke(args);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /EVIDENCE_INVALID/);
  assert.doesNotMatch(result.stdout + result.stderr, /do-not-echo/);
  await writeFile(runStorePath, "private-token=do-not-echo{");
  result = invoke([...args, "--json"]);
  assert.equal(JSON.parse(result.stdout).checks.find(({ name }) => name === "run").code, "RUN_INVALID");
  assert.doesNotMatch(result.stdout + result.stderr, /do-not-echo/);
  await rm(runStorePath);
  result = invoke([...args, "--json"]);
  assert.equal(JSON.parse(result.stdout).checks.find(({ name }) => name === "run").code, "RUN_MISSING");
});

test("stale receipts and matrix revisions fail with actionable codes", async (t) => {
  const { args, evidenceStorePath, matrixPath } = await fixture(t);
  const evidence = JSON.parse(await readFile(evidenceStorePath, "utf8"));
  evidence.events[1].payload.receipt.sourceCommit = "a".repeat(40);
  await writeFile(evidenceStorePath, `${JSON.stringify(evidence)}\n`);
  const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
  matrix.revision = "old-revision";
  matrix.results[0].revision = "old-revision";
  await writeFile(matrixPath, `${JSON.stringify(matrix)}\n`);
  const result = invoke([...args, "--json"]);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.checks.find(({ name }) => name === "evidence").code, "EVIDENCE_STALE");
  assert.equal(report.checks.find(({ name }) => name === "matrix").code, "MATRIX_STALE");
});

test("unknown and unsupported runtimes are explicit failures", async (t) => {
  const { args, matrixPath } = await fixture(t);
  const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
  matrix.results[0].status = "unknown";
  await writeFile(matrixPath, `${JSON.stringify(matrix)}\n`);
  assert.equal(JSON.parse(invoke([...args, "--json"]).stdout).checks.find(({ name }) => name === "matrix").code, "RUNTIME_UNKNOWN");
  matrix.results[0].status = "unsupported";
  await writeFile(matrixPath, `${JSON.stringify(matrix)}\n`);
  assert.equal(JSON.parse(invoke([...args, "--json"]).stdout).checks.find(({ name }) => name === "matrix").code, "RUNTIME_UNSUPPORTED");
});

test("tracked source changes fail closed while untracked artifacts do not", async (t) => {
  const { args, sourceRoot } = await fixture(t);
  await writeFile(join(sourceRoot, "acceptance-output.json"), "{}\n");
  assert.equal(invoke([...args, "--json"]).status, 0);
  await writeFile(join(sourceRoot, "source.txt"), "changed\n");
  const result = invoke([...args, "--json"]);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.checks.find(({ name }) => name === "source").code, "SOURCE_DIRTY");
  assert.equal(report.checks.find(({ name }) => name === "evidence").code, "EVIDENCE_NOT_CHECKED");
  assert.equal(report.checks.find(({ name }) => name === "matrix").code, "MATRIX_NOT_CHECKED");
});

test("failed runtime probe takes priority over unknown and unsupported probes", async (t) => {
  const { args, matrixPath } = await fixture(t);
  const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
  matrix.results = [
    { ...matrix.results[0], status: "unknown" },
    { ...matrix.results[0], status: "unsupported" },
    { ...matrix.results[0], status: "failed" },
  ];
  await writeFile(matrixPath, `${JSON.stringify(matrix)}\n`);
  const result = invoke([...args, "--json"]);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).checks.find(({ name }) => name === "matrix").code, "RUNTIME_FAILED");
});

test("malformed matrix and a present lock return stable codes without changing files", async (t) => {
  const { args, matrixPath, runStorePath } = await fixture(t);
  await writeFile(matrixPath, "private-token=do-not-echo{");
  const lockPath = `${runStorePath}.lock`;
  await writeFile(lockPath, "writer metadata");
  const result = invoke([...args, "--json"]);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.checks.find(({ name }) => name === "matrix").code, "MATRIX_INVALID");
  assert.equal(report.checks.find(({ name }) => name === "run-lock").code, "LOCK_PRESENT");
  assert.equal(await readFile(lockPath, "utf8"), "writer metadata");
  assert.doesNotMatch(result.stdout + result.stderr, /do-not-echo|writer metadata/);
});

test("help is read only and bad invocation exits with usage", () => {
  const help = invoke(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--source-root DIR/);
  const bad = invoke(["--run-store", "private-token-do-not-echo"]);
  assert.equal(bad.status, 2);
  assert.doesNotMatch(bad.stderr, /do-not-echo/);
});
