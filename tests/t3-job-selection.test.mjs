import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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

for (const [kind, expected] of [['hardest', 'ultra'], ['judgment', 'max'], ['routine', 'high'], ['verification', 'ultra']]) {
  test(`saved ultra uses its actual supported tier for ${kind}`, async t => {
    const configured = target('codex', 'gpt-6.1-sol', { reasoningEffort: 'ultra' });
    const args = await input(t, catalog([{ id: configured.model, options: [select('reasoningEffort', ['low', 'high', 'max', 'ultra'])] }]), configured);
    const prepared = await prepareT3Delegation({ ...args, jobProfile: { kind } });
    assert.deepEqual(prepared.arguments.target, target('codex', 'gpt-6.1-sol', { reasoningEffort: expected }));
  });
}

test('none and minimal are real advertised tiers and hardest does not raise max to ultra', async t => {
  for (const [original, kind, expected] of [['max', 'routine', 'minimal'], ['minimal', 'judgment', 'none'], ['none', 'hardest', 'minimal'], ['max', 'hardest', 'max']]) {
    const configured = target('codex', 'gpt-6.1-sol', { reasoningEffort: original });
    const args = await input(t, catalog([{ id: configured.model, options: [select('reasoningEffort', ['ultra', 'max', 'high', 'minimal', 'none'])] }]), configured);
    assert.equal((await prepareT3Delegation({ ...args, jobProfile: { kind } })).arguments.target.options.reasoningEffort, expected);
  }
});

test('slug variants include none minimal and ultra and preserve an above-max original', async t => {
  const live = catalog([{ id: 'gpt-parent' }], ['none', 'minimal', 'high', 'max', 'ultra'].map(level => ({ id: `composer-2-${level}` })));
  for (const [original, kind, expected] of [['ultra', 'hardest', 'ultra'], ['ultra', 'judgment', 'max'], ['ultra', 'routine', 'high'], ['high', 'routine', 'none']]) {
    const args = await input(t, live, target('cursor', `composer-2-${original}`));
    assert.deepEqual((await prepareT3Delegation({ ...args, jobProfile: { kind } })).arguments.target, target('cursor', `composer-2-${expected}`));
  }
});

test('hardest preserves ultra when standard-speed variants would lower its effort', async t => {
  const args = await input(t, catalog([{ id: 'gpt-parent' }], [{ id: 'composer-2-ultra-fast' }, { id: 'composer-2-max' }]), target('cursor', 'composer-2-ultra-fast'));
  const prepared = await prepareT3Delegation({ ...args, jobProfile: { kind: 'hardest' } });
  assert.deepEqual(prepared.arguments.target, target('cursor', 'composer-2-ultra-fast'));
  assert.match(prepared.audit.selection.jobLimitations.join(' '), /No advertised variant/);
});

for (const [name, optionDefs, configuredOptions, expectedOptions] of [
  ['typed effort', [select('reasoningEffort', ['high', 'max'])], { reasoningEffort: 'high' }, { reasoningEffort: 'max' }],
  ['typed speed', [{ id: 'fastMode', type: 'boolean' }], { fastMode: false }, { fastMode: true }],
  ['both selectors', [select('reasoningEffort', ['high', 'max']), { id: 'fastMode', type: 'boolean' }],
    { reasoningEffort: 'high', fastMode: false }, { reasoningEffort: 'max', fastMode: true }]
]) {
  test(`slug and ${name} choose one coherent urgent hardest variant`, async t => {
    const ids = ['composer-2-high', 'composer-2-high-fast', 'composer-2-max', 'composer-2-max-fast'];
    const args = await input(t, catalog([{ id: 'gpt-parent' }], ids.map(id => ({ id, options: optionDefs }))), target('cursor', ids[0], configuredOptions));
    const prepared = await prepareT3Delegation({ ...args, jobProfile: { kind: 'hardest', urgent: true } });
    assert.deepEqual(prepared.arguments.target, target('cursor', 'composer-2-max-fast', expectedOptions));
    assert.deepEqual(prepared.audit.selection.jobLimitations, []);
    assert.deepEqual(args.resolution.routes[args.routeName].entries[0], target('cursor', 'composer-2-high', configuredOptions));
  });
}

