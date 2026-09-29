import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { DurableRunState } from "../tools/durable-run-state.mjs";

const event = (eventId, revision, generation = 1, payload = {}) => ({ eventId, generation, revision, type: revision === 1 ? "start" : "checkpoint", payload });

async function fixture(t, prefix = "oms-security-") {
  const storeRoot = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(storeRoot, { recursive: true, force: true }));
  const storePath = join(storeRoot, "run.json");
  const options = { storeRoot, storePath, runId: "run-1", generation: 1 };
  const run = await DurableRunState.create(options);
  await run.append(event("start", 1));
  return { ...options, run };
}

test("independently loaded writers preserve the first append and reject a stale revision", async (t) => {
  const options = await fixture(t);
  const first = await DurableRunState.load(options);
  const second = await DurableRunState.load(options);
  await first.append(event("first", 2));
  const before = second.state;
  await assert.rejects(second.append(event("second", 2)), (error) => error.code === "REVISION_CONFLICT");
  assert.deepEqual(second.state, before);
  assert.deepEqual((await DurableRunState.load(options)).state.events.map((item) => item.eventId), ["start", "first"]);
  assert.equal((await second.append(event("first", 2))).duplicate, true);
});

test("true concurrent subprocess writers cannot erase one another", async (t) => {
  const options = await fixture(t, "oms-security-process-");
  const script = `import { DurableRunState } from ${JSON.stringify(new URL("../tools/durable-run-state.mjs", import.meta.url).href)};
    import { writeFile, stat } from "node:fs/promises";
    const [root, id] = process.argv.slice(1);
    const options = {storeRoot:root, storePath:root + "/run.json", runId:"run-1", generation:1};
    const run = await DurableRunState.load(options);
    await writeFile(root + "/ready-" + id, "ready");
    while (!(await stat(root + "/go").then(() => true, () => false))) await new Promise(r => setTimeout(r, 10));
    try { await run.append({eventId:id, generation:1, revision:2, type:"checkpoint", payload:{}}); process.stdout.write("written"); }
    catch (error) { process.stdout.write(error.code); }`;
  const children = [];
  t.after(() => { for (const child of children) child.kill(); });
  const start = (id) => new Promise((resolve) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", script, options.storeRoot, id], { windowsHide: true });
    children.push(child);
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.on("error", (error) => resolve(`worker-error:${error.code || error.message}`));
    child.on("close", (code) => resolve(code === 0 ? output : `worker-error:exit-${code}`));
  });
  const writers = [start("writer-a"), start("writer-b")];
  const deadline = Date.now() + 5000;
  while (true) {
    const ready = await Promise.all(["writer-a", "writer-b"].map((id) => stat(join(options.storeRoot, `ready-${id}`)).then(() => true, () => false)));
    if (ready.every(Boolean)) break;
    if (Date.now() >= deadline) {
      for (const child of children) child.kill();
      assert.fail("writers did not reach barrier");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  await writeFile(join(options.storeRoot, "go"), "go");
  let timer;
  const outcomes = await Promise.race([
    Promise.all(writers),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("writers did not finish")), 5000); }),
  ]).finally(() => { clearTimeout(timer); for (const child of children) child.kill(); });
  assert.deepEqual(outcomes.sort(), ["REVISION_CONFLICT", "written"]);
  assert.equal((await DurableRunState.load(options)).state.revision, 2);
});

test("an existing lock fails closed without changing local or disk state", async (t) => {
  const options = await fixture(t);
  const before = await readFile(options.storePath, "utf8");
  const local = options.run.state;
  await writeFile(`${options.storePath}.lock`, "operator inspection required", { flag: "wx" });
  await assert.rejects(options.run.append(event("blocked", 2)), (error) => error.code === "STORE_LOCKED");
  assert.equal(await readFile(options.storePath, "utf8"), before);
  assert.deepEqual(options.run.state, local);
  assert.equal(await readFile(`${options.storePath}.lock`, "utf8"), "operator inspection required");
});

test("stale generation and revision plus secret fields never partially write", async (t) => {
  const options = await fixture(t);
  const before = await readFile(options.storePath, "utf8");
  for (const [candidate, code] of [
    [event("generation", 2, 2), "STALE_GENERATION"],
    [event("gap", 3), "REVISION_CONFLICT"],
    [event("secret", 2, 1, { credential: "do-not-save" }), "SECRET_DATA"],
  ]) {
    await assert.rejects(options.run.append(candidate), (error) => error.code === code);
    assert.equal(await readFile(options.storePath, "utf8"), before);
    assert.equal(options.run.state.revision, 1);
  }
  assert.equal((await options.run.append(event("valid-after-rejection", 2))).state.revision, 2);
  await assert.rejects(stat(`${options.storePath}.lock`), (error) => error.code === "ENOENT");
});

test("a valid on-disk generation replacement is rejected by a loaded writer", async (t) => {
  const options = await fixture(t);
  const local = options.run.state;
  const replacement = structuredClone(local);
  replacement.generation = 2;
  for (const item of replacement.events) item.generation = 2;
  await writeFile(options.storePath, `${JSON.stringify(replacement)}\n`);
  const before = await readFile(options.storePath, "utf8");
  await assert.rejects(options.run.append(event("old-generation", 2)), (error) => error.code === "STALE_GENERATION");
  assert.deepEqual(options.run.state, local);
  assert.equal(await readFile(options.storePath, "utf8"), before);
});

test("append rejects a parent replaced by an escaping junction after load", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "oms-security-junction-"));
  const outside = await mkdtemp(join(tmpdir(), "oms-security-outside-"));
  t.after(async () => { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); });
  const parent = join(root, "parent");
  const storePath = join(parent, "run.json");
  const run = await DurableRunState.create({ storePath, storeRoot: root, runId: "run-1", generation: 1 });
  await run.append(event("start", 1));
  await rename(parent, join(root, "retained"));
  try {
    await symlink(outside, parent, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (process.platform === "win32" && ["EACCES", "EPERM", "ENOTSUP", "UNKNOWN"].includes(error.code)) {
      t.skip(`junction creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(run.append(event("escape", 2)), (error) => error.code === "PATH_OUTSIDE_STORE");
  await assert.rejects(stat(join(outside, "run.json")), (error) => error.code === "ENOENT");
  assert.equal(run.state.revision, 1);
});
