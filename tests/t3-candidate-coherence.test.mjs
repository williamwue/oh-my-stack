import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
const recordedRejections = values => values.map(({ preparedRequest, ...evidence }) => ({ ...evidence,
  ...(preparedRequest === undefined ? {} : { preparedRequest: { receiptRef: preparedRequest.audit.receiptHash } }) }));

const reject = (prepared, validModelIds = []) => ({
  target: prepared.arguments.target, code: 'model-rejected', rawError: 'Host rejected this model.', validModelIds, preparedRequest: prepared
});

async function input(t, configured, models, selectionPolicy, selectedRoute = routeName) {
  const bundleRoot = await mkdtemp(path.join(os.tmpdir(), 'oms-t3-coherence-'));
  t.after(() => rm(bundleRoot, { recursive: true, force: true }));
  await mkdir(path.join(bundleRoot, 'config'));
  const roleContracts = { ...contracts, routes: { [selectedRoute]: contracts.routes[routeName] } };
  await writeFile(path.join(bundleRoot, 'config/t3-role-contracts.json'), JSON.stringify(roleContracts));
  const catalog = {
    parentThreadId: 'thread/coherence', inheritedProviderInstanceId: 'cursor', inheritedModel: configured.model,
    providers: [{ providerInstanceId: 'cursor', canRunChildTask: true, canRunCrossProviderChildTask: true, models }]
  };
  return {
    bundleRoot, cwd: bundleRoot, catalog, routeName: selectedRoute, task: 'Review bounded candidates.', ownedPaths: [],
    runId: 'coherence-run', stepId: 'original', jobProfile: { kind: 'verification' },
    resolution: configureT3Resolution({ catalog, contracts: roleContracts, preset: 'saved', overrides: {
      routes: { [selectedRoute]: [configured] }, ...(selectionPolicy === undefined ? {} : { selectionPolicy })
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
    assert.deepEqual(prepared.audit.selection.modelRejections, recordedRejections(evidence));
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

async function rejectedAdjustmentChain(t, explicitDefault, equivalent = false) {
  const configured = target('composer-2-high', { reasoningEffort: 'high', fastMode: false });
  const adjustedTarget = target('composer-2-max', { reasoningEffort: 'max', fastMode: false });
  const options = [select('reasoningEffort', ['high', 'max', 'ultra']), { id: 'fastMode', type: 'boolean' }];
  const models = [configured.model, adjustedTarget.model, ...(equivalent ? ['composer-2-ultra'] : [])].map(id => ({ id, options }));
  const args = await input(t, configured, models, explicitDefault ? { modelFallbacks: { [routeName]: {
    strategy: 'interrogate', familyDefaults: { grok: adjustedTarget }, unknownFamilyDefault: adjustedTarget
  } } } : undefined);
  args.jobProfile = { kind: 'hardest' };
  const adjusted = await prepareT3Delegation(args);
  assert.deepEqual(adjusted.arguments.target, adjustedTarget);
  const adjustedRejection = reject(adjusted, models.map(model => model.id));
  const original = await prepareT3Delegation({ ...args, stepId: 'original-retry', modelRejections: [adjustedRejection] });
  assert.deepEqual(original.arguments.target, configured);
  assert.equal(original.audit.selection.reason, 'job-profile-rejected-original-line');
  assert.deepEqual(original.audit.selection.rejectedJobTarget, adjustedTarget);
  assert.equal(original.audit.selection.rejectionProvenance[0].receiptHash, adjusted.audit.receiptHash);
  return { args, configured, adjusted, original, next: { ...args, stepId: 'after-original-refusal',
    modelRejections: [adjustedRejection, reject(original)] } };
}

for (const explicit of [false, true]) {
  test(`${explicit ? 'explicit' : 'implicit'} default overlapping a refused adjustment fails when no equivalent remains`, async t => {
    const { next } = await rejectedAdjustmentChain(t, explicit);
    await assert.rejects(prepareT3Delegation(next), /BLOCKED: no observed valid equivalent on the configured provider/);
  });

  test(`${explicit ? 'explicit' : 'implicit'} default overlapping a refused adjustment uses its valid IDs for a coherent equivalent`, async t => {
    const { args, configured, adjusted, original, next } = await rejectedAdjustmentChain(t, explicit, true);
    const saved = structuredClone(args.resolution);
    const prepared = await prepareT3Delegation(next);
    assert.deepEqual(prepared.arguments.target, target('composer-2-ultra', { reasoningEffort: 'ultra', fastMode: false }));
    assert.equal(prepared.audit.selection.reason, 'model-valid-equivalent');
    assert.deepEqual(prepared.audit.selection.familyDefault, adjusted.arguments.target);
    assert.deepEqual(prepared.audit.selection.configuredTarget, configured);
    assert.deepEqual(prepared.audit.selection.modelRejections, recordedRejections(next.modelRejections));
    assert.deepEqual(prepared.audit.selection.rejectionProvenance.map(value => value.receiptHash),
      [adjusted.audit.receiptHash, original.audit.receiptHash]);
    assert.deepEqual(prepared.audit.selection.optionChanges, [{ option: 'reasoningEffort', change: 'changed', from: 'high', to: 'ultra' }]);
    assert.deepEqual(args.resolution, saved);
  });
}

test('a refused typed max adjustment retries high on the same model ID before excluding an exact max default', async t => {
  const configured = target('composer-2', { reasoningEffort: 'high' });
  const adjustedTarget = target(configured.model, { reasoningEffort: 'max' });
  const args = await input(t, configured, [{ id: configured.model, options: [select('reasoningEffort', ['high', 'max'])] }], {
    modelFallbacks: { [routeName]: { strategy: 'interrogate', familyDefaults: { grok: adjustedTarget }, unknownFamilyDefault: adjustedTarget } }
  });
  args.jobProfile = { kind: 'hardest' };
  const adjusted = await prepareT3Delegation(args);
  assert.deepEqual(adjusted.arguments.target, adjustedTarget);
  const adjustedRejection = reject(adjusted, [configured.model]);
  const original = await prepareT3Delegation({ ...args, stepId: 'same-id-high', modelRejections: [adjustedRejection] });
  assert.deepEqual(original.arguments.target, configured);
  assert.equal(original.audit.selection.reason, 'job-profile-rejected-original-line');
  await assert.rejects(prepareT3Delegation({ ...args, stepId: 'same-id-exhausted', modelRejections: [adjustedRejection, reject(original)] }),
    /BLOCKED: no observed valid equivalent on the configured provider/);
});

test('an equivalent candidate already refused as the adjustment stays excluded after a distinct default refusal', async t => {
  const configured = target('composer-2-high', { reasoningEffort: 'high', fastMode: false });
  const familyDefault = target('composer-2-high-fast', { reasoningEffort: 'high', fastMode: true });
  const options = [select('reasoningEffort', ['high', 'max', 'ultra']), { id: 'fastMode', type: 'boolean' }];
  const args = await input(t, configured,
    ['composer-2-high', 'composer-2-high-fast', 'composer-2-max-fast', 'composer-2-ultra-fast'].map(id => ({ id, options })), {
      modelFallbacks: { [routeName]: { strategy: 'interrogate', familyDefaults: { grok: familyDefault }, unknownFamilyDefault: familyDefault } }
    });
  args.jobProfile = { kind: 'hardest', urgent: true };
  const adjusted = await prepareT3Delegation(args);
  assert.deepEqual(adjusted.arguments.target, target('composer-2-max-fast', { reasoningEffort: 'max', fastMode: true }));
  const adjustedRejection = reject(adjusted);
  const original = await prepareT3Delegation({ ...args, stepId: 'distinct-original', modelRejections: [adjustedRejection] });
  assert.deepEqual(original.arguments.target, configured);
  const history = [adjustedRejection, reject(original)];
  const preparedDefault = await prepareT3Delegation({ ...args, stepId: 'distinct-default', modelRejections: history });
  assert.deepEqual(preparedDefault.arguments.target, familyDefault);
  const modelRejections = [...history, reject(preparedDefault, [adjusted.arguments.target.model, 'composer-2-ultra-fast'])];
  const prepared = await prepareT3Delegation({ ...args, stepId: 'distinct-equivalent', modelRejections });
  assert.deepEqual(prepared.arguments.target, target('composer-2-ultra-fast', { reasoningEffort: 'ultra', fastMode: true }));
  assert.equal(prepared.audit.selection.reason, 'model-valid-equivalent');
  assert.deepEqual(prepared.audit.selection.modelRejections, recordedRejections(modelRejections));
  assert.deepEqual(prepared.audit.selection.rejectionProvenance.map(value => value.receiptHash),
    [adjusted.audit.receiptHash, original.audit.receiptHash, preparedDefault.audit.receiptHash]);
});

for (const [name, foreign] of [
  ['known unselected model', target('composer-2-ultra', { reasoningEffort: 'ultra', fastMode: false })],
  ['different options on the adjusted model', target('composer-2-max')],
  ['foreign provider', { ...target('composer-2-max', { reasoningEffort: 'max', fastMode: false }), providerInstanceId: 'other-cursor' }]
]) {
  test(`complete adjustment refusal history rejects ${name}`, async t => {
    const { next } = await rejectedAdjustmentChain(t, false, true);
    await assert.rejects(prepareT3Delegation({ ...next, modelRejections: [...next.modelRejections,
      { target: foreign, code: 'model-rejected', rawError: 'Foreign rejection.', validModelIds: [] }
    ] }), /Foreign model rejection target or provider/);
  });
}

for (const [name, change] of [
  ['tampered adjustment receipt', rejection => { rejection.preparedRequest.audit.identity.stepId = 'forged-history'; }],
  ['removed historical receipt', rejection => { delete rejection.preparedRequest; }]
]) {
  test(`complete overlapping-default history rejects a ${name}`, async t => {
    const { next } = await rejectedAdjustmentChain(t, false, true);
    const changed = structuredClone(next);
    change(changed.modelRejections[0]);
    await assert.rejects(prepareT3Delegation(changed), /Invalid rejected prepared request/);
  });
}

function immutable(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(immutable);
    Object.freeze(value);
  }
  return value;
}

async function equivalentRefusalChain(t, selectedRoute = routeName, defaultValidIds = ['gpt-default-a']) {
  const configured = target('gpt-original', { reasoningEffort: 'high' });
  const familyDefault = target('gpt-default', { reasoningEffort: 'high' });
  const equivalentA = target('gpt-default-a', { reasoningEffort: 'high' });
  const equivalentB = target('gpt-default-b', { effort: 'high' });
  const args = await input(t, configured, [
    ...[configured, familyDefault, equivalentA].map(value => ({ id: value.model, options: [select('reasoningEffort', ['high'])] })),
    { id: equivalentB.model, options: [select('effort', ['high'])] },
    { id: 'gpt-default-0', options: [select('reasoningEffort', ['high'])] },
    { id: 'claude-equivalent', options: [select('effort', ['high'])] }
  ], { modelFallbacks: { [selectedRoute]: {
    strategy: selectedRoute === routeName ? 'interrogate' : 'arena',
    familyDefaults: { gpt: familyDefault }, unknownFamilyDefault: familyDefault
  } } }, selectedRoute);
  const original = await prepareT3Delegation(args);
  assert.deepEqual(original.arguments.target, configured);
  const first = immutable(reject(original));
  const preparedDefault = await prepareT3Delegation({ ...args, stepId: 'chain-default', modelRejections: [first] });
  assert.deepEqual(preparedDefault.arguments.target, familyDefault);
  const history = immutable([first, reject(preparedDefault, defaultValidIds)]);
  const preparedA = await prepareT3Delegation({ ...args, stepId: 'chain-a', modelRejections: history });
  assert.deepEqual(preparedA.arguments.target, equivalentA);
  assert.equal(preparedA.audit.selection.reason, 'model-valid-equivalent');
  return { args, original, preparedDefault, preparedA, equivalentA, equivalentB, history,
    next: { ...args, stepId: 'chain-b', modelRejections: immutable([...history, reject(preparedA, [equivalentB.model])]) } };
}

for (const selectedRoute of [routeName, 'arena.runners', 'architect.runners']) {
  for (const change of ['options', 'model']) {
    test(`${selectedRoute} continues captured equivalent refusals after earlier ${change} disappear`, async t => {
      const { args, original, preparedDefault, preparedA, equivalentA, equivalentB, next } = await equivalentRefusalChain(t, selectedRoute);
      const frozenHistory = structuredClone(next.modelRejections);
      next.catalog = structuredClone(args.catalog);
      const provider = next.catalog.providers[0];
      if (change === 'model') provider.models = provider.models.filter(model => model.id !== equivalentA.model);
      else provider.models.find(model => model.id === equivalentA.model).options = [select('reasoningEffort', ['low'])];
      const preparedB = await prepareT3Delegation(next);
      assert.deepEqual(preparedB.arguments.target, equivalentB);
      assert.equal(preparedB.audit.selection.reason, 'model-valid-equivalent');
      assert.deepEqual(preparedB.audit.selection.modelRejections, recordedRejections(frozenHistory));
      assert.deepEqual(preparedB.audit.selection.rejectionProvenance.map(value => value.receiptHash),
        [original.audit.receiptHash, preparedDefault.audit.receiptHash, preparedA.audit.receiptHash]);
      assert.deepEqual(preparedB.audit.preparation.chainOrigin, original.audit.preparation.chainOrigin);
      assert.deepEqual(preparedB.audit.selection.optionChanges,
        [{ option: 'reasoningEffort', change: 'translated', toOption: 'effort', value: 'high' }]);
      await assert.rejects(prepareT3Delegation({ ...next, stepId: 'chain-exhausted', modelRejections: [
        ...next.modelRejections, immutable(reject(preparedB, ['gpt-original', 'gpt-default', equivalentA.model, equivalentB.model]))
      ] }), /BLOCKED: no observed valid equivalent on the configured provider/);
      assert.deepEqual(next.modelRejections, frozenHistory);
    });
  }
}

test('a later valid-ID report excludes refused models and never selects an unreported advertised candidate', async t => {
  const { next, preparedA } = await equivalentRefusalChain(t);
  const evidence = [...next.modelRejections.slice(0, -1), immutable(reject(preparedA, ['gpt-original', 'gpt-default', 'gpt-default-a']))];
  await assert.rejects(prepareT3Delegation({ ...next, modelRejections: evidence }), /BLOCKED: no observed valid equivalent/);
});

for (const empty of [false, true]) {
  test(`the current equivalent refusal ${empty ? 'with no valid IDs blocks stale candidates' : 'selects only its reported IDs over a nearer stale candidate'}`, async t => {
    const { next, preparedA, equivalentB } = await equivalentRefusalChain(t, routeName, ['gpt-default-a', 'gpt-default-b']);
    const farC = target('gpt-distant-equivalent-c', { reasoningEffort: 'high' });
    const catalog = structuredClone(next.catalog);
    catalog.providers[0].models.push({ id: farC.model, options: [select('reasoningEffort', ['high'])] });
    const evidence = immutable([...next.modelRejections.slice(0, -1), reject(preparedA, empty ? [] : [farC.model])]);
    const savedEvidence = structuredClone(evidence);
    const current = { ...next, catalog, modelRejections: evidence };
    if (empty) await assert.rejects(prepareT3Delegation(current), /BLOCKED: no observed valid equivalent on the configured provider/);
    else {
      const prepared = await prepareT3Delegation(current);
      assert.deepEqual(prepared.arguments.target, farC);
      assert.equal(prepared.audit.selection.reason, 'model-valid-equivalent');
      assert.deepEqual(prepared.audit.selection.modelRejections, recordedRejections(savedEvidence));
    }
    assert.equal(catalog.providers[0].models.some(model => model.id === equivalentB.model), true);
    assert.deepEqual(evidence, savedEvidence);
  });
}

test('an arbitrary bare third target stays foreign after a genuine equivalent refusal', async t => {
  const { next } = await equivalentRefusalChain(t);
  await assert.rejects(prepareT3Delegation({ ...next, modelRejections: [...next.modelRejections,
    { target: target('gpt-default-0', { reasoningEffort: 'high' }), code: 'model-rejected', rawError: 'Foreign.', validModelIds: [] }
  ] }), /Foreign model rejection target or provider/);
  const bare = structuredClone(next.modelRejections);
  delete bare.at(-1).preparedRequest;
  await assert.rejects(prepareT3Delegation({ ...next, modelRejections: bare }), /Foreign model rejection target or provider/);
});

function reseal(saved) {
  const canonical = value => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
  saved.audit.payloadHash = digest(saved.arguments);
  const { receiptHash, preparation, ...audit } = saved.audit;
  const { ledger, ...captured } = preparation;
  saved.audit.receiptHash = digest({ tool: saved.tool, arguments: saved.arguments, audit: { ...audit, preparation: captured } });
}

for (const [name, change] of [
  ['mismatched target receipt', (rejection, fixture) => { rejection.preparedRequest = structuredClone(fixture.original); }],
  ['wrong origin', rejection => { rejection.preparedRequest.audit.preparation.chainOrigin.catalog.parentThreadId = 'foreign-origin'; reseal(rejection.preparedRequest); }],
  ['forged selected target', rejection => {
    const saved = rejection.preparedRequest;
    saved.arguments.target = target('gpt-default-0', { reasoningEffort: 'high' });
    saved.audit.selection.selectedTarget = structuredClone(saved.arguments.target);
    rejection.target = structuredClone(saved.arguments.target);
    reseal(saved);
  }],
  ['cross-task receipt', rejection => { rejection.preparedRequest.audit.preparation.input.task = 'Another task.'; reseal(rejection.preparedRequest); }],
  ['foreign provider', rejection => { rejection.target.providerInstanceId = 'other-cursor'; }]
]) {
  test(`equivalent refusal rejects ${name}`, async t => {
    const fixture = await equivalentRefusalChain(t);
    const evidence = structuredClone(fixture.next.modelRejections);
    change(evidence.at(-1), fixture);
    await assert.rejects(prepareT3Delegation({ ...fixture.next, modelRejections: evidence }), /Invalid rejected prepared request/);
  });
}

test('a genuine helper-generated equivalent with a different chain origin stays blocked', async t => {
  const { args, original, history, equivalentA, equivalentB } = await equivalentRefusalChain(t);
  const bareHistory = history.map(({ preparedRequest, ...rejection }) => rejection);
  const foreignCatalog = structuredClone(args.catalog);
  foreignCatalog.inheritedModel = 'gpt-default';
  const foreignA = await prepareT3Delegation({ ...args, catalog: foreignCatalog, reviewedModel: 'gpt-original', stepId: 'other-origin-a', modelRejections: bareHistory });
  assert.deepEqual(foreignA.arguments.target, equivalentA);
  await assert.rejects(prepareT3Delegation({ ...args, stepId: 'mixed-origin-b', rejectedPreparedRequest: original,
    modelRejections: [...bareHistory, reject(foreignA, [equivalentB.model])]
  }), /Invalid rejected prepared request chain origin/);
});

test('a genuine helper-generated equivalent from another task cannot authorize refusal history', async t => {
  const { args, history, equivalentA, equivalentB } = await equivalentRefusalChain(t);
  const bareHistory = history.map(({ preparedRequest, ...rejection }) => rejection);
  const foreignA = await prepareT3Delegation({ ...args, task: 'Review another bounded task.', stepId: 'other-task-a', modelRejections: bareHistory });
  assert.deepEqual(foreignA.arguments.target, equivalentA);
  await assert.rejects(prepareT3Delegation({ ...args, stepId: 'cross-task-b',
    modelRejections: [...bareHistory, reject(foreignA, [equivalentB.model])]
  }), /Invalid rejected prepared request provenance/);
});

for (const selectedRoute of ['arena.runners', 'architect.runners']) {
  test(`${selectedRoute} keeps later equivalent selection in the default family`, async t => {
    const { next, preparedA } = await equivalentRefusalChain(t, selectedRoute);
    await assert.rejects(prepareT3Delegation({ ...next, modelRejections: [
      ...next.modelRejections.slice(0, -1), immutable(reject(preparedA, ['claude-equivalent']))
    ] }), /BLOCKED: no observed valid equivalent/);
  });
}