test('slug and both selectors choose one standard judgment variant and preserve verification exactly', async t => {
  const optionDefs = [select('reasoningEffort', ['high', 'max']), { id: 'fastMode', type: 'boolean' }, select('serviceTier', ['default', 'priority'])];
  const configured = target('cursor', 'composer-2-max-fast', { reasoningEffort: 'max', fastMode: true, serviceTier: 'priority' });
  const args = await input(t, catalog([{ id: 'gpt-parent' }], ['composer-2-high', 'composer-2-max-fast'].map(id => ({ id, options: optionDefs }))), configured);
  assert.deepEqual((await prepareT3Delegation({ ...args, jobProfile: { kind: 'judgment' } })).arguments.target,
    target('cursor', 'composer-2-high', { reasoningEffort: 'high', fastMode: false, serviceTier: 'default' }));
  const verified = await prepareT3Delegation({ ...args, jobProfile: { kind: 'verification', urgent: false } });
  assert.deepEqual(verified.arguments.target, configured);
  assert.deepEqual(verified.audit.selection.jobLimitations, []);
});

test('missing coherent advertised slug and selector combinations retain the original target with a limitation', async t => {
  for (const optionDefs of [[select('reasoningEffort', ['high', 'max'])], [{ id: 'fastMode', type: 'boolean' }]]) {
    const configured = target('cursor', 'composer-2-high', optionDefs[0].id === 'reasoningEffort' ? { reasoningEffort: 'high' } : { fastMode: false });
    const args = await input(t, catalog([{ id: 'gpt-parent' }], ['composer-2-high', 'composer-2-high-fast', 'composer-2-max'].map(id => ({ id, options: optionDefs }))), configured);
    const prepared = await prepareT3Delegation({ ...args, jobProfile: { kind: 'hardest', urgent: true } });
    assert.deepEqual(prepared.arguments.target, configured);
    assert.match(prepared.audit.selection.jobLimitations.join(' '), /No advertised variant/);
  }
});

test('a matching slug whose typed selector cannot express that effort is not a coherent variant', async t => {
  const configured = target('cursor', 'composer-2-high', { reasoningEffort: 'high' });
  const args = await input(t, catalog([{ id: 'gpt-parent' }], [
    { id: configured.model, options: [select('reasoningEffort', ['high', 'max'])] },
    { id: 'composer-2-max-fast', options: [select('reasoningEffort', ['high'])] }
  ]), configured);
  const prepared = await prepareT3Delegation({ ...args, jobProfile: { kind: 'hardest', urgent: true } });
  assert.deepEqual(prepared.arguments.target, configured);
  assert.match(prepared.audit.selection.jobLimitations.join(' '), /No advertised variant/);
});

test('all advertised speed keys receive standard or urgent settings regardless of order', async t => {
  const optionDefs = [select('serviceTier', ['default', 'priority']), { id: 'fastMode', type: 'boolean' },
    { id: 'fast', type: 'boolean' }, select('speed', ['standard', 'fast'])];
  for (const reversed of [false, true]) {
    const configured = target('codex', 'gpt-6.1-sol', { serviceTier: 'default', fastMode: true, fast: true, speed: 'fast' });
    const args = await input(t, catalog([{ id: configured.model, options: reversed ? [...optionDefs].reverse() : optionDefs }]), configured);
    for (const [urgent, expected] of [[false, { serviceTier: 'default', fastMode: false, fast: false, speed: 'standard' }],
      [true, { serviceTier: 'priority', fastMode: true, fast: true, speed: 'fast' }]]) {
      assert.deepEqual((await prepareT3Delegation({ ...args, jobProfile: { kind: 'routine', urgent } })).arguments.target,
        target('codex', configured.model, expected));
    }
    assert.deepEqual((await prepareT3Delegation({ ...args, jobProfile: { kind: 'verification' } })).arguments.target, configured);
  }
});

