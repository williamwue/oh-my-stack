import assert from "node:assert/strict";
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
  assert.throws(() => normalizeClaudeProbe("sonnet", result("claude-opus-5-5")), /different family or fallback/);
  assert.throws(() => normalizeClaudeProbe("fable", result("claude-fable-1")), /only haiku, sonnet, and opus/);
  assert.throws(() => normalizeClaudeProbe("sonnet", result("claude-sonnet-6")), /no reviewed effort policy/);
});
