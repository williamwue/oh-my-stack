import assert from "node:assert/strict";
import test from "node:test";

import { greet } from "../lib/greeting.mjs";

test("greets a normalized name", () => {
  assert.equal(greet(" Ada "), "Hello, Ada!");
});

test("rejects a missing name", () => {
  assert.throws(() => greet("   "), /name is required/);
});
