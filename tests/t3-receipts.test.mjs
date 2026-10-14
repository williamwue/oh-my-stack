import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { configureT3Resolution, prepareT3Delegation } from '../tools/t3-orchestration.mjs';
import { createReceiptLedger } from '../tools/t3-receipts.mjs';

const exec = promisify(execFile);
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function reseal(prepared) {
  const { receiptHash, preparation, ...audit } = prepared.audit;
  const { ledger, ...captured } = preparation;
  prepared.audit.receiptHash = digest({ tool: prepared.tool, arguments: prepared.arguments, audit: { ...audit, preparation: captured } });
}

const target = model => ({ providerInstanceId: 'codex', model, options: {} });
const routeName = 'interrogate.reviewers';
const contracts = {
  schemaVersion: 1, orchestration: 't3', host: 'codex',
  roles: { reviewer: { description: 'Review.', instructions: 'Report evidence.', writes: false, constraints: ['read_only'] } },
  routes: { [routeName]: { kind: 'panel', role: 'reviewer', defaultCount: 1 } }
};
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const rejection = (prepared, validModelIds) => freeze({ target: prepared.arguments.target,
  code: 'model-rejected', rawError: `Rejected ${prepared.arguments.target.model}.`, validModelIds, preparedRequest: prepared });

async function fixture(t) {
  const bundleRoot = await mkdtemp(path.join(os.tmpdir(), 'oms-t3-receipts-'));
  t.after(() => rm(bundleRoot, { recursive: true, force: true }));
  await mkdir(path.join(bundleRoot, 'config'));
  await writeFile(path.join(bundleRoot, 'config/t3-role-contracts.json'), JSON.stringify(contracts));
  const ids = ['gpt-original', 'gpt-default', ...Array.from({ length: 12 }, (_, i) => `gpt-default-${String(i).padStart(2, '0')}`)];
  const catalog = { parentThreadId: 'thread/receipts', inheritedProviderInstanceId: 'codex', inheritedModel: ids[0],
    providers: [{ providerInstanceId: 'codex', canRunChildTask: true, canRunCrossProviderChildTask: true, models: ids.map(id => ({ id })) }] };
  const resolution = configureT3Resolution({ catalog, contracts, overrides: { routes: { [routeName]: [target(ids[0])] },
    selectionPolicy: { modelFallbacks: { [routeName]: { strategy: 'interrogate', familyDefaults: { gpt: target(ids[1]) }, unknownFamilyDefault: target(ids[1]) } } } } });
  return { ids, args: { bundleRoot, cwd: bundleRoot, catalog, resolution, routeName, task: 'Review bounded receipts.',
    ownedPaths: [], runId: 'receipt-run', stepId: 'request-0', jobProfile: { kind: 'verification' } } };
}

for (const roundtrip of [false, true]) {
  test(`public refusal chain prepares fourteen compact receipts${roundtrip ? ' after JSON roundtrip' : ''}`, async t => {
    const { ids, args } = await fixture(t);
    let history = freeze([]);
    const sizes = [];
    let original;
    for (let i = 0; i < ids.length; i++) {
      const before = JSON.stringify(history);
      let prepared;
      try { prepared = await prepareT3Delegation({ ...args, stepId: `request-${i}`, modelRejections: history,
        ...(roundtrip && original ? { rejectedPreparedRequest: original } : {}) }); }
      catch (error) { t.diagnostic(`failedRequest=${i + 1} completed=${sizes.length} largest=${Math.max(...sizes)} sizes=${JSON.stringify(sizes)}`); throw error; }
      assert.deepEqual(prepared.arguments.target, target(ids[i]));
      assert.equal(JSON.stringify(history), before);
      const json = JSON.stringify(prepared);
      sizes.push(Buffer.byteLength(json));
      assert.equal(Object.keys(prepared.audit.preparation.ledger).length, i);
      assert.ok(Object.values(prepared.audit.preparation.ledger).every(node => node.audit.preparation.ledger === undefined));
      if (roundtrip) prepared = JSON.parse(json);
      original ??= prepared;
      history = freeze([...history, rejection(prepared, ids.slice(i + 1))]);
    }
    assert.ok(Math.max(...sizes) < 2_000_000, `largest receipt ${Math.max(...sizes)} bytes`);
    assert.ok(sizes[13] < sizes[6] * 5, `doubling chain size grew from ${sizes[6]} to ${sizes[13]} bytes`);
    assert.ok(sizes[13] < sizes[3] * 8, `quadrupling chain size grew from ${sizes[3]} to ${sizes[13]} bytes`);
    t.diagnostic(`requests=${ids.length} sizes=${JSON.stringify(sizes)} largest=${Math.max(...sizes)}`);
    await assert.rejects(prepareT3Delegation({ ...args, stepId: 'exhausted', modelRejections: history,
      ...(roundtrip ? { rejectedPreparedRequest: original } : {}) }), /BLOCKED: no observed valid equivalent/);
  });
}

