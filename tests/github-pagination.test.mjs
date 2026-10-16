import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { getEventListeners } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { GitHubAutopilotProvider, createGhTransport } from '../tools/github-autopilot-provider.mjs';

const HEAD = 'b'.repeat(40); const BASE = 'a'.repeat(40);
const target = { repo: 'acme/project', account: 'maintainer', pr: 7 };
const run = (id) => ({ id, name: `ci/${id}`, head_sha: HEAD, app: { id: 123 }, status: 'completed', conclusion: 'success' });
const status = (id) => ({ id, context: `status/${id}`, state: 'success' });
const review = (id) => ({ id, user: { login: `reviewer${id}` }, state: 'APPROVED', commit_id: HEAD });
const suite = (id) => ({ id, head_sha: HEAD });
const thread = (id) => ({ id: `thread-${id}`, isResolved: true });
const list = (n, make) => Array.from({ length: n }, (_, i) => make(i + 1));
const protection = { required_status_checks: { strict: true, contexts: ['ci/1'], checks: [{ context: 'ci/1', app_id: 123 }] },
  enforce_admins: { enabled: true }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false } };

function fixture({ runs = [run(1)], statuses = [], reviews = [review(1)], suites = [suite(1)], threads = [], edit } = {}) {
  const calls = []; const counts = new Map();
  const raw = { id: 70, node_id: 'PR_70', number: 7, state: 'open', merged: false, draft: false,
    mergeable: true, mergeable_state: 'clean', base: { ref: 'main', sha: BASE, repo: { id: 20, full_name: target.repo } },
    head: { ref: 'feature', sha: HEAD, repo: { id: 20, full_name: target.repo } } };
  const transport = async (request) => {
    calls.push(request); const { path, body } = request;
    const number = (counts.get(path) ?? 0) + 1; counts.set(path, number);
    const url = new URL(path, 'https://api.github.com');
    const page = Number(url.searchParams.get('page') ?? 1);
    const chunk = (items) => items.slice((page - 1) * 100, page * 100);
    let response;
    if (path === '/user') response = { id: 10, login: target.account };
    else if (path === '/repos/acme/project') response = { id: 20, full_name: target.repo };
    else if (path === '/repos/acme/project/pulls/7') response = structuredClone(raw);
    else if (path.endsWith('/git/ref/heads/main')) response = { object: { sha: BASE } };
    else if (path.endsWith('/git/ref/heads/feature')) response = { object: { sha: HEAD } };
    else if (path.endsWith('/branches/main')) response = { name: 'main', protected: true, commit: { sha: BASE } };
    else if (path.endsWith('/branches/main/protection')) response = structuredClone(protection);
    else if (path.includes('/rules/branches/main?')) response = [];
    else if (url.pathname.endsWith('/check-suites')) response = { total_count: suites.length, check_suites: chunk(suites) };
    else if (url.pathname.endsWith('/check-runs')) response = { total_count: runs.length, check_runs: chunk(runs) };
    else if (url.pathname.endsWith('/status')) response = { sha: HEAD, total_count: statuses.length, statuses: chunk(statuses),
      state: statuses.some((s) => ['error', 'failure'].includes(s.state)) ? 'failure'
        : statuses.length === 0 || statuses.some((s) => s.state === 'pending') ? 'pending' : 'success' };
    else if (url.pathname.endsWith('/reviews')) response = chunk(reviews);
    else if (path === '/graphql') {
      const offset = body.variables.cursor === null ? 0 : Number(body.variables.cursor);
      const nodes = threads.slice(offset, offset + 100); const end = offset + nodes.length;
      response = { data: { repository: { pullRequest: { id: raw.node_id, number: 7, headRefOid: HEAD, reviewDecision: 'APPROVED',
        reviewThreads: { totalCount: threads.length, nodes, pageInfo: { hasNextPage: end < threads.length,
          endCursor: nodes.length ? String(end) : null } } } } } };
    } else throw Error(`unexpected ${path}`);
    return edit ? await edit({ request, response, page, number, calls }) ?? response : response;
  };
  return { transport, calls, raw };
}

