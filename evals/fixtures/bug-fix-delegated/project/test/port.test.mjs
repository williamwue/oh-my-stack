import assert from "node:assert/strict";
import test from "node:test";

import { isValidPort } from "../lib/port.mjs";

test("accepts the highest valid TCP port", () => {
  assert.equal(isValidPort(65535), true);
});

test("rejects the first value above the TCP port range", () => {
  assert.equal(isValidPort(65536), false);
});
