import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

test("public Skill matrix verifier requires the exact catalog and headings", async () => {
  const catalog = JSON.parse(await readFile(join(repoRoot, "src/core/skill-catalog.json"), "utf8"));
  const batches = [];
  for (let offset = 0; offset < catalog.public.length; offset += 10) {
    const requested = catalog.public.slice(offset, offset + 10);
    const observed = [];
    for (const name of requested) {
      const text = await readFile(join(repoRoot, "packages/omp/skills", name, "SKILL.md"), "utf8");
      observed.push({ name, heading: text.match(/^#\s+(.+)$/m)?.[1] });
    }
    batches.push({
      requested,
      observed,
      noWorkflowExecution: true,
      noWrites: true,
      noDelegation: true,
      noPublication: true,
    });
  }
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-public-matrix-"));
  const report = join(root, "report.json");
  await writeFile(report, `${JSON.stringify({ runtime: "omp", batches }, null, 2)}\n`);
  const output = JSON.parse(execFileSync(
    process.execPath,
    [join(repoRoot, "evals/fixtures/public-skill-matrix/verify.mjs"), report],
    { cwd: repoRoot, encoding: "utf8" },
  ));
  assert.deepEqual(output, { runtime: "omp", publicSkillCount: 41, batchCount: 5, probeSkillCount: 12 });
});
