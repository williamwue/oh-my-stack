import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPiDelegationManager, createPiRpcConnection, PI_ISOLATION_ARGS } from '../tools/pi-delegation.mjs';
import { collectPiInventory } from '../tools/pi-inventory.mjs';

const fake = String.raw`
import { createInterface } from 'node:readline';
import { appendFileSync } from 'node:fs';
const args=process.argv.slice(2), value=k=>args[args.indexOf(k)+1];
let model={provider:value('--provider')||'fixture',id:value('--model')||'first'},level=value('--thinking')||'off';
const emit=x=>process.stdout.write(JSON.stringify(x)+'\n');
createInterface({input:process.stdin}).on('line',line=>{
 const r=JSON.parse(line); if(process.env.PI_TEST_LOG)appendFileSync(process.env.PI_TEST_LOG,JSON.stringify({type:r.type,args})+'\n');
 let data;
 if(r.type==='get_available_models')data={models:[{provider:'fixture',id:'first',api:process.env.PI_TEST_MODE==='virtual'?'pi-virtual':'openai-completions'},{provider:'fixture',id:'second'}]};
 if(r.type==='set_model')model={provider:r.provider,id:r.modelId};
 if(r.type==='get_state')data={model,thinkingLevel:process.env.PI_TEST_MODE==='mismatch'?'high':level};
 if(r.type==='get_available_thinking_levels')data={levels:model.id==='first'?['off','low','high']:['off']};
 if(r.type==='prompt'){
   data={disposition:'started'};
   setTimeout(()=>{
     if(process.env.PI_TEST_MODE==='hang')return;
     if(process.env.PI_TEST_MODE==='retry'){emit({type:'auto_retry_start',delayMs:1000});return;}
     emit({type:'message_end',message:{role:'assistant',provider:model.provider,model:process.env.PI_TEST_MODE==='wrong-model'?'other':model.id,content:[{type:'text',text:'fixture result'}],stopReason:process.env.PI_TEST_MODE==='error'?'error':'stop',errorMessage:'fixture provider failed'}});
     emit({type:'agent_settled'});
     if(process.env.PI_TEST_MODE==='nonzero')process.exit(7);
   },20);
 }
 emit({id:r.id,type:'response',command:r.type,success:true,data});
}).on('close',()=>process.exit(0));
`;
async function fixture(t, mode) {
  const root = await mkdtemp(join(tmpdir(), 'oms pi fixture '));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'config'));
  await writeFile(join(root, 'config', 'role-contracts.json'), JSON.stringify({ schemaVersion: 1, target: 'pi', roles: {
    reader: { instructions: 'Inspect the fixture only.', writes: false },
    writer: { instructions: 'Edit the isolated fixture.', writes: true },
  } }));
  const cli = join(root, 'fake rpc.mjs'); await writeFile(cli, fake);
  const log = join(root, 'requests.jsonl');
  const manifest = { target: 'pi', routes: {
    panel: { role: 'reader', entries: [{ model: 'fixture/first', reasoning: 'low' }, { model: 'fixture/second', reasoning: 'none' }] },
    writer: { role: 'writer', entries: [{ model: 'fixture/first', reasoning: 'low' }] },
    missing: { role: 'reader', entries: [{ model: 'extension/only', reasoning: 'low' }] },
  } };
  const binary = { command: process.execPath, args: [cli] };
  const env = { ...process.env, PI_TEST_LOG: log, PI_TEST_MODE: mode ?? '' };
  const manager = createPiDelegationManager({ binary, packageRoot: root, env, timeoutMs: 1000,
    taskTimeoutMs: 1500, resolveResolution: async () => ({ manifest }) });
  t.after(() => manager.shutdown());
  return { root, manager, binary, log, env, manifest };
}
async function run(manager, root, extra = {}) {
  const initial = await manager.execute({ action: 'start', route: 'panel', task: 'Inspect', cwd: root, ...extra }, { cwd: root });
  return manager.execute({ action: 'collect', id: initial.id, wait: true });
}

