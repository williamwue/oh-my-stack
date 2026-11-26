import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { changes, loadLeadLines, plan, problems } from "../tools/generate.mjs";

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

  test("the packaged Feature entry leads to the implementation playbook and thin T3 adapter", () => {
    const entry = readFileSync(join(repo, mode), "utf8");
    expect(entry).toMatch(/playbooks\/<title>\.md/);
    expect(entry).toMatch(/, Feature, /);
    const [, reference] = entry.match(/\[the T3 mapping\]\(([^)]+)\)/) ?? [];
    expect(reference).toBeDefined();
    const host = readFileSync(join(repo, dirname(mode), reference), "utf8");
    expect(host).toMatch(/follow T3 Code's own orchestration rules/i);
    expect(host).toMatch(/never omit `model`/i);
    const feature = "poteto-mode/playbooks/feature.md";
    const implementation = /Delegate code-writing to a subagent using your configured feature model/;
    expect(readFileSync(join(repo, dirname(dirname(mode)), feature), "utf8")).toMatch(implementation);
  });

  test("Feature and Bug fix stay upstream without per-playbook T3 overrides", () => {
    const leads = loadLeadLines(repo);
    const text = readFileSync(join(repo, mapping), "utf8");
    for (const name of ["feature", "bug-fix"]) {
      const playbook = `poteto-mode/playbooks/${name}.md`;
      expect(leads.has(`plugins/pstack/skills/${playbook}`)).toBe(false);
      expect(text).not.toContain(`### \`${playbook}\``);
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

describe("T3 SessionStart model injection and Codex PreToolUse guard", () => {
  const pluginRoot = join(repo, "plugins/pstack");
  const sessionStartSh = join(pluginRoot, "hooks/session-start.sh");
  const preToolUseSh = join(pluginRoot, "hooks/codex-pre-tool-use.sh");

  function tempHome() {
    const dir = mkdtempSync(join(tmpdir(), "oms-t3-hook-"));
    made.push(dir);
    return dir;
  }

  test("session-start.sh injects active T3 model roles when ~/.config/t3-pstack/models.md exists", () => {
    const home = tempHome();
    const sheetDir = join(home, ".config/t3-pstack");
    mkdirSync(sheetDir, { recursive: true });
    writeFileSync(
      join(sheetDir, "models.md"),
      "# comment\nbug-fix: codex/gpt-6.2-sol reasoningEffort=high\njudgment and prose: antigravity/gemini-4-neon thought_level=high\nsession hook: on\n",
    );
    for (const runtime of ["codex", "claude"]) {
      const r = spawnSync("sh", [sessionStartSh, runtime], {
        env: { PATH: process.env.PATH, HOME: home, CLAUDE_PLUGIN_ROOT: pluginRoot },
        encoding: "utf8",
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("<T3_PSTACK_MODELS");
      expect(r.stdout).toContain("bug-fix: codex/gpt-6.2-sol reasoningEffort=high");
      expect(r.stdout).toContain("judgment and prose: antigravity/gemini-4-neon thought_level=high");
      expect(r.stdout).not.toContain("session hook: on");
    }
    const agy = spawnSync("sh", [sessionStartSh, "agy"], {
      cwd: pluginRoot,
      env: { PATH: process.env.PATH, HOME: home },
      encoding: "utf8",
    });
    expect(agy.status).toBe(0);
    const parsed = JSON.parse(agy.stdout);
    expect(parsed.injectSteps[0].systemMessage.systemMessage).toContain("<T3_PSTACK_MODELS");
    expect(parsed.injectSteps[0].systemMessage.systemMessage).toContain("bug-fix: codex/gpt-6.2-sol reasoningEffort=high");
  });

  test("codex-pre-tool-use.sh denies spawn_agent without model when a model sheet exists", () => {
    const home = tempHome();
    mkdirSync(join(home, ".config/t3-pstack"), { recursive: true });
    writeFileSync(join(home, ".config/t3-pstack/models.md"), "bug-fix: codex/gpt-6.2-sol reasoningEffort=high\n");

    const denied = spawnSync("sh", [preToolUseSh], {
      input: JSON.stringify({ tool_name: "collaboration:spawn_agent", tool_input: { task_name: "fix", message: "do work" } }),
      env: { PATH: process.env.PATH, HOME: home, CLAUDE_PLUGIN_ROOT: pluginRoot },
      encoding: "utf8",
    });
    expect(denied.status).toBe(0);
    const decision = JSON.parse(denied.stdout);
    expect(decision.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(decision.hookSpecificOutput.permissionDecisionReason).toContain("omitted `model`");

    const allowed = spawnSync("sh", [preToolUseSh], {
      input: JSON.stringify({ tool_name: "spawn_agent", tool_input: { task_name: "fix", model: "gpt-6.2-sol", message: "do work" } }),
      env: { PATH: process.env.PATH, HOME: home, CLAUDE_PLUGIN_ROOT: pluginRoot },
      encoding: "utf8",
    });
    expect(allowed.status).toBe(0);
    expect(allowed.stdout.trim()).toBe("");

    const otherTool = spawnSync("sh", [preToolUseSh], {
      input: JSON.stringify({ tool_name: "exec", tool_input: { cmd: "ls" } }),
      env: { PATH: process.env.PATH, HOME: home, CLAUDE_PLUGIN_ROOT: pluginRoot },
      encoding: "utf8",
    });
    expect(otherTool.status).toBe(0);
    expect(otherTool.stdout.trim()).toBe("");
  });

  test("codex-pre-tool-use.sh fails open when no model sheet exists", () => {
    const home = tempHome();
    const r = spawnSync("sh", [preToolUseSh], {
      input: JSON.stringify({ tool_name: "spawn_agent", tool_input: { task_name: "fix", message: "do work" } }),
      env: { PATH: process.env.PATH, HOME: home, CLAUDE_PLUGIN_ROOT: pluginRoot },
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("");
  });
});
