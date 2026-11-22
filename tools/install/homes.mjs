// Every Claude Code, Codex, and Kiro home the installer serves: the Claude
// Code and Codex defaults, the shell's CLAUDE_CONFIG_DIR, CODEX_HOME, and
// KIRO_HOME, each claudeAgent, codex, and kiro instance in T3's settings,
// enabled or not, and the homes named by flag. Each antigravity instance adds
// the Antigravity profile T3 keeps for it.
// An instance's home resolves as T3 resolves it (apps/server
// Drivers/ClaudeHome.ts and Drivers/CodexHomeLayout.ts): `config.homePath`,
// else the instance's CLAUDE_CONFIG_DIR or CODEX_HOME, else the default. T3
// expands a leading `~` in the first two and in `config.binaryPath`
// (provider-core pathExpansion.ts). Kiro settings have no home path
// (packages/provider-kiro/src/settings.ts), and T3 passes a kiro instance's
// KIRO_HOME as written, over T3's own (provider-core instanceEnvironment.ts),
// so its home is the one kiro-cli makes of the instance's value, else of the
// installer's: the value when it is absolute and does not hold the home
// folder, else ~/.kiro. T3 runs its `config.binaryPath`, else kiro-cli
// (packages/provider-kiro/src/server/acpSupport.ts and driver.ts).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";

import { expandHome as expand } from "./common.mjs";

const DRIVERS = { claudeAgent: "claude", codex: "codex", antigravity: "antigravity", kiro: "kiro" };
const HARNESSES = {
  claude: { env: "CLAUDE_CONFIG_DIR", home: ".claude", cli: "claude" },
  codex: { env: "CODEX_HOME", home: ".codex", cli: "codex" },
  kiro: { env: "KIRO_HOME", home: ".kiro", cli: "kiro-cli" },
};

// T3 keeps its state in `${T3CODE_HOME:-~/.t3}/userdata` (apps/server os-jank.ts and config.ts).
export function t3SettingsPath(env, home) {
  const base = env.T3CODE_HOME?.trim() ? resolve(expand(env.T3CODE_HOME.trim(), home)) : join(home, ".t3");
  return join(base, "userdata", "settings.json");
}

function readT3Settings(path) {
  try {
    const settings = JSON.parse(readFileSync(path, "utf8"));
    return { instances: settings.providerInstances ?? {}, overrides: settings.projectSettingsOverrides ?? {} };
  } catch (err) {
    // JSON.parse's message quotes the text around the fault, which can hold a token.
    return { instances: {}, overrides: {}, error: err.code === "ENOENT" ? "not found" : err instanceof SyntaxError ? "invalid JSON" : err.message };
  }
}

// T3 names an Antigravity instance's profile by the SHA-256 of its ID
// (apps/server antigravityAuthSupport.ts resolveAntigravityInstanceDirectories).
export const antigravityProfile = (settingsPath, id) =>
  join(dirname(settingsPath), "providers", "antigravity", createHash("sha256").update(id).digest("hex"));

const trimmed = (text) => text?.trim() || undefined;
const real = (path) => (existsSync(path) ? realpathSync(path) : resolve(path));

// kiro-cli collapses `.` and `..`, then resolves symlinks, before it compares
// the paths, and logs "ignoring KIRO_HOME" when it falls back to ~/.kiro.
function kiroHome(value, home) {
  const dir = trimmed(value);
  const fallback = join(home, HARNESSES.kiro.home);
  if (!dir) return { dir: fallback };
  if (!isAbsolute(dir) || join(real(home), sep).startsWith(join(real(resolve(dir)), sep))) return { dir: fallback, ignored: dir };
  return { dir: resolve(dir) };
}

// T3 keeps a secret variable's value out of settings.json and resolves it only
// to start the CLI (apps/server/src/serverSettings.ts persistSettingsSecrets).
function kiroInstanceHome(instance, home, inherited) {
  const variable = (instance.environment ?? []).findLast((v) => v.name === HARNESSES.kiro.env);
  if (variable?.secret || variable?.valueRedacted === true) return { secret: true };
  const bin = trimmed(instance.config?.binaryPath);
  return { ...kiroHome(variable ? variable.value : inherited, home), bin: bin && expand(bin, home) };
}

