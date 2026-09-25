#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveActiveResolution } from "./model-resolution.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readJsonLines(path) {
  return (await readFile(path, "utf8")).split("\n").filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch { throw new Error(`${path}:${index + 1}: invalid JSONL`); }
  });
}

async function checkOwnedFiles(resolutionPath, manifest) {
  const root = dirname(resolutionPath);
  const entries = Object.entries(manifest.ownedFiles ?? {});
  assert(entries.length > 0, "resolution has no owned role files");
  for (const [relativePath, expected] of entries) {
    assert(/^agents\/[a-z0-9.-]+\.(?:md|toml)$/.test(relativePath), `unsafe owned path ${relativePath}`);
    const path = join(root, relativePath);
    const stat = await lstat(path);
    assert(stat.isFile() && !stat.isSymbolicLink(), `${path}: expected a regular role file`);
    assert(sha256(await readFile(path)) === expected, `${path}: generated role hash differs from resolution`);
  }
  return entries.length;
}

function selectedRoute(manifest, routeName, entry) {
  const route = manifest.routes?.[routeName];
  assert(route, `unknown configured route ${routeName}`);
  assert(Number.isInteger(entry) && entry > 0 && entry <= route.entries.length, `${routeName}: invalid entry ${entry}`);
  assert(route.kind === "panel" || entry === 1, `${routeName}: single route has only entry 1`);
  const selection = route.entries[entry - 1];
  assert(!selection.inheritParent && selection.model && selection.reasoning,
    `${routeName}[${entry}]: inherited model cannot be verified against a fixed choice`);
  return { route, selection };
}

async function verifyOmp({ parentRecord, childRecord, selection, requireReadOnly }) {
  assert(resolve(dirname(childRecord)) === resolve(parentRecord.slice(0, -".jsonl".length)),
    "child record is not in the selected parent session directory");
  const [parent, child] = await Promise.all([readJsonLines(parentRecord), readJsonLines(childRecord)]);
  const childName = basename(childRecord, ".jsonl");
  const taskItems = parent.flatMap((item) => item.type === "message" && item.message?.role === "assistant"
    ? (item.message.content ?? []).filter((content) => content.type === "toolCall" && content.name === "task")
      .flatMap((content) => content.arguments?.tasks ?? [content.arguments])
    : []);
  const matches = taskItems.filter((item) => item?.name === childName && item.agent === selection.agent);
  assert(matches.length === 1, `expected one OMP task for ${selection.agent} named ${childName}, found ${matches.length}`);
  const init = child.find((item) => item.type === "session_init");
  assert(init?.agent === selection.agent, `child did not activate native role ${selection.agent}`);
  if (requireReadOnly) assert(init.readOnly === true, "read-only route did not create a read-only child");
  assert(init.resolvedModel === selection.model, `child resolved ${init.resolvedModel}, expected ${selection.model}`);
  const modelEvents = child.filter((item) => item.type === "model_change");
  const thinkingEvents = child.filter((item) => item.type === "thinking_level_change");
  assert(modelEvents.length > 0 && thinkingEvents.length > 0, "child model/thinking events are missing");
  assert(modelEvents.every((item) => item.model === selection.model && item.resolvedModelIsFallback === false),
    "child model changed or used fallback");
  assert(thinkingEvents.every((item) => item.thinkingLevel === selection.reasoning),
    "child thinking level differs from configured route");
  return { mechanism: "native-role", agent: selection.agent, childName,
    model: selection.model, reasoning: selection.reasoning,
    taskOutcome: "not-assessed" };
}

async function verifyCodex({ manifest, routeName, entry, requestPath, parentRecord, childRecord, selection }) {
  assert(requestPath, "Codex requires --request with the prepared spawn payload");
  const request = JSON.parse(await readFile(requestPath, "utf8"));
  assert(request.audit?.route === routeName && request.audit?.entry === entry,
    "prepared request does not cite the selected route entry");
  assert(request.audit.resolutionInventorySha256 === manifest.observedInventory?.sha256,
    "prepared request cites a different model inventory resolution");
  assert(request.model === selection.model && request.reasoning_effort === selection.reasoning,
    "prepared request differs from the configured route");
  const { verifyDelegation } = await import("./codex-delegation.mjs");
  const result = await verifyDelegation({ request, parentRecord, childRecord });
  assert(result.roleSelectionClaim === false, "explicit Codex delegation must not claim native role selection");
  return { mechanism: "explicit-spawn", agent: selection.agent,
    model: result.model, reasoning: result.reasoningEffort,
    messageAudit: result.messageAudit, childId: result.childId,
    taskOutcome: "not-assessed" };
}

