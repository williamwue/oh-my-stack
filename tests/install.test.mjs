// The installer's file-level behavior, on constructed homes: which homes it
// finds, how it repairs a stale Claude Code record, how it moves the model
// sheet, and what doctor reports. tests/install-e2e.test.mjs drives the real
// CLIs.
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { doctorAntigravity, installAntigravity } from "../tools/install/antigravity.mjs";
import { doctorClaude, installClaude, syncScopedRecords } from "../tools/install/claude.mjs";
import { AppServer, pinCheck } from "../tools/install/codex.mjs";
import { npxOrigin, parseSource, writeAtomic } from "../tools/install/common.mjs";
import { antigravityProfile, discoverHomes } from "../tools/install/homes.mjs";
import { doctorKiro, installKiro } from "../tools/install/kiro.mjs";
import { doctorSheet, moveSheet } from "../tools/install/sheet.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const { roles, tiers, retired } = JSON.parse(readFileSync(join(repoRoot, "plugins/pstack/models.t3.json"), "utf8"));
const FIX = "rerun `npx -y oh-my-stack@latest install`";

const scratch = [];
function tmp() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "t3-pstack-install-")));
  scratch.push(dir);
  return dir;
}
afterEach(() => {
  while (scratch.length) rmSync(scratch.pop(), { recursive: true, force: true });
});
const writeJson = (path, value) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
};
const mode = (path) => statSync(path).mode & 0o777;

// The plugin's own skills, and a doctor context that trusts the GitHub repo.
const SKILL = (name) => readFileSync(join(repoRoot, "plugins/pstack/skills", name, "SKILL.md"), "utf8");
const skills = new Map(["how", "why"].map((name) => [name, SKILL(name)]));
const github = parseSource("williamwue/oh-my-stack", "/home/u");
const context = { source: github, trusted: new Set([github.key]), version: "2.0.0-rc.3", skills };

// A `claude` that records each call and changes nothing.
function fakeClaude() {
  const dir = tmp();
  const bin = join(dir, "claude");
  writeFileSync(bin, `#!/bin/sh\nprintf '%s\\n' "$*" >> "${dir}/calls"\n`);
  chmodSync(bin, 0o755);
  return { bin, calls: () => (existsSync(join(dir, "calls")) ? readFileSync(join(dir, "calls"), "utf8").trim().split("\n") : []) };
}

describe("discoverHomes", () => {
  test("resolves each home as T3 does and merges the sources that name it", () => {
    const t3 = tmp();
    writeJson(join(t3, "userdata/settings.json"), {
      providerInstances: {
        claudeAgent: { driver: "claudeAgent", enabled: true, config: { binaryPath: "claude", homePath: "" } },
        claude_pool: { driver: "claudeAgent", config: { homePath: "~/.claude_pool", binaryPath: "/opt/bin/claude" } },
        claude_env: { driver: "claudeAgent", environment: [{ name: "CLAUDE_CONFIG_DIR", value: "/opt/claude-env" }] },
        codex: { driver: "codex", config: { homePath: "", shadowHomePath: "~/.codex-acct2" } },
        codex_pool: { driver: "codex", enabled: false, config: { homePath: "/home/u/.codex-pool" } },
        codex_env: { driver: "codex", config: { enabled: false }, environment: [{ name: "CODEX_HOME", value: "/opt/codex-env" }] },
        grok: { driver: "grok", enabled: true },
      },
    });
    const found = discoverHomes({
      env: { T3CODE_HOME: t3, CODEX_HOME: "/home/u/.codex-acct2", CLAUDE_CONFIG_DIR: "/srv/claude" },
      home: "/home/u",
      claudeHomes: ["~/.claude_pool"],
      codexHomes: ["/data/codex"],
    });
    expect(found).toEqual({
      homes: [
        { harness: "claude", dir: "/home/u/.claude", from: ["default", "T3 instance claudeAgent"], bin: "claude" },
        { harness: "codex", dir: "/home/u/.codex", from: ["default", "T3 instance codex"], bin: "codex" },
        { harness: "claude", dir: "/home/u/.claude_pool", from: ["T3 instance claude_pool", "--claude-home"], bin: "/opt/bin/claude" },
        { harness: "claude", dir: "/opt/claude-env", from: ["T3 instance claude_env"], bin: "claude" },
        { harness: "codex", dir: "/home/u/.codex-pool", from: ["T3 instance codex_pool (disabled)"], bin: "codex" },
        { harness: "codex", dir: "/opt/codex-env", from: ["T3 instance codex_env (disabled)"], bin: "codex" },
        { harness: "claude", dir: "/srv/claude", from: ["CLAUDE_CONFIG_DIR"], bin: "claude" },
        { harness: "codex", dir: "/data/codex", from: ["--codex-home"], bin: "codex" },
      ],
      settings: { path: join(t3, "userdata/settings.json"), instances: 6, error: undefined, secrets: [] },
    });
  });

  test("finds each Antigravity instance's profile where T3 keeps it, and needs no CLI for it", () => {
    const t3 = tmp();
    writeJson(join(t3, "userdata/settings.json"), {
      providerInstances: {
        antigravity: { driver: "antigravity", displayName: "Antigravity", enabled: true },
        agy_work: { driver: "antigravity", enabled: false },
      },
    });
    const found = discoverHomes({ env: { T3CODE_HOME: t3 }, home: "/home/u" });
    // T3's own profile for the default instance, as this machine's T3 named it.
    const profiles = join(t3, "userdata/providers/antigravity");
    expect(found.homes.slice(2)).toEqual([
      {
        harness: "antigravity",
        dir: join(profiles, "ac0a3dfd6dddb20962cecff6ee5fe65e19d3923be20e52c5ab52ff877f7e4c32"),
        from: ["T3 instance antigravity"],
        bin: null,
      },
      { harness: "antigravity", dir: antigravityProfile(join(t3, "userdata/settings.json"), "agy_work"), from: ["T3 instance agy_work (disabled)"], bin: null },
    ]);
    expect(found.settings.instances).toBe(2);
  });

  test("finds each kiro instance's home in its KIRO_HOME, else ~/.kiro, and its CLI, else kiro-cli", () => {
    const t3 = tmp();
    writeJson(join(t3, "userdata/settings.json"), {
      providerInstances: {
        // Kiro settings have no home path, so T3 ignores a homePath there.
        kiro: { driver: "kiro", enabled: false, config: { homePath: "/srv/ignored" } },
        kiro_work: {
          driver: "kiro",
          environment: [{ name: "KIRO_HOME", value: "/home/u/.kiro-work" }],
          config: { binaryPath: "~/bin/kiro-cli", homePath: "/srv/ignored" },
        },
      },
      // The configured kiro instance is the one this override turns on.
      projectSettingsOverrides: { web: { providerInstances: { kiro: { enabled: true } } } },
    });
    const found = discoverHomes({ env: { T3CODE_HOME: t3 }, home: "/home/u" });
    expect(found.homes.slice(2)).toEqual([
      { harness: "kiro", dir: "/home/u/.kiro", from: ["T3 instance kiro (disabled)"], bin: "kiro-cli" },
      { harness: "kiro", dir: "/home/u/.kiro-work", from: ["T3 instance kiro_work"], bin: "/home/u/bin/kiro-cli" },
    ]);
    expect(found.settings.instances).toBe(2);
  });

  test("finds T3's unconfigured kiro instance only where a project turns it on", () => {
    const t3 = tmp();
    const kiroHomes = (projectSettingsOverrides) => {
      writeJson(join(t3, "userdata/settings.json"), { providerInstances: {}, projectSettingsOverrides });
      return discoverHomes({ env: { T3CODE_HOME: t3 }, home: "/home/u" }).homes.filter((h) => h.harness === "kiro");
    };
    expect(kiroHomes({ web: { providerInstances: { kiro: { enabled: false }, codex: { enabled: true } } } })).toEqual([]);
    expect(kiroHomes({ web: {}, api: { providerInstances: { kiro: { enabled: true } } } })).toEqual([
      { harness: "kiro", dir: "/home/u/.kiro", from: ["T3 instance kiro (on in a project)"], bin: "kiro-cli" },
    ]);
  });

  test("finds the shell's KIRO_HOME and each --kiro-home", () => {
    const found = discoverHomes({ env: { T3CODE_HOME: tmp(), KIRO_HOME: "/srv/kiro" }, home: "/home/u", kiroHomes: ["~/.kiro-alt", "/srv/kiro"] });
    expect(found.homes.slice(2)).toEqual([
      { harness: "kiro", dir: "/srv/kiro", from: ["KIRO_HOME", "--kiro-home"], bin: "kiro-cli" },
      { harness: "kiro", dir: "/home/u/.kiro-alt", from: ["--kiro-home"], bin: "kiro-cli" },
    ]);
  });

  test("collapses `..` in a KIRO_HOME before it resolves symlinks, as kiro-cli does", () => {
    const root = tmp();
    mkdirSync(join(root, "x/y"), { recursive: true });
    mkdirSync(join(root, "x/c"));
    symlinkSync(join(root, "x/y"), join(root, "link-b"));
    const found = discoverHomes({ env: { T3CODE_HOME: tmp(), KIRO_HOME: `${root}/link-b/../c` }, home: "/home/u" });
    expect(found.homes.slice(2)).toEqual([{ harness: "kiro", dir: join(root, "c"), from: ["KIRO_HOME"], bin: "kiro-cli" }]);
  });

  test("expands a leading ~ in an instance's home variable and binary as T3 does", () => {
    const t3 = tmp();
    writeJson(join(t3, "userdata/settings.json"), {
      providerInstances: {
        claude_env: { driver: "claudeAgent", environment: [{ name: "CLAUDE_CONFIG_DIR", value: "~/.claude-env" }], config: { binaryPath: "~/bin/claude" } },
        codex_env: { driver: "codex", environment: [{ name: "CODEX_HOME", value: "~\\.codex-env" }] },
      },
    });
    const { homes } = discoverHomes({ env: { T3CODE_HOME: t3 }, home: "/home/u" });
    expect(homes.slice(2)).toEqual([
      { harness: "claude", dir: "/home/u/.claude-env", from: ["T3 instance claude_env"], bin: "/home/u/bin/claude" },
      { harness: "codex", dir: "/home/u/.codex-env", from: ["T3 instance codex_env"], bin: "codex" },
    ]);
  });

  test("reports T3 settings that do not parse without quoting them", () => {
    const t3 = tmp();
    mkdirSync(join(t3, "userdata"), { recursive: true });
    writeFileSync(join(t3, "userdata/settings.json"), '{"providerInstances": {"codex": {"environment": [{"name": "OPENAI_API_KEY", "value": "sk-live-123');
    expect(discoverHomes({ env: { T3CODE_HOME: t3 }, home: "/home/u" }).settings).toEqual({
      path: join(t3, "userdata/settings.json"),
      instances: 0,
      error: "invalid JSON",
      secrets: [],
    });
  });

  test("falls back to the defaults when T3's settings are missing", () => {
    const t3 = tmp();
    expect(discoverHomes({ env: { T3CODE_HOME: t3 }, home: "/home/u" })).toEqual({
      homes: [
        { harness: "claude", dir: "/home/u/.claude", from: ["default"], bin: "claude" },
        { harness: "codex", dir: "/home/u/.codex", from: ["default"], bin: "codex" },
      ],
      settings: { path: join(t3, "userdata/settings.json"), instances: 0, error: "not found", secrets: [] },
    });
  });
});

