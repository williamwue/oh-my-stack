import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadModel, parseSkillFrontmatter, renderTarget, repoRoot, validateRenderedTarget } from "../tools/generate.mjs";
import { loadSourceSkills } from "../tools/source-skills.mjs";

test("all selected AIHero originals ship every resource and their invocation modes on every host", async () => {
  const model = await loadModel();
  const expected = {
    "diagnosing-bugs": { invocation: "automatic", dependencies: [], source: "aihero-20261008" },
    "code-review": { invocation: "automatic", dependencies: [], source: "aihero-20261008" },
    "writing-for-agents": { invocation: "automatic", dependencies: [] },
    "retro": { invocation: "explicit", dependencies: ["writing-for-agents"] },
    "handoff": { invocation: "explicit", dependencies: [] },
    "research": { invocation: "automatic", dependencies: [] },
    "to-questionnaire": { invocation: "explicit", dependencies: [] },
    "setup-matt-pocock-skills": { invocation: "explicit", dependencies: [] },
    "to-spec": { invocation: "explicit", dependencies: [] },
    "to-tickets": { invocation: "explicit", dependencies: [] },
    "codebase-design": { invocation: "automatic", dependencies: [] },
    "domain-modeling": { invocation: "automatic", dependencies: [] },
    "grilling": { invocation: "automatic", dependencies: [] },
    "grill-me": { invocation: "explicit", dependencies: ["grilling"] },
    "grill-with-docs": { invocation: "explicit", dependencies: ["grilling", "domain-modeling"] },
    "improve-codebase-architecture": { invocation: "explicit", dependencies: ["codebase-design", "grilling", "domain-modeling"] },
  };
  assert.deepEqual(model.sourceSkills.map((skill) => skill.metadata.name).sort(), Object.keys(expected).sort());
  const stage = await mkdtemp(join(tmpdir(), "oms-aihero-original-"));
  try {
    for (const adapter of model.adapters) {
      const target = await renderTarget(stage, model, adapter);
      const catalog = JSON.parse(await readFile(join(target, "SKILL_CATALOG.json"), "utf8"));
      for (const skill of model.sourceSkills) {
        const name = skill.metadata.name;
        for (const file of skill.source.files) {
          const relative = file.path.slice(skill.source.path.length + 1);
          assert.deepEqual(await readFile(join(target, "skills", name, relative)),
            await readFile(join(skill.directory, relative)), `${adapter.id}/${name}/${relative}: original changed`);
        }
        const entry = catalog.skills.find((entry) => entry.name === name);
        assert.equal(entry.source.id, expected[name].source ?? "aihero");
        assert.equal(entry.invocation, expected[name].invocation);
        assert.deepEqual(entry.source.dependencies, expected[name].dependencies);
        assert.deepEqual(entry.source.adaptations, []);
        assert.equal(await readFile(join(target, "licenses", skill.source.id, "LICENSE"), "utf8"),
          await readFile(skill.source.licenseFile, "utf8"));
      }
    }
  } finally { await rm(stage, { recursive: true, force: true }); }
});

test("a workflow cannot ship when an original invoked dependency is omitted", async () => {
  const model = await loadModel();
  const root = await mkdtemp(join(tmpdir(), "oms-aihero-incomplete-"));
  try {
    const manifest = JSON.parse(await readFile(join(repoRoot, "upstream/source-skills.json"), "utf8"));
    const source = manifest.sources[0];
    for (const record of manifest.sources) {
      await cp(join(repoRoot, record.snapshot), join(root, record.snapshot), { recursive: true });
    }
    await mkdir(join(root, "upstream"), { recursive: true });
    for (const dependency of ["grilling", "domain-modeling", "codebase-design", "writing-for-agents"]) {
      const selected = source.skills;
      source.skills = selected.filter((skill) => !skill.path.endsWith(`/${dependency}`));
      await writeFile(join(root, "upstream/source-skills.json"), JSON.stringify(manifest));
      await assert.rejects(loadSourceSkills(root, parseSkillFrontmatter, model.registry), /source dependency is missing/);
      source.skills = selected;
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("a packaged original cannot silently change after generation", async () => {
  const model = await loadModel();
  const stage = await mkdtemp(join(tmpdir(), "oms-aihero-tamper-"));
  try {
    const adapter = model.adapters.find((entry) => entry.id === "codex");
    const target = await renderTarget(stage, model, adapter);
    for (const resource of ["skills/codebase-design/DEEPENING.md", "skills/diagnosing-bugs/scripts/hitl-loop.template.sh"]) {
      const path = join(target, resource);
      const original = await readFile(path);
      await writeFile(path, "# Altered method\n");
      await assert.rejects(validateRenderedTarget(target, adapter, model), /original source changed in package/);
      await writeFile(path, original);
    }
  } finally { await rm(stage, { recursive: true, force: true }); }
});

test("source validation rejects changed originals, omitted dependencies, unrecorded resources, and snapshot symlinks", async () => {
  const model = await loadModel();
  const root = await mkdtemp(join(tmpdir(), "oms-aihero-provenance-"));
  try {
    await mkdir(join(root, "upstream"));
    const manifest = JSON.parse(await readFile(join(repoRoot, "upstream/source-skills.json"), "utf8"));
    const source = manifest.sources[0];
    for (const record of manifest.sources) {
      await cp(join(repoRoot, record.snapshot), join(root, record.snapshot), { recursive: true });
    }
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
