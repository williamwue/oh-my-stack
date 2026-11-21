// The installer end to end, with the real claude and codex CLIs, in a
// throwaway HOME that T3's settings file describes. Opt in with
// T3_PSTACK_E2E=1; it needs both CLIs and takes about a minute. This checkout
// is the marketplace source. The Codex probe turn has no credentials, so it
// fails at the model call, after the session-start hook has run.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { AppServer } from "../tools/install/codex.mjs";
import { HOME_REPO, PLUGIN_ID, resolveCli } from "../tools/install/common.mjs";
import { hookDigest } from "../tools/plugin.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const version = JSON.parse(readFileSync(join(repoRoot, "plugins/pstack/.claude-plugin/plugin.json"), "utf8")).version;
const ROUTING = "You have t3-pstack, pstack for T3 Code.";
const SHEET = "# budget: large (xhigh)\nbug-fix: inherit-parent\nsession hook: on\n";

let root;
let home;
const saved = {};
const ISOLATED = ["HOME", "CODEX_HOME", "CLAUDE_CONFIG_DIR", "T3CODE_HOME", "XDG_CONFIG_HOME", "XDG_CACHE_HOME", "GIT_CONFIG_GLOBAL"];

function sh(bin, args, env = {}) {
  const r = spawnSync(bin, args, { cwd: root, env: { ...process.env, ...env }, encoding: "utf8" });
  expect(r.status, `${bin} ${args.join(" ")}\n${r.stdout}\n${r.stderr}`).toBe(0);
  return r.stdout;
}

// `source` null runs with no --source, as a user does.
function installer(command, source = repoRoot, ...args) {
  const r = spawnSync("node", [join(repoRoot, "tools/install.mjs"), command, ...(source ? ["--source", source] : []), ...args, "--json"], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  });
  return { status: r.status, report: JSON.parse(r.stdout) };
}

const row = (report, dir) => report.homes.find((h) => h.dir === join(home, dir));
const failing = (checks) => checks.filter((c) => !c.ok && !c.warn).map((c) => `${c.name}: ${c.detail}`);
const HOOK = "pstack@oms:hooks/codex-hooks.json:session_start:0:0";

// The plugin as a marketplace of its own, outside this checkout.
function pluginCopy(dir) {
  for (const path of [".claude-plugin", ".agents", "plugins", "tools/frozen-hooks.json"]) {
    cpSync(join(repoRoot, path), join(dir, path), { recursive: true, filter: (src) => !src.includes("node_modules") });
  }
  return dir;
}
const edit = (path, from, to) => writeFileSync(path, readFileSync(path, "utf8").replace(from, to));
const MANIFESTS = [".claude-plugin/marketplace.json", "plugins/pstack/.claude-plugin/plugin.json", "plugins/pstack/.codex-plugin/plugin.json"];
const bump = (dir, from, to) => MANIFESTS.forEach((file) => edit(join(dir, file), `"version": "${from}"`, `"version": "${to}"`));

async function until(done, ms) {
  for (const deadline = Date.now() + ms; Date.now() < deadline; await new Promise((r) => setTimeout(r, 200))) {
    if (done()) return true;
  }
  return false;
}

// A T3-shaped Codex session: thread/start, then one turn. SessionStart runs
// at the first turn, before the model call.
async function probe(codexHome) {
  const server = await AppServer.start({ dir: codexHome, bin: "codex" });
  try {
    const { thread } = await server.request("thread/start", { cwd: root, approvalPolicy: "never", sandbox: "read-only" });
    await server.request("turn/start", { threadId: thread.id, input: [{ type: "text", text: "ping" }] });
    expect(await until(() => server.notifications.some((m) => m.method === "turn/completed"), 90_000), "turn completed").toBe(true);
    const rollout = readFileSync(thread.path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const developer = rollout
      .filter((item) => item.payload?.type === "message" && item.payload.role === "developer")
      .flatMap((item) => item.payload.content.map((part) => part.text ?? ""));
    return {
      hookEvents: server.notifications.filter((m) => m.method.startsWith("hook/")).map((m) => m.method),
      routedMessages: developer.filter((text) => text.includes(ROUTING)).length,
      rollout: thread.path,
    };
  } finally {
    server.close();
  }
}

// Every config file in every home, and the sheet, by content.
function snapshot() {
  const out = {};
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!["cache", "marketplaces", ".tmp", "sessions", "log", "skills", "shell_snapshots"].includes(entry.name)) walk(path);
      } else if (/\.(json|toml|md)$/.test(entry.name)) {
        out[relative(home, path)] = entry.isSymbolicLink()
          ? `-> ${readlinkSync(path)}`
          : createHash("sha256").update(readFileSync(path)).digest("hex");
      }
    }
  };
  walk(home);
  return out;
}

