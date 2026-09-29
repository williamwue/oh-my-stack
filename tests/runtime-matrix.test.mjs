import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  executeProbe,
  loadRuntimeMatrix,
  persistRuntimeMatrix,
  runRuntimeMatrix,
} from "../tools/runtime-matrix.mjs";

const nodeScript = "process.stdout.write(JSON.stringify({status:'passed', ok:true, fixture:process.env.OMS_FIXTURE}))";

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
  assert.equal(result.command.executable, process.execPath);
  assert.equal(result.command.args[0], "-e");
  assert.equal(result.platform.class, process.platform === "win32" ? "windows" : "posix");
  assert.match(result.stdout, /local/);
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