async function verifyClaude({ parentRecord, childRecord, selection }) {
  assert(basename(dirname(dirname(childRecord))) === basename(parentRecord, ".jsonl"),
    "Claude child record is not in the selected parent session directory");
  const metadataPath = childRecord.replace(/\.jsonl$/, ".meta.json");
  assert(metadataPath !== childRecord, "Claude child record must be a JSONL file");
  const [parent, child, metadata] = await Promise.all([
    readJsonLines(parentRecord), readJsonLines(childRecord),
    readFile(metadataPath, "utf8").then(JSON.parse),
  ]);
  assert(metadata.agentType === selection.agent,
    `Claude child activated ${metadata.agentType}, expected ${selection.agent}`);
  const calls = parent.flatMap((item) => item.message?.role === "assistant"
    ? (item.message.content ?? []).filter((part) => part.type === "tool_use"
      && part.name === "Agent" && part.input?.subagent_type === selection.agent
      && part.id === metadata.toolUseId)
    : []);
  assert(calls.length === 1, `expected one linked Claude Agent call for ${selection.agent}, found ${calls.length}`);
  const messages = child.filter((item) => item.message?.role === "assistant" && item.message.model);
  assert(messages.length > 0, "Claude child has no assistant model event");
  assert(messages.every((item) => item.message.model === selection.model),
    "Claude child model differs from configured route");
  const attachments = child.filter((item) => item.attachment?.type === "model");
  assert(attachments.some((item) => item.attachment.identity?.modelId === selection.model),
    "Claude child has no matching model identity attachment");
  return { mechanism: "native-role", agent: selection.agent, model: selection.model,
    reasoning: "unverified", configuredReasoning: selection.reasoning,
    taskOutcome: "not-assessed" };
}

export async function inspectSetup({ resolutionPath, routeName, entry = 1, parentRecord, childRecord, requestPath,
  cwd, userRoot }) {
  const path = resolve(resolutionPath);
  const manifest = JSON.parse(await readFile(path, "utf8"));
  assert(manifest.schemaVersion === 1 && manifest.owner === "oh-my-stack" && ["omp", "codex", "claude-code"].includes(manifest.target),
    "an applied OMP, Codex, or Claude Code Oh My Stack resolution is required");
  const ownedFilesVerified = await checkOwnedFiles(path, manifest);
  const active = cwd ? await resolveActiveResolution({ runtime: manifest.target, cwd, userRoot }) : null;
  const effectiveConfiguration = cwd ? {
    cwd: resolve(cwd),
    scope: active?.scope ?? null,
    path: active?.path ?? null,
    matchesAuditedResolution: active ? active.path === path : false,
  } : null;
  const evidenceSupplied = Boolean(parentRecord || childRecord || requestPath);
  assert(!evidenceSupplied || (routeName && parentRecord && childRecord),
    "runtime evidence requires --route, --parent-record and --child-record");
  assert(!(manifest.target === "claude-code" && requestPath),
    "Claude Code uses native role selection and does not accept an explicit-spawn request");
  const selected = routeName ? selectedRoute(manifest, routeName, entry) : null;
  const budget = { name: manifest.budget,
    meaning: manifest.budgetPolicy?.kind === "reasoning-target" || (!manifest.budgetPolicy && manifest.target === "omp")
      ? "reasoning target, not a cost limit" : "reasoning ceiling, not a cost limit",
    level: manifest.budgetPolicy?.level ?? null };
  const base = { target: manifest.target, resolutionPath: path, preset: manifest.preset,
    budget, ownedFilesVerified, configuration: "verified", effectiveConfiguration,
    workflowCoverage: "not assessed by setup acceptance",
    route: routeName ?? null, entry: routeName ? entry : null,
    expected: selected ? { agent: selected.selection.agent, model: selected.selection.model,
      reasoning: selected.selection.reasoning } : null };
  if (!evidenceSupplied) return { ...base, activation: "unverified", reason: "no parent/child runtime records supplied" };
  const verified = manifest.target === "omp"
    ? await verifyOmp({ parentRecord: resolve(parentRecord), childRecord: resolve(childRecord),
      selection: selected.selection, requireReadOnly: manifest.roles?.[selected.route.role]?.constraints?.includes("read_only") })
    : manifest.target === "claude-code"
      ? await verifyClaude({ parentRecord: resolve(parentRecord), childRecord: resolve(childRecord), selection: selected.selection })
      : await verifyCodex({ manifest, routeName, entry, requestPath,
        parentRecord, childRecord, selection: selected.selection });
  return { ...base, activation: manifest.target === "claude-code" ? "model-verified-effort-unverified" : "verified", observed: verified };
}