const enabled = process.env.T3_PSTACK_E2E === "1";

// A fresh HOME per suite, with T3's settings listing `providerInstances`.
function isolate(providerInstances) {
  beforeAll(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), "t3-pstack-e2e-")));
    home = join(root, "home");
    for (const name of ISOLATED) saved[name] = process.env[name];
    for (const name of ISOLATED) delete process.env[name];
    Object.assign(process.env, { HOME: home, GIT_CONFIG_GLOBAL: "/dev/null" });
    mkdirSync(join(home, ".t3/userdata"), { recursive: true });
    writeFileSync(join(home, ".t3/userdata/settings.json"), JSON.stringify({ providerInstances }));
  });

  afterAll(() => {
    for (const name of ISOLATED) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
    rmSync(root, { recursive: true, force: true });
  });
}

describe.skipIf(!enabled)("the installer, end to end", () => {
  isolate({
    claudeAgent: { driver: "claudeAgent", enabled: true, config: { binaryPath: "claude", homePath: "" } },
    claude_pool: { driver: "claudeAgent", enabled: true, config: { homePath: "~/.claude-pool" } },
    codex: { driver: "codex", enabled: true, config: { binaryPath: "codex", homePath: "" } },
    codex_work: { driver: "codex", enabled: false, config: { homePath: "~/.codex-work" } },
  });

  test("before: a hand-installed Codex home never runs the hook, and doctor says so", async () => {
    // The pre-installer README way, and the released per-home sheet.
    const codexHome = join(home, ".codex");
    mkdirSync(codexHome, { recursive: true });
    sh("codex", ["plugin", "marketplace", "add", repoRoot], { CODEX_HOME: codexHome });
    sh("codex", ["plugin", "add", "pstack@oms"], { CODEX_HOME: codexHome });
    mkdirSync(join(home, ".claude"), { recursive: true });
    writeFileSync(join(home, ".claude/t3-pstack-models.md"), SHEET);
    symlinkSync(join(home, ".claude/t3-pstack-models.md"), join(codexHome, "t3-pstack-models.md"));

    // A second Claude home with a stale project-scope record for the home folder.
    const pool = join(home, ".claude-pool");
    mkdirSync(pool, { recursive: true });
    sh("claude", ["plugin", "marketplace", "add", repoRoot], { CLAUDE_CONFIG_DIR: pool });
    sh("claude", ["plugin", "install", "pstack@oms", "--scope", "user"], { CLAUDE_CONFIG_DIR: pool });
    const recordsPath = join(pool, "plugins/installed_plugins.json");
    const records = JSON.parse(readFileSync(recordsPath, "utf8"));
    records.plugins["pstack@oms"].push({
      scope: "project",
      projectPath: home,
      installPath: join(pool, "plugins/cache/oms/pstack/1.0.11"),
      version: "1.0.11",
      installedAt: "2026-10-13T04:43:26.759Z",
      lastUpdated: "2026-10-13T04:43:26.759Z",
    });
    writeFileSync(recordsPath, JSON.stringify(records, null, 2) + "\n");

    const before = await probe(codexHome);
    console.log("before:", JSON.stringify(before));
    expect(before.hookEvents).toEqual([]);
    expect(before.routedMessages).toBe(0);

    const { status, report } = installer("doctor");
    expect(status).toBe(1);
    expect(failing(row(report, ".codex").checks)).toEqual([
      `session-start hook trusted: ${HOOK} untrusted`,
    ]);
    expect(failing(row(report, ".claude-pool").checks)).toEqual([
      `other-scope records: project ${home} at 1.0.11`,
    ]);
    expect(failing(row(report, ".codex-work").checks)).toEqual(["installed: the home does not exist"]);
    expect(failing(report.sheet.checks)).toEqual([
      `machine sheet: missing; ${join(home, ".claude/t3-pstack-models.md")}, ${join(home, ".codex/t3-pstack-models.md")} not moved yet`,
    ]);
  }, 300_000);

  test("install: every home converges, the hook is trusted, and its routing text reaches the rollout", async () => {
    const { status, report } = installer("install");
    console.log("install:", JSON.stringify(report.homes.map(({ dir, steps }) => ({ dir, steps })).concat(report.sheet.steps)));
    expect(failing([...report.homes.flatMap((h) => h.checks), ...report.sheet.checks])).toEqual([]);
    expect(status).toBe(0);
    expect(row(report, ".codex").steps).toEqual([
      `trusted hook ${HOOK} (was untrusted)`,
    ]);
    expect(row(report, ".codex-work").steps).toEqual([
      `added the oms marketplace from ${repoRoot.replace(/\/$/, "")}`,
      `installed ${version}`,
      `trusted hook ${HOOK} (was untrusted)`,
    ]);
    const pool = row(report, ".claude-pool").steps;
    expect(pool[0]).toBe(`moved the project-scope record for ${home} from 1.0.11 to ${version}`);
    expect(pool[1]).toStartWith("backed up plugins/installed_plugins.json to ");
    expect(report.sheet.steps).toEqual([
      `moved the sheet from ${join(home, ".claude/t3-pstack-models.md")}`,
      `linked ${join(home, ".claude/t3-pstack-models.md")} to it`,
      `linked ${join(home, ".claude-pool/t3-pstack-models.md")} to it`,
      `linked ${join(home, ".codex-work/t3-pstack-models.md")} to it`,
    ]);
    expect(readFileSync(join(home, ".config/t3-pstack/models.md"), "utf8")).toBe(SHEET);

    const after = await probe(join(home, ".codex"));
    console.log("after:", JSON.stringify(after));
    expect(after.hookEvents).toEqual(["hook/started", "hook/completed"]);
    expect(after.routedMessages).toBe(1);

    // Claude Code needs no trust; the same routing text arrives through its hook.
    const claude = spawnSync("claude", ["-p", "ping", "--output-format", "stream-json", "--verbose"], {
      cwd: root,
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: join(home, ".claude-pool"),
        ANTHROPIC_API_KEY: "sk-ant-invalid",
        ANTHROPIC_BASE_URL: "http://127.0.0.1:9",
      },
      encoding: "utf8",
      timeout: 120_000,
    });
    const hookResponse = claude.stdout
      .split("\n")
      .filter((line) => line.includes('"hook_response"'))
      .map((line) => JSON.parse(line))
      .find((event) => event.hook_event === "SessionStart");
    expect(hookResponse?.output ?? hookResponse?.stdout ?? "", "Claude Code's SessionStart hook_response").toContain(ROUTING);
    console.log("claude:", JSON.stringify({ hook: hookResponse.hook_name, routed: true }));
  }, 300_000);

  test("a second install changes nothing, and doctor passes", () => {
    const before = snapshot();
    const { status, report } = installer("update");
    expect(status).toBe(0);
    expect([...report.homes.flatMap((h) => h.steps), ...report.sheet.steps]).toEqual([]);
    expect(snapshot()).toEqual(before);
    console.log(`rerun: ${Object.keys(before).length} config files unchanged`);
    expect(installer("doctor").status).toBe(0);
    expect(existsSync(join(home, ".codex-work/config.toml"))).toBe(true);
  }, 300_000);

  test("install reinstalls a plugin whose files are gone, and enables a disabled one", () => {
    const codexCache = join(home, ".codex/plugins/cache/oms/pstack", version);
    rmSync(join(codexCache, "skills/how"), { recursive: true });
    const poolRecord = JSON.parse(readFileSync(join(home, ".claude-pool/plugins/installed_plugins.json"), "utf8")).plugins["pstack@oms"][0];
    rmSync(poolRecord.installPath, { recursive: true });
    edit(join(home, ".codex-work/config.toml"), /(\[plugins\."pstack@oms"\]\s*enabled = )true/, "$1false");

    // Codex trusts the hook with a hash of every file in the plugin, so the
    // deleted skill takes the trust with it until the files are back.
    const doctor = installer("doctor").report;
    expect(failing(row(doctor, ".codex").checks)).toEqual([
      `installed: its files in ${codexCache} are missing`,
      `session-start hook trusted: ${HOOK} modified`,
    ]);
    expect(failing(row(doctor, ".claude-pool").checks)).toEqual([
      `installed: ${version}, but its files at ${poolRecord.installPath} are missing`,
    ]);
    expect(failing(row(doctor, ".codex-work").checks)).toEqual(["enabled: no", "session-start hook trusted: no t3-pstack hook listed"]);

    const { status, report } = installer("install");
    expect(row(report, ".codex").steps).toEqual([`reinstalled ${version}, whose files were missing`]);
    expect(row(report, ".claude-pool").steps).toEqual([`reinstalled ${version}, whose files were missing`]);
    expect(row(report, ".codex-work").steps).toEqual(["enabled it"]);
    expect(status).toBe(0);
  }, 300_000);

  test("doctor flags a plain copy of a plugin skill, not a user's own skill that shares a name", () => {
    mkdirSync(join(home, ".agents/skills/how"), { recursive: true });
    mkdirSync(join(home, ".agents/skills/why"), { recursive: true });
    writeFileSync(join(home, ".agents/skills/how/SKILL.md"), "---\nname: how\ndescription: My own notes on how things work.\n---\n");
    cpSync(join(repoRoot, "plugins/pstack/skills/why/SKILL.md"), join(home, ".agents/skills/why/SKILL.md"));
    const { status, report } = installer("doctor");
    expect(failing(row(report, ".codex").checks)).toEqual([`no plain copies of plugin skills: ${join(home, ".agents/skills/why/SKILL.md")}`]);
    expect(status).toBe(1);
    rmSync(join(home, ".agents/skills/why"), { recursive: true });
    expect(installer("doctor").status).toBe(0);
  }, 300_000);

  test("a poteto-mode script leaves the installed plugin as released, so the hook still routes", async () => {
    const plugin = join(home, ".codex/plugins/cache/oms/pstack", version);
    const files = () => readdirSync(plugin, { recursive: true }).sort();
    const before = files();
    const watch = spawnSync(join(plugin, "skills/poteto-mode/scripts/watch-pr/watch-pr"), ["--help"], { cwd: root, encoding: "utf8" });
    expect(watch.status, watch.stderr).toBe(0);
    expect(watch.stdout).toStartWith("Usage: watch-pr");
    expect(files()).toEqual(before);

    const after = await probe(join(home, ".codex"));
    expect(after.hookEvents).toEqual(["hook/started", "hook/completed"]);
    expect(after.routedMessages).toBe(1);
    expect(installer("doctor").status).toBe(0);
  }, 300_000);
});

