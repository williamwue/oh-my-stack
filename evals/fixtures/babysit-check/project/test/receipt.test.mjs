import assert from "node:assert/strict";
import test from "node:test";

import { renderReceipt } from "../lib/receipt.mjs";

test("renders the supplied note without changing its content", () => {
  assert.equal(renderReceipt("  fragile  "), "Note:   fragile  ");
});
