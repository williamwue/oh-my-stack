import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  executeProbe,
  loadRuntimeMatrix,
  persistRuntimeMatrix,
  runRuntimeMatrix,
} from "../tools/runtime-matrix.mjs";

const nodeScript = "process.stdout.write(JSON.stringify({status:'passed', ok:true, fixture:process.env.OMS_FIXTURE}))";
const execFileAsync = promisify(execFile);
const defaultNodeExecutable = process.versions.bun ? "node" : process.execPath;

test("positive Node probe records command, runtime, platform, and pass", async () => {
  const result = await executeProbe({
    id: "node-positive",
    runtime: "node",
    platform: ["windows", "posix"],
    script: nodeScript,
  }, { env: { OMS_FIXTURE: "local" } });
  assert.equal(result.status, "passed");
  assert.equal(result.result, "pass");
  assert.equal(result.runtime.name, "node");
  assert.match(result.runtime.version, /^v?\d/);
  assert.equal(result.command.executable, defaultNodeExecutable);
  assert.equal(result.command.args[0], "-e");
  assert.equal(result.platform.class, process.platform === "win32" ? "windows" : "posix");
  assert.match(result.stdout, /local/);
});

test("Bun host selects Node for a Node probe while honoring an explicit override", async (t) => {
  const bun = process.env.OMS_BUN_BINARY || "bun";
  try {
    await execFileAsync(bun, ["--version"], { timeout: 5000 });
  } catch (error) {
    if (error.code === "ENOENT") return t.skip("Bun is unavailable");
    throw error;
  }
  const probe = {
    id: "node-from-bun", runtime: "node", platform: ["windows", "posix"],
    script: "process.stdout.write(JSON.stringify({status:'passed', hostIsBun:Boolean(process.versions.bun)}))",
  };
  const moduleUrl = new URL("../tools/runtime-matrix.mjs", import.meta.url).href;
  const script = `import { executeProbe } from ${JSON.stringify(moduleUrl)};
    const probe = ${JSON.stringify(probe)};
    const selected = await executeProbe(probe);
    const overridden = await executeProbe(probe, { runtimes: { node: process.execPath } });
    process.stdout.write(JSON.stringify({ hostIsBun: Boolean(process.versions.bun), hostExecutable: process.execPath, selected, overridden }));`;
  const { stdout } = await execFileAsync(bun, ["-e", script], { timeout: 15000 });
  const observed = JSON.parse(stdout);
  assert.equal(observed.hostIsBun, true);
  assert.equal(observed.selected.status, "passed");
  assert.equal(observed.selected.command.executable, "node");
  assert.equal(observed.selected.payload.hostIsBun, false);
  assert.equal(observed.overridden.status, "passed");
  assert.equal(observed.overridden.command.executable, observed.hostExecutable);
  assert.equal(observed.overridden.payload.hostIsBun, true);
});

test("an unavailable runtime stays unknown or unsupported according to declaration", async () => {
  const missingRuntime = join(tmpdir(), "runtime-matrix-no-bun");
  const unknown = await executeProbe({
    id: "missing-bun-unknown",
    runtime: "bun",
    platform: ["windows", "posix"],
    script: nodeScript,
  }, { runtimes: { bun: missingRuntime } });
  assert.equal(unknown.status, "unknown");
  assert.equal(unknown.reason, "runtime-unavailable");
  assert.equal(unknown.command.args[0], "-e");

  const unsupported = await executeProbe({
    id: "missing-bun-unsupported",
    runtime: "bun",
    platform: ["windows", "posix"],
    unavailableStatus: "unsupported",
    script: nodeScript,
  }, { runtimes: { bun: missingRuntime } });
  assert.equal(unsupported.status, "unsupported");
  assert.notEqual(unsupported.status, "passed");
});

test("malformed probe output is a failed result", async () => {
  const result = await executeProbe({
    id: "malformed-output",
    runtime: "node",
    platform: ["windows", "posix"],
    script: "process.stdout.write('not-json')",
  });
  assert.equal(result.status, "failed");
  assert.equal(result.reason, "malformed-probe-result");
  assert.equal(result.result, "fail");
});

test("a hanging command is terminated and recorded as a timeout", async () => {
  const started = Date.now();
  const result = await executeProbe({
    id: "hanging-command", runtime: "node", platform: ["windows", "posix"],
    script: "setInterval(() => {}, 1000)",
  }, { timeoutMs: 250 });
  assert.equal(result.status, "failed");
  assert.equal(result.reason, "command-timeout");
  assert(Date.now() - started < 4000);
});

