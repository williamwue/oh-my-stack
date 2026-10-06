#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSkillFrontmatter, repoRoot } from "./generate.mjs";

const escapeCell = (value) => value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

export async function generateSkillDirectory({ root = repoRoot, check = false } = {}) {
  const catalog = JSON.parse(await readFile(join(root, "packages/codex/SKILL_CATALOG.json"), "utf8"));
  if (catalog.schemaVersion !== 1 || catalog.target !== "codex" || !Array.isArray(catalog.skills)) {
    throw new Error("Unsupported packaged Skill catalog");
  }
  const entries = catalog.skills.filter((entry) => entry.audience === "public")
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
  const names = new Set();
  const rows = [];
  for (const entry of entries) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name) || names.has(entry.name)
      || !["workflow", "principle"].includes(entry.category)
      || !["explicit", "automatic"].includes(entry.invocation)) {
      throw new Error(`Invalid or duplicate public Skill: ${entry.name}`);
    }
    names.add(entry.name);
    const path = `packages/codex/skills/${entry.name}/SKILL.md`;
    const frontmatter = parseSkillFrontmatter(await readFile(join(root, path), "utf8"), path);
    if (frontmatter.name !== entry.name) throw new Error(`Packaged Skill name mismatch: ${path}`);
    const source = entry.source ? `${entry.source.id} original` : "OMS core";
    rows.push({ ...entry, row: `| [\`${entry.name}\`](../${path}) | ${escapeCell(frontmatter.description)} | ${entry.invocation} | ${escapeCell(source)} |` });
  }
  const workflows = rows.filter((entry) => entry.category === "workflow");
  const principles = rows.filter((entry) => entry.category === "principle");
  const section = (title, group) => [
    `## ${title}`, "", `${group.length} entries.`, "",
    "| Skill | When to use it | Invocation | Source |",
    "| --- | --- | --- | --- |", ...group.map((entry) => entry.row), "",
  ];
  const output = [
    "# Skill directory", "",
    "Generated from the packaged public catalog and Skill descriptions. To refresh this file,",
    "run `npm run docs:generate` from the source checkout. `npm run docs:check` checks for drift.", "",
    `${entries.length} public entries: ${workflows.length} workflows and ${principles.length} principles.`, "",
    "This directory reflects the generated source packages. Released installations may differ;",
    "see [published releases](https://github.com/williamwue/oh-my-stack/releases/latest)",
    "and the [AIHero guide](aihero-original-skills.md) for unreleased additions.", "",
    "For a first task, start with [the walkthrough](getting-started.md) or",
    "[common task examples](guides/common-tasks.md). You do not need to learn every entry.", "",
    "## Invocation and sources", "",
    "Select `oh-my-stack:<name>` in Codex, or use `/oh-my-stack:<name>` in the Claude Code",
    "conversation. `explicit` requires user selection; `automatic` also allows the agent",
    "to invoke the Skill when appropriate. It does not guarantee automatic selection.", "",
    "The links below open packaged Skill instructions. Those files are instructions for",
    "agents; the user guides explain how to start tasks and what results to expect.", "",
    "`OMS core` includes pstack-derived workflows and OMS additions. `aihero original`",
    "identifies the selected original source directories. See the",
    "[AIHero guide](aihero-original-skills.md), [source notices](../THIRD_PARTY_NOTICES.md),",
    "and [support policy](support-policy.md) for source and testing boundaries.", "",
    ...section("Workflows", workflows), ...section("Principles", principles),
  ].join("\n");
  const destination = join(root, "docs/skill-directory.md");
  if (check) {
    let existing;
    try { existing = await readFile(destination, "utf8"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    if (existing !== output) throw new Error("Skill directory is out of date; run npm run docs:generate");
  } else {
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, output);
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => arg !== "--check")) throw new Error("Usage: generate-skill-directory.mjs [--check]");
    await generateSkillDirectory({ check: args.includes("--check") });
    process.stdout.write(args.includes("--check") ? "Skill directory matches the packaged catalog.\n" : "Generated docs/skill-directory.md.\n");
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