describe.skipIf(!enabled)("the installer, on a t3-pstack marketplace from another source", () => {
  isolate({
    claudeAgent: { driver: "claudeAgent", enabled: true, config: { binaryPath: "claude", homePath: "" } },
    codex: { driver: "codex", enabled: true, config: { binaryPath: "codex", homePath: "" } },
    codex_dev: { driver: "codex", enabled: true, config: { homePath: "~/.codex-dev" } },
  });

  test("installs nothing from it, trusts none of its hooks, and doctor names the source", async () => {
    // A marketplace that calls itself t3-pstack, with a hook that leaves a mark.
    const counterfeit = pluginCopy(join(root, "counterfeit"));
    const marked = join(root, "hook-ran");
    edit(join(counterfeit, "plugins/pstack/hooks/codex-hooks.json"), /"command": "[^\n]*",\n/, `"command": "touch ${marked}",\n`);
    for (const [bin, dir, variable] of [["codex", ".codex", "CODEX_HOME"], ["claude", ".claude", "CLAUDE_CONFIG_DIR"]]) {
      mkdirSync(join(home, dir), { recursive: true });
      sh(bin, ["plugin", "marketplace", "add", counterfeit], { [variable]: join(home, dir) });
    }
    sh("codex", ["plugin", "add", "pstack@oms"], { CODEX_HOME: join(home, ".codex") });

    const { status, report } = installer("install");
    expect(status).toBe(1);
    expect(row(report, ".codex").steps).toEqual([]);
    expect(row(report, ".claude").steps).toEqual([]);
    const foreign = `marketplace: ${counterfeit}, which is neither williamwue/oh-my-stack nor --source`;
    expect(failing(row(report, ".codex").checks)).toEqual([
      foreign,
      `session-start hook trusted: ${HOOK} untrusted, not from the hooks/codex-hooks.json this release pins`,
    ]);
    expect(failing(row(report, ".claude").checks)).toEqual([foreign, "installed: not installed", "enabled: no"]);
    expect(row(report, ".codex-dev").steps).toEqual([
      `added the oms marketplace from ${repoRoot.replace(/\/$/, "")}`,
      `installed ${version}`,
      `trusted hook ${HOOK} (was untrusted)`,
    ]);

    const after = await probe(join(home, ".codex"));
    expect(after.hookEvents).toEqual([]);
    expect(existsSync(marked)).toBe(false);
  }, 300_000);

  test("a later run without that --source reuses none of its marketplaces", () => {
    const before = snapshot();
    const { status, report } = installer("install", null);
    expect(status).toBe(1);
    expect(report.homes.flatMap((h) => h.steps)).toEqual([]);
    expect(failing(row(report, ".codex-dev").checks)).toEqual([
      `marketplace: ${repoRoot.replace(/\/$/, "")}, which is neither williamwue/oh-my-stack nor --source`,
    ]);
    expect(snapshot()).toEqual(before);
  }, 300_000);
});

