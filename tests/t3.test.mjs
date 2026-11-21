import { afterEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { changes, loadLeadLines, plan, problems } from "../tools/generate.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const mode = "plugins/pstack/skills/poteto-mode/SKILL.md";
const codex = "plugins/pstack/skills/poteto-mode/references/codex-tools.md";
const bugFix = "plugins/pstack/skills/poteto-mode/playbooks/bug-fix.md";
const setup = "plugins/pstack/skills/setup-pstack/SKILL.md";
const setupMapping = "plugins/pstack/skills/setup-pstack/references/t3.md";
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
  test("lost T3 entries are detected and regenerated for routing and setup", () => {
    const root = fixture();
    const roles = JSON.parse(readFileSync(join(root, "plugins/pstack/models.json"), "utf8")).roles;
    const entries = new Set([mode, codex, bugFix, setup, ...roles.map((role) => `plugins/pstack/skills/${role.skill}/SKILL.md`)]);
    for (const file of entries) {
      const original = readFileSync(join(root, file), "utf8");
      const lead = loadLeadLines(root).get(file).find((line) => line.startsWith("When T3 Code tools are available,"));
      expect(lead).toStartWith("When T3 Code tools are available,");
      writeFileSync(join(root, file), original.replace(lead + "\n\n", ""));
      const intended = plan(root);
      expect(changes(root, intended)).toContainEqual({ kind: "write", path: file });
      expect(intended.files[file]).toBe(original);
    }
  });

  test("every T3 dispatch entry names the tool for same-provider work and inherited seats", () => {
    const roles = JSON.parse(readFileSync(join(repo, "plugins/pstack/models.json"), "utf8")).roles;
    const files = new Set([mode, codex, bugFix, ...roles.map(({ skill }) => `plugins/pstack/skills/${skill}/SKILL.md`)]);
    for (const file of files) {
      const entry = readFileSync(join(repo, file), "utf8").split(/^## /m)[0];
      expect(entry, file).toContain("`delegate_task` by name, including same-provider work");
      expect(entry, file).toContain("use the same tool and omit the target");
      expect(entry, file).toContain("On the completion wake");
      expect(entry, file).toContain("role | task ID | requested provider/model and options | executed model (or unconfirmed) | outcome");
    }
  });

  test("a missing packaged T3 mapping fails link validation", () => {
    const root = fixture();
    rmSync(join(root, mapping));
    expect(problems(root).some((message) => message.includes("t3-tools.md") && message.includes("missing"))).toBe(true);
  });

  test("a missing T3 setup reference fails packaged link validation", () => {
    const root = fixture();
    rmSync(join(root, setupMapping));
    expect(problems(root).some((message) => message.includes("references/t3.md") && message.includes("missing"))).toBe(true);
  });

  test("native marketplaces identify OMS while keeping the upstream skill namespace", () => {
    for (const file of [".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json"]) {
      const marketplace = JSON.parse(readFileSync(join(repo, file), "utf8"));
      expect(marketplace.name).toBe("oms");
      expect(marketplace.plugins.map((plugin) => plugin.name)).toEqual(["pstack"]);
      for (const plugin of marketplace.plugins) {
        const dir = typeof plugin.source === "string" ? plugin.source : plugin.source.path;
        const manifestDir = file.startsWith(".agents/") ? ".codex-plugin" : ".claude-plugin";
        const manifest = JSON.parse(readFileSync(join(repo, dir, manifestDir, "plugin.json"), "utf8"));
        expect(manifest.name).toBe(plugin.name);
      }
    }
  });
});

describe("the T3 mapping quotes t3-pstack's model defaults", () => {
  test("every default entry it lists is the one models.t3.json gives that role", () => {
    const models = JSON.parse(readFileSync(join(repo, "plugins/pstack/models.t3.json"), "utf8"));
    const text = readFileSync(join(repo, mapping), "utf8");
    const listed = [...text.matchAll(/^- ([a-z][a-z ,-]*): (`.+`)$/gm)].map((m) => [m[1], [...m[2].matchAll(/`([^`]+)`/g)].map((e) => e[1])]);
    expect(listed.length).toBeGreaterThan(0);
    for (const [role, entries] of listed) {
      const tier = models.roles.find((r) => r.role === role)?.tier;
      expect(tier, role).toBeDefined();
      expect(entries, role).toEqual([models.tiers[tier]].flat());
    }
    for (const { role } of models.roles) expect(listed.map(([r]) => r)).toContain(role);
  });
});
