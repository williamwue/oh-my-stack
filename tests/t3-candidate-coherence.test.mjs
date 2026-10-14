import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { configureT3Resolution, prepareT3Delegation, resolveT3ModelFallback } from '../tools/t3-orchestration.mjs';

const routeName = 'interrogate.reviewers';
const contracts = {
  schemaVersion: 1, orchestration: 't3', host: 'codex',
  roles: { reviewer: { description: 'Review candidates.', instructions: 'Report evidence.', writes: false, constraints: ['read_only'] } },
  routes: { [routeName]: { kind: 'panel', role: 'reviewer', defaultCount: 1 } }
};
const select = (id, values) => ({ id, type: 'select', options: values.map(id => ({ id })) });
const target = (model, options = {}) => ({ providerInstanceId: 'cursor', model, options });
const speeds = [
  [{ id: 'fast', type: 'boolean' }, false, true],
  [{ id: 'fastMode', type: 'boolean' }, false, true],
  [select('speed', ['standard', 'fast']), 'standard', 'fast'],
  [select('serviceTier', ['default', 'priority']), 'default', 'priority']
];
const reject = (prepared, validModelIds = []) => ({
  target: prepared.arguments.target, code: 'model-rejected', rawError: 'Host rejected this model.', validModelIds, preparedRequest: prepared
});

async function input(t, configured, models, selectionPolicy) {
  const bundleRoot = await mkdtemp(path.join(os.tmpdir(), 'oms-t3-coherence-'));
  t.after(() => rm(bundleRoot, { recursive: true, force: true }));
  await mkdir(path.join(bundleRoot, 'config'));
  await writeFile(path.join(bundleRoot, 'config/t3-role-contracts.json'), JSON.stringify(contracts));
  const catalog = {
    parentThreadId: 'thread/coherence', inheritedProviderInstanceId: 'cursor', inheritedModel: configured.model,
    providers: [{ providerInstanceId: 'cursor', canRunChildTask: true, canRunCrossProviderChildTask: true, models }]
  };
  return {
    bundleRoot, cwd: bundleRoot, catalog, routeName, task: 'Review bounded candidates.', ownedPaths: [],
    runId: 'coherence-run', stepId: 'original', jobProfile: { kind: 'verification' },
    resolution: configureT3Resolution({ catalog, contracts, preset: 'saved', overrides: {
      routes: { [routeName]: [configured] }, ...(selectionPolicy === undefined ? {} : { selectionPolicy })
    } })
  };
}

for (const [id, expected] of [
  ['composer-2-max', { reasoningEffort: 'max', fastMode: false }],
  ['composer-2-high-fast', { reasoningEffort: 'high', fastMode: true }]
]) {
  test(`verification rejection derives coherent implicit default ${id} with a saved receipt`, async t => {
    const configured = target('composer-2-high', { reasoningEffort: 'high', fastMode: false });
    const options = [select('reasoningEffort', ['high', 'max']), { id: 'fastMode', type: 'boolean' }];
    const args = await input(t, configured, [{ id: configured.model, options }, { id, options }]);
    const original = await prepareT3Delegation(args);
    assert.deepEqual(original.arguments.target, configured);
    const evidence = [reject(original)];
    const prepared = await prepareT3Delegation({ ...args, stepId: 'replacement', modelRejections: evidence });
    assert.deepEqual(prepared.arguments.target, target(id, expected));
    assert.equal(prepared.audit.selection.reason, 'model-family-default');
    assert.deepEqual(prepared.audit.selection.modelRejections, evidence);
    assert.equal(prepared.audit.selection.rejectionProvenance[0].receiptHash, original.audit.receiptHash);
    assert.deepEqual(prepared.audit.selection.optionChanges, id.endsWith('-fast')
      ? [{ option: 'fastMode', change: 'changed', from: false, to: true }]
      : [{ option: 'reasoningEffort', change: 'changed', from: 'high', to: 'max' }]);
    assert.deepEqual(args.resolution.routes[routeName].entries[0], configured);
  });
}