// The record a second config home keeps re-acquiring for the home folder.
function claudeHome({ autoUpdate } = {}) {
  const dir = tmp();
  const user = {
    scope: "user",
    installPath: `${dir}/plugins/cache/oms/pstack/2.0.0-rc.3`,
    version: "2.0.0-rc.3",
    installedAt: "2026-10-06T08:38:28.344Z",
    lastUpdated: "2026-10-14T11:20:44.228Z",
    gitCommitSha: "1111111111111111111111111111111111111111",
  };
  const project = {
    scope: "project",
    projectPath: "/home/u",
    installPath: `${dir}/plugins/cache/oms/pstack/1.0.11`,
    version: "1.0.11",
    installedAt: "2026-10-13T04:43:26.759Z",
    lastUpdated: "2026-10-13T04:43:26.759Z",
    gitCommitSha: "0000000000000000000000000000000000000000",
  };
  const other = { scope: "project", projectPath: "/home/u", installPath: "/x", version: "0.1.0" };
  writeJson(join(user.installPath, ".claude-plugin/plugin.json"), { name: "pstack", version: user.version });
  for (const [name, text] of skills) {
    mkdirSync(join(user.installPath, "skills", name), { recursive: true });
    writeFileSync(join(user.installPath, "skills", name, "SKILL.md"), text);
  }
  writeJson(join(dir, "plugins/installed_plugins.json"), {
    version: 2,
    plugins: { "pstack@oms": [user, project], "other@market": [other] },
  });
  writeJson(join(dir, "settings.json"), {
    enabledPlugins: { "pstack@oms": true },
    extraKnownMarketplaces: {
      oms: { source: { source: "github", repo: "williamwue/oh-my-stack" }, ...(autoUpdate && { autoUpdate }) },
    },
  });
  return { dir, user, project, other };
}

describe("a stale other-scope Claude Code record", () => {
  test("moves to the user-scope install, after a backup, and only once", () => {
    const { dir, user, project, other } = claudeHome();
    const path = join(dir, "plugins/installed_plugins.json");
    const original = readFileSync(path, "utf8");

    const steps = syncScopedRecords(dir);
    const backups = readdirSync(join(dir, "plugins")).filter((name) => name.endsWith(".bak"));
    expect(backups).toHaveLength(1);
    expect(steps).toEqual([
      "moved the project-scope record for /home/u from 1.0.11 to 2.0.0-rc.3",
      `backed up plugins/installed_plugins.json to ${join(dir, "plugins", backups[0])}`,
    ]);
    expect(readFileSync(join(dir, "plugins", backups[0]), "utf8")).toBe(original);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      version: 2,
      plugins: {
        "pstack@oms": [
          user,
          { ...project, installPath: user.installPath, version: user.version, gitCommitSha: user.gitCommitSha, lastUpdated: user.lastUpdated },
        ],
        "other@market": [other],
      },
    });

    const fixed = readFileSync(path, "utf8");
    expect(syncScopedRecords(dir)).toEqual([]);
    expect(readFileSync(path, "utf8")).toBe(fixed);
    expect(readdirSync(join(dir, "plugins")).filter((name) => name.endsWith(".bak"))).toHaveLength(1);
  });

  test("keeps the records file's mode, and its backup's", () => {
    const { dir } = claudeHome();
    const path = join(dir, "plugins/installed_plugins.json");
    chmodSync(path, 0o600);
    syncScopedRecords(dir);
    const backup = readdirSync(join(dir, "plugins")).find((name) => name.endsWith(".bak"));
    expect([mode(path), mode(join(dir, "plugins", backup))]).toEqual([0o600, 0o600]);
  });

  test("doctor names it, the missing auto-update, and plain skill copies, and passes once they are fixed", () => {
    const { dir } = claudeHome();
    mkdirSync(join(dir, "skills/how"), { recursive: true });
    writeFileSync(join(dir, "skills/how/SKILL.md"), SKILL("how"));
    const home = { harness: "claude", dir, from: ["default"], bin: "claude" };
    expect(doctorClaude(home, context)).toEqual([
      { name: "marketplace", ok: true, detail: "williamwue/oh-my-stack" },
      { name: "installed", ok: true, detail: "2.0.0-rc.3" },
      { name: "enabled", ok: true, detail: "yes" },
      { name: "marketplace auto-update", ok: false, detail: "false", fix: FIX },
      { name: "other-scope records", ok: false, detail: "project /home/u at 1.0.11", fix: FIX },
      {
        name: "no plain copies of plugin skills",
        ok: false,
        detail: join(dir, "skills/how"),
        fix: "delete these folders; the plugin ships the same skills",
      },
    ]);
    expect(doctorClaude(home, { ...context, version: "2.0.0-rc.4" })[1]).toEqual({
      name: "installed",
      ok: false,
      detail: "2.0.0-rc.3, expected 2.0.0-rc.4",
      fix: FIX,
    });

    syncScopedRecords(dir);
    rmSync(join(dir, "skills"), { recursive: true });
    const settings = JSON.parse(readFileSync(join(dir, "settings.json"), "utf8"));
    settings.extraKnownMarketplaces.oms.autoUpdate = true;
    writeJson(join(dir, "settings.json"), settings);
    expect(doctorClaude(home, context).filter((c) => !c.ok)).toEqual([]);
  });

  test("doctor leaves a user's own skill that shares a plugin skill's name", () => {
    const { dir } = claudeHome({ autoUpdate: true });
    syncScopedRecords(dir);
    mkdirSync(join(dir, "skills/how"), { recursive: true });
    writeFileSync(join(dir, "skills/how/SKILL.md"), "---\nname: how\ndescription: My own notes on how things work.\n---\n");
    const home = { harness: "claude", dir, from: ["default"], bin: "claude" };
    expect(doctorClaude(home, context).filter((c) => !c.ok)).toEqual([]);
  });

  test("doctor fails an install whose files are gone, and install reinstalls it", () => {
    const { dir, user } = claudeHome({ autoUpdate: true });
    syncScopedRecords(dir);
    rmSync(user.installPath, { recursive: true });
    const claude = fakeClaude();
    const home = { harness: "claude", dir, from: ["default"], bin: claude.bin };
    expect(doctorClaude(home, context).filter((c) => !c.ok)).toEqual([
      { name: "installed", ok: false, detail: `2.0.0-rc.3, but its files at ${user.installPath} are missing`, fix: FIX },
    ]);
    expect(installClaude(home, context)).toEqual(["reinstalled 2.0.0-rc.3, whose files were missing"]);
    expect(claude.calls()).toEqual(["plugin install pstack@oms --scope user"]);
  });

  test("install says so when the marketplace has no newer version to update to", () => {
    const { dir } = claudeHome({ autoUpdate: true });
    syncScopedRecords(dir);
    const claude = fakeClaude();
    const home = { harness: "claude", dir, from: ["default"], bin: claude.bin };
    expect(installClaude(home, { ...context, version: "2.0.0-rc.4" })).toEqual(["the marketplace has no 2.0.0-rc.4, so it stays at 2.0.0-rc.3"]);
    expect(claude.calls()).toEqual(["plugin marketplace update oms", "plugin update pstack@oms --scope user"]);
  });

  test("doctor reports settings.json that does not parse by path alone", () => {
    const { dir } = claudeHome();
    writeFileSync(join(dir, "settings.json"), '{"env": {"ANTHROPIC_API_KEY": "sk-ant-live-123"');
    const home = { harness: "claude", dir, from: ["default"], bin: "claude" };
    expect(() => doctorClaude(home, context)).toThrow(new Error(`${join(dir, "settings.json")}: invalid JSON`));
  });

  test("turning on auto-update keeps settings.json's mode", () => {
    const { dir } = claudeHome();
    chmodSync(join(dir, "settings.json"), 0o600);
    const claude = fakeClaude();
    const steps = installClaude({ harness: "claude", dir, from: ["default"], bin: claude.bin }, context);
    expect(steps[0]).toBe("turned on marketplace auto-update");
    expect(mode(join(dir, "settings.json"))).toBe(0o600);
  });
});

