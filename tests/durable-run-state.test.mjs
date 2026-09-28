import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { DurableRunState } from "../tools/durable-run-state.mjs";

const execFileAsync = promisify(execFile);
const worker = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "durable-run-worker.mjs");

async function runWorker(action, root, ...args) {
  const result = await execFileAsync(process.execPath, [worker, action, root, ...args], { encoding: "utf8" });
  return JSON.parse(result.stdout);
}

test("durable state survives a process boundary and recovers a completed run", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-durable-completed-"));
  try {
    const written = await runWorker("write-completed", root);
    assert.equal(written.status, "completed");
    assert.equal(written.revision, 3);
    const recovered = await runWorker("recover", root, "2");
    assert.equal(recovered.status, "completed");
    assert.equal(recovered.revision, 3);
    assert.deepEqual(recovered.events.map((event) => event.type), ["start", "checkpoint", "completed"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a waiting checkpoint can be continued by a fresh process", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-durable-waiting-"));
  try {
    const waiting = await runWorker("write-waiting", root);
    assert.equal(waiting.status, "waiting");
    const continued = await runWorker("continue", root, "2");
    assert.equal(continued.status, "running");
    assert.equal(continued.revision, 3);
    assert.equal(continued.events.at(-1).type, "continuation");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("identical event appends are idempotent while conflicting IDs are rejected", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-durable-idempotency-"));
  try {
    const result = await runWorker("duplicate", root);
    assert.equal(result.duplicate, true);
    assert.equal(result.state.revision, 1);
    assert.equal(result.state.events.length, 1);
    const conflict = await runWorker("conflict", root);
    assert.equal(conflict.code, "EVENT_CONFLICT");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("stale generations, malformed stores, and paths outside the store fail closed", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-durable-invalid-"));
  try {
    await runWorker("write-waiting", root);
    const stale = await runWorker("stale-generation", root);
    assert.equal(stale.code, "STALE_GENERATION");

    const outsidePath = join(root, "outside.json");
    await writeFile(outsidePath, "{\"not\":\"a run\"}\n");
    const malformedPath = join(root, "malformed.json");
    await writeFile(malformedPath, "{\"schemaVersion\":1");
    const malformed = await runWorker("load-malformed", root);
    assert.equal(malformed.code, "STORE_INVALID");

    const pathRejected = await runWorker("path-outside", root);
    assert.equal(pathRejected.code, "PATH_OUTSIDE_STORE");
    assert.equal(await readFile(outsidePath, "utf8"), "{\"not\":\"a run\"}\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("store paths are bounded by the explicit store root", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-durable-boundary-"));
  try {
    await assert.rejects(
      DurableRunState.create({
        storeRoot: root,
        storePath: join(root, "..", "escape.json"),
        runId: "run-boundary",
        generation: 1,
      }),
      (error) => error.code === "PATH_OUTSIDE_STORE",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("store paths reject symlinked or junction parents that escape the store root", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "oms-durable-link-root-"));
  const outside = await mkdtemp(join(tmpdir(), "oms-durable-link-outside-"));
  const link = join(root, "link");
  try {
    try {
      await symlink(outside, link, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if (process.platform === "win32" && ["EACCES", "EPERM", "ENOTSUP", "UNKNOWN"].includes(error.code)) {
        t.skip(`symlink or junction creation unavailable: ${error.code}`);
        return;
      }
      throw error;
    }

    const storePath = join(link, "run.json");
    await assert.rejects(
      DurableRunState.create({ storeRoot: root, storePath, runId: "run-link", generation: 1 }),
      (error) => error.code === "PATH_OUTSIDE_STORE",
    );
    await assert.rejects(
      DurableRunState.load({ storeRoot: root, storePath, runId: "run-link", generation: 1 }),
      (error) => error.code === "PATH_OUTSIDE_STORE",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
