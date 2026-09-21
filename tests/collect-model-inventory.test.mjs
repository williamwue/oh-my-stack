import assert from "node:assert/strict";
import test from "node:test";

import { collectInventory, normalizeCodexModels, normalizeOmpModels } from "../tools/collect-model-inventory.mjs";

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

test("inventory normalization rejects duplicates and unverified Claude collection", async () => {
  assert.throws(
    () => normalizeOmpModels({ models: [
      { selector: "provider/repeated", thinking: ["low"] },
      { selector: "provider/repeated", thinking: ["low"] },
    ] }),
    /repeats model/,
  );
  await assert.rejects(
    collectInventory({ runtime: "claude-code", now: new Date("2026-09-21T00:00:00.000Z") }),
    /not verified; stop before writing configuration/,
  );
});
