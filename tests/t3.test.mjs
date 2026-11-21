import { afterEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { changes, loadLeadLines, parseModels, plan, problems } from "../tools/generate.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const mode = "plugins/pstack/skills/poteto-mode/SKILL.md";
const codex = "plugins/pstack/skills/poteto-mode/references/codex-tools.md";
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
    const entries = new Set([mode, codex, setup, ...roles.map((role) => `plugins/pstack/skills/${role.skill}/SKILL.md`)]);
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

describe("T3 role defaults in models.json", () => {
  const raw = () => JSON.parse(readFileSync(join(repo, "plugins/pstack/models.json"), "utf8"));
  const parse = (models) => () => parseModels(models, () => true);

  test("every native role has a T3 default", () => {
    const models = raw();
    delete models.t3.roles["swarm workers"];
    expect(parse(models)).toThrow('t3 roles has no "swarm workers"');
  });

  test("a default panel must span two model families", () => {
    const models = raw();
    models.t3.tiers.panel = ["claudeAgent/claude-opus-5-5 effort=high", "claudeAgent/claude-sonnet-5-5 effort=high"];
    expect(parse(models)).toThrow('t3 tier "panel" spans fewer than two model families');
  });

  test("a T3 entry must be a delegate_task target", () => {
    const models = raw();
    models.t3.tiers.default = "opus";
    expect(parse(models)).toThrow('t3 tier "default"');
  });

  test("the T3 defaults and the setup sheet are regenerated from models.json", () => {
    const root = fixture();
    const file = join(root, "plugins/pstack/models.json");
    const models = JSON.parse(readFileSync(file, "utf8"));
    models.t3.tiers.fast = "codex/gpt-6.2-sol reasoningEffort=high";
    writeFileSync(file, JSON.stringify(models, null, 2) + "\n");
    const intended = plan(root);
    expect(changes(root, intended)).toContainEqual({ kind: "write", path: mapping });
    expect(changes(root, intended)).toContainEqual({ kind: "write", path: setupMapping });
    expect(intended.files[mapping]).toContain("- swarm workers: `codex/gpt-6.2-sol reasoningEffort=high`");
    expect(intended.files[setupMapping]).toContain("swarm workers: codex/gpt-6.2-sol reasoningEffort=high");
  });
});

describe("the installer's Codex hook pin", () => {
  test("a changed Codex hooks file fails the generator until its digest is pinned", () => {
    const root = fixture();
    const hooks = join(root, "plugins/pstack/hooks/codex-hooks.json");
    writeFileSync(hooks, readFileSync(hooks, "utf8").replace("startup|resume|clear|compact", "startup|resume|compact|clear"));
    expect(problems(root).some((message) => message.includes("codex-hooks.json changed") && message.includes("hook-pin.json"))).toBe(true);
  });
});