export async function renderSetupReceipt({ resolutionPath, cwd, userRoot }) {
  const audit = await inspectSetup({ resolutionPath, cwd, userRoot });
  const manifest = JSON.parse(await readFile(resolve(resolutionPath), "utf8"));
  const roles = Object.entries(manifest.roles ?? {});
  const routes = Object.entries(manifest.routes ?? {});
  const singles = routes.filter(([, route]) => route.kind === "single");
  const panels = routes.filter(([, route]) => route.kind === "panel");
  const overrides = Object.entries(manifest.overrides ?? {}).flatMap(([group, choices]) =>
    Object.keys(choices ?? {}).map((name) => `${group}.${name}`));
  assert(roles.length > 0 && routes.length > 0, "resolution has no roles or routes");
  assert(routes.every(([, route]) => ["single", "panel"].includes(route.kind)
    && Array.isArray(route.entries) && route.entries.length > 0), "resolution has an incomplete route");
  const choice = (entry) => entry.inheritParent ? "inherit-parent"
    : `${entry.model}@${entry.reasoning}`;
  const lines = [
    `# Oh My Stack setup receipt (${manifest.target})`,
    `- Audited manifest: ${audit.resolutionPath}`,
    `- Effective selection: ${audit.effectiveConfiguration
      ? `${audit.effectiveConfiguration.scope ?? "none"} — ${audit.effectiveConfiguration.path ?? "none"}`
      : "not inspected (pass --cwd)"}`,
    `- Audited manifest selected: ${audit.effectiveConfiguration
      ? audit.effectiveConfiguration.matchesAuditedResolution : "not inspected"}`,
    `- Preset / reasoning budget: ${manifest.preset} / ${manifest.budget} (${audit.budget.level ?? "preset effort"})`,
    `- Inventory: ${manifest.observedInventory?.source ?? "unknown"} at ${manifest.observedInventory?.observedAt ?? "unknown"}`,
    `- Explicit overrides: ${overrides.length ? overrides.join(", ") : "none"}`,
    `- Owned files verified: ${audit.ownedFilesVerified}; runtime activation: ${audit.activation}`,
    "",
    "## Workloads",
    ...Object.entries(manifest.workloads ?? {}).map(([name, entry]) => `- ${name}: ${choice(entry)}`),
    "",
    `## Canonical roles (${roles.length})`,
    ...roles.map(([name, entry]) => `- ${name}: ${choice(entry)}`),
    "",
    `## Named single routes (${singles.length})`,
    ...singles.map(([name, route]) => `- ${name} [${route.role}]: ${choice(route.entries[0])}`),
    "",
    `## Ordered panels (${panels.length})`,
    ...panels.map(([name, route]) => `- ${name} [${route.role}]: ${route.entries.map((entry, index) =>
      `${index + 1}. ${choice(entry)}`).join(" → ")}`),
    "",
    `Route count: ${routes.length} = ${singles.length} single + ${panels.length} panels.`,
    "Configuration and owned-file checks do not prove worker model, effort, native role selection, or full workflow coverage.",
  ];
  return lines.join("\n");
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    assert(key?.startsWith("--") && value && !value.startsWith("--"), `${key}: value is required`);
    assert(!Object.hasOwn(args, key.slice(2)), `${key}: duplicate option`);
    args[key.slice(2)] = value;
  }
  assert(args.resolution, "--resolution is required");
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.format) {
    assert(args.format === "markdown", "--format must be markdown");
    assert(!args.route && !args["parent-record"] && !args["child-record"] && !args.request,
      "markdown receipt is for configuration inspection without runtime records");
    console.log(await renderSetupReceipt({ resolutionPath: args.resolution, cwd: args.cwd }));
    return;
  }
  const result = await inspectSetup({ resolutionPath: args.resolution, routeName: args.route,
    entry: args.entry ? Number(args.entry) : 1, parentRecord: args["parent-record"],
    childRecord: args["child-record"], requestPath: args.request, cwd: args.cwd });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
