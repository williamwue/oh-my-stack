import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { loadModel, renderTarget, repoRoot } from "../tools/generate.mjs";

const exec = promisify(execFile);

test("all native hosts run the documented installed checker from an unrelated project", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-portable-helpers-"));
  try {
    const model = await loadModel();
    const project = join(root, "arbitrary project");
    await mkdir(project);
    await assert.rejects(access(join(project, "skills/poteto-mode/scripts/check-plan.mjs")), { code: "ENOENT" });
    for (const adapter of model.adapters) {
      const generated = await renderTarget(join(root, "generated"), model, adapter);
      const installed = join(root, "installed package", adapter.id);
      await cp(generated, installed, { recursive: true });
      await rm(generated, { recursive: true });
      const guide = await readFile(join(installed, "docs/runtime-binding.md"), "utf8");
      const command = guide.match(/`node "(<installed-package-root>\/[^"\n]+)" "\/absolute\/path\/plan\.md"`/);
      assert.ok(command, `${adapter.id} documents the installed-package command`);
      const checker = command[1].replace("<installed-package-root>", installed);
      const contexts = [
        ["skills/poteto-mode/SKILL.md", "scripts/check-plan.mjs"],
        ["skills/poteto-mode/playbooks/multi-phase-plan.md", "../scripts/check-plan.mjs"],
        ["skills/multi-phase-plan/SKILL.md", "../poteto-mode/scripts/check-plan.mjs"],
      ];
      for (const [document, relativeHelper] of contexts) {
        await access(join(installed, document));
        assert.equal(resolve(dirname(join(installed, document)), relativeHelper), checker);
        assert.ok(guide.includes(`\`${relativeHelper}\``));
      }
      const playbook = await readFile(join(installed, "skills/poteto-mode/playbooks/multi-phase-plan.md"), "utf8");
      const skeleton = playbook.match(/````markdown\n([\s\S]*?)\n````/)[1]
        .replaceAll("<swarm workers model>", "fixture-model");
      const plan = join(project, `${adapter.id} plan.md`);
      await writeFile(plan, skeleton);
      const valid = await exec(process.execPath, [checker, plan], { cwd: project });
      assert.match(valid.stdout, /1 PR sections, 0 problems/);
      await writeFile(plan, skeleton.replace("# <Program> plan", "# <Program> plan\n\nBroken: prose"));
      await assert.rejects(exec(process.execPath, [checker, plan], { cwd: project }), (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /mid-sentence colon/);
        return true;
      });
      await assert.rejects(exec(process.execPath, [checker], { cwd: project }), (error) => {
        assert.equal(error.code, 2);
        assert.match(error.stderr, /Usage: node check-plan.mjs/);
        return true;
      });
      assert.match(guide, /Other source-host helpers[\s\S]*reference-only/);
      assert.match(guide, /Cursor watch-pr, orchestration, and worktree helpers have no execution mapping/);

    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("source frontmatter disables implicit invocation without a skill-name special case", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-explicit-source-invocation-"));
  try {
    const source = join(root, "source");
    await mkdir(source);
    for (const path of ["src", "upstream", "tools", "docs", "LICENSE"]) {
      await cp(join(repoRoot, path), join(source, path), { recursive: true });
    }
    const skillPath = join(source, "src/core/skills/how/SKILL.md");
    const metadataPath = join(source, "src/core/skills/how/skill.json");
    const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    metadata.invocation = "automatic";
    await writeFile(metadataPath, JSON.stringify(metadata));
    await writeFile(skillPath, (await readFile(skillPath, "utf8"))
      .replace("name: how\n", "name: how\ndisable-model-invocation: true\n"));
    const model = await loadModel(source);
    for (const adapter of model.adapters) {
      const target = await renderTarget(join(root, "generated"), model, adapter);
      const catalog = JSON.parse(await readFile(join(target, "SKILL_CATALOG.json"), "utf8"));
      assert.equal(catalog.skills.find((skill) => skill.name === "how").invocation, "explicit");
      if (adapter.id === "codex") {
        const entry = await readFile(join(target, "skills/how/agents/openai.yaml"), "utf8");
        assert.match(entry, /allow_implicit_invocation: false/);
      } else {
        const entry = await readFile(join(target, "skills/how/SKILL.md"), "utf8");
        assert.match(entry, /disable-model-invocation: true/);
      }
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
