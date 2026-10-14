import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { configureT3Resolution, observeT3Task, parseT3Catalog, prepareT3Cancellation, prepareT3Delegation, prepareT3Schedule, resolveT3Resolution, t3ModelFamily } from '../tools/t3-orchestration.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const catalog = JSON.parse(await readFile(path.join(root, 'tests/fixtures/t3-catalog.json'), 'utf8'));
const first = { providerInstanceId: 'provider/person:one', model: 'custom/opaque:model@1', options: { 'switch-id': false } };
const second = { providerInstanceId: 'other/provider-instance', model: 'second:model', options: { fast: true } };
const contracts = {
  schemaVersion: 1, orchestration: 't3', host: 'codex',
  roles: {
    implementer: { description: 'Bounded implementation.', instructions: 'Implement only owned files. Read the named specification in full.', writes: true, constraints: ['independent_session'] },
    reviewer: { description: 'Independent review.', instructions: 'Review the frozen scope. Report evidence and unresolved objections.', writes: false, constraints: ['read_only', 'independent_session'] }
  },
  routes: { 'code.unit': { kind: 'single', role: 'implementer', defaultCount: 1 }, 'review.panel': { kind: 'panel', role: 'reviewer', defaultCount: 2 } }
};

function configuration(overrides = {}) {
  return configureT3Resolution({ catalog, contracts, preset: 'explicit-review', overrides });
}

async function temporary(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'oms-t3-domain-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function delegationInput(t, changes = {}) {
  const bundleRoot = await temporary(t);
  await mkdir(path.join(bundleRoot, 'config'));
  await writeFile(path.join(bundleRoot, 'config/t3-role-contracts.json'), JSON.stringify(contracts));
  return {
    bundleRoot, catalog, resolution: configuration({ routes: { 'review.panel': [first, second] } }),
    routeName: 'review.panel', entry: 2, task: 'Review the complete change and report actionable findings.',
    originalBrief: 'Preserve every existing installation identity and workflow stage.', cwd: bundleRoot,
    ownedPaths: [], runId: 'run/opaque', stepId: 'review-stage', round: 1, ...changes
  };
}

function taskObservation(changes = {}) {
  return {
    taskId: 'task/one', childNodeId: 'node/one', childRunId: 'run/original', childThreadId: 'thread/one',
    providerInstanceId: 'provider/person:one', model: 'custom/opaque:model@1', status: 'running',
    summary: null, resultContextTransferId: null, waitTimedOut: false, workState: 'working', hasPendingChildRuns: false,
    latestTerminalRunId: null, latestTerminalStatus: null, latestTerminalSummary: null, latestTerminalResultContextTransferId: null,
    ...changes
  };
}

test('opaque catalog identifiers and typed options resolve without family inference', () => {
  const parsed = parseT3Catalog(JSON.stringify(catalog));
  assert.equal(parsed.providers[0].models[0].id, 'custom/opaque:model@1');
  const resolved = configuration({ roles: { implementer: first } });
  assert.deepEqual(resolved.roles.implementer, { providerInstanceId: 'provider/person:one', model: 'custom/opaque:model@1', options: { 'switch-id': false } });
  assert.deepEqual(resolved.routes['review.panel'], { kind: 'panel', entries: [{ inheritParent: true }, { inheritParent: true }] });
  assert.deepEqual(resolved.routes['code.unit'], { kind: 'single', entries: [{ inheritParent: true }] });
});

test('optional catalog option lists normalize without changing the captured input', async t => {
  const nullable = structuredClone(catalog);
  nullable.providers[0].runtimeModes = null;
  nullable.providers[0].models.push({ id: 'without/options', options: null }, { id: 'without:field' });
  const parsed = parseT3Catalog(nullable);
  assert.deepEqual(parsed.providers[0].models.slice(-2), [
    { id: 'without/options', options: [] }, { id: 'without:field', options: [] }
  ]);
  assert.equal(nullable.providers[0].models.at(-2).options, null);
  assert.equal(Object.hasOwn(nullable.providers[0].models.at(-1), 'options'), false);
  const input = await delegationInput(t, { catalog: nullable, entry: 1 });
  input.resolution = configureT3Resolution({ catalog: nullable, contracts, overrides: {
    routes: { 'review.panel': [{ providerInstanceId: first.providerInstanceId, model: 'without/options', options: {} }] }
  } });
  const prepared = await prepareT3Delegation(input);
  assert.deepEqual(prepared.arguments.target, { providerInstanceId: first.providerInstanceId, model: 'without/options', options: {} });
});

test('wrong provider/model pairs, unknown options, and string booleans fail configuration', () => {
  for (const target of [
    { ...first, providerInstanceId: 'other/provider-instance' },
    { ...first, options: { 'switch-id': 'false' } },
    { ...first, options: { 'budget-id': 'invented' } },
    { ...first, options: { unsupported: true } },
    { inheritParent: true, model: 'custom/opaque:model@1' },
    { ...first, options: { 'switch-id': 0 } }
  ]) assert.throws(() => configuration({ roles: { implementer: target } }));
  assert.throws(() => parseT3Catalog({ ...catalog, providers: [...catalog.providers, catalog.providers[0]] }), /Duplicate provider instance/);
  assert.throws(() => parseT3Catalog({ ...catalog, providers: [{ ...catalog.providers[0], canRunChildTask: 'false' }] }), /boolean/);
});

test('same-preset refresh preserves panel order, length and options; overrides change only named choices', () => {
  const previous = configuration({ roles: { implementer: first }, routes: { 'review.panel': [second, first, second] } });
  const refreshed = configureT3Resolution({ catalog, contracts, preset: 'explicit-review', previous });
  assert.deepEqual(refreshed.routes['review.panel'].entries, [second, first, second]);
  const changed = configureT3Resolution({ catalog, contracts, preset: 'explicit-review', previous, overrides: { roles: { implementer: { inheritParent: true } } } });
  assert.deepEqual(changed.roles.implementer, { inheritParent: true });
  assert.deepEqual(changed.routes['review.panel'].entries, [second, first, second]);
  assert.deepEqual(previous.roles.implementer, first);
  const newPreset = configureT3Resolution({ catalog, contracts, preset: 'another-preset', previous });
  assert.deepEqual(newPreset.routes['review.panel'], { kind: 'panel', entries: [{ inheritParent: true }, { inheritParent: true }] });
});

test('explicit override can replace a stale catalog selection', () => {
  const previous = configuration({ roles: { implementer: first } });
  previous.roles.implementer.model = 'removed:model';
  assert.deepEqual(configureT3Resolution({ catalog, contracts, preset: 'explicit-review', previous, overrides: { roles: { implementer: first } } }).roles.implementer, first);
  assert.deepEqual(configureT3Resolution({ catalog, contracts, preset: 'explicit-review', previous }), previous);
});

test('project manifests shadow the entire user manifest and native configurations stay unchanged', async t => {
  const directory = await temporary(t);
  const userRoot = path.join(directory, 'user');
  const projectRoot = path.join(directory, 'project');
  const cwd = path.join(projectRoot, 'nested');
  for (const base of [userRoot, projectRoot]) await mkdir(path.join(base, '.oh-my-stack/t3'), { recursive: true });
  await mkdir(cwd);
  await mkdir(path.join(userRoot, '.codex'));
  await mkdir(path.join(projectRoot, '.claude'));
  await writeFile(path.join(userRoot, '.codex/models.json'), 'native-codex');
  await writeFile(path.join(projectRoot, '.claude/models.json'), 'native-claude');
  await writeFile(path.join(userRoot, '.oh-my-stack/t3/resolution.json'), JSON.stringify(configuration({ roles: { implementer: first } })));
  const project = configuration({ roles: { reviewer: second } });
  await writeFile(path.join(projectRoot, '.oh-my-stack/t3/resolution.json'), JSON.stringify(project));
  const selected = await resolveT3Resolution({ cwd, userRoot, contracts });
  assert.equal(selected.scope, 'project');
  assert.equal(selected.path, path.join(projectRoot, '.oh-my-stack/t3/resolution.json'));
  assert.deepEqual(selected.resolution.roles, { implementer: { inheritParent: true }, reviewer: second });
  assert.equal(await readFile(path.join(userRoot, '.codex/models.json'), 'utf8'), 'native-codex');
  assert.equal(await readFile(path.join(projectRoot, '.claude/models.json'), 'utf8'), 'native-claude');
  await rm(path.join(projectRoot, '.oh-my-stack/t3/resolution.json'));
  assert.equal((await resolveT3Resolution({ cwd, userRoot, contracts })).scope, 'user');
  await rm(path.join(userRoot, '.oh-my-stack/t3/resolution.json'));
  assert.deepEqual(await resolveT3Resolution({ cwd, userRoot }), { scope: 'inherit-parent', path: null, resolution: null });
});