test("excess output is truncated, terminated, and failed", async () => {
  const result = await executeProbe({
    id: "output-overload", runtime: "node", platform: ["windows", "posix"],
    script: "setInterval(() => process.stdout.write('x'.repeat(8192)), 1)",
  }, { timeoutMs: 3000, maxOutputBytes: 1024 });
  assert.equal(result.status, "failed");
  assert.equal(result.reason, "command-output-limit");
  assert(Buffer.byteLength(result.stdout) <= 1024);
});

test("a probe cannot overwrite observed execution metadata", async () => {
  const forged = {
    status: "passed", ok: true, fixture: "payload-detail",
    command: { executable: "forged", args: [] },
    runtime: { name: "forged" },
    platform: { class: "forged" },
    stdout: "forged", stderr: "forged", exitCode: 99,
  };
  const result = await executeProbe({
    id: "forged-metadata",
    runtime: "node",
    platform: ["windows", "posix"],
    script: `process.stdout.write(${JSON.stringify(JSON.stringify(forged))})`,
  });
  assert.equal(result.status, "passed");
  assert.equal(result.result, "pass");
  assert.equal(result.ok, true);
  assert.equal(result.command.executable, defaultNodeExecutable);
  assert.deepEqual(result.command.args.slice(0, 1), ["-e"]);
  assert.equal(result.runtime.name, "node");
  assert.equal(result.platform.class, process.platform === "win32" ? "windows" : "posix");
  assert.equal(result.stdout, JSON.stringify(forged));
  assert.equal(result.stderr, "");
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.payload, forged);
});

test("successful probes without a JSON payload are failed as malformed", async () => {
  const cases = [
    ["empty-output", "process.exit(0)", "", ""],
    ["stderr-only-output", "process.stderr.write('diagnostic')", "", "diagnostic"],
    ["whitespace-only-output", "process.stdout.write(' \\n\\t')", " \n\t", ""],
    ["null-output", "process.stdout.write('null')", "null", ""],
  ];
  for (const [id, script, stdout, stderr] of cases) {
    const result = await executeProbe({
      id,
      runtime: "node",
      platform: ["windows", "posix"],
      script,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, stdout);
    assert.equal(result.stderr, stderr);
    assert.equal(result.status, "failed");
    assert.equal(result.result, "fail");
    assert.equal(result.reason, "malformed-probe-result");
  }
});

test("persisted results remain bound to their source revision", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-runtime-matrix-"));
  try {
    const path = join(root, "result.json");
    const document = await runRuntimeMatrix({
      revision: "revision-a",
      persistPath: path,
      probes: [{ id: "node-revision", runtime: "node", platform: ["windows", "posix"], script: nodeScript }],
    });
    assert.equal(document.revision, "revision-a");
    assert.equal(document.results[0].revision, "revision-a");
    assert.equal((await loadRuntimeMatrix(path, { revision: "revision-a" })).revision, "revision-a");
    await assert.rejects(loadRuntimeMatrix(path, { revision: "revision-b" }), (error) => error.code === "REVISION_MISMATCH");
    await assert.rejects(persistRuntimeMatrix(path, { ...document, revision: "revision-b",
      results: document.results.map((entry) => ({ ...entry, revision: "revision-b" })) }),
    (error) => error.code === "REVISION_MISMATCH");
    const fixture = join(root, "fixture.txt");
    await writeFile(fixture, "disposable");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("persistence rejects results without an executable and argument list", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-runtime-matrix-command-"));
  try {
    const document = await runRuntimeMatrix({
      revision: "revision-command-metadata",
      probes: [{ id: "node-command-metadata", runtime: "node", platform: ["windows", "posix"], script: nodeScript }],
    });
    const invalidCommands = [
      null,
      { args: [] },
      { executable: "", args: [] },
      { executable: " ", args: [] },
      { executable: process.execPath },
      { executable: process.execPath, args: null },
      { executable: process.execPath, args: [null] },
    ];
    for (const [index, command] of invalidCommands.entries()) {
      const path = join(root, `result-${index}.json`);
      const malformed = {
        ...document,
        results: document.results.map((result) => ({ ...result, command })),
      };
      await assert.rejects(persistRuntimeMatrix(path, malformed), (error) => error.code === "MALFORMED_PROBE_RESULT");
      await writeFile(path, JSON.stringify(malformed));
      await assert.rejects(loadRuntimeMatrix(path), (error) => error.code === "MALFORMED_PROBE_RESULT");
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