for (const [speed, standard, fast] of speeds) {
  test(`implicit fast replacement agrees with the advertised ${speed.id} selector`, async t => {
    const options = [select('reasoning_effort', ['high', 'max']), speed];
    const configured = target('composer-2-high', { reasoning_effort: 'high', [speed.id]: standard });
    const args = await input(t, configured, [
      { id: configured.model, options }, { id: 'composer-2-max-fast', options }
    ]);
    const original = await prepareT3Delegation(args);
    const prepared = await prepareT3Delegation({ ...args, stepId: 'fast-default', modelRejections: [reject(original)] });
    assert.deepEqual(prepared.arguments.target, target('composer-2-max-fast', { reasoning_effort: 'max', [speed.id]: fast }));
    assert.equal(prepared.audit.selection.reason, 'model-family-default');
  });

  test(`explicit slug conflict in ${speed.id} is rejected without rewriting saved options`, async t => {
    const configured = target('composer-2-high', { [speed.id]: standard });
    const args = await input(t, configured, [{ id: configured.model, options: [speed] }]);
    const inconsistent = target(configured.model, { [speed.id]: fast });
    assert.throws(() => configureT3Resolution({ catalog: args.catalog, contracts, overrides: {
      routes: { [routeName]: [inconsistent] }
    } }), /[Ii]nconsistent.*speed|speed.*slug/);
    args.resolution.routes[routeName].entries[0] = inconsistent;
    for (const jobProfile of [undefined, { kind: 'verification' }, { kind: 'hardest', urgent: true }]) {
      await assert.rejects(prepareT3Delegation({ ...args, jobProfile }), /[Ii]nconsistent.*speed|speed.*slug/);
    }
    assert.deepEqual(args.resolution.routes[routeName].entries[0], inconsistent);
  });
}

for (const key of ['effort', 'reasoningEffort', 'reasoning_effort']) {
  test(`explicit family and host defaults reject ${key} that contradicts the slug`, async t => {
    const configured = target('composer-2-high', { [key]: 'high' });
    const replacement = target('composer-2-max', { [key]: 'high' });
    const options = [select(key, ['high', 'max'])];
    const args = await input(t, configured, [{ id: configured.model, options }, { id: replacement.model, options }]);
    for (const field of ['familyDefaults', 'hostFallback', 'unknownFamilyDefault']) {
      const policy = { strategy: 'interrogate', familyDefaults: { grok: configured }, unknownFamilyDefault: configured,
        ...(field === 'familyDefaults' ? { familyDefaults: { grok: replacement } } : { [field]: replacement }) };
      const savedPolicy = { modelFallbacks: { [routeName]: policy } };
      assert.throws(() => configureT3Resolution({ catalog: args.catalog, contracts, overrides: { selectionPolicy: savedPolicy } }),
        /[Ii]nconsistent.*effort|effort.*slug/);
      args.resolution.selectionPolicy = savedPolicy;
      await assert.rejects(prepareT3Delegation(args), /[Ii]nconsistent.*effort|effort.*slug/);
      assert.deepEqual(args.resolution.selectionPolicy, savedPolicy);
    }
  });
}

test('equivalent fallback skips a max slug whose mandatory typed effort cannot express max', async t => {
  const configured = target('composer-2-low', { reasoningEffort: 'low' });
  const familyDefault = target('composer-2-high', { reasoningEffort: 'high' });
  const impossible = { id: 'composer-2-max', options: [select('reasoningEffort', ['high'])] };
  const equivalent = target('composer-2-ultra', { reasoningEffort: 'ultra' });
  const args = await input(t, configured, [
    { id: configured.model, options: [select('reasoningEffort', ['low'])] },
    { id: familyDefault.model, options: [select('reasoningEffort', ['high'])] }, impossible,
    { id: equivalent.model, options: [select('reasoningEffort', ['high', 'ultra'])] }
  ], { modelFallbacks: { [routeName]: { strategy: 'interrogate', familyDefaults: { grok: familyDefault }, unknownFamilyDefault: familyDefault } } });
  const original = await prepareT3Delegation(args);
  const firstRejection = reject(original);
  const preparedDefault = await prepareT3Delegation({ ...args, stepId: 'family-default', modelRejections: [firstRejection] });
  const prepared = await prepareT3Delegation({ ...args, stepId: 'equivalent', modelRejections: [
    firstRejection, reject(preparedDefault, [impossible.id, equivalent.model])
  ] });
  assert.deepEqual(prepared.arguments.target, equivalent);
  assert.equal(prepared.audit.selection.reason, 'model-valid-equivalent');
  assert.match(prepared.audit.selection.skipped.find(value => value.target.model === impossible.id)?.reason ?? '', /reasoningEffort.*max/);
  assert.deepEqual(prepared.audit.selection.rejectionProvenance.map(value => value.receiptHash),
    [original.audit.receiptHash, preparedDefault.audit.receiptHash]);
  await assert.rejects(prepareT3Delegation({ ...args, stepId: 'no-equivalent', modelRejections: [
    firstRejection, reject(preparedDefault, [impossible.id])
  ] }), /BLOCKED.*reasoningEffort.*max/);
});

