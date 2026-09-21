import assert from "node:assert/strict";
import test from "node:test";

import { createReceipt } from "../lib/index.mjs";

test("renders a trimmed optional customer note across the normalization boundary", () => {
  assert.equal(
    createReceipt({ customer: " Ada ", note: " Leave at reception ", items: ["book"] }),
    "Customer: Ada\nNote: Leave at reception\nItems: book",
  );
});

test("omits missing and whitespace-only notes while preserving existing output", () => {
  assert.equal(
    createReceipt({ customer: "Ada", items: ["book", "pen"] }),
    "Customer: Ada\nItems: book, pen",
  );
  assert.equal(
    createReceipt({ customer: "Ada", note: "   ", items: [] }),
    "Customer: Ada\nItems: ",
  );
});
