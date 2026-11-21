// Codex: the marketplace plugin in one CODEX_HOME, and trust for its hook.
// Codex runs a plugin hook only once `hooks.state."<key>".trusted_hash` in
// config.toml matches the hook's entry. Its TUI asks for that trust, but
// `codex app-server`, which T3 runs, never does. So the installer trusts the
// hook the way the TUI does, through the app-server, with the hash Codex
// reports, on every install and update, once its hooks file is the one
// tools/frozen-hooks.json pins. Only the hooks file is pinned, not the script
// its command runs. Codex's own trust covers the entry alone, and the script
// changes with each release, so the marketplace source check is what vouches
// for the script.
//
// Codex 0.164 and later also tie that trust to every file in the plugin, so a
// release that Codex's own marketplace auto-upgrade installs turns the hook
// off. So the installer pins a Git marketplace to this release's tag, and only
// the installer, which trusts the hook again, moves it.
import { spawn } from "node:child_process";
import { closeSync, constants, existsSync, fstatSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";

import { hookDigest } from "../plugin.mjs";
import {
  check,
  codexSource,
  installHint,
  isPlainCopy,
  launch,
  MARKETPLACE,
  marketplaceCheck,
  neutralCwd,
  PLUGIN_ID,
  pluginIntact,
  runCli,
  trustedOnly,
  updated,
} from "./common.mjs";

const REQUEST_TIMEOUT = 60_000;

// A JSON-RPC client over `codex app-server` stdio.
export class AppServer {
  static async start(home) {
    const server = new AppServer(home);
    await server.request("initialize", { clientInfo: { name: "t3-pstack-installer", version: "1" } });
    server.proc.stdin.write(JSON.stringify({ method: "initialized" }) + "\n");
    return server;
  }

  constructor(home) {
    const run = launch(home.bin, ["app-server"]);
    this.proc = spawn(run.file, run.args, {
      ...run.options,
      cwd: neutralCwd(),
      env: { ...process.env, CODEX_HOME: home.dir },
      stdio: ["pipe", "pipe", "ignore"],
    });
    this.nextId = 0;
    this.pending = new Map();
    this.notifications = [];
    const failAll = (err) => {
      for (const { reject, timer } of this.pending.values()) {
        clearTimeout(timer);
        reject(err);
      }
      this.pending.clear();
    };
    this.proc.on("error", failAll);
    this.proc.stdin.on("error", failAll);
    this.proc.on("exit", (code) => failAll(new Error(`codex app-server exited with ${code}`)));
    let buffer = "";
    this.proc.stdout.on("data", (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        let message;
        try {
          message = line ? JSON.parse(line) : {};
        } catch {
          // Not quoted: the line could hold anything the server printed.
          failAll(new Error("codex app-server printed a line that is not JSON-RPC"));
          this.close();
          return;
        }
        if (message.method) this.notifications.push(message);
        const waiter = this.pending.get(message.id);
        if (!waiter || message.method) continue;
        this.pending.delete(message.id);
        clearTimeout(waiter.timer);
        if (message.error) waiter.reject(new Error(`${waiter.method}: ${JSON.stringify(message.error)}`));
        else waiter.resolve(message.result);
      }
    });
  }

  request(method, params) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method}: no reply from codex app-server in ${REQUEST_TIMEOUT / 1000}s`));
      }, REQUEST_TIMEOUT);
      this.pending.set(id, { resolve, reject, method, timer });
      this.proc.stdin.write(JSON.stringify({ id, method, params }) + "\n");
    });
  }

  // On Windows the process may be cmd.exe running npm's shim, and killing it
  // leaves the server it started; closing stdin ends that server too.
  close() {
    this.proc.stdin.end();
    this.proc.kill();
  }
}

async function withServer(home, use) {
  const server = await AppServer.start(home);
  try {
    return await use(server);
  } finally {
    server.close();
  }
}

// Codex keeps one cache directory per installed version and removes the old
// one when it installs another.
const cacheDir = (dir) => join(dir, "plugins/cache", MARKETPLACE, PLUGIN_ID.split("@")[0]);
function installedVersions(dir) {
  const cache = cacheDir(dir);
  return existsSync(cache) ? readdirSync(cache).filter((name) => !name.startsWith(".")) : [];
}

const marketplaceSources = (config) => (config.marketplaces?.[MARKETPLACE] ? [codexSource(config.marketplaces[MARKETPLACE])] : []);

async function pluginState(server, dir, skills) {
  const { config } = await server.request("config/read", {});
  const { marketplaces = [] } = await server.request("plugin/list", {});
  const plugin = marketplaces.flatMap((m) => m.plugins ?? []).find((p) => p.id === PLUGIN_ID);
  const versions = installedVersions(dir);
  return {
    marketplace: config.marketplaces?.[MARKETPLACE],
    sources: marketplaceSources(config),
    installed: plugin?.installed === true,
    enabled: plugin?.enabled === true,
    versions,
    intact: versions.length === 1 && pluginIntact(join(cacheDir(dir), versions[0]), ".codex-plugin/plugin.json", skills),
  };
}

async function pluginHooks(server) {
  const { data } = await server.request("hooks/list", {});
  return data.flatMap((entry) => entry.hooks).filter((hook) => hook.pluginId === PLUGIN_ID);
}

// Codex trusts a plugin hook with a hash of every file in the plugin. When it
// cannot hash them, as with a symlink in the plugin, it lists no hook and
// says why in a warning that names the plugin's real path.
async function pluginHookWarnings(server, dir) {
  if (!existsSync(cacheDir(dir))) return [];
  const cache = realpathSync(cacheDir(dir));
  const { data } = await server.request("hooks/list", {});
  return data.flatMap((entry) => entry.warnings ?? []).filter((warning) => warning.includes(cache));
}

// A file's text, read once without following a symlink, or null when it is a
// symlink or not a regular file.
function readRegularFile(path) {
  if (!lstatSync(path, { throwIfNoEntry: false })?.isFile()) return null;
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    return fstatSync(fd).isFile() ? readFileSync(fd, "utf8") : null;
  } finally {
    closeSync(fd);
  }
}

// The listed hook is an entry of the hooks file the Codex manifest names, read
// at the pinned digest. Codex hashes the file when it lists it, so the listed
// event, matcher, and command must be an entry of that text, with the plugin
// root for ${CLAUDE_PLUGIN_ROOT}, or the hash Codex reports is of other text.
function isPinned(hook, pin) {
  const unix = (path) => path.replaceAll("\\", "/");
  if (!unix(hook.sourcePath).endsWith(`/${pin.path}`)) return false;
  const text = readRegularFile(hook.sourcePath);
  if (text === null || hookDigest(text) !== pin.sha256) return false;
  const root = hook.sourcePath.slice(0, -pin.path.length - 1);
  const entries = Object.entries(JSON.parse(text).hooks).flatMap(([event, groups]) =>
    groups.flatMap((group) => group.hooks.map((entry) => ({ event, matcher: group.matcher ?? null, entry }))),
  );
  const expand = (line) => unix(line.replaceAll("${CLAUDE_PLUGIN_ROOT}", root));
  return entries.some(
    ({ event, matcher, entry }) =>
      event[0].toLowerCase() + event.slice(1) === hook.eventName &&
      matcher === hook.matcher &&
      [entry.command, entry.commandWindows].some((line) => line !== undefined && expand(line) === unix(hook.command)),
  );
}

// Why `codex plugin add` runs: a first install, an update, a cache with
// missing files, or a disabled plugin, since Codex has no enable command.
// Null when the home is already at `version`.
function codexStep(state, version) {
  if (!state.installed) return "install";
  if (state.versions.length && state.versions.join() !== version) return "update";
  if (!state.intact) return "repair";
  if (!state.enabled) return "enable";
  return null;
}

export async function installCodex(home, { source, trusted, version, skills, codexHook }) {
  const steps = [];
  const plugin = (...args) => runCli(home.bin, ["plugin", ...args], { CODEX_HOME: home.dir });
  const state = () => withServer(home, (server) => pluginState(server, home.dir, skills));
  mkdirSync(home.dir, { recursive: true });
  let before = await state();
  if (!before.sources.length) {
    plugin("marketplace", "add", source.arg);
    steps.push(`added the ${MARKETPLACE} marketplace from ${source.arg}`);
    before = await state();
  }
  // Nothing installs from a marketplace of another source; doctor names it.
  if (!trustedOnly(before.sources, trusted)) return steps;
  const tag = `v${version}`;
  if (before.marketplace.source_type === "git" && before.marketplace.ref !== tag) {
    steps.push(...(await pinMarketplace(home, trusted, tag, () => plugin("marketplace", "upgrade", MARKETPLACE))));
  }
  const step = codexStep(before, version);
  if (step) {
    // A local marketplace is read in place; a Git one is a snapshot to refresh.
    if (step !== "enable" && !source.local) plugin("marketplace", "upgrade", MARKETPLACE);
    plugin("add", PLUGIN_ID);
    const after = installedVersions(home.dir).join(", ");
    steps.push(
      {
        install: `installed ${after}`,
        update: updated(before.versions.join(", "), after, version),
        repair: `reinstalled ${after}, whose files were missing`,
        enable: "enabled it",
      }[step],
    );
  }
  steps.push(...(await withServer(home, (server) => trustHooks(server, trusted, codexHook))));
  return steps;
}

// Codex's auto-upgrade moves a Git marketplace only when the hash `git
// ls-remote` reports for its ref differs from the commit it installed, so a
// lightweight tag, as each release's is, holds it. The ref is written before
// `upgrade` makes Codex fetch it, so an app-server that starts in between,
// such as the installer's own, fetches the tag too. A source without the tag, such as a
// fork that never pushed it, gets its old ref back and updates as before.
async function pinMarketplace(home, trusted, tag, upgrade) {
  const keyPath = `marketplaces.${MARKETPLACE}.ref`;
  const pinned = await withServer(home, async (server) => {
    const { config, layers } = await server.request("config/read", { includeLayers: true });
    if (!trustedOnly(marketplaceSources(config), trusted)) return null;
    const user = layers.find((layer) => layer.name.type === "user");
    const written = await server.request("config/value/write", { keyPath, value: tag, mergeStrategy: "replace", expectedVersion: user.version });
    return { was: config.marketplaces[MARKETPLACE].ref ?? null, version: written.version };
  });
  if (!pinned) return [];
  try {
    upgrade();
  } catch (err) {
    await withServer(home, (server) =>
      server.request("config/value/write", { keyPath, value: pinned.was, mergeStrategy: "replace", expectedVersion: pinned.version }),
    );
    const stays = pinned.was ? `on ${pinned.was}` : "unpinned";
    return [`Codex could not fetch ${tag}, so the marketplace stays ${stays} (${err.message.split("\n")[0]})`];
  }
  return [`pinned the marketplace to ${tag} (was ${pinned.was ?? "unpinned"})`];
}

