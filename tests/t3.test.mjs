import { afterEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { changes, loadLeadLines, plan, problems } from "../tools/generate.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const mode = "plugins/pstack/skills/poteto-mode/SKILL.md";
const codex = "plugins/pstack/skills/poteto-mode/references/codex-tools.md";
const mapping = "plugins/pstack/skills/poteto-mode/references/t3-tools.md";
const made = [];
afterEach(() => {
  for (const root of made.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "oms-t3-"));
  made.push(root);
  cpSync(repo, root, {
    recursive: true,
    filter: (path) => ![".git", "node_modules", ".tmp", "output"].includes(basename(path)),
  });
  return root;
}

describe("T3 distribution", () => {
  test("a lost T3 entry is detected and regenerated in both discovery paths", () => {
    const root = fixture();
    for (const file of [mode, codex]) {
      const original = readFileSync(join(root, file), "utf8");
      const lead = loadLeadLines(root).get(file).find((line) => line.includes("the T3 mapping"));
      expect(lead).toStartWith("When T3 Code tools are available,");
      writeFileSync(join(root, file), original.replace(lead + "\n\n", ""));
      const intended = plan(root);
      expect(changes(root, intended)).toContainEqual({ kind: "write", path: file });
      expect(intended.files[file]).toBe(original);
    }
  });

  test("a missing packaged T3 mapping fails link validation", () => {
    const root = fixture();
    rmSync(join(root, mapping));
    expect(problems(root).some((message) => message.includes("t3-tools.md") && message.includes("missing"))).toBe(true);
  });

  test("native marketplaces identify OMS while keeping the upstream skill namespace", () => {
    for (const file of [".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json"]) {
      const marketplace = JSON.parse(readFileSync(join(repo, file), "utf8"));
      expect(marketplace.name).toBe("oms");
      expect(marketplace.plugins.map((plugin) => plugin.name)).toEqual(["pstack"]);
    }
  });
});
