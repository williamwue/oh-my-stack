import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { buildConformance } from "../tools/build-conformance.mjs";
import { repoRoot } from "../tools/generate.mjs";

test("same-scenario conformance records are deterministic and semantically aligned", async () => {
  const result = await buildConformance({ check: true });
  assert.deepEqual(result, { verifiedScenarios: 6, records: 12 });
  for (const scenario of ["bug-fix", "feature-boundary", "behavior-preserving-refactor", "architecture-candidates", "mixed-review", "conflicting-writers"]) {
    const omp = JSON.parse(await readFile(join(repoRoot, "conformance/results/omp-default", `${scenario}.json`), "utf8"));
    const codex = JSON.parse(await readFile(join(repoRoot, "conformance/results/codex-cli", `${scenario}.json`), "utf8"));
    assert.deepEqual(
      omp.semanticTrace.map(({ sequence, event, actor }) => ({ sequence, event, actor })),
      codex.semanticTrace.map(({ sequence, event, actor }) => ({ sequence, event, actor })),
    );
    assert.equal(omp.fixture.revision, codex.fixture.revision);
    assert.equal(omp.assertions.every((entry) => ["pass", "not-applicable"].includes(entry.status)), true);
    assert.equal(codex.assertions.every((entry) => ["pass", "not-applicable"].includes(entry.status)), true);
  }
});