// A local directory is read in place and has no tag to pin.
export function pinCheck(marketplace, tag, hint) {
  if (marketplace?.source_type === "local") return check("marketplace pin", true, "none, since a local directory has no tag");
  const ref = marketplace?.ref;
  return check("marketplace pin", ref === tag, !marketplace ? "no marketplace" : ref === tag ? tag : `${ref ?? "none"}, expected ${tag}`, hint);
}

// One app-server session checks the marketplace source, lists the hooks, and
// writes the trust. The write names the config version the source check read,
// so Codex refuses it when config.toml changed in between. A config write
// also makes Codex read the hooks files again, so the listing after it shows
// a hooks file that changed since the check, and then the trust is taken
// back. `upsert`: `replace` would drop the user's other trusted hooks. An
// entry from any other hooks file stays untrusted, and doctor names it.
async function trustHooks(server, trusted, pin) {
  const { config, layers } = await server.request("config/read", { includeLayers: true });
  if (!trustedOnly(marketplaceSources(config), trusted)) return [];
  const user = layers.find((layer) => layer.name.type === "user");
  const pending = (await pluginHooks(server)).filter(
    (h) => (h.trustStatus === "untrusted" || h.trustStatus === "modified") && isPinned(h, pin),
  );
  if (!pending.length) return [];
  await server.request("config/value/write", {
    keyPath: "hooks.state",
    mergeStrategy: "upsert",
    value: Object.fromEntries(pending.map((h) => [h.key, { trusted_hash: h.currentHash }])),
    expectedVersion: user.version,
  });
  const listed = new Map((await pluginHooks(server)).map((h) => [h.key, h]));
  const now = (h) => listed.get(h.key) ?? {};
  const same = (h) => now(h).command === h.command && now(h).currentHash === h.currentHash;
  const failed = pending.filter((h) => now(h).trustStatus !== "trusted" || !same(h));
  if (failed.length) {
    await server.request("config/value/write", { keyPath: "hooks.state", mergeStrategy: "replace", value: user.config.hooks?.state ?? null });
    const status = (h) => `${h.key} ${now(h).trustStatus ?? "unlisted"}${same(h) ? "" : " with another entry"}`;
    throw new Error(`Codex lists ${failed.map(status).join(", ")} after the trust write, so the installer took that trust back`);
  }
  return pending.map((h) => `trusted hook ${h.key} (was ${h.trustStatus})`);
}

