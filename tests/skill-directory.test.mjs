import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { generateSkillDirectory } from "../tools/generate-skill-directory.mjs";

test("directory check rejects stale or missing documentation without rewriting it", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-directory-"));
  try {
    await mkdir(join(root, "packages/codex/skills/example"), { recursive: true });
    await writeFile(join(root, "packages/codex/SKILL_CATALOG.json"), JSON.stringify({
      schemaVersion: 1, target: "codex", skills: [
        { name: "example", audience: "public", category: "workflow", invocation: "explicit" },
      ],
    }));
    await writeFile(join(root, "packages/codex/skills/example/SKILL.md"), "---\nname: example\ndescription: Explain a project.\n---\n");
    const output = join(root, "docs/skill-directory.md");
    await assert.rejects(generateSkillDirectory({ root, check: true }), /out of date/);
    await assert.rejects(readFile(output), { code: "ENOENT" });
    await generateSkillDirectory({ root });
    await generateSkillDirectory({ root, check: true });
    await writeFile(output, "# A stale directory\n");
    await assert.rejects(generateSkillDirectory({ root, check: true }), /out of date/);
    assert.equal(await readFile(output, "utf8"), "# A stale directory\n");
  } finally { await rm(root, { recursive: true, force: true }); }
});