describe("a t3-pstack marketplace from another source", () => {
  function counterfeit() {
    const { dir } = claudeHome({ autoUpdate: true });
    const elsewhere = tmp();
    const settings = JSON.parse(readFileSync(join(dir, "settings.json"), "utf8"));
    settings.extraKnownMarketplaces.oms.source = { source: "directory", path: elsewhere };
    writeJson(join(dir, "settings.json"), settings);
    rmSync(join(dir, "plugins/installed_plugins.json"));
    return { dir, elsewhere };
  }

  test("installs nothing, and doctor fails it with the source", () => {
    const { dir, elsewhere } = counterfeit();
    const claude = fakeClaude();
    const home = { harness: "claude", dir, from: ["default"], bin: claude.bin };
    expect(installClaude(home, context)).toEqual([]);
    expect(claude.calls()).toEqual([]);
    expect(doctorClaude(home, context)[0]).toEqual({
      name: "marketplace",
      ok: false,
      detail: `${elsewhere}, which is neither williamwue/oh-my-stack nor --source`,
      fix: `if you trust it, rerun with --source ${elsewhere}; otherwise remove it with \`CLAUDE_CONFIG_DIR=${dir} claude plugin marketplace remove oms\`, then ${FIX}`,
    });
  });

  test("is trusted when it is this run's --source", () => {
    const { dir, elsewhere } = counterfeit();
    const local = parseSource(elsewhere, "/home/u");
    const home = { harness: "claude", dir, from: ["default"], bin: "claude" };
    expect(doctorClaude(home, { ...context, source: local, trusted: new Set([github.key, local.key]) })[0]).toEqual({
      name: "marketplace",
      ok: true,
      detail: elsewhere,
    });
  });
});

describe("--source", () => {
  test("reads owner/repo as GitHub even where that relative directory exists, and a URL to the same repository as the same source", () => {
    const cwd = tmp();
    mkdirSync(join(cwd, "williamwue/oh-my-stack"), { recursive: true });
    const r = spawnSync(process.execPath, [join(repoRoot, "tools/install.mjs"), "doctor", "--source", "williamwue/oh-my-stack", "--json"], {
      cwd,
      env: { HOME: tmp(), PATH: tmp() },
      encoding: "utf8",
    });
    expect({ status: r.status, stderr: r.stderr, source: r.status === 0 && JSON.parse(r.stdout).source }).toEqual({
      status: 0,
      stderr: "",
      source: "williamwue/oh-my-stack",
    });
    expect(parseSource("git@github.com:WilliamWue/oh-my-stack.git", "/home/u").key).toBe(github.key);
    expect(parseSource("https://github.com/williamwue/oh-my-stack", "/home/u").key).toBe(github.key);
    expect(() => parseSource("./missing", cwd)).toThrow("--source ./missing: not owner/repo, a Git URL, or an existing directory");
  });

  test("is in every fix doctor prints, and a GitHub --source runs that repository's installer", () => {
    const claude = fakeClaude();
    const doctor = (source) => {
      const r = spawnSync(process.execPath, [join(repoRoot, "tools/install.mjs"), "doctor", "--source", source, "--json"], {
        env: { HOME: tmp(), PATH: join(claude.bin, "..") },
        encoding: "utf8",
      });
      return JSON.parse(r.stdout).homes.find((row) => row.harness === "claude").checks;
    };
    expect(doctor("someone/t3-pstack")).toEqual([
      {
        name: "installed",
        ok: false,
        detail: "the home does not exist",
        fix: "rerun `npx -y oh-my-stack@latest install --source someone/t3-pstack`",
      },
    ]);
    const local = resolve(repoRoot);
    expect(doctor(local)[0].fix).toBe(`rerun \`npx -y oh-my-stack@latest install --source ${local}\``);

    const fork = parseSource("someone/t3-pstack", "/home/u");
    const home = { harness: "claude", dir: tmp(), from: ["default"], bin: "claude" };
    const fixes = doctorClaude(home, { ...context, source: fork, trusted: new Set([github.key, fork.key]) })
      .filter((c) => !c.ok)
      .map((c) => c.fix);
    expect(fixes).toEqual(Array(4).fill("rerun `npx -y oh-my-stack@latest install --source someone/t3-pstack`"));
  });

  test("leaves a home on williamwue/oh-my-stack where it is, and doctor warns with the commands that switch it", () => {
    const { dir } = claudeHome();
    syncScopedRecords(dir);
    const fork = parseSource("someone/t3-pstack", "/home/u");
    const forked = { ...context, source: fork, trusted: new Set([github.key, fork.key]) };
    const claude = fakeClaude();
    const home = { harness: "claude", dir, from: ["default"], bin: claude.bin };
    expect(installClaude(home, forked)).toEqual(["turned on marketplace auto-update"]);
    expect(doctorClaude(home, forked)[0]).toEqual({
      name: "marketplace",
      ok: false,
      warn: true,
      detail: "williamwue/oh-my-stack, not --source someone/t3-pstack",
      fix:
        `to install from someone/t3-pstack, remove it with \`CLAUDE_CONFIG_DIR=${dir} claude plugin marketplace remove oms\`, ` +
        "then rerun `npx -y oh-my-stack@latest install --source someone/t3-pstack`",
    });
  });
});

describe("files the installer replaces", () => {
  test("keep their mode", () => {
    const path = join(tmp(), "settings.json");
    writeFileSync(path, "{}\n", { mode: 0o600 });
    writeAtomic(path, '{"a": 1}\n');
    expect([readFileSync(path, "utf8"), mode(path)]).toEqual(['{"a": 1}\n', 0o600]);
  });
});

describe("codex app-server output that is not JSON-RPC", () => {
  test("fails the request instead of crashing the run", async () => {
    const dir = tmp();
    const bin = join(dir, "codex");
    writeFileSync(bin, "#!/bin/sh\necho 'token sk-live-123 expired'\nexec cat >/dev/null\n");
    chmodSync(bin, 0o755);
    await expect(AppServer.start({ dir, bin })).rejects.toThrow(new Error("codex app-server printed a line that is not JSON-RPC"));
  });
});

describe("doctor's check of a Codex marketplace's pin", () => {
  test("passes on this release's tag, and on a local directory, which has no tag", () => {
    const git = { source_type: "git", source: "https://github.com/williamwue/oh-my-stack.git" };
    const pin = (marketplace) => pinCheck(marketplace, "v2.2.5", FIX);
    expect(pin({ ...git, ref: "v2.2.5" })).toEqual({ name: "marketplace pin", ok: true, detail: "v2.2.5" });
    expect(pin({ source_type: "local", source: "/src/t3-pstack" })).toEqual({
      name: "marketplace pin",
      ok: true,
      detail: "none, since a local directory has no tag",
    });
    expect([git, { ...git, ref: "v2.2.3" }, { ...git, ref: "main" }, undefined].map(pin)).toEqual(
      ["none, expected v2.2.5", "v2.2.3, expected v2.2.5", "main, expected v2.2.5", "no marketplace"].map((detail) => ({
        name: "marketplace pin",
        ok: false,
        detail,
        fix: FIX,
      })),
    );
  });
});

