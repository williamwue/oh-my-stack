import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { executeGitHubWorkflow } from '../tools/github-workflow.mjs';

const BASE = 'a'.repeat(40), HEAD = 'b'.repeat(40), MERGE = 'c'.repeat(40);
const target = { repo: 'acme/project', account: 'maintainer', pr: 7, base: 'main', head: 'feature', baseSha: BASE, headSha: HEAD };
const auth = (workflow, action, operationId) => ({ approved: true, workflow, action, operationId,
  ...target, actorSession: 'root-1', rootSession: 'root-1', ownerSession: 'writer-1',
  targetPolicy: 'server-policy', patchId: 'patch-abc' });
const review = { ...target, writerSession: 'writer-1', reviewerSession: 'reviewer-1', patchId: 'patch-abc',
  verdict: 'PASS', verification: [{ command: 'npm test', status: 'passed', observed: 'All tests passed' }] };
const reviewReceipt = { ...target, owner: 'maintainer', reviewer: 'reviewer', verdict: 'passed' };
const frontier = { ...target, bottomPr: 7, frozen: true, countersignedBy: 'root-1', patchId: 'patch-abc' };

function fake({ ambiguousCreate = false, ambiguousMerge = false } = {}) {
  const calls = []; let created = false, merged = false;
  const pr = () => ({ number: 7, state: 'open', merged, draft: false, mergeable: true, mergeable_state: 'clean',
    merge_commit_sha: merged ? MERGE : null, html_url: 'https://github.com/acme/project/pull/7',
    base: { ref: 'main', sha: BASE, repo: { full_name: target.repo } },
    head: { ref: 'feature', sha: HEAD, repo: { full_name: target.repo } } });
  const transport = async (r) => {
    calls.push(r); const { method, path } = r;
    if (path === '/user') return { login: 'maintainer' };
    if (path === '/repos/acme/project') return { full_name: target.repo, default_branch: 'main' };
    if (path === '/repos/acme/project/git/ref/heads/main') return { object: { sha: BASE } };
    if (path === '/repos/acme/project/git/ref/heads/feature') return { object: { sha: HEAD } };
    if (path === '/repos/acme/project/branches/main') return { name: 'main', commit: { sha: BASE }, protected: true };
    if (path === '/repos/acme/project/pulls/7') return pr();
    if (path === '/repos/acme/project/pulls/7/reviews?per_page=100') return [{ id: 1, user: { login: 'reviewer' }, state: 'APPROVED', commit_id: HEAD }];
    if (path.endsWith('/check-runs?per_page=100')) return { total_count: 1, check_runs: [{ head_sha: HEAD, status: 'completed', conclusion: 'success' }] };
    if (path.endsWith('/status?per_page=100')) return { sha: HEAD, state: 'success', total_count: 0, statuses: [] };
    if (path === '/graphql') return { data: { repository: { pullRequest: { reviewDecision: 'APPROVED', reviewThreads: { nodes: [], pageInfo: { hasNextPage: false } } } } } };
    if (path.startsWith('/repos/acme/project/pulls?')) return created ? [{ ...pr(), body: calls.find((x) => x.method === 'POST' && x.path === '/repos/acme/project/pulls').body.body }] : [];
    if (method === 'POST' && path === '/repos/acme/project/pulls') { created = true; if (ambiguousCreate) throw Error('timeout'); return pr(); }
    if (method === 'PUT' && path === '/repos/acme/project/pulls/7/merge') { merged = true; if (ambiguousMerge) throw Error('timeout'); return { merged: true, sha: MERGE }; }
    throw Error(`unexpected ${method} ${path}`);
  };
  return { calls, transport };
}

async function context(fn) {
  const root = await mkdtemp(join(tmpdir(), 'oms-gh-workflow-test-'));
  const journal = { mode: 'create', private: true, storeRoot: root, storePath: join(root, 'journal.json'), runId: 'single-pr', generation: 1 };
  try { await fn(journal); } finally { await rm(root, { recursive: true, force: true }); }
}

test('create, inspect, and ambiguous recovery never repeat POST', async () => context(async (journal) => {
  const f = fake({ ambiguousCreate: true });
  const request = { workflow: 'opening-a-pr', provider: 'github.com', action: 'create', target,
    operationId: 'create-1', journal, authorization: auth('opening-a-pr', 'create', 'create-1'), title: 'A PR', body: 'Body' };
  await assert.rejects(executeGitHubWorkflow(request, { transport: f.transport }), (e) => e.code === 'API_ERROR');
  const recovered = await executeGitHubWorkflow({ ...request, action: 'recover', journal: { ...journal, mode: 'load' } }, { transport: f.transport });
  assert.equal(recovered.pr, 7);
  await assert.rejects(executeGitHubWorkflow({ ...request, action: 'create', journal: { ...journal, mode: 'load' } }, { transport: f.transport }),
    (e) => e.code === 'RECOVERY_REQUIRED');
  assert.equal(f.calls.filter((c) => c.method === 'POST' && c.path === '/repos/acme/project/pulls').length, 1);
  const raw = await readFile(journal.storePath, 'utf8');
  assert.doesNotMatch(raw, /"Body"/);
}));

