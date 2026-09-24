import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { prepareDelegation, verifyDelegation } from "../tools/codex-delegation.mjs";
import { repoRoot } from "../tools/generate.mjs";
import { configure } from "../tools/configure-models.mjs";

const bundleRoot = join(repoRoot, "packages", "codex");

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "ohmystack-codex-delegation-"));
  const inventoryPath = join(root, "inventory.json");
  const descriptor = JSON.parse(await readFile(join(bundleRoot, "config", "runtime-resolution.json"), "utf8"));
  const values = [...Object.values(descriptor.presets.pstack.workloads), ...Object.values(descriptor.presets.pstack.routes).flat()];
  const ids = [...new Set(values.map((value) => value.slice(0, value.lastIndexOf("@"))))];
  await writeFile(inventoryPath, `${JSON.stringify({
    schemaVersion: 1, runtime: "codex", observedAt: "2026-09-23T00:00:00Z",
    source: "fixture model/list", models: ids.map((id) => ({ id, reasoningEfforts: ["low", "medium", "high"] })),
  })}\n`);
  const outputRoot = join(root, "resolution");
  await configure({ packageRoot: bundleRoot, inventoryPath, outputRoot, presetName: "pstack", budget: "medium", apply: true });
  return { root, resolutionPath: join(outputRoot, "oh-my-stack.resolution.json") };
}

function record(type, payload) {
  return JSON.stringify({ type, payload });
}

test("Codex delegation derives explicit parameters and complete role instructions for ordered routes", async () => {
  const { resolutionPath } = await fixture();
  const request = await prepareDelegation({
    bundleRoot, resolutionPath, routeName: "interrogate.reviewers", entry: 2,
    taskName: "review_two", task: "Review the frozen diff only.",
  });
  const contract = JSON.parse(await readFile(join(bundleRoot, "config", "role-contracts.json"), "utf8")).roles.reviewer;
  assert.equal(request.model, "gpt-6-sol");
  assert.equal(request.reasoning_effort, "high");
  assert.equal(request.fork_turns, "none");
  assert.equal(request.task_name, "review_two");
  assert.ok(request.message.includes(contract.instructions));
  assert.ok(request.message.includes("Review the frozen diff only."));
  assert.equal(request.audit.route, "interrogate.reviewers");
  assert.equal(request.audit.entry, 2);
  assert.equal("agent" in request, false);
  await assert.rejects(prepareDelegation({ bundleRoot, resolutionPath, routeName: "interrogate.reviewers", entry: 4, taskName: "bad", task: "Review." }), /unavailable/);
});

test("inheritance becomes explicit and does not silently omit effort", async () => {
  const request = await prepareDelegation({
    bundleRoot, roleName: "explorer", taskName: "scan", task: "Trace the entry point.",
    parentModel: "gpt-6-luna", parentReasoning: "high",
  });
  assert.equal(request.model, "gpt-6-luna");
  assert.equal(request.reasoning_effort, "high");
  await assert.rejects(prepareDelegation({ bundleRoot, roleName: "explorer", taskName: "scan", task: "Trace." }), /explicit model is required/);
});