describe("the model sheet", () => {
  const SHEET = "# budget: large (xhigh)\nbug-fix: inherit-parent\nsession hook: on\n";

  function machine() {
    const root = tmp();
    const homes = [".claude", ".codex", ".codex-pool", ".claude-never-run"].map((name) => ({ dir: join(root, name) }));
    for (const { dir } of homes.slice(0, 3)) mkdirSync(dir);
    return { root, homes, sheet: join(root, ".config/t3-pstack/models.md") };
  }

  test("moves a linked home sheet to the machine path once and links every existing home to it", () => {
    const { root, homes, sheet } = machine();
    writeFileSync(join(root, ".claude/t3-pstack-models.md"), SHEET);
    symlinkSync(join(root, ".claude/t3-pstack-models.md"), join(root, ".codex/t3-pstack-models.md"));

    expect(moveSheet(sheet, homes)).toEqual([
      `moved the sheet from ${join(root, ".claude/t3-pstack-models.md")}`,
      `linked ${join(root, ".claude/t3-pstack-models.md")} to it`,
      `linked ${join(root, ".codex-pool/t3-pstack-models.md")} to it`,
    ]);
    expect(readFileSync(sheet, "utf8")).toBe(SHEET);
    expect(readlinkSync(join(root, ".claude/t3-pstack-models.md"))).toBe(sheet);
    expect(readlinkSync(join(root, ".codex/t3-pstack-models.md"))).toBe(join(root, ".claude/t3-pstack-models.md"));
    expect(readlinkSync(join(root, ".codex-pool/t3-pstack-models.md"))).toBe(sheet);
    expect(existsSync(join(root, ".claude-never-run"))).toBe(false);

    expect(moveSheet(sheet, homes)).toEqual([]);
    expect(doctorSheet(sheet, homes, { catalog: null, roles, tiers, hint: FIX })).toEqual([
      { name: "machine sheet valid", ok: true, detail: "every line parses (pass --catalog to check targets)" },
      { name: "home sheets", ok: true, detail: "none differ from it" },
    ]);
  });

  test("links the machine path to a home sheet's file outside every home instead of copying it", () => {
    const { root, homes, sheet } = machine();
    const dotfiles = join(root, "dotfiles/t3-pstack-models.md");
    mkdirSync(join(root, "dotfiles"));
    writeFileSync(dotfiles, SHEET);
    symlinkSync(dotfiles, join(root, ".claude/t3-pstack-models.md"));
    writeFileSync(join(root, ".codex/t3-pstack-models.md"), SHEET);

    expect(moveSheet(sheet, homes)).toEqual([
      `linked the sheet to ${dotfiles}`,
      `linked ${join(root, ".codex/t3-pstack-models.md")} to it`,
      `linked ${join(root, ".codex-pool/t3-pstack-models.md")} to it`,
    ]);
    expect(readlinkSync(sheet)).toBe(dotfiles);
    expect(readlinkSync(join(root, ".claude/t3-pstack-models.md"))).toBe(dotfiles);
    expect(readFileSync(dotfiles, "utf8")).toBe(SHEET);
    expect(moveSheet(sheet, homes)).toEqual([]);
  });

  test("keeps a home sheet that links to another file, even one that matches the machine sheet", () => {
    const { root, homes, sheet } = machine();
    mkdirSync(join(root, ".config/t3-pstack"), { recursive: true });
    writeFileSync(sheet, SHEET);
    mkdirSync(join(root, "dotfiles"));
    writeFileSync(join(root, "dotfiles/models.md"), SHEET);
    symlinkSync(join(root, "dotfiles/models.md"), join(root, ".claude/t3-pstack-models.md"));

    expect(moveSheet(sheet, homes)).toEqual([
      `linked ${join(root, ".codex/t3-pstack-models.md")} to it`,
      `linked ${join(root, ".codex-pool/t3-pstack-models.md")} to it`,
    ]);
    expect(readlinkSync(join(root, ".claude/t3-pstack-models.md"))).toBe(join(root, "dotfiles/models.md"));
  });

  test("moves a sheet with its mode, and leaves a file beside it that only shares the old temp name", () => {
    const { root, homes, sheet } = machine();
    writeFileSync(join(root, ".claude/t3-pstack-models.md"), SHEET, { mode: 0o600 });
    writeFileSync(join(root, ".claude/t3-pstack-models.md.t3-pstack-link"), "mine\n");

    moveSheet(sheet, homes);
    expect(mode(sheet)).toBe(0o600);
    expect(readFileSync(join(root, ".claude/t3-pstack-models.md.t3-pstack-link"), "utf8")).toBe("mine\n");
    expect(readdirSync(join(root, ".claude")).sort()).toEqual(["t3-pstack-models.md", "t3-pstack-models.md.t3-pstack-link"]);
  });

  test("leaves home sheets that disagree, and doctor says so", () => {
    const { root, homes, sheet } = machine();
    writeFileSync(join(root, ".claude/t3-pstack-models.md"), SHEET);
    writeFileSync(join(root, ".codex/t3-pstack-models.md"), "session hook: off\n");

    expect(moveSheet(sheet, homes)).toEqual([]);
    expect(existsSync(sheet)).toBe(false);
    expect(doctorSheet(sheet, homes, { catalog: null, roles, tiers, hint: FIX })).toEqual([
      {
        name: "machine sheet",
        ok: false,
        detail: `missing; ${join(root, ".claude/t3-pstack-models.md")}, ${join(root, ".codex/t3-pstack-models.md")} differ, so the installer leaves them`,
        fix: `keep one, then ${FIX}`,
      },
    ]);
  });

  test("keeps a home sheet that differs from an existing machine sheet, and links one that matches", () => {
    const { root, homes, sheet } = machine();
    mkdirSync(join(root, ".config/t3-pstack"), { recursive: true });
    writeFileSync(sheet, SHEET);
    writeFileSync(join(root, ".claude/t3-pstack-models.md"), SHEET);
    writeFileSync(join(root, ".codex/t3-pstack-models.md"), "session hook: off\n");

    expect(moveSheet(sheet, homes)).toEqual([
      `linked ${join(root, ".claude/t3-pstack-models.md")} to it`,
      `linked ${join(root, ".codex-pool/t3-pstack-models.md")} to it`,
    ]);
    expect(lstatSync(join(root, ".codex/t3-pstack-models.md")).isSymbolicLink()).toBe(false);
    expect(doctorSheet(sheet, homes, { catalog: null, roles, tiers, hint: FIX })[1]).toEqual({
      name: "home sheets",
      ok: false,
      detail: `${join(root, ".codex/t3-pstack-models.md")} differ from the machine sheet`,
      fix: `move each aside, then ${FIX} to link it`,
    });
  });

  test("doctor uses defaults without a sheet and fails on a malformed one", () => {
    const { homes, sheet } = machine();
    expect(doctorSheet(sheet, homes, { catalog: null, roles, tiers, hint: FIX })).toEqual([
      {
        name: "model defaults",
        ok: true,
        detail: "built-in medium profile (pass --catalog to check targets)",
      },
    ]);
    mkdirSync(join(sheet, ".."), { recursive: true });
    writeFileSync(sheet, "bug-fix: claude-opus\nhow critics: inherit-parent\n");
    expect(doctorSheet(sheet, homes, { catalog: null, roles, tiers, hint: FIX })[0]).toEqual({
      name: "machine sheet valid",
      ok: false,
      detail: 'bug-fix: "claude-opus" does not start with <providerInstanceId>/<modelId>; "how critics" is not a pstack role',
      fix: "run /pstack:setup-pstack in a T3 thread",
    });
  });

  test("doctor --catalog validates the effective roles with missing and partial sheets without writing", () => {
    const { root, sheet } = machine();
    const node = spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim();
    const catalog = join(root, "catalog.json");
    const fixture = readFileSync(join(repoRoot, "tests/fixtures/t3-catalog.json"), "utf8");
    const run = () => {
      const before = treeState(root);
      const r = spawnSync(node, [join(repoRoot, "tools/install.mjs"), "doctor", "--catalog", catalog, "--json"], {
        env: { HOME: root, PATH: root },
        encoding: "utf8",
      });
      expect(r.stderr).toBe("");
      expect(treeState(root)).toEqual(before);
      return { status: r.status, checks: JSON.parse(r.stdout).sheet.checks };
    };

    writeFileSync(catalog, fixture);
    expect(run()).toEqual({ status: 0, checks: [{ name: "model defaults", ok: true, detail: "built-in medium profile matches the catalog" }] });
    const missingAstra = JSON.parse(fixture);
    const codexModels = missingAstra.providers.find((p) => p.providerInstanceId === "codex").models;
    missingAstra.providers.find((p) => p.providerInstanceId === "codex").models = codexModels.filter((m) => m.id !== "gpt-6.2-astra");
    writeFileSync(catalog, JSON.stringify(missingAstra));
    const unavailable = 'strongest judgment (no line, tier default): codex/gpt-6.2-astra: "codex" does not list model "gpt-6.2-astra"';
    const rMissing = run();
    expect(rMissing.status).toBe(1);
    expect(rMissing.checks[0].name).toBe("model defaults");
    expect(rMissing.checks[0].ok).toBe(false);
    expect(rMissing.checks[0].detail).toContain(unavailable);
    expect(existsSync(sheet)).toBe(false);

    mkdirSync(join(sheet, ".."), { recursive: true });
    writeFileSync(sheet, "bug-fix: auto\n");
    const rPartial = run();
    expect(rPartial.status).toBe(1);
    expect(rPartial.checks[0].ok).toBe(false);
    expect(rPartial.checks[0].detail).toContain(unavailable);
    expect(rPartial.checks[1]).toMatchObject({ name: "home sheets", ok: true });
    writeFileSync(
      sheet,
      [
        "bug-fix: auto",
        "strongest judgment: inherit-parent",
        "arena runners: claudeAgent/claude-opus-5-5 effort=high, antigravity/gemini-4-neon thought_level=xhigh",
        "interrogate reviewers: claudeAgent/claude-opus-5-5 effort=high, antigravity/gemini-4-neon thought_level=xhigh",
      ].join("\n") + "\n",
    );
    expect(run()).toMatchObject({ status: 0, checks: [{ name: "machine sheet valid", ok: true }, { name: "home sheets", ok: true }] });
    writeFileSync(sheet, "swarm workers: grok/grok-9\n");
    const rBad = run();
    expect(rBad.status).toBe(1);
    expect(rBad.checks[0].detail).toContain('swarm workers: grok/grok-9: "grok" does not list model "grok-9"');
  });

  test("doctor passes a sheet that still carries retired lines, and warns that setup-pstack drops them", () => {
    const { homes, sheet } = machine();
    mkdirSync(join(sheet, ".."), { recursive: true });
    const released = [
      "bug-fix: claudeAgent/claude-opus-5-5 effort=xhigh",
      "how explorer: claudeAgent/claude-opus-5-5 effort=medium",
      "hardest tasks: claudeAgent/claude-fable-5-2 effort=max",
      "reflect tooling: claudeAgent/claude-opus-5-5 effort=high fastMode=true",
    ];
    writeFileSync(sheet, `${released.join("\n")}\n`);
    expect(doctorSheet(sheet, homes, { catalog: null, roles, tiers, retired, hint: FIX })).toEqual([
      { name: "machine sheet valid", ok: true, detail: "every line parses (pass --catalog to check targets)" },
      { name: "home sheets", ok: true, detail: "none differ from it" },
      {
        name: "retired roles",
        ok: false,
        detail: 'no skill reads "how explorer", "hardest tasks", "reflect tooling"',
        fix: "run /pstack:setup-pstack in a T3 thread, which drops them",
        warn: true,
      },
    ]);
  });
});

