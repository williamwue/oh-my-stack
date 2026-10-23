import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { promisify } from 'node:util';
import { StringDecoder } from 'node:string_decoder';

const execFileAsync = promisify(execFile);

export const PI_ISOLATION_ARGS = ['--mode', 'rpc', '--no-session', '--no-extensions', '--no-skills',
  '--no-mcp', '--no-context-files', '--no-prompt-templates', '--no-themes'];
const efforts = new Set(['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']);
const abortError = () => new Error('Pi delegation cancelled');
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = value => typeof value === 'string' && value.trim().length > 0;
const isRpcModel = value => isRecord(value) && isText(value.provider) && isText(value.id)
  && (value.api === undefined || isText(value.api));
const responseShapes = {
  get_available_models: data => isRecord(data) && Array.isArray(data.models) && data.models.every(isRpcModel),
  get_state: data => isRecord(data) && isRpcModel(data.model) && isText(data.thinkingLevel)
    && (data.sessionId === undefined || isText(data.sessionId) && data.sessionId.length <= 256)
    && (data.sessionFile === undefined || typeof data.sessionFile === 'string' && data.sessionFile.length <= 4096),
  get_available_thinking_levels: data => isRecord(data) && Array.isArray(data.levels) && data.levels.every(isText),
  prompt: data => isRecord(data) && isText(data.disposition),
};
function validRpcMessage(message) {
  if (!isRecord(message) || !isText(message.type)) return false;
  if (message.type === 'response') {
    return isText(message.id) && isText(message.command) && typeof message.success === 'boolean'
      && (message.error === undefined || typeof message.error === 'string')
      && (!message.success || !Object.hasOwn(responseShapes, message.command) || responseShapes[message.command](message.data));
  }
  if (message.type === 'tool_execution_start') return isText(message.toolCallId) && isText(message.toolName)
    && message.toolCallId.length <= 256 && message.toolName.length <= 256;
  if (message.type === 'tool_execution_end') return isText(message.toolCallId) && message.toolCallId.length <= 256
    && (message.toolName === undefined || isText(message.toolName) && message.toolName.length <= 256);
  if (message.type === 'message_end') {
    const assistant = message.message;
    if (!isRecord(assistant) || !isText(assistant.role)) return false;
    if (assistant.role !== 'assistant') return true;
    return isText(assistant.provider) && isText(assistant.model) && isText(assistant.stopReason)
      && (assistant.errorMessage === undefined || typeof assistant.errorMessage === 'string')
      && Array.isArray(assistant.content) && assistant.content.every(part => isRecord(part) && isText(part.type)
        && (part.type !== 'text' || typeof part.text === 'string'));
  }
  return true;
}
// A dead direct child cannot release pipes inherited by a surviving descendant.
const postExitDrainMs = 250;
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

