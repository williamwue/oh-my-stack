import assert from "node:assert/strict";
import test from "node:test";

import { createReportSystem } from "../evals/fixtures/how-routing/project/lib/index.mjs";

test("how-routing fixture proves the documented end-to-end flow", async () => {
  const system = createReportSystem();
  const id = system.submit({ title: " Weekly ", lines: ["ready", "ship"] });
  assert.equal(system.read(id), null);
  assert.equal(system.processNext(), id);
  assert.deepEqual(system.read(id), { id, content: "Weekly\nready\nship\n" });
  assert.equal(system.processNext(), null);
});
