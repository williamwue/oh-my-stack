import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { configure } from "../tools/configure-models.mjs";
import { prepareDelegation } from "../tools/codex-delegation.mjs";
import { repoRoot } from "../tools/generate.mjs";
import { inspectSetup } from "../tools/setup-acceptance.mjs";

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
  return { root, projectRoot, packageRoot, resolutionPath };
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
  await writeFile(childRecord, `${child.map((item) => JSON.stringify(item.type === "thinking_level_change"
    ? { ...item, thinkingLevel: "medium" } : item)).join("\n")}\n`);
  await assert.rejects(inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord }), /thinking level differs/);
  await writeFile(childRecord, `${child.map((item) => JSON.stringify(item.type === "model_change"
    ? { ...item, resolvedModelIsFallback: true } : item)).join("\n")}\n`);
  await assert.rejects(inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord }), /fallback/);
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
  assert.match(result.budget.meaning, /target, not a cost limit/);
  await assert.rejects(inspectSetup({ resolutionPath, routeName: "how.explorer", parentRecord, childRecord }), /requires --request/);
});
