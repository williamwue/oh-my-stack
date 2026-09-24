#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveActiveResolution } from "./model-resolution.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hash(text) {
  return createHash("sha256").update(text).digest("hex");
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  assert(["prepare", "verify"].includes(command), "expected prepare or verify");
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const name = rest[index];
    const value = rest[index + 1];
    assert(name?.startsWith("--") && value && !value.startsWith("--"), `${name}: value is required`);
    assert(!Object.hasOwn(options, name.slice(2)), `${name}: duplicate option`);
    options[name.slice(2)] = value;
  }
  return { command, options };
}

export async function prepareDelegation({
  bundleRoot = packageRoot, resolutionPath, cwd, userRoot, routeName, roleName, entry = 1,
  task, taskName, parentModel, parentReasoning,
}) {
  assert(Boolean(routeName) !== Boolean(roleName), "provide exactly one routeName or roleName");
  assert(typeof task === "string" && task.trim(), "task instructions are required");
  assert(typeof taskName === "string" && /^[a-z][a-z0-9_]*$/.test(taskName), "taskName must be a unique snake_case name");
  assert(Number.isInteger(entry) && entry > 0, "entry must be a positive integer");
  const contracts = JSON.parse(await readFile(join(bundleRoot, "config", "role-contracts.json"), "utf8"));
  assert(contracts.schemaVersion === 1 && contracts.target === "codex", "Codex role contracts are required");
  const active = !resolutionPath && cwd ? await resolveActiveResolution({ runtime: "codex", cwd, userRoot }) : null;
  const resolution = resolutionPath ? JSON.parse(await readFile(resolutionPath, "utf8")) : active?.manifest ?? null;
  assert(!resolution || (resolution.schemaVersion === 1 && resolution.owner === "oh-my-stack" && resolution.target === "codex"), "Codex resolution manifest is required");
  let selection;
  let role;
  if (routeName) {
    assert(resolution, "a resolution manifest is required for a named route");
    const route = resolution.routes?.[routeName];
    assert(route, `unknown configured route ${routeName}`);
    assert(route.kind === "panel" || entry === 1, "single routes have only entry 1");
    selection = route.entries?.[entry - 1];
    assert(selection, `${routeName}: entry ${entry} is unavailable`);
    role = route.role;
  } else {
    assert(entry === 1, "canonical roles have only entry 1");
    role = roleName;
    selection = resolution?.roles?.[roleName] ?? null;
  }
  const contract = contracts.roles?.[role];
  assert(contract?.instructions && contract?.description, `unknown or incomplete role ${role}`);
  const model = selection?.inheritParent || !selection ? parentModel : selection.model;
  const reasoning = selection?.inheritParent || !selection ? parentReasoning : selection.reasoning;
  assert(typeof model === "string" && model, "explicit model is required; supply parentModel for inheritance");
  assert(typeof reasoning === "string" && reasoning, "explicit reasoning effort is required; supply parentReasoning for inheritance");
  const message = [
    `Oh My Stack role: ${role}`,
    `Role purpose: ${contract.description}`,
    "",
    "Complete role instructions:",
    contract.instructions.trim(),
    "",
    "Assigned task:",
    task.trim(),
  ].join("\n");
  return {
    task_name: taskName,
    fork_turns: "none",
    model,
    reasoning_effort: reasoning,
    message,
    audit: {
      role, route: routeName ?? null, entry,
      contractSha256: hash(contract.instructions.trim()),
      taskSha256: hash(task.trim()),
      resolutionInventorySha256: resolution?.observedInventory?.sha256 ?? null,
      resolutionScope: active?.scope ?? (resolutionPath ? "explicit" : null),
    },
  };
}

async function readJsonLines(path) {
  const lines = (await readFile(path, "utf8")).split("\n").filter(Boolean);
  return lines.map((line, index) => {
    try { return JSON.parse(line); }
    catch { throw new Error(`${path}:${index + 1}: invalid JSONL`); }
  });
}

export async function verifyDelegation({ request, parentRecord, childRecord }) {
  assert(request?.task_name && request?.fork_turns === "none" && request?.model && request?.reasoning_effort && request?.message && request?.audit?.contractSha256, "complete prepared request is required");
  const [parent, child] = await Promise.all([readJsonLines(parentRecord), readJsonLines(childRecord)]);
  const parentMeta = parent.find((item) => item.type === "session_meta")?.payload;
  const parentId = parentMeta?.id;
  const childMeta = child.find((item) => item.type === "session_meta")?.payload;
  assert(parentId && childMeta?.id, "parent and child session metadata are required");
  assert(childMeta.source?.subagent?.thread_spawn?.parent_thread_id === parentId, "child record does not cite the supplied parent");
  const parentAgentPath = parentMeta.source?.subagent?.thread_spawn?.agent_path ?? "/root";
  assert(childMeta.source?.subagent?.thread_spawn?.agent_path === `${parentAgentPath}/${request.task_name}`, "child record does not cite the requested task name");
  const calls = parent.filter((item) => item.type === "response_item" && item.payload?.type === "function_call" && item.payload?.name === "spawn_agent");
  const matches = calls.filter((item) => {
    try {
      const args = JSON.parse(item.payload.arguments);
      return args.task_name === request.task_name && args.fork_turns === "none"
        && args.model === request.model && args.reasoning_effort === request.reasoning_effort;
    } catch { return false; }
  });
  assert(matches.length === 1, `expected exactly one matching explicit spawn call, found ${matches.length}`);
  const observedMessage = JSON.parse(matches[0].payload.arguments).message;
  const messageVerified = observedMessage === request.message;
  assert(messageVerified || /^gAAAA[A-Za-z0-9_-]+={0,2}$/.test(observedMessage ?? ""), "spawn message differs from the prepared role task");
  const contexts = child.filter((item) => item.type === "turn_context").map((item) => item.payload);
  assert(contexts.length > 0, "child turn_context is unavailable; model resolution is unverified");
  assert(contexts.every((context) => context.model === request.model && context.effort === request.reasoning_effort), "child runtime model or effort differs from the explicit request");
  return {
    modelAndEffortVerified: true,
    parentId,
    childId: childMeta.id,
    model: request.model,
    reasoningEffort: request.reasoning_effort,
    role: request.audit.role,
    route: request.audit.route,
    checkedChildContexts: contexts.length,
    messageVerified,
    messageAudit: messageVerified ? "exact-parent-record-match" : "encrypted-in-parent-record",
    roleSelectionClaim: false,
  };
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  let result;
  if (command === "prepare") {
    assert(options["task-file"], "--task-file is required");
    result = await prepareDelegation({
      bundleRoot: options.package ?? packageRoot,
      resolutionPath: options.resolution,
      cwd: options.cwd ?? process.cwd(),
      routeName: options.route,
      roleName: options.role,
      entry: options.entry ? Number(options.entry) : 1,
      task: await readFile(options["task-file"], "utf8"),
      taskName: options["task-name"],
      parentModel: options["parent-model"],
      parentReasoning: options["parent-reasoning"],
    });
  } else {
    assert(options.request && options["parent-record"] && options["child-record"], "--request, --parent-record, and --child-record are required");
    result = await verifyDelegation({
      request: JSON.parse(await readFile(options.request, "utf8")),
      parentRecord: options["parent-record"],
      childRecord: options["child-record"],
    });
  }
  if (options.output) await writeFile(options.output, `${JSON.stringify(result, null, 2)}\n`);
  else console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