test('babysit check cannot create or merge even with forged authority', async () => {
  const f = fake();
  const result = await executeGitHubWorkflow({ workflow: 'babysit', provider: 'github.com', action: 'inspect', mode: 'check', target }, { transport: f.transport });
  assert.equal(result.ready, true);
  await assert.rejects(executeGitHubWorkflow({ workflow: 'babysit', provider: 'github.com', action: 'merge', mode: 'check', target,
    authorization: auth('babysit', 'merge', 'x') }, { transport: f.transport }), (e) => e.code === 'UNSUPPORTED_ACTION');
  assert.equal(f.calls.filter((c) => c.method === 'PUT').length, 0);
});

test('independent root shipping requires server policy and recovers ambiguous merge without repeat PUT', async () => context(async (journal) => {
  const f = fake({ ambiguousMerge: true });
  const request = { workflow: 'shipping', provider: 'github.com', action: 'merge', target, operationId: 'merge-1', journal,
    authorization: auth('shipping', 'merge', 'merge-1'), review, reviewReceipt, frontier, targetPolicy: 'server-policy' };
  await assert.rejects(executeGitHubWorkflow({ ...request, targetPolicy: undefined }, { transport: f.transport }), (e) => e.code === 'UNSUPPORTED_TARGET_CAS');
  assert.equal(f.calls.length, 0);
  await assert.rejects(executeGitHubWorkflow(request, { transport: f.transport }), (e) => e.code === 'API_ERROR');
  const result = await executeGitHubWorkflow({ ...request, action: 'recover', journal: { ...journal, mode: 'load' } }, { transport: f.transport });
  assert.equal(result.status, 'merged');
  await assert.rejects(executeGitHubWorkflow({ ...request, action: 'recover', target: { ...target, headSha: 'd'.repeat(40) },
    journal: { ...journal, mode: 'load' } }, { transport: f.transport }), (e) => e.code === 'OPERATION_MISMATCH');
  assert.equal(f.calls.filter((c) => c.method === 'PUT').length, 1);
}));

test('invalid authority, independent review, frontier, and modes fail before network or store', async () => context(async (journal) => {
  const f = fake();
  const base = { workflow: 'shipping', provider: 'github.com', action: 'merge', target, operationId: 'merge-1', journal,
    authorization: auth('shipping', 'merge', 'merge-1'), review, reviewReceipt, frontier, targetPolicy: 'server-policy' };
  const bad = [
    { ...base, provider: 'github.example.com' },
    { ...base, authorization: { ...base.authorization, actorSession: 'child-1' } },
    { ...base, authorization: { ...base.authorization, headSha: 'd'.repeat(40) } },
    { ...base, authorization: { ...base.authorization, targetPolicy: 'strict' } },
    { ...base, authorization: { ...base.authorization, patchId: 'other-patch' } },
    { ...base, review: { ...review, reviewerSession: 'writer-1' } },
    { ...base, review: { ...review, verification: [] } },
    { ...base, review: { ...review, verification: new Array(1) } },
    { ...base, review: { ...review, verification: [{ command: 'npm test', status: 'failed', observed: '1 failure' }] } },
    { ...base, reviewReceipt: { ...reviewReceipt, headSha: 'd'.repeat(40) } },
    { ...base, frontier: { ...frontier, bottomPr: 8 } },
    { ...base, mode: 'stack' },
  ];
  for (const request of bad) await assert.rejects(executeGitHubWorkflow(request, { transport: f.transport }));
  assert.equal(f.calls.length, 0);
  await assert.rejects(readFile(journal.storePath), { code: 'ENOENT' });
}));

test('in-flight caller edits cannot change the independently reviewed PR or authority', async () => context(async (journal) => {
  const f = fake();
  const request = structuredClone({ workflow: 'shipping', provider: 'github.com', action: 'merge', target,
    operationId: 'merge-1', journal, authorization: auth('shipping', 'merge', 'merge-1'),
    review, reviewReceipt, frontier, targetPolicy: 'server-policy' });
  const writes = [];
  const transport = async (r) => {
    if (r.method === 'PUT') writes.push(r.path);
    const otherPr = r.path.includes('/pulls/8');
    const output = await f.transport({ ...r, path: r.path.replace('/pulls/8', '/pulls/7') });
    return otherPr && output?.number === 7 ? { ...output, number: 8 } : output;
  };
  const pending = executeGitHubWorkflow(request, { transport });
  request.target.pr = 8;
  request.authorization.pr = 8;
  request.reviewReceipt.pr = 8;
  request.authorization.actorSession = 'child-1';
  request.authorization.targetPolicy = 'strict';
  request.targetPolicy = 'strict';
  const result = await pending;
  assert.equal(result.pr, 7);
  assert.deepEqual(writes, ['/repos/acme/project/pulls/7/merge']);
  const saved = JSON.parse(await readFile(journal.storePath, 'utf8'));
  assert.doesNotMatch(JSON.stringify(saved), /"pr":8/);
}));

test('CLI only accepts help and read-only inspect or recover grammar', () => {
  const tool = new URL('../tools/github-workflow.mjs', import.meta.url).pathname;
  assert.equal(spawnSync(process.execPath, [tool, '--help'], { encoding: 'utf8' }).status, 0);
  for (const args of [['merge', '--request', 'x'], ['inspect', '--request', 'x', '--extra'], ['recover', '--request', 'x', '--merge']])
    assert.equal(spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' }).status, 1);
});
