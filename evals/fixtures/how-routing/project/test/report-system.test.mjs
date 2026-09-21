import assert from "node:assert/strict";
import test from "node:test";

import { createReportSystem } from "../lib/index.mjs";

test("a submitted report is rendered and stored when the worker runs", () => {
  const system = createReportSystem();
  const id = system.submit({ title: " Weekly ", lines: ["ready", "ship"] });
  assert.equal(system.read(id), null);
  assert.equal(system.processNext(), id);
  assert.deepEqual(system.read(id), { id, content: "Weekly\nready\nship\n" });
  assert.equal(system.processNext(), null);
});