// An Antigravity profile as T3 leaves it after a first start, holding agy's
// own config and no plugin.
function antigravityHome() {
  const dir = tmp();
  writeJson(join(dir, "config/config.json"), { plugins: { swarm: { enabled: true } } });
  return { harness: "antigravity", dir, from: ["T3 instance antigravity"], bin: null };
}
const pluginRoot = join(repoRoot, "plugins/pstack");
const shipped = JSON.parse(readFileSync(join(pluginRoot, ".antigravity-plugin/plugin.json"), "utf8")).version;
const agy = { pluginRoot, version: shipped, skills, hint: FIX };
const installedAt = (home) => join(home.dir, "config/plugins/pstack");

describe("Antigravity", () => {
  test("copies the plugin into the profile, where agy discovers it, and a second run changes nothing", () => {
    const home = antigravityHome();
    expect(installAntigravity(home, agy)).toEqual([`installed ${shipped}`]);
    for (const file of ["hooks.json", ".antigravity-plugin/plugin.json", "hooks/session-start.sh", "skills/poteto-mode/SKILL.md"]) {
      expect(readFileSync(join(installedAt(home), file))).toEqual(readFileSync(join(pluginRoot, file)));
    }
    expect(installAntigravity(home, agy)).toEqual([]);
    expect(readdirSync(join(home.dir, "config/plugins"))).toEqual(["pstack"]);
    expect(doctorAntigravity(home, agy)).toEqual([
      { name: "installed", ok: true, detail: shipped },
      { name: "enabled", ok: true, detail: "yes" },
    ]);
  });

  test("replaces an older copy whole, so a file the release dropped goes with it", () => {
    const home = antigravityHome();
    installAntigravity(home, agy);
    writeJson(join(installedAt(home), ".antigravity-plugin/plugin.json"), { name: "pstack", version: "2.3.0" });
    writeFileSync(join(installedAt(home), "dropped.md"), "gone in this release\n");
    expect(doctorAntigravity(home, agy)[0]).toEqual({ name: "installed", ok: false, detail: `2.3.0, expected ${shipped}`, fix: FIX });
    expect(installAntigravity(home, agy)).toEqual([`updated 2.3.0 to ${shipped}`]);
    expect(existsSync(join(installedAt(home), "dropped.md"))).toBe(false);
    expect(readdirSync(join(home.dir, "config/plugins"))).toEqual(["pstack"]);
  });

  test("migrates a legacy t3-pstack directory to pstack and flags it in doctor until removed", () => {
    const home = antigravityHome();
    const legacy = join(home.dir, "config/plugins/t3-pstack");
    writeJson(join(legacy, ".antigravity-plugin/plugin.json"), { name: "pstack", version: shipped });
    expect(doctorAntigravity(home, agy)).toEqual([
      { name: "installed", ok: false, detail: "not installed", fix: FIX },
      { name: "enabled", ok: true, detail: "yes" },
      { name: "legacy", ok: false, detail: `legacy plugin directory still exists at ${legacy}`, fix: FIX },
    ]);
    expect(installAntigravity(home, agy)).toEqual([`installed ${shipped}`, "removed legacy t3-pstack"]);
    expect(existsSync(legacy)).toBe(false);
    expect(readdirSync(join(home.dir, "config/plugins"))).toEqual(["pstack"]);
    expect(installAntigravity(home, agy)).toEqual([]);
    expect(doctorAntigravity(home, agy)).toEqual([
      { name: "installed", ok: true, detail: shipped },
      { name: "enabled", ok: true, detail: "yes" },
    ]);
  });

  test("reinstalls a copy whose skills are missing", () => {
    const home = antigravityHome();
    installAntigravity(home, agy);
    rmSync(join(installedAt(home), "skills/how"), { recursive: true });
    expect(doctorAntigravity(home, agy)[0]).toMatchObject({ ok: false, detail: `${shipped}, but its files at ${installedAt(home)} are missing or changed` });
    expect(installAntigravity(home, agy)).toEqual([`reinstalled ${shipped}, whose files were missing or changed`]);
    expect(existsSync(join(installedAt(home), "skills/how/SKILL.md"))).toBe(true);
  });

  test("reinstalls a copy whose session-start hook files are missing or changed", () => {
    const remove = (path) => rmSync(path);
    const change = (path) => writeFileSync(path, "changed\n");
    for (const [file, damage] of [
      ["hooks.json", remove],
      ["hooks/session-start.sh", remove],
      ["hooks/session-start-context.md", change],
      ["skills/setup-pstack/scripts/read-sheet.sh", remove],
    ]) {
      const home = antigravityHome();
      installAntigravity(home, agy);
      damage(join(installedAt(home), file));
      expect(doctorAntigravity(home, agy)[0]).toMatchObject({ ok: false, detail: `${shipped}, but its files at ${installedAt(home)} are missing or changed` });
      expect(installAntigravity(home, agy)).toEqual([`reinstalled ${shipped}, whose files were missing or changed`]);
      expect(readFileSync(join(installedAt(home), file))).toEqual(readFileSync(join(pluginRoot, file)));
    }
  });

  test("creates a profile T3 has not started yet, private as T3 keeps it", () => {
    const home = { harness: "antigravity", dir: join(tmp(), "providers/antigravity/abc"), from: [], bin: null };
    expect(installAntigravity(home, agy)).toEqual([`installed ${shipped}`]);
    expect(mode(home.dir)).toBe(0o700);
    expect(doctorAntigravity(home, agy).every((c) => c.ok)).toBe(true);
  });

  test("doctor fails a plugin the profile's config turns off, and never edits that config", () => {
    const home = antigravityHome();
    installAntigravity(home, agy);
    const config = join(home.dir, "config/config.json");
    writeJson(config, { plugins: { pstack: { enabled: false } } });
    expect(installAntigravity(home, agy)).toEqual([]);
    expect(JSON.parse(readFileSync(config, "utf8"))).toEqual({ plugins: { pstack: { enabled: false } } });
    expect(doctorAntigravity(home, agy)[1]).toEqual({
      name: "enabled",
      ok: false,
      detail: `no, ${config} turns it off`,
      fix: 'turn pstack on in that file\'s "plugins" map',
    });
  });

  test("the installer CLI installs into each Antigravity profile, with no claude or codex on PATH", () => {
    const user = tmp();
    const bin = join(user, "bin");
    mkdirSync(bin);
    symlinkSync(spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim(), join(bin, "node"));
    const settings = join(user, ".t3/userdata/settings.json");
    writeJson(settings, { providerInstances: { antigravity: { driver: "antigravity", enabled: true } } });
    const run = (command) => {
      const r = spawnSync(join(bin, "node"), [join(repoRoot, "tools/install.mjs"), command, "--source", repoRoot, "--json"], {
        cwd: user,
        env: { PATH: `${bin}:/usr/bin:/bin`, HOME: user },
        encoding: "utf8",
      });
      return JSON.parse(r.stdout);
    };
    const profile = antigravityProfile(settings, "antigravity");
    const row = (report) => report.homes.find((h) => h.harness === "antigravity");
    const first = run("install");
    expect(row(first)).toMatchObject({ dir: profile, steps: [`installed ${shipped}`] });
    expect(row(first).checks.every((c) => c.ok)).toBe(true);
    expect(row(run("update")).steps).toEqual([]);
    expect(row(run("doctor")).checks.map((c) => c.name)).toEqual(["installed", "enabled"]);
    expect(existsSync(join(profile, "t3-pstack-models.md"))).toBe(false);
  });

  test("reinstalls a copy whose manifest is missing", () => {
    const home = antigravityHome();
    installAntigravity(home, agy);
    rmSync(join(installedAt(home), ".antigravity-plugin/plugin.json"));
    expect(doctorAntigravity(home, agy)[0]).toEqual({ name: "installed", ok: false, detail: "not installed", fix: FIX });
    expect(installAntigravity(home, agy)).toEqual([`installed ${shipped}`]);
    expect(existsSync(join(installedAt(home), ".antigravity-plugin/plugin.json"))).toBe(true);
    expect(doctorAntigravity(home, agy)[0]).toEqual({ name: "installed", ok: true, detail: shipped });
  });
});

