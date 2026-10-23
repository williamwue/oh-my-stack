import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

test("public Skill matrix verifier requires the exact catalog and headings", async () => {
  for (const runtime of ["omp", "codex", "claude-code", "pi"]) {
  const catalog = JSON.parse(await readFile(join(repoRoot, "packages", runtime, "SKILL_CATALOG.json"), "utf8"));
  const generation = JSON.parse(await readFile(join(repoRoot, "packages", runtime, "GENERATION.json"), "utf8"));
  const names = catalog.skills.filter((entry) => entry.audience === "public").map((entry) => entry.name);
  const batches = [];
  for (let offset = 0; offset < names.length; offset += 10) {
    const requested = names.slice(offset, offset + 10);
    const observed = [];
    for (const name of requested) {
      const text = await readFile(join(repoRoot, "packages", runtime, "skills", name, "SKILL.md"), "utf8");
      observed.push({ name, heading: text.match(/^#\s+(.+)$/m)?.[1] ?? null });
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
  const payload = { runtime, batches };
  await writeFile(report, `${JSON.stringify(payload, null, 2)}\n`);
  const verify = () => execFileSync(
    process.execPath,
    [join(repoRoot, "evals/fixtures/public-skill-matrix/verify.mjs"), report],
    { cwd: repoRoot, encoding: "utf8", stdio: "pipe" },
  );
  const output = JSON.parse(verify());
  assert.deepEqual(output, { runtime, publicSkillCount: names.length, batchCount: Math.ceil(names.length / 10), probeSkillCount: generation.skills.omittedProbes });
  const wrongHeading = structuredClone(payload);
  wrongHeading.batches[0].observed[0].heading = "Wrong heading";
  await writeFile(report, JSON.stringify(wrongHeading));
  assert.throws(verify, /first heading drift/);
  const missingSkill = structuredClone(payload);
  missingSkill.batches.at(-1).requested.pop();
  missingSkill.batches.at(-1).observed.pop();
  if (!missingSkill.batches.at(-1).requested.length) missingSkill.batches.pop();
  await writeFile(report, JSON.stringify(missingSkill));
  assert.throws(verify, /exact public catalog/);
  }
});