test('an unsupported speed value limits only its own key while other advertised keys still adjust', async t => {
  const configured = target('codex', 'gpt-6.1-sol', { serviceTier: 'priority', fastMode: true, speed: 'fast' });
  const args = await input(t, catalog([{ id: configured.model, options: [select('serviceTier', ['priority']),
    { id: 'fastMode', type: 'boolean' }, select('speed', ['standard', 'fast'])] }]), configured);
  const prepared = await prepareT3Delegation({ ...args, jobProfile: { kind: 'routine' } });
  assert.deepEqual(prepared.arguments.target, target('codex', configured.model, { serviceTier: 'priority', fastMode: false, speed: 'standard' }));
  assert.match(prepared.audit.selection.jobLimitations.join(' '), /serviceTier/);
  assert.equal(prepared.audit.selection.jobLimitations.some(value => value.includes('fastMode')), false);
});

test('selected variants use their advertised effort key and adjust every advertised speed key', async t => {
  const configured = target('cursor', 'composer-2-high', { reasoningEffort: 'high', fastMode: false });
  const args = await input(t, catalog([{ id: 'gpt-parent' }], [
    { id: configured.model, options: [select('reasoningEffort', ['high', 'max']), { id: 'fastMode', type: 'boolean' }] },
    { id: 'composer-2-max-fast', options: [select('effort', ['high', 'max']), { id: 'fastMode', type: 'boolean' }, select('serviceTier', ['default', 'priority'])] }
  ]), configured);
  const jobProfile = { kind: 'hardest', urgent: true };
  const prepared = await prepareT3Delegation({ ...args, jobProfile });
  assert.deepEqual(prepared.arguments.target, target('cursor', 'composer-2-max-fast', { effort: 'max', fastMode: true, serviceTier: 'priority' }));
  assert.deepEqual(prepared.audit.selection.optionChanges, [
    { option: 'reasoningEffort', change: 'dropped', value: 'high' },
    { option: 'fastMode', change: 'changed', from: false, to: true },
    { option: 'effort', change: 'added', value: 'max' },
    { option: 'serviceTier', change: 'added', value: 'priority' }
  ]);
  args.catalog.providers[1].models.pop();
  const retried = await prepareT3Delegation({ ...args, jobProfile, stepId: 'mixed-original', rejectedPreparedRequest: prepared,
    modelRejections: [rejection(prepared.arguments.target)] });
  assert.deepEqual(retried.arguments.target, configured);
  assert.deepEqual(retried.audit.selection.rejectedJobTarget, prepared.arguments.target);
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

async function retryFixture(t) {
  const options = [select('reasoningEffort', ['low', 'high', 'max']), { id: 'fastMode', type: 'boolean' }];
  const configured = target('codex', 'gpt-6.1-sol', { reasoningEffort: 'high', fastMode: false });
  const fallback = target('cursor', configured.model, { reasoningEffort: 'high', fastMode: false });
  const args = await input(t, catalog([{ id: configured.model, options }], [{ id: fallback.model, options }]), configured, { fallbackTargets: [fallback] });
  args.ownedPaths = [path.join(args.cwd, 'owned.mjs')];
  args.jobProfile = { kind: 'hardest', urgent: true };
  const adjusted = await prepareT3Delegation(args);
  assert.deepEqual(adjusted.arguments.target, target('codex', configured.model, { reasoningEffort: 'max', fastMode: true }));
  return { args, configured, fallback, adjusted, retry: {
    ...args, stepId: 'retry-original', rejectedPreparedRequest: adjusted, modelRejections: [rejection(adjusted.arguments.target)]
  } };
}

function receiptDigest(value) {
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function reseal(saved) {
  const { receiptHash, ...audit } = saved.audit;
  saved.audit.receiptHash = receiptDigest({ tool: saved.tool, arguments: saved.arguments, audit });
}

for (const resealed of [false, true]) {
  test(`retry rejects a permitted but false original channel even with checksum recomputed=${resealed}`, async t => {
    const { retry, fallback, adjusted, configured } = await retryFixture(t);
    assert.deepEqual((await prepareT3Delegation(retry)).arguments.target, configured);
    const saved = structuredClone(adjusted);
    saved.audit.selection.jobBaseTarget = fallback;
    if (resealed) reseal(saved);
    await assert.rejects(prepareT3Delegation({ ...retry, rejectedPreparedRequest: saved }), /Invalid rejected prepared/);
  });
}

for (const [name, change] of [
  ['task', args => { args.task = 'Review another task.'; }],
  ['cwd', args => { args.cwd = path.join(args.cwd, 'elsewhere'); }],
  ['owned paths', args => { args.ownedPaths = [path.join(args.cwd, 'other.mjs')]; }],
  ['original brief', args => { args.originalBrief = 'A different original brief.'; }],
  ['profile', args => { args.jobProfile = { kind: 'judgment' }; }],
  ['selection', args => { args.entry = 2; args.resolution.routes[args.routeName].entries.push(args.resolution.routes[args.routeName].entries[0]); }],
  ['configuration', args => { args.resolution.preset = 'other-preset'; }],
  ['policy', args => { args.resolution.selectionPolicy.fallbackTargets = []; }],
  ['runtime', args => { args.runtimeMode = 'full-access'; }],
  ['title', args => { args.title = 'Another title'; }],
  ['reviewed model', args => { args.reviewedModel = 'claude-opus-current'; }],
  ['identity', args => { args.runId = 'another-run'; }]
]) {
  test(`retry rejects different ${name} provenance`, async t => {
    const { retry } = await retryFixture(t);
    const changed = structuredClone(retry);
    change(changed);
    await assert.rejects(prepareT3Delegation(changed), /Invalid rejected prepared/);
  });
}

for (const field of ['identity', 'catalogHash', 'contractsHash', 'roleHash', 'selection']) {
  test(`receipt binds audit ${field}`, async t => {
    const { retry, adjusted } = await retryFixture(t);
    const saved = structuredClone(adjusted);
    if (field === 'identity') saved.audit.identity.stepId = 'invented-step';
    else if (field === 'selection') saved.audit.selection.jobLimitations.push('Invented limitation.');
    else saved.audit[field] = 'invented-hash';
    await assert.rejects(prepareT3Delegation({ ...retry, rejectedPreparedRequest: saved }), /Invalid rejected prepared/);
  });
}

test('retry uses captured preparation catalog while refreshing provider and option availability', async t => {
  const { retry, configured } = await retryFixture(t);
  retry.catalog.providers[0].models[0].options[0] = select('reasoningEffort', ['low', 'high']);
  retry.catalog.providers[1].canRunChildTask = false;
  assert.deepEqual((await prepareT3Delegation(retry)).arguments.target, configured);
});

test('recomputed checksums cannot replace the captured job transition with another supported target', async t => {
  const { retry, adjusted } = await retryFixture(t);
  const saved = structuredClone(adjusted);
  saved.arguments.target.options.reasoningEffort = 'low';
  saved.audit.selection.selectedTarget = structuredClone(saved.arguments.target);
  saved.audit.payloadHash = receiptDigest(saved.arguments);
  reseal(saved);
  retry.modelRejections = [rejection(saved.arguments.target)];
  await assert.rejects(prepareT3Delegation({ ...retry, rejectedPreparedRequest: saved }), /Invalid rejected prepared request transition/);
});

test('receipt reconstruction checks the original catalog rather than current candidate membership', async t => {
  const { retry, adjusted } = await retryFixture(t);
  const saved = structuredClone(adjusted);
  saved.audit.preparation.input.catalog.providers[0].canRunChildTask = false;
  saved.audit.catalogHash = receiptDigest(saved.audit.preparation.input.catalog);
  reseal(saved);
  await assert.rejects(prepareT3Delegation({ ...retry, rejectedPreparedRequest: saved }), /Invalid rejected prepared request transition/);
});

test('receipt binds the captured effective preparation policy', async t => {
  const { retry, adjusted } = await retryFixture(t);
  const saved = structuredClone(adjusted);
  saved.audit.preparation.policy.fallbackTargets = [];
  reseal(saved);
  await assert.rejects(prepareT3Delegation({ ...retry, rejectedPreparedRequest: saved }), /Invalid rejected prepared request transition/);
});

test('receipt checks remain usable when the original catalog has no inherited model', async t => {
  const { args, configured } = await retryFixture(t);
  args.catalog.inheritedModel = null;
  const adjusted = await prepareT3Delegation(args);
  assert.deepEqual((await prepareT3Delegation({ ...args, stepId: 'no-inherited-model', rejectedPreparedRequest: adjusted,
    modelRejections: [rejection(adjusted.arguments.target)] })).arguments.target, configured);
});

test('retry binds contracts and retains the original project configuration scope', async t => {
  const { args, configured } = await retryFixture(t);
  const resolutionPath = path.join(args.cwd, '.oh-my-stack/t3/resolution.json');
  await mkdir(path.dirname(resolutionPath), { recursive: true });
  await writeFile(resolutionPath, JSON.stringify(args.resolution));
  const scoped = { ...args, resolution: undefined, userRoot: path.join(args.cwd, 'isolated-user') };
  const adjusted = await prepareT3Delegation(scoped);
  assert.equal(adjusted.audit.selection.scope, 'project');
  const retry = { ...scoped, stepId: 'project-retry', rejectedPreparedRequest: adjusted, modelRejections: [rejection(adjusted.arguments.target)] };
  assert.deepEqual((await prepareT3Delegation(retry)).arguments.target, configured);
  await assert.rejects(prepareT3Delegation({ ...retry, resolution: args.resolution }), /Invalid rejected prepared request provenance/);
  const changedContracts = structuredClone(contracts);
  changedContracts.roles.reviewer.instructions = 'A different contract.';
  await writeFile(path.join(args.bundleRoot, 'config/t3-role-contracts.json'), JSON.stringify(changedContracts));
  await assert.rejects(prepareT3Delegation(retry), /Invalid rejected prepared/);
});

test('implicit fallback policy is reconstructed from the original catalog and may refresh for the retry', async t => {
  const { args, configured } = await retryFixture(t);
  delete args.resolution.selectionPolicy;
  const adjusted = await prepareT3Delegation(args);
  assert.deepEqual(adjusted.audit.preparation.policy.modelFallbacks[args.routeName].familyDefaults.gpt, configured);
  args.catalog.providers[0].models.push({ id: 'gpt-6.1-sol-default', options: structuredClone(args.catalog.providers[0].models[0].options) });
  const prepared = await prepareT3Delegation({ ...args, stepId: 'refreshed-default', rejectedPreparedRequest: adjusted,
    modelRejections: [rejection(adjusted.arguments.target), rejection(configured)] });
  assert.deepEqual(prepared.arguments.target, target('codex', 'gpt-6.1-sol-default', { reasoningEffort: 'high', fastMode: false }));
});

test('original option rejection can still select its configured model fallback after adjustment retry', async t => {
  const { args, configured } = await retryFixture(t);
  const replacement = target('codex', 'gpt-6.1-sol-default', { reasoningEffort: 'high', fastMode: false });
  args.catalog.providers[0].models.push({ id: replacement.model, options: structuredClone(args.catalog.providers[0].models[0].options) });
  args.resolution.selectionPolicy.modelFallbacks = { [args.routeName]: {
    strategy: 'interrogate', familyDefaults: { gpt: replacement }, unknownFamilyDefault: replacement
  } };
  const adjusted = await prepareT3Delegation(args);
  const prepared = await prepareT3Delegation({ ...args, stepId: 'retry-model', rejectedPreparedRequest: adjusted,
    modelRejections: [rejection(adjusted.arguments.target), rejection(configured)] });
  assert.deepEqual(prepared.arguments.target, replacement);
  assert.equal(prepared.audit.selection.reason, 'model-family-default');
});
