import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { prepareDelegation, verifyDelegation } from "../tools/codex-delegation.mjs";
import { loadModel, renderTarget, repoRoot } from "../tools/generate.mjs";
import { configure } from "../tools/configure-models.mjs";

const bundleRoot = join(repoRoot, "packages", "codex");

test("current packaged route contracts override stale roles without changing saved model effort or order", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-current-codex-contract-"));
  try {
    const model = await loadModel();
    const currentRoot = await renderTarget(root, model, model.adapters.find((adapter) => adapter.id === "codex"));
    const contractsPath = join(currentRoot, "config", "role-contracts.json");
    const contracts = JSON.parse(await readFile(contractsPath, "utf8"));
    const resolutionPath = join(root, "saved.json");
    const resolution = { schemaVersion: 1, owner: "oh-my-stack", target: "codex", routes: {
      "code.feature-refactoring": { kind: "single", role: "implementer", entries: [{ model: "saved-code-model", reasoning: "low" }] },
      "code.delegates": { kind: "single", role: "implementer", entries: [{ model: "saved-playbook-model", reasoning: "medium" }] },
      "architect.runners": { kind: "panel", role: "explorer", entries: [
        { model: "saved-design-one", reasoning: "low" },
        { model: "saved-design-two", reasoning: "high" },
        { model: "saved-design-three", reasoning: "medium" },
      ] },
      "hardest.tasks": { kind: "single", role: "implementer", entries: [{ model: "saved-hardest-model", reasoning: "high" }] },
    } };
    await writeFile(resolutionPath, JSON.stringify(resolution));
    for (const routeName of ["code.feature-refactoring", "code.delegates"]) {
      const request = await prepareDelegation({ bundleRoot: currentRoot, resolutionPath, cwd: root, routeName,
        taskName: "code_worker", task: "Implement the assigned bounded change." });
      assert.equal(request.audit.role, "poteto-agent");
      assert.equal(request.model, resolution.routes[routeName].entries[0].model);
      assert.equal(request.reasoning_effort, resolution.routes[routeName].entries[0].reasoning);
      assert.ok(request.message.includes(contracts.roles["poteto-agent"].instructions));
      assert.ok(request.message.includes(`Package root: ${resolve(currentRoot)}`));
      assert.ok(request.message.includes(`Skill root: ${join(currentRoot, "skills")}`));
      const modePath = join(currentRoot, "skills", "poteto-mode", "SKILL.md");
      assert.ok(request.message.includes(modePath));
      assert.match(await readFile(modePath, "utf8"), /complete workflow/);
      const workflowPath = join(currentRoot, "skills", "poteto-mode", "WORKFLOW.md");
      assert.ok(request.message.includes(workflowPath));
      assert.match(await readFile(workflowPath, "utf8"), /## Principles/);
      assert.match(await readFile(join(currentRoot, "skills", "principle-model-the-domain", "SKILL.md"), "utf8"), /Model the Domain/i);
      assert.equal(request.fork_turns, "none");
    }
    for (let entry = 1; entry <= 3; entry++) {
      const request = await prepareDelegation({ bundleRoot: currentRoot, resolutionPath, routeName: "architect.runners", entry,
        taskName: "design_worker", task: "Write the candidate at the assigned output path." });
      const saved = resolution.routes["architect.runners"].entries[entry - 1];
      assert.equal(request.audit.role, "design-runner");
      assert.equal(request.model, saved.model);
      assert.equal(request.reasoning_effort, saved.reasoning);
      assert.ok(request.message.includes(contracts.roles["design-runner"].instructions));
      assert.match(request.message, /Write only the candidate artifacts at the explicitly assigned output/);
      assert.match(request.message, /Do not implement or modify application code/);
    }
    const hardest = await prepareDelegation({ bundleRoot: currentRoot, resolutionPath, routeName: "hardest.tasks",
      taskName: "hard_worker", task: "Implement the hard task." });
    assert.equal(hardest.audit.role, "implementer");
    delete contracts.routeRoles["code.delegates"];
    await writeFile(contractsPath, JSON.stringify(contracts));
    await assert.rejects(prepareDelegation({ bundleRoot: currentRoot, resolutionPath, routeName: "code.delegates",
      taskName: "missing_worker", task: "Implement." }), /unknown packaged route/);
    delete contracts.routeRoles;
    await writeFile(contractsPath, JSON.stringify(contracts));
    const legacy = await prepareDelegation({ bundleRoot: currentRoot, resolutionPath, routeName: "code.delegates",
      taskName: "legacy_worker", task: "Implement." });
    assert.equal(legacy.audit.role, "implementer", "only legacy contract files use saved roles");
  } finally { await rm(root, { recursive: true, force: true }); }
});

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
  assert.equal(request.model, "gpt-6.1-sol");
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
    if (skill.source) {
      const source = JSON.parse(await readFile(join(repoRoot, "packages/codex/skills", skill.name, "SOURCE.json"), "utf8"));
      assert.equal(source.id, skill.source.id);
      const original = await readFile(join(repoRoot, "upstream/snapshots", source.id, source.revision, source.path, "SKILL.md"), "utf8");
      assert.equal(await readFile(join(repoRoot, "packages/codex/skills", skill.name, "SKILL.md"), "utf8"), original);
      continue;
    }
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