function instanceHome(instance, harness, home, inherited) {
  if (harness === "kiro") return kiroInstanceHome(instance, home, inherited);
  const config = instance.config ?? {};
  const instanceEnv = Object.fromEntries((instance.environment ?? []).map((v) => [v.name, v.value ?? ""]));
  const dir = trimmed(config.homePath) ?? trimmed(instanceEnv[HARNESSES[harness].env]);
  const bin = trimmed(config.binaryPath);
  const shadow = trimmed(config.shadowHomePath);
  return {
    dir: dir ? resolve(expand(dir, home)) : join(home, HARNESSES[harness].home),
    bin: bin && expand(bin, home),
    shadow: shadow && resolve(expand(shadow, home)),
  };
}

function settingsHomes({ instances, overrides }, settingsPath, home, inherited) {
  const found = [];
  for (const [id, instance] of Object.entries(instances)) {
    const harness = DRIVERS[instance.driver];
    if (!harness) continue;
    const disabled = instance.enabled === false || instance.config?.enabled === false;
    const from = `T3 instance ${id}${disabled ? " (disabled)" : ""}`;
    const at = harness === "antigravity" ? { dir: antigravityProfile(settingsPath, id) } : instanceHome(instance, harness, home, inherited);
    found.push({ harness, from, ...at });
  }
  // T3's built-in kiro instance runs unconfigured wherever a project turns it
  // on (apps/server ProviderInstanceRegistryHydration.ts deriveProviderInstanceConfigMap).
  if (!("kiro" in instances) && Object.values(overrides).some((project) => project?.providerInstances?.kiro?.enabled === true)) {
    found.push({ harness: "kiro", from: "T3 instance kiro (on in a project)", ...kiroHome(inherited, home) });
  }
  return found;
}

// Returns `{ homes, settings }`. A home is `{ harness, dir, from, bin }`:
// `from` lists where it was found, and `bin` is the CLI T3 runs for it, or
// null for an Antigravity profile, which the installer writes without one.
export function discoverHomes({ env, home, claudeHomes = [], codexHomes = [], kiroHomes = [] }) {
  const homes = new Map();
  const add = ({ harness, dir, from, bin, ignored }) => {
    const key = `${harness}\0${real(dir)}`;
    const cli = HARNESSES[harness]?.cli ?? null;
    const entry = homes.get(key) ?? { harness, dir, from: [], bin: cli };
    entry.from.push(from);
    if (bin && entry.bin === cli) entry.bin = bin;
    if (ignored) (entry.ignored ??= []).push({ value: ignored, from });
    homes.set(key, entry);
  };

  for (const harness of ["claude", "codex"]) add({ harness, dir: join(home, HARNESSES[harness].home), from: "default" });

  const settingsPath = t3SettingsPath(env, home);
  const settings = readT3Settings(settingsPath);
  const found = settingsHomes(settings, settingsPath, home, env[HARNESSES.kiro.env]);
  const secrets = found.filter((at) => at.secret).map((at) => at.from);
  found.filter((at) => !at.secret).forEach(add);
  // A Codex shadow home is T3's auth overlay: its config.toml, plugins, and
  // skills are symlinks into the shared home, which is the one to install into.
  const shadows = new Set(found.map(({ shadow }) => shadow).filter(Boolean));
  for (const [harness, { env: variable }] of Object.entries(HARNESSES)) {
    const value = trimmed(env[variable]);
    if (!value) continue;
    const at = harness === "kiro" ? kiroHome(value, home) : { dir: resolve(value) };
    if (!shadows.has(at.dir)) add({ harness, from: variable, ...at });
  }
  const flagged = { claude: claudeHomes, codex: codexHomes, kiro: kiroHomes };
  for (const [harness, dirs] of Object.entries(flagged)) {
    for (const dir of dirs) add({ harness, dir: resolve(expand(dir, home)), from: `--${harness}-home` });
  }

  const counted = Object.values(settings.instances).filter((instance) => DRIVERS[instance.driver]).length;
  return { homes: [...homes.values()], settings: { path: settingsPath, instances: counted, error: settings.error, secrets } };
}
