import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareClaudeDelegation, verifyClaudeEffort } from '../tools/claude-delegation.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'oms-claude-call-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'config')); await mkdir(join(root, '.claude')); await mkdir(join(root, 'home'));
  await writeFile(join(root, 'config/role-contracts.json'), JSON.stringify({ schemaVersion: 1, target: 'claude-code',
    routeRoles: { panel: 'reviewer' }, roles: { reviewer: { description: 'Read-only review', instructions: 'Review only; no writes.' } } }));
  const manifest = { schemaVersion: 1, owner: 'oh-my-stack', target: 'claude-code', roles: {}, routes: {
    panel: { kind: 'panel', role: 'ignored-saved-role', entries: [
      { agent: 'ohmystack-panel-1', model: 'physical-opus', reasoning: 'high' },
      { agent: 'ohmystack-panel-2', model: 'physical-sonnet', reasoning: 'medium' },
    ] },
  } };
  await writeFile(join(root, '.claude/oh-my-stack.resolution.json'), JSON.stringify(manifest));
  const capabilities = { runtime: 'claude-code', version: '2.1.292', source: 'synthetic tool schema fixture',
    observedAt: '2026-10-23T00:00:00Z', agentTypes: ['ohmystack-panel-1', 'ohmystack-panel-2', 'oh-my-stack:reviewer'],
    models: [{ id: 'physical-opus', selector: 'opus', reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'] },
      { id: 'physical-sonnet', selector: 'sonnet', reasoningEfforts: ['low', 'medium', 'high'] }] };
  return { bundleRoot: root, cwd: root, userRoot: join(root, 'home'), env: {}, routeName: 'panel',
    task: 'Inspect explicit fixture files.', capabilities };
}

test('native effort uses the selected panel agent, canonical mapping and per-call field', async t => {
  const input = await fixture(t), result = await prepareClaudeDelegation({ ...input, entry: 2 });
  assert.equal(result.arguments.subagent_type, 'ohmystack-panel-2');
  assert.equal(result.arguments.model, 'sonnet'); assert.equal(result.arguments.effort, 'medium');
  assert.equal(result.audit.role, 'reviewer'); assert.equal(result.audit.observedEffectiveEffort, null);
  assert(!Object.hasOwn(result.arguments, 'reasoning_effort')); assert.match(result.arguments.prompt, /no writes/);
});

test('task effort adjustment changes no model or agent and host rejection restores saved effort', async t => {
  const input = await fixture(t);
  const routine = await prepareClaudeDelegation({ ...input, jobContext: { kind: 'routine' } });
  assert.equal(routine.arguments.effort, 'low'); assert.equal(routine.arguments.model, 'opus');
  const retry = await prepareClaudeDelegation({ ...input, jobContext: { kind: 'routine' },
    rejectedPreparedRequest: routine,
    rejectedAdjustment: { model: 'physical-opus', reasoning: 'low', reason: 'Native call rejected adjustment' } });
  assert.equal(retry.arguments.effort, 'high');
  assert.equal((await prepareClaudeDelegation({ ...input, jobContext: { kind: 'verification' } })).arguments.effort, 'high');
});

async function rejectedFixture(t) {
  const input = { ...await fixture(t), jobContext: { kind: 'routine' } };
  const prepared = await prepareClaudeDelegation(input);
  const rejectedAdjustment = { model: 'physical-opus', reasoning: 'low', reason: 'Fixture native Agent rejected low' };
  return { input, prepared, retry: { ...input, rejectedPreparedRequest: prepared, rejectedAdjustment } };
}

for (const [name, reasoningEfforts] of [['refreshed', ['low', 'high', 'max']], ['removed adjusted tier', ['medium', 'high', 'xhigh', 'max']]]) {
  test(`Claude rejected request restores the original line after ${name} capabilities`, async t => {
    const { input, prepared, retry } = await rejectedFixture(t);
    const before = await readFile(join(input.cwd, '.claude/oh-my-stack.resolution.json'), 'utf8');
    const capabilities = structuredClone(input.capabilities);
    capabilities.source = 'refreshed offline capabilities'; capabilities.observedAt = '2026-10-23T01:00:00Z';
    capabilities.models[0].reasoningEfforts = reasoningEfforts;
    capabilities.models[0].selector = 'current-opus';
    const restored = await prepareClaudeDelegation({ ...retry, capabilities });
    assert.equal(restored.arguments.effort, 'high');
    assert.equal(restored.arguments.model, 'current-opus');
    assert.equal(restored.arguments.subagent_type, prepared.arguments.subagent_type);
    assert.equal(restored.arguments.prompt, prepared.arguments.prompt);
    assert.deepEqual(restored.audit.taskSelection.capabilities, input.capabilities);
    assert.deepEqual(restored.audit.taskSelection.currentCapabilities, capabilities);
    assert.deepEqual(restored.audit.taskSelection.rejectedAdjustment, retry.rejectedAdjustment);
    assert.equal(restored.audit.taskSelection.rejectedPreparedRequestSha256, prepared.sha256);
    assert.equal(restored.audit.taskSelection.hostRejectionVerified, false);
    assert.equal(restored.audit.executionVerified, false);
    assert.equal(await readFile(join(input.cwd, '.claude/oh-my-stack.resolution.json'), 'utf8'), before);
  });
}