test("native prepare reports task choices, preserves saved configuration, and retries its original role line", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-codex-job-context-"));
  try {
    const model = await loadModel();
    const currentRoot = await renderTarget(root, model, model.adapters.find((adapter) => adapter.id === "codex"));
    const resolutionPath = join(root, "saved.json");
    const inventoryPath = join(root, "inventory.json");
    await writeFile(resolutionPath, JSON.stringify({ schemaVersion: 1, owner: "oh-my-stack", target: "codex",
      routes: { "code.bug-fix": { kind: "single", role: "poteto-agent",
        entries: [{ model: "configured-model", reasoning: "high" }] } },
      roles: { explorer: { inheritParent: true, model: null, reasoning: null } } }));
    await writeFile(inventoryPath, JSON.stringify({ schemaVersion: 1, runtime: "codex",
      source: "fixture host inventory", observedAt: "2026-10-14T00:00:00Z",
      models: [{ id: "configured-model", reasoningEfforts: ["low", "medium", "high", "max"] }] }));
    const before = await readFile(resolutionPath, "utf8");
    const common = { bundleRoot: currentRoot, resolutionPath, inventoryPath, routeName: "code.bug-fix",
      taskName: "bounded_worker", task: "Implement only the assigned files." };
    for (const [kind, effort] of [["hardest", "max"], ["judgment", "medium"],
      ["routine", "low"], ["verification", "high"]]) {
      const request = await prepareDelegation({ ...common, jobContext: { kind } });
      assert.equal(request.model, "configured-model");
      assert.equal(request.reasoning_effort, effort);
      assert.deepEqual(request.audit.taskSelection.requested, { model: "configured-model", reasoning: effort });
      assert.equal(request.audit.taskSelection.configured.reasoning, "high");
      assert.equal(request.audit.taskSelection.speed.applied, false);
      assert.equal(Object.hasOwn(request, "speed"), false);
    }
    const retry = await prepareDelegation({ ...common, jobContext: { kind: "hardest" },
      rejectedAdjustment: { model: "configured-model", reasoning: "max", reason: "local host rejection fixture; backend not verified" } });
    assert.equal(retry.reasoning_effort, "high");
    assert.equal(retry.audit.taskSelection.reason, "adjustment-rejected-retry-original-role-line");
    const inherited = await prepareDelegation({ ...common, routeName: undefined, roleName: "explorer",
      jobContext: { kind: "routine" }, parentModel: "actual-parent", parentReasoning: "high" });
    assert.equal(inherited.model, "actual-parent");
    assert.equal(inherited.reasoning_effort, "high");
    assert.equal(inherited.audit.taskSelection.reason, "inherited-alias-unchanged");
    const taskPath = join(root, "task.txt");
    const jobPath = join(root, "job.json");
    await writeFile(taskPath, "Implement only the assigned files.");
    await writeFile(jobPath, JSON.stringify({ kind: "routine", urgent: true }));
    const cli = await promisify(execFile)(process.execPath, [join(currentRoot, "scripts/codex-delegation.mjs"),
      "prepare", "--resolution", resolutionPath, "--route", "code.bug-fix", "--task-name", "cli_worker",
      "--task-file", taskPath, "--job-context", jobPath, "--inventory", inventoryPath], { cwd: root });
    const prepared = JSON.parse(cli.stdout);
    assert.equal(prepared.model, "configured-model");
    assert.equal(prepared.reasoning_effort, "low");
    assert.equal(prepared.audit.taskSelection.speed.requested, "fast");
    assert.match(prepared.audit.taskSelection.inventorySha256, /^[a-f0-9]{64}$/);
    assert.equal(await readFile(resolutionPath, "utf8"), before);
  } finally { await rm(root, { recursive: true, force: true }); }
});

