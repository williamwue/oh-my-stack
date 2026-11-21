// Antigravity: T3 starts each antigravity instance on Antigravity CLI 1.5.0 or
// newer as `<cli> acp --gemini-dir <profile>`, where the profile is <T3 userdata>/providers/antigravity/<the
// SHA-256 of the instance ID> (apps/server antigravityAuthSupport.ts), and agy
// discovers a plugin at <profile>/config/plugins/<dir>. `agy plugin install`
// writes ~/.gemini whatever GEMINI_HOME says, so the installer copies the
// plugin tree into each profile itself. The older ACP runtime (1.4.x) that
// earlier T3 releases installed loads no plugins or session-start hooks.
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

import { check, pluginIntact, readJson, tempBeside } from "./common.mjs";

export const ANTIGRAVITY_MANIFEST = ".antigravity-plugin/plugin.json";
// The install directory, which keys Antigravity's enabled state in config.json.
const DIR = "t3-pstack";

const installPath = (home) => join(home.dir, "config", "plugins", DIR);
const installedVersion = (path) => (existsSync(join(path, ANTIGRAVITY_MANIFEST)) ? readJson(join(path, ANTIGRAVITY_MANIFEST)).version : undefined);
// The session-start hook's files: the hooks file agy reads, its script, and
// what the script reads. A copy routes as released only while each matches
// the plugin this run installs.
const HOOK_FILES = ["hooks.json", "hooks/session-start.sh", "hooks/session-start-context.md", "skills/setup-pstack/scripts/read-sheet.sh"];
const intact = (path, pluginRoot, skills) =>
  pluginIntact(path, ANTIGRAVITY_MANIFEST, skills) &&
  HOOK_FILES.every((file) => existsSync(join(path, file)) && readFileSync(join(path, file)).equals(readFileSync(join(pluginRoot, file))));
// config.json wins over the manifest wherever it has an entry, and the
// manifest ships the plugin on.
const enabled = (home) => {
  const config = join(home.dir, "config", "config.json");
  return !existsSync(config) || readJson(config).plugins?.[DIR]?.enabled !== false;
};

export function installAntigravity(home, { pluginRoot, version, skills }) {
  const path = installPath(home);
  const before = installedVersion(path);
  if (before === version && intact(path, pluginRoot, skills)) return [];
  // T3 creates the profile private, and keeps it so when it starts the instance.
  mkdirSync(home.dir, { recursive: true, mode: 0o700 });
  mkdirSync(dirname(path), { recursive: true });
  // A whole tree swapped in by rename, so a session never loads half a plugin
  // and files a release dropped do not linger.
  const fresh = tempBeside(path);
  cpSync(pluginRoot, fresh, { recursive: true });
  const old = existsSync(path) ? tempBeside(path) : undefined;
  if (old) renameSync(path, old);
  renameSync(fresh, path);
  if (old) rmSync(old, { recursive: true, force: true });
  return [before === undefined ? `installed ${version}` : before === version ? `reinstalled ${version}, whose files were missing or changed` : `updated ${before} to ${version}`];
}

export function doctorAntigravity(home, { pluginRoot, version, skills, hint }) {
  const path = installPath(home);
  const installed = installedVersion(path);
  const whole = intact(path, pluginRoot, skills);
  const on = enabled(home);
  return [
    check(
      "installed",
      installed === version && whole,
      !installed ? "not installed" : installed !== version ? `${installed}, expected ${version}` : whole ? installed : `${installed}, but its files at ${path} are missing or changed`,
      hint,
    ),
    check("enabled", on, on ? "yes" : `no, ${join(home.dir, "config", "config.json")} turns it off`, `turn t3-pstack on in that file's "plugins" map`),
  ];
}
