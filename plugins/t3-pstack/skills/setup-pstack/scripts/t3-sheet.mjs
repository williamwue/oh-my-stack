#!/usr/bin/env node
// The T3 override sheet: one `<role>: <entry>` line per role, or a
// comma-separated list for a panel role. An entry is
// `<providerInstanceId>/<modelId>` plus `<optionId>=<value>` pairs, or
// `inherit-parent` (alias `auto`). An entry maps one to one onto a
// `delegate_task` target, so this file is the only place the grammar lives:
// the generator checks the models.json tiers with it, and setup-pstack checks
// a sheet against the live `orchestrator_capabilities` catalog with it.
//
//   node t3-sheet.mjs <sheet.md> <catalog.json>
//
// prints one line per problem and exits 1 when there is any.

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const INHERIT = ["inherit-parent", "auto"];
const HOOK_VALUES = ["on", "off"];

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

const invoked = process.argv[1] && existsSync(process.argv[1]) ? realpathSync(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  const [sheetPath, catalogPath] = process.argv.slice(2);
  if (!sheetPath || !catalogPath) {
    console.error("usage: t3-sheet.mjs <sheet.md> <catalog.json>");
    process.exit(2);
  }
  const { roles, tiers, retired } = JSON.parse(readFileSync(new URL("../../../models.json", import.meta.url), "utf8"));
  const problems = checkSheet(parseSheet(readFileSync(sheetPath, "utf8")), {
    roles,
    defaults: tiers,
    catalog: JSON.parse(readFileSync(catalogPath, "utf8")),
    retired,
  });
  for (const problem of problems) console.log(problem);
  if (problems.length) process.exit(1);
  console.log("ok: every role line parses and dispatches on this T3");
}
