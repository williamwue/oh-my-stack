import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

test("mixed review retains the reachable defect and dismisses the unreachable seed", () => {
  const fixture = join(repoRoot, "evals/fixtures/mixed-review");
  const result = JSON.parse(execFileSync(
    process.execPath,
    ["verify.mjs", "F1", "F2-dismissed"],
    { cwd: fixture, encoding: "utf8" },
  ));
  assert.deepEqual(result.actOn, ["F1"]);
  assert.deepEqual(result.dismissed, ["F2"]);
  assert.deepEqual(Object.keys(result.hashes), [
    "intent.md",
    "baseline.mjs",
    "proposed.mjs",
    "review-seeds.md",
  ]);
});