test('malformed nearest project manifest fails instead of falling back', async t => {
  const directory = await temporary(t);
  await mkdir(path.join(directory, '.oh-my-stack/t3'), { recursive: true });
  await writeFile(path.join(directory, '.oh-my-stack/t3/resolution.json'), JSON.stringify({ owner: 'other' }));
  await assert.rejects(resolveT3Resolution({ cwd: directory, userRoot: directory }), /Unsupported resolution|not owned/);
});

test('a user manifest above cwd retains user scope', async t => {
  const userRoot = await temporary(t);
  const cwd = path.join(userRoot, 'project');
  await mkdir(cwd);
  await mkdir(path.join(userRoot, '.oh-my-stack/t3'), { recursive: true });
  await writeFile(path.join(userRoot, '.oh-my-stack/t3/resolution.json'), JSON.stringify(configuration()));
  assert.equal((await resolveT3Resolution({ cwd, userRoot })).scope, 'user');
});

test('project lookup stops at the user root instead of consuming its parent configuration', async t => {
  const directory = await temporary(t);
  const userRoot = path.join(directory, 'home');
  const cwd = path.join(userRoot, 'project');
  for (const base of [directory, userRoot]) await mkdir(path.join(base, '.oh-my-stack/t3'), { recursive: true });
  await mkdir(cwd);
  await writeFile(path.join(directory, '.oh-my-stack/t3/resolution.json'), JSON.stringify(configuration({ roles: { reviewer: second } })));
  const user = configuration({ roles: { reviewer: first } });
  await writeFile(path.join(userRoot, '.oh-my-stack/t3/resolution.json'), JSON.stringify(user));
  const selected = await resolveT3Resolution({ cwd, userRoot, contracts });
  assert.equal(selected.scope, 'user');
  assert.deepEqual(selected.resolution.roles.reviewer, first);
});

test('panel member two receives exact target, full brief, complete role and package context', async t => {
  const input = await delegationInput(t);
  const prepared = await prepareT3Delegation(input);
  assert.equal(prepared.tool, 'delegate_task');
  assert.equal(prepared.arguments.mode, 'async');
  assert.deepEqual(prepared.arguments.target, second);
  for (const content of [input.task, input.originalBrief, contracts.roles.reviewer.instructions, contracts.roles.reviewer.description, input.bundleRoot, path.join(input.bundleRoot, 'skills'), 'read_only']) assert.equal(prepared.arguments.task.includes(content), true, content);
  assert.equal(prepared.audit.identity.entry, 2);
  assert.deepEqual(prepared.audit.options.fast, { source: 'explicit', requested: true, verified: false });
  const firstPrepared = await prepareT3Delegation({ ...input, entry: 1 });
  assert.equal(firstPrepared.arguments.target.options['switch-id'], false);
  assert.deepEqual(firstPrepared.audit.options['budget-id'], { source: 'inherited-or-unpinned', verified: false });
  assert.notEqual(firstPrepared.arguments.clientRequestId, prepared.arguments.clientRequestId);
});

test('preparation consumes the active project selection without an explicit resolution argument', async t => {
  const input = await delegationInput(t);
  const userRoot = await temporary(t);
  await mkdir(path.join(input.cwd, '.oh-my-stack/t3'), { recursive: true });
  await writeFile(path.join(input.cwd, '.oh-my-stack/t3/resolution.json'), JSON.stringify(input.resolution));
  const prepared = await prepareT3Delegation({ ...input, resolution: undefined, userRoot });
  assert.deepEqual(prepared.arguments.target, second);
  assert.equal(prepared.audit.identity.entry, 2);
});

test('fresh panels prepare two independent inherited requests and saved empty panels remain empty', async t => {
  const input = await delegationInput(t, { resolution: configuration() });
  const panel = await Promise.all([1, 2].map(entry => prepareT3Delegation({ ...input, entry })));
  assert.deepEqual(panel.map(request => request.audit.identity.entry), [1, 2]);
  assert.deepEqual(panel.map(request => request.audit.requested), [{ inheritParent: true }, { inheritParent: true }]);
  assert.notEqual(panel[0].arguments.clientRequestId, panel[1].arguments.clientRequestId);
  assert.equal(panel.every(request => request.tool === 'delegate_task' && !Object.hasOwn(request.arguments, 'target')), true);
  await assert.rejects(prepareT3Delegation({ ...input, entry: 3 }), /entry is unavailable/);
  const empty = configuration({ routes: { 'review.panel': [] } });
  assert.deepEqual(configureT3Resolution({ catalog, contracts, previous: empty, preset: empty.preset }), empty);
  await assert.rejects(prepareT3Delegation({ ...input, resolution: empty, entry: 1 }), /entry is unavailable/);
  const noConfig = { ...input, resolution: undefined, userRoot: input.bundleRoot };
  const missing = await Promise.all([1, 2].map(entry => prepareT3Delegation({ ...noConfig, entry })));
  assert.deepEqual(missing.map(request => request.audit.selection.scope), ['inherit-parent', 'inherit-parent']);
  assert.notEqual(missing[0].arguments.clientRequestId, missing[1].arguments.clientRequestId);
  const prepared = await prepareT3Delegation({ ...input, routeName: undefined, roleName: 'reviewer', entry: 1 });
  assert.equal(prepared.tool, 'delegate_task');
  assert.deepEqual(prepared.audit.requested, { inheritParent: true });
  assert.deepEqual(prepared.audit.options['switch-id'], { source: 'inherited-or-unpinned', verified: false });
  assert.equal(Object.hasOwn(prepared.arguments, 'target'), false);
  await assert.rejects(prepareT3Delegation({ ...input, entry: 0 }), /one-based/);
});

test('unknown inherited model defers selection to the host while explicit models remain validated', async t => {
  const unknown = { ...catalog, inheritedModel: null };
  const input = await delegationInput(t, { catalog: unknown, resolution: configureT3Resolution({ catalog: unknown, contracts }), routeName: undefined, roleName: 'reviewer', entry: 1 });
  const prepared = await prepareT3Delegation(input);
  assert.equal(Object.hasOwn(prepared.arguments, 'target'), false);
  assert.equal(prepared.audit.inheritedModelKnown, false);
  assert.deepEqual(prepared.audit.options, {});
  const explicit = await prepareT3Delegation({ ...input, resolution: configureT3Resolution({ catalog: unknown, contracts, overrides: { roles: { reviewer: first } } }) });
  assert.deepEqual(explicit.arguments.target, first);
});

test('queued tasks acquire a run identity once and retain it through completion', () => {
  const queued = observeT3Task({ observation: taskObservation({ status: 'queued', childRunId: null }) });
  const running = observeT3Task({ previous: queued, observation: taskObservation() });
  assert.equal(running.original.childRunId, 'run/original');
  const completed = observeT3Task({ previous: running, observation: taskObservation({ status: 'completed', workState: 'result_available', summary: 'Done.' }) });
  assert.equal(completed.originalComplete, true);
  assert.equal(completed.original.childRunId, 'run/original');
  for (const childRunId of [null, 'run/other']) assert.throws(() => observeT3Task({ previous: running, observation: taskObservation({ childRunId }) }), /Original childRunId changed/);
  const interrupted = observeT3Task({ previous: queued, observation: taskObservation({ childRunId: null, status: 'interrupted', workState: 'result_available' }) });
  assert.throws(() => observeT3Task({ previous: interrupted, observation: taskObservation() }), /Original childRunId changed/);
});

test('disabled providers, cross-provider restrictions and unadvertised runtime modes fail preparation', async t => {
  const input = await delegationInput(t);
  const disabled = { providerInstanceId: 'disabled:with-models', model: 'listed:model', options: {} };
  assert.throws(() => configuration({ routes: { 'review.panel': [disabled] } }), /cannot run child tasks/);
  const disabledResolution = configuration();
  disabledResolution.routes['review.panel'].entries = [disabled];
  await assert.rejects(prepareT3Delegation({ ...input, resolution: disabledResolution, entry: 1 }), /cannot run child tasks/);
  const restricted = structuredClone(catalog);
  restricted.providers[1].canRunCrossProviderChildTask = false;
  await assert.rejects(prepareT3Delegation({ ...input, catalog: restricted }), /cross-provider/);
  assert.equal((await prepareT3Delegation({ ...input, catalog: restricted, entry: 1 })).arguments.target.providerInstanceId, 'provider/person:one');
  await assert.rejects(prepareT3Delegation({ ...input, runtimeMode: 'full-access' }), /does not advertise/);
  assert.equal((await prepareT3Delegation({ ...input, runtimeMode: 'auto' })).arguments.runtimeMode, 'auto');
  const missingModes = structuredClone(catalog);
  delete missingModes.providers[0].runtimeModes;
  await assert.rejects(prepareT3Delegation({ ...input, catalog: missingModes, entry: 1, runtimeMode: 'full-access' }), /does not advertise/);
  await assert.rejects(prepareT3Delegation({ ...input, model: 'ignored-override' }), /Unsupported delegation input field/);
  await assert.rejects(prepareT3Delegation({ ...input, timeoutMs: 1000 }), /requires wait mode/);
  const wait = await prepareT3Delegation({ ...input, mode: 'wait', timeoutMs: 1000 });
  assert.equal(wait.arguments.mode, 'wait');
  assert.equal(wait.arguments.timeoutMs, 1000);
});

