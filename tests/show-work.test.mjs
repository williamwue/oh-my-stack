import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";

const read = (path) => readFile(join(repoRoot, path));
const json = async (path) => JSON.parse(await read(path));
const helper = "src/core/skills/show-me-your-work/scripts/log.sh";

test("the decision-log helper is an exact pinned source reference", async () => {
  const derivations = await json("upstream/parity-derivations.json");
  const entry = derivations.entries.find((item) => item.output === helper);
  assert.ok(entry);
  assert.equal(entry.source, "skills/show-me-your-work/scripts/log.sh");
  assert.deepEqual(entry.replacements, []);
  assert.equal(entry.sourceSha256, entry.outputSha256);
  const pinned = await read(`${derivations.sourceRoot}/${entry.source}`);
  assert.equal(createHash("sha256").update(pinned).digest("hex"), entry.sourceSha256);
  assert.deepEqual(await read(helper), pinned);
  for (const host of ["codex", "omp", "claude-code", "pi"]) {
    assert.deepEqual(await read(`packages/${host}/skills/show-me-your-work/scripts/log.sh`), pinned);
  }
});

test("source and generated catalogs classify the helper as reference-only", async () => {
  for (const path of ["src/core/skill-catalog.json", ...["codex", "omp", "claude-code", "pi"].map((host) => `packages/${host}/SKILL_CATALOG.json`)]) {
    const catalog = await json(path);
    const resources = path.startsWith("src/") ? catalog.entries : catalog.resources;
    const ownership = resources.find((entry) => entry.path === "src/core/skills/show-me-your-work/**");
    assert.equal(ownership?.kind, "reference", path);
    assert.equal(ownership.owner, "show-me-your-work", path);
    assert.equal(ownership.distribution, "core", path);
    assert.ok(!resources.some((entry) => entry.kind === "script" && entry.path === helper), path);
  }
  for (const host of ["codex", "omp", "claude-code", "pi"]) {
    const directory = `packages/${host}/skills/show-me-your-work`;
    const entry = (await read(`${directory}/SKILL.md`)).toString("utf8");
    const skill = entry.includes("[complete workflow](WORKFLOW.md)")
      ? (await read(`${directory}/WORKFLOW.md`)).toString("utf8") : entry;
    assert.match(skill, /Source-host helpers under `scripts\/` are reference-only unless the generated binding identifies supported execution for that exact helper/);
  }
});

test("the portable log contract preserves append-only evidence and scoped transcript audits", async () => {
  const skill = (await read("src/core/skills/show-me-your-work/SKILL.md")).toString("utf8");
  assert.equal((await read("src/core/skills/show-me-your-work/references/decision-log-template.tsv")).toString("utf8"), "ts\tphase\tdecision\twhy\tevidence\tresult\n");
  assert.match(skill, /Cells stay single-line\. Evidence is a pointer, not prose/);
  assert.match(skill, /By default the log is a working artifact, not committed/);
  assert.match(skill, /Append-only[^\n]*Never edit or delete history/);
  assert.match(skill, /Don't glob across `unrelated host workspace transcript roots`/);
  assert.match(skill, /This audit does not check rows outside this run's stretches/);
  assert.match(skill, /spawn a subagent on a different model family/);
});
