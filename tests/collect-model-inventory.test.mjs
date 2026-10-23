import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { collectInventory, normalizeClaudeProbe, normalizeCodexModels, normalizeOmpModels } from "../tools/collect-model-inventory.mjs";

const fixtureLimits = { timeoutMs: 2000, terminateGraceMs: 40, exitWaitMs: 500, postExitDrainMs: 50 };

function alive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === "ESRCH") return false; throw error; }
}

async function collectorFixture(t, body) {
  const root = await mkdtemp(join(tmpdir(), "oms-inventory-child-"));
  const pidFile = join(root, "pid");
  const descendantPidFile = `${pidFile}-descendant`;
  const termFile = join(root, "terminated");
  const binary = join(root, "fixture.mjs");
  await writeFile(binary, `#!${process.execPath}
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
process.on("SIGTERM", () => writeFileSync(${JSON.stringify(termFile)}, "SIGTERM"));
writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));
setInterval(() => {}, 1000);
const reply = (id, result) => process.stdout.write(JSON.stringify({ id, result }) + "\\n");
const inheritPipes = () => {
  const descendant = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: ["ignore", 1, 2] });
  writeFileSync(${JSON.stringify(descendantPidFile)}, String(descendant.pid));
};
${body}
`, { mode: 0o755 });
  t.after(async () => {
    for (const path of [pidFile, descendantPidFile]) {
      try {
        const pid = Number(await readFile(path, "utf8"));
        if (alive(pid)) process.kill(pid, "SIGKILL");
      } catch (error) { if (error.code !== "ENOENT" && error.code !== "ESRCH") throw error; }
    }
    await rm(root, { recursive: true, force: true });
  });
  return { binary, pidFile, termFile, descendantPidFile, root };
}

async function collectOutcome(fixture, runtime, limits = {}) {
  const collection = collectInventory({ runtime, ompBin: fixture.binary, codexBin: fixture.binary,
    limits: { ...fixtureLimits, ...limits } });
  let watchdog;
  const outcome = await Promise.race([
    collection.then(inventory => ({ inventory }), error => ({ error })),
    new Promise(resolve => { watchdog = setTimeout(() => resolve({ stalled: true }), 4000); }),
  ]);
  clearTimeout(watchdog);
  const pid = Number(await readFile(fixture.pidFile, "utf8"));
  const childAlive = alive(pid);
  if (childAlive) process.kill(pid, "SIGKILL");
  if (outcome.stalled) {
    try { process.kill(Number(await readFile(fixture.descendantPidFile, "utf8")), "SIGKILL"); }
    catch (error) { if (error.code !== "ENOENT" && error.code !== "ESRCH") throw error; }
  }
  await collection.catch(() => {});
  return { ...outcome, childAlive };
}

function assertFailure(outcome, diagnostic) {
  assert.equal(outcome.stalled, undefined, "inventory promise must settle before the watchdog");
  assert.match(outcome.error?.message ?? "", diagnostic);
  assert.equal(outcome.inventory, undefined, "incomplete input must not emit a final inventory");
  assert.equal(outcome.childAlive, false, "inventory must await observed direct-child exit");
}

for (const runtime of ["omp", "codex"]) {
  test(`${runtime} timeout kills a SIGTERM-resistant child before rejecting`, async (t) => {
    const fixture = await collectorFixture(t, "process.stdin.resume();");
    const outcome = await collectOutcome(fixture, runtime);
    assertFailure(outcome, /timed out/);
    assert.equal(await readFile(fixture.termFile, "utf8"), "SIGTERM");
  });

  for (const stream of ["stdout", "stderr"]) {
    test(`${runtime} rejects ${stream} flooding and awaits resistant child exit`, async (t) => {
      const fixture = await collectorFixture(t, `process.stdin.resume();
setInterval(() => process.${stream}.write("x".repeat(4096)), 10);`);
      const outcome = await collectOutcome(fixture, runtime, { [`${stream}LimitBytes`]: 1024 });
      assertFailure(outcome, new RegExp(`${stream}.*limit`));
    });
  }
}

const codexRequests = body => `const lines = createInterface({ input: process.stdin });
let page = 0;
lines.on("line", line => {
  const request = JSON.parse(line);
  if (request.method !== "model/list") return;
  page += 1;
  ${body}
});`;