test('numeric REST and GraphQL pagination accept complete 0, 99, 100 and 101 item collections', async () => {
  for (const n of [0, 99, 100, 101]) {
    const f = fixture({ runs: list(n, run), statuses: list(n, status), reviews: list(n, review), suites: list(n, suite), threads: list(n, thread) });
    const result = await new GitHubAutopilotProvider({ transport: f.transport }).inspectPr(target);
    assert.equal(result.ready, n > 0, String(n));
    assert.equal(result.gates.checks, n > 0 ? 'passed' : 'blocked');
    assert.equal(result.gates.threads, 'resolved');
    assert.equal(result.approvedReviewers.length, n);
    const reviews = f.calls.filter((r) => r.path.includes('/reviews?'));
    assert.equal(reviews.length, n >= 100 ? 2 : 1);
    if (n >= 100) assert.match(reviews[1].path, /&page=2$/);
    assert.ok(f.calls.filter((r) => r.path.includes('/check-runs?')).every((r) => !r.path.includes('filter=all')));
    assert.equal(result.observation.byteAccounting, 'approximate-serialized-json');
    assert.ok(result.observation.finishedAt >= result.observation.startedAt);
  }
});

test('blockers on page two cannot be hidden by a successful first page', async () => {
  for (const kind of ['run', 'status', 'review', 'thread']) {
    const runs = list(101, run); const statuses = list(101, status); const reviews = list(101, review); const threads = list(101, thread);
    if (kind === 'run') runs[100].conclusion = 'failure';
    if (kind === 'status') statuses[100].state = 'failure';
    if (kind === 'review') reviews[100].state = 'CHANGES_REQUESTED';
    if (kind === 'thread') threads[100].isResolved = false;
    const f = fixture({ runs, statuses, reviews, threads });
    const result = await new GitHubAutopilotProvider({ transport: f.transport }).inspectPr(target);
    assert.equal(result.ready, false, kind);
    assert.equal(result.gates[kind === 'thread' ? 'threads' : kind === 'review' ? 'review' : 'checks'], 'blocked', kind);
    assert.equal(f.calls.some((r) => r.method !== 'GET' && r.path !== '/graphql'), false);
  }
});

test('combined statuses retain current-context semantics and allow empty pending with successful runs', async () => {
  for (const statuses of [[], [{ id: 25, context: 'Build', state: 'success' }]]) {
    const f = fixture({ statuses });
    const result = await new GitHubAutopilotProvider({ transport: f.transport }).inspectPr(target);
    assert.equal(result.ready, true);
    assert.equal(f.calls.some((r) => r.path.includes('/statuses')), false);
  }
  const inconsistent = fixture({ statuses: [status(1)], edit: ({ request, response }) => {
    if (request.path.includes('/status?')) response.state = 'failure';
  } });
  assert.equal((await new GitHubAutopilotProvider({ transport: inconsistent.transport }).inspectPr(target)).gates.checks, 'unknown');
});

test('malformed, duplicate and unstable REST collections remain unknown', async () => {
  for (const endpoint of ['check-runs', 'check-suites', 'status', 'reviews']) for (const fault of ['duplicate', 'malformed', 'count', 'short']) {
    if (endpoint === 'reviews' && fault === 'count') continue;
    const f = fixture({ runs: list(101, run), suites: list(101, suite), statuses: list(101, status), reviews: list(101, review),
      edit: ({ request, response, page }) => {
        if (!request.path.includes(`/${endpoint}?`) || page !== 2) return;
        const batch = Array.isArray(response) ? response : response[endpoint === 'status' ? 'statuses' : endpoint.replace('-', '_')];
        if (fault === 'duplicate') batch[0].id = 1;
        if (fault === 'malformed') batch[0] = null;
        if (fault === 'count') response.total_count += 1;
        if (fault === 'short') batch.length = 0;
      } });
    const result = await new GitHubAutopilotProvider({ transport: f.transport }).inspectPr(target);
    // A terminal empty reviews page is valid because that endpoint has no total.
    if (endpoint === 'reviews' && fault === 'short') assert.equal(result.ready, true);
    else {
      assert.equal(result.ready, false, `${endpoint} ${fault}`);
      assert.equal(result.gates[endpoint === 'reviews' ? 'review' : 'checks'], 'unknown', `${endpoint} ${fault}`);
    }
  }
  const duplicateContext = fixture({ statuses: [{ id: 1, context: 'Build', state: 'success' }, { id: 2, context: 'build', state: 'success' }] });
  assert.equal((await new GitHubAutopilotProvider({ transport: duplicateContext.transport }).inspectPr(target)).gates.checks, 'unknown');
});

