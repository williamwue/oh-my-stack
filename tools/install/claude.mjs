// Claude Code: the marketplace plugin at user scope, in one config home.
import { constants, copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  check,
  claudeSource,
  installHint,
  isPlainCopy,
  MARKETPLACE,
  marketplaceCheck,
  PLUGIN_ID,
  pluginIntact,
  readJson,
  runCli,
  trustedOnly,
  updated,
  writeAtomic,
} from "./common.mjs";

const readOr = (path, fallback) => (existsSync(path) ? readJson(path) : fallback);
const RECORDS = "plugins/installed_plugins.json";

function read(dir) {
  const settings = readOr(join(dir, "settings.json"), {});
  const known = readOr(join(dir, "plugins/known_marketplaces.json"), {});
  const records = readOr(join(dir, RECORDS), {}).plugins?.[PLUGIN_ID] ?? [];
  const user = records.find((r) => r.scope === "user");
  const declared = settings.extraKnownMarketplaces?.[MARKETPLACE];
  return {
    settings,
    marketplace: declared ?? known[MARKETPLACE],
    // The source settings.json declares and the one Claude Code last fetched.
    sources: [declared, known[MARKETPLACE]].filter((m) => m?.source).map((m) => claudeSource(m.source)),
    user,
    stale: user ? records.filter((r) => isStale(r, user)) : [],
    enabled: settings.enabledPlugins?.[PLUGIN_ID] === true,
  };
}

const isStale = (record, user) =>
  record.scope !== "user" && (record.version !== user.version || record.installPath !== user.installPath);

const intact = (state, skills) => state.user !== undefined && pluginIntact(state.user.installPath, ".claude-plugin/plugin.json", skills);

// Third-party marketplaces default to no auto-update; the /plugin toggle
// writes this key, and Claude Code copies it into known_marketplaces.json at
// its next start. A directory source loads in place and has nothing to fetch.
const autoUpdates = (marketplace) => marketplace?.autoUpdate === true || marketplace?.source?.source === "directory";

export function installClaude(home, { source, trusted, version, skills }) {
  const steps = [];
  const plugin = (...args) => runCli(home.bin, ["plugin", ...args], { CLAUDE_CONFIG_DIR: home.dir });
  mkdirSync(home.dir, { recursive: true });
  if (!read(home.dir).sources.length) {
    plugin("marketplace", "add", source.arg);
    steps.push(`added the ${MARKETPLACE} marketplace from ${source.arg}`);
  }
  // Nothing installs from a marketplace of another source; doctor names it.
  let state = read(home.dir);
  if (!trustedOnly(state.sources, trusted)) return steps;
  if (!state.user) {
    plugin("install", PLUGIN_ID, "--scope", "user");
    steps.push(`installed ${read(home.dir).user?.version}`);
  } else if (state.user.version !== version) {
    // `plugin update` reads the marketplace as last fetched.
    plugin("marketplace", "update", MARKETPLACE);
    plugin("update", PLUGIN_ID, "--scope", "user");
    steps.push(updated(state.user.version, read(home.dir).user?.version, version));
  } else if (!intact(state, skills)) {
    plugin("install", PLUGIN_ID, "--scope", "user");
    steps.push(`reinstalled ${read(home.dir).user?.version}, whose files were missing`);
  }
  if (!read(home.dir).enabled) {
    plugin("enable", PLUGIN_ID, "--scope", "user");
    steps.push("enabled it");
  }
  state = read(home.dir);
  if (state.marketplace && !autoUpdates(state.marketplace)) {
    const declared = state.settings.extraKnownMarketplaces?.[MARKETPLACE] ?? { source: state.marketplace.source };
    state.settings.extraKnownMarketplaces = {
      ...state.settings.extraKnownMarketplaces,
      [MARKETPLACE]: { ...declared, autoUpdate: true },
    };
    writeAtomic(join(home.dir, "settings.json"), JSON.stringify(state.settings, null, 2) + "\n");
    steps.push("turned on marketplace auto-update");
  }
  steps.push(...syncScopedRecords(home.dir));
  return steps;
}

// Claude Code reads ~/.claude/settings.json as the project settings of the
// home folder, so a session started there under another config home adds a
// project-scope record, and that record keeps the version it found.
// `claude plugin uninstall --scope project` would edit ~/.claude/settings.json,
// which belongs to the main home. So the record is brought to the user-scope
// install in place, after a backup.
export function syncScopedRecords(dir) {
  const path = join(dir, RECORDS);
  const { user, stale } = read(dir);
  if (!stale.length) return [];
  const backup = `${path}.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
  copyFileSync(path, backup, constants.COPYFILE_EXCL);
  const data = readJson(path);
  const steps = [];
  for (const record of data.plugins[PLUGIN_ID].filter((r) => isStale(r, user))) {
    steps.push(`moved the ${record.scope}-scope record for ${record.projectPath} from ${record.version} to ${user.version}`);
    Object.assign(record, {
      installPath: user.installPath,
      version: user.version,
      gitCommitSha: user.gitCommitSha,
      lastUpdated: user.lastUpdated,
    });
  }
  writeAtomic(path, JSON.stringify(data, null, 2) + "\n");
  return [...steps, `backed up ${RECORDS} to ${backup}`];
}

export function doctorClaude(home, { source, trusted, version, skills }) {
  const hint = installHint(source);
  const state = read(home.dir);
  const installed = state.user?.version;
  const whole = intact(state, skills);
  const skillsDir = join(home.dir, "skills");
  const plain = existsSync(skillsDir)
    ? readdirSync(skillsDir).filter((name) => isPlainCopy(name, join(skillsDir, name, "SKILL.md"), skills))
    : [];
  return [
    marketplaceCheck(state.sources, { source, trusted }, `remove it with \`CLAUDE_CONFIG_DIR=${home.dir} claude plugin marketplace remove ${MARKETPLACE}\``),
    check(
      "installed",
      installed === version && whole,
      !installed
        ? "not installed"
        : installed !== version
          ? `${installed}, expected ${version}`
          : whole
            ? installed
            : `${installed}, but its files at ${state.user.installPath} are missing`,
      hint,
    ),
    check("enabled", state.enabled, state.enabled ? "yes" : "no", hint),
    check("marketplace auto-update", autoUpdates(state.marketplace), state.marketplace ? String(autoUpdates(state.marketplace)) : "no marketplace", hint),
    check(
      "other-scope records",
      state.stale.length === 0,
      state.stale.length ? state.stale.map((r) => `${r.scope} ${r.projectPath} at ${r.version}`).join("; ") : "none stale",
      hint,
    ),
    check(
      "no plain copies of plugin skills",
      plain.length === 0,
      plain.length ? plain.map((name) => join(skillsDir, name)).join(", ") : "none",
      "delete these folders; the plugin ships the same skills",
    ),
  ];
}
