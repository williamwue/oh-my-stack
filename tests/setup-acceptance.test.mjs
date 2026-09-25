import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { configure } from "../tools/configure-models.mjs";
import { prepareDelegation } from "../tools/codex-delegation.mjs";
import { repoRoot } from "../tools/generate.mjs";
import { inspectSetup, renderSetupReceipt } from "../tools/setup-acceptance.mjs";

const execFileAsync = promisify(execFile);

async function fixture(target) {
  const root = await mkdtemp(join(tmpdir(), `ohmystack-setup-${target}-`));
  const projectRoot = join(root, "project");
  await mkdir(projectRoot);
  const packageRoot = join(repoRoot, "packages", target);
  const inventoryPath = join(root, "inventory.json");
  const models = target === "omp"
    ? ["openai-codex/gpt-6-luna", "openai-codex/gpt-6-sol", "openai-codex/gpt-6-astra"]
    : ["gpt-6-luna", "gpt-6-sol", "gpt-6-astra"];
  await writeFile(inventoryPath, `${JSON.stringify({ schemaVersion: 1, runtime: target,
    observedAt: "2026-09-24T00:00:00Z", source: "fixture native inventory",
    models: models.map((id) => ({ id, reasoningEfforts: ["low", "medium", "high", "max"] })),
  })}\n`);
  await configure({ packageRoot, inventoryPath, projectRoot,
    presetName: target === "omp" ? "pstack-openai-codex" : "pstack", budget: "medium", apply: true });
  const resolutionPath = join(projectRoot, target === "omp" ? ".omp" : ".codex", "oh-my-stack.resolution.json");
  return { root, projectRoot, packageRoot, resolutionPath, inventoryPath };
}

test("configuration audit is read-only and never promotes files to activation", async () => {
  const { resolutionPath } = await fixture("omp");
  const audit = await inspectSetup({ resolutionPath, routeName: "how.explorer" });
  assert.equal(audit.configuration, "verified");
  assert.equal(audit.activation, "unverified");
  assert.equal(audit.expected.model, "openai-codex/gpt-6-luna");
  assert.equal(audit.expected.reasoning, "high");
  assert.match(audit.budget.meaning, /target, not a cost limit/);
  assert.equal(audit.budget.level, "high");
  assert.equal(audit.ownedFilesVerified, 35);
  const manifest = JSON.parse(await readFile(resolutionPath, "utf8"));
  const rolePath = join(dirname(resolutionPath), "agents", "ohmystack-how-explorer.md");
  await writeFile(rolePath, "changed\n");
  await assert.rejects(inspectSetup({ resolutionPath }), /hash differs/);
  assert.ok(manifest.ownedFiles["agents/ohmystack-how-explorer.md"]);
});

test("invalid model and unsupported effort fail before configuration writes on both hosts", async () => {
  for (const target of ["omp", "codex"]) {
    const { projectRoot, packageRoot, resolutionPath, inventoryPath } = await fixture(target);
    const baseline = await readFile(resolutionPath);
    const common = { packageRoot, inventoryPath, projectRoot,
      presetName: target === "omp" ? "pstack-openai-codex" : "pstack", budget: "medium", apply: true };
    await assert.rejects(configure({ ...common, routeSelections: { "how.explorer": "missing/model@high" } }),
      /not present in the observed inventory/);
    await assert.rejects(configure({ ...common, budget: "unlimited", routeSelections: {
      "how.explorer": `${target === "omp" ? "openai-codex/" : ""}gpt-6-luna@ultra`,
    } }), /did not advertise reasoning effort/);
    assert.deepEqual(await readFile(resolutionPath), baseline);
  }
});

test("setup receipt renders every configured role and route without summarization loss", async () => {
  for (const target of ["omp", "codex"]) {
    const { projectRoot, resolutionPath } = await fixture(target);
    const manifest = JSON.parse(await readFile(resolutionPath, "utf8"));
    const receipt = await renderSetupReceipt({ resolutionPath, cwd: projectRoot });
    assert.match(receipt, /Effective selection: project/);
    assert.match(receipt, /runtime activation: unverified/);
    for (const role of Object.keys(manifest.roles)) {
      assert.equal(receipt.split(`- ${role}:`).length - 1, 1, `${target}: role ${role} missing or repeated`);
    }
    for (const [name, route] of Object.entries(manifest.routes)) {
      assert.equal(receipt.split(`- ${name} [${route.role}]:`).length - 1, 1,
        `${target}: route ${name} missing or repeated`);
      if (route.kind === "panel") {
        const row = receipt.split("\n").find((line) => line.startsWith(`- ${name} [`));
        assert.ok(route.entries.every((entry, index) => row.includes(`${index + 1}. ${entry.model}@${entry.reasoning}`)));
      }
    }
    assert.match(receipt, /Route count: 20 = 16 single \+ 4 panels\./);
  }
});

