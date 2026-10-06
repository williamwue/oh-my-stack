import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadModel, parseSkillFrontmatter, renderTarget, repoRoot, validateRenderedTarget } from "../tools/generate.mjs";
import { loadSourceSkills } from "../tools/source-skills.mjs";

test("AIHero codebase-design ships the complete original skill and references on every host", async () => {
  const model = await loadModel();
  const skill = model.skills.find((entry) => entry.metadata.name === "codebase-design");
  assert.ok(skill?.source, "AIHero source skill is missing");
  assert.equal(skill.source.id, "aihero");
  const stage = await mkdtemp(join(tmpdir(), "oms-aihero-original-"));
  try {
    for (const adapter of model.adapters) {
      const target = await renderTarget(stage, model, adapter);
      for (const name of ["SKILL.md", "DEEPENING.md", "DESIGN-IT-TWICE.md"]) {
        assert.equal(await readFile(join(target, "skills/codebase-design", name), "utf8"),
          await readFile(join(skill.directory, name), "utf8"), `${adapter.id}/${name}: original changed`);
      }
      assert.equal(await readFile(join(target, "licenses/aihero/LICENSE"), "utf8"),
        await readFile(skill.source.licenseFile, "utf8"));
      const catalog = JSON.parse(await readFile(join(target, "SKILL_CATALOG.json"), "utf8"));
      assert.equal(catalog.skills.find((entry) => entry.name === "codebase-design").source.id, "aihero");
    }
  } finally { await rm(stage, { recursive: true, force: true }); }
});

test("a packaged original cannot silently change after generation", async () => {
  const model = await loadModel();
  const stage = await mkdtemp(join(tmpdir(), "oms-aihero-tamper-"));
  try {
    const adapter = model.adapters.find((entry) => entry.id === "codex");
    const target = await renderTarget(stage, model, adapter);
    await writeFile(join(target, "skills/codebase-design/DEEPENING.md"), "# Altered method\n");
    await assert.rejects(validateRenderedTarget(target, adapter, model), /original source changed in package/);
  } finally { await rm(stage, { recursive: true, force: true }); }
});

test("source validation rejects changed originals, omitted dependencies, unrecorded resources, and snapshot symlinks", async () => {
  const model = await loadModel();
  const root = await mkdtemp(join(tmpdir(), "oms-aihero-provenance-"));
  try {
    await mkdir(join(root, "upstream"));
    const manifest = JSON.parse(await readFile(join(repoRoot, "upstream/source-skills.json"), "utf8"));
    const source = manifest.sources[0];
    await cp(join(repoRoot, source.snapshot), join(root, source.snapshot), { recursive: true });
    const save = () => writeFile(join(root, "upstream/source-skills.json"), JSON.stringify(manifest));
    await save();
    const originalPath = join(root, source.snapshot, "skills/engineering/codebase-design/DEEPENING.md");
    const original = await readFile(originalPath);
    await writeFile(originalPath, "# Altered\n");
    await assert.rejects(loadSourceSkills(root, parseSkillFrontmatter, model.registry), /source hash drift/);
    await writeFile(originalPath, original);
    source.skills[0].dependencies.push("missing-skill");
    await save();
    await assert.rejects(loadSourceSkills(root, parseSkillFrontmatter, model.registry), /source dependency is missing/);
    source.skills[0].dependencies.pop();
    await save();
    await writeFile(join(root, source.snapshot, "skills/engineering/codebase-design/UNRECORDED.md"), "# Surprise\n");
    await assert.rejects(loadSourceSkills(root, parseSkillFrontmatter, model.registry), /unrecorded resource/);
    await rm(join(root, source.snapshot, "skills/engineering/codebase-design/UNRECORDED.md"));
    await rename(join(root, source.snapshot), join(root, `${source.snapshot}-original`));
    await symlink(`${source.revision}-original`, join(root, source.snapshot));
    await assert.rejects(loadSourceSkills(root, parseSkillFrontmatter, model.registry), /source path traverses a symlink/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
