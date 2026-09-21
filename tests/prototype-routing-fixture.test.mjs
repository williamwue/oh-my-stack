import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const childEnvironment = { ...process.env };
delete childEnvironment.NODE_TEST_CONTEXT;

test("prototype-routing compares equivalent variants with a deterministic decision variable", () => {
  const fixture = join(repoRoot, "evals/fixtures/prototype-routing");
  const script = join(fixture, "reference/dedupe-prototype.mjs");
  const results = new Map();

  for (const variant of ["scan", "set"]) {
    const run = spawnSync("node", [script, "--variant", variant], {
      cwd: fixture,
      encoding: "utf8",
      env: childEnvironment,
    });
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
    results.set(variant, JSON.parse(run.stdout));
  }

  assert.deepEqual(results.get("scan").uniqueIds, ["a", "b", "c", "d", "e"]);
  assert.deepEqual(results.get("set").uniqueIds, results.get("scan").uniqueIds);
  assert.equal(results.get("scan").inputCount, 8);
  assert.equal(results.get("set").inputCount, 8);
  assert.equal(results.get("scan").membershipChecks, 14);
  assert.equal(results.get("set").membershipChecks, 8);
});