test("Codex rejects a repeated pagination cursor before returning partial models", async (t) => {
  const fixture = await collectorFixture(t, codexRequests(`reply(request.id, {
    data: [{ model: "model-" + page }], nextCursor: ["a", "b", "a", null][page - 1]
  });`) + '\nprocess.stdin.on("end", () => process.exit(0));');
  assertFailure(await collectOutcome(fixture, "codex"), /repeated.*cursor/);
});

test("Codex bounds model/list pages even when every cursor is different", async (t) => {
  const fixture = await collectorFixture(t, codexRequests(`reply(request.id, {
    data: [{ model: "model-" + page }], nextCursor: page < 5 ? "cursor-" + page : null
  });`) + '\nprocess.stdin.on("end", () => process.exit(0));');
  assertFailure(await collectOutcome(fixture, "codex", { maxPages: 3 }), /page.*limit/);
});

for (const runtime of ["omp", "codex"]) {
  test(`${runtime} bounds the number of collected models`, async (t) => {
    const body = runtime === "omp"
      ? 'console.log(JSON.stringify({ models: [1, 2, 3].map(n => ({ selector: "provider/" + n })) })); process.exit(0);'
      : codexRequests('reply(request.id, { data: [1, 2, 3].map(n => ({ model: "model-" + n })) });')
        + '\nprocess.stdin.on("end", () => process.exit(0));';
    const fixture = await collectorFixture(t, body);
    assertFailure(await collectOutcome(fixture, runtime, { maxModels: 2 }), /model.*limit/);
  });
}

test("Codex bounds requests generated from a large pagination cursor", async (t) => {
  const fixture = await collectorFixture(t, codexRequests(`reply(request.id, {
    data: [{ model: "model-" + page }], nextCursor: page === 1 ? "x".repeat(2048) : null
  });`) + '\nprocess.stdin.on("end", () => process.exit(0));');
  assertFailure(await collectOutcome(fixture, "codex", { requestLimitBytes: 1024 }), /request.*limit/);
});

test("Codex bounds cumulative request bytes across otherwise valid pages", async (t) => {
  const fixture = await collectorFixture(t, codexRequests(`reply(request.id, {
    data: [{ model: "model-" + page }], nextCursor: page < 8 ? "x".repeat(80) + page : null
  });`) + '\nprocess.stdin.on("end", () => process.exit(0));');
  assertFailure(await collectOutcome(fixture, "codex", { requestLimitBytes: 512 }), /request.*limit/);
});

test("Codex protocol errors retain the primary diagnostic through forced termination", async (t) => {
  const fixture = await collectorFixture(t, codexRequests(`process.stdout.write(JSON.stringify({
    id: request.id, error: { message: "fixture model listing refused" }
  }) + "\\n");`));
  assertFailure(await collectOutcome(fixture, "codex"), /model\/list failed: fixture model listing refused/);
});

test("Codex rejects a truncated response after receiving a partial inventory", async (t) => {
  const fixture = await collectorFixture(t, codexRequests(`if (page === 2) {
    process.stdout.write('{"id":3,"result":'); process.exit(0);
  }
  reply(request.id, {
    data: [{ model: "first" }], nextCursor: "next"
  });`));
  assertFailure(await collectOutcome(fixture, "codex"), /before model\/list completed|incomplete|invalid.*JSON/);
});

test("Codex preserves inventory shape across complete model/list pages", async (t) => {
  const fixture = await collectorFixture(t, codexRequests(`reply(request.id, {
    data: [{ model: "model-" + page, supportedReasoningEfforts: [{ reasoningEffort: "high" }] }],
    nextCursor: page === 1 ? "second" : null
  });`) + '\nprocess.stdin.on("end", () => process.exit(0));');
  const outcome = await collectOutcome(fixture, "codex", { maxPages: 2, maxModels: 2 });
  assert.equal(outcome.childAlive, false);
  assert.equal(outcome.error, undefined);
  assert.equal(outcome.inventory.schemaVersion, 1);
  assert.equal(outcome.inventory.runtime, "codex");
  assert.deepEqual(outcome.inventory.models, [1, 2].map(n => ({ id: "model-" + n, reasoningEfforts: ["high"] })));
});

