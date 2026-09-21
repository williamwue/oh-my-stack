import assert from "node:assert/strict";
import test from "node:test";

import { renderReceipt } from "../lib/receipt.mjs";

test("preserves operator-authored note spacing", () => {
  assert.equal(renderReceipt("  fragile  "), "Note:   fragile  ");
});
