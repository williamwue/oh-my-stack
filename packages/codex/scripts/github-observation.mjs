import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

const MAX_OUTPUT = 2_000_000;
const POST_EXIT_DRAIN_MS = 250;
const DEFAULT_LIMITS = Object.freeze({ timeoutMs: 45_000, maxRequests: 64, maxBytes: 8 * 1024 * 1024 });
export class GitHubProviderError extends Error {
  constructor(code, message) { super(message); this.name = 'GitHubProviderError'; this.code = code; }
}
const error = (code) => new GitHubProviderError(code, 'GitHub observation did not complete safely');
const check = (ok, code) => { if (!ok) throw error(code); };
const positiveId = (id) => Number.isSafeInteger(id) && id > 0;
const count = (n) => Number.isSafeInteger(n) && n >= 0;

export function observationLimits(input = {}) {
  check(input && typeof input === 'object' && !Array.isArray(input)
    && Object.keys(input).every((key) => Object.hasOwn(DEFAULT_LIMITS, key)), 'INVALID_INPUT');
  const limits = { ...DEFAULT_LIMITS, ...input };
  check(Object.entries(limits).every(([key, n]) => positiveId(n) && n <= DEFAULT_LIMITS[key]), 'INVALID_INPUT');
  return Object.freeze(limits);
}

/** Official gh transport counts both streams and awaits direct child exit before bounded pipe cleanup. */
export function createGhTransport({ executable = 'gh', timeoutMs = 15_000, maxOutputBytes = MAX_OUTPUT } = {}) {
  check(positiveId(timeoutMs) && timeoutMs <= 60_000, 'INVALID_INPUT');
  check(positiveId(maxOutputBytes) && maxOutputBytes <= MAX_OUTPUT, 'INVALID_INPUT');
  const transport = async ({ method = 'GET', path, body, signal, onBytes }) => {
    check(['GET', 'POST', 'PUT'].includes(method) && typeof path === 'string' && path.startsWith('/')
      && !path.includes('://'), 'INVALID_REQUEST');
    if (signal?.aborted) throw error('ABORTED');
    const cwd = await mkdtemp(join(tmpdir(), 'oms-gh-api-'));
    try {
      if (signal?.aborted) throw error('ABORTED');
      const args = ['api', '--hostname', 'github.com', '--method', method, path,
        '--header', 'Accept: application/vnd.github+json', '--header', 'X-GitHub-Api-Version: 2022-11-28'];
      if (body !== undefined) args.push('--input', '-');
      return await new Promise((resolve, reject) => {
        const child = spawn(executable, args, { cwd, shell: false, stdio: ['pipe', 'pipe', 'pipe'],
          env: { PATH: process.env.PATH, HOME: process.env.HOME, GH_CONFIG_DIR: process.env.GH_CONFIG_DIR,
            XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME } });
        const chunks = []; let bytes = 0; let failure = null; let exited = null; let settled = false; let drainTimer;
        const stop = (reason) => {
          if (settled) return;
          failure ??= reason;
          if (!exited) child.kill('SIGKILL');
        };
        const abort = () => stop(error('ABORTED'));
        const timer = setTimeout(() => stop(error('TIMEOUT')), timeoutMs);
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) abort();
        const receive = (chunk, stdout) => {
          bytes += chunk.length;
          try { onBytes?.(chunk.length); }
          catch (reason) { stop(reason instanceof GitHubProviderError ? reason : error('OUTPUT_LIMIT')); }
          if (bytes > maxOutputBytes) stop(error('OUTPUT_LIMIT'));
          if (stdout && !failure) chunks.push(chunk);
        };
        const stdout = (chunk) => receive(chunk, true); const stderr = (chunk) => receive(chunk, false);
        const transportError = () => stop(error('TRANSPORT_ERROR'));
        const finish = (code) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer); clearTimeout(drainTimer); signal?.removeEventListener('abort', abort);
          child.stdout.removeListener('data', stdout); child.stderr.removeListener('data', stderr);
          child.removeListener('error', transportError); child.stdin.removeListener('error', transportError);
          child.removeListener('exit', onExit); child.removeListener('close', finish);
          if (failure) return reject(failure);
          if (code !== 0) return reject(error('API_ERROR'));
          try {
            const output = Buffer.concat(chunks).toString('utf8').trim();
            resolve(output ? JSON.parse(output) : null);
          } catch { reject(error('INVALID_RESPONSE')); }
        };
        const onExit = (code) => {
          exited = { code };
          drainTimer = setTimeout(() => {
            failure ??= error('TRANSPORT_ERROR');
            child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy();
            finish(exited.code);
          }, POST_EXIT_DRAIN_MS);
        };
        child.stdout.on('data', stdout); child.stderr.on('data', stderr);
        child.on('error', transportError); child.stdin.on('error', transportError);
        child.once('exit', onExit); child.once('close', finish);
        try { child.stdin.end(body === undefined ? undefined : JSON.stringify(body)); }
        catch { stop(error('INVALID_REQUEST')); }
      });
    } finally { await rm(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
  };
  Object.defineProperty(transport, 'measuresResponseBytes', { value: true });
  return transport;
}