export function createPiRpcConnection({ binary, cwd, args = [], signal, timeoutMs = 20000,
  outputLimitBytes = 1048576, env = process.env, sessionDir } = {}) {
  if (signal?.aborted) throw abortError();
  if (sessionDir !== undefined && (typeof sessionDir !== 'string' || !isAbsolute(sessionDir))) throw new Error('Pi sessionDir must be an absolute directory');
  const vector = binaryVector(binary);
  const isolation = sessionDir === undefined ? PI_ISOLATION_ARGS : PI_ISOLATION_ARGS.filter(arg => arg !== '--no-session');
  const child = spawn(vector.command, [...vector.args, ...isolation, ...(sessionDir ? ['--session-dir', sessionDir] : []), ...args], {
    cwd, env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
  });
  const events = new EventEmitter();
  const pending = new Map();
  const decoder = new StringDecoder('utf8');
  let buffer = '', bytes = 0, sequence = 0, ended = false, failure = null, closing = false;
  let exited = null, killTimer, drainTimer, stdoutEnded = false;
  let resolveClosed;
  const closed = new Promise(resolvePromise => { resolveClosed = resolvePromise; });
  function fail(error) {
    if (ended || failure) return;
    failure = error;
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(failure); }
    pending.clear();
    events.emit('failure', failure);
  }
  function stop() {
    if (!ended && !exited && !closing) {
      closing = true;
      child.stdin.end();
      killTimer = setTimeout(() => { if (!exited && !ended) child.kill('SIGKILL'); }, 1000);
    }
    return closed;
  }
  function terminate(error) {
    fail(error);
    if (!ended && !exited && !closing) child.kill('SIGTERM');
    return stop();
  }
  function finishOutput() {
    if (stdoutEnded) return;
    stdoutEnded = true;
    buffer += decoder.end();
    if (buffer.trim()) fail(new Error('Pi exited with incomplete RPC JSON'));
  }
  function finish(code, exitSignal) {
    if (ended) return;
    finishOutput();
    clearTimeout(killTimer);
    clearTimeout(drainTimer);
    signal?.removeEventListener('abort', onAbort);
    if (code !== 0 && !failure) fail(new Error(`Pi exited with code ${code}, signal ${exitSignal ?? 'none'}`));
    if (pending.size) fail(new Error('Pi exited before replying'));
    ended = true;
    const result = { code, signal: exitSignal, failure: failure?.message ?? null };
    resolveClosed(result);
    events.emit('exit', result);
  }
  const onAbort = () => terminate(abortError());
  signal?.addEventListener('abort', onAbort, { once: true });
  child.on('error', error => {
    fail(error);
    if (!child.pid) finish(null, null);
    else stop();
  });
  child.stdin.on('error', error => { if (!closing) fail(error); });
  child.stderr.on('data', chunk => {
    if (ended || failure) return;
    bytes += chunk.length;
    if (bytes > outputLimitBytes) { terminate(new Error('Pi output limit exceeded')); return; }
    events.emit('diagnostic', chunk.toString('utf8'));
  });
  child.stdout.on('data', chunk => {
    if (ended || failure) return;
    bytes += chunk.length;
    if (bytes > outputLimitBytes) { terminate(new Error('Pi output limit exceeded')); return; }
    buffer += decoder.write(chunk);
    let index;
    while ((index = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
      if (!line.trim()) continue;
      let message;
      try { message = JSON.parse(line); }
      catch { terminate(new Error('Pi emitted invalid RPC JSON')); return; }
      if (!validRpcMessage(message)) { terminate(new Error('Pi emitted invalid RPC message')); return; }
      if (message.type === 'response' && pending.has(message.id)) {
        const entry = pending.get(message.id);
        if (message.command !== entry.type) { terminate(new Error('Pi emitted mismatched RPC response')); return; }
        pending.delete(message.id); clearTimeout(entry.timer);
        if (message.success === true) entry.resolve(message.data);
        else entry.reject(new Error(`Pi ${entry.type} failed: ${(message.error ?? 'unknown error').slice(0, 1024)}`));
      } else events.emit('event', message);
      if (failure) return;
    }
  });
  child.stdout.on('end', finishOutput);
  child.on('exit', (code, exitSignal) => {
    exited = { code, signal: exitSignal };
    clearTimeout(killTimer);
    drainTimer = setTimeout(() => {
      fail(new Error(`Pi stdio did not close within ${postExitDrainMs}ms after child exit`));
      child.stdin.destroy();
      child.stdout.destroy();
      child.stderr.destroy();
      finish(exited.code, exited.signal);
    }, postExitDrainMs);
  });
  child.on('close', finish);
  return {
    events, closed, pid: child.pid,
    request(type, fields = {}) {
      if (ended || exited || closing || failure) return Promise.reject(failure ?? new Error('Pi RPC is closed'));
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
async function gitWorktreeRoot(cwd, label, signal, timeoutMs) {
  const gitEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.toUpperCase().startsWith('GIT_')));
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
      cwd, env: gitEnv, signal, timeout: timeoutMs, maxBuffer: 65536, windowsHide: true,
    });
    const root = stdout.trim();
    if (!root) throw new Error('empty Git worktree root');
    return await realpath(root);
  } catch (error) {
    if (signal?.aborted) throw abortError();
    throw new Error(`Pi writing ${label} requires a verified Git worktree`, { cause: error });
  }
}
const snapshot = task => structuredClone({ id: task.id, status: task.status, route: task.route, member: task.member,
  role: task.role, requested: task.requested, selected: task.selected, observed: task.observed,
  cwd: task.cwd, session: task.session, activity: task.activity,
  output: task.output, outputTruncated: task.outputTruncated === true, error: task.error, pid: task.connection?.pid ?? null });