test("installed setup CLIs run through a symlinked package directory", async () => {
  for (const target of ["omp", "codex"]) {
    const { root, projectRoot, packageRoot, resolutionPath, inventoryPath } = await fixture(target);
    const linkedPackage = join(root, "linked-package");
    await symlink(packageRoot, linkedPackage, "dir");
    const invoke = async (script, ...args) => (await execFileAsync(process.execPath,
      [join(linkedPackage, "scripts", script), ...args])).stdout;
    const selected = JSON.parse(await invoke("model-resolution.mjs", "--runtime", target,
      "--cwd", projectRoot, "--user-root", root));
    assert.equal(selected.scope, "project");
    const preview = JSON.parse(await invoke("configure-models.mjs", "--inventory", inventoryPath,
      "--project-root", projectRoot, "--preset", target === "omp" ? "pstack-openai-codex" : "pstack"));
    assert.equal(preview.configuration.status, "preview");
    const receipt = await invoke("setup-acceptance.mjs", "--resolution", resolutionPath,
      "--cwd", projectRoot, "--format", "markdown");
    assert.match(receipt, /Route count: 20 = 16 single \+ 4 panels\./);
  }
});

test("OMP acceptance requires selected native agent and observed child model/effort", async () => {
  const { root, resolutionPath } = await fixture("omp");
  const parentRecord = join(root, "parent.jsonl");
  const childDirectory = join(root, "parent");
  const childRecord = join(childDirectory, "SetupReader.jsonl");
  await mkdir(childDirectory);
  const agent = "ohmystack-how-explorer";
  await writeFile(parentRecord, `${JSON.stringify({ type: "message", message: { role: "assistant", content: [
    { type: "toolCall", name: "task", arguments: { context: "Read only", tasks: [
      { name: "SetupReader", agent, task: "Read README.md only; no edits." },
    ] } },
  ] } })}\n`);
  const child = [
    { type: "model_change", model: "openai-codex/gpt-6-luna", resolvedModelIsFallback: false },
    { type: "thinking_level_change", thinkingLevel: "high" },
    { type: "session_init", agent, resolvedModel: "openai-codex/gpt-6-luna", readOnly: true },
  ];
  await writeFile(childRecord, `${child.map((item) => JSON.stringify(item)).join("\n")}\n`);
  const result = await inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord });
  assert.equal(result.activation, "verified");
  assert.equal(result.observed.mechanism, "native-role");
  assert.equal(result.observed.taskOutcome, "not-assessed");
  await writeFile(childRecord, `${child.map((item) => JSON.stringify(item.type === "thinking_level_change"
    ? { ...item, thinkingLevel: "medium" } : item)).join("\n")}\n`);
  await assert.rejects(inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord }), /thinking level differs/);
  await writeFile(childRecord, `${child.map((item) => JSON.stringify(item.type === "model_change"
    ? { ...item, resolvedModelIsFallback: true } : item)).join("\n")}\n`);
  await assert.rejects(inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord }), /fallback/);
  await writeFile(childRecord, `${JSON.stringify({ type: "session_init", agent,
    resolvedModel: "openai-codex/gpt-6-luna", readOnly: true })}\n`);
  await assert.rejects(inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord }),
    /model\/thinking events are missing/);
});