export async function withReadScope(transport, { signal, limits }, run) {
  check(!signal || (typeof signal.addEventListener === 'function' && typeof signal.removeEventListener === 'function'), 'INVALID_INPUT');
  const controller = new AbortController();
  const startedAt = Date.now(); const start = performance.now();
  let requests = 0; let bytes = 0; let failure = null;
  const abort = (code) => { failure ??= error(code); controller.abort(); };
  const parentAbort = () => abort('ABORTED');
  signal?.addEventListener('abort', parentAbort, { once: true });
  if (signal?.aborted) parentAbort();
  const timer = setTimeout(() => abort('TIMEOUT'), limits.timeoutMs);
  const checkpoint = () => {
    if (performance.now() - start >= limits.timeoutMs) abort('TIMEOUT');
    if (failure) throw failure;
  };
  const read = async (method, path, body) => {
    checkpoint();
    if (++requests > limits.maxRequests) { abort('REQUEST_LIMIT'); checkpoint(); }
    let requestBytes = 0;
    const charge = (n) => {
      check(count(n), 'INVALID_RESPONSE');
      requestBytes += n; bytes += n;
      if (requestBytes > MAX_OUTPUT) abort('OUTPUT_LIMIT');
      if (bytes > limits.maxBytes) abort('OBSERVATION_LIMIT');
      checkpoint();
    };
    let rejectAbort;
    const cancelled = new Promise((_, reject) => { rejectAbort = () => reject(failure ?? error('ABORTED')); });
    // Instrumented transports own child closure. Uninstrumented fixtures may ignore cancellation.
    if (!transport.measuresResponseBytes) controller.signal.addEventListener('abort', rejectAbort, { once: true });
    try {
      const pending = transport({ method, path, body, signal: controller.signal, onBytes: charge });
      const value = transport.measuresResponseBytes ? await pending : await Promise.race([pending, cancelled]);
      checkpoint();
      const serialized = JSON.stringify(value);
      check(serialized !== undefined, 'INVALID_RESPONSE');
      if (!transport.measuresResponseBytes) charge(Buffer.byteLength(serialized));
      return JSON.parse(serialized);
    } catch (reason) {
      checkpoint();
      if (reason instanceof GitHubProviderError) throw reason;
      throw error('API_ERROR');
    } finally { controller.signal.removeEventListener('abort', rejectAbort); }
  };
  try {
    checkpoint();
    const result = await run(read);
    checkpoint();
    return { ...result, observation: { ...result.observation, startedAt, finishedAt: Date.now(), requests, bytes,
      byteAccounting: transport.measuresResponseBytes ? 'actual-stdout-stderr' : 'approximate-serialized-json' } };
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', parentAbort); }
}

const incomplete = () => ({ complete: false, items: [] });
export async function restCollection(read, path, { key, valid, metadata = () => true, maxTotal = Infinity } = {}) {
  const items = []; const ids = new Set(); let total;
  for (let page = 1; ; page += 1) {
    const response = await read('GET', page === 1 ? path : `${path}&page=${page}`);
    const batch = key ? response?.[key] : response;
    if (!Array.isArray(batch) || batch.length > 100 || !metadata(response)) return incomplete();
    if (key) {
      if (!count(response.total_count) || response.total_count > maxTotal
        || (total !== undefined && total !== response.total_count)) return incomplete();
      total = response.total_count;
    }
    for (const item of batch) {
      if (!positiveId(item?.id) || ids.has(item.id) || !valid(item)) return incomplete();
      ids.add(item.id); items.push(item);
    }
    if (key && items.length > total) return incomplete();
    if (key && items.length === total) return { complete: true, items };
    if (batch.length < 100) return key ? incomplete() : { complete: true, items };
  }
}

export async function reviewThreads(read, repo, pr, raw) {
  const items = []; const ids = new Set(); const cursors = new Set(); let cursor = null; let total; let decision;
  for (;;) {
    const graph = await read('POST', '/graphql', {
      query: 'query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){id number headRefOid reviewDecision reviewThreads(first:100,after:$cursor){totalCount nodes{id isResolved} pageInfo{hasNextPage endCursor}}}}}',
      variables: { owner: repo.split('/')[0], name: repo.split('/')[1], number: pr, cursor },
    });
    const gpr = graph?.data?.repository?.pullRequest; const threads = gpr?.reviewThreads;
    if ((Object.hasOwn(graph ?? {}, 'errors') && (!Array.isArray(graph.errors) || graph.errors.length > 0))
      || gpr?.id !== raw.node_id || typeof gpr?.id !== 'string' || gpr.number !== pr || gpr.headRefOid !== raw.head.sha
      || !Object.hasOwn(gpr, 'reviewDecision') || !['APPROVED', 'CHANGES_REQUESTED', 'REVIEW_REQUIRED', null].includes(gpr.reviewDecision)
      || (total !== undefined && (total !== threads?.totalCount || decision !== gpr.reviewDecision))
      || !count(threads?.totalCount) || !Array.isArray(threads.nodes) || threads.nodes.length > 100
      || typeof threads.pageInfo?.hasNextPage !== 'boolean') return incomplete();
    total = threads.totalCount; decision = gpr.reviewDecision;
    for (const item of threads.nodes) {
      if (typeof item?.id !== 'string' || !item.id || item.id.length > 256 || ids.has(item.id)
        || typeof item.isResolved !== 'boolean') return incomplete();
      ids.add(item.id); items.push(item);
    }
    const { hasNextPage, endCursor } = threads.pageInfo;
    if (items.length > total || (endCursor !== null && (typeof endCursor !== 'string' || !endCursor || endCursor.length > 2048))) return incomplete();
    if (threads.nodes.length > 0 && (!endCursor || cursors.has(endCursor))) return incomplete();
    if (!hasNextPage) return items.length === total ? { complete: true, items, decision } : incomplete();
    if (threads.nodes.length === 0 || items.length >= total || !endCursor || cursors.has(endCursor)) return incomplete();
    cursors.add(endCursor); cursor = endCursor;
  }
}