async function staleRetryFixture() {
  const root = await mkdtemp(join(tmpdir(), "oms-native-stale-retry-"));
  const resolutionPath = join(root, "saved.json");
  const inventoryPath = join(root, "inventory.json");
  const selection = { model: "configured-model", reasoning: "high", speed: "standard",
    agent: "saved-agent", modelOptions: { verbosity: "low" } };
  const resolution = { schemaVersion: 1, owner: "oh-my-stack", target: "codex",
    routes: { "code.bug-fix": { kind: "single", role: "implementer", entries: [selection] } },
    roles: { implementer: selection, reviewer: selection,
      explorer: { inheritParent: true, alias: "auto", model: null, reasoning: null } } };
  const inventory = { schemaVersion: 1, runtime: "codex", source: "local rejection fixture, backend not verified",
    observedAt: "2026-10-14T00:00:00Z",
    models: [{ id: "configured-model", reasoningEfforts: ["low", "high", "max"] }] };
  await writeFile(resolutionPath, JSON.stringify(resolution));
  await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
  const common = { bundleRoot, resolutionPath, cwd: root, inventoryPath, routeName: "code.bug-fix",
    taskName: "bounded_worker", task: "Implement only the assigned files.", jobContext: { kind: "hardest" } };
  const prepared = await prepareDelegation(common);
  assert.equal(prepared.reasoning_effort, "max");
  const rejectedPreparedRequest = JSON.parse(JSON.stringify(prepared));
  const rejectedAdjustment = { model: prepared.model, reasoning: prepared.reasoning_effort,
    reason: "local fixture host rejected max; backend not verified" };
  return { root, resolutionPath, inventoryPath, inventory, resolution, selection, common,
    prepared, rejectedPreparedRequest, rejectedAdjustment };
}

