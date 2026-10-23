import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const runner = fileURLToPath(new URL('./fixtures/pi-rpc-parent.mjs', import.meta.url));
async function probe(config) {
  const root = await mkdtemp(join(tmpdir(), 'oms-pi-rpc-'));
  try {
    await mkdir(join(root, 'config'));
    await writeFile(join(root, 'config', 'role-contracts.json'), JSON.stringify({ schemaVersion: 1, target: 'pi', roles: {
      reader: { instructions: 'Read only.', writes: false },
    } }));
    const { stdout, stderr } = await execFileAsync(process.execPath, [runner, JSON.stringify({ ...config, root })], {
      timeout: 8000, maxBuffer: 65536, windowsHide: true,
    });
    assert.equal(stderr, '', 'isolated parent must not emit uncaught errors');
    return JSON.parse(stdout.trim());
  } finally {
    const pids = (await readFile(join(root, 'pids.jsonl'), 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).map(Number);
    for (const pid of pids) { try { process.kill(pid, 'SIGKILL'); } catch {} }
    await rm(root, { recursive: true, force: true });
  }
}
function failedAndUsable(result, error) {
  assert.equal(result.task?.status, 'failed');
  assert.equal(result.task.error, error);
  assert.equal(result.directAlive, false);
  assert.equal(result.recovery.task?.status, 'completed', 'parent can run another task after invalid RPC');
  assert.equal(result.recovery.task.output, '中文🙂 result');
  assert.equal(result.recovery.directAlive, false);
}

for (const record of [null, true, 7, 'text', [], {}, { type: 7 }, { type: '' },
  { type: 'tool_execution_start', toolCallId: {}, toolName: 'read' },
  { type: 'tool_execution_end', toolCallId: 'x', toolName: [] }]) {
  test(`invalid RPC envelope ${JSON.stringify(record)} fails without crashing the parent`, async () => {
    failedAndUsable(await probe({ mode: 'record', record }), 'Pi emitted invalid RPC message');
  });
}
const assistant = { role: 'assistant', provider: 'fixture', model: 'physical', content: [], stopReason: 'stop' };
for (const patch of [{ content: {} }, { content: null }, { content: [null] }, { content: [{ type: 'text', text: 7 }] },
  { content: [{ type: 'text' }] }, { provider: {} }, { model: [] }, { stopReason: {} }, { errorMessage: {} }]) {
  test(`invalid assistant ${JSON.stringify(patch)} fails without crashing the parent`, async () => {
    failedAndUsable(await probe({ mode: 'record', record: { type: 'message_end', message: { ...assistant, ...patch } } }),
      'Pi emitted invalid RPC message');
  });
}
for (const [responseCommand, responsePatch] of [
  ['get_available_models', { success: 'true' }], ['get_available_models', { id: [] }],
  ['get_available_models', { command: 7 }], ['get_available_models', { success: false, error: {} }],
  ['get_available_models', { data: { models: {} } }], ['get_available_models', { data: { models: [null] } }],
  ['get_state', { data: { model: { provider: {}, id: 'physical' }, thinkingLevel: 'low' } }],
  ['get_state', { data: { model: { provider: 'fixture', id: 'physical' }, thinkingLevel: 'low', sessionId: {} } }],
  ['get_state', { data: { model: { provider: 'fixture', id: 'physical' }, thinkingLevel: 'low', sessionFile: [] } }],
  ['get_available_thinking_levels', { data: { levels: 'low' } }], ['prompt', { data: { disposition: {} } }],
]) {
  test(`invalid ${responseCommand} response ${JSON.stringify(responsePatch)} is a bounded failure`, async () => {
    failedAndUsable(await probe({ mode: 'response', responseCommand, responsePatch }), 'Pi emitted invalid RPC message');
  });
}
test('valid split UTF-8 and unknown well-formed events preserve success', async () => {
  const result = await probe({ mode: 'valid' });
  assert.equal(result.task.status, 'completed');
  assert.equal(result.task.output, '中文🙂 result');
  assert.equal(result.task.error, null);
  assert.equal(result.directAlive, false);
});
test('trailing RPC data still prevents clean-exit completion', async () => {
  failedAndUsable(await probe({ mode: 'trailing' }), 'Pi exited with incomplete RPC JSON');
});
for (const mode of ['inherited-stdout', 'inherited-stderr']) {
  test(`${mode} cannot hold stop after direct-child exit`, async () => {
    const result = await probe({ mode });
    assert(result.exit, 'stop must finish while a descendant still holds a pipe');
    assert.equal(result.exit.failure, 'Pi stdio did not close within 250ms after child exit');
    assert.deepEqual(result.failures, [result.exit.failure]);
    assert.equal(result.sameStop, true);
    assert.equal(result.directAlive, false);
    assert.equal(result.descendantAlive, true, 'draining must not kill descendants');
    if (process.platform !== 'win32') {
      assert.equal(result.exit.code, null);
      assert.equal(result.exit.signal, 'SIGKILL');
    }
  });
}
test('termination twice waits for the delayed direct child, then reports its real exit', async () => {
  const result = await probe({ mode: 'delayed-exit' });
  assert.equal(result.sameStop, true);
  if (process.platform !== 'win32') assert.deepEqual(result.early, { resolved: false, directAlive: true });
  assert(result.exit);
  assert.equal(result.exit.failure, 'fixture termination');
  assert.deepEqual(result.failures, ['fixture termination']);
  assert.equal(result.directAlive, false);
  if (process.platform !== 'win32') {
    assert.equal(result.exit.code, null);
    assert.equal(result.exit.signal, 'SIGKILL');
  }
});
test('manager cancellation stays running while its delayed direct child is alive', async () => {
  const result = await probe({ mode: 'manager-cancel-delayed' });
  if (process.platform !== 'win32') assert.deepEqual(result.early, { resolved: false, status: 'running', directAlive: true });
  assert.equal(result.task?.status, 'cancelled');
  assert.equal(result.task.error, 'Pi delegation cancelled');
  assert.equal(result.directAlive, false);
});
test('manager cannot complete successfully after inherited-pipe drain expires', async () => {
  failedAndUsable(await probe({ mode: 'manager-inherited-stdout' }), 'Pi stdio did not close within 250ms after child exit');
});
test('spawn failure closes idempotently without a nonexistent live child', async () => {
  const result = await probe({ mode: 'spawn-error' });
  assert(result.exit);
  assert.match(result.exit.failure, /ENOENT/);
  assert.equal(result.sameStop, true);
  assert.equal(result.directAlive, false);
});
test('manager reports spawn failure and remains usable', async () => {
  const result = await probe({ mode: 'manager-spawn-error' });
  assert.equal(result.task.status, 'failed');
  assert.match(result.task.error, /ENOENT/);
  assert.equal(result.directAlive, false);
  assert.equal(result.recovery.task.status, 'completed');
});