test('implicit defaults skip impossible effort and speed variants and report why', async t => {
  const configured = target('composer-2-high', { reasoningEffort: 'high', fastMode: false });
  const options = [select('reasoningEffort', ['high', 'ultra']), { id: 'fastMode', type: 'boolean' }];
  const args = await input(t, configured, [
    { id: configured.model, options },
    { id: 'composer-2-max', options: [select('reasoningEffort', ['high'])] },
    { id: 'composer-2-high-fast', options: [select('speed', ['standard'])] },
    { id: 'composer-2-ultra', options }
  ]);
  const original = await prepareT3Delegation(args);
  const prepared = await prepareT3Delegation({ ...args, stepId: 'possible-default', modelRejections: [reject(original)] });
  assert.deepEqual(prepared.arguments.target, target('composer-2-ultra', { reasoningEffort: 'ultra', fastMode: false }));
  assert.match(prepared.audit.selection.skipped.find(value => value.target.model === 'composer-2-max')?.reason ?? '', /reasoningEffort.*max/);
  assert.match(prepared.audit.selection.skipped.find(value => value.target.model === 'composer-2-high-fast')?.reason ?? '', /speed.*fast/);
});

test('slug-only replacement uses advertised identity without inventing typed selectors', async t => {
  const configured = target('composer-2-high', { reasoningEffort: 'high', fastMode: false });
  const args = await input(t, configured, [
    { id: configured.model, options: [select('reasoningEffort', ['high']), { id: 'fastMode', type: 'boolean' }] },
    { id: 'composer-2-max-fast' }
  ]);
  const original = await prepareT3Delegation(args);
  const prepared = await prepareT3Delegation({ ...args, stepId: 'slug-only', modelRejections: [reject(original)] });
  assert.deepEqual(prepared.arguments.target, target('composer-2-max-fast'));
  assert.deepEqual(prepared.audit.selection.optionChanges, [
    { option: 'reasoningEffort', change: 'dropped', value: 'high' },
    { option: 'fastMode', change: 'dropped', value: false }
  ]);
});

test('contradictory typed speed selectors are rejected even without an encoded slug', async t => {
  const configured = target('composer-2', { fast: false, fastMode: false, speed: 'standard', serviceTier: 'default' });
  const args = await input(t, configured, [{ id: configured.model, options: speeds.map(([option]) => option) }]);
  for (const [option, , fast] of speeds) {
    const inconsistent = target(configured.model, { ...configured.options, [option.id]: fast });
    assert.throws(() => configureT3Resolution({ catalog: args.catalog, contracts, overrides: {
      routes: { [routeName]: [inconsistent] }
    } }), /Ambiguous.*speed/);
    args.resolution.routes[routeName].entries[0] = inconsistent;
    await assert.rejects(prepareT3Delegation(args), /Ambiguous.*speed/);
  }
});

test('synchronous fallback final validation rejects an impossible explicit default', () => {
  const configured = target('composer-2-high');
  const familyDefault = target('composer-2-max');
  assert.throws(() => resolveT3ModelFallback({
    target: configured, routeName,
    catalog: { parentThreadId: 'thread/sync', inheritedProviderInstanceId: 'cursor', inheritedModel: configured.model,
      providers: [{ providerInstanceId: 'cursor', canRunChildTask: true, canRunCrossProviderChildTask: true, models: [
        { id: configured.model }, { id: familyDefault.model, options: [select('reasoningEffort', ['high'])] }
      ] }] },
    policy: { modelFallbacks: { [routeName]: { strategy: 'interrogate', familyDefaults: { grok: familyDefault }, unknownFamilyDefault: familyDefault } } },
    modelRejections: [{ target: configured, code: 'model-rejected', rawError: 'Rejected.', validModelIds: [] }]
  }), /reasoningEffort.*max/);
});