export async function doctorCodex(home, { source, trusted, version, skills, codexHook }) {
  const hint = installHint(source);
  return withServer(home, async (server) => {
    const state = await pluginState(server, home.dir, skills);
    const hooks = await pluginHooks(server);
    const warnings = hooks.length ? [] : await pluginHookWarnings(server, home.dir);
    const listed = (await server.request("skills/list", { cwds: [neutralCwd()] })).data.flatMap((entry) => entry.skills);
    const plain = listed.filter((skill) => isPlainCopy(skill.name, skill.path, skills)).map((skill) => skill.path);
    const installed = state.versions.join(", ");
    const good = (h) => h.trustStatus === "trusted" && isPinned(h, codexHook);
    return [
      marketplaceCheck(state.sources, { source, trusted }, `remove it with \`CODEX_HOME=${home.dir} codex plugin marketplace remove ${MARKETPLACE}\``),
      pinCheck(state.marketplace, `v${version}`, hint),
      check(
        "installed",
        state.installed && installed === version && state.intact,
        !state.installed
          ? "not installed"
          : state.versions.length && installed !== version
            ? `${installed}, expected ${version}`
            : state.intact
              ? installed
              : `its files in ${join(cacheDir(home.dir), installed)} are missing`,
        hint,
      ),
      check("enabled", state.enabled, state.enabled ? "yes" : "no", hint),
      check(
        "session-start hook trusted",
        hooks.length > 0 && hooks.every(good),
        hooks.length
          ? hooks.map((h) => `${h.key} ${h.trustStatus}${isPinned(h, codexHook) ? "" : `, not from the ${codexHook.path} this release pins`}`).join("; ")
          : ["no t3-pstack hook listed", ...warnings.map((warning) => `Codex: ${warning}`)].join("; "),
        hooks.some((h) => h.trustStatus === "modified")
          ? `${hint}; Codex 0.164 and later turn the hook off whenever the plugin's files change, as each update does`
          : hint,
      ),
      check(
        "no plain copies of plugin skills",
        plain.length === 0,
        plain.length ? plain.slice(0, 5).join(", ") + (plain.length > 5 ? ` and ${plain.length - 5} more` : "") : "none",
        "delete these copies, for example from ~/.agents/skills; the plugin ships the same skills",
      ),
    ];
  });
}
