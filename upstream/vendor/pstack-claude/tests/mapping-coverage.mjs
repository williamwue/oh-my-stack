// The shared check that a runtime's mapping names every Claude-specific term
// the skills use. The corpus leaves out every runtime's mapping file, since a
// mapping is not a skill and a term only another mapping uses needs no row.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { PLUGIN } from "../tools/plugin.mjs";
import { RUNTIMES } from "../tools/runtimes.mjs";
import { markdownFiles } from "../tools/validate-skills.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const skillsDir = join(repoRoot, PLUGIN, "skills");
const mappings = new Set(RUNTIMES.map((runtime) => join(repoRoot, runtime.tools)));

// Each term is [text a skill may contain, text the mapping must carry for it].
// A term the skills stop using drops out of the check.
export function mappingCoverage(runtime, terms) {
  const mapping = readFileSync(join(repoRoot, runtime.tools), "utf8");
  const skillText = markdownFiles(skillsDir)
    .filter((f) => !mappings.has(f))
    .map((f) => [relative(skillsDir, f), readFileSync(f, "utf8")]);
  describe(`${runtime.mapping} coverage`, () => {
    for (const [term, row] of terms) {
      const users = skillText.filter(([, text]) => text.includes(term)).map(([rel]) => rel);
      test(`${term} (${users.length} files) has a ${runtime.name} mapping`, () => {
        if (users.length) expect(mapping).toContain(row);
      });
    }
  });
}