test("Claude acceptance links native Agent call and child model but leaves effort unverified", async () => {
  const root = await mkdtemp(join(tmpdir(), "ohmystack-claude-audit-"));
  const projectRoot = join(root, "project");
  await mkdir(projectRoot);
  const inventoryPath = join(root, "inventory.json");
  await writeFile(inventoryPath, `${JSON.stringify({ schemaVersion: 1, runtime: "claude-code",
    observedAt: "2026-09-25T00:00:00Z", source: "fixture probe",
    models: [{ id: "claude-sonnet-5", reasoningEfforts: ["high"] }],
  })}\n`);
  await configure({ packageRoot: join(repoRoot, "packages", "claude-code"), inventoryPath, projectRoot,
    selections: { fast: "claude-sonnet-5@high", balanced: "claude-sonnet-5@high", deep: "claude-sonnet-5@high" },
    routeSelections: { "how.explorer": "claude-sonnet-5@high" }, apply: true });
  const resolutionPath = join(projectRoot, ".claude", "oh-my-stack.resolution.json");
  const parentRecord = join(root, "session.jsonl");
  const childDirectory = join(root, "session", "subagents");
  await mkdir(childDirectory, { recursive: true });
  const childRecord = join(childDirectory, "agent-123.jsonl");
  const agent = "ohmystack-how-explorer";
  const call = { type: "tool_use", id: "toolu-1", name: "Agent", input: { subagent_type: agent } };
  await writeFile(parentRecord, `${JSON.stringify({ message: { role: "assistant", content: [call] } })}\n`);
  await writeFile(join(childDirectory, "agent-123.meta.json"), JSON.stringify({ agentType: agent, toolUseId: "toolu-1" }));
  const child = [
    { attachment: { type: "model", identity: { modelId: "claude-sonnet-5" } } },
    { message: { role: "assistant", model: "claude-sonnet-5", content: [
      { type: "tool_use", name: "Read" },
    ] } },
  ];
  await writeFile(childRecord, `${child.map((item) => JSON.stringify(item)).join("\n")}\n`);
  const audit = await inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord });
  assert.equal(audit.activation, "model-verified-effort-unverified");
  assert.equal(audit.observed.model, "claude-sonnet-5");
  assert.equal(audit.observed.reasoning, "unverified");
  const hookRecord = join(root, "hooks.jsonl");
  const hook = { agentId: "123", agentType: agent, hookEvent: "PreToolUse", tool: "Read", effort: "high" };
  await writeFile(hookRecord, `${JSON.stringify(hook)}\n`);
  const verified = await inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord, hookRecord });
  assert.equal(verified.activation, "verified");
  assert.equal(verified.observed.reasoning, "high");
  await writeFile(hookRecord, `${JSON.stringify({ ...hook, effort: "medium" })}\n`);
  await assert.rejects(inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord, hookRecord }),
    /effective effort differs/);
  await writeFile(childRecord, `${child.map((item) => JSON.stringify(item.message
    ? { message: { ...item.message, model: "claude-opus-5-5" } } : item)).join("\n")}\n`);
  await assert.rejects(inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord }),
    /child model differs/);
  await writeFile(childRecord, `${child.map((item) => JSON.stringify(item)).join("\n")}\n`);
  await writeFile(join(childDirectory, "agent-123.meta.json"), JSON.stringify({
    agentType: "ohmystack-architect-runners-1", toolUseId: "toolu-1",
  }));
  await writeFile(parentRecord, `${JSON.stringify({ message: { role: "assistant", content: [
    { ...call, input: { subagent_type: "ohmystack-architect-runners-1" } },
  ] } })}\n`);
  await assert.rejects(inspectSetup({ resolutionPath, routeName: "architect.runners", entry: 1,
    parentRecord, childRecord }), /panel call order\/count differs/);
});

test("Codex acceptance verifies explicit spawn without claiming native role activation", async () => {
  const { root, resolutionPath, packageRoot } = await fixture("codex");
  const request = await prepareDelegation({ bundleRoot: packageRoot, resolutionPath,
    routeName: "how.explorer", taskName: "setup_reader", task: "Read README.md only." });
  const requestPath = join(root, "request.json");
  const parentRecord = join(root, "parent.jsonl");
  const childRecord = join(root, "child.jsonl");
  await writeFile(requestPath, `${JSON.stringify(request)}\n`);
  await writeFile(parentRecord, [
    { type: "session_meta", payload: { id: "parent-id" } },
    { type: "response_item", payload: { type: "function_call", name: "spawn_agent",
      arguments: JSON.stringify({ task_name: request.task_name, fork_turns: "none", model: request.model,
        reasoning_effort: request.reasoning_effort, message: request.message }) } },
  ].map(JSON.stringify).join("\n"));
  await writeFile(childRecord, [
    { type: "session_meta", payload: { id: "child-id", source: { subagent: { thread_spawn:
      { parent_thread_id: "parent-id", agent_path: "/root/setup_reader" } } } } },
    { type: "turn_context", payload: { model: request.model, effort: request.reasoning_effort } },
  ].map(JSON.stringify).join("\n"));
  const result = await inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord, requestPath });
  assert.equal(result.activation, "verified");
  assert.equal(result.observed.mechanism, "explicit-spawn");
  assert.equal(result.observed.taskOutcome, "not-assessed");
  assert.match(result.budget.meaning, /target, not a cost limit/);
  await assert.rejects(inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord }), /requires --request/);
  await writeFile(childRecord, `${JSON.stringify({ type: "session_meta", payload: { id: "child-id",
    source: { subagent: { thread_spawn: { parent_thread_id: "parent-id",
      agent_path: "/root/setup_reader" } } } } })}\n`);
  await assert.rejects(inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord,
    requestPath }), /turn_context is unavailable/);
});