for (const runtime of ["omp", "codex"]) {
  test(`${runtime} bounds pipe draining after the direct child exits`, async (t) => {
    const body = runtime === "omp"
      ? 'inheritPipes(); console.log(JSON.stringify({ models: [{ selector: "provider/first" }] })); process.exit(0);'
      : codexRequests('reply(request.id, { data: [{ model: "first" }] });')
        + '\nprocess.stdin.on("end", () => { inheritPipes(); process.exit(0); });';
    const fixture = await collectorFixture(t, body);
    assertFailure(await collectOutcome(fixture, runtime), /stdio did not close/);
  });
}

test("Codex rejects a missing page payload after collecting earlier models", async (t) => {
  const fixture = await collectorFixture(t, codexRequests(`reply(request.id,
    page === 1 ? { data: [{ model: "first" }], nextCursor: "next" } : {}
  );`) + '\nprocess.stdin.on("end", () => process.exit(0));');
  assertFailure(await collectOutcome(fixture, "codex"), /must contain a data array/);
});

test("inventory CLI emits no output and preserves the destination when Codex input fails", async (t) => {
  const fixture = await collectorFixture(t, codexRequests(`process.stdout.write(JSON.stringify({
    id: request.id, error: { message: "fixture listing unavailable" }
  }) + "\\n");`));
  const destination = join(fixture.root, "inventory.json");
  await writeFile(destination, "previous inventory\n");
  const cli = fileURLToPath(new URL("../tools/collect-model-inventory.mjs", import.meta.url));
  await assert.rejects(promisify(execFile)(process.execPath,
    [cli, "--runtime", "codex", "--codex-bin", fixture.binary, "--output", destination], { timeout: 8000 }), error => {
    assert.equal(error.code, 1);
    assert.equal(error.stdout, "");
    assert.match(error.stderr, /fixture listing unavailable/);
    return true;
  });
  assert.equal(alive(Number(await readFile(fixture.pidFile, "utf8"))), false);
  assert.equal(await readFile(destination, "utf8"), "previous inventory\n");
});

test("OMP model output normalizes provider-qualified selectors and reported efforts", () => {
  const models = normalizeOmpModels({
    models: [
      { selector: "provider/fast", thinking: ["low", "medium"] },
      { selector: "provider/plain", thinking: null },
    ],
  });
  assert.deepEqual(models, [
    { id: "provider/fast", reasoningEfforts: ["low", "medium"] },
    { id: "provider/plain", reasoningEfforts: [] },
  ]);
});

test("Codex model/list normalizes model ids and supported reasoning efforts", () => {
  const models = normalizeCodexModels([
    {
      id: "catalog-row",
      model: "gpt-example",
      supportedReasoningEfforts: [
        { reasoningEffort: "low" },
        { reasoningEffort: "high" },
      ],
    },
  ]);
  assert.deepEqual(models, [{ id: "gpt-example", reasoningEfforts: ["low", "high"] }]);
});

test("inventory normalization rejects duplicates and Claude probes require consent", async () => {
  assert.throws(
    () => normalizeOmpModels({ models: [
      { selector: "provider/repeated", thinking: ["low"] },
      { selector: "provider/repeated", thinking: ["low"] },
    ] }),
    /repeats model/,
  );
  await assert.rejects(
    collectInventory({ runtime: "claude-code", now: new Date("2026-09-21T00:00:00.000Z") }),
    /pass --confirm-claude-probes/,
  );
});

test("Claude probe accepts only observed family and reviewed effort policy", () => {
  const result = (id) => ({ is_error: false, subtype: "success", modelUsage: { [id]: { canonicalModel: id } } });
  assert.deepEqual(normalizeClaudeProbe("opus", result("claude-opus-5-5")),
    { id: "claude-opus-5-5", reasoningEfforts: ["low", "medium", "high", "xhigh", "max"] });
  assert.deepEqual(normalizeClaudeProbe("haiku", result("claude-haiku-4-5")),
    { id: "claude-haiku-4-5", reasoningEfforts: ["none"] });
  assert.deepEqual(normalizeClaudeProbe("haiku", result("claude-haiku-4-5-20251001")),
    { id: "claude-haiku-4-5-20251001", reasoningEfforts: ["none"] });
  for (const alias of ["opus", "sonnet", "haiku"]) {
    const id = `claude-${alias}-5-5`;
    assert.deepEqual(normalizeClaudeProbe(alias, result(id)),
      { id, reasoningEfforts: ["low", "medium", "high", "xhigh", "max"] });
  }
  assert.deepEqual(normalizeClaudeProbe("sonnet", result("claude-sonnet-4-6")),
    { id: "claude-sonnet-4-6", reasoningEfforts: ["low", "medium", "high", "max"] });
  assert.throws(() => normalizeClaudeProbe("sonnet", result("claude-opus-5-5")), /different family or fallback/);
  assert.throws(() => normalizeClaudeProbe("fable", result("claude-fable-1")), /only haiku, sonnet, and opus/);
  assert.throws(() => normalizeClaudeProbe("sonnet", result("claude-sonnet-6")), /no reviewed effort policy/);
  assert.throws(() => normalizeClaudeProbe("haiku", result("claude-haiku-6")), /no reviewed effort policy/);
});