describe.skipIf(!enabled)("the installer, on a release that changes the hook entry", () => {
  isolate({});

  test("updates both homes, and trusts the changed hook once the release pins it", async () => {
    const source = pluginCopy(join(root, "source"));
    expect(installer("install", source).status).toBe(0);

    const next = "9.9.9";
    bump(source, version, next);
    const hooks = join(source, "plugins/pstack/hooks/codex-hooks.json");
    edit(hooks, "startup|resume|clear|compact", "startup|resume|compact|clear");

    const unpinned = installer("update", source);
    expect(unpinned.status).toBe(1);
    expect(row(unpinned.report, ".claude").steps).toEqual([`updated ${version} to ${next}`]);
    expect(row(unpinned.report, ".codex").steps).toEqual([`updated ${version} to ${next}`]);
    expect(failing(row(unpinned.report, ".codex").checks)).toEqual([
      `session-start hook trusted: ${HOOK} modified, not from the hooks/codex-hooks.json this release pins`,
    ]);

    const pins = join(source, "tools/frozen-hooks.json");
    const pinned = JSON.parse(readFileSync(pins, "utf8"));
    pinned["plugins/pstack/hooks/codex-hooks.json"] = { sha256: hookDigest(readFileSync(hooks, "utf8")), changedIn: next };
    writeFileSync(pins, JSON.stringify(pinned, null, 2) + "\n");
    const { status, report } = installer("update", source);
    console.log("release:", JSON.stringify(report.homes.map(({ dir, steps }) => ({ dir: relative(home, dir), steps }))));
    expect(failing([...report.homes.flatMap((h) => h.checks), ...report.sheet.checks])).toEqual([]);
    expect(status).toBe(0);
    expect(row(report, ".claude").steps).toEqual([]);
    expect(row(report, ".codex").steps).toEqual([`trusted hook ${HOOK} (was modified)`]);
    const after = await probe(join(home, ".codex"));
    expect(after.hookEvents).toEqual(["hook/started", "hook/completed"]);
    expect(after.routedMessages).toBe(1);
  }, 300_000);
});

