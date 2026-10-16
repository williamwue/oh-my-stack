#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
const read = (path) => readFile(join(root, path), "utf8");
const json = async (path) => JSON.parse(await read(path));

try {
  const project = await json("src/core/project.json");
  const imports = await json("upstream/imports.json");
  const parity = await json(imports.derivationManifest);
  const receipt = await json(imports.sourceReceipt);
  const upstream = await json(`${parity.sourceRoot}/.cursor-plugin/plugin.json`);
  const catalog = await json("packages/codex/SKILL_CATALOG.json");
  if (!project.version || !upstream.version || !imports.revision
    || imports.revision !== parity.revision || imports.revision !== receipt.revision
    || catalog.target !== "codex" || catalog.selection?.base !== "pstack"
    || catalog.selection.extensions.length !== 0 || !Array.isArray(catalog.skills)) {
    throw new Error("Invalid or inconsistent current fact sources");
  }
  const publicSkills = catalog.skills.filter((skill) => skill.audience === "public");
  if (!publicSkills.length || new Set(publicSkills.map((skill) => skill.name)).size !== publicSkills.length) {
    throw new Error("Invalid generated default public catalog");
  }
  const version = "(\\d+\\.\\d+\\.\\d+(?:-[\\w.-]+)?)";
  const source = ["source version", new RegExp(`Source candidate ${version}`, "g"), project.version];
  const pin = ["upstream pin", new RegExp(`pstack ${version}`, "g"), upstream.version];
  const revision = ["upstream revision", /`([a-f0-9]{40})`/g, imports.revision];
  const rules = [
    ["README.md", "intro", [source, pin]],
    ["README.zh-CN.md", "intro", [["source version", new RegExp(`${version} 源码候选`, "g"), project.version], pin]],
    ["docs/pstack-parity.md", "overview", [source, pin, revision]],
    ["docs/support-policy.md", "intro", [["source version", new RegExp(`current source is a local ${version} candidate`, "g"), project.version]]],
    ["docs/project-status.md", "newest", [
      ["source version", new RegExp(`^## ${version} source candidate`, "gm"), project.version], pin, revision,
      ["public count", /with (\d+) default public Skills/g, String(publicSkills.length)],
    ]],
    ["docs/pi-install.md", "intro", [["Pi source scope", /(?:The (current source) generates|The local (\S+) candidate generates)/g, "current source"]]],
  ];
  const errors = [];
  for (const [path, section, facts] of rules) {
    const text = await read(path);
    const headings = [...text.matchAll(/^## /gm)];
    const end = headings[section === "newest" ? 1 : 0]?.index;
    if (end === undefined) throw new Error(`${path}: missing current section boundary`);
    const current = section === "overview" ? text.split("\n\n").slice(0, 2).join("\n\n") : text.slice(0, end);
    for (const [label, pattern, expected] of facts) {
      const matches = [...current.matchAll(pattern)];
      if (matches.length !== 1) {
        errors.push(`${path}: ${label} requires exactly one current fact, found ${matches.length}`);
      } else {
        const actual = matches[0].slice(1).find((value) => value !== undefined);
        if (actual !== expected) errors.push(`${path}: ${label} is ${actual}; expected ${expected}`);
      }
    }
  }
  for (const path of ["README.md", "README.zh-CN.md"]) {
    const rows = (await read(path)).match(/^\| Pi \|.*$/gm) ?? [];
    if (rows.length !== 1) errors.push(`${path}: requires exactly one Pi installation row, found ${rows.length}`);
    else if (/\d+\.\d+\.\d+/.test(rows[0]) || !rows[0].includes("docs/pi-install.md")) {
      errors.push(`${path}: Pi installation row must link to current source scope without a release version`);
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`Current documentation facts agree with source ${project.version}, pstack ${upstream.version}, and ${publicSkills.length} public Skills.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