test('Claude rejected request binds the original task scope role member configuration and job', async t => {
  const { input, retry } = await rejectedFixture(t);
  for (const change of [
    { task: 'Review different files.' }, { cwd: join(input.cwd, 'other') },
    { userRoot: join(input.cwd, 'other-home') },
    { routeName: undefined, roleName: 'reviewer' }, { entry: 2 },
    { jobContext: { kind: 'hardest' } }, { jobContext: { kind: 'routine', urgent: true } },
    { env: { CLAUDE_CODE_EFFORT_LEVEL: 'max' } },
  ]) {
    await assert.rejects(prepareClaudeDelegation({ ...retry, ...change }), /rejected prepared request/);
  }
  const otherBundle = join(input.cwd, 'other-package');
  await mkdir(join(otherBundle, 'config'), { recursive: true });
  await writeFile(join(otherBundle, 'config/role-contracts.json'), await readFile(join(input.bundleRoot, 'config/role-contracts.json')));
  await assert.rejects(prepareClaudeDelegation({ ...retry, bundleRoot: otherBundle }), /rejected prepared request/);
  const path = join(input.cwd, '.claude/oh-my-stack.resolution.json');
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  manifest.roles.reviewer = { model: 'physical-opus', reasoning: 'high' };
  await writeFile(path, JSON.stringify(manifest));
  await assert.rejects(prepareClaudeDelegation(retry), /rejected prepared request/);
});

test('Claude canonical role replay preserves the role and rejects equivalent members or other roles', async t => {
  const input = await fixture(t);
  const path = join(input.cwd, '.claude/oh-my-stack.resolution.json');
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  manifest.roles.reviewer = manifest.roles.implementer = manifest.routes.panel.entries[0];
  manifest.routes.panel.entries.push(manifest.routes.panel.entries[0]);
  await writeFile(path, JSON.stringify(manifest));
  const contractPath = join(input.bundleRoot, 'config/role-contracts.json');
  const contracts = JSON.parse(await readFile(contractPath, 'utf8'));
  contracts.roles.implementer = contracts.roles.reviewer;
  await writeFile(contractPath, JSON.stringify(contracts));
  const canonical = { ...input, routeName: undefined, roleName: 'reviewer', jobContext: { kind: 'routine' } };
  const prepared = await prepareClaudeDelegation(canonical);
  const rejectedAdjustment = { model: 'physical-opus', reasoning: 'low', reason: 'Fixture native effort rejection' };
  const capabilities = structuredClone(input.capabilities);
  capabilities.models[0].reasoningEfforts = ['medium', 'high'];
  const retry = { ...canonical, capabilities, rejectedPreparedRequest: prepared, rejectedAdjustment };
  const restored = await prepareClaudeDelegation(retry);
  assert.equal(restored.arguments.effort, 'high');
  assert.equal(restored.audit.role, 'reviewer');
  assert.equal(verifyClaudeEffort({ prepared: restored, dispatch: restored.arguments }).status, 'inconclusive');
  await assert.rejects(prepareClaudeDelegation({ ...retry, roleName: 'implementer' }), /rejected prepared request/);
  const member = await prepareClaudeDelegation({ ...input, jobContext: { kind: 'routine' } });
  await assert.rejects(prepareClaudeDelegation({ ...input, entry: 3, jobContext: { kind: 'routine' },
    rejectedPreparedRequest: member, rejectedAdjustment }), /rejected prepared request/);
  contracts.roles.reviewer.instructions = 'Changed role instructions.';
  await writeFile(contractPath, JSON.stringify(contracts));
  await assert.rejects(prepareClaudeDelegation(retry), /rejected prepared request/);
});

function rehashPrepared(prepared) {
  const { sha256, ...request } = prepared;
  return { ...request, sha256: createHash('sha256').update(JSON.stringify(request)).digest('hex') };
}

