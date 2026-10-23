import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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

test("conformance cannot regenerate passing history after fixture or evidence drift", async t => {
  const root = await mkdtemp(join(tmpdir(), "oms-conformance-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const directory of ["src", "upstream", "evals", "conformance"]) {
    await cp(join(repoRoot, directory), join(root, directory), { recursive: true });
  }
  const resultPath = join(root, "conformance/results/omp-default/bug-fix.json");
  const before = await readFile(resultPath);
  const record = JSON.parse(before);
  const fixturePath = join(root, record.fixture.path, record.fixture.artifacts[0].path);
  const fixtureBytes = await readFile(fixturePath);
  await writeFile(fixturePath, Buffer.concat([fixtureBytes, Buffer.from("\n// changed fixture\n")]));
  await assert.rejects(buildConformance({ root }), /fixture observation drift/);
  assert.deepEqual(await readFile(resultPath), before);
  await writeFile(fixturePath, fixtureBytes);
  const evidencePath = join(root, record.sourceEvidence);
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  evidence.assertions[0].evidence += " Altered historical statement.";
  await writeFile(evidencePath, JSON.stringify(evidence));
  await assert.rejects(buildConformance({ root, check: true }), /source evidence observation drift/);
  await assert.rejects(buildConformance({ root }), /source evidence observation drift/);
  assert.deepEqual(await readFile(resultPath), before);
});