test('check-suite cap needs complete unfiltered exact-head inventory, including at exactly 1000', async () => {
  const valid = fixture({ suites: list(1000, suite) });
  assert.equal((await new GitHubAutopilotProvider({ transport: valid.transport }).inspectPr(target)).ready, true);
  assert.equal(valid.calls.filter((r) => r.path.includes('/check-suites?')).length, 10);
  assert.ok(valid.calls.filter((r) => r.path.includes('/check-suites?')).every((r) => !/app_id|check_name/.test(r.path)));
  for (const fault of ['excess', 'missing', 'wrong-head', 'unstable']) {
    const f = fixture({ suites: list(fault === 'excess' ? 1001 : 101, suite), edit: ({ request, response, page }) => {
      if (!request.path.includes('/check-suites?')) return;
      if (fault === 'missing') return {};
      if (fault === 'wrong-head') response.check_suites[0].head_sha = BASE;
      if (fault === 'unstable' && page === 2) response.total_count = 102;
    } });
    const result = await new GitHubAutopilotProvider({ transport: f.transport }).inspectPr(target);
    assert.equal(result.ready, false, fault); assert.equal(result.gates.checks, 'unknown', fault);
  }
});

test('GraphQL rejects partial errors, null nodes, duplicate IDs, cursor faults, count and decision drift', async () => {
  for (const fault of ['errors', 'errors-null', 'missing', 'null', 'duplicate', 'nonadvancing', 'cyclic', 'count', 'decision', 'mismatch', 'identity', 'head', 'cursor']) {
    const f = fixture({ threads: list(201, thread), edit: ({ request, response, number }) => {
      if (request.path !== '/graphql') return;
      const pr = response.data.repository.pullRequest;
      const connection = pr.reviewThreads;
      if (fault === 'errors') response.errors = [{ message: 'partial data' }];
      if (fault === 'errors-null') response.errors = null;
      if (fault === 'missing') delete pr.reviewDecision;
      if (fault === 'identity') pr.id = 'other';
      if (fault === 'head') pr.headRefOid = BASE;
      if (fault === 'cursor') delete connection.pageInfo.endCursor;
      if (number > 1) {
        if (fault === 'null') connection.nodes[0] = null;
        if (fault === 'duplicate') connection.nodes[0].id = 'thread-1';
        if (fault === 'nonadvancing') connection.pageInfo.endCursor = '100';
        if (fault === 'cyclic' && number === 3) connection.pageInfo.endCursor = '100';
        if (fault === 'count') connection.totalCount += 1;
        if (fault === 'decision') pr.reviewDecision = 'CHANGES_REQUESTED';
      }
      if (fault === 'mismatch') connection.pageInfo.hasNextPage = false;
    } });
    const result = await new GitHubAutopilotProvider({ transport: f.transport }).inspectPr(target);
    assert.equal(result.ready, false, fault); assert.equal(result.gates.threads, 'unknown', fault);
  }
});

test('final identity, PR and actual ref drift all forbid readiness', async () => {
  for (const fault of ['account-id', 'repository-id', 'pr-id', 'node-id', 'state', 'draft', 'base-ref', 'head-ref', 'base-sha', 'head-sha', 'base-tip', 'head-tip', 'mergeability']) {
    const f = fixture({ edit: ({ request, response, number }) => {
      if (request.path === '/user' && number === 2 && fault === 'account-id') response.id += 1;
      if (request.path === '/repos/acme/project' && number === 2 && fault === 'repository-id') response.id += 1;
      if (request.path === '/repos/acme/project/pulls/7' && number === 2) {
        if (fault === 'pr-id') response.id += 1;
        if (fault === 'node-id') response.node_id = 'other';
        if (fault === 'state') response.state = 'closed';
        if (fault === 'draft') response.draft = true;
        if (fault === 'base-ref') response.base.ref = 'release';
        if (fault === 'head-ref') response.head.ref = 'other';
        if (fault === 'base-sha') response.base.sha = HEAD;
        if (fault === 'head-sha') response.head.sha = BASE;
        if (fault === 'mergeability') response.mergeable = false;
      }
      if (request.path.endsWith('/heads/main') && fault === 'base-tip') response.object.sha = HEAD;
      if (request.path.endsWith('/heads/feature') && fault === 'head-tip') response.object.sha = BASE;
    } });
    const result = await new GitHubAutopilotProvider({ transport: f.transport }).inspectPr(target);
    assert.equal(result.ready, false, fault); assert.equal(result.observation.consistent, false, fault);
    assert.equal(result.gates.checks, 'unknown', fault);
  }
});