// Git marketplaces, served from repositories in the throwaway root: the global
// Git config sends each source's URL there. `claude` is off PATH, because
// Claude Code fetches a GitHub marketplace without that config and would reach
// github.com.
describe.skipIf(!enabled)("the installer, on Git marketplaces", () => {
  isolate({
    codex: { driver: "codex", enabled: true, config: { binaryPath: "codex", homePath: "" } },
    codex_unpinned: { driver: "codex", enabled: true, config: { homePath: "~/.codex-unpinned" } },
    codex_old: { driver: "codex", enabled: true, config: { homePath: "~/.codex-old" } },
  });
  const path = process.env.PATH;
  const tag = `v${version}`;
  const PINNED = [".codex", ".codex-unpinned", ".codex-old"];
  let origin;
  const git = (...args) => sh("git", ["-C", origin, "-c", "user.name=t3-pstack", "-c", "user.email=t3-pstack@example.test", ...args]);
  const codex = (dir, ...args) => sh("codex", args, { CODEX_HOME: join(home, dir) });
  const marketplace = (dir) => readFileSync(join(home, dir, "config.toml"), "utf8").match(/\[marketplaces\.oms\]\n[^[]*/)?.[0].trimEnd();
  const pinned = (source) => `[marketplaces.oms]\nsource_type = "git"\nsource = "${source}"\nref = "${tag}"`;
  const cached = (dir) => readdirSync(join(home, dir, "plugins/cache/oms/pstack")).filter((name) => !name.startsWith("."));
  const pin = (report, dir) => row(report, dir).checks.find((c) => c.name === "marketplace pin");

  beforeAll(() => {
    const bin = join(root, "bin");
    mkdirSync(bin);
    for (const tool of ["codex", "node", "git"]) symlinkSync(resolveCli(tool), join(bin, tool));
    process.env.PATH = [bin, "/usr/bin", "/bin"].join(delimiter);

    origin = pluginCopy(join(root, "origin"));
    bump(origin, version, "0.0.1");
    git("init", "-q", "-b", "main");
    git("add", "-A");
    git("commit", "-qm", "0.0.1");
    git("tag", "v0.0.1");
    bump(origin, "0.0.1", version);
    git("commit", "-qam", version);
    git("tag", tag);
    const untagged = join(root, "untagged");
    sh("git", ["clone", "-q", "--no-tags", origin, untagged]);
    const urls = [
      [origin, `https://github.com/${HOME_REPO}.git`],
      [origin, "https://github.com/someone/t3-pstack.git"],
      [origin, "https://git.example.test/t3-pstack.git"],
      [untagged, "https://github.com/someone/untagged.git"],
    ];
    writeFileSync(join(root, "gitconfig"), urls.map(([dir, url]) => `[url "file://${dir}"]\n\tinsteadOf = ${url}\n`).join(""));
    process.env.GIT_CONFIG_GLOBAL = join(root, "gitconfig");

    // Homes Codex's own CLI set up: one on main, as every earlier release left
    // it, and one pinned to an older tag.
    for (const [dir, ...ref] of [[".codex-unpinned"], [".codex-old", "--ref", "v0.0.1"]]) {
      mkdirSync(join(home, dir), { recursive: true });
      codex(dir, "plugin", "marketplace", "add", HOME_REPO, ...ref);
      codex(dir, "plugin", "add", PLUGIN_ID);
    }
  });

  afterAll(() => {
    process.env.PATH = path;
  });

  test("doctor fails a Codex home that is not pinned to this release's tag", () => {
    const { status, report } = installer("doctor", null);
    expect(status).toBe(1);
    expect(failing(row(report, ".codex-unpinned").checks)).toEqual([
      `marketplace pin: none, expected ${tag}`,
      `session-start hook trusted: ${HOOK} untrusted`,
    ]);
    expect(failing(row(report, ".codex-old").checks)).toEqual([
      `marketplace pin: v0.0.1, expected ${tag}`,
      `installed: 0.0.1, expected ${version}`,
      `session-start hook trusted: ${HOOK} untrusted`,
    ]);
    expect(pin(report, ".codex-unpinned").fix).toBe("rerun `npx -y github:williamwue/oh-my-stack install`");
  }, 300_000);

  test("install pins every Codex home to the release tag, and the hook routes", async () => {
    const { status, report } = installer("install", null);
    console.log("pin:", JSON.stringify(report.homes.map(({ dir, steps }) => ({ dir: relative(home, dir), steps }))));
    expect(failing(report.homes.flatMap((h) => h.checks))).toEqual([]);
    expect(status).toBe(0);
    const trustedHook = `trusted hook ${HOOK} (was untrusted)`;
    expect(row(report, ".codex").steps).toEqual([
      `added the oms marketplace from ${HOME_REPO}`,
      `pinned the marketplace to ${tag} (was unpinned)`,
      `installed ${version}`,
      trustedHook,
    ]);
    expect(row(report, ".codex-unpinned").steps).toEqual([`pinned the marketplace to ${tag} (was unpinned)`, trustedHook]);
    expect(row(report, ".codex-old").steps).toEqual([`pinned the marketplace to ${tag} (was v0.0.1)`, `updated 0.0.1 to ${version}`, trustedHook]);
    for (const dir of PINNED) expect(marketplace(dir)).toBe(pinned(`https://github.com/${HOME_REPO}.git`));
    expect(pin(report, ".codex")).toEqual({ name: "marketplace pin", ok: true, detail: tag });

    const after = await probe(join(home, ".codex"));
    expect(after.hookEvents).toEqual(["hook/started", "hook/completed"]);
    expect(after.routedMessages).toBe(1);
  }, 300_000);

  test("a second install changes nothing", () => {
    const before = snapshot();
    const { status, report } = installer("update", null);
    expect(status).toBe(0);
    expect(report.homes.flatMap((h) => h.steps)).toEqual([]);
    expect(snapshot()).toEqual(before);
  }, 300_000);

  test("pins a GitHub or Git URL --source too, leaves a local directory unpinned, and leaves a source without the tag as it was", () => {
    const run = (source, dir) => installer("install", source, "--codex-home", join(home, dir));
    for (const [source, dir, url] of [
      ["someone/t3-pstack", ".codex-fork", "https://github.com/someone/t3-pstack.git"],
      ["https://git.example.test/t3-pstack.git", ".codex-url", "https://git.example.test/t3-pstack.git"],
    ]) {
      const { status, report } = run(source, dir);
      expect(status).toBe(0);
      expect(row(report, dir).steps).toEqual([
        `added the oms marketplace from ${source}`,
        `pinned the marketplace to ${tag} (was unpinned)`,
        `installed ${version}`,
        `trusted hook ${HOOK} (was untrusted)`,
      ]);
      expect(marketplace(dir)).toBe(pinned(url));
      expect(row(report, ".codex").steps).toEqual([]);
    }

    const local = pluginCopy(join(root, "local"));
    const fromDir = run(local, ".codex-local");
    expect(fromDir.status).toBe(0);
    expect(row(fromDir.report, ".codex-local").steps).toEqual([`added the oms marketplace from ${local}`, `installed ${version}`, `trusted hook ${HOOK} (was untrusted)`]);
    expect(pin(fromDir.report, ".codex-local")).toEqual({ name: "marketplace pin", ok: true, detail: "none, since a local directory has no tag" });
    expect(marketplace(".codex-local")).toBe(`[marketplaces.oms]\nsource_type = "local"\nsource = "${local}"`);

    const untagged = run("someone/untagged", ".codex-untagged");
    expect(untagged.status).toBe(1);
    const steps = row(untagged.report, ".codex-untagged").steps;
    expect(steps[1]).toStartWith(`Codex could not fetch ${tag}, so the marketplace stays unpinned (`);
    expect(steps.filter((_, i) => i !== 1)).toEqual([
      "added the oms marketplace from someone/untagged",
      `installed ${version}`,
      `trusted hook ${HOOK} (was untrusted)`,
    ]);
    expect(failing(row(untagged.report, ".codex-untagged").checks)).toEqual([`marketplace pin: none, expected ${tag}`]);
    expect(marketplace(".codex-untagged")).toBe('[marketplaces.oms]\nsource_type = "git"\nsource = "https://github.com/someone/untagged.git"');
  }, 300_000);

  test("a newer commit on main reaches only a home without the pin, through Codex's own upgrade", async () => {
    // As every earlier release left a home: the hook trusted, the marketplace on main.
    edit(join(home, ".codex-unpinned/config.toml"), `ref = "${tag}"\n`, "");
    bump(origin, version, "9.9.9");
    git("commit", "-qam", "9.9.9");

    for (const dir of PINNED) codex(dir, "plugin", "marketplace", "upgrade");
    for (const dir of [".codex", ".codex-old"]) {
      // Each app-server start also runs Codex's background marketplace upgrade.
      const after = await probe(join(home, dir));
      expect(after.hookEvents).toEqual(["hook/started", "hook/completed"]);
      expect(after.routedMessages).toBe(1);
      expect(cached(dir)).toEqual([version]);
    }
    expect(cached(".codex-unpinned")).toEqual(["9.9.9"]);

    const doctor = installer("doctor", null);
    expect(doctor.status).toBe(1);
    expect(failing(doctor.report.homes.flatMap((h) => h.checks))).toEqual([
      `marketplace pin: none, expected ${tag}`,
      `installed: 9.9.9, expected ${version}`,
      `session-start hook trusted: ${HOOK} modified`,
    ]);

    const { status, report } = installer("update", null);
    expect(status).toBe(0);
    expect(row(report, ".codex-unpinned").steps).toEqual([
      `pinned the marketplace to ${tag} (was unpinned)`,
      `updated 9.9.9 to ${version}`,
    ]);
    expect(row(report, ".codex").steps).toEqual([]);
    const after = await probe(join(home, ".codex-unpinned"));
    expect(after.routedMessages).toBe(1);
  }, 300_000);
});

describe.skipIf(!enabled)("the installer, on a Codex home that changes while it trusts the hook", () => {
  isolate({});
  const path = process.env.PATH;
  const hooksFile = () => join(home, ".codex/plugins/cache/oms/pstack", version, "hooks/codex-hooks.json");
  const configFile = () => join(home, ".codex/config.toml");
  const attack = (at, files) => writeFileSync(process.env.CODEX_ATTACK, JSON.stringify({ at, files }));
  let genuine;
  let config;
  let malicious;
  let marked;

  async function withCodex(use) {
    const server = await AppServer.start({ dir: join(home, ".codex"), bin: "codex" });
    try {
      return await use(server);
    } finally {
      server.close();
    }
  }
  const trustState = () => withCodex(async (server) => (await server.request("config/read", {})).config.hooks?.state ?? null);

  beforeAll(() => {
    const bin = join(root, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "codex"), `#!/bin/sh\nexec node "${join(repoRoot, "tests/codex-attacker.mjs")}" "$@"\n`, { mode: 0o755 });
    process.env.REAL_CODEX = resolveCli("codex");
    process.env.CODEX_ATTACK = join(root, "attack.json");
    process.env.PATH = `${bin}${delimiter}${path}`;
    expect(installer("install").status).toBe(0);
    genuine = readFileSync(hooksFile(), "utf8");
    config = readFileSync(configFile(), "utf8").replace(/\n\[hooks\.state[^]*$/, "\n");
    marked = join(root, "hook-ran");
    malicious = genuine.replace(/"command": "[^\n]*",\n/, `"command": "touch ${marked}",\n`);
  });

  // Each test starts from the installed plugin with its hook untrusted.
  beforeEach(() => {
    rmSync(process.env.CODEX_ATTACK, { force: true });
    rmSync(hooksFile());
    writeFileSync(hooksFile(), genuine);
    writeFileSync(configFile(), config);
  });

  afterAll(() => {
    process.env.PATH = path;
    delete process.env.REAL_CODEX;
    delete process.env.CODEX_ATTACK;
  });

  test("trusts nothing from a hooks file that is a symlink, even to the pinned text", async () => {
    const copy = join(root, "codex-hooks.json");
    writeFileSync(copy, genuine);
    rmSync(hooksFile());
    symlinkSync(copy, hooksFile());
    const { status, report } = installer("install");
    expect(status).toBe(1);
    expect(row(report, ".codex").steps).toEqual([]);
    expect(failing(row(report, ".codex").checks)).toEqual([
      `session-start hook trusted: no t3-pstack hook listed; Codex: skipping plugin hook in ${hooksFile()}: ` +
        `failed to fingerprint plugin contents: unsupported plugin entry type: ${hooksFile()}`,
    ]);
    expect(await trustState()).toBe(null);
  }, 300_000);

  test("trusts nothing when the hooks file Codex listed is swapped for the pinned one before the installer reads it", async () => {
    writeFileSync(hooksFile(), malicious);
    attack("after hooks/list", { [hooksFile()]: genuine });
    const { status, report } = installer("install");
    expect(existsSync(process.env.CODEX_ATTACK)).toBe(false);
    expect(status).toBe(1);
    expect(row(report, ".codex").steps).toEqual([]);
    expect(failing(row(report, ".codex").checks)).toEqual([`session-start hook trusted: ${HOOK} untrusted`]);
    expect(await trustState()).toBe(null);

    // The attacker's entry, back for the next session, does not run.
    writeFileSync(hooksFile(), malicious);
    const after = await probe(join(home, ".codex"));
    expect(after.hookEvents).toEqual([]);
    expect(existsSync(marked)).toBe(false);
  }, 300_000);

  test("takes the trust back when the hooks file changes between the check and the trust write", async () => {
    attack("before config/value/write", { [hooksFile()]: malicious });
    const { status, report } = installer("install");
    expect(existsSync(process.env.CODEX_ATTACK)).toBe(false);
    expect(status).toBe(1);
    expect(failing(row(report, ".codex").checks)).toEqual([
      `install: Codex lists ${HOOK} modified with another entry after the trust write, so the installer took that trust back`,
    ]);
    expect(await trustState()).toBe(null);
  }, 300_000);

  test("trusts nothing when config.toml changes between the source check and the trust write", async () => {
    const counterfeit = join(root, "counterfeit");
    mkdirSync(counterfeit, { recursive: true });
    attack("after hooks/list", { [configFile()]: config.replace(/^source = .*$/m, `source = ${JSON.stringify(counterfeit)}`) });
    const { status, report } = installer("install");
    expect(existsSync(process.env.CODEX_ATTACK)).toBe(false);
    expect(status).toBe(1);
    expect(failing(row(report, ".codex").checks)).toEqual([
      'install: config/value/write: {"code":-32600,"data":{"config_write_error_code":"configVersionConflict"},' +
        '"message":"Configuration was modified since last read. Fetch latest version and retry."}',
    ]);
    expect(await trustState()).toBe(null);
  }, 300_000);
});