export function createPiDelegationManager({ binary, packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  resolveResolution, env, timeoutMs = 20000, taskTimeoutMs = 300000, maxTasks = 32, maxActiveTasks = 4,
  maxOutputChars = 32768, connectionFactory = createPiRpcConnection } = {}) {
  packageRoot = resolve(packageRoot);
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
    if (params.sessionDir !== undefined && (typeof params.sessionDir !== 'string' || !isAbsolute(params.sessionDir))) throw new Error('Pi sessionDir must be an existing absolute directory');
    const sessionDir = params.sessionDir === undefined ? undefined : await realpath(params.sessionDir);
    if (sessionDir && !(await stat(sessionDir)).isDirectory()) throw new Error('Pi sessionDir must be an existing absolute directory');
    const resolution = await active(cwd);
    const manifest = resolution?.manifest;
    if (!manifest || manifest.target !== 'pi') throw new Error('Pi has no active Pi model resolution; run model setup first');
    const route = manifest.routes?.[params.route];
    const member = params.member ?? 1;
    if (!route || !Number.isInteger(member) || member < 1 || member > (route.entries?.length ?? 0)) throw new Error('Pi route/member is not configured');
    const contracts = JSON.parse(await readFile(join(packageRoot, 'config', 'role-contracts.json'), 'utf8'));
    if (contracts.schemaVersion !== 1 || contracts.target !== 'pi') throw new Error('invalid Pi role contracts');
    const hasRouteRoles = Object.hasOwn(contracts, 'routeRoles');
    if (hasRouteRoles && (!contracts.routeRoles || typeof contracts.routeRoles !== 'object'
      || Array.isArray(contracts.routeRoles) || !Object.hasOwn(contracts.routeRoles, params.route))) throw new Error('Pi route is absent from the current packaged role map');
    const roleName = hasRouteRoles ? contracts.routeRoles[params.route] : route.role;
    const role = contracts.roles?.[roleName];
    if (!role || typeof role.instructions !== 'string' || typeof role.writes !== 'boolean') throw new Error('Pi route has no checked role contract');
    const systemPrompt = [role.instructions, '', 'Installed package references:',
      `Runtime binding: ${join(packageRoot, 'docs', 'runtime-binding.md')}`,
      `Model selection: ${join(packageRoot, 'docs', 'model-selection.md')}`,
      `Skills directory: ${join(packageRoot, 'skills')}`,
      ...(roleName === 'poteto-agent' ? [
        `Full Poteto Mode skill (read in full, including its Principles index): ${join(packageRoot, 'skills', 'poteto-mode', 'SKILL.md')}`,
      ] : []),
    ].join('\n');
    let writingWorktree = null;
    if (role.writes) {
      if (params.independentCheckout !== true) throw new Error('Pi writing role requires explicit independentCheckout:true');
      const parentCwd = await realpath(resolve(context.cwd ?? process.cwd()));
      const parentRoot = await gitWorktreeRoot(parentCwd, 'parent', context.signal, timeoutMs);
      const childRoot = await gitWorktreeRoot(cwd, 'child', context.signal, timeoutMs);
      const identity = root => process.platform === 'win32' ? root.toLowerCase() : root;
      if (identity(parentRoot) === identity(childRoot)) throw new Error('Pi writing role requires a separate Git worktree from the parent checkout');
      writingWorktree = identity(childRoot);
    }
    const entry = route.entries[member - 1];
    const requested = { model: entry.model ?? null, thinking: entry.reasoning ?? null, inheritParent: entry.inheritParent === true };
    const selectedModel = entry.inheritParent ? modelId(context.parentModel) : entry.model;
    const selectedThinking = nativeThinking(entry.inheritParent ? context.parentThinking : entry.reasoning);
    const chosen = requireModel(selectedModel);
    const controller = new AbortController();
    const combined = AbortSignal.any([lifetime.signal, controller.signal, ...(context.signal ? [context.signal] : [])]);
    const task = { id: randomUUID(), route: params.route, member, role: roleName, status: 'running',
      requested, selected: { model: selectedModel, thinking: selectedThinking },
      observed: { model: null, thinking: null }, cwd, session: { id: null, file: null, persistence: sessionDir ? 'requested' : 'disabled', source: 'unobserved' },
      activity: { phase: 'starting', at: new Date().toISOString(), tool: null, messages: 0, toolCalls: 0 },
      output: '', error: null, controller, writingWorktree };
    if (combined.aborted) throw abortError();
    if (tasks.size >= maxTasks || [...tasks.values()].filter(item => item.status === 'running').length >= maxActiveTasks) throw new Error('Pi task capacity reached');
    if (writingWorktree && [...tasks.values()].some(item => item.status === 'running' && item.writingWorktree === writingWorktree)) throw new Error('Pi Git worktree already has an active writer');
    const connection = connectionFactory({ binary, cwd, env, sessionDir, signal: combined, timeoutMs,
      args: ['--provider', chosen.provider, '--model', chosen.id, '--thinking', selectedThinking,
        '--tools', role.writes ? 'read,grep,find,ls,bash,edit,write' : 'read,grep,find,ls',
        '--system-prompt', systemPrompt] });
    task.connection = connection;
    tasks.set(task.id, task);
    let settled = false;
    let resolveSettled;
    const completion = new Promise(resolvePromise => { resolveSettled = resolvePromise; });
    const fail = error => { task.error ??= error.message; resolveSettled(); };
    const note = change => {
      task.activity = { ...task.activity, ...change, at: new Date().toISOString() };
      context.onUpdate?.(snapshot(task));
    };
    const observeSession = state => {
      if (task.session.id && state.sessionId && task.session.id !== state.sessionId) throw new Error('Pi native session identity changed');
      const file = typeof state.sessionFile === 'string' && isAbsolute(state.sessionFile) && state.sessionFile.endsWith('.jsonl') ? state.sessionFile : null;
      if (file) {
        const difference = sessionDir ? relative(sessionDir, file) : null;
        if (!sessionDir || !difference || isAbsolute(difference) || difference === '..' || difference.startsWith(`..${sep}`)) {
          throw new Error('Pi session file is outside the selected persistence directory');
        }
        if (task.session.file && task.session.file !== file) throw new Error('Pi native session file changed');
      }
      task.session = { ...task.session, id: state.sessionId ?? task.session.id,
        file: file ?? task.session.file, source: 'native-get-state' };
    };
    const onEvent = message => {
      if (message.type === 'agent_start' || message.type === 'turn_start') note({ phase: 'running' });
      if (message.type === 'tool_execution_start') note({ phase: 'tool',
        tool: { id: message.toolCallId, name: message.toolName, running: true }, toolCalls: task.activity.toolCalls + 1 });
      if (message.type === 'tool_execution_end' && task.activity.tool?.id === message.toolCallId) {
        note({ phase: 'running', tool: { ...task.activity.tool, running: false } });
      }
      if (message.type === 'auto_retry_start' || message.type === 'auto_compaction_start') {
        fail(new Error(`Pi attempted ${message.type}; OMS permits no hidden retry or compaction`));
        connection.terminate(new Error(task.error));
      }
      if (message.type === 'message_end' && message.message?.role === 'assistant') {
        const assistant = message.message;
        note({ phase: 'running', messages: task.activity.messages + 1 });
        task.observed.model = assistant.provider && assistant.model ? `${assistant.provider}/${assistant.model}` : task.observed.model;
        const text = assistant.content.filter(item => item.type === 'text').map(item => item.text).join('\n');
        const output = `${task.output}${task.output ? '\n' : ''}${text}`;
        task.outputTruncated ||= output.length > maxOutputChars;
        task.output = output.slice(0, maxOutputChars);
        if (task.observed.model !== selectedModel) fail(new Error('Pi response model differs from the configured physical model'));
        if (assistant.stopReason === 'error' || assistant.stopReason === 'aborted') fail(new Error(assistant.errorMessage?.slice(0, 1024) ?? `Pi assistant ${assistant.stopReason}`));
      }
      if (message.type === 'agent_settled') { settled = true; note({ phase: 'settled' }); resolveSettled(); }
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
        observeSession(state);
        task.observed = { model: modelId(state?.model), thinking: state?.thinkingLevel ?? null };
        if (task.observed.model !== selectedModel || task.observed.thinking !== selectedThinking) throw new Error('Pi native model/thinking selection differs from requested route');
        const levels = await connection.request('get_available_thinking_levels');
        if (!levels?.levels?.includes(selectedThinking)) throw new Error('Pi native model does not advertise selected thinking level');
        const accepted = await connection.request('prompt', { message: `${params.task}${params.context ? `\n\nExplicit context:\n${params.context}` : ''}` });
        if (accepted?.disposition !== 'started') throw new Error(`Pi prompt did not start: ${accepted?.disposition ?? 'unknown'}`);
        await completion;
        if (sessionDir && settled && !task.error && !combined.aborted) observeSession(await connection.request('get_state'));
      } catch (error) { fail(error); }
      finally {
        clearTimeout(timer);
        combined.removeEventListener('abort', onAbort);
        const exit = await connection.stop();
        task.status = combined.aborted ? 'cancelled' : task.error || exit.failure || exit.code !== 0 || !settled ? 'failed' : 'completed';
        task.error ??= exit.failure ?? (task.status === 'failed' ? 'Pi did not complete successfully' : null);
        task.activity = { ...task.activity, phase: task.status, at: new Date().toISOString(),
          tool: task.activity.tool ? { ...task.activity.tool, running: false } : null };
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
      if (params.action === 'list') return { active: [...tasks.values()].filter(task => task.status === 'running').length,
        tasks: [...tasks.values()].map(task => { const { output, outputTruncated, ...summary } = snapshot(task); return summary; }) };
      const task = tasks.get(params.id);
      if (!task) throw new Error('unknown Pi task id');
      if (params.action === 'cancel') { task.controller.abort(); await task.done; return snapshot(task); }
      if (params.action !== 'collect') throw new Error('Pi action must be start, list, collect or cancel');
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