test('Claude rejected request refuses altered receipts and mismatched rejection evidence', async t => {
  const { prepared, retry } = await rejectedFixture(t);
  for (const mutate of [
    request => { request.arguments.prompt = 'Different task.'; },
    request => { request.arguments.effort = 'medium'; },
    request => { request.arguments.model = 'sonnet'; },
    request => { request.audit.entry = 2; },
    request => { request.audit.requestScope.cwd = '/another-project'; },
    request => { request.audit.contractSha256 = 'forged'; },
    request => { request.audit.resolutionSha256 = 'forged'; },
    request => { request.audit.taskSelection.configuredSelection.reasoning = 'max'; },
    request => { request.audit.taskSelection.reason = 'saved-role-line'; },
    request => { request.audit.taskSelection.jobContext = { kind: 'hardest' }; },
    request => { request.audit.taskSelection.capabilities.models[0].reasoningEfforts = ['medium', 'high']; },
  ]) {
    const altered = structuredClone(prepared); mutate(altered);
    await assert.rejects(prepareClaudeDelegation({ ...retry, rejectedPreparedRequest: altered }), /rejected prepared request/);
    await assert.rejects(prepareClaudeDelegation({ ...retry, rejectedPreparedRequest: rehashPrepared(altered) }), /rejected prepared request/);
  }
  for (const rejectedPreparedRequest of [null, {}, { sha256: 'forged' }]) {
    await assert.rejects(prepareClaudeDelegation({ ...retry, rejectedPreparedRequest }), /rejected prepared request/);
  }
  await assert.rejects(prepareClaudeDelegation({ ...retry, rejectedAdjustment: undefined }), /requires rejectedAdjustment/);
  await assert.rejects(prepareClaudeDelegation({ ...retry, rejectedPreparedRequest: undefined }), /requires rejectedPreparedRequest/);
  for (const change of [{ model: 'other-model' }, { reasoning: 'medium' }, { reason: '' }]) {
    await assert.rejects(prepareClaudeDelegation({ ...retry, rejectedAdjustment: { ...retry.rejectedAdjustment, ...change } }), /must identify/);
  }
});

test('Claude restored line must still be supported by the current native capabilities', async t => {
  const { input, retry } = await rejectedFixture(t);
  for (const change of [
    capabilities => { capabilities.models[0].reasoningEfforts = ['low', 'medium']; },
    capabilities => { capabilities.models = []; },
    capabilities => { capabilities.models[0].selector = ''; },
    capabilities => { capabilities.agentTypes = []; },
    capabilities => { capabilities.version = '2.1.291'; },
  ]) {
    const capabilities = structuredClone(input.capabilities); change(capabilities);
    await assert.rejects(prepareClaudeDelegation({ ...retry, capabilities }), /advertised|selector|2\.1\.292|saved model/);
  }
});

test('environment precedence is predicted, not observed; correlated effort mismatches remain visible', async t => {
  const input = await fixture(t), prepared = await prepareClaudeDelegation({ ...input, env: { CLAUDE_CODE_EFFORT_LEVEL: 'max' } });
  assert.equal(prepared.arguments.effort, 'high'); assert.equal(prepared.audit.expectedEffectiveEffort, 'max');
  const evidence = { prepared, dispatch: prepared.arguments, agentId: 'child-1',
    observation: { agentId: 'child-1', agentType: 'ohmystack-panel-1', hookEvent: 'PreToolUse', effort: 'max' } };
  assert.equal(verifyClaudeEffort(evidence).status, 'effort-matched');
  assert.equal(verifyClaudeEffort({ ...evidence, observation: { ...evidence.observation, effort: 'high' } }).status, 'effort-mismatch');
  assert.equal(verifyClaudeEffort({ ...evidence, agentId: 'other-child' }).status, 'inconclusive');
  assert.equal(verifyClaudeEffort({ ...evidence, observation: null }).status, 'inconclusive');
  assert.equal(verifyClaudeEffort(evidence).modelVerified, false);
  assert.throws(() => verifyClaudeEffort({ ...evidence, dispatch: { ...prepared.arguments, effort: 'low' } }), /dispatch differs/);
  assert.throws(() => verifyClaudeEffort({ ...evidence, prepared: { ...prepared, sha256: 'forged' } }), /fingerprint/);
});