test('Pi native RPC inventory uses model-specific advertised levels without persistent settings commands', async t => {
  const f = await fixture(t);
  const inventory = await collectPiInventory({ binary: f.binary, cwd: f.root, env: f.env });
  assert.deepEqual(inventory.models, [{ id: 'fixture/first', reasoningEfforts: ['none', 'low', 'high'] }, { id: 'fixture/second', reasoningEfforts: ['none'] }]);
  const requests = (await readFile(f.log, 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(requests.filter(r => r.type === 'set_model').length, 2);
  assert(!requests.some(r => ['set_auto_retry', 'set_auto_compaction', 'prompt'].includes(r.type)));
});
test('start/collect respects one-based membership, immutable results and native observed identity', async t => {
  const f = await fixture(t);
  const result = await run(f.manager, f.root, { member: 2 });
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.selected, { model: 'fixture/second', thinking: 'off' });
  assert.deepEqual(result.observed, result.selected);
  assert.equal(result.output, 'fixture result');
  const repeat = await f.manager.execute({ action: 'collect', id: result.id });
  assert.deepEqual(repeat, result);
  result.output = 'modified';
  assert.equal((await f.manager.execute({ action: 'collect', id: result.id })).output, 'fixture result');
  const requests = (await readFile(f.log, 'utf8')).trim().split('\n').map(JSON.parse);
  assert(PI_ISOLATION_ARGS.every(arg => requests[0].args.includes(arg)));
  assert.equal(requests[0].args[requests[0].args.indexOf('--tools') + 1], 'read,grep,find,ls');
  assert.equal(requests.filter(r => r.type === 'prompt').length, 1);
});
for (const mode of ['error', 'nonzero', 'retry', 'mismatch', 'virtual', 'wrong-model']) test(`native ${mode} cannot masquerade as success`, async t => {
  const f = await fixture(t, mode);
  const result = await run(f.manager, f.root);
  assert.equal(result.status, 'failed'); assert(result.error);
});
test('extension-only provider rejects before native prompt', async t => {
  const f = await fixture(t);
  const result = await run(f.manager, f.root, { route: 'missing' });
  assert.equal(result.status, 'failed'); assert.match(result.error, /does not advertise/);
  assert(!JSON.parse((await readFile(f.log, 'utf8')).trim().split('\n')[0]).type.includes('prompt'));
  assert(!(await readFile(f.log, 'utf8')).includes('"type":"prompt"'));
});
test('cancel and shutdown terminate child processes, including parent cancellation', async t => {
  const f = await fixture(t, 'hang');
  const controller = new AbortController();
  const task = await f.manager.execute({ action: 'start', route: 'panel', task: 'Wait', cwd: f.root }, { cwd: f.root, signal: controller.signal });
  controller.abort();
  const result = await f.manager.execute({ action: 'collect', id: task.id, wait: true });
  assert.equal(result.status, 'cancelled');
  assert.throws(() => process.kill(task.pid, 0));
  const another = await f.manager.execute({ action: 'start', route: 'panel', task: 'Wait', cwd: f.root }, { cwd: f.root });
  await f.manager.shutdown();
  assert.equal((await f.manager.execute({ action: 'collect', id: another.id })).status, 'cancelled');
  assert.throws(() => process.kill(another.pid, 0));
});
test('shutdown during asynchronous resolution never creates a child', async t => {
  const f = await fixture(t);
  let release;
  const delayed = new Promise(resolve => { release = resolve; });
  const manager = createPiDelegationManager({ binary: f.binary, packageRoot: f.root, resolveResolution: async () => { await delayed; return { manifest: f.manifest }; } });
  const start = manager.execute({ action: 'start', route: 'panel', task: 'Wait', cwd: f.root }, { cwd: f.root });
  await manager.shutdown();
  await assert.rejects(start, /cancelled/); release();
});
test('creation has a bounded timeout even when resolution never completes', async t => {
  const f = await fixture(t);
  const manager = createPiDelegationManager({ packageRoot: f.root, timeoutMs: 50, resolveResolution: async () => new Promise(() => {}) });
  await assert.rejects(manager.execute({ action: 'start', route: 'panel', task: 'Wait', cwd: f.root }), /creation timed out/);
  await manager.shutdown();
});
test('output and retained result count are bounded', async t => {
  const f = await fixture(t);
  const manager = createPiDelegationManager({ binary: f.binary, packageRoot: f.root, env: f.env,
    maxOutputChars: 3, maxTasks: 1, resolveResolution: async () => ({ manifest: f.manifest }) });
  const result = await run(manager, f.root);
  assert.equal(result.output, 'fix'); assert.equal(result.outputTruncated, true);
  await assert.rejects(run(manager, f.root), /retained task limit/);
  await manager.shutdown();
});
test('writers require an explicitly independent Git checkout; invalid member fails', async t => {
  const f = await fixture(t);
  await assert.rejects(run(f.manager, f.root, { route: 'writer' }), /independentCheckout/);
  await assert.rejects(run(f.manager, f.root, { route: 'writer', independentCheckout: true }), /separate checkout/);
  await assert.rejects(run(f.manager, f.root, { member: 0 }), /route\/member/);
});
test('missing native CLI and hung RPC commands fail within the bounded lifecycle', async t => {
  const f = await fixture(t);
  const missing = createPiRpcConnection({ binary: join(f.root, 'not installed'), cwd: f.root, timeoutMs: 100 });
  await assert.rejects(missing.request('get_state'));
  await missing.stop();
  const hang = join(f.root, 'hang.mjs'); await writeFile(hang, 'setInterval(()=>{},1000);');
  const hanging = createPiRpcConnection({ binary: { command: process.execPath, args: [hang] }, cwd: f.root, timeoutMs: 50 });
  await assert.rejects(hanging.request('get_state'), /timed out/);
  await hanging.stop();
});