test('retries reuse exact requests and changed payloads fail; review rounds get fresh identities and prior findings', async t => {
  const input = await delegationInput(t);
  const firstRound = await prepareT3Delegation(input);
  assert.deepEqual(await prepareT3Delegation({ ...input, priorPreparedRequest: firstRound }), firstRound);
  await assert.rejects(prepareT3Delegation({ ...input, task: 'Changed payload.', priorPreparedRequest: firstRound }), /Retry identity or payload/);
  const secondRound = await prepareT3Delegation({ ...input, round: 2, priorRound: { round: 1, findings: ['Missing guard.'], responses: ['Guard added.'], unresolvedObjections: ['Check race behavior.'] } });
  assert.notEqual(secondRound.arguments.clientRequestId, firstRound.arguments.clientRequestId);
  for (const content of [input.originalBrief, 'Missing guard.', 'Guard added.', 'Check race behavior.']) assert.equal(secondRound.arguments.task.includes(content), true);
  await assert.rejects(prepareT3Delegation({ ...input, originalBrief: undefined, round: 2, priorRound: {} }), /originalBrief/);
  await assert.rejects(prepareT3Delegation({ ...input, round: 2, priorRound: { round: 1, findings: [], responses: [] } }), /unresolvedObjections/);
});

test('wait timeout and nested work remain live while original completion and later runs stay separate', () => {
  const timedOut = observeT3Task({ observation: taskObservation({ waitTimedOut: true, status: 'waiting', workState: 'waiting_for_children' }) });
  assert.equal(timedOut.taskId, 'task/one');
  assert.equal(timedOut.originalComplete, false);
  assert.equal(timedOut.original.status, 'waiting');
  assert.equal(timedOut.waitTimedOut, true);
  const completed = observeT3Task({ previous: timedOut, observation: taskObservation({ status: 'completed', summary: 'Original result.', resultContextTransferId: 'transfer/one', workState: 'result_available', hasPendingChildRuns: true }) });
  assert.equal(completed.originalComplete, true);
  assert.deepEqual(completed.original, { childRunId: 'run/original', status: 'completed', summary: 'Original result.', resultContextTransferId: 'transfer/one' });
  assert.equal(completed.hasPendingChildRuns, true);
  const later = observeT3Task({ previous: completed, observation: taskObservation({ status: 'completed', summary: 'Original result.', workState: 'result_available', latestTerminalRunId: 'run/tail', latestTerminalStatus: 'failed', latestTerminalSummary: 'Later result.', latestTerminalResultContextTransferId: 'transfer/tail' }) });
  assert.equal(later.original.summary, 'Original result.');
  assert.deepEqual(later.latestTerminal, { runId: 'run/tail', status: 'failed', summary: 'Later result.', resultContextTransferId: 'transfer/tail' });
  assert.equal(later.requestedOptionsVerified, false);
  assert.throws(() => observeT3Task({ previous: completed, observation: taskObservation({ taskId: 'other-task' }) }), /identity changed/);
  assert.throws(() => observeT3Task({ observation: taskObservation({ status: 'completed', workState: 'waiting_for_children' }) }), /result_available/);
  assert.equal(observeT3Task({ observation: taskObservation({ status: 'completed', workState: 'result_available', summary: '' }) }).original.summary, '');
});

test('cancellation prepares only the native request and does not establish cancellation', () => {
  assert.deepEqual(prepareT3Cancellation({ taskId: 'task/one', reason: 'User stopped work.', clientRequestId: 'cancel/one' }), {
    tool: 'task_cancel', arguments: { taskId: 'task/one', reason: 'User stopped work.', clientRequestId: 'cancel/one' }, audit: { cancellationObserved: false }
  });
  assert.throws(() => prepareT3Cancellation({ taskId: '' }), /taskId/);
  assert.throws(() => prepareT3Cancellation({ taskId: 'task/one', status: 'cancelled' }), /Unsupported/);
});

test('structured schedules retain real booleans and current-thread default without invented overrides', () => {
  assert.deepEqual(prepareT3Schedule({ prompt: 'Review triggers.', schedule: { type: 'interval', everyMs: 3600000 }, enabled: false }), {
    tool: 'schedule_task', arguments: { prompt: 'Review triggers.', schedule: { type: 'interval', everyMs: 3600000 }, bindToCurrentThread: true, enabled: false }, audit: { draft: true, created: false, destination: 'current-thread' }
  });
  assert.deepEqual(prepareT3Schedule({ prompt: 'Review.', projectId: 'same', currentProjectId: 'same', schedule: { type: 'fixed_time', timeOfDay: '09:00', weekdays: [1, 2, 3, 4, 5] } }).arguments.schedule, { type: 'fixed_time', timeOfDay: '09:00', weekdays: [1, 2, 3, 4, 5] });
  const webhook = { type: 'webhook', signature: { encoding: 'hex', header: 'x-hub-signature-256', prefix: 'sha256=', secretRef: 'private/ref' } };
  assert.deepEqual(prepareT3Schedule({ prompt: 'Handle {{body.action}}.', schedule: webhook }).arguments.schedule, webhook);
  const elsewhere = prepareT3Schedule({ prompt: 'Review.', schedule: { type: 'webhook' }, projectId: 'other', currentProjectId: 'same', freshThreadIntent: true });
  assert.equal(elsewhere.arguments.bindToCurrentThread, false);
  assert.equal(elsewhere.audit.destination, 'fresh-thread');
});

test('malformed schedules and unauthorized destinations fail closed', () => {
  const base = { prompt: 'Review.', schedule: { type: 'webhook' } };
  for (const changes of [
    { schedule: JSON.stringify(base.schedule) }, { enabled: 'false' }, { bindToCurrentThread: 'false' },
    { bindToCurrentThread: false }, { projectId: 'other' },
    { projectId: 'other', currentProjectId: 'same', bindToCurrentThread: true },
    { projectId: 'other', currentProjectId: 'same' }, { model: 'invented' },
    { schedule: { type: 'interval', everyMs: -1 } },
    { schedule: { type: 'fixed_time', timeOfDay: '24:00' } },
    { schedule: { type: 'fixed_time', timeOfDay: '09:00', weekdays: [1, 1] } },
    { schedule: { type: 'webhook', signature: { encoding: 'hex', header: 'sig', prefix: '', secret: 'inline-secret' } } }
  ]) assert.throws(() => prepareT3Schedule({ ...base, ...changes }));
});

test('CLI accepts file-shaped inputs, emits reviewable JSON and confines detached output', async t => {
  const directory = await temporary(t);
  const input = path.join(directory, 'input.json');
  const output = path.join(directory, 'resolution.json');
  await writeFile(input, JSON.stringify({ catalog, contracts, preset: 'cli-test', overrides: { roles: { implementer: first } } }));
  const command = path.join(root, 'tools/t3-orchestration.mjs');
  const configured = spawnSync(process.execPath, [command, 'configure', '--input', input, '--output', output], { encoding: 'utf8' });
  assert.equal(configured.status, 0, configured.stderr);
  assert.deepEqual(JSON.parse(await readFile(output, 'utf8')).roles.implementer, first);
  await assert.rejects(readFile(path.join(directory, '.oh-my-stack/t3/resolution.json')), { code: 'ENOENT' });
  await writeFile(input, JSON.stringify({ taskId: 'task/cli' }));
  const cancelled = spawnSync(process.execPath, [command, 'cancel', '--input', input], { encoding: 'utf8' });
  assert.equal(cancelled.status, 0);
  assert.deepEqual(JSON.parse(cancelled.stdout), { tool: 'task_cancel', arguments: { taskId: 'task/cli' }, audit: { cancellationObserved: false } });
  const rejected = spawnSync(process.execPath, [command, 'cancel', '--input', input, '--apply'], { encoding: 'utf8' });
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /Invalid or repeated CLI option/);
  const prepareInput = await delegationInput(t);
  for (const [operation, value, check] of [
    ['catalog', catalog, result => assert.equal(result.providers[0].providerInstanceId, 'provider/person:one')],
    ['prepare', prepareInput, result => assert.deepEqual(result.arguments.target, second)],
    ['observe', { observation: taskObservation({ waitTimedOut: true }) }, result => assert.equal(result.waitTimedOut, true)],
    ['schedule', { prompt: 'Review triggers.', schedule: { type: 'webhook' } }, result => assert.deepEqual(result.arguments, { prompt: 'Review triggers.', schedule: { type: 'webhook' }, bindToCurrentThread: true })],
    ['resolve', { cwd: directory, userRoot: path.join(directory, 'user') }, result => assert.equal(result.scope, 'inherit-parent')]
  ]) {
    await writeFile(input, JSON.stringify(value));
    const executed = spawnSync(process.execPath, [command, operation, '--input', input], { encoding: 'utf8' });
    assert.equal(executed.status, 0, executed.stderr);
    check(JSON.parse(executed.stdout));
  }
  const originalOutput = await readFile(output, 'utf8');
  await writeFile(input, JSON.stringify(catalog));
  const overwrite = spawnSync(process.execPath, [command, 'catalog', '--input', input, '--output', output], { encoding: 'utf8' });
  assert.equal(overwrite.status, 1);
  assert.match(overwrite.stderr, /EEXIST/);
  assert.equal(await readFile(output, 'utf8'), originalOutput);
});