test('unpinned advertised defaults must agree with slug semantics and each other', async t => {
  for (const [id, options, error] of [
    ['composer-2-high', [{ ...select('reasoningEffort', ['high', 'max']), defaultValue: 'max' }], /[Ii]nconsistent.*effort/],
    ['composer-2-high', [{ id: 'fastMode', type: 'boolean', defaultValue: true }], /[Ii]nconsistent.*speed/],
    ['composer-2', [{ id: 'fast', type: 'boolean', defaultValue: false }, { id: 'fastMode', type: 'boolean', defaultValue: true }], /Ambiguous.*speed/]
  ]) {
    const configured = target(id);
    const args = await input(t, configured, [{ id }]);
    args.catalog.providers[0].models[0].options = options;
    await assert.rejects(prepareT3Delegation(args), error);
    await assert.rejects(prepareT3Delegation({ ...args, jobProfile: undefined }), error);
  }
});

test('explicit pins may override advertised defaults without changing verification options', async t => {
  const configured = target('composer-2-high', { reasoningEffort: 'high', fastMode: false });
  const args = await input(t, configured, [{ id: configured.model, options: [
    { ...select('reasoningEffort', ['high', 'max']), defaultValue: 'max' },
    { id: 'fastMode', type: 'boolean', defaultValue: true }
  ] }]);
  const prepared = await prepareT3Delegation(args);
  assert.deepEqual(prepared.arguments.target, configured);
  assert.deepEqual(prepared.audit.selection.optionChanges, []);
});

test('a slug-only original gains every advertised selector coherently on fallback regardless of order', async t => {
  for (const reversed of [false, true]) {
    const configured = target('composer-2-high');
    const options = [
      ...['effort', 'reasoningEffort', 'reasoning_effort'].map(id => ({ ...select(id, ['high', 'max']), defaultValue: 'high' })),
      ...speeds.map(([option, standard]) => ({ ...option, defaultValue: standard }))
    ];
    const args = await input(t, configured, [{ id: configured.model },
      { id: 'composer-2-max-fast', options: reversed ? [...options].reverse() : options }]);
    const original = await prepareT3Delegation(args);
    assert.deepEqual(original.arguments.target, configured);
    const prepared = await prepareT3Delegation({ ...args, stepId: 'all-selectors', modelRejections: [reject(original)] });
    assert.deepEqual(prepared.arguments.target, target('composer-2-max-fast', {
      effort: 'max', reasoningEffort: 'max', reasoning_effort: 'max', fast: true, fastMode: true, speed: 'fast', serviceTier: 'priority'
    }));
    assert.equal(prepared.audit.selection.reason, 'model-family-default');
    assert.deepEqual(prepared.audit.selection.optionChanges.map(change => change.change), Array(7).fill('added'));
    assert.deepEqual(args.resolution.routes[routeName].entries[0], configured);
  }
});

test('a speed limitation retains coherent speed options while effort still adjusts for the job', async t => {
  const configured = target('composer-2', { effort: 'high', fastMode: true, serviceTier: 'priority' });
  const args = await input(t, configured, [{ id: configured.model, options: [
    select('effort', ['low', 'high']), { id: 'fastMode', type: 'boolean' }, select('serviceTier', ['priority'])
  ] }]);
  const prepared = await prepareT3Delegation({ ...args, jobProfile: { kind: 'routine' } });
  assert.deepEqual(prepared.arguments.target, target('composer-2', { effort: 'low', fastMode: true, serviceTier: 'priority' }));
  assert.deepEqual(prepared.audit.selection.jobLimitations, ['Requested speed for serviceTier is not advertised by this model.']);
  assert.equal(prepared.audit.selection.reason, 'job-profile-adjustment');
});
