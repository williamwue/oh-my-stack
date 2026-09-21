import assert from "node:assert/strict";
import test from "node:test";

import { greet } from "../lib/greeting.mjs";

test("greets a name", () => {
  assert.equal(greet("Ada"), "Hello, Ada!");
});
