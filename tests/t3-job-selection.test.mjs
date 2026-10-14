import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { configureT3Resolution, prepareT3Delegation } from '../tools/t3-orchestration.mjs';

const contracts = {
  schemaVersion: 1, orchestration: 't3', host: 'codex',
  roles: { reviewer: { description: 'Review selection.', instructions: 'Report selection evidence.', writes: false, constraints: ['read_only'] } },
  routes: {
    'interrogate.reviewers': { kind: 'panel', role: 'reviewer', defaultCount: 2 },
    'review.panel': { kind: 'panel', role: 'reviewer', defaultCount: 2 }
  }
};
const select = (id, values) => ({ id, type: 'select', options: values.map(id => ({ id })) });
const target = (providerInstanceId, model, options = {}) => ({ providerInstanceId, model, options });
const rejection = target => ({ target, code: 'model-rejected', rawError: 'Host rejected the requested model.', validModelIds: [] });

function catalog(models, cursorModels = []) {
  return {
    parentThreadId: 'thread/selection', inheritedProviderInstanceId: 'codex', inheritedModel: models[0].id,
    providers: [
      { providerInstanceId: 'codex', canRunChildTask: true, canRunCrossProviderChildTask: true, models },
      { providerInstanceId: 'cursor', canRunChildTask: true, canRunCrossProviderChildTask: true, models: cursorModels }
    ]
  };
}

async function input(t, live, configured, selectionPolicy) {
  const bundleRoot = await mkdtemp(path.join(os.tmpdir(), 'oms-t3-job-'));
  t.after(() => rm(bundleRoot, { recursive: true, force: true }));
  await mkdir(path.join(bundleRoot, 'config'));
  await writeFile(path.join(bundleRoot, 'config/t3-role-contracts.json'), JSON.stringify(contracts));
  return {
    bundleRoot, cwd: bundleRoot, catalog: live,
    resolution: configureT3Resolution({ catalog: live, contracts, preset: 'saved-selection', overrides: {
      routes: { 'interrogate.reviewers': [configured] }, ...(selectionPolicy === undefined ? {} : { selectionPolicy })
    } }),
    routeName: 'interrogate.reviewers', task: 'Review the bounded selection.', ownedPaths: [], runId: 'selection-run', stepId: 'job'
  };
}

for (const [provider, model, speed, fast, standard] of [
  ['codex', 'gpt-6.1-sol', select('serviceTier', ['default', 'priority']), 'priority', 'default'],
  ['cursor', 'claude-opus-current', { id: 'fastMode', type: 'boolean' }, true, false],
  ['codex', 'gpt-6.1-sol', { id: 'fast', type: 'boolean' }, true, false],
  ['cursor', 'claude-opus-current', select('speed', ['standard', 'fast']), 'fast', 'standard']
]) {
  test(`${speed.id} uses advertised standard and urgent values and preserves verification`, async t => {
    const modelEntry = { id: model, options: [select('reasoningEffort', ['low', 'medium', 'high', 'xhigh', 'max']), speed] };
    const live = provider === 'codex' ? catalog([modelEntry]) : catalog([{ id: 'gpt-parent' }], [modelEntry]);
    const configured = target(provider, model, { reasoningEffort: 'high', [speed.id]: fast });
    const args = await input(t, live, configured);
    for (const [kind, urgent, expectedEffort, expectedSpeed] of [
      ['routine', false, 'low', standard], ['judgment', true, 'medium', fast],
      ['verification', false, 'high', fast], ['verification', true, 'high', fast]
    ]) {
      const prepared = await prepareT3Delegation({ ...args, jobProfile: { kind, urgent } });
      assert.deepEqual(prepared.arguments.target, target(provider, model, { reasoningEffort: expectedEffort, [speed.id]: expectedSpeed }));
      assert.deepEqual(prepared.audit.selection.jobLimitations, []);
      assert.equal(prepared.audit.options[speed.id].verified, false);
    }
    const saved = structuredClone(args.resolution);
    args.resolution.routes[args.routeName].entries[0].options[speed.id] = standard;
    const verified = await prepareT3Delegation({ ...args, jobProfile: { kind: 'verification' } });
    assert.equal(verified.arguments.target.options[speed.id], standard);
    assert.equal(typeof verified.arguments.target.options[speed.id], typeof standard);
    assert.equal(saved.routes[args.routeName].entries[0].options[speed.id], fast);
  });
}