async function chain(t) {
  const { ids, args } = await fixture(t);
  const original = await prepareT3Delegation(args);
  const first = rejection(original, ids.slice(1));
  const familyDefault = await prepareT3Delegation({ ...args, stepId: 'default', modelRejections: [first] });
  const history = [first, rejection(familyDefault, ids.slice(2))];
  const equivalent = await prepareT3Delegation({ ...args, stepId: 'equivalent', modelRejections: history });
  assert.deepEqual(equivalent.arguments.target, target('gpt-default-00'));
  return { args, ids, original, equivalent, next: { ...args, stepId: 'next', modelRejections: [...history, rejection(equivalent, ids.slice(3))] } };
}

for (const [name, change, error] of [
  ['missing reference', prepared => { delete prepared.audit.preparation.ledger[Object.keys(prepared.audit.preparation.ledger)[0]]; }, /missing receipt reference/],
  ['ancestor checksum tampering', prepared => { Object.values(prepared.audit.preparation.ledger)[0].audit.preparation.input.task = 'Tampered task.'; }, /receipt checksum/],
  ['reference tampering', prepared => { prepared.audit.preparation.input.modelRejections[0].preparedRequest.receiptRef = 'a'.repeat(64); reseal(prepared); }, /missing receipt reference/],
  ['cycle', prepared => {
    const id = Object.keys(prepared.audit.preparation.ledger)[0];
    prepared.audit.preparation.ledger[id].audit.preparation.input.rejectedPreparedRequest = { receiptRef: prepared.audit.receiptHash };
  }, /receipt cycle/],
  ['duplicate root', prepared => { const node = structuredClone(prepared); delete node.audit.preparation.ledger; prepared.audit.preparation.ledger[prepared.audit.receiptHash] = node; }, /duplicate root receipt/],
  ['unreferenced node', prepared => { prepared.audit.preparation.ledger['a'.repeat(64)] = structuredClone(Object.values(prepared.audit.preparation.ledger)[0]); }, /unreferenced receipt node/],
  ['wrong captured scope', prepared => { prepared.audit.preparation.scope = { scope: 'project', path: '/another/resolution.json' }; reseal(prepared); }, /provenance/],
  ['resealed policy tampering', prepared => { prepared.audit.preparation.policy.modelFallbacks[routeName].familyDefaults.gpt = target('gpt-default-11'); reseal(prepared); }, /transition/],
  ['resealed origin tampering', prepared => { prepared.audit.preparation.chainOrigin.target = target('gpt-default'); reseal(prepared); }, /transition/]
]) {
  test(`saved compact graph rejects ${name}`, async t => {
    const { next } = await chain(t);
    const changed = structuredClone(next);
    change(changed.modelRejections.at(-1).preparedRequest);
    await assert.rejects(prepareT3Delegation(changed), error);
  });
}

test('overlapping public receipts cannot hide conflicting duplicate ancestor data', async t => {
  const { next, original } = await chain(t);
  const changed = structuredClone(next);
  changed.modelRejections.at(-1).preparedRequest.audit.preparation.ledger[original.audit.receiptHash].conflictingData = 'extra';
  await assert.rejects(prepareT3Delegation(changed), /conflicting duplicate receipt/);
});