function familyFixture() {
  const target = (providerInstanceId, model) => ({ providerInstanceId, model, options: {} });
  const gpt = target('codex', 'gpt-6.1-sol');
  const opus = target('cursor', 'claude-opus-5-5');
  const grok = target('cursor', 'grok-4.7');
  const otherOpus = target('claudeAgent', opus.model);
  const live = {
    parentThreadId: 'family-thread', inheritedProviderInstanceId: 'codex', inheritedModel: gpt.model,
    providers: [
      { providerInstanceId: 'codex', models: [{ id: gpt.model, options: [] }], canRunChildTask: true, canRunCrossProviderChildTask: true },
      { providerInstanceId: 'cursor', models: [{ id: opus.model, options: [] }, { id: grok.model, options: [] }], canRunChildTask: true, canRunCrossProviderChildTask: true },
      { providerInstanceId: 'claudeAgent', models: [{ id: opus.model, options: [] }], canRunChildTask: true, canRunCrossProviderChildTask: true }
    ]
  };
  const roleContracts = structuredClone(contracts);
  roleContracts.roles['trail-reviewer'] = { ...roleContracts.roles.reviewer };
  return { live, roleContracts, gpt, opus, grok, otherOpus };
}

async function familyInput(t, fixture, overrides) {
  const input = await delegationInput(t);
  await writeFile(path.join(input.bundleRoot, 'config/t3-role-contracts.json'), JSON.stringify(fixture.roleContracts));
  return {
    ...input, catalog: fixture.live, routeName: undefined, roleName: 'trail-reviewer', entry: 1,
    resolution: configureT3Resolution({ catalog: fixture.live, contracts: fixture.roleContracts, overrides })
  };
}

test('trail selection skips the author family and unavailable candidates in configured order', async t => {
  const fixture = familyFixture();
  const input = await familyInput(t, fixture, { roles: { 'trail-reviewer': fixture.gpt }, selectionPolicy: {
    roleCandidates: { 'trail-reviewer': [fixture.otherOpus, fixture.grok, fixture.opus] }
  } });
  input.catalog.providers[2].canRunChildTask = false;
  const prepared = await prepareT3Delegation(input);
  assert.deepEqual(prepared.arguments.target, fixture.grok);
  assert.equal(prepared.audit.selection.reason, 'ordered-cross-family-candidate');
  assert.deepEqual(prepared.audit.selection.configuredTarget, fixture.gpt);
  assert.equal(prepared.audit.selection.reviewedFamily, 'gpt');
  assert.equal(prepared.audit.selection.selectedFamily, 'grok');
  assert.deepEqual(prepared.audit.selection.skipped.map(value => value.target), [fixture.gpt, fixture.otherOpus]);
  assert.match(prepared.audit.selection.skipped[1].reason, /cannot run child/);
  assert.equal(prepared.audit.observed, false);
});

test('required trail review blocks same-family and unknown-family selection, including inherited roles', async t => {
  const fixture = familyFixture();
  const input = await familyInput(t, fixture, {});
  await assert.rejects(prepareT3Delegation(input), /BLOCKED: independent review.*Same family/);
  await assert.rejects(prepareT3Delegation({ ...input, reviewedModel: 'opaque/unknown-model' }), /reviewed model family is unknown/);
  const unknownParent = { ...input.catalog, inheritedModel: null };
  await assert.rejects(prepareT3Delegation({ ...input, catalog: unknownParent }), /reviewed model family is unknown/);
  const crossFamily = await familyInput(t, fixture, { roles: { 'trail-reviewer': fixture.opus } });
  await assert.rejects(prepareT3Delegation({ ...crossFamily, reviewedModel: 'claude-sonnet-5-5' }), /Same family/);
});

test('a rejected provider can use an explicitly allowed same-family channel without enabling it', async t => {
  const fixture = familyFixture();
  const input = await familyInput(t, fixture, { roles: { 'trail-reviewer': fixture.otherOpus }, selectionPolicy: { fallbackTargets: [fixture.opus, fixture.grok] } });
  input.catalog.providers[2].canRunChildTask = false;
  const prepared = await prepareT3Delegation(input);
  assert.deepEqual(prepared.arguments.target, fixture.opus);
  assert.equal(prepared.audit.selection.reason, 'same-family-fallback');
  assert.equal(input.catalog.providers[2].canRunChildTask, false);
  const noFallback = structuredClone(input);
  noFallback.resolution.selectionPolicy.fallbackTargets = [fixture.grok];
  await assert.rejects(prepareT3Delegation(noFallback), /BLOCKED: independent review/);
  const ordinary = { ...noFallback, roleName: 'reviewer' };
  ordinary.resolution.roles.reviewer = fixture.otherOpus;
  await assert.rejects(prepareT3Delegation(ordinary), /BLOCKED: configured target/);
});

test('family validation distinguishes models across channels and validates runnable panel families', async t => {
  const fixture = familyFixture();
  const base = { catalog: fixture.live, contracts: fixture.roleContracts };
  const selectionPolicy = { minimumPanelFamilies: { 'review.panel': 2 } };
  assert.equal(t3ModelFamily('openrouter/anthropic/claude-opus-5-5'), 'claude');
  assert.equal(t3ModelFamily('opaque/model'), null);
  assert.equal(t3ModelFamily('opaque/model', { 'opaque/model': 'private-family' }), 'private-family');
  assert.throws(() => t3ModelFamily(fixture.gpt.model, { [fixture.gpt.model]: 'claude' }), /contradicts/);
  assert.throws(() => configureT3Resolution({ ...base, overrides: { routes: { 'review.panel': [fixture.opus, fixture.otherOpus] }, selectionPolicy } }), /needs 2 model families/);
  assert.throws(() => configureT3Resolution({ ...base, overrides: { routes: { 'review.panel': [fixture.opus, { inheritParent: true }] }, selectionPolicy } }), /inherit-parent does not count/);
  const resolution = configureT3Resolution({ ...base, overrides: { routes: { 'review.panel': [fixture.opus, fixture.gpt] }, selectionPolicy } });
  const input = await familyInput(t, fixture, {});
  const panel = { ...input, resolution, roleName: undefined, routeName: 'review.panel' };
  assert.deepEqual((await prepareT3Delegation(panel)).arguments.target, fixture.opus);
  panel.catalog.providers[0].canRunChildTask = false;
  await assert.rejects(prepareT3Delegation(panel), /BLOCKED: configured target/);
});

test('selection policy survives refresh, rejects unknown fields and cannot accept disabled targets', () => {
  const fixture = familyFixture();
  const args = { catalog: fixture.live, contracts: fixture.roleContracts, preset: 'cross-family' };
  const selectionPolicy = { roleCandidates: { 'trail-reviewer': [fixture.opus, fixture.grok] } };
  const previous = configureT3Resolution({ ...args, overrides: { selectionPolicy } });
  assert.deepEqual(configureT3Resolution({ ...args, previous }).selectionPolicy, selectionPolicy);
  for (const policy of [
    { roleCandidates: { invalid: [fixture.opus] } },
    { roleCandidates: { 'trail-reviewer': [{ inheritParent: true }] } },
    { fallbackTargets: [fixture.opus, fixture.opus] },
    { minimumPanelFamilies: { 'code.unit': 2 } },
    { allowedModelOverride: true }
  ]) assert.throws(() => configureT3Resolution({ ...args, overrides: { selectionPolicy: policy } }));
  fixture.live.providers[1].canRunCrossProviderChildTask = false;
  assert.throws(() => configureT3Resolution({ ...args, overrides: { selectionPolicy } }), /cross-provider/);
});

