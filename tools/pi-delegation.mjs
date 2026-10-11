import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';

export const PI_ISOLATION_ARGS = ['--mode', 'rpc', '--no-session', '--no-extensions', '--no-skills',
  '--no-mcp', '--no-context-files', '--no-prompt-templates', '--no-themes'];
const efforts = new Set(['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']);
const abortError = () => new Error('Pi delegation cancelled');
export function nativeThinking(value) {
  const level = value === 'none' ? 'off' : value;
  if (!efforts.has(level)) throw new Error(`unsupported Pi thinking level: ${value}`);
  return level;
}
export function binaryVector(binary = process.env.OMS_PI_CLI
  ? { command: process.env.OMS_PI_BINARY ?? process.execPath, args: [process.env.OMS_PI_CLI] }
  : process.env.OMS_PI_BINARY ?? 'pi') {
  if (typeof binary === 'string' && binary) return { command: binary, args: [] };
  if (binary && typeof binary.command === 'string' && binary.command && Array.isArray(binary.args)
    && binary.args.every(value => typeof value === 'string')) return binary;
  throw new Error('Pi binary must be a command or {command,args}');
}

/** One native CLI/RPC boundary. Does not read or transfer provider credentials. */
export function createPiRpcConnection({ binary, cwd, args = [], signal, timeoutMs = 20000,
  outputLimitBytes = 1048576, env = process.env } = {}) {
  if (signal?.aborted) throw abortError();
  const vector = binaryVector(binary);
  const child = spawn(vector.command, [...vector.args, ...PI_ISOLATION_ARGS, ...args], {
    cwd, env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
  });
  const events = new EventEmitter();
  const pending = new Map();
  let buffer = '', bytes = 0, sequence = 0, ended = false, failure = null, closing = false;
  let resolveClosed;
  const closed = new Promise(resolvePromise => { resolveClosed = resolvePromise; });
  function fail(error) {
    failure ??= error;
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(failure); }
    pending.clear();
    events.emit('failure', failure);
  }
  function stop() {
    if (!ended && !closing) {
      closing = true;
      child.stdin.end();
      const timer = setTimeout(() => child.kill('SIGKILL'), 1000);
      closed.then(() => clearTimeout(timer));
    }
    return closed;
  }
  function terminate(error) { fail(error); child.kill('SIGTERM'); return stop(); }
  const onAbort = () => terminate(abortError());
  signal?.addEventListener('abort', onAbort, { once: true });
  child.on('error', error => { fail(error); });
  child.stdin.on('error', error => { if (!closing) fail(error); });
  child.stderr.on('data', chunk => { bytes += chunk.length; events.emit('diagnostic', chunk.toString('utf8')); if (bytes > outputLimitBytes) terminate(new Error('Pi output limit exceeded')); });
  child.stdout.on('data', chunk => {
    bytes += chunk.length;
    if (bytes > outputLimitBytes) { terminate(new Error('Pi output limit exceeded')); return; }
    buffer += chunk.toString('utf8');
    let index;
    while ((index = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
      if (!line.trim()) continue;
      let message;
      try { message = JSON.parse(line); }
      catch { terminate(new Error('Pi emitted invalid RPC JSON')); return; }
      if (message.type === 'response' && pending.has(message.id)) {
        const entry = pending.get(message.id); pending.delete(message.id); clearTimeout(entry.timer);
        if (message.success === true) entry.resolve(message.data);
        else entry.reject(new Error(`Pi ${entry.type} failed: ${message.error ?? 'unknown error'}`));
      } else events.emit('event', message);
    }
  });
  child.on('close', (code, exitSignal) => {
    ended = true;
    signal?.removeEventListener('abort', onAbort);
    const result = { code, signal: exitSignal, failure: failure?.message ?? null };
    if (code !== 0 && !failure) fail(new Error(`Pi exited with code ${code}, signal ${exitSignal ?? 'none'}`));
    if (pending.size) fail(new Error('Pi exited before replying'));
    resolveClosed({ ...result, failure: failure?.message ?? null });
    events.emit('exit', { ...result, failure: failure?.message ?? null });
  });
  return {
    events, closed, pid: child.pid,
    request(type, fields = {}) {
      if (ended || closing || failure) return Promise.reject(failure ?? new Error('Pi RPC is closed'));
      return new Promise((resolvePromise, reject) => {
        const id = `oms-${++sequence}`;
        const timer = setTimeout(() => {
          pending.delete(id); reject(new Error(`Pi ${type} timed out`));
          terminate(new Error(`Pi ${type} timed out`));
        }, timeoutMs);
        pending.set(id, { type, resolve: resolvePromise, reject, timer });
        child.stdin.write(`${JSON.stringify({ ...fields, id, type })}\n`);
      });
    },
    stop, terminate,
  };
}