test("Claude default probes all three families with consent and honors explicit subsets", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "oms-claude-probes-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const log = join(root, "calls.jsonl");
  const binary = join(root, "claude-fixture.mjs");
  await writeFile(binary, `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + "\\n");
const alias = args[args.indexOf("--model") + 1];
const id = alias.startsWith("claude-") ? alias : "claude-" + alias + "-5-5";
console.log(JSON.stringify({ is_error: false, subtype: "success", modelUsage: { [id]: { canonicalModel: id } } }));
`, { mode: 0o755 });
  await assert.rejects(collectInventory({ runtime: "claude-code", claudeBin: binary }), /consume account usage/);
  await assert.rejects(readFile(log));
  const inventory = await collectInventory({ runtime: "claude-code", claudeBin: binary, confirmClaudeProbes: true });
  assert.deepEqual(inventory.models.map((model) => model.id),
    ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"]);
  const calls = (await readFile(log, "utf8")).trim().split("\n").map(JSON.parse);
  assert.equal(calls.length, 3);
  for (const args of calls) {
    assert.equal(args[args.indexOf("--max-turns") + 1], "1");
    assert.equal(args[args.indexOf("--permission-mode") + 1], "plan");
    assert.ok(args.includes("--restricted"));
  }
  const subset = await collectInventory({ runtime: "claude-code", claudeBin: binary,
    claudeModels: ["sonnet", "opus"], confirmClaudeProbes: true });
  assert.deepEqual(subset.models.map((model) => model.id), ["claude-sonnet-5-5", "claude-opus-5-5"]);
  assert.equal((await readFile(log, "utf8")).trim().split("\n").length, 5);
  const pinned = await collectInventory({ runtime: "claude-code", claudeBin: binary,
    claudeModels: ["haiku=claude-haiku-5-5"], confirmClaudeProbes: true });
  assert.equal(pinned.models[0].id, "claude-haiku-5-5");
  assert.match(pinned.source, /haiku=claude-haiku-5-5/);
  const pinnedCall = JSON.parse((await readFile(log, "utf8")).trim().split("\n").at(-1));
  assert.equal(pinnedCall[pinnedCall.indexOf("--model") + 1], "claude-haiku-5-5");
  for (const pin of ["haiku=claude-sonnet-5-5", "haiku=claude-haiku-6", "haiku=", "haiku=a=b", "fable=claude-fable-5"]) {
    await assert.rejects(collectInventory({ runtime: "claude-code", claudeBin: binary,
      claudeModels: [pin], confirmClaudeProbes: true }));
  }
  await assert.rejects(collectInventory({ runtime: "claude-code", claudeBin: binary,
    claudeModels: ["haiku", "haiku=claude-haiku-5-5"], confirmClaudeProbes: true }), /must be unique/);
  assert.equal((await readFile(log, "utf8")).trim().split("\n").length, 6);
  await writeFile(binary, `#!/usr/bin/env node
console.log(JSON.stringify({ is_error: false, subtype: "success", modelUsage: { "claude-haiku-4-5": {} } }));
`, { mode: 0o755 });
  await assert.rejects(collectInventory({ runtime: "claude-code", claudeBin: binary,
    claudeModels: ["haiku=claude-haiku-5-5"], confirmClaudeProbes: true }), /refusing fallback/);
  await writeFile(binary, `#!/usr/bin/env node
console.log(JSON.stringify({ is_error: true, subtype: "error", modelUsage: {} }));
`, { mode: 0o755 });
  await assert.rejects(collectInventory({ runtime: "claude-code", claudeBin: binary,
    confirmClaudeProbes: true }), /haiku: Claude model probe did not complete successfully/);
});
