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

test("load accepts an append-compatible history through waiting, continuation, and failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-durable-history-valid-"));
  const storePath = join(root, "run.json");
  const options = { storePath, storeRoot: root, runId: "run-history", generation: 2 };
  try {
    const run = await DurableRunState.create(options);
    assert.equal((await DurableRunState.load(options)).state.revision, 0);
    for (const [type, payload] of [
      ["start", {}],
      ["checkpoint", { status: "waiting" }],
      ["continuation", { resumed: true }],
      ["checkpoint", { step: "retried" }],
      ["failed", { reason: "unavailable" }],
    ]) {
      await run.append({ eventId: `evt-${run.state.revision + 1}`, generation: 2, revision: run.state.revision + 1, type, payload });
      if (type === "start") {
        await assert.rejects(
          run.append({ eventId: "evt-second-start", generation: 2, revision: 2, type: "start", payload: {} }),
          (error) => error.code === "INVALID_EVENT",
        );
        assert.equal(run.state.revision, 1);
      }
    }
    const loaded = await DurableRunState.load(options);
    assert.equal(loaded.state.status, "failed");
    assert.deepEqual(loaded.state.events.map((event) => event.type), ["start", "checkpoint", "continuation", "checkpoint", "failed"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("load rejects on-disk histories that append could not produce", async (t) => {
  const cases = [
    ["duplicate eventId", (document) => { document.events[1].eventId = document.events[0].eventId; }],
    ["second start", (document) => { document.events[1].type = "start"; }],
    ["missing initial start", (document) => { document.events[0].type = "continuation"; }],
    ["event after completed", (document) => {
      document.events.push({ ...document.events[2], eventId: "evt-late", revision: 4, type: "continuation" });
      document.revision = 4;
      document.status = "running";
    }],
    ["event after failed", (document) => {
      document.events[2].type = "failed";
      document.events.push({ ...document.events[2], eventId: "evt-late", revision: 4, type: "checkpoint" });
      document.revision = 4;
      document.status = "running";
    }],
  ];
  for (const [name, corrupt] of cases) {
    await t.test(name, async () => {
      const root = await mkdtemp(join(tmpdir(), "oms-durable-history-invalid-"));
      const storePath = join(root, "run.json");
      const options = { storePath, storeRoot: root, runId: "run-history", generation: 2 };
      try {
        const run = await DurableRunState.create(options);
        for (const type of ["start", "checkpoint", "completed"]) {
          await run.append({ eventId: `evt-${run.state.revision + 1}`, generation: 2, revision: run.state.revision + 1, type, payload: {} });
        }
        const document = JSON.parse(await readFile(storePath, "utf8"));
        corrupt(document);
        await writeFile(storePath, `${JSON.stringify(document)}\n`);
        await assert.rejects(DurableRunState.load(options), (error) => error.code === "STORE_INVALID");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
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
