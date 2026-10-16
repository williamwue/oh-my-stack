import { spawn } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const { root, mode, record, responsePatch, responseCommand } = JSON.parse(process.env.PI_RPC_FIXTURE);
appendFileSync(join(root, 'pids.jsonl'), `${process.pid}\n`);
const emit = value => process.stdout.write(`${JSON.stringify(value)}\n`);
const model = { provider: 'fixture', id: 'physical', api: 'openai-completions' };
const reader = createInterface({ input: process.stdin });

if (mode === 'inherited-stdout' || mode === 'inherited-stderr') {
  const descendant = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    stdio: ['ignore', mode === 'inherited-stdout' ? 1 : 'ignore', mode === 'inherited-stderr' ? 2 : 'ignore'],
  });
  appendFileSync(join(root, 'pids.jsonl'), `${descendant.pid}\n`);
  writeFileSync(join(root, 'descendant.pid'), String(descendant.pid));
  emit({ type: 'ready' });
  setInterval(() => {}, 1000);
}
if (mode === 'delayed-exit' || mode === 'cancel-delayed') {
  process.on('SIGTERM', () => {});
  if (mode === 'delayed-exit') emit({ type: 'ready' });
  setInterval(() => {}, 1000);
}
reader.on('line', line => {
  const request = JSON.parse(line);
  let data;
  if (request.type === 'get_available_models') data = { models: [model] };
  if (request.type === 'get_state') data = { model, thinkingLevel: 'low' };
  if (request.type === 'get_available_thinking_levels') data = { levels: ['off', 'low'] };
  if (request.type === 'prompt') data = { disposition: 'started' };
  const response = { type: 'response', id: request.id, command: request.type, success: true, data };
  emit(request.type === responseCommand ? { ...response, ...responsePatch } : response);
  if (request.type !== 'prompt' || responseCommand) return;
  if (mode === 'cancel-delayed') {
    writeFileSync(join(root, 'prompt.ready'), 'ready');
    return;
  }
  if (mode === 'record') {
    emit(record);
    emit({ type: 'agent_settled' });
    return;
  }
  const message = { type: 'message_end', message: { role: 'assistant', provider: 'fixture', model: 'physical',
    content: [{ type: 'text', text: '中文🙂 result' }], stopReason: 'stop' } };
  const bytes = Buffer.from(`${JSON.stringify(message)}\n`);
  const split = bytes.indexOf(Buffer.from('中文')) + 1;
  process.stdout.write(bytes.subarray(0, split));
  setTimeout(() => {
    process.stdout.write(bytes.subarray(split, split + 3));
    setTimeout(() => {
      process.stdout.write(bytes.subarray(split + 3));
      emit({ type: 'future_event', payload: { version: 2 } });
      emit({ type: 'agent_settled' });
      if (mode === 'trailing') process.stdout.write('{"type":');
    }, 10);
  }, 10);
});
reader.on('close', () => {
  if (!['inherited-stdout', 'inherited-stderr', 'delayed-exit', 'cancel-delayed'].includes(mode)) process.exit(0);
});
