import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { createPiDelegationManager, createPiRpcConnection } from '../../tools/pi-delegation.mjs';

const config = JSON.parse(process.argv[2]);
const { root, mode } = config;
const binary = { command: process.execPath, args: [fileURLToPath(new URL('./pi-rpc-child.mjs', import.meta.url))] };
const childConfig = { ...config, mode: mode.replace(/^manager-/, '') };
const env = { ...process.env, PI_RPC_FIXTURE: JSON.stringify(childConfig) };
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const deadline = setTimeout(() => { process.stderr.write('fixture parent deadline exceeded\n'); process.exit(2); }, 6500);
let connection, manager;
async function within(promise, ms = 1700) {
  let timer;
  try { return await Promise.race([promise, new Promise(resolve => { timer = setTimeout(() => resolve(null), ms); })]); }
  finally { clearTimeout(timer); }
}
async function runTask() {
  const initial = await manager.execute({ action: 'start', route: 'reader', task: 'Inspect fixture', cwd: root }, { cwd: root });
  const task = await within(manager.execute({ action: 'collect', id: initial.id, wait: true }), 2500);
  return { task, directAlive: alive(initial.pid) };
}
try {
  if (mode.startsWith('inherited-') || mode === 'delayed-exit' || mode === 'spawn-error') {
    connection = createPiRpcConnection({ binary: mode === 'spawn-error' ? join(root, 'missing-cli') : binary,
      cwd: root, env, timeoutMs: 400 });
    const failures = [];
    connection.events.on('failure', error => failures.push(error.message));
    if (mode.startsWith('inherited-') || mode === 'delayed-exit') await once(connection.events, 'event');
    let resolved = false;
    const first = mode === 'delayed-exit' ? connection.terminate(new Error('fixture termination')) : connection.stop();
    first.then(() => { resolved = true; });
    const second = mode === 'delayed-exit' ? connection.terminate(new Error('second termination')) : connection.stop();
    await sleep(50);
    const early = { resolved, directAlive: alive(connection.pid) };
    const exit = await within(first);
    const descendant = mode.startsWith('inherited-') ? Number(await readFile(join(root, 'descendant.pid'), 'utf8')) : null;
    console.log(JSON.stringify({ exit, failures, sameStop: first === second, early, directAlive: alive(connection.pid),
      descendantAlive: descendant ? alive(descendant) : null }));
  } else {
    const manifest = { target: 'pi', routes: { reader: { role: 'reader', entries: [{ model: 'fixture/physical', reasoning: 'low' }] } } };
    let invocation = 0;
    manager = createPiDelegationManager({ packageRoot: root, timeoutMs: 500, taskTimeoutMs: 1200,
      resolveResolution: async () => ({ manifest }),
      connectionFactory: options => createPiRpcConnection({ ...options,
        binary: mode === 'manager-spawn-error' && invocation === 0 ? join(root, 'missing-cli') : binary,
        env: { ...env, PI_RPC_FIXTURE: JSON.stringify(invocation++ === 0 ? childConfig : { root, mode: 'valid' }) } }),
    });
    if (mode === 'manager-cancel-delayed') {
      const initial = await manager.execute({ action: 'start', route: 'reader', task: 'Wait', cwd: root });
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await readFile(join(root, 'prompt.ready'), 'utf8').catch(() => null)) break;
        if (attempt === 99) throw new Error('fixture prompt did not start');
        await sleep(10);
      }
      let resolved = false;
      const cancelled = manager.execute({ action: 'cancel', id: initial.id }).then(task => { resolved = true; return task; });
      await sleep(50);
      const early = { resolved, status: (await manager.execute({ action: 'collect', id: initial.id })).status,
        directAlive: alive(initial.pid) };
      const task = await within(cancelled);
      console.log(JSON.stringify({ task, early, directAlive: alive(initial.pid) }));
    } else {
      const first = await runTask();
      const recovery = await runTask();
      console.log(JSON.stringify({ ...first, recovery }));
    }
  }
} finally {
  const pids = (await readFile(join(root, 'pids.jsonl'), 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).map(Number);
  for (const pid of pids) { try { process.kill(pid, 'SIGKILL'); } catch {} }
  await within(Promise.all([connection?.stop(), manager?.shutdown()]), 1000);
  clearTimeout(deadline);
}