test('unsupported speed keys and values stay uninvented and disclosed', async t => {
  for (const speed of [select('serviceTier', ['priority']), { id: 'turbo', type: 'boolean' }]) {
    const configured = target('codex', 'gpt-6.1-sol', { reasoningEffort: 'high', [speed.id]: speed.type === 'boolean' ? false : 'priority' });
    const args = await input(t, catalog([{ id: configured.model, options: [select('reasoningEffort', ['low', 'high']), speed] }]), configured);
    const prepared = await prepareT3Delegation({ ...args, jobProfile: { kind: 'routine' } });
    assert.equal(prepared.arguments.target.options[speed.id], configured.options[speed.id]);
    assert.match(prepared.audit.selection.jobLimitations.join(' '), /speed/);
    assert.deepEqual(Object.keys(prepared.arguments.target.options).sort(), Object.keys(configured.options).sort());
  }
});

test('typed effort steps use the observed support order and retain the max ceiling', async t => {
  for (const [values, configuredEffort, kind, expected] of [
    [['medium', 'high', 'xhigh'], 'high', 'routine', 'medium'],
    [['low', 'high', 'max'], 'high', 'hardest', 'max'],
    [['low', 'high', 'max'], 'max', 'routine', 'low'],
    [['low', 'high', 'max'], 'max', 'hardest', 'max']
  ]) {
    const configured = target('codex', 'gpt-6.1-sol', { reasoningEffort: configuredEffort });
    const args = await input(t, catalog([{ id: configured.model, options: [select('reasoningEffort', values)] }]), configured);
    const prepared = await prepareT3Delegation({ ...args, jobProfile: { kind } });
    assert.equal(prepared.arguments.target.options.reasoningEffort, expected);
    assert.equal(prepared.arguments.target.model, configured.model);
    assert.equal(prepared.audit.selection.selectedFamily, 'gpt');
    assert.deepEqual(args.resolution.routes[args.routeName].entries[0], configured);
  }
});

test('slug effort steps use supported identity variants and nearest required-speed effort with lower ties', async t => {
  for (const [ids, configuredId, kind, urgent, expected] of [
    [['composer-2-medium', 'composer-2-high', 'composer-2-xhigh'], 'composer-2-high', 'routine', false, 'composer-2-medium'],
    [['composer-2-low', 'composer-2-high', 'composer-2-max'], 'composer-2-high', 'hardest', false, 'composer-2-max'],
    [['composer-2-low', 'composer-2-high-fast', 'composer-2-max'], 'composer-2-low', 'hardest', false, 'composer-2-low'],
    [['composer-2-low-fast', 'composer-2-high'], 'composer-2-low-fast', 'routine', false, 'composer-2-low-fast']
  ]) {
    const configured = target('cursor', configuredId);
    const live = catalog([{ id: 'gpt-parent' }], [...ids, 'composer-3-low', 'claude-opus-low'].map(id => ({ id })));
    const args = await input(t, live, configured);
    const prepared = await prepareT3Delegation({ ...args, jobProfile: { kind, urgent } });
    assert.deepEqual(prepared.arguments.target, target('cursor', expected));
    assert.equal(prepared.audit.selection.selectedFamily, 'grok');
  }
});

