import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

test("conflicting writers fixture requires both owned changes in one file", async () => {
  const source = join(repoRoot, "evals/fixtures/conflicting-writers");
  const fixture = await mkdtemp(join(tmpdir(), "oh-my-stack-conflicting-writers-"));
  try {
    await cp(source, fixture, { recursive: true });
    const baseline = JSON.parse(execFileSync(process.execPath, ["verify.mjs", "baseline"], { cwd: fixture, encoding: "utf8" }));
    assert.deepEqual(baseline.settings, { maxBatch: 10, delayMs: 100 });
    await copyFile(join(fixture, "expected/settings.mjs"), join(fixture, "workspace/settings.mjs"));
    const combined = JSON.parse(execFileSync(process.execPath, ["verify.mjs", "combined"], { cwd: fixture, encoding: "utf8" }));
    assert.deepEqual(combined.settings, { maxBatch: 25, delayMs: 250 });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