test('request and byte budgets cover identity, policy and final ref reads', async () => {
  const baseline = fixture();
  const result = await new GitHubAutopilotProvider({ transport: baseline.transport }).diagnosePr({ ...target, reviewPolicy: 'independent-oms' });
  assert.equal(result.ready, true);
  const requests = baseline.calls.length;
  assert.equal(result.observation.requests, requests);
  assert.ok(baseline.calls.some((r) => r.path.endsWith('/protection')));
  for (const maxRequests of [1, requests - 1]) {
    const f = fixture();
    await assert.rejects(new GitHubAutopilotProvider({ transport: f.transport, observationLimits: { maxRequests } })
      .diagnosePr({ ...target, reviewPolicy: 'independent-oms' }), { code: 'REQUEST_LIMIT' });
    assert.equal(f.calls.length, maxRequests);
  }
  const f = fixture();
  await assert.rejects(new GitHubAutopilotProvider({ transport: f.transport, observationLimits: { maxBytes: result.observation.bytes - 1 } })
    .diagnosePr({ ...target, reviewPolicy: 'independent-oms' }), { code: 'OBSERVATION_LIMIT' });
  for (const limits of [{ maxRequests: 0 }, { timeoutMs: Infinity }, { maxBytes: -1 }, { unbounded: true }])
    assert.throws(() => new GitHubAutopilotProvider({ observationLimits: limits }), { code: 'INVALID_INPUT' });
});

test('timeout during final read aborts that read and cannot return ready', async () => {
  let finalSignal;
  const f = fixture({ edit: async ({ request, number }) => {
    if (request.path === '/repos/acme/project/pulls/7' && number === 2) {
      finalSignal = request.signal;
      await new Promise((resolve) => request.signal.addEventListener('abort', resolve, { once: true }));
    }
  } });
  await assert.rejects(new GitHubAutopilotProvider({ transport: f.transport, observationLimits: { timeoutMs: 100 } })
    .inspectPr(target), { code: 'TIMEOUT' });
  assert.equal(finalSignal.aborted, true);
});

test('pre-abort sends no request and concurrent observations isolate cancellation, bytes and request counts', async () => {
  const controller = new AbortController(); controller.abort(); const untouched = fixture();
  await assert.rejects(new GitHubAutopilotProvider({ transport: untouched.transport }).inspectPr(target, { signal: controller.signal }), { code: 'ABORTED' });
  assert.equal(untouched.calls.length, 0);
  const signals = []; let release; const waiting = new Promise((resolve) => { release = resolve; });
  const f = fixture({ edit: async ({ request }) => {
    if (request.path !== '/user') return;
    if (!signals.includes(request.signal)) signals.push(request.signal);
    if (signals.length === 2) release();
    await waiting;
  } });
  const provider = new GitHubAutopilotProvider({ transport: f.transport, observationLimits: { maxRequests: 13 } });
  const abort = new AbortController();
  const a = provider.inspectPr(target, { signal: abort.signal });
  const b = provider.inspectPr(target); await waiting; abort.abort();
  await assert.rejects(a, { code: 'ABORTED' });
  const result = await b;
  assert.equal(result.ready, true); assert.equal(result.observation.requests, 13);
  assert.notEqual(signals[0], signals[1]); assert.equal(signals[1].aborted, false);
  const single = await new GitHubAutopilotProvider({ transport: fixture().transport }).inspectPr(target);
  assert.equal(result.observation.bytes, single.observation.bytes);
  assert.deepEqual(getEventListeners(abort.signal, 'abort'), []);
  for (const signal of signals) assert.deepEqual(getEventListeners(signal, 'abort'), []);
});

