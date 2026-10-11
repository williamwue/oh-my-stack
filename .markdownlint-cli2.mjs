import { readFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const base = read("./.markdownlint-base.json");
const entries = read("./upstream/parity-derivations.json").entries;
const derived = entries.flatMap(({ output }) => {
  if (!output.endsWith(".md")) return [];
  const paths = [output];
  for (const host of ["codex", "claude-code", "omp", "pi"]) {
    if (output.startsWith("src/core/skills/")) {
      const packaged = output.replace("src/core/", `packages/${host}/`);
      paths.push(packaged);
      if (host === "codex" && packaged.endsWith("/SKILL.md")) paths.push(packaged.replace(/SKILL\.md$/, "WORKFLOW.md"));
    } else if (output.startsWith("src/core/roles/")) {
      paths.push(`packages/${host}/agents/${output.split("/")[3]}.md`);
    }
  }
  return paths;
});

export default {
  ...base,
  overrides: [{ filter: derived, config: { default: false }, combine: "replace" }, ...base.overrides],
};
