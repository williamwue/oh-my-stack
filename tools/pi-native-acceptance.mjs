import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPiRpcConnection, createPiDelegationManager } from './pi-delegation.mjs';
import { collectPiInventory } from './pi-inventory.mjs';

/** Real installed Pi lifecycle against a simulated local provider, never a live account. */
export async function runPiNativeAcceptance({ binary, packageRoot } = {}) {
  const temporary = await mkdtemp(join(tmpdir(), 'oms-pi-native-'));
  const agentDir = join(temporary, 'native-agent');
  const bundle = packageRoot ?? join(temporary, 'package');
  const cwd = join(temporary, 'checkout');
  await mkdir(agentDir); await mkdir(cwd);
  const manifest = { schemaVersion: 1, owner: 'oh-my-stack', target: 'pi', routes: {
    fixture: { kind: 'single', role: 'reader', entries: [{ model: 'oms-local/child', reasoning: 'none' }] },
  } };
  await mkdir(join(cwd, '.pi'));
  await writeFile(join(cwd, '.pi', 'oh-my-stack.resolution.json'), JSON.stringify(manifest));
  if (!packageRoot) {
    await mkdir(join(bundle, 'extensions'), { recursive: true });
    await mkdir(join(bundle, 'scripts')); await mkdir(join(bundle, 'config'));
    const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    await copyFile(join(sourceRoot, 'src/runtime/pi/extension.ts'), join(bundle, 'extensions/oms.ts'));
    await copyFile(join(sourceRoot, 'tools/pi-delegation.mjs'), join(bundle, 'scripts/pi-delegation.mjs'));
    // Fixture implements the frozen host resolver interface; integrated package mode uses actual host code.
    await writeFile(join(bundle, 'scripts/model-resolution.mjs'), `import {readFile} from 'node:fs/promises';import {join} from 'node:path';export async function resolveActiveResolution({runtime,cwd}){if(runtime!=='pi')throw Error('wrong runtime');return {manifest:JSON.parse(await readFile(join(cwd,'.pi','oh-my-stack.resolution.json'),'utf8'))}}`);
    await writeFile(join(bundle, 'config/role-contracts.json'), JSON.stringify({ schemaVersion: 1, target: 'pi', roles: {
      reader: { description: 'Local acceptance reader', instructions: 'Read the explicit fixture only.', writes: false, constraints: [] },
    } }));
  } else {
    const contracts = JSON.parse(await readFile(join(bundle, 'config/role-contracts.json'), 'utf8'));
    const role = Object.entries(contracts.roles).find(([, value]) => value.writes === false);
    assert(role, 'packaged acceptance needs a readonly role');
    manifest.routes.fixture.role = role[0];
    await writeFile(join(cwd, '.pi', 'oh-my-stack.resolution.json'), JSON.stringify(manifest));
  }
  const requests = [];
  let parentRound = 0;
  let nativeToolObserved = false;
  let fixtureError;
  const server = createServer(async (request, response) => {
    try {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const text = JSON.stringify(body.messages ?? []);
    requests.push({ model: body.model, hold: text.includes('hold-child'), retry: text.includes('retry-child') });
    if (text.includes('retry-child')) { response.writeHead(503, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: { message: 'local simulated overload', type: 'server_error' } })); return; }
    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
    if (text.includes('hold-child') && body.model === 'child') return;
    let delta = { content: 'Native local fixture completed.' }, finish = 'stop';
    if (body.model === 'parent') {
      if (text.includes('shutdown-parent') && parentRound > 0) return;
      nativeToolObserved ||= body.tools?.some(tool => tool.function?.name === 'oms_delegate') === true;
      if (parentRound === 0) {
        delta = { tool_calls: [{ index: 0, id: 'oms-start', type: 'function', function: { name: 'oms_delegate', arguments: JSON.stringify({ action: 'start', route: 'fixture', task: text.includes('shutdown-parent') ? 'hold-child' : 'Read the local fixture', cwd }) } }] }; finish = 'tool_calls';
      } else if (parentRound === 1) {
        const result = [...body.messages].reverse().find(message => message.role === 'tool');
        if (!nativeToolObserved) { response.end('data: [DONE]\n\n'); return; }
        const collected = JSON.parse(typeof result.content === 'string' ? result.content : result.content[0].text);
        delta = { tool_calls: [{ index: 0, id: 'oms-collect', type: 'function', function: { name: 'oms_delegate', arguments: JSON.stringify({ action: 'collect', id: collected.id, wait: true }) } }] }; finish = 'tool_calls';
      } else {
        const result = [...body.messages].reverse().find(message => message.role === 'tool');
        const collected = JSON.parse(typeof result.content === 'string' ? result.content : result.content[0].text);
        assert.equal(collected.status, 'completed');
        assert.equal(collected.observed.model, 'oms-local/child');
      }
      parentRound++;
    }
    const frame = (deltaValue, finishReason) => `data: ${JSON.stringify({ id: 'local-response', object: 'chat.completion.chunk', created: 1, model: body.model, choices: [{ index: 0, delta: deltaValue, finish_reason: finishReason }] })}\n\n`;
    response.write(frame(delta, null)); response.write(frame({}, finish)); response.end('data: [DONE]\n\n');
    } catch (error) { fixtureError ??= error; response.destroy(); }
  });
  await new Promise(resolvePromise => server.listen(0, '127.0.0.1', resolvePromise));
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
    PI_CODING_AGENT_DIR: agentDir, PI_SKIP_VERSION_CHECK: '1' };
  if (typeof binary === 'object' && binary.args.length === 1) {
    env.OMS_PI_BINARY = binary.command; env.OMS_PI_CLI = binary.args[0];
  } else if (typeof binary === 'string') env.OMS_PI_BINARY = binary;
  await writeFile(join(agentDir, 'models.json'), JSON.stringify({ providers: { 'oms-local': {
    api: 'openai-completions', baseUrl: `http://127.0.0.1:${server.address().port}/v1`, apiKey: 'local-dummy-not-a-secret',
    models: ['child', 'parent'].map(id => ({ id, reasoning: false, input: ['text'], contextWindow: 32768, maxTokens: 2048 })),
  } } }));
  const settings = JSON.stringify({ retry: { enabled: true, maxRetries: 2, baseDelayMs: 2500 }, compaction: { enabled: false } });
  await writeFile(join(agentDir, 'settings.json'), settings);
  const manager = createPiDelegationManager({ binary, packageRoot: bundle, env,
    resolveResolution: async () => ({ manifest }), taskTimeoutMs: 30000 });
  let parent;
  try {
    const inventory = await collectPiInventory({ binary, cwd, env });
    assert.deepEqual(inventory.models.filter(model => model.id.startsWith('oms-local/')).map(model => model.reasoningEfforts), [['none'], ['none']]);
    assert.equal(await readFile(join(agentDir, 'settings.json'), 'utf8'), settings, 'native inventory must not persist settings');
    const start = await manager.execute({ action: 'start', route: 'fixture', task: 'Read the local fixture', cwd }, { cwd });
    const normal = await manager.execute({ action: 'collect', id: start.id, wait: true });
    assert.equal(normal.status, 'completed'); assert.deepEqual(normal.selected, normal.observed);
    const hold = await manager.execute({ action: 'start', route: 'fixture', task: 'hold-child', cwd }, { cwd });
    const deadline = Date.now() + 15000;
    while (!requests.some(request => request.hold)) {
      if (Date.now() >= deadline) throw new Error('native cancellation fixture request did not start');
      await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
    }
    const cancelled = await manager.execute({ action: 'cancel', id: hold.id });
    assert.equal(cancelled.status, 'cancelled'); assert.throws(() => process.kill(hold.pid, 0));
    const retry = await manager.execute({ action: 'start', route: 'fixture', task: 'retry-child', cwd }, { cwd });
    const rejected = await manager.execute({ action: 'collect', id: retry.id, wait: true });
    assert.equal(rejected.status, 'failed');
    assert.equal(requests.filter(request => request.retry).length, 1, 'native retry must be stopped before a second provider request');
    parent = createPiRpcConnection({ binary, cwd, env, args: ['--provider', 'oms-local', '--model', 'parent', '--thinking', 'off', '--tools', 'read,oms_delegate', '-e', join(bundle, 'extensions/oms.ts')] });
    const toolEvents = [];
    const diagnostics = [];
    parent.events.on('diagnostic', value => diagnostics.push(value));
    let resolveParent;
    const parentComplete = new Promise(resolvePromise => { resolveParent = resolvePromise; });
    parent.events.on('event', event => { toolEvents.push(event); if (event.type === 'agent_settled') resolveParent(); });
    await parent.request('get_state');
    await parent.request('prompt', { message: 'Invoke OMS start, collect, then report the fixture result.' });
    await Promise.race([parentComplete, new Promise((_, reject) => setTimeout(() => reject(new Error('native extension tool execution timed out')), 20000).unref())]);
    assert(nativeToolObserved, `native provider request must advertise registered oms_delegate tool: ${diagnostics.join('').slice(0, 4096)} ${JSON.stringify(toolEvents.filter(event => event.type.includes('extension'))).slice(0,4096)}`);
    assert.equal(parentRound, 3, 'native parent must execute start, collect and final response');
    const results = toolEvents.filter(event => event.type === 'tool_execution_end' && event.toolName === 'oms_delegate');
    assert.equal(results.length, 2); assert(results.every(event => event.isError !== true));
    const exit = await parent.stop(); assert.equal(exit.code, 0); assert.equal(exit.failure, null);
    parentRound = 0;
    parent = createPiRpcConnection({ binary, cwd, env, args: ['--provider', 'oms-local', '--model', 'parent', '--thinking', 'off', '--tools', 'read,oms_delegate', '-e', join(bundle, 'extensions/oms.ts')] });
    let runningChild;
    parent.events.on('event', event => {
      if (event.type === 'tool_execution_end' && event.toolName === 'oms_delegate' && !event.isError) {
        runningChild = event.result?.details ?? JSON.parse(event.result.content[0].text);
      }
    });
    await parent.request('get_state');
    const holdsBefore = requests.filter(request => request.hold && request.model === 'child').length;
    await parent.request('prompt', { message: 'shutdown-parent: start the waiting child.' });
    const shutdownDeadline = Date.now() + 15000;
    while (!runningChild || requests.filter(request => request.hold && request.model === 'child').length <= holdsBefore) {
      if (Date.now() >= shutdownDeadline) throw new Error('native shutdown fixture child did not start');
      await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
    }
    const shutdownExit = await parent.stop();
    assert.equal(shutdownExit.code, 0); assert.throws(() => process.kill(runningChild.pid, 0));
    if (fixtureError) throw fixtureError;
    assert.equal(await readFile(join(agentDir, 'settings.json'), 'utf8'), settings, 'acceptance must preserve native settings');
    return { native: true, provider: 'simulated local OpenAI-compatible fixture', liveAccount: false,
      fixtureHostResolver: !packageRoot, extensionDiscovery: true, nativeToolStartCollect: true,
      childExecution: normal.status, childCancellation: cancelled.status, nativeParentShutdown: true, retryRequests: 1,
      inventoryModels: inventory.models.length, selected: normal.selected, observed: normal.observed };
  } finally {
    await manager.shutdown(); await parent?.stop();
    server.closeAllConnections(); await new Promise(resolvePromise => server.close(resolvePromise));
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const values = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, index, args) => index % 2 ? pairs : [...pairs, [arg, args[index + 1]]], []));
  if (Object.keys(values).some(key => !['--cli', '--binary', '--package'].includes(key))) throw new Error('use --cli PiCLI.js and optional --binary node --package PiPackageRoot');
  const binary = values['--cli'] ? { command: values['--binary'] ?? process.execPath, args: [values['--cli']] } : values['--binary'];
  runPiNativeAcceptance({ binary, packageRoot: values['--package'] }).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.stack); process.exitCode = 1; });
}