async function fakeExecutable(t, source, runTest) {
  const root = await mkdtemp(join(tmpdir(), 'oms-gh-pagination-'));
  const originalSpawn = childProcess.spawn; const children = []; const cwds = []; const closed = new Set();
  const executable = join(root, 'fake-gh');
  try {
    await writeFile(executable, `#!${process.execPath}\n${source}`); await chmod(executable, 0o700);
    t.mock.method(childProcess, 'spawn', (binary, args, options) => {
      assert.equal(binary, executable); assert.equal(options.shell, false);
      const child = originalSpawn(process.execPath, [executable, ...args], options);
      child.once('close', () => closed.add(child));
      children.push(child); cwds.push(options.cwd); return child;
    });
    syncBuiltinESMExports();
    await runTest({ root, executable, children, cwds });
    assert.equal(closed.size, children.length);
    assert.ok(children.every((c) => c.exitCode !== null || c.signalCode !== null));
    const { access } = await import('node:fs/promises');
    for (const cwd of cwds) await assert.rejects(access(cwd), { code: 'ENOENT' });
  } finally {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    t.mock.restoreAll(); syncBuiltinESMExports(); await rm(root, { recursive: true, force: true });
  }
}

test('official gh cancellation observes actual child closure and removes temp cwd', async (t) => {
  await fakeExecutable(t, "process.stdout.write('started'); setInterval(()=>{},1000);", async ({ executable, children }) => {
    const transport = createGhTransport({ executable });
    const controller = new AbortController();
    const pending = new GitHubAutopilotProvider({ transport }).inspectPr(target, { signal: controller.signal });
    while (children.length === 0) await delay(1);
    await new Promise((resolve) => children[0].stdout.once('data', resolve)); controller.abort();
    await assert.rejects(pending, { code: 'ABORTED' });
    assert.equal(children[0].signalCode, 'SIGKILL');
    assert.deepEqual(getEventListeners(controller.signal, 'abort'), []);
    const pre = new AbortController(); pre.abort();
    await assert.rejects(transport({ path: '/user', signal: pre.signal }), { code: 'ABORTED' });
    assert.equal(children.length, 1);
    await assert.rejects(new GitHubAutopilotProvider({ transport, observationLimits: { timeoutMs: 200 } }).inspectPr(target), { code: 'TIMEOUT' });
    assert.equal(children.length, 2);
  });
});

test('gh counts actual stdout and stderr across requests before JSON parsing', async (t) => {
  const source = `const path=process.argv[process.argv.indexOf('--method')+2];
process.stderr.write('e'.repeat(200));
process.stdout.write(' '.repeat(200)+JSON.stringify(path==='/user'?{id:10,login:'maintainer'}:{id:20,full_name:'acme/project'}));`;
  await fakeExecutable(t, source, async ({ executable, children }) => {
    const provider = new GitHubAutopilotProvider({ transport: createGhTransport({ executable }), observationLimits: { maxBytes: 600 } });
    await assert.rejects(provider.inspectPr(target), { code: 'OBSERVATION_LIMIT' });
    assert.equal(children.length, 2);
  });
});

test('successful instrumented observation reports the actual bytes from both streams', async (t) => {
  const f = fixture(); const responses = {};
  await new GitHubAutopilotProvider({ transport: async (request) => {
    const response = await f.transport(request); responses[request.path] = response; return response;
  } }).inspectPr(target);
  const source = `const responses=${JSON.stringify(responses)};
const path=process.argv[process.argv.indexOf('--method')+2];
process.stderr.write('diagnostic');process.stdout.write('  '+JSON.stringify(responses[path]));`;
  await fakeExecutable(t, source, async ({ executable }) => {
    const controller = new AbortController();
    const result = await new GitHubAutopilotProvider({ transport: createGhTransport({ executable }) })
      .inspectPr(target, { signal: controller.signal });
    assert.equal(result.ready, true);
    assert.equal(result.observation.byteAccounting, 'actual-stdout-stderr');
    const expected = f.calls.reduce((sum, { path }) => sum + Buffer.byteLength(JSON.stringify(responses[path])) + 12, 0);
    assert.equal(result.observation.bytes, expected);
    assert.deepEqual(getEventListeners(controller.signal, 'abort'), []);
  });
});