test('unsupported versions, missing selectors and invented effort fail before a call', async t => {
  const input = await fixture(t);
  await assert.rejects(prepareClaudeDelegation({ ...input, capabilities: { ...input.capabilities, version: '2.1.291' } }), /2.1.292/);
  await assert.rejects(prepareClaudeDelegation({ ...input, capabilities: { ...input.capabilities, version: 'unknown' } }), /version/);
  await assert.rejects(prepareClaudeDelegation({ ...input, capabilities: { ...input.capabilities, agentTypes: [] } }), /subagent_type/);
  await assert.rejects(prepareClaudeDelegation({ ...input, capabilities: { ...input.capabilities, models: [] } }), /selector/);
  await assert.rejects(prepareClaudeDelegation({ ...input, env: { CLAUDE_CODE_EFFORT_LEVEL: 'ultra' } }), /override/);
  await assert.rejects(prepareClaudeDelegation({ ...input, env: { CLAUDE_CODE_SUBAGENT_MODEL_FORCE: '1' } }), /Forced/);
  await assert.rejects(prepareClaudeDelegation({ ...input, entry: 3 }), /entry/);
  await assert.rejects(prepareClaudeDelegation({ ...input, entry: 2, env: { CLAUDE_CODE_EFFORT_LEVEL: 'max' } }), /not advertised/);
});

test('canonical inheritance emits no model/effort override and cannot claim observed effort', async t => {
  const input = await fixture(t); delete input.routeName;
  const prepared = await prepareClaudeDelegation({ ...input, roleName: 'reviewer' });
  assert.equal(prepared.arguments.subagent_type, 'oh-my-stack:reviewer');
  assert(!Object.hasOwn(prepared.arguments, 'model')); assert(!Object.hasOwn(prepared.arguments, 'effort'));
  assert.equal(verifyClaudeEffort({ prepared, dispatch: prepared.arguments, agentId: 'c',
    observation: { agentId: 'c', agentType: 'oh-my-stack:reviewer', hookEvent: 'PreToolUse', effort: 'high' } }).status, 'inconclusive');
});


test('an explicit no-effort model omits the unsupported native effort field', async t => {
  const input = await fixture(t);
  const path = join(input.cwd, '.claude/oh-my-stack.resolution.json');
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  manifest.routes.panel.entries[0].reasoning = 'none';
  await writeFile(path, JSON.stringify(manifest));
  input.capabilities.models[0].reasoningEfforts = ['none'];
  input.capabilities.version = '2.1.291';
  const result = await prepareClaudeDelegation(input);
  assert.equal(result.arguments.model, 'opus'); assert(!Object.hasOwn(result.arguments, 'effort'));
});

test('source CLI replays a serialized receipt after the adjusted tier disappears', async t => {
  const { input, prepared, retry } = await rejectedFixture(t);
  const capabilities = structuredClone(input.capabilities);
  capabilities.models[0].reasoningEfforts = ['medium', 'high', 'max'];
  const path = join(input.cwd, 'retry.json');
  await writeFile(path, JSON.stringify({ ...retry, capabilities }));
  const script = fileURLToPath(new URL('../tools/claude-delegation.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script, 'prepare', '--input', path], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const restored = JSON.parse(result.stdout);
  assert.equal(restored.arguments.effort, 'high');
  assert.equal(restored.audit.taskSelection.rejectedPreparedRequestSha256, prepared.sha256);
  await writeFile(path, JSON.stringify({ ...retry, capabilities, rejectedAdjustment: { ...retry.rejectedAdjustment, reasoning: 'medium' } }));
  const refused = spawnSync(process.execPath, [script, 'prepare', '--input', path], { encoding: 'utf8' });
  assert.equal(refused.status, 2); assert.match(refused.stderr, /must identify/); assert.equal(refused.stdout, '');
});

test('generated package CLI prepares a canonical role and refuses missing observation evidence', async t => {
  const input = await fixture(t); delete input.routeName;
  input.bundleRoot = fileURLToPath(new URL('../packages/claude-code/', import.meta.url));
  input.roleName = 'reviewer';
  const source = join(input.cwd, 'request.json'); await writeFile(source, JSON.stringify(input));
  const script = join(input.bundleRoot, 'scripts/claude-delegation.mjs');
  const result = spawnSync(process.execPath, [script, 'prepare', '--input', source], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const prepared = JSON.parse(result.stdout);
  assert.equal(prepared.arguments.subagent_type, 'oh-my-stack:reviewer');
  await writeFile(source, JSON.stringify({ prepared, dispatch: prepared.arguments }));
  const verification = spawnSync(process.execPath, [script, 'verify', '--input', source], { encoding: 'utf8' });
  assert.equal(verification.status, 1); assert.equal(JSON.parse(verification.stdout).status, 'inconclusive');
});