const kiroHome = (dir = join(tmp(), ".kiro")) => ({ harness: "kiro", dir, from: ["--kiro-home"], bin: "kiro-cli" });
const kiro = { pluginRoot, version: shipped, skills, hint: FIX };
const routing = readFileSync(join(pluginRoot, "hooks/session-start-context.md"), "utf8");
const entryState = (path) =>
  lstatSync(path).isSymbolicLink()
    ? { link: readlinkSync(path) }
    : Object.fromEntries(readdirSync(path, { recursive: true }).map((file) => [file, readFileSync(join(path, file), "utf8")]));
const treeState = (dir) =>
  Object.fromEntries(
    readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() || entry.isSymbolicLink())
      .map((entry) => {
        const path = join(entry.parentPath, entry.name);
        return [path, entry.isSymbolicLink() ? { link: readlinkSync(path) } : readFileSync(path)];
      }),
  );
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const RECORD = ".oms-pstack-install.json";

function kiroInstaller(user, providerInstances, env = {}) {
  const bin = join(user, "bin");
  mkdirSync(bin);
  symlinkSync(spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim(), join(bin, "node"));
  writeFileSync(join(bin, "kiro-cli"), "#!/bin/sh\n", { mode: 0o755 });
  writeJson(join(user, ".t3/userdata/settings.json"), { providerInstances });
  return (command) => {
    const r = spawnSync(join(bin, "node"), [join(repoRoot, "tools/install.mjs"), command, "--source", repoRoot, "--json"], {
      cwd: user,
      env: { PATH: `${bin}:/usr/bin:/bin`, HOME: user, ...env },
      encoding: "utf8",
    });
    return { status: r.status, report: JSON.parse(r.stdout) };
  };
}
const localHint = `rerun \`npx -y oh-my-stack@latest install --source ${resolve(repoRoot)}\``;

