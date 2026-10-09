import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, writeFileSync } from 'node:fs';
import fsPromises from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { appendFile, copyFile, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { verifyNativeAttribution } from '../tools/delivery-native-attribution.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const line = (type, payload) => ({ type, payload });
const fence = (name, value) => '```' + name + '\n' + JSON.stringify(value) + '\n```';
const serialize = values => values.map(value => JSON.stringify(value)).join('\n') + '\n';

async function fixture(t, { kind = 'writer', childId = 'writer-id', assignmentId = 'write-unit' } = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'oms-native-fixture-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bytes = Buffer.from('actual fixture output\n');
  await writeFile(join(root, 'output.md'), bytes);
  const outputs = [{ id: 'src/output.md', path: 'output.md', sha256: digest(bytes) }];
  const reviews = kind === 'writer' ? [] : [{ id: 'unit-a', sha256: digest('frozen unit tree') }];
  const taskName = kind === 'writer' ? 'write_unit' : 'review_unit';
  const shared = { schemaVersion: 1, taskId: 'task-a', lockSha256: digest('lock'), assignmentId, kind };
  const assignment = { ...shared, taskName, outputs: outputs.map(({ id, path }) => ({ id, path })), reviews };
  const completion = { ...shared, outputs, reviews, ...(kind === 'review' ? { verdict: 'accepted' } : {}) };
  const request = { task_name: taskName, fork_turns: 'none', model: 'gpt-6.1-sol', reasoning_effort: 'high',
    message: 'Complete role instructions and bounded task.\n' + fence('oms-delivery-assignment-v1', assignment),
    audit: { contractSha256: digest('contract'), role: kind === 'writer' ? 'implementer' : 'reviewer', route: null } };
  const parent = [line('session_meta', { id: 'parent-id', cwd: '/a/different/original/checkout' }),
    line('response_item', { type: 'function_call', name: 'spawn_agent', arguments: JSON.stringify({
      task_name: request.task_name, fork_turns: request.fork_turns, model: request.model,
      reasoning_effort: request.reasoning_effort, message: request.message,
    }) })];
  const child = [line('session_meta', { id: childId, source: { subagent: { thread_spawn: {
    parent_thread_id: 'parent-id', agent_path: '/root/' + taskName,
  } } } }), line('turn_context', { model: request.model, effort: request.reasoning_effort }),
  line('response_item', { type: 'message', role: 'assistant', phase: 'final_answer',
    content: [{ type: 'output_text', text: 'Completed fixture.\n' + fence('oms-delivery-completion-v1', completion) + '\nROLE_POLICY=bounded-implementation-only' }] }),
  line('event_msg', { type: 'task_complete' })];
  const authority = { kind: 'codex-native', assignmentId, requestPath: join(root, 'request.json'),
    parentRecordPath: join(root, 'parent.jsonl'), childRecordPath: join(root, 'child.jsonl') };
  const input = { root, authority, taskId: shared.taskId, lockSha256: shared.lockSha256, expectedParentId: 'parent-id',
    expectedAssignment: { assignmentId, taskName, kind }, outputs, reviews };
  const save = async () => Promise.all([writeFile(authority.requestPath, JSON.stringify(request)),
    writeFile(authority.parentRecordPath, serialize(parent)), writeFile(authority.childRecordPath, serialize(child))]);
  const updateCompletion = update => {
    update(completion);
    child[2].payload.content[0].text = fence('oms-delivery-completion-v1', completion);
  };
  await save();
  return { input, root, request, parent, child, assignment, completion, save, updateCompletion };
}

test('real-shaped final_answer records verify bounded writer and accepted judge attribution', async t => {
  const writer = await fixture(t);
  const judge = await fixture(t, { kind: 'review', childId: 'judge-id', assignmentId: 'judge-unit' });
  const a = await verifyNativeAttribution(writer.input); const b = await verifyNativeAttribution(judge.input);
  assert.equal(a.status, 'verified'); assert.equal(b.status, 'verified');
  assert.notEqual(a.childId, b.childId); assert.equal(a.model, b.model);
  assert.equal(a.claim, 'runtime-recorded-task-attribution'); assert.equal(a.messageAudit, 'exact-parent-record-match');
  assert.equal(a.recordAudit.parent.prefixBytes, Buffer.byteLength(serialize(writer.parent)));
  assert.equal(a.recordAudit.child.finalRecordIndex, 2);
  assert.ok(a.limitations.some(value => value.includes('do not prove artifact authorship')));
  assert.ok(a.limitations.some(value => value.includes('model diversity')));
  assert.equal(JSON.stringify(a).includes('Complete role instructions'), false);
});

test('swapped parent, child, task name and unrelated valid receipt fail closed', async t => {
  for (const mutation of [
    f => { f.child[0].payload.source.subagent.thread_spawn.parent_thread_id = 'other-parent'; },
    f => { f.child[0].payload.source.subagent.thread_spawn.agent_path = '/root/unrelated'; },
    f => { f.parent[0].payload.id = 'other-parent'; f.child[0].payload.source.subagent.thread_spawn.parent_thread_id = 'other-parent'; },
    f => { f.updateCompletion(value => { value.assignmentId = 'unrelated-valid-task'; }); },
    f => { f.child[2].payload.content[0].text = 'Unrelated successful native task without a declaration.'; },
  ]) {
    const f = await fixture(t); mutation(f); await f.save();
    assert.equal((await verifyNativeAttribution(f.input)).status, 'rejected');
  }
});

test('encrypted parent is INDEPENDENCE_UNVERIFIED even when existing linkage accepts it', async t => {
  const f = await fixture(t);
  const args = JSON.parse(f.parent[1].payload.arguments); args.message = 'gAAAAABencryptedplaceholder==';
  f.parent[1].payload.arguments = JSON.stringify(args); await f.save();
  const result = await verifyNativeAttribution(f.input);
  assert.equal(result.status, 'inconclusive'); assert.equal(result.code, 'INDEPENDENCE_UNVERIFIED');
  assert.match(result.reason, /Encrypted parent/);
});

test('output bytes, output paths, lock and review targets cannot be swapped', async t => {
  for (const mutation of [
    async f => writeFile(join(f.root, 'output.md'), 'changed output'),
    async f => { f.updateCompletion(value => { value.outputs = [{ ...value.outputs[0], path: 'other.md' }]; }); },
    async f => { f.updateCompletion(value => { value.lockSha256 = digest('another lock'); }); },
    async f => { f.updateCompletion(value => { value.outputs = [{ ...value.outputs[0], sha256: digest('old output') }]; }); },
    async f => { f.updateCompletion(value => { value.reviews = [{ id: 'unit-a', sha256: digest('stale tree') }]; }); },
    async f => { f.input.reviews = [{ id: 'unit-a', sha256: digest('different current tree') }]; },
    async f => { f.updateCompletion(value => { value.reviews = []; }); },
    async f => { f.input.authority.assignmentId = 'different-lock-assignment'; },
  ]) {
    const f = await fixture(t, { kind: 'review' }); await mutation(f); await f.save();
    assert.equal((await verifyNativeAttribution(f.input)).status, 'rejected');
  }
});

test('user, commentary, tool and function-call declaration text cannot become final authority', async t => {
  for (const envelope of [
    { type: 'message', role: 'user', phase: 'final_answer' },
    { type: 'message', role: 'assistant', phase: 'commentary' },
    { type: 'message', role: 'assistant', channel: 'final' },
    { type: 'function_call', name: 'writeFile', arguments: '{}' },
    { type: 'function_call_output', call_id: 'tool', output: '{}' },
  ]) {
    const f = await fixture(t); f.child[2].payload = { ...envelope, content: f.child[2].payload.content };
    await f.save(); const result = await verifyNativeAttribution(f.input);
    assert.equal(result.status, 'inconclusive'); assert.equal(result.code, 'INDEPENDENCE_UNVERIFIED');
  }
  const f = await fixture(t); f.child[2].payload.content = [{ type: 'encrypted_text', text: 'gAAAAABencrypted==' }];
  await f.save(); assert.equal((await verifyNativeAttribution(f.input)).status, 'inconclusive');
});

test('copied record aliases retain canonical child identity for checker self-review comparison', async t => {
  const f = await fixture(t); const a = await verifyNativeAttribution(f.input);
  const alias = join(f.root, 'alias.jsonl'); await copyFile(f.input.authority.childRecordPath, alias);
  const b = await verifyNativeAttribution({ ...f.input, authority: { ...f.input.authority, childRecordPath: alias } });
  assert.equal(a.status, 'verified'); assert.equal(b.status, 'verified');
  assert.equal(a.childId, b.childId);
  assert.notEqual(a.recordAudit.child.path, b.recordAudit.child.path);
});

test('later activity, multiple finals, duplicate blocks and changes-required never pass', async t => {
  for (const mutation of [
    f => { f.child.push(line('turn_context', { model: f.request.model, effort: f.request.reasoning_effort })); },
    f => { f.child.push(line('response_item', { type: 'message', role: 'user', content: [] })); },
    f => { f.child.push(line('response_item', { type: 'function_call', name: 'exec_command', arguments: '{}' })); },
    f => { f.child.push(structuredClone(f.child[2])); },
    f => { f.child[2].payload.content[0].text += '\n' + fence('oms-delivery-completion-v1', f.completion); },
    f => { f.updateCompletion(value => { value.verdict = 'changes-required'; }); },
  ]) {
    const f = await fixture(t, { kind: 'review' }); mutation(f); await f.save();
    assert.equal((await verifyNativeAttribution(f.input)).status, 'rejected');
  }
});

test('detached verification flags, host backing conversations and role or inherited spawns have no authority', async t => {
  const f = await fixture(t);
  for (const authority of [
    { ...f.input.authority, verified: true },
    { kind: 'host-owned', nativeRecordPath: f.input.authority.childRecordPath, verified: true },
  ]) assert.notEqual((await verifyNativeAttribution({ ...f.input, authority })).status, 'verified');
  for (const mutation of [
    f => { f.request.verified = true; },
    f => { f.request.fork_turns = 'all'; },
    f => { const args = JSON.parse(f.parent[1].payload.arguments); args.agent_type = 'worker'; f.parent[1].payload.arguments = JSON.stringify(args); },
  ]) {
    const g = await fixture(t); mutation(g); await g.save();
    assert.equal((await verifyNativeAttribution(g.input)).status, 'rejected');
  }
});

test('model drift, missing contexts, repeated spawn and metadata identities are rejected', async t => {
  for (const mutation of [
    f => { f.child[1].payload.model = 'another-model'; },
    f => { f.child[1].payload.effort = 'medium'; },
    f => { f.child.splice(1, 1); },
    f => { f.parent.push(structuredClone(f.parent[1])); },
    f => { f.parent.push(structuredClone(f.parent[0])); },
    f => { f.child.unshift(structuredClone(f.child[0])); },
  ]) {
    const f = await fixture(t); mutation(f); await f.save();
    assert.equal((await verifyNativeAttribution(f.input)).status, 'rejected');
  }
});

test('strict protocol refuses unknown keys, duplicate targets and unexpected assignment scope', async t => {
  for (const mutation of [
    f => { f.updateCompletion(value => { value.verified = true; }); },
    f => { f.updateCompletion(value => { value.outputs = [...value.outputs, value.outputs[0]]; }); },
    f => { f.updateCompletion(value => { value.reviews = [...value.reviews, value.reviews[0]]; }); },
    f => { f.child[2].payload.content[0].text = fence('oms-delivery-completion-v1', f.completion).replace('\"kind\":\"review\"', '\"kind\":\"writer\",\"kind\":\"review\"'); },
    f => { f.input.expectedAssignment.taskName = 'wrong_task'; },
    f => { f.input.expectedAssignment.kind = 'writer'; },
    f => { f.request.message += '\n' + fence('oms-delivery-assignment-v1', f.assignment);
      const args = JSON.parse(f.parent[1].payload.arguments); args.message = f.request.message; f.parent[1].payload.arguments = JSON.stringify(args); },
  ]) {
    const f = await fixture(t, { kind: 'review' }); mutation(f); await f.save();
    assert.equal((await verifyNativeAttribution(f.input)).status, 'rejected');
  }
});

test('benign parent append preserves a bounded prefix and its digest', async t => {
  const f = await fixture(t); const before = await verifyNativeAttribution(f.input);
  await appendFile(f.input.authority.parentRecordPath, serialize([line('response_item', {
    type: 'message', role: 'assistant', phase: 'commentary', content: [{ type: 'output_text', text: 'Unrelated root progress.' }],
  })]));
  const after = await verifyNativeAttribution(f.input);
  assert.equal(after.status, 'verified');
  assert.deepEqual(after.recordAudit.parent, before.recordAudit.parent);
});

test('during-read parent prefix and child mutation reject, benign concurrent append passes', async t => {
  for (const mutation of ['parent-prefix', 'child', 'append']) {
    const f = await fixture(t); let mutated = false;
    // Intercept the second open of the original coordinate (its final reread)
    // to create a deterministic concurrent change, without a production hook.
    const selected = mutation === 'child' ? f.input.authority.childRecordPath : f.input.authority.parentRecordPath;
    const originalOpen = fsPromises.open; let reads = 0;
    fsPromises.open = async (...args) => {
      if (args[0] === selected && ++reads === 2) {
        mutated = true;
        if (mutation === 'append') appendFileSync(f.input.authority.parentRecordPath, serialize([line('event_msg', { type: 'root-progress' })]));
        else if (mutation === 'parent-prefix') writeFileSync(f.input.authority.parentRecordPath, serialize(f.parent).replace('parent-id', 'changed-id'));
        else appendFileSync(f.input.authority.childRecordPath, serialize([line('turn_context', { model: f.request.model, effort: f.request.reasoning_effort })]));
      }
      return originalOpen(...args);
    };
    syncBuiltinESMExports();
    let result;
    try { result = await verifyNativeAttribution(f.input); }
    finally { fsPromises.open = originalOpen; syncBuiltinESMExports(); }
    assert.ok(mutated, 'original record mutated after snapshot began');
    assert.equal(result.status, mutation === 'append' ? 'verified' : 'rejected');
    if (mutation !== 'append') assert.match(result.reason, /changed during attribution/);
  }
});
