#!/usr/bin/env node
// The T3 override sheet: one `<role>: <entry>` line per role, or a
// comma-separated list for a panel role. An entry is
// `<providerInstanceId>/<modelId>` plus `<optionId>=<value>` pairs, or
// `inherit-parent` (alias `auto`). An entry maps one to one onto a
// `delegate_task` target, so this file is the only place the grammar lives:
// the generator checks the models.json tiers with it, and setup-pstack checks
// a sheet against the live `orchestrator_capabilities` catalog with it.
//
// Validate a sheet with <sheet.md> <catalog.json>, or preview one with
// --candidate <budget> <catalog.json> [current.md]. Both modes are read-only.

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const INHERIT = ["inherit-parent", "auto"];
const HOOK_VALUES = ["on", "off"];
const SHEET_DEFAULTS = 4;
const LEVELS = ["low", "medium", "high", "xhigh"];
const BUDGETS = { large: { offset: 1, label: "xhigh" }, medium: { offset: 0, label: "high" }, small: { offset: -1, label: "medium" } };

// Throws on a malformed entry; returns null for an inherit alias.
export function parseEntry(text) {
  const [target, ...pairs] = text.trim().split(/\s+/);
  if (INHERIT.includes(target)) {
    if (pairs.length) throw new Error(`"${text.trim()}": ${target} takes no options`);
    return null;
  }
  const match = target.match(/^([A-Za-z0-9_-]+)\/([A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*)$/);
  if (!match) throw new Error(`"${text.trim()}" does not start with <providerInstanceId>/<modelId>`);
  const options = Object.create(null);
  for (const pair of pairs) {
    const option = pair.match(/^([A-Za-z0-9_]+)=([A-Za-z0-9._-]+)$/);
    if (!option) throw new Error(`"${text.trim()}": "${pair}" is not <optionId>=<value>`);
    if (option[1] in options) throw new Error(`"${text.trim()}" sets "${option[1]}" twice`);
    options[option[1]] = option[2];
  }
  return { providerInstanceId: match[1], model: match[2], options };
}

// The family is the first segment (`claude`, `gpt`, `gemini`) of the model ID's
// last `/` part, so a Claude model served by a Codex-driver pool still counts as
// Claude, and an OpenCode route prefix such as `openrouter/` decides nothing.
// Fable is its own family, `claude-fable`, as Lauren's pstack has it since 0.15.42.
export function family(model) {
  const id = model.split("/").pop();
  return /^claude-fable(?:-|$)/.test(id) ? "claude-fable" : id.split("-")[0];
}

// A panel's families among its concrete targets. An inherit entry does not
// count: one sheet serves every thread on the machine, so its family depends on
// the thread that dispatches.
export function panelFamilies(entries) {
  return new Set(entries.filter(Boolean).map((e) => family(e.model)));
}

// Every line but blank lines and `#` headings, as `{ line, key, value }`, with
// no key or value when the line is not exactly `<key>: <value>`. setup-pstack
// writes the sheet, so it holds no prose, and one strict rule leaves no shape a
// misspelled role line can slip through.
export function parseSheet(markdown) {
  return markdown
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .flatMap((line, i) => {
      if (line.trim() === "" || line.startsWith("#")) return [];
      const match = line.match(/^([a-z][a-z ,-]*[a-z]): (\S(?:.*\S)?)$/);
      return [{ line: i + 1, key: match?.[1], value: match?.[2] }];
    });
}

// Problems with a parsed sheet, for the role vocabulary of models.json (each
// role with its `tier`, and the `alias` a released sheet may still use), its
// tier defaults, and an `orchestrator_capabilities` catalog. A role whose tier
// default is a list, a panel or the cross-judge pool, takes a list that spans
// two model families. A role with no line runs on its tier's default, so that
// default must dispatch here too.
// A `retired` role's line is one a released sheet still carries and no skill
// reads, so it passes unchecked until setup-pstack drops it.
// With no catalog, as in the installer's doctor, only the grammar is checked.
export function checkSheet(sheet, { roles, defaults, catalog, retired = [] }) {
  const problems = [];
  const byRole = new Map(roles.flatMap((r) => [[r.role, r], ...(r.alias ? [[r.alias, r]] : [])]));
  const seen = new Set();
  for (const { line, key, value } of sheet) {
    if (!key) {
      problems.push(`line ${line}: not a "<role>: <value>" line (lowercase role, one space after the colon, no indent or markup)`);
      continue;
    }
    if (retired.includes(key)) continue;
    const canonical = byRole.get(key)?.role ?? key;
    if (seen.has(canonical)) problems.push(`"${key}" appears twice; only one line may set it`);
    seen.add(canonical);
    if (key === "session hook") {
      if (!HOOK_VALUES.includes(value)) problems.push(`session hook: "${value}" is not on or off`);
      continue;
    }
    if (key === "default effort") {
      problems.push("default effort: T3 entries carry their own options; delete this line");
      continue;
    }
    const role = byRole.get(key);
    if (!role) {
      problems.push(`"${key}" is not a pstack role`);
      continue;
    }
    const texts = value.split(",");
    const isList = Array.isArray(defaults[role.tier]);
    if (!isList && texts.length > 1) problems.push(`${key}: takes one entry, not a list`);
    const entries = [];
    for (const text of texts) {
      try {
        entries.push(parseEntry(text));
      } catch (err) {
        problems.push(`${key}: ${err.message}`);
      }
    }
    const runnable = [];
    for (const entry of entries.filter(Boolean)) {
      const found = checkTarget(entry, catalog);
      problems.push(...found.map((p) => `${key}: ${p}`));
      if (!found.length) runnable.push(entry);
    }
    const targets = texts.map((t) => t.trim()).filter((t) => !INHERIT.includes(t));
    if (new Set(targets).size < targets.length) problems.push(`${key}: lists the same target twice`);
    if (isList) {
      const families = panelFamilies(runnable);
      if (families.size < 2) {
        problems.push(
          `${key}: a panel needs at least two model families among its targets (inherit-parent does not count), got ${[...families].join(", ") || "none"}`,
        );
      }
    }
  }
  for (const role of roles.filter((r) => !seen.has(r.role))) {
    for (const entry of [defaults[role.tier]].flat()) {
      problems.push(...checkTarget(parseEntry(entry), catalog).map((p) => `${role.role} (no line, tier default): ${p}`));
    }
  }
  return problems;
}

function checkTarget({ providerInstanceId, model, options }, catalog) {
  if (!catalog) return [];
  const at = `${providerInstanceId}/${model}`;
  const provider = catalog.providers.find((p) => p.providerInstanceId === providerInstanceId);
  if (!provider) return [`${at}: no provider instance "${providerInstanceId}" in this T3`];
  if (!provider.canRunChildTask || provider.canRunCrossProviderChildTask === false) {
    const why = (provider.constraints ?? []).join(" ");
    return [`${at}: "${providerInstanceId}" cannot run child tasks${why ? ` (${why})` : ""}`];
  }
  const listed = provider.models.find((m) => m.id === model);
  if (!listed) return [`${at}: "${providerInstanceId}" does not list model "${model}"`];
  const known = listed.options ?? [];
  const problems = [];
  for (const [id, value] of Object.entries(options)) {
    const option = known.find((o) => o.id === id);
    const allowed = allowedValues(option);
    if (!option) problems.push(`${at}: no option "${id}" (has ${known.map((o) => o.id).join(", ") || "none"})`);
    else if (!allowed.includes(value)) problems.push(`${at}: ${id}=${value} is not one of ${allowed.join(", ")}`);
  }
  return problems;
}

// orchestrator_capabilities lists an option's values as a plain array, with
// booleans as JSON booleans. The `type` and `options: [{ id }]` shape is
// still read for catalogs saved in that form.
function allowedValues(option) {
  if (Array.isArray(option?.values)) return option.values.map(String);
  if (option?.type === "boolean") return ["true", "false"];
  return (option?.options ?? []).map((o) => o.id);
}

function budgetEntry(text, budget, defaultBudget, catalog) {
  const offset = BUDGETS[budget].offset - BUDGETS[defaultBudget].offset;
  if (offset === 0) return text;
  const entry = parseEntry(text);
  if (!entry) return text;
  const provider = catalog?.providers.find((p) => p.providerInstanceId === entry.providerInstanceId);
  const model = provider?.models.find((m) => m.id === entry.model);
  // A provider's model variant is a separate setting, not an effort level.
  return text.replace(/\b(effort|reasoningEffort|thought_level)=(low|medium|high|xhigh)\b/g, (_, option, level) => {
    const index = Math.max(0, Math.min(LEVELS.indexOf(level) + offset, LEVELS.length - 1));
    const allowed = allowedValues(model?.options?.find((o) => o.id === option));
    const available = LEVELS.slice(0, index + 1).findLast((value) => allowed.includes(value));
    return `${option}=${available ?? LEVELS[index]}`;
  });
}

function releasedDefault(texts, role, version) {
  const ids = texts.map((text) => text.trim().split(/\s+/)[0]);
  const models = ids.map((id) => id.split("/").at(-1));
  if (version >= 3) return false;
  if (role === "arena cross-judge pool" && models.length === 3 &&
    ["claude-fable-", "claude-opus-", "gemini-"].every((prefix) => models.some((model) => model.startsWith(prefix)))) return true;
  if (version >= 2) return false;
  if (["bug-fix", "perf-issue", "hillclimb"].includes(role) && ids.join() === "claudeAgent/claude-fable-5-1") return true;
  if (role === "swarm workers" && ids.join() === "claudeAgent/claude-opus-5-5") return true;
  return ["arena runners", "arena cross-judge pool", "interrogate reviewers"].includes(role) &&
    ids.sort().join() === "claudeAgent/claude-opus-5-5,codex/gpt-6.1-sol,grok/grok-4.7";
}

function migrateEntry(text, { panel, version, oldBudget, neon, catalog }) {
  const entry = parseEntry(text);
  if (!entry || !catalog) return text;
  const { providerInstanceId, model, options } = entry;
  const provider = catalog.providers.find((p) => p.providerInstanceId === providerInstanceId);
  if (!provider || (provider.driverKind ?? providerInstanceId) !== "antigravity") return text;

  const level = options.thought_level ?? options.thinking_level;
  const releasedNeon = model === "gemini-4-neon" && level === "high" && ["large", "unlimited"].includes(oldBudget);
  if (neon && panel && version < 3 && (model === "gemini-4-carbon" || releasedNeon)) {
    const target = { ...parseEntry(neon), providerInstanceId };
    if (checkTarget(target, catalog).length === 0) {
      const [option, value] = Object.entries(target.options)[0];
      return `${providerInstanceId}/${target.model} ${option}=${value}`;
    }
  }
  const listed = provider.models.find((m) => m.id === model)?.options ?? [];
  if (options.thinking_level && !options.thought_level &&
    allowedValues(listed.find((o) => o.id === "thought_level")).includes(options.thinking_level) &&
    !listed.some((o) => o.id === "thinking_level")) {
    return text.replace(/\bthinking_level=/, "thought_level=");
  }
  return text;
}

// Compute a candidate. The setup skill previews it and owns any file write.
export function candidateSheet({ roles, tiers, defaultBudget, sessionHook }, {
  budget = defaultBudget, current = "", catalog, report = () => {},
} = {}) {
  if (!Object.hasOwn(BUDGETS, budget)) throw new Error(`unknown T3 budget "${budget}"`);
  if (!Object.hasOwn(BUDGETS, defaultBudget)) throw new Error(`unknown built-in T3 budget "${defaultBudget}"`);
  const text = current.replace(/^\uFEFF/, "");
  const oldBudget = text.match(/^# budget: ([a-z]+)/m)?.[1];
  const generated = oldBudget || /^# pstack model configuration \(T3\)(?:\.|\r?$)/m.test(text);
  const version = Number(text.match(/^# defaults: (\d+)\r?$/m)?.[1] ?? (generated ? 0 : SHEET_DEFAULTS));
  const overrides = new Set([...text.matchAll(/^# override: (.+)\r?$/gm)].map((match) => match[1]));
  const byRole = new Map(roles.map(({ role }) => [role, null]));
  byRole.set("session hook", null);
  for (const { line, key, value } of parseSheet(current)) {
    if (!byRole.has(key)) {
      report(`Dropped line ${line}${key ? ` (${key})` : ""}`);
      continue;
    }
    if (byRole.get(key) !== null) throw new Error(`"${key}" appears twice; resolve it before setup`);
    byRole.set(key, value);
  }

  const lines = [
    "# pstack model configuration (T3). One line per role. Delete a line to fall back to the skill default.",
    "# `inherit-parent` or `auto` as a value: the role runs on the parent chat's model (`delegate_task` omits `target`). Alias entries in a panel list still count toward its fan-out.",
    `# defaults: ${SHEET_DEFAULTS}`,
    `# budget: ${budget} (${BUDGETS[budget].label})`,
  ];
  const neon = tiers.panel?.find((text) => parseEntry(text)?.model === "gemini-4-neon");
  for (const { role, tier } of roles) {
    const defaults = [tiers[tier]].flat();
    const preset = (size) => defaults.map((text) => budgetEntry(text, size, defaultBudget, catalog)).join(", ");
    let value = byRole.get(role);
    const oldPreset = version === SHEET_DEFAULTS && Object.hasOwn(BUDGETS, oldBudget) && !overrides.has(role)
      ? preset(oldBudget)
      : null;
    if (value && value !== oldPreset) {
      try {
        const texts = value.split(",").map((text) => text.trim());
        if (releasedDefault(texts, role, version)) {
          report(`Replaced the released default for ${role}`);
          value = null;
        } else {
          const updated = texts.map((text) => migrateEntry(text, {
            panel: Array.isArray(tiers[tier]), version, oldBudget, neon: neon && budgetEntry(neon, budget, defaultBudget, catalog), catalog,
          }));
          if (updated.some((text, i) => text !== texts[i])) {
            report(`Migrated ${role} to ${updated.join(", ")}`);
            value = updated.join(", ");
          }
        }
      } catch (err) {
        if (version >= SHEET_DEFAULTS) throw err;
        report(`Dropped the old entry for ${role}: ${err.message}`);
        value = null;
      }
    } else {
      value = null;
    }
    const nextPreset = preset(budget);
    if (value === nextPreset) lines.push(`# override: ${role}`);
    lines.push(`${role}: ${value ?? nextPreset}`);
  }
  lines.push(`session hook: ${byRole.get("session hook") ?? sessionHook}`);
  return lines.join("\n") + "\n";
}

const invoked = process.argv[1] && existsSync(process.argv[1]) ? realpathSync(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const candidate = args[0] === "--candidate";
  const [, budget, candidateCatalog, currentPath] = args;
  const [sheetPath, catalogPath] = args;
  if (candidate ? !Object.hasOwn(BUDGETS, budget) || !candidateCatalog || args.length > 4 : args.length !== 2) {
    console.error("usage: t3-sheet.mjs <sheet.md> <catalog.json> | --candidate <large|medium|small> <catalog.json> [current.md]");
    process.exit(2);
  }
  try {
    const models = JSON.parse(readFileSync(new URL("../../../models.t3.json", import.meta.url), "utf8"));
    const catalog = JSON.parse(readFileSync(candidate ? candidateCatalog : catalogPath, "utf8"));
    const sheet = candidate
      ? candidateSheet(models, { budget, catalog, current: currentPath ? readFileSync(currentPath, "utf8") : "", report: console.error })
      : readFileSync(sheetPath, "utf8");
    const problems = checkSheet(parseSheet(sheet), { ...models, defaults: models.tiers, catalog });
    if (candidate) process.stdout.write(sheet);
    for (const problem of problems) (candidate ? console.error : console.log)(problem);
    if (problems.length) process.exit(1);
    if (!candidate) console.log("ok: every effective role dispatches on this T3");
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
}