test('observed results retain requested selection, expose mismatches and leave effective options unverified', async t => {
  const fixture = familyFixture();
  const input = await familyInput(t, fixture, { roles: { 'trail-reviewer': fixture.opus } });
  const prepared = await prepareT3Delegation(input);
  const observation = taskObservation({ providerInstanceId: fixture.opus.providerInstanceId, model: fixture.opus.model });
  const observed = observeT3Task({ prepared, observation });
  assert.equal(observed.targetMatchesRequest, true);
  assert.deepEqual(observed.selection, prepared.audit.selection);
  assert.equal(observed.requestedOptionsVerified, false);
  const different = observeT3Task({ prepared, observation: { ...observation, model: fixture.grok.model } });
  assert.equal(different.targetMatchesRequest, false);
  assert.deepEqual(different.reportedTarget, { providerInstanceId: 'cursor', model: fixture.grok.model });
  const next = observeT3Task({ previous: observed, observation: { ...observation, status: 'completed', workState: 'result_available' } });
  assert.deepEqual(next.requestedTarget, fixture.opus);
  const changed = structuredClone(prepared);
  changed.arguments.target = fixture.grok;
  assert.throws(() => observeT3Task({ prepared: changed, observation }), /Invalid prepared request/);
});

test('saved cross-family retries cannot silently switch target after catalog changes', async t => {
  const fixture = familyFixture();
  const input = await familyInput(t, fixture, { roles: { 'trail-reviewer': fixture.otherOpus }, selectionPolicy: { roleCandidates: { 'trail-reviewer': [fixture.grok] } } });
  const prepared = await prepareT3Delegation(input);
  input.catalog.providers[2].canRunChildTask = false;
  await assert.rejects(prepareT3Delegation({ ...input, priorPreparedRequest: prepared }), /Retry identity or payload/);
  input.catalog.providers[2].canRunChildTask = true;
  assert.deepEqual(await prepareT3Delegation({ ...input, priorPreparedRequest: prepared }), prepared);
});

test('panel preparation checks inherited seats before dispatching explicit family seats', async t => {
  const fixture = familyFixture();
  const input = await familyInput(t, fixture, { routes: { 'review.panel': [fixture.opus, fixture.grok, { inheritParent: true }] }, selectionPolicy: { minimumPanelFamilies: { 'review.panel': 2 } } });
  const panel = { ...input, roleName: undefined, routeName: 'review.panel' };
  assert.deepEqual((await prepareT3Delegation(panel)).arguments.target, fixture.opus);
  panel.catalog.providers[0].canRunChildTask = false;
  for (const entry of [1, 2, 3]) await assert.rejects(prepareT3Delegation({ ...panel, entry }), /Provider codex cannot run child tasks/);
});

function modelFallbackFixture(strategy = 'interrogate') {
  const fixture = familyFixture();
  for (const name of ['interrogate.reviewers', 'arena.runners', 'architect.runners']) {
    fixture.roleContracts.routes[name] = { kind: 'panel', role: 'reviewer', defaultCount: 2 };
  }
  const target = (model, options = {}) => ({ providerInstanceId: 'cursor', model, options });
  const effort = id => ({ id, type: 'select', options: ['low', 'high', 'xhigh'].map(id => ({ id })) });
  const bool = { id: 'fast', type: 'boolean' };
  fixture.configured = target('claude-opus-old', { effort: 'xhigh', fast: false });
  fixture.tableDefault = target('claude-opus-default', { effort: 'xhigh', fast: false });
  fixture.nearest = target('claude-opus-default-2', { reasoningEffort: 'xhigh', fast: false });
  fixture.crossFamily = target('grok-4.7', { reasoningEffort: 'xhigh', fast: false });
  fixture.live.providers[1].runtimeModes = ['auto'];
  fixture.live.providers[1].models = [
    { id: fixture.configured.model, options: [effort('effort'), bool] },
    { id: fixture.tableDefault.model, options: [effort('effort'), bool] },
    { id: fixture.nearest.model, options: [effort('reasoningEffort'), bool] },
    { id: 'claude-sonnet-far-away', options: [effort('reasoningEffort'), bool] },
    { id: fixture.crossFamily.model, options: [effort('reasoningEffort'), bool] }
  ];
  fixture.routeName = strategy === 'interrogate' ? 'interrogate.reviewers' : 'arena.runners';
  fixture.policy = { modelFallbacks: { [fixture.routeName]: {
    strategy, familyDefaults: { claude: fixture.tableDefault }, unknownFamilyDefault: fixture.tableDefault
  } } };
  fixture.rejection = (target, validModelIds = []) => ({ target, code: 'model-rejected', rawError: `Rejected model ${target.model}`, validModelIds });
  return fixture;
}

async function modelFallbackInput(t, fixture = modelFallbackFixture()) {
  const input = await familyInput(t, fixture, {
    routes: { [fixture.routeName]: [fixture.configured, fixture.configured] }, selectionPolicy: fixture.policy
  });
  return { ...input, roleName: undefined, routeName: fixture.routeName };
}

test('model rejection tries the configured seat before its table default and audits actual evidence', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  const configured = await prepareT3Delegation({ ...input, modelRejections: [] });
  assert.deepEqual(configured.arguments.target, fixture.configured);
  const evidence = [fixture.rejection(fixture.configured, [fixture.nearest.model])];
  const prepared = await prepareT3Delegation({ ...input, stepId: 'default-attempt', modelRejections: evidence });
  assert.deepEqual(prepared.arguments.target, fixture.tableDefault);
  assert.equal(prepared.audit.selection.reason, 'model-family-default');
  assert.deepEqual(prepared.audit.selection.modelRejections, evidence);
  assert.deepEqual(prepared.audit.selection.configuredTarget, fixture.configured);
  assert.deepEqual(prepared.audit.selection.selectedTarget, fixture.tableDefault);
  assert.equal(prepared.audit.selection.selectedFamily, 'claude');
  assert.deepEqual(prepared.audit.selection.optionChanges, []);
});

test('same-preset refresh preserves stale saved provider, model, options, policy and ordered seats', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  const stale = structuredClone(fixture.live);
  stale.providers[1].canRunChildTask = false;
  stale.providers[1].models = [];
  const refreshed = configureT3Resolution({ catalog: stale, contracts: fixture.roleContracts, preset: input.resolution.preset, previous: input.resolution });
  assert.deepEqual(refreshed, input.resolution);
  await assert.rejects(prepareT3Delegation({ ...input, catalog: stale, resolution: refreshed }), /cannot run child/);
  assert.throws(() => configureT3Resolution({ catalog: stale, contracts: fixture.roleContracts, preset: input.resolution.preset, previous: input.resolution, overrides: { routes: { [fixture.routeName]: [fixture.configured] } } }), /unavailable/);
});

test('only a rejected table default can select an observed equivalent with advertised effort options', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  const valid = ['claude-sonnet-far-away', fixture.crossFamily.model, 'claude-opus-default-1', fixture.nearest.model];
  const evidence = [fixture.rejection(fixture.configured, [fixture.crossFamily.model]), fixture.rejection(fixture.tableDefault, valid)];
  const prepared = await prepareT3Delegation({ ...input, modelRejections: evidence });
  assert.deepEqual(prepared.arguments.target, fixture.nearest);
  assert.equal(prepared.audit.selection.reason, 'model-valid-equivalent');
  assert.deepEqual(prepared.audit.selection.familyDefault, fixture.tableDefault);
  assert.deepEqual(prepared.audit.selection.optionChanges, [{ option: 'effort', change: 'translated', toOption: 'reasoningEffort', value: 'xhigh' }]);
  assert.equal(prepared.audit.options.fast.requested, false);
  const observed = observeT3Task({ prepared, observation: taskObservation({ providerInstanceId: 'cursor', model: fixture.nearest.model }) });
  assert.equal(observed.targetMatchesRequest, true);
  assert.deepEqual(observed.selection.modelRejections, evidence);
  assert.deepEqual(observed.requestedTarget, fixture.nearest);
  assert.equal(observed.requestedOptionsVerified, false);
  const removed = structuredClone(input.catalog);
  removed.providers[1].models = removed.providers[1].models.filter(model => ![fixture.configured.model, fixture.tableDefault.model].includes(model.id));
  assert.deepEqual((await prepareT3Delegation({ ...input, catalog: removed, modelRejections: evidence })).arguments.target, fixture.nearest);
  await assert.rejects(prepareT3Delegation({ ...input, catalog: removed, modelRejections: [evidence[0]] }), /unavailable/);
  await assert.rejects(prepareT3Delegation({ ...input, catalog: removed }), /unavailable/);
});

test('interrogate allows an observed cross-family equivalent while arena and architect stay in the default family', async t => {
  for (const routeName of ['interrogate.reviewers', 'arena.runners', 'architect.runners']) {
    const fixture = modelFallbackFixture(routeName === 'interrogate.reviewers' ? 'interrogate' : 'arena');
    fixture.policy.modelFallbacks[routeName] = fixture.policy.modelFallbacks[fixture.routeName];
    if (routeName !== fixture.routeName) delete fixture.policy.modelFallbacks[fixture.routeName];
    fixture.routeName = routeName;
    const input = await modelFallbackInput(t, fixture);
    const evidence = [fixture.rejection(fixture.configured), fixture.rejection(fixture.tableDefault, [fixture.crossFamily.model, 'unadvertised/model'])];
    if (routeName === 'interrogate.reviewers') {
      const prepared = await prepareT3Delegation({ ...input, modelRejections: evidence });
      assert.deepEqual(prepared.arguments.target, fixture.crossFamily);
      assert.equal(prepared.audit.selection.selectedFamily, 'grok');
      assert.equal(prepared.audit.selection.configuredFamily, 'claude');
    } else {
      await assert.rejects(prepareT3Delegation({ ...input, modelRejections: evidence }), /no observed valid equivalent/);
      evidence[1].validModelIds.push(fixture.nearest.model);
      assert.deepEqual((await prepareT3Delegation({ ...input, modelRejections: evidence })).arguments.target, fixture.nearest);
    }
  }
});