test("native retry restores high from the captured max request after inventory refresh or omission", async () => {
  const f = await staleRetryFixture();
  try {
    const before = await readFile(f.resolutionPath, "utf8");
    const roleInput = { ...f.common, routeName: undefined, roleName: "implementer" };
    const rolePrepared = await prepareDelegation(roleInput);
    await writeFile(f.inventoryPath, JSON.stringify({ ...f.inventory,
      models: [{ id: "configured-model", reasoningEfforts: ["low", "high"] }] }));
    for (const [input, rejectedPreparedRequest] of [[f.common, f.rejectedPreparedRequest], [roleInput, rolePrepared]]) {
      for (const inventoryPath of [f.inventoryPath, undefined]) {
        const retry = await prepareDelegation({ ...input, inventoryPath,
          rejectedPreparedRequest, rejectedAdjustment: f.rejectedAdjustment });
        assert.equal(retry.model, "configured-model");
        assert.equal(retry.reasoning_effort, "high");
        assert.equal(retry.fork_turns, "none");
        assert.equal(retry.task_name, "bounded_worker");
        assert.equal(retry.message, rejectedPreparedRequest.message);
        assert.equal(retry.audit.taskSelection.reason, "adjustment-rejected-retry-original-role-line");
        assert.equal(retry.audit.taskSelection.hostRejectionVerified, false);
        assert.deepEqual(retry.audit.taskSelection.configuredSelection, f.selection);
        assert.deepEqual(retry.audit.taskSelection.rejectedAdjustment, f.rejectedAdjustment);
        assert.equal(retry.audit.taskSelection.rejectedPreparedRequestSha256, rejectedPreparedRequest.audit.requestSha256);
        assert.deepEqual(retry.audit.taskSelection.requested, { model: "configured-model", reasoning: "high" });
        for (const field of ["inventoryJson", "inventorySha256", "inventorySource"]) {
          assert.equal(retry.audit.taskSelection[field], rejectedPreparedRequest.audit.taskSelection[field]);
        }
      }
    }
    assert.equal(await readFile(f.resolutionPath, "utf8"), before);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

function rehashPrepared(request) {
  const { requestSha256, ...audit } = request.audit;
  request.audit.requestSha256 = createHash("sha256").update(JSON.stringify({ ...request, audit })).digest("hex");
  return request;
}

for (const currentCatalog of ["refreshed", "omitted"]) {
  test(`native retry preserves captured inventory evidence with ${currentCatalog} current catalog`, async () => {
    const f = await staleRetryFixture();
    try {
      const capturedJson = await readFile(f.inventoryPath, "utf8");
      const currentJson = currentCatalog === "refreshed" ? `${JSON.stringify({ ...f.inventory,
        source: "refreshed local compatibility fixture, backend not verified",
        observedAt: "2026-10-14T01:00:00Z",
        models: [{ id: "configured-model", reasoningEfforts: ["low", "high"] }] }, null, 2)}\n` : null;
      if (currentJson) await writeFile(f.inventoryPath, currentJson);
      const retry = await prepareDelegation({ ...f.common,
        inventoryPath: currentJson ? f.inventoryPath : undefined,
        rejectedPreparedRequest: f.rejectedPreparedRequest, rejectedAdjustment: f.rejectedAdjustment });
      const audit = retry.audit.taskSelection;
      assert.equal(retry.reasoning_effort, "high");
      assert.equal(audit.rejectedAdjustment.reasoning, "max");
      assert.equal(audit.inventoryJson, capturedJson);
      assert.equal(audit.inventorySha256, createHash("sha256").update(capturedJson).digest("hex"));
      assert.equal(audit.inventorySha256, f.prepared.audit.taskSelection.inventorySha256);
      assert.equal(audit.inventorySource, "local rejection fixture, backend not verified");
      assert.deepEqual(JSON.parse(audit.inventoryJson).models[0].reasoningEfforts, ["low", "high", "max"]);
      assert.equal(audit.currentInventoryJson, currentJson);
      assert.equal(audit.currentInventorySha256,
        currentJson ? createHash("sha256").update(currentJson).digest("hex") : null);
      assert.equal(audit.currentInventorySource,
        currentJson ? "refreshed local compatibility fixture, backend not verified" : null);
      assert.equal(audit.hostRejectionVerified, false);
      assert.equal(audit.rejectedPreparedRequestSha256, f.prepared.audit.requestSha256);
      assert.equal(retry.audit.requestSha256, rehashPrepared(structuredClone(retry)).audit.requestSha256);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
}

test("native stale retry rejects receipts from another role, profile, task, entry, or scope", async () => {
  const f = await staleRetryFixture();
  try {
    await writeFile(f.inventoryPath, JSON.stringify({ ...f.inventory,
      models: [{ id: "configured-model", reasoningEfforts: ["low", "high"] }] }));
    const retry = { ...f.common, rejectedPreparedRequest: f.rejectedPreparedRequest,
      rejectedAdjustment: f.rejectedAdjustment };
    for (const change of [
      { routeName: undefined, roleName: "implementer" },
      { routeName: undefined, roleName: "reviewer" },
      { jobContext: { kind: "routine" } },
      { jobContext: { kind: "hardest", urgent: true } },
      { task: "Implement different files." },
      { taskName: "another_worker" },
      { cwd: join(f.root, "another-project") },
      { userRoot: join(f.root, "another-user") },
    ]) {
      await assert.rejects(prepareDelegation({ ...retry, ...change }), /rejected prepared request/);
    }
    f.resolution.routes["code.bug-fix"].kind = "panel";
    f.resolution.routes["code.bug-fix"].entries.push({ ...f.selection });
    await writeFile(f.resolutionPath, JSON.stringify(f.resolution));
    await assert.rejects(prepareDelegation({ ...retry, entry: 2 }), /rejected prepared request/);
    const otherPath = join(f.root, "same-config-another-path.json");
    await writeFile(otherPath, JSON.stringify(f.resolution));
    await assert.rejects(prepareDelegation({ ...retry, resolutionPath: otherPath }), /rejected prepared request/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("native stale retry rejects modified or unbound receipts even with recomputed checksums", async () => {
  const f = await staleRetryFixture();
  try {
    const retry = { ...f.common, inventoryPath: undefined,
      rejectedPreparedRequest: f.rejectedPreparedRequest, rejectedAdjustment: f.rejectedAdjustment };
    for (const mutate of [
      request => { request.fork_turns = "all"; },
      request => { request.message = "Forged assignment."; },
      request => { request.model = "guessed-model"; },
      request => { request.reasoning_effort = "ultra"; },
      request => { request.audit.role = "reviewer"; },
      request => { request.audit.route = "hardest.tasks"; },
      request => { request.audit.contractSha256 = "0".repeat(64); },
      request => { request.audit.taskSha256 = "0".repeat(64); },
      request => { request.audit.requestScope.cwd = "/other/project"; },
      request => { request.audit.resolutionScope = "project"; },
      request => { request.audit.taskSelection.inventorySha256 = "0".repeat(64); },
      request => { request.audit.taskSelection.configuredSelection.modelOptions.verbosity = "high"; },
      request => { request.audit.taskSelection.requested.reasoning = "high"; },
      request => { request.audit.taskSelection.selected.reasoning = "high"; },
      request => { request.audit.taskSelection.jobContext = { kind: "routine" }; },
      request => { request.audit.taskSelection.reason = "saved-role-line"; },
      request => { request.audit.taskSelection.rejectedAdjustment = { model: "configured-model", reasoning: "max", reason: "forged" }; },
      request => { request.audit.resolutionProfile = { preset: "other", budget: "other" }; },
    ]) {
      const forged = structuredClone(f.rejectedPreparedRequest);
      mutate(forged);
      await assert.rejects(prepareDelegation({ ...retry, rejectedPreparedRequest: forged }), /rejected prepared request/);
      await assert.rejects(prepareDelegation({ ...retry, rejectedPreparedRequest: rehashPrepared(forged) }), /rejected prepared request/);
    }
    for (const invalid of [null, {}, { model: "configured-model", reasoning_effort: "max" }]) {
      await assert.rejects(prepareDelegation({ ...retry, rejectedPreparedRequest: invalid }), /rejected prepared request/);
    }
    await assert.rejects(prepareDelegation({ ...retry, rejectedAdjustment: undefined }), /requires rejectedAdjustment/);
    for (const change of [{ model: "guessed-model" }, { reasoning: "ultra" }, { reason: "" }]) {
      await assert.rejects(prepareDelegation({ ...retry,
        rejectedAdjustment: { ...f.rejectedAdjustment, ...change } }), /must identify/);
    }
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("native stale retry validates the original saved entry and preserves aliased selections", async () => {
  const f = await staleRetryFixture();
  try {
    const retry = { ...f.common, rejectedPreparedRequest: f.rejectedPreparedRequest,
      rejectedAdjustment: f.rejectedAdjustment };
    await writeFile(f.inventoryPath, JSON.stringify({ ...f.inventory,
      models: [{ id: "configured-model", reasoningEfforts: ["low"] }] }));
    await assert.rejects(prepareDelegation(retry), /saved model and reasoning/);
    for (const selection of [
      { ...f.selection, model: "another-family-model" },
      { ...f.selection, reasoning: "low" },
      { ...f.selection, modelOptions: { verbosity: "high" } },
    ]) {
      f.resolution.routes["code.bug-fix"].entries[0] = selection;
      await writeFile(f.resolutionPath, JSON.stringify(f.resolution));
      await assert.rejects(prepareDelegation({ ...retry, inventoryPath: undefined }), /rejected prepared request/);
    }
    f.resolution.routes["code.bug-fix"].entries[0] = { ...f.selection, reasoning: "invalid-effort" };
    await writeFile(f.resolutionPath, JSON.stringify(f.resolution));
    await assert.rejects(prepareDelegation({ ...retry, inventoryPath: undefined }), /rejected prepared request/);
    await assert.rejects(prepareDelegation(retry), /saved model and reasoning/);
    for (const alias of ["auto", "inherit-parent"]) {
      f.resolution.roles.explorer.alias = alias;
      await writeFile(f.resolutionPath, JSON.stringify(f.resolution));
      const input = { ...f.common, inventoryPath: undefined, routeName: undefined, roleName: "explorer",
        parentModel: "actual-parent", parentReasoning: "high" };
      const inherited = await prepareDelegation(input);
      assert.equal(inherited.model, "actual-parent");
      assert.equal(inherited.reasoning_effort, "high");
      assert.equal(inherited.audit.taskSelection.reason, "inherited-alias-unchanged");
      await assert.rejects(prepareDelegation({ ...input, rejectedPreparedRequest: inherited,
        rejectedAdjustment: { model: "actual-parent", reasoning: "high", reason: "fixture rejection" } }), /rejected prepared request/);
      await assert.rejects(prepareDelegation({ ...input, rejectedAdjustment:
        { model: "actual-parent", reasoning: "high", reason: "fixture rejection" } }), /must identify/);
    }
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("native CLI consumes the saved prepared request and exact prior inventory bytes", async () => {
  const f = await staleRetryFixture();
  try {
    const requestPath = join(f.root, "prepared.json");
    const rejectionPath = join(f.root, "rejection.json");
    const taskPath = join(f.root, "task.txt");
    const jobPath = join(f.root, "job.json");
    await writeFile(requestPath, JSON.stringify(f.prepared));
    await writeFile(rejectionPath, JSON.stringify(f.rejectedAdjustment));
    await writeFile(taskPath, f.common.task);
    await writeFile(jobPath, JSON.stringify(f.common.jobContext));
    assert.equal(f.prepared.audit.taskSelection.inventoryJson, await readFile(f.inventoryPath, "utf8"));
    assert.equal(f.prepared.audit.taskSelection.inventorySha256,
      createHash("sha256").update(await readFile(f.inventoryPath, "utf8")).digest("hex"));
    assert.equal(f.prepared.audit.requestSha256, rehashPrepared(structuredClone(f.prepared)).audit.requestSha256);
    assert.deepEqual(f.prepared.audit.taskSelection.configuredSelection, f.selection);
    await writeFile(f.inventoryPath, JSON.stringify({ ...f.inventory,
      models: [{ id: "configured-model", reasoningEfforts: ["low", "high"] }] }));
    for (const inventory of [["--inventory", f.inventoryPath], []]) {
      const cli = await promisify(execFile)(process.execPath, [join(repoRoot, "tools/codex-delegation.mjs"),
        "prepare", "--package", bundleRoot, "--resolution", f.resolutionPath, "--route", "code.bug-fix",
        "--task-name", f.common.taskName, "--task-file", taskPath, "--job-context", jobPath,
        "--rejected-adjustment", rejectionPath, "--rejected-prepared-request", requestPath,
        ...inventory], { cwd: f.root });
      const retry = JSON.parse(cli.stdout);
      assert.equal(retry.model, "configured-model");
      assert.equal(retry.reasoning_effort, "high");
      assert.equal(retry.fork_turns, "none");
      assert.equal(retry.message, f.prepared.message);
      assert.equal(retry.audit.taskSelection.hostRejectionVerified, false);
      assert.equal(retry.audit.taskSelection.rejectedPreparedRequestSha256, f.prepared.audit.requestSha256);
      for (const field of ["inventoryJson", "inventorySha256", "inventorySource"]) {
        assert.equal(retry.audit.taskSelection[field], f.prepared.audit.taskSelection[field]);
      }
      const currentJson = inventory.length ? await readFile(f.inventoryPath, "utf8") : null;
      assert.equal(retry.audit.taskSelection.currentInventoryJson, currentJson);
      assert.equal(retry.audit.taskSelection.currentInventorySha256,
        currentJson ? createHash("sha256").update(currentJson).digest("hex") : null);
      assert.equal(retry.audit.taskSelection.currentInventorySource, inventory.length ? f.inventory.source : null);
    }
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
