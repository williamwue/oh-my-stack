import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { collectInventory, normalizeClaudeProbe, normalizeCodexModels, normalizeOmpModels } from "../tools/collect-model-inventory.mjs";

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
const id = "claude-" + alias + "-5-5";
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
  await writeFile(binary, `#!/usr/bin/env node
console.log(JSON.stringify({ is_error: true, subtype: "error", modelUsage: {} }));
`, { mode: 0o755 });
  await assert.rejects(collectInventory({ runtime: "claude-code", claudeBin: binary,
    confirmClaudeProbes: true }), /haiku: Claude model probe did not complete successfully/);
});
