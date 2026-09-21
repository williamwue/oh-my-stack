import assert from "node:assert/strict";
import test from "node:test";

import { displayLabel, labelKey } from "../lib/labels.mjs";

test("display preserves operator-authored spacing", () => {
  assert.equal(displayLabel("  Fragile Label  "), "  Fragile Label  ");
});

test("labelKey creates lowercase hyphenated keys", () => {
  assert.equal(labelKey("  Fragile Label  "), "fragile-label");
});