test('compatible effort outranks identifier distance and equivalent ties have deterministic model order', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  const provider = input.catalog.providers[1];
  provider.models.push(
    { id: 'claude-opus-default-0', options: [{ id: 'effort', type: 'select', options: [{ id: 'low' }] }] },
    { ...structuredClone(provider.models[2]), id: 'claude-opus-default-3' }
  );
  const evidence = [fixture.rejection(fixture.configured), fixture.rejection(fixture.tableDefault, ['claude-opus-default-3', 'claude-opus-default-0', fixture.nearest.model])];
  const selected = await prepareT3Delegation({ ...input, modelRejections: evidence });
  assert.deepEqual(selected.arguments.target, fixture.nearest);
  provider.models.reverse();
  assert.deepEqual((await prepareT3Delegation({ ...input, modelRejections: evidence })).arguments.target, fixture.nearest);
});

test('provider, options and runtime failures do not trigger model fallback or provider migration', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  const modelRejections = [fixture.rejection(fixture.configured)];
  for (const changes of [{ canRunChildTask: false }, { canRunCrossProviderChildTask: false }]) {
    const disabled = structuredClone(input.catalog);
    Object.assign(disabled.providers[1], changes);
    for (const evidence of [undefined, modelRejections]) await assert.rejects(prepareT3Delegation({ ...input, catalog: disabled, modelRejections: evidence }), /cannot run/);
    assert.equal(disabled.providers[1].canRunChildTask, changes.canRunChildTask ?? true);
  }
  for (const evidence of [undefined, modelRejections]) {
    await assert.rejects(prepareT3Delegation({ ...input, runtimeMode: 'full-access', modelRejections: evidence }), /does not advertise/);
    const invalidOptions = structuredClone(input);
    invalidOptions.resolution.routes[fixture.routeName].entries[0].options.fast = 'false';
    const invalidEvidence = evidence && [fixture.rejection(invalidOptions.resolution.routes[fixture.routeName].entries[0])];
    await assert.rejects(prepareT3Delegation({ ...invalidOptions, modelRejections: invalidEvidence }), /Unsupported value/);
  }
  const moved = structuredClone(input);
  moved.resolution.selectionPolicy.modelFallbacks[fixture.routeName].familyDefaults.claude.providerInstanceId = 'codex';
  await assert.rejects(prepareT3Delegation({ ...moved, modelRejections }), /preserve.*provider/);
});

test('rejection evidence is scoped to the selected target, original provider and eligible route', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  const rejection = fixture.rejection(fixture.configured);
  for (const modelRejections of [
    [{ ...rejection, code: 'provider-unavailable' }],
    [{ ...rejection, rawError: ' ' }],
    [{ ...rejection, validModelIds: [false] }],
    [{ ...rejection, target: { ...fixture.configured, providerInstanceId: 'codex' } }],
    [fixture.rejection(fixture.nearest)],
    [fixture.rejection(fixture.tableDefault)],
    [rejection, rejection],
    [{ ...rejection, invented: true }]
  ]) await assert.rejects(prepareT3Delegation({ ...input, modelRejections }));
  const otherRoute = { ...input, routeName: 'review.panel' };
  otherRoute.resolution.routes['review.panel'].entries = [fixture.configured];
  await assert.rejects(prepareT3Delegation({ ...otherRoute, modelRejections: [rejection] }), /not configured/);
  assert.deepEqual((await prepareT3Delegation({ ...otherRoute, modelRejections: [] })).arguments.target, fixture.configured);
  for (const [routeName, strategy] of [['review.panel', 'interrogate'], ['interrogate.reviewers', 'arena'], ['arena.runners', 'interrogate']]) {
    assert.throws(() => configureT3Resolution({ catalog: fixture.live, contracts: fixture.roleContracts, overrides: { selectionPolicy: { modelFallbacks: { [routeName]: { ...fixture.policy.modelFallbacks[fixture.routeName], strategy } } } } }), /fallback route|fallback strategy/);
  }
});

test('inherited aliases are exempt from rejected-slug fallback and same-family seats need no default diversity gate', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  for (const entry of [1, 2]) assert.deepEqual((await prepareT3Delegation({ ...input, entry })).arguments.target, fixture.configured);
  input.resolution.routes[fixture.routeName].entries = [{ inheritParent: true }, { inheritParent: true }];
  const inherited = await prepareT3Delegation({ ...input, modelRejections: [] });
  assert.deepEqual(inherited.audit.requested, { inheritParent: true });
  assert.equal(Object.hasOwn(inherited.arguments, 'target'), false);
  await assert.rejects(prepareT3Delegation({ ...input, modelRejections: [fixture.rejection({ inheritParent: true })] }), /Inherited aliases/);
  for (const model of ['auto', 'inherit-parent']) {
    const alias = { ...fixture.configured, model };
    input.resolution.routes[fixture.routeName].entries = [alias];
    await assert.rejects(prepareT3Delegation({ ...input, modelRejections: [fixture.rejection(alias)] }), /Inherited aliases/);
  }
});

test('replacement options disclose dropped values and unpinned advertised options without inventing keys', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  input.catalog.providers[1].models.push({ id: 'claude-minimal', options: [{ id: 'fast', type: 'boolean' }, { id: 'new-switch', type: 'boolean' }] });
  const modelRejections = [fixture.rejection(fixture.configured), fixture.rejection(fixture.tableDefault, ['claude-minimal'])];
  const prepared = await prepareT3Delegation({ ...input, modelRejections });
  assert.deepEqual(prepared.arguments.target, { providerInstanceId: 'cursor', model: 'claude-minimal', options: { fast: false } });
  assert.deepEqual(prepared.audit.selection.optionChanges, [{ option: 'effort', change: 'dropped', value: 'xhigh' }, { option: 'new-switch', change: 'inherited-or-unpinned' }]);
  assert.deepEqual(prepared.audit.options['new-switch'], { source: 'inherited-or-unpinned', verified: false });
});

test('model substitution requires a fresh step identity while exact retries retain their saved audit', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  const original = await prepareT3Delegation(input);
  const modelRejections = [fixture.rejection(fixture.configured)];
  await assert.rejects(prepareT3Delegation({ ...input, modelRejections, priorPreparedRequest: original }), /Retry identity or payload/);
  const replacementInput = { ...input, modelRejections, stepId: 'new-default-step' };
  const replacement = await prepareT3Delegation(replacementInput);
  assert.notEqual(replacement.arguments.clientRequestId, original.arguments.clientRequestId);
  assert.deepEqual(await prepareT3Delegation({ ...replacementInput, priorPreparedRequest: replacement }), replacement);
  await assert.rejects(prepareT3Delegation({ ...replacementInput, task: 'Changed task.', priorPreparedRequest: replacement }), /Retry identity or payload/);
  await assert.rejects(prepareT3Delegation({ ...replacementInput, modelRejections: [], priorPreparedRequest: replacement }), /Retry identity or payload/);
});

test('unknown-family seats use the declared default and a rejected configured default goes straight to valid equivalents', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  const opaque = { ...fixture.configured, model: 'custom/opaque-old' };
  input.catalog.providers[1].models.push({ ...structuredClone(input.catalog.providers[1].models[0]), id: opaque.model });
  input.resolution.routes[fixture.routeName].entries[0] = opaque;
  assert.deepEqual((await prepareT3Delegation({ ...input, modelRejections: [fixture.rejection(opaque)] })).arguments.target, fixture.tableDefault);
  input.resolution.routes[fixture.routeName].entries[0] = fixture.tableDefault;
  const prepared = await prepareT3Delegation({ ...input, modelRejections: [fixture.rejection(fixture.tableDefault, [fixture.nearest.model])] });
  assert.deepEqual(prepared.arguments.target, fixture.nearest);
  assert.equal(prepared.audit.selection.reason, 'model-valid-equivalent');
});

test('known families require their own default while opaque families use the unknown default', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  const gpt = { ...fixture.configured, model: 'gpt-old' };
  const opaque = { ...fixture.configured, model: 'custom/opaque-old' };
  for (const target of [gpt, opaque]) input.catalog.providers[1].models.push({ ...structuredClone(input.catalog.providers[1].models[0]), id: target.model });
  input.resolution.routes[fixture.routeName].entries[0] = gpt;
  assert.deepEqual((await prepareT3Delegation(input)).arguments.target, gpt);
  await assert.rejects(prepareT3Delegation({ ...input, modelRejections: [fixture.rejection(gpt)] }), {
    message: 'Model fallback configuration is missing family default for gpt on interrogate.reviewers'
  });
  input.resolution.routes[fixture.routeName].entries[0] = opaque;
  assert.deepEqual((await prepareT3Delegation({ ...input, modelRejections: [fixture.rejection(opaque)] })).arguments.target, fixture.tableDefault);
});