test('implicit defaults stay out of saved resolution and provider changes derive current defaults', async t => {
  const codex = target('codex', 'gpt-6.1-sol');
  const opus = target('cursor', 'claude-opus-current');
  const opusDefault = target('cursor', 'claude-opus-default');
  const live = catalog([{ id: codex.model }, { id: 'gpt-6.1-sol-default' }], [{ id: opus.model }, { id: opusDefault.model }]);
  const args = await input(t, live, codex);
  const original = structuredClone(args.resolution);
  const panel = [opus, codex, opus];
  args.resolution = configureT3Resolution({ catalog: live, contracts, preset: original.preset, previous: original,
    overrides: { routes: { [args.routeName]: panel } } });
  const prepared = await prepareT3Delegation({ ...args, modelRejections: [rejection(opus)] });
  assert.deepEqual(prepared.arguments.target, opusDefault);
  assert.deepEqual(prepared.audit.selection.configuredTarget, opus);
  assert.equal(Object.hasOwn(original, 'selectionPolicy'), false);
  assert.equal(Object.hasOwn(args.resolution, 'selectionPolicy'), false);
  assert.deepEqual(args.resolution.routes[args.routeName].entries, panel);
  assert.deepEqual(args.resolution.routes['review.panel'], original.routes['review.panel']);
  assert.deepEqual(configureT3Resolution({ catalog: live, contracts, preset: original.preset, previous: args.resolution }), args.resolution);
});

test('implicit defaults rederive when a previously chosen catalog default disappears', async t => {
  const configured = target('cursor', 'claude-opus-current');
  const live = catalog([{ id: 'gpt-parent' }], [{ id: configured.model }, { id: 'claude-opus-default' }]);
  const args = await input(t, live, configured);
  assert.equal((await prepareT3Delegation({ ...args, modelRejections: [rejection(configured)] })).arguments.target.model, 'claude-opus-default');
  live.providers[1].models = [{ id: configured.model }, { id: 'claude-opus-replacement' }];
  assert.equal((await prepareT3Delegation({ ...args, stepId: 'new-catalog', modelRejections: [rejection(configured)] })).arguments.target.model, 'claude-opus-replacement');
});

test('explicit policy stays whole and authoritative across provider and catalog changes', async t => {
  const codex = target('codex', 'gpt-6.1-sol');
  const codexDefault = target('codex', 'gpt-6.1-sol-default');
  const opus = target('cursor', 'claude-opus-current');
  const live = catalog([{ id: codex.model }, { id: codexDefault.model }], [{ id: opus.model }]);
  const policy = { fallbackTargets: [], modelFallbacks: { 'interrogate.reviewers': {
    strategy: 'interrogate', familyDefaults: { gpt: codexDefault }, unknownFamilyDefault: codexDefault, hostFallback: codexDefault
  } } };
  const args = await input(t, live, codex, policy);
  args.resolution = configureT3Resolution({ catalog: live, contracts, preset: args.resolution.preset, previous: args.resolution,
    overrides: { routes: { [args.routeName]: [opus] } } });
  assert.deepEqual(args.resolution.selectionPolicy, policy);
  await assert.rejects(prepareT3Delegation({ ...args, modelRejections: [rejection(opus)] }), /preserve the configured provider/);
  live.providers[0].models = [{ id: codex.model }];
  const refreshed = configureT3Resolution({ catalog: live, contracts, preset: args.resolution.preset, previous: args.resolution });
  assert.deepEqual(refreshed, args.resolution);
  assert.deepEqual(refreshed.selectionPolicy, policy);
});