describe("Kiro", () => {
  test("copies the plugin into the home, links each skill into the copy, writes the hook file, and a second run changes nothing", () => {
    const home = kiroHome();
    const root = join(home.dir, "oms-pstack");
    const hooks = join(home.dir, "hooks/oms-pstack.json");
    expect(installKiro(home, kiro)).toEqual([`installed ${shipped}`, "linked 2 skills", `wrote ${hooks}`]);
    expect(mode(home.dir)).toBe(0o700);
    for (const name of skills.keys()) {
      expect(readlinkSync(join(home.dir, "skills", name))).toBe(join(root, "skills", name));
      expect(readFileSync(join(home.dir, "skills", name, "SKILL.md"), "utf8")).toBe(SKILL(name));
    }
    const command = `sh '${root}/hooks/session-start.sh' kiro '${root}'`;
    expect(JSON.parse(readFileSync(hooks, "utf8"))).toEqual({
      version: "v1",
      hooks: ["SessionStart", "PostCompact"].map((trigger) => ({ name: "oms-pstack", trigger, timeout: 10, action: { type: "command", command } })),
    });
    expect(installKiro(home, kiro)).toEqual([]);
    expect(doctorKiro(home, kiro)).toEqual([
      { name: "installed", ok: true, detail: shipped },
      { name: "skills", ok: true, detail: "2 linked" },
      { name: "hook", ok: true, detail: hooks },
    ]);
  });

  test("leaves each entry of a skill's name it did not make as it was, links the other skills, and doctor fails it with its kind and fix", () => {
    const other = join(tmp(), "checkout/plugins/pstack/skills/how");
    cpSync(join(pluginRoot, "skills/how"), other, { recursive: true });
    const own = (path) => {
      mkdirSync(path);
      writeFileSync(join(path, "SKILL.md"), "---\nname: how\ndescription: My own notes on how things work.\n---\n");
    };
    for (const [make, kind, fix] of [
      [own, "your own skill", "rename your skill"],
      [(path) => cpSync(join(pluginRoot, "skills/how"), path, { recursive: true }), "a plain copy of oms-pstack's skill", "delete the copy"],
      [(path) => symlinkSync(other, path), `a link into another checkout, ${other}`, "remove the link"],
    ]) {
      const home = kiroHome();
      const path = join(home.dir, "skills/how");
      mkdirSync(join(home.dir, "skills"), { recursive: true });
      make(path);
      const before = entryState(path);
      expect(installKiro(home, kiro)).toContain("linked 1 skill");
      expect(entryState(path)).toEqual(before);
      expect(readlinkSync(join(home.dir, "skills/why"))).toBe(join(home.dir, "oms-pstack/skills/why"));
      expect(doctorKiro(home, kiro).filter((c) => !c.ok)).toEqual([
        { name: "skill how", ok: false, detail: `${path} is ${kind}, so oms-pstack's how cannot load`, fix: `${fix}, then ${FIX}` },
      ]);
    }
  });

  test("unlinks a skill the release dropped, and repoints a link at the wrong target", () => {
    const home = kiroHome();
    installKiro(home, kiro);
    const root = join(home.dir, "oms-pstack/skills");
    symlinkSync(join(root, "retired"), join(home.dir, "skills/retired"));
    rmSync(join(home.dir, "skills/how"));
    symlinkSync(join(root, "why"), join(home.dir, "skills/how"));
    expect(doctorKiro(home, kiro)[1]).toEqual({
      name: "skills",
      ok: false,
      detail: "linked to the wrong target: how; linked but dropped from this release: retired",
      fix: FIX,
    });
    expect(installKiro(home, kiro)).toEqual(["repointed how at the copy", "unlinked retired, which this release dropped"]);
    expect(readdirSync(join(home.dir, "skills")).sort()).toEqual(["how", "why"]);
    expect(readlinkSync(join(home.dir, "skills/how"))).toBe(join(root, "how"));
    expect(doctorKiro(home, kiro).every((c) => c.ok)).toBe(true);
  });

  test("installs the same links and hooks file into a home reached through a symlink as through its real path", () => {
    const real = kiroHome();
    mkdirSync(real.dir);
    const alias = kiroHome(join(tmp(), "kiro-alias"));
    symlinkSync(real.dir, alias.dir);
    installKiro(alias, kiro);
    expect(installKiro(real, kiro)).toEqual([]);
    for (const home of [alias, real]) expect(doctorKiro(home, kiro).every((c) => c.ok)).toBe(true);
  });

  test("leaves a hand-written hooks file that differs, and doctor fails it as not the installer's", () => {
    const home = kiroHome();
    installKiro(home, kiro);
    const path = join(home.dir, "hooks/oms-pstack.json");
    const mine = readFileSync(path, "utf8").replace("PostCompact", "SessionEnd");
    writeFileSync(path, mine);
    expect(doctorKiro(home, kiro).at(-1)).toEqual({ name: "hook", ok: false, detail: `${path} is not a file the installer wrote`, fix: `move or delete it, then ${FIX}` });
    expect(installKiro(home, kiro)).toEqual([]);
    expect(readFileSync(path, "utf8")).toBe(mine);
  });

  test("leaves a hooks file that links to a file of the user's, and doctor fails it as not the installer's", () => {
    const home = kiroHome();
    installKiro(home, kiro);
    const target = join(tmp(), "mine.json");
    writeFileSync(target, '{"mine":true}\n');
    const path = join(home.dir, "hooks/oms-pstack.json");
    rmSync(path);
    symlinkSync(target, path);
    expect(installKiro(home, kiro)).toEqual([]);
    expect(readlinkSync(path)).toBe(target);
    expect(readFileSync(target)).toEqual(Buffer.from('{"mine":true}\n'));
    expect(doctorKiro(home, kiro).at(-1)).toEqual({ name: "hook", ok: false, detail: `${path} is not a file the installer wrote`, fix: `move or delete it, then ${FIX}` });
  });

  test("rewrites the hooks file an earlier release wrote, which that release's record names", () => {
    const home = kiroHome();
    installKiro(home, kiro);
    const path = join(home.dir, "hooks/oms-pstack.json");
    const current = readFileSync(path, "utf8");
    const older = current.replace("PostCompact", "SessionEnd");
    writeFileSync(path, older);
    const record = join(home.dir, "oms-pstack", RECORD);
    writeJson(record, { ...JSON.parse(readFileSync(record, "utf8")), version: "2.6.0-rc.1", hooks: sha256(older) });
    expect(installKiro(home, kiro)).toEqual([`updated 2.6.0-rc.1 to ${shipped}`, `rewrote ${path}, which had changed`]);
    expect(readFileSync(path, "utf8")).toBe(current);
    expect(doctorKiro(home, kiro).every((c) => c.ok)).toBe(true);
  });

  test("leaves a clone at the copy's path whole, links and hooks nothing into it, and doctor fails it by name", () => {
    const home = kiroHome();
    const clone = join(home.dir, "oms-pstack");
    mkdirSync(join(clone, ".git"), { recursive: true });
    writeFileSync(join(clone, ".git/HEAD"), "ref: refs/heads/main\n");
    writeFileSync(join(clone, "README.md"), "# my oms-pstack checkout\n");
    expect(installKiro(home, kiro)).toEqual([]);
    expect(readFileSync(join(clone, ".git/HEAD"), "utf8")).toBe("ref: refs/heads/main\n");
    expect(readFileSync(join(clone, "README.md"), "utf8")).toBe("# my oms-pstack checkout\n");
    expect(readdirSync(home.dir)).toEqual(["oms-pstack"]);
    expect(doctorKiro(home, kiro)).toEqual([
      {
        name: "installed",
        ok: false,
        detail: `${clone} is not oms-pstack's copy, since it has no ${RECORD} from the installer`,
        fix: `move ${clone} out of the way, then ${FIX}`,
      },
    ]);
  });

  test("leaves a hand copy of an earlier release whole, its personal file included, and doctor fails it by name", () => {
    const home = kiroHome();
    const copy = join(home.dir, "oms-pstack");
    cpSync(pluginRoot, copy, { recursive: true });
    writeJson(join(copy, ".claude-plugin/plugin.json"), { name: "oms-pstack", version: "2.4.0" });
    writeFileSync(join(copy, "my-notes.md"), "personal\n");
    const before = treeState(copy);
    expect(installKiro(home, kiro)).toEqual([]);
    expect(treeState(copy)).toEqual(before);
    expect(readdirSync(home.dir)).toEqual(["oms-pstack"]);
    expect(doctorKiro(home, kiro)).toEqual([
      {
        name: "installed",
        ok: false,
        detail: `${copy} is not oms-pstack's copy, since it has no ${RECORD} from the installer`,
        fix: `move ${copy} out of the way, then ${FIX}`,
      },
    ]);
  });

  test("leaves its own copy of an earlier release that holds a file it did not put there, and doctor names the file", () => {
    const home = kiroHome();
    installKiro(home, kiro);
    const copy = join(home.dir, "oms-pstack");
    for (const file of [RECORD, ".claude-plugin/plugin.json"]) {
      writeJson(join(copy, file), { ...JSON.parse(readFileSync(join(copy, file), "utf8")), version: "2.6.0-rc.1" });
    }
    writeFileSync(join(copy, "my-notes.md"), "personal\n");
    const before = treeState(copy);
    expect(installKiro(home, kiro)).toEqual([]);
    expect(treeState(copy)).toEqual(before);
    expect(doctorKiro(home, kiro)).toEqual([
      {
        name: "installed",
        ok: false,
        detail: `${copy} holds files the installer did not put there: my-notes.md`,
        fix: `move or delete them, then ${FIX}`,
      },
    ]);
  });

  test("reinstalls its own copy that lost its manifest, and doctor fails it until then", () => {
    const home = kiroHome();
    installKiro(home, kiro);
    const copy = join(home.dir, "oms-pstack");
    rmSync(join(copy, ".claude-plugin/plugin.json"));
    expect(doctorKiro(home, kiro)[0]).toEqual({ name: "installed", ok: false, detail: `${shipped}, but its files at ${copy} are missing or changed`, fix: FIX });
    expect(installKiro(home, kiro)).toEqual([`reinstalled ${shipped}, whose files were missing or changed`]);
    expect(existsSync(join(copy, ".claude-plugin/plugin.json"))).toBe(true);
    expect(doctorKiro(home, kiro).every((c) => c.ok)).toBe(true);
  });

  test("the hook file's commands route from a home whose path holds a space and a quote", () => {
    const home = kiroHome(join(tmp(), "it's a home"));
    installKiro(home, kiro);
    const { hooks } = JSON.parse(readFileSync(join(home.dir, "hooks/oms-pstack.json"), "utf8"));
    for (const { action } of hooks) {
      const r = spawnSync("sh", ["-c", action.command], { cwd: tmp(), env: { PATH: process.env.PATH, HOME: tmp() }, encoding: "utf8" });
      expect({ status: r.status, stderr: r.stderr, routed: r.stdout.startsWith(routing) }).toEqual({ status: 0, stderr: "", routed: true });
      expect(r.stdout).toContain(`\`<plugin root>\` is \`${join(home.dir, "oms-pstack")}\``);
    }
  });

  test("the installer CLI installs into each Kiro home it is named, and a second run changes nothing", () => {
    const user = tmp();
    const bin = join(user, "bin");
    mkdirSync(bin);
    symlinkSync(spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim(), join(bin, "node"));
    writeFileSync(join(bin, "kiro-cli"), "#!/bin/sh\n", { mode: 0o755 });
    const run = (command) => {
      const r = spawnSync(join(bin, "node"), [join(repoRoot, "tools/install.mjs"), command, "--source", repoRoot, "--kiro-home", "~/kiro", "--json"], {
        cwd: user,
        env: { PATH: `${bin}:/usr/bin:/bin`, HOME: user },
        encoding: "utf8",
      });
      return JSON.parse(r.stdout).homes.find((h) => h.harness === "kiro");
    };
    const shippedSkills = readdirSync(join(pluginRoot, "skills")).length;
    const first = run("install");
    expect(first).toMatchObject({
      dir: join(user, "kiro"),
      from: ["--kiro-home"],
      steps: [`installed ${shipped}`, `linked ${shippedSkills} skills`, `wrote ${join(user, "kiro/hooks/oms-pstack.json")}`],
    });
    expect(first.checks.every((c) => c.ok)).toBe(true);
    expect(run("update").steps).toEqual([]);
    expect(run("doctor").checks).toEqual([
      { name: "installed", ok: true, detail: shipped },
      { name: "skills", ok: true, detail: `${shippedSkills} linked` },
      { name: "hook", ok: true, detail: join(user, "kiro/hooks/oms-pstack.json") },
    ]);
  });

  test("the installer CLI installs from a --source whose plugin is a link without writing into that source, and a second run changes nothing", () => {
    const user = tmp();
    const bin = join(user, "bin");
    mkdirSync(bin);
    symlinkSync(spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim(), join(bin, "node"));
    writeFileSync(join(bin, "kiro-cli"), "#!/bin/sh\n", { mode: 0o755 });
    const plugin = join(tmp(), "pstack");
    cpSync(pluginRoot, plugin, { recursive: true });
    const source = join(tmp(), "source");
    cpSync(join(repoRoot, "tools/frozen-hooks.json"), join(source, "tools/frozen-hooks.json"));
    mkdirSync(join(source, "plugins"));
    symlinkSync(plugin, join(source, "plugins/pstack"));
    const sourceState = () => ({ ...treeState(source), ...treeState(plugin) });
    const before = sourceState();
    const install = () => {
      const r = spawnSync(join(bin, "node"), [join(repoRoot, "tools/install.mjs"), "install", "--source", source, "--kiro-home", "~/kiro", "--json"], {
        cwd: user,
        env: { PATH: `${bin}:/usr/bin:/bin`, HOME: user },
        encoding: "utf8",
      });
      return JSON.parse(r.stdout).homes.find((h) => h.harness === "kiro").steps;
    };
    expect(install()).toContain(`installed ${shipped}`);
    expect(existsSync(join(user, ".config/t3-pstack/models.md"))).toBe(false);
    expect(existsSync(join(user, ".codex/t3-pstack-models.md"))).toBe(false);
    expect(sourceState()).toEqual(before);
    expect(install()).toEqual([]);
    expect(sourceState()).toEqual(before);
  });

  test("the installer CLI rewrites an earlier release's hooks file after an update that stopped before rewriting it", () => {
    const user = tmp();
    const bin = join(user, "bin");
    mkdirSync(bin);
    symlinkSync(spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim(), join(bin, "node"));
    writeFileSync(join(bin, "kiro-cli"), "#!/bin/sh\n", { mode: 0o755 });
    // An earlier release: its own installer, whose hooks file differs, at an earlier version.
    const earlier = tmp();
    for (const path of ["tools", "plugins"]) cpSync(join(repoRoot, path), join(earlier, path), { recursive: true, filter: (src) => !src.includes("node_modules") });
    const edit = (file, from, to) => writeFileSync(join(earlier, file), readFileSync(join(earlier, file), "utf8").replace(from, to));
    edit("tools/install/kiro.mjs", "timeout: 10,", "timeout: 5,");
    edit("plugins/pstack/.claude-plugin/plugin.json", `"version": "${shipped}"`, '"version": "2.6.0-rc.1"');
    const install = (root) => {
      const r = spawnSync(join(bin, "node"), [join(root, "tools/install.mjs"), "install", "--source", root, "--kiro-home", "~/kiro", "--json"], {
        cwd: user,
        env: { PATH: `${bin}:/usr/bin:/bin`, HOME: user },
        encoding: "utf8",
      });
      return JSON.parse(r.stdout).homes.find((h) => h.harness === "kiro").steps;
    };
    const hooks = join(user, "kiro/hooks/oms-pstack.json");
    expect(install(earlier)).toContain("installed 2.6.0-rc.1");
    const older = readFileSync(hooks, "utf8");
    expect(install(repoRoot)).toEqual([`updated 2.6.0-rc.1 to ${shipped}`, `rewrote ${hooks}, which had changed`]);
    const current = readFileSync(hooks, "utf8");
    writeFileSync(hooks, older);
    expect(install(repoRoot)).toEqual([`rewrote ${hooks}, which had changed`]);
    expect(readFileSync(hooks, "utf8")).toBe(current);
  });

  test("the installer CLI fills ~/.kiro in place of each KIRO_HOME that Kiro ignores, and warns with each value", () => {
    const user = tmp();
    const kiroWork = { driver: "kiro", environment: [{ name: "KIRO_HOME", value: "~/.kiro-work" }] };
    const { status, report } = kiroInstaller(user, { kiro_work: kiroWork }, { KIRO_HOME: user })("install");
    expect(status).toBe(0);
    const rows = report.homes.filter((h) => h.harness === "kiro");
    expect(rows.map(({ dir, from }) => ({ dir, from }))).toEqual([{ dir: join(user, ".kiro"), from: ["T3 instance kiro_work", "KIRO_HOME"] }]);
    expect(rows[0].checks.filter((c) => !c.ok)).toEqual([
      {
        name: "KIRO_HOME",
        ok: false,
        warn: true,
        detail: `Kiro reads this home, since it ignores "~/.kiro-work" from T3 instance kiro_work, "${user}" from KIRO_HOME`,
        fix: `make KIRO_HOME an absolute path that does not hold your home folder, or unset it, then ${localHint}`,
      },
    ]);
    expect(existsSync(join(user, ".kiro-work"))).toBe(false);
    expect(readdirSync(user).filter((name) => ["oms-pstack", "skills", "hooks"].includes(name))).toEqual([]);
  });

  test("the installer CLI gives a kiro instance with no KIRO_HOME of its own the one it inherits from the installer", () => {
    const user = tmp();
    const shell = join(user, "kiro-shell");
    const { status, report } = kiroInstaller(user, { kiro_work: { driver: "kiro" } }, { KIRO_HOME: shell })("install");
    expect(status).toBe(0);
    const rows = report.homes.filter((h) => h.harness === "kiro");
    expect(rows.map(({ dir, from }) => ({ dir, from }))).toEqual([{ dir: shell, from: ["T3 instance kiro_work", "KIRO_HOME"] }]);
    expect(rows[0].checks.every((c) => c.ok)).toBe(true);
    expect(existsSync(join(user, ".kiro"))).toBe(false);
  });

  test("the installer CLI skips each kiro instance whose KIRO_HOME is a T3 secret, and warns with the --kiro-home fix", () => {
    const user = tmp();
    const secret = (variable) => ({ driver: "kiro", environment: [{ name: "KIRO_HOME", value: "", sensitive: true, ...variable }] });
    const { status, report } = kiroInstaller(user, {
      kiro_ref: secret({ secret: { provider: "onepassword", reference: "op://vault/kiro/home" } }),
      kiro_stored: { ...secret({ valueRedacted: true }), enabled: false },
    })("install");
    expect(status).toBe(0);
    expect(report.homes.filter((h) => h.harness === "kiro")).toEqual([]);
    expect(report.settings.checks).toEqual(
      ["T3 instance kiro_ref", "T3 instance kiro_stored (disabled)"].map((name) => ({
        name,
        ok: false,
        warn: true,
        detail: "its KIRO_HOME is a secret, which the installer cannot read, so it skipped that instance",
        fix: `${localHint} with \`--kiro-home <dir>\`, naming the directory that KIRO_HOME holds`,
      })),
    );
    expect(existsSync(join(user, ".kiro"))).toBe(false);
  });
});