test('an explicit family minimum blocks family-changing single seats and remains mandatory', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  input.resolution.selectionPolicy.minimumPanelFamilies = { [fixture.routeName]: 2 };
  const modelRejections = [fixture.rejection(fixture.configured), fixture.rejection(fixture.tableDefault, [fixture.crossFamily.model])];
  await assert.rejects(prepareT3Delegation({ ...input, modelRejections }), {
    message: 'BLOCKED: panel interrogate.reviewers has minimumPanelFamilies=2; family-changing single-seat preparation requires a complete effective-panel configuration'
  });
  assert.deepEqual(input.resolution.routes[fixture.routeName].entries, [fixture.configured, fixture.configured]);
  await assert.rejects(prepareT3Delegation({ ...input, modelRejections: [modelRejections[0]] }), /needs 2 model families/);
});

test('separate rejected claude and gpt seats cannot both collapse a two-family panel to grok', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  const claude = { ...fixture.configured, model: 'claude-old' };
  const gpt = { ...fixture.configured, model: 'gpt-old' };
  const grok = { ...fixture.crossFamily, model: 'grok-valid' };
  const provider = input.catalog.providers[1];
  provider.models.push(
    ...[claude, gpt].map(target => ({ ...structuredClone(provider.models[0]), id: target.model })),
    { ...structuredClone(provider.models[4]), id: grok.model }
  );
  input.resolution.routes[fixture.routeName].entries = [claude, gpt];
  input.resolution.selectionPolicy.modelFallbacks[fixture.routeName].familyDefaults = { claude, gpt };
  input.resolution.selectionPolicy.minimumPanelFamilies = { [fixture.routeName]: 2 };
  const replacements = [claude, gpt].map((target, index) => ({ ...input, entry: index + 1, modelRejections: [fixture.rejection(target, [grok.model])] }));
  const outcomes = await Promise.allSettled(replacements.map(prepareT3Delegation));
  assert.deepEqual(outcomes.map(outcome => ({ status: outcome.status, message: outcome.reason?.message })), [
    { status: 'rejected', message: 'BLOCKED: panel interrogate.reviewers has minimumPanelFamilies=2; family-changing single-seat preparation requires a complete effective-panel configuration' },
    { status: 'rejected', message: 'BLOCKED: panel interrogate.reviewers has minimumPanelFamilies=2; family-changing single-seat preparation requires a complete effective-panel configuration' }
  ]);
  for (const [index, target] of [claude, gpt].entries()) {
    assert.deepEqual((await prepareT3Delegation({ ...input, entry: index + 1 })).arguments.target, target);
    const unconstrained = structuredClone(replacements[index]);
    delete unconstrained.resolution.selectionPolicy.minimumPanelFamilies;
    assert.deepEqual((await prepareT3Delegation(unconstrained)).arguments.target, grok);
  }
  assert.deepEqual(input.resolution.routes[fixture.routeName].entries, [claude, gpt]);
});

test('same-family model and explicit channel fallbacks preserve a custom family minimum', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  input.resolution.routes[fixture.routeName].entries[1] = fixture.gpt;
  input.resolution.selectionPolicy.minimumPanelFamilies = { [fixture.routeName]: 2 };
  assert.deepEqual((await prepareT3Delegation({ ...input, modelRejections: [fixture.rejection(fixture.configured)] })).arguments.target, fixture.tableDefault);
  const modelRejections = [fixture.rejection(fixture.configured), fixture.rejection(fixture.tableDefault, [fixture.nearest.model])];
  assert.deepEqual((await prepareT3Delegation({ ...input, modelRejections })).arguments.target, fixture.nearest);
  input.resolution.selectionPolicy.fallbackTargets = [fixture.otherOpus, fixture.crossFamily];
  input.catalog.providers[1].canRunChildTask = false;
  assert.deepEqual((await prepareT3Delegation(input)).arguments.target, fixture.otherOpus);
  input.resolution.selectionPolicy.fallbackTargets = [fixture.crossFamily];
  await assert.rejects(prepareT3Delegation(input), /BLOCKED: configured target/);
});

test('unknown-to-known family fallback cannot prove an explicit panel family minimum', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  const opaque = { ...fixture.configured, model: 'custom/opaque-old' };
  input.catalog.providers[1].models.push({ ...structuredClone(input.catalog.providers[1].models[0]), id: opaque.model });
  input.resolution.routes[fixture.routeName].entries = [opaque, fixture.configured, fixture.gpt];
  input.resolution.selectionPolicy.minimumPanelFamilies = { [fixture.routeName]: 2 };
  assert.deepEqual((await prepareT3Delegation(input)).arguments.target, opaque);
  await assert.rejects(prepareT3Delegation({ ...input, modelRejections: [fixture.rejection(opaque)] }), {
    message: 'BLOCKED: panel interrogate.reviewers has minimumPanelFamilies=2; family-changing single-seat preparation requires a complete effective-panel configuration'
  });
  delete input.resolution.selectionPolicy.minimumPanelFamilies;
  assert.deepEqual((await prepareT3Delegation({ ...input, modelRejections: [fixture.rejection(opaque)] })).arguments.target, fixture.tableDefault);
});

test('saved unavailable options and provider identities survive refresh but new overrides remain strict', async t => {
  const previous = configuration({ routes: { 'review.panel': [second, first, second] } });
  const changedCatalog = structuredClone(catalog);
  changedCatalog.providers[0].models[0].options = [];
  const refreshed = configureT3Resolution({ catalog: changedCatalog, contracts, preset: previous.preset, previous });
  assert.deepEqual(refreshed, previous);
  const input = await delegationInput(t, { catalog: changedCatalog, resolution: refreshed, entry: 2 });
  await assert.rejects(prepareT3Delegation(input), /Unsupported option/);
  assert.throws(() => configureT3Resolution({ catalog: changedCatalog, contracts, preset: previous.preset, previous, overrides: { roles: { implementer: first } } }), /Unsupported option/);
  changedCatalog.providers = changedCatalog.providers.filter(provider => provider.providerInstanceId !== second.providerInstanceId);
  assert.deepEqual(configureT3Resolution({ catalog: changedCatalog, contracts, preset: previous.preset, previous }), previous);
  await assert.rejects(prepareT3Delegation({ ...input, catalog: changedCatalog, entry: 1 }), /cannot run child/);
});

test('observed route defaults work without manual policy and explicit policy remains authoritative', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  input.resolution = configureT3Resolution({ catalog: input.catalog, contracts: fixture.roleContracts,
    overrides: { routes: { [fixture.routeName]: [fixture.configured, fixture.configured] } } });
  assert.deepEqual(input.resolution.selectionPolicy.modelFallbacks[fixture.routeName].familyDefaults.claude, fixture.tableDefault);
  const prepared = await prepareT3Delegation({ ...input, modelRejections: [fixture.rejection(fixture.configured)] });
  assert.deepEqual(prepared.arguments.target, fixture.tableDefault);
  assert.equal(prepared.audit.selection.reason, 'model-family-default');
  delete input.resolution.selectionPolicy;
  assert.deepEqual(configureT3Resolution({ catalog: input.catalog, contracts: fixture.roleContracts,
    preset: input.resolution.preset, previous: input.resolution }), input.resolution);
  assert.deepEqual((await prepareT3Delegation({ ...input, modelRejections: [fixture.rejection(fixture.configured)] })).arguments.target, fixture.tableDefault);
  const policy = { fallbackTargets: [] };
  const explicit = configureT3Resolution({ catalog: input.catalog, contracts: fixture.roleContracts,
    overrides: { routes: { [fixture.routeName]: [fixture.configured] }, selectionPolicy: policy } });
  assert.deepEqual(explicit.selectionPolicy, policy);
  await assert.rejects(prepareT3Delegation({ ...input, resolution: explicit, modelRejections: [fixture.rejection(fixture.configured)] }), /not configured/);
  input.catalog.providers[1].canRunChildTask = false;
  await assert.rejects(prepareT3Delegation({ ...input, modelRejections: [fixture.rejection(fixture.configured)] }), /not configured|cannot run child/);
  assert.equal(input.catalog.providers[1].canRunChildTask, false);
});