test('permitted actual channel receives verification and hardest job settings when primary is disabled', async t => {
  const options = [select('reasoningEffort', ['low', 'high', 'max']), { id: 'fastMode', type: 'boolean' }];
  const configured = target('codex', 'gpt-6.1-sol', { reasoningEffort: 'low', fastMode: true });
  const fallback = target('cursor', 'gpt-6.1-sol', { reasoningEffort: 'high', fastMode: false });
  const args = await input(t, catalog([{ id: configured.model, options }], [{ id: fallback.model, options }]), configured, { fallbackTargets: [fallback] });
  args.catalog.providers[0].canRunChildTask = false;
  for (const [profile, expected] of [
    [undefined, fallback], [{ kind: 'verification', urgent: true }, fallback],
    [{ kind: 'judgment' }, { ...fallback, options: { reasoningEffort: 'low', fastMode: false } }],
    [{ kind: 'hardest', urgent: true }, { ...fallback, options: { reasoningEffort: 'max', fastMode: true } }]
  ]) {
    const prepared = await prepareT3Delegation({ ...args, jobProfile: profile });
    assert.deepEqual(prepared.arguments.target, expected);
    assert.deepEqual(prepared.audit.selection.configuredTarget, configured);
    assert.equal(prepared.audit.selection.skipped[0].target.providerInstanceId, 'codex');
    assert.match(prepared.audit.selection.skipped[0].reason, /cannot run child tasks/);
  }
  assert.deepEqual(args.resolution.selectionPolicy, { fallbackTargets: [fallback] });
});

test('rejected channel adjustment retries original actual channel options with a new saved-request identity', async t => {
  const options = [select('reasoningEffort', ['low', 'high', 'max']), { id: 'fastMode', type: 'boolean' }];
  const configured = target('codex', 'gpt-6.1-sol', { reasoningEffort: 'low', fastMode: true });
  const fallback = target('cursor', 'gpt-6.1-sol', { reasoningEffort: 'high', fastMode: false });
  const args = await input(t, catalog([{ id: configured.model, options }], [{ id: fallback.model, options }]), configured, { fallbackTargets: [fallback] });
  args.catalog.providers[0].canRunChildTask = false;
  const jobProfile = { kind: 'hardest', urgent: true };
  const adjusted = await prepareT3Delegation({ ...args, jobProfile });
  assert.deepEqual(adjusted.arguments.target.options, { reasoningEffort: 'max', fastMode: true });
  const modelRejections = [rejection(adjusted.arguments.target)];
  const directRetry = await prepareT3Delegation({ ...args, jobProfile, modelRejections, stepId: 'original-channel-direct' });
  assert.deepEqual(directRetry.arguments.target, fallback);
  args.catalog.providers[0].canRunChildTask = true;
  const retry = await prepareT3Delegation({ ...args, jobProfile, modelRejections, stepId: 'original-channel', rejectedPreparedRequest: adjusted });
  assert.deepEqual(retry.arguments.target, fallback);
  assert.deepEqual(retry.audit.selection.configuredTarget, configured);
  assert.deepEqual(retry.audit.selection.rejectedJobTarget, adjusted.arguments.target);
  assert.deepEqual(retry.audit.selection.modelRejections, modelRejections);
  assert.notEqual(retry.arguments.clientRequestId, adjusted.arguments.clientRequestId);
  assert.deepEqual(await prepareT3Delegation({ ...args, jobProfile, modelRejections, stepId: 'original-channel', rejectedPreparedRequest: adjusted, priorPreparedRequest: retry }), retry);
  await assert.rejects(prepareT3Delegation({ ...args, jobProfile, modelRejections, rejectedPreparedRequest: adjusted }), /new step identity/);
  const tampered = structuredClone(adjusted);
  tampered.arguments.target.options.fastMode = false;
  await assert.rejects(prepareT3Delegation({ ...args, jobProfile, modelRejections, stepId: 'tampered', rejectedPreparedRequest: tampered }), /Invalid rejected prepared/);
  const foreignBase = structuredClone(adjusted);
  foreignBase.audit.selection.jobBaseTarget.providerInstanceId = 'foreign-channel';
  await assert.rejects(prepareT3Delegation({ ...args, jobProfile, modelRejections, stepId: 'foreign-base', rejectedPreparedRequest: foreignBase }), /Invalid rejected prepared/);
});