test('resealing an ancestor and all referring nodes cannot forge its captured transition', async t => {
  const { next } = await chain(t);
  const saved = structuredClone(next.modelRejections.at(-1).preparedRequest);
  const graph = saved.audit.preparation.ledger;
  const oldId = saved.audit.preparation.input.modelRejections[1].preparedRequest.receiptRef;
  const ancestor = graph[oldId];
  ancestor.audit.preparation.policy.modelFallbacks[routeName].familyDefaults.gpt = target('gpt-default-11');
  reseal(ancestor);
  delete graph[oldId];
  graph[ancestor.audit.receiptHash] = ancestor;
  for (const evidence of [saved.audit.preparation.input.modelRejections, saved.audit.selection.modelRejections]) {
    evidence[1].preparedRequest.receiptRef = ancestor.audit.receiptHash;
  }
  reseal(saved);
  const originalId = ancestor.audit.preparation.input.modelRejections[0].preparedRequest.receiptRef;
  const capturedAncestor = { ...ancestor, audit: { ...ancestor.audit,
    preparation: { ...ancestor.audit.preparation, ledger: { [originalId]: graph[originalId] } } } };
  await assert.rejects(prepareT3Delegation({ ...next, modelRejections: [
    next.modelRejections[0], { ...next.modelRejections[1], preparedRequest: capturedAncestor }, rejection(saved, ['gpt-default-01'])
  ] }), /Invalid rejected prepared request transition/);
});

test('each unique captured transition reconstructs once in a preparation ledger', async t => {
  const { next, original } = await chain(t);
  const ledger = createReceiptLedger();
  const normalized = ledger.input(next);
  const node = ledger.node(normalized.modelRejections[0].preparedRequest);
  let calls = 0;
  const prepare = async () => { calls++; return { model: 'gpt-original', hash: original.audit.receiptHash }; };
  assert.deepEqual(await ledger.reconstruct(node, prepare), { model: 'gpt-original', hash: original.audit.receiptHash });
  assert.deepEqual(await ledger.reconstruct(node, prepare), { model: 'gpt-original', hash: original.audit.receiptHash });
  assert.equal(calls, 1);
});

test('public graph references require their emitted self-contained receipt', async t => {
  const { next } = await chain(t);
  const changed = structuredClone(next);
  changed.modelRejections[0].preparedRequest = { receiptRef: next.modelRejections[0].preparedRequest.audit.receiptHash };
  await assert.rejects(prepareT3Delegation(changed), /receipt node/);
});

test('captured compact receipts survive historical model removal and enforce the refreshed live catalog', async t => {
  const { next } = await chain(t);
  const current = structuredClone(next);
  current.modelRejections.at(-1).validModelIds = ['gpt-default-01'];
  current.catalog.providers[0].models = current.catalog.providers[0].models.filter(model => ['gpt-default-01', 'gpt-default-11'].includes(model.id));
  const prepared = await prepareT3Delegation(current);
  assert.deepEqual(prepared.arguments.target, target('gpt-default-01'));
  assert.equal(prepared.audit.selection.reason, 'model-valid-equivalent');
  assert.equal(prepared.audit.selection.rejectionProvenance.length, 3);
  const disabled = structuredClone(current);
  disabled.catalog.providers[0].canRunChildTask = false;
  await assert.rejects(prepareT3Delegation(disabled), /cannot run child tasks/);
  const unavailable = structuredClone(current);
  unavailable.catalog.providers[0].models = [{ id: 'gpt-default-11' }];
  await assert.rejects(prepareT3Delegation(unavailable), /BLOCKED: no observed valid equivalent/);
});

test('the CLI consumes full JSON receipts directly through successive refusals', async t => {
  const { args, ids } = await fixture(t);
  const file = path.join(args.cwd, 'input.json');
  let history = [];
  for (let i = 0; i < 4; i++) {
    await writeFile(file, JSON.stringify({ ...args, stepId: `cli-${i}`, modelRejections: history }));
    const { stdout } = await exec(process.execPath, [path.resolve('tools/t3-orchestration.mjs'), 'prepare', '--input', file]);
    const prepared = JSON.parse(stdout);
    assert.deepEqual(prepared.arguments.target, target(ids[i]));
    assert.equal(Object.keys(prepared.audit.preparation.ledger).length, i);
    history = [...history, rejection(prepared, ids.slice(i + 1))];
  }
});