function modelId(model) { return model?.provider && model?.id ? `${model.provider}/${model.id}` : null; }
function requireModel(value) {
  if (typeof value !== 'string' || value.indexOf('/') < 1 || value.endsWith('/')) throw new Error('Pi requires an explicit provider/model selector');
  const index = value.indexOf('/');
  return { provider: value.slice(0, index), id: value.slice(index + 1) };
}
const snapshot = task => structuredClone({ id: task.id, status: task.status, route: task.route, member: task.member,
  role: task.role, requested: task.requested, selected: task.selected, observed: task.observed,
  output: task.output, outputTruncated: task.outputTruncated === true, error: task.error, pid: task.connection?.pid ?? null });

export function createPiDelegationManager({ binary, packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  resolveResolution, env, timeoutMs = 20000, taskTimeoutMs = 300000, maxTasks = 32, maxActiveTasks = 4,
  maxOutputChars = 32768, connectionFactory = createPiRpcConnection } = {}) {
  const tasks = new Map();
  const lifetime = new AbortController();
  async function active(cwd) {
    if (resolveResolution) return resolveResolution(cwd);
    const { resolveActiveResolution } = await import('./model-resolution.mjs');
    return resolveActiveResolution({ runtime: 'pi', cwd });
  }
  async function start(params, context) {
    if (lifetime.signal.aborted || context.signal?.aborted) throw abortError();
    if (tasks.size >= maxTasks) throw new Error('Pi retained task limit reached; start a new parent session');
    if ([...tasks.values()].filter(task => task.status === 'running').length >= maxActiveTasks) throw new Error('Pi active task limit reached');
    if (typeof params.task !== 'string' || !params.task.trim() || params.task.length > 65536) throw new Error('Pi task must contain 1..65536 characters');
    if (params.context != null && (typeof params.context !== 'string' || params.context.length > 65536)) throw new Error('Pi context must be a bounded string or explicit file pointers');
    const cwd = await realpath(resolve(params.cwd ?? context.cwd ?? process.cwd()));
    if (!(await stat(cwd)).isDirectory()) throw new Error('Pi cwd must be a directory');
    const resolution = await active(cwd);
    const manifest = resolution?.manifest;
    if (!manifest || manifest.target !== 'pi') throw new Error('Pi has no active Pi model resolution; run model setup first');
    const route = manifest.routes?.[params.route];
    const member = params.member ?? 1;
    if (!route || !Number.isInteger(member) || member < 1 || member > (route.entries?.length ?? 0)) throw new Error('Pi route/member is not configured');
    const contracts = JSON.parse(await readFile(join(packageRoot, 'config', 'role-contracts.json'), 'utf8'));
    if (contracts.schemaVersion !== 1 || contracts.target !== 'pi') throw new Error('invalid Pi role contracts');
    const role = contracts.roles?.[route.role];
    if (!role || typeof role.instructions !== 'string' || typeof role.writes !== 'boolean') throw new Error('Pi route has no checked role contract');
    if (role.writes) {
      if (params.independentCheckout !== true) throw new Error('Pi writing role requires explicit independentCheckout:true');
      const parentCwd = await realpath(resolve(context.cwd ?? process.cwd()));
      if (cwd === parentCwd) throw new Error('Pi writing role requires a separate checkout from the parent');
      const git = await stat(join(cwd, '.git')).catch(() => null);
      if (!git) throw new Error('Pi writing role requires an independent Git checkout');
    }
    const entry = route.entries[member - 1];
    const requested = { model: entry.model ?? null, thinking: entry.reasoning ?? null, inheritParent: entry.inheritParent === true };
    const selectedModel = entry.inheritParent ? modelId(context.parentModel) : entry.model;
    const selectedThinking = nativeThinking(entry.inheritParent ? context.parentThinking : entry.reasoning);
    const chosen = requireModel(selectedModel);
    const controller = new AbortController();
    const combined = AbortSignal.any([lifetime.signal, controller.signal, ...(context.signal ? [context.signal] : [])]);
    const task = { id: randomUUID(), route: params.route, member, role: route.role, status: 'running',
      requested, selected: { model: selectedModel, thinking: selectedThinking },
      observed: { model: null, thinking: null }, output: '', error: null, controller };
    if (combined.aborted) throw abortError();
    if (tasks.size >= maxTasks || [...tasks.values()].filter(item => item.status === 'running').length >= maxActiveTasks) throw new Error('Pi task capacity reached');
    const connection = connectionFactory({ binary, cwd, env, signal: combined, timeoutMs,
      args: ['--provider', chosen.provider, '--model', chosen.id, '--thinking', selectedThinking,
        '--tools', role.writes ? 'read,grep,find,ls,bash,edit,write' : 'read,grep,find,ls',
        '--system-prompt', role.instructions] });
    task.connection = connection;
    tasks.set(task.id, task);
    let settled = false;
    let resolveSettled;
    const completion = new Promise(resolvePromise => { resolveSettled = resolvePromise; });
    const fail = error => { task.error ??= error.message; resolveSettled(); };
    const onEvent = message => {
      if (message.type === 'auto_retry_start' || message.type === 'auto_compaction_start') {
        fail(new Error(`Pi attempted ${message.type}; OMS permits no hidden retry or compaction`));
        connection.terminate(new Error(task.error));
      }
      if (message.type === 'message_end' && message.message?.role === 'assistant') {
        const assistant = message.message;
        task.observed.model = assistant.provider && assistant.model ? `${assistant.provider}/${assistant.model}` : task.observed.model;
        const text = (assistant.content ?? []).filter(item => item.type === 'text').map(item => item.text).join('\n');
        const output = `${task.output}${task.output ? '\n' : ''}${text}`;
        task.outputTruncated ||= output.length > maxOutputChars;
        task.output = output.slice(0, maxOutputChars);
        if (task.observed.model !== selectedModel) fail(new Error('Pi response model differs from the configured physical model'));
        if (assistant.stopReason === 'error' || assistant.stopReason === 'aborted') fail(new Error(assistant.errorMessage ?? `Pi assistant ${assistant.stopReason}`));
      }
      if (message.type === 'agent_settled') { settled = true; resolveSettled(); }
    };
    connection.events.on('event', onEvent);
    connection.events.on('failure', fail);
    connection.events.on('exit', () => { if (!settled) fail(new Error('Pi exited before agent settled')); });
    const timer = setTimeout(() => { fail(new Error('Pi task timed out')); connection.terminate(new Error(task.error)); }, taskTimeoutMs);
    const onAbort = () => { fail(abortError()); };
    combined.addEventListener('abort', onAbort, { once: true });
    task.done = (async () => {
      try {
        const available = await connection.request('get_available_models');
        const advertised = available?.models?.find(model => modelId(model) === selectedModel);
        if (!advertised) throw new Error(`Pi native CLI does not advertise ${selectedModel}; extension-only providers and virtual routes are unsupported`);
        if (advertised.api === 'pi-virtual') throw new Error('Pi unverified virtual routes are unsupported; choose an advertised physical model');
        const state = await connection.request('get_state');
        task.observed = { model: modelId(state?.model), thinking: state?.thinkingLevel ?? null };
        if (task.observed.model !== selectedModel || task.observed.thinking !== selectedThinking) throw new Error('Pi native model/thinking selection differs from requested route');
        const levels = await connection.request('get_available_thinking_levels');
        if (!levels?.levels?.includes(selectedThinking)) throw new Error('Pi native model does not advertise selected thinking level');
        const accepted = await connection.request('prompt', { message: `${params.task}${params.context ? `\n\nExplicit context:\n${params.context}` : ''}` });
        if (accepted?.disposition !== 'started') throw new Error(`Pi prompt did not start: ${accepted?.disposition ?? 'unknown'}`);
        await completion;
      } catch (error) { fail(error); }
      finally {
        clearTimeout(timer);
        combined.removeEventListener('abort', onAbort);
        const exit = await connection.stop();
        task.status = combined.aborted ? 'cancelled' : task.error || exit.failure || exit.code !== 0 || !settled ? 'failed' : 'completed';
        task.error ??= exit.failure ?? (task.status === 'failed' ? 'Pi did not complete successfully' : null);
        connection.events.removeListener('event', onEvent);
        connection.events.removeListener('failure', fail);
        context.onUpdate?.(snapshot(task));
      }
      return snapshot(task);
    })();
    context.onUpdate?.(snapshot(task));
    return snapshot(task);
  }
  return {
    async execute(params, context = {}) {
      if (params.action === 'start') {
        const creation = new AbortController();
        const signal = AbortSignal.any([lifetime.signal, creation.signal, ...(context.signal ? [context.signal] : [])]);
        if (signal.aborted) throw abortError();
        let rejectCreation;
        const interrupted = new Promise((_, reject) => { rejectCreation = reject; });
        const onAbort = () => rejectCreation(abortError());
        signal.addEventListener('abort', onAbort, { once: true });
        const timer = setTimeout(() => {
          rejectCreation(new Error('Pi task creation timed out'));
          creation.abort();
        }, timeoutMs);
        try { return await Promise.race([start(params, { ...context, signal }), interrupted]); }
        finally { clearTimeout(timer); signal.removeEventListener('abort', onAbort); }
      }
      const task = tasks.get(params.id);
      if (!task) throw new Error('unknown Pi task id');
      if (params.action === 'cancel') { task.controller.abort(); await task.done; return snapshot(task); }
      if (params.action !== 'collect') throw new Error('Pi action must be start, collect or cancel');
      if (params.wait === true) {
        if (context.signal?.aborted) { task.controller.abort(); await task.done; return snapshot(task); }
        const abort = () => task.controller.abort();
        context.signal?.addEventListener('abort', abort, { once: true });
        try { await task.done; } finally { context.signal?.removeEventListener('abort', abort); }
      }
      return snapshot(task);
    },
    async shutdown() { lifetime.abort(); await Promise.all([...tasks.values()].map(task => task.done)); },
  };
}
