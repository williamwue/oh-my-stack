import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

test("architecture candidates have one requirements-consistent winner", () => {
  const fixture = join(repoRoot, "evals/fixtures/architecture-candidates");
  const result = JSON.parse(execFileSync(
    process.execPath,
    ["verify.mjs", "durable-log"],
    { cwd: fixture, encoding: "utf8" },
  ));
  assert.equal(result.winner, "durable-log");
  assert.deepEqual(Object.keys(result.hashes), [
    "requirements.md",
    "candidates/memory-queue.md",
    "candidates/durable-log.md",
  ]);
  assert.equal(Object.values(result.hashes).every((hash) => /^[0-9a-f]{64}$/.test(hash)), true);
});