test('derived host fallback stays on original provider and discloses an unavailable family', async t => {
  const fixture = modelFallbackFixture('arena');
  const input = await modelFallbackInput(t, fixture);
  delete input.resolution.selectionPolicy;
  input.catalog.providers[1].models = [{ id: 'gpt-6', options: [] }];
  const prepared = await prepareT3Delegation({ ...input, modelRejections: [fixture.rejection(fixture.configured)] });
  assert.deepEqual(prepared.arguments.target, { providerInstanceId: 'cursor', model: 'gpt-6', options: {} });
  assert.equal(prepared.audit.selection.reason, 'model-original-host-default');
  assert.equal(prepared.audit.selection.configuredFamily, 'claude');
  assert.equal(prepared.audit.selection.selectedFamily, 'gpt');
  const observed = observeT3Task({ prepared, observation: taskObservation({ providerInstanceId: 'cursor', model: 'gpt-6' }) });
  assert.equal(observed.targetMatchesRequest, true);
  assert.equal(observed.requestedOptionsVerified, false);
});

test('multiple original providers receive separate observed defaults without migrating a rejected seat', async t => {
  const fixture = modelFallbackFixture();
  const input = await modelFallbackInput(t, fixture);
  const other = { ...fixture.configured, providerInstanceId: 'other-cursor' };
  input.catalog.providers.push({ ...structuredClone(input.catalog.providers[1]), providerInstanceId: 'other-cursor' });
  input.resolution = configureT3Resolution({ catalog: input.catalog, contracts: fixture.roleContracts,
    overrides: { routes: { [fixture.routeName]: [fixture.configured, other] } } });
  const prepared = await prepareT3Delegation({ ...input, entry: 2, modelRejections: [fixture.rejection(other)] });
  assert.deepEqual(prepared.arguments.target, { ...fixture.tableDefault, providerInstanceId: 'other-cursor' });
  assert.equal(prepared.audit.selection.familyDefault.providerInstanceId, 'other-cursor');
  input.resolution.selectionPolicy.modelFallbacks[fixture.routeName].providerDefaults['other-cursor'].hostFallback.providerInstanceId = 'cursor';
  await assert.rejects(prepareT3Delegation(input), /preserve their provider/);
});

test('Cursor Grok prefixes have known family and custom contradictions fail', () => {
  assert.equal(t3ModelFamily('cursor-grok-4.7-xhigh-fast'), 'grok');
  assert.equal(t3ModelFamily('custom/composer-2'), 'grok');
  assert.throws(() => t3ModelFamily('composer-2', { 'composer-2': 'claude' }), /contradicts/);
  assert.equal(t3ModelFamily('opaque-model', { 'opaque-model': 'claude' }), 'claude');
});

function jobFixture() {
  const fixture = modelFallbackFixture();
  fixture.configured = { ...fixture.configured, model: 'claude-opus-current', options: { effort: 'xhigh', fast: true } };
  fixture.live.providers[1].models.push({ id: fixture.configured.model, options: [
    { id: 'effort', type: 'select', options: ['low', 'medium', 'high', 'xhigh', 'max'].map(id => ({ id })) },
    { id: 'fast', type: 'boolean' }
  ] });
  return fixture;
}

test('typed job profiles adjust effort and speed while preserving configured identity and options', async t => {
  const fixture = jobFixture();
  const input = await modelFallbackInput(t, fixture);
  for (const [kind, urgent, expected] of [
    ['routine', false, { effort: 'medium', fast: false }],
    ['judgment', true, { effort: 'high', fast: true }],
    ['hardest', false, { effort: 'max', fast: false }],
    ['verification', false, { effort: 'xhigh', fast: true }]
  ]) {
    const prepared = await prepareT3Delegation({ ...input, jobProfile: { kind, urgent }, stepId: kind });
    assert.deepEqual(prepared.arguments.target, { ...fixture.configured, options: expected });
    assert.deepEqual(prepared.audit.selection.configuredTarget, fixture.configured);
    assert.deepEqual(prepared.audit.selection.selectedTarget, prepared.arguments.target);
    assert.equal(prepared.audit.options.effort.verified, false);
  }
  assert.deepEqual((await prepareT3Delegation(input)).arguments.target, fixture.configured);
  assert.deepEqual(input.resolution.routes[fixture.routeName].entries[0], fixture.configured);
  for (const jobProfile of [{ kind: 'unknown' }, { kind: 'routine', urgent: 'true' }, { kind: 'routine', extra: true }]) {
    await assert.rejects(prepareT3Delegation({ ...input, jobProfile }), /jobProfile/);
  }
  const capped = structuredClone(input);
  capped.resolution.routes[fixture.routeName].entries[0].options.effort = 'max';
  assert.equal((await prepareT3Delegation({ ...capped, jobProfile: { kind: 'hardest' } })).arguments.target.options.effort, 'max');
});

test('advertised slug variants keep model identity and rejected adjustments retry the original line', async t => {
  const fixture = modelFallbackFixture();
  fixture.configured = { providerInstanceId: 'cursor', model: 'composer-2-xhigh-fast', options: {} };
  fixture.live.providers[1].models = ['composer-2-xhigh-fast', 'composer-2-high', 'composer-2-medium', 'composer-2-max-fast', 'composer-3-max'].map(id => ({ id, options: [] }));
  fixture.policy = {};
  const input = await modelFallbackInput(t, fixture);
  const adjusted = await prepareT3Delegation({ ...input, jobProfile: { kind: 'routine' } });
  assert.deepEqual(adjusted.arguments.target, { ...fixture.configured, model: 'composer-2-medium' });
  assert.equal(adjusted.audit.selection.reason, 'job-profile-adjustment');
  const rejected = [fixture.rejection(adjusted.arguments.target)];
  await assert.rejects(prepareT3Delegation({ ...input, jobProfile: { kind: 'routine' }, modelRejections: rejected, priorPreparedRequest: adjusted }), /Retry identity or payload/);
  const retried = await prepareT3Delegation({ ...input, stepId: 'original-line', jobProfile: { kind: 'routine' }, modelRejections: rejected });
  assert.deepEqual(retried.arguments.target, fixture.configured);
  assert.notEqual(retried.arguments.clientRequestId, adjusted.arguments.clientRequestId);
  assert.equal(retried.audit.selection.reason, 'job-profile-rejected-original-line');
  assert.deepEqual(retried.audit.selection.modelRejections, rejected);
  assert.deepEqual(retried.audit.selection.rejectedJobTarget, adjusted.arguments.target);
  const drifted = structuredClone(input);
  drifted.catalog.providers[1].models = drifted.catalog.providers[1].models.filter(model => model.id !== adjusted.arguments.target.model);
  const afterDrift = await prepareT3Delegation({ ...drifted, stepId: 'original-after-drift', jobProfile: { kind: 'routine' },
    modelRejections: rejected, rejectedPreparedRequest: adjusted });
  assert.deepEqual(afterDrift.arguments.target, fixture.configured);
  assert.deepEqual(afterDrift.audit.selection.rejectedJobTarget, adjusted.arguments.target);
  const tampered = structuredClone(adjusted);
  tampered.arguments.target.model = 'composer-3-max';
  await assert.rejects(prepareT3Delegation({ ...input, stepId: 'tampered', jobProfile: { kind: 'routine' }, modelRejections: rejected,
    rejectedPreparedRequest: tampered }), /Invalid rejected prepared/);
  assert.deepEqual((await prepareT3Delegation({ ...input, jobProfile: { kind: 'hardest', urgent: true } })).arguments.target, { ...fixture.configured, model: 'composer-2-max-fast' });
  assert.deepEqual((await prepareT3Delegation({ ...input, jobProfile: { kind: 'verification' } })).arguments.target, fixture.configured);
  const missing = await prepareT3Delegation({ ...input, jobProfile: { kind: 'hardest' } });
  assert.deepEqual(missing.arguments.target, { ...fixture.configured, model: 'composer-2-high' });
  assert.equal(missing.audit.selection.selectedFamily, 'grok');
});

test('typed adjustment rejection returns original options and aliases remain untouched', async t => {
  const fixture = jobFixture();
  const input = await modelFallbackInput(t, fixture);
  const adjusted = await prepareT3Delegation({ ...input, jobProfile: { kind: 'judgment' } });
  const retried = await prepareT3Delegation({ ...input, stepId: 'retry-original', jobProfile: { kind: 'judgment' }, modelRejections: [fixture.rejection(adjusted.arguments.target)] });
  assert.deepEqual(retried.arguments.target, fixture.configured);
  for (const alias of [{ inheritParent: true }, { ...fixture.configured, model: 'auto' }, { ...fixture.configured, model: 'inherit-parent' }]) {
    if (alias.model) input.catalog.providers[1].models.push({ id: alias.model, options: input.catalog.providers[1].models.at(-1).options });
    input.resolution.routes[fixture.routeName].entries = [alias];
    const prepared = await prepareT3Delegation({ ...input, jobProfile: { kind: 'routine', urgent: true } });
    assert.deepEqual(prepared.audit.requested, alias);
    if (alias.inheritParent) assert.equal(Object.hasOwn(prepared.arguments, 'target'), false);
    else assert.deepEqual(prepared.arguments.target, alias);
  }
});