test('transport timeout and per-request flood await closure and redact stderr', async (t) => {
  await fakeExecutable(t, "process.stderr.write('secret'.repeat(1000));setInterval(()=>{},1000);", async ({ executable }) => {
    await assert.rejects(createGhTransport({ executable, maxOutputBytes: 100 })({ path: '/user' }),
      (e) => e.code === 'OUTPUT_LIMIT' && !e.message.includes('secret'));
    await assert.rejects(createGhTransport({ executable, timeoutMs: 100 })({ path: '/user' }),
      (e) => e.code === 'TIMEOUT' && !e.message.includes('secret'));
  });
});

for (const stream of ['stdout', 'stderr']) for (const stop of ['abort', 'timeout', 'output-limit', 'exit']) {
  test(`gh ${stop} settles after direct exit while a descendant holds ${stream} open`, async (t) => {
    const source = `const {spawn}=require('node:child_process');
const {existsSync,readFileSync}=require('node:fs');
const {join}=require('node:path');
const ready=join(process.cwd(),'descendant.pid');
spawn(process.execPath,['-e',"require('node:fs').writeFileSync(process.argv[1],String(process.pid));setInterval(()=>{},1000);",ready],
  {stdio:['ignore',${stream === 'stdout' ? '1' : "'ignore'"},${stream === 'stderr' ? '2' : "'ignore'"}]}).unref();
process.stdout.write('{}');
let acted=false;
setInterval(()=>{
  const action=join(process.cwd(),'action');
  if (acted || !existsSync(action)) return;
  acted=true;
  if (readFileSync(action,'utf8')==='exit') process.exit(0);
  process.stderr.write('x'.repeat(200));
},10);`;
    await fakeExecutable(t, source, async ({ executable, children, cwds }) => {
      const controller = new AbortController(); let bytes = 0; let descendantPid; let bound;
      const pending = createGhTransport({ executable, timeoutMs: 1000, maxOutputBytes: 100 })({
        path: '/user', signal: controller.signal, onBytes: (n) => { bytes += n; },
      }).then((value) => ({ value }), (reason) => ({ reason }));
      try {
        for (let attempt = 0; attempt < 300 && !descendantPid; attempt += 1) {
          if (cwds.length) {
            try { descendantPid = Number(await readFile(join(cwds[0], 'descendant.pid'), 'utf8')); }
            catch (reason) { if (reason.code !== 'ENOENT') throw reason; }
          }
          if (!descendantPid) await delay(10);
        }
        assert.ok(Number.isSafeInteger(descendantPid) && descendantPid > 0, 'descendant acknowledged startup');
        process.kill(descendantPid, 0);
        assert.equal(children[0].exitCode, null);
        assert.equal(children[0].signalCode, null);
        let exited = false; children[0].once('exit', () => { exited = true; });
        if (stop === 'abort') controller.abort();
        if (stop === 'output-limit' || stop === 'exit') await writeFile(join(cwds[0], 'action'), stop);
        const result = await Promise.race([pending, new Promise((_, reject) => {
          bound = setTimeout(() => reject(Error('transport waited for inherited pipes')), 2000);
        })]);
        assert.equal(result.reason?.code, { abort: 'ABORTED', timeout: 'TIMEOUT', 'output-limit': 'OUTPUT_LIMIT', exit: 'TRANSPORT_ERROR' }[stop]);
        assert.equal(exited, true, 'settlement follows observed direct child exit');
        assert.equal(stop === 'exit' ? children[0].exitCode : children[0].signalCode, stop === 'exit' ? 0 : 'SIGKILL');
        process.kill(descendantPid, 0);
        assert.equal(bytes, stop === 'output-limit' ? 202 : 2);
        assert.ok(children[0].stdout.destroyed && children[0].stderr.destroyed && children[0].stdin.destroyed);
        assert.deepEqual(getEventListeners(children[0].stdout, 'data'), []);
        assert.deepEqual(getEventListeners(children[0].stderr, 'data'), []);
        assert.deepEqual(getEventListeners(children[0].stdin, 'error'), []);
        assert.deepEqual(getEventListeners(children[0], 'error'), []);
        assert.deepEqual(getEventListeners(children[0], 'exit'), []);
        assert.deepEqual(getEventListeners(controller.signal, 'abort'), []);
      } finally {
        clearTimeout(bound);
        if (descendantPid) {
          try { process.kill(descendantPid, 'SIGKILL'); }
          catch (reason) { if (reason.code !== 'ESRCH') throw reason; }
        }
        for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        await pending;
      }
    });
  });
}