test("verification requires matching parent call, child link, and runtime turn context", async () => {
  const { root, resolutionPath } = await fixture();
  const request = await prepareDelegation({ bundleRoot, resolutionPath, routeName: "how.explorer", taskName: "explore_flow", task: "Trace flow." });
  const parentRecord = join(root, "parent.jsonl");
  const childRecord = join(root, "child.jsonl");
  await writeFile(parentRecord, [
    record("session_meta", { id: "parent-id" }),
    record("response_item", { type: "function_call", name: "spawn_agent", arguments: JSON.stringify({
      task_name: request.task_name, fork_turns: request.fork_turns, model: request.model,
      reasoning_effort: request.reasoning_effort, message: request.message,
    }) }),
  ].join("\n"));
  const childLines = [
    record("session_meta", { id: "child-id", source: { subagent: { thread_spawn: { parent_thread_id: "parent-id", agent_path: "/root/explore_flow" } } } }),
    record("turn_context", { model: request.model, effort: request.reasoning_effort }),
  ];
  await writeFile(childRecord, childLines.join("\n"));
  const verified = await verifyDelegation({ request, parentRecord, childRecord });
  assert.equal(verified.modelAndEffortVerified, true);
  assert.equal(verified.roleSelectionClaim, false);
  assert.equal(verified.checkedChildContexts, 1);
  assert.equal(verified.messageVerified, true);
  await writeFile(parentRecord, [
    record("session_meta", { id: "parent-id" }),
    record("response_item", { type: "function_call", name: "spawn_agent", arguments: JSON.stringify({
      task_name: request.task_name, fork_turns: "none", model: request.model,
      reasoning_effort: request.reasoning_effort, message: "gAAAAABencryptedplaceholder==",
    }) }),
  ].join("\n"));
  const encrypted = await verifyDelegation({ request, parentRecord, childRecord });
  assert.equal(encrypted.messageVerified, false);
  assert.equal(encrypted.messageAudit, "encrypted-in-parent-record");
  await writeFile(parentRecord, [
    record("session_meta", { id: "parent-id" }),
    record("response_item", { type: "function_call", name: "spawn_agent", arguments: JSON.stringify({
      task_name: request.task_name, fork_turns: "none", model: request.model,
      reasoning_effort: request.reasoning_effort, message: "incomplete role assignment",
    }) }),
  ].join("\n"));
  await assert.rejects(verifyDelegation({ request, parentRecord, childRecord }), /spawn message differs/);
  await writeFile(parentRecord, [
    record("session_meta", { id: "parent-id" }),
    record("response_item", { type: "function_call", name: "spawn_agent", arguments: JSON.stringify({
      task_name: request.task_name, fork_turns: "none", model: request.model,
      reasoning_effort: request.reasoning_effort, message: request.message,
    }) }),
  ].join("\n"));
  await writeFile(childRecord, childLines.map((line) => line.replace(`"effort":"${request.reasoning_effort}"`, '"effort":"medium"')).join("\n"));
  await assert.rejects(verifyDelegation({ request, parentRecord, childRecord }), /differs from the explicit request/);
  await writeFile(childRecord, childLines[0]);
  await assert.rejects(verifyDelegation({ request, parentRecord, childRecord }), /unavailable/);
  await writeFile(childRecord, childLines.join("\n"));
  await writeFile(parentRecord, record("session_meta", { id: "parent-id" }));
  await assert.rejects(verifyDelegation({ request, parentRecord, childRecord }), /exactly one matching explicit spawn call/);
});

test("every generated Codex spawning workflow carries the same binding while OMP does not", async () => {
  const catalog = JSON.parse(await readFile(join(bundleRoot, "SKILL_CATALOG.json"), "utf8"));
  let checked = 0;
  for (const skill of catalog.skills) {
    const metadata = JSON.parse(await readFile(join(repoRoot, "src", "core", "skills", skill.name, "skill.json"), "utf8"));
    if (!metadata.requires.includes("agents.spawn")) continue;
    const codexSkill = await readFile(join(bundleRoot, "skills", skill.name, "SKILL.md"), "utf8");
    const codexWorkflow = codexSkill.includes("WORKFLOW.md")
      ? await readFile(join(bundleRoot, "skills", skill.name, "WORKFLOW.md"), "utf8") : codexSkill;
    const ompSkill = await readFile(join(repoRoot, "packages", "omp", "skills", skill.name, "SKILL.md"), "utf8");
    assert.match(codexWorkflow, /Codex delegation binding/);
    assert.match(codexWorkflow, /complete role-plus-task/);
    assert.doesNotMatch(ompSkill, /Codex delegation binding/);
    checked += 1;
  }
  assert.ok(checked >= 20);
  const setup = await readFile(join(bundleRoot, "skills", "setup-oh-my-stack", "SKILL.md"), "utf8");
  const setupWorkflow = setup.includes("WORKFLOW.md")
    ? await readFile(join(bundleRoot, "skills", "setup-oh-my-stack", "WORKFLOW.md"), "utf8") : setup;
  assert.match(setupWorkflow, /configuration artifacts, not evidence/);
});