// npx installs `github:<owner>/<repo>` at <cache>/_npx/<hash>/node_modules/pstack
// and records the spec in the package.json two levels up.
describe("npxOrigin", () => {
  const npxCache = (spec) => {
    const dir = tmp();
    const root = join(dir, "node_modules/pstack");
    mkdirSync(root, { recursive: true });
    if (spec !== undefined) writeJson(join(dir, "package.json"), { dependencies: { pstack: spec }, _npx: { packages: [spec] } });
    return root;
  };

  test("names the GitHub repository npx fetched, with or without a ref", () => {
    expect(npxOrigin(npxCache("github:p4cs-974/t3-pstack"))).toBe("p4cs-974/t3-pstack");
    expect(npxOrigin(npxCache("github:p4cs-974/t3-pstack#v2.5.0"))).toBe("p4cs-974/t3-pstack");
    expect(npxOrigin(npxCache("williamwue/oh-my-stack"))).toBe("williamwue/oh-my-stack");
  });

  test("names nothing for a checkout, a registry spec, or a cache without a record", () => {
    expect(npxOrigin(repoRoot)).toBeUndefined();
    expect(npxOrigin(npxCache("^2.4.0"))).toBeUndefined();
    expect(npxOrigin(npxCache("git+https://example.com/x/t3-pstack.git"))).toBeUndefined();
    expect(npxOrigin(npxCache(undefined))).toBeUndefined();
  });

  test("a fork's installer defaults --source to that fork", () => {
    const user = tmp();
    const bin = join(user, "bin");
    mkdirSync(bin);
    symlinkSync(spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim(), join(bin, "node"));
    const root = npxCache("github:someone/t3-pstack");
    for (const path of ["tools", "plugins"]) cpSync(join(repoRoot, path), join(root, path), { recursive: true });
    const r = spawnSync(join(bin, "node"), [join(root, "tools/install.mjs"), "doctor", "--json"], {
      cwd: user,
      env: { PATH: `${bin}:/usr/bin:/bin`, HOME: user },
      encoding: "utf8",
    });
    expect(JSON.parse(r.stdout).source).toBe("someone/t3-pstack");
  });

  test("a fork's installer run with another --source trusts no marketplace from that fork", () => {
    const user = tmp();
    const bin = join(user, "bin");
    mkdirSync(bin);
    symlinkSync(spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim(), join(bin, "node"));
    const claude = fakeClaude();
    symlinkSync(claude.bin, join(bin, "claude"));
    writeJson(join(user, ".claude/settings.json"), {
      extraKnownMarketplaces: { oms: { source: { source: "github", repo: "someone/t3-pstack" } } },
    });
    const root = npxCache("github:someone/t3-pstack");
    for (const path of ["tools", "plugins"]) cpSync(join(repoRoot, path), join(root, path), { recursive: true });
    const r = spawnSync(join(bin, "node"), [join(root, "tools/install.mjs"), "update", "--source", "williamwue/oh-my-stack", "--json"], {
      cwd: user,
      env: { PATH: `${bin}:/usr/bin:/bin`, HOME: user },
      encoding: "utf8",
    });
    expect(claude.calls()).toEqual([]);
    expect(r.status).toBe(1);
    expect(JSON.parse(r.stdout).homes.find((h) => h.harness === "claude").checks[0]).toMatchObject({
      name: "marketplace",
      ok: false,
      detail: "someone/t3-pstack, which is neither williamwue/oh-my-stack nor --source",
    });
  });
});
