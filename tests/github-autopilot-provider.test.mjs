import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { chmod, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GitHubAutopilotProvider, createGhTransport } from '../tools/github-autopilot-provider.mjs';

const exec = promisify(execFile);
const tool = join(dirname(fileURLToPath(import.meta.url)), '../tools/github-autopilot-provider.mjs');
const BASE = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const MERGE = 'c'.repeat(40);
const target = { repo: 'acme/project', account: 'maintainer' };
const createInput = { operationId: 'create-1', ...target, base: 'main', head: 'feature', baseSha: BASE, headSha: HEAD,
  title: 'A PR', body: 'Safe body' };
const mergeInput = { operationId: 'merge-1', ...target, pr: 7, base: 'main', head: 'feature', baseSha: BASE, headSha: HEAD,
  acceptServerPolicyBoundary: true };
const auth = (input, action) => ({ approved: true, action, operationId: input.operationId, repo: input.repo,
  account: input.account, base: input.base, head: input.head, baseSha: input.baseSha, headSha: input.headSha,
  ...(input.pr ? { pr: input.pr } : {}) });
const receipt = { ...target, pr: 7, base: 'main', head: 'feature', baseSha: BASE, headSha: HEAD,
  owner: 'maintainer', reviewer: 'reviewer', verdict: 'passed' };
const omsReview = { ...receipt, writerSession: 'writer-1', reviewerSession: 'reviewer-1', patchId: 'patch-abc',
  verdict: 'PASS', verification: [{ command: 'node --test', status: 'passed', observed: 'tests passed' }] };
const omsAuth = { ...auth(mergeInput, 'merge'), actorSession: 'root-1', rootSession: 'root-1',
  ownerSession: 'writer-1', reviewPolicy: 'independent-oms', targetPolicy: 'server-policy', patchId: 'patch-abc' };

function fakeGitHub({ createAmbiguous = false, mergeAmbiguous = false } = {}) {
  const calls = []; let created = false; let merged = false; let head = HEAD; let base = BASE;
  let draft = false; let checks = 'passed'; let threads = 'resolved'; let review = 'APPROVED'; let mergeability = 'clean';
  let protectedBase = true; let sourceDeleted = false; let statusTruncated = false; let reviewState = 'APPROVED'; let graphErrors = false;
  let baseRef = 'main'; let headRef = 'feature'; let protection = { required_status_checks: { strict: true, contexts: ['ci/test'], checks: [{ context: 'ci/test', app_id: 123 }] },
    enforce_admins: { enabled: true }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false } };
  let rules = []; let policyError = false; let checksAvailable = true; let graphMissing = false; let checkApp = 123;
  let reviewList = null; let checkRuns = null; let statusResponse = null;
  const pr = () => ({ number: 7, state: 'open', draft, merged, merge_commit_sha: merged ? MERGE : null,
    mergeable: mergeability === 'clean' ? true : null, mergeable_state: mergeability,
    html_url: 'https://github.com/acme/project/pull/7',
    base: { ref: baseRef, sha: base, repo: { full_name: target.repo } },
    head: { ref: headRef, sha: head, repo: { full_name: target.repo } } });
  const transport = async (request) => {
    calls.push(request);
    const { method, path, body } = request;
    if (path === '/user') return { login: 'maintainer' };
    if (path === '/repos/acme/project') return { full_name: target.repo, default_branch: 'main', private: true };
    if (path === '/repos/acme/project/git/ref/heads/main') return { object: { sha: base } };
    if (path === `/repos/acme/project/git/ref/heads/${encodeURIComponent(headRef)}`) {
      if (sourceDeleted) throw Error('deleted'); return { object: { sha: head } };
    }
    if (path === '/repos/acme/project/branches/main') return { name: 'main', commit: { sha: base }, protected: protectedBase };
    if (path === '/repos/acme/project/branches/main/protection') { if (policyError) throw Error('403'); return protection; }
    if (path === '/repos/acme/project/rules/branches/main?per_page=100') return rules;
    if (path === '/repos/acme/project/pulls/7') return pr();
    if (path === '/repos/acme/project/pulls/7/reviews?per_page=100')
      return reviewList ?? (reviewState === 'NONE' ? [] : [{ id: 1, user: { login: 'reviewer' }, state: reviewState, commit_id: head }]);
    if (path.startsWith('/repos/acme/project/commits/') && path.includes('/check-runs'))
      return checkRuns ?? { total_count: checksAvailable ? 1 : 0, check_runs: checksAvailable ? [{ id: 11, name: 'ci/test', app: { id: checkApp }, head_sha: head,
        status: checks === 'unknown' ? 'queued' : 'completed', conclusion: checks === 'unknown' ? null : checks === 'passed' ? 'success' : 'failure' }] : [] };
    if (path.startsWith('/repos/acme/project/commits/') && path.includes('/status'))
      return statusResponse ?? { sha: head, state: 'success', total_count: statusTruncated ? 1 : 0, statuses: [] };
    if (path === '/graphql') return { ...(graphErrors ? { errors: [{ message: 'partial' }] } : {}), data: { repository: { pullRequest: { ...(graphMissing ? {} : { reviewDecision: review }),
      reviewThreads: { nodes: [{ isResolved: threads === 'resolved' }], pageInfo: { hasNextPage: threads === 'unknown' } } } } } };
    if (path.startsWith('/repos/acme/project/pulls?')) return created ? [{ ...pr(), body: calls.find((c) => c.path === '/repos/acme/project/pulls' && c.method === 'POST')?.body?.body }] : [];
    if (method === 'POST' && path === '/repos/acme/project/pulls') { created = true; if (createAmbiguous) throw Error('timeout secret-credential'); return pr(); }
    if (method === 'PUT' && path === '/repos/acme/project/pulls/7/merge') { merged = true; if (mergeAmbiguous) throw Error('timeout secret-credential'); return { merged: true, sha: MERGE }; }
    throw Error(`unexpected ${method} ${path}`);
  };
  return { transport, calls, set: { head: (v) => { head = v; }, base: (v) => { base = v; }, draft: (v) => { draft = v; },
    checks: (v) => { checks = v; }, threads: (v) => { threads = v; }, review: (v) => { review = v; }, mergeability: (v) => { mergeability = v; },
    protectedBase: (v) => { protectedBase = v; }, sourceDeleted: (v) => { sourceDeleted = v; }, statusTruncated: (v) => { statusTruncated = v; },
    reviewState: (v) => { reviewState = v; }, graphErrors: (v) => { graphErrors = v; }, protection: (v) => { protection = v; },
    rules: (v) => { rules = v; }, policyError: (v) => { policyError = v; }, checksAvailable: (v) => { checksAvailable = v; },
    graphMissing: (v) => { graphMissing = v; }, checkApp: (v) => { checkApp = v; }, reviewList: (v) => { reviewList = v; },
    checkRuns: (v) => { checkRuns = v; }, statusResponse: (v) => { statusResponse = v; },
    baseRef: (v) => { baseRef = v; }, headRef: (v) => { headRef = v; } } };
}

async function withJournal(fn, fake = fakeGitHub()) {
  const root = await mkdtemp(join(tmpdir(), 'oms-gh-provider-test-'));
  const storePath = join(root, 'journal.json');
  try {
    const provider = await GitHubAutopilotProvider.create({ storeRoot: root, storePath, transport: fake.transport });
    await fn({ provider, fake, root, storePath, reload: () => GitHubAutopilotProvider.load({ storeRoot: root, storePath, transport: fake.transport }) });
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('GitHub provider exposes an authenticated exact-target read', async () => {
  const calls = [];
  const provider = new GitHubAutopilotProvider({ transport: async (request) => {
    calls.push(request);
    if (request.path === '/user') return { login: 'maintainer' };
    if (request.path === '/repos/acme/project') return { full_name: 'acme/project', default_branch: 'main', private: true };
    throw Error('unexpected request');
  }});
  const repo = await provider.inspectRepository({ repo: 'acme/project', account: 'maintainer' });
  assert.equal(repo.repo, 'acme/project');
  assert.deepEqual(calls.map(({ path }) => path), ['/user', '/repos/acme/project']);
});

test('target and account are explicit and verified', async () => {
  const fake = fakeGitHub(); const p = new GitHubAutopilotProvider({ transport: fake.transport });
  await assert.rejects(p.inspectRepository({ account: 'maintainer' }), (e) => e.code === 'INVALID_TARGET');
  await assert.rejects(p.inspectRepository({ repo: target.repo }), (e) => e.code === 'INVALID_ACCOUNT');
  await assert.rejects(p.inspectRepository({ ...target, account: 'intruder' }), (e) => e.code === 'ACCOUNT_MISMATCH');
  assert.equal(fake.calls.filter((c) => c.path.startsWith('/repos/')).length, 0);
  const absent = new GitHubAutopilotProvider({ transport: async () => null });
  await assert.rejects(absent.inspectRepository(target), (e) => e.code === 'ACCOUNT_MISMATCH');
  const wrongRepo = new GitHubAutopilotProvider({ transport: async ({ path }) => path === '/user'
    ? { login: target.account } : { full_name: 'acme/another' } });
  await assert.rejects(wrongRepo.inspectRepository(target), (e) => e.code === 'TARGET_MISMATCH');
});

test('inspect PR reports actual SHAs and conservative gates', async () => {
  const fake = fakeGitHub(); const p = new GitHubAutopilotProvider({ transport: fake.transport });
  assert.equal((await p.inspectPr({ ...target, pr: 7 })).ready, true);
  fake.set.head('d'.repeat(40));
  assert.equal((await p.inspectPr({ ...target, pr: 7 })).headSha, 'd'.repeat(40));
  fake.set.draft(true);
  assert.equal((await p.inspectPr({ ...target, pr: 7 })).ready, false);
  fake.set.draft(false); fake.set.checks('unknown');
  assert.equal((await p.inspectPr({ ...target, pr: 7 })).ready, false);
  fake.set.checks('passed'); fake.set.threads('unknown');
  assert.equal((await p.inspectPr({ ...target, pr: 7 })).gates.threads, 'unknown');
  fake.set.threads('resolved'); fake.set.statusTruncated(true);
  assert.equal((await p.inspectPr({ ...target, pr: 7 })).gates.checks, 'unknown');
  fake.set.statusTruncated(false); fake.set.graphErrors(true);
  assert.equal((await p.inspectPr({ ...target, pr: 7 })).ready, false);
  fake.set.graphErrors(false); fake.set.draft(undefined);
  assert.equal((await p.inspectPr({ ...target, pr: 7 })).ready, false);
});

test('diagnostic reports bounded current-head required check failure without relaxing inspection or merge', async () => {
  const fake = fakeGitHub(); fake.set.checks('failed'); fake.set.review(null); fake.set.reviewState('NONE');
  const p = new GitHubAutopilotProvider({ transport: fake.transport });
  const diagnostic = await p.diagnosePr({ ...target, pr: 7, reviewPolicy: 'independent-oms' });
  assert.equal(diagnostic.ready, false);
  assert.equal(diagnostic.headSha, HEAD);
  assert.deepEqual(diagnostic.requiredChecks, [{ name: 'ci/test', appId: 123, state: 'failed',
    runs: [{ id: 11, name: 'ci/test', appId: 123, headSha: HEAD, status: 'completed', conclusion: 'failure' }] }]);
  assert.equal(diagnostic.gates.checks, 'blocked');
  assert.equal(diagnostic.mergeableState, 'clean');
  await assert.rejects(p.inspectPr({ ...target, pr: 7, reviewPolicy: 'independent-oms' }), (e) => e.code === 'REQUIRED_CHECK_BLOCKED');
  await withJournal(async ({ provider }) => {
    await assert.rejects(provider.mergePullRequest({ ...mergeInput, reviewPolicy: 'independent-oms', authorization: omsAuth,
      review: omsReview, frontier: { ...omsReview, bottomPr: 7, frozen: true, countersignedBy: 'root-1' } }),
    (e) => e.code === 'REQUIRED_CHECK_BLOCKED');
  }, fake);
  assert.equal(fake.calls.filter((c) => !['GET'].includes(c.method) && c.path !== '/graphql').length, 0);
});

test('diagnostic distinguishes missing, pending, wrong-app, stale, and incomplete check data', async () => {
  const cases = [
    [(f) => f.set.checksAvailable(false), 'missing'],
    [(f) => f.set.checks('unknown'), 'pending'],
    [(f) => f.set.checkApp(456), 'missing'],
    [(f) => f.set.checkRuns({ total_count: 1, check_runs: [{ id: 12, name: 'ci/test', app: { id: 123 },
      head_sha: 'd'.repeat(40), status: 'completed', conclusion: 'success' }] }), 'missing'],
    [(f) => f.set.checkRuns({ total_count: 2, check_runs: [{ id: 11, name: 'ci/test', app: { id: 123 },
      head_sha: HEAD, status: 'completed', conclusion: 'success' }] }), 'unknown'],
    [(f) => f.set.checkRuns({ total_count: 1, check_runs: [{ id: 'bad', name: 'ci/test', app: { id: 123 },
      head_sha: HEAD, status: 'completed', conclusion: 'success' }] }), 'unknown'],
    [(f) => f.set.checkRuns({ total_count: 1, check_runs: [{ id: 11, name: 'ci/test', app: { id: 123 },
      head_sha: HEAD, status: 'completed', conclusion: null }] }), 'unknown'],
    [(f) => f.set.checkRuns({ total_count: 1, check_runs: [{ id: 11, name: 'ci/test', app: { id: 123 },
      head_sha: HEAD, status: 'queued', conclusion: 'success' }] }), 'unknown'],
    [(f) => f.set.statusTruncated(true), 'unknown'],
    [(f) => f.set.statusResponse({ sha: HEAD, state: 'bogus', total_count: 0, statuses: [] }), 'unknown'],
  ];
  for (const [setup, state] of cases) {
    const fake = fakeGitHub(); fake.set.review(null); fake.set.reviewState('NONE'); setup(fake);
    const p = new GitHubAutopilotProvider({ transport: fake.transport });
    const diagnostic = await p.diagnosePr({ ...target, pr: 7, reviewPolicy: 'independent-oms' });
    assert.equal(diagnostic.ready, false, state);
    assert.equal(diagnostic.requiredChecks[0].state, state);
    assert.equal(fake.calls.some((c) => c.method === 'PUT' || (c.method === 'POST' && c.path !== '/graphql')), false);
  }
});

test('null and malformed check observations stay unknown under both review policies', async () => {
  const cases = [
    (f) => f.set.checkRuns({ total_count: 1, check_runs: [null] }),
    (f) => f.set.statusResponse({ sha: HEAD, state: 'success', total_count: 1, statuses: [null] }),
    (f) => f.set.checkRuns({ total_count: 1, check_runs: [{ id: 'bad', name: null, app: null,
      head_sha: HEAD, status: 'completed', conclusion: 'success' }] }),
  ];
  for (const setup of cases) for (const reviewPolicy of ['github-review', 'independent-oms']) {
    const fake = fakeGitHub(); setup(fake);
    const p = new GitHubAutopilotProvider({ transport: fake.transport });
    const diagnostic = await p.diagnosePr({ ...target, pr: 7, reviewPolicy });
    assert.equal(diagnostic.ready, false, reviewPolicy);
    assert.equal(diagnostic.gates.checks, 'unknown');
    if (reviewPolicy === 'independent-oms') assert.equal(diagnostic.requiredChecks[0].state, 'unknown');
    assert.equal(fake.calls.some((c) => c.method === 'PUT' || (c.method === 'POST' && c.path !== '/graphql')), false);
  }
});

test('independent OMS audits policy before rejecting malformed observations or merging', async () => {
  const fake = fakeGitHub(); fake.set.checkRuns({ total_count: 1, check_runs: [null] });
  fake.set.protection({ required_status_checks: { strict: true, contexts: ['ci/test'], checks: [{ context: 'ci/test', app_id: 123 }] },
    enforce_admins: { enabled: true }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false },
    required_pull_request_reviews: { required_approving_review_count: 0, dismiss_stale_reviews: true,
      require_code_owner_reviews: false, require_last_push_approval: false, unknown_review_rule: true } });
  const p = new GitHubAutopilotProvider({ transport: fake.transport });
  await assert.rejects(p.diagnosePr({ ...target, pr: 7, reviewPolicy: 'independent-oms' }),
    (e) => e.code === 'SERVER_POLICY_UNKNOWN');
  await assert.rejects(p.inspectPr({ ...target, pr: 7, reviewPolicy: 'independent-oms' }),
    (e) => e.code === 'SERVER_POLICY_UNKNOWN');
  fake.set.protection({ required_status_checks: { strict: true, contexts: ['ci/test'], checks: [{ context: 'ci/test', app_id: 123 }] },
    enforce_admins: { enabled: true }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false } });
  await withJournal(async ({ provider }) => {
    await assert.rejects(provider.mergePullRequest({ ...mergeInput, reviewPolicy: 'independent-oms', authorization: omsAuth,
      review: omsReview, frontier: { ...omsReview, bottomPr: 7, frozen: true, countersignedBy: 'root-1' } }),
    (e) => e.code === 'REQUIRED_CHECK_BLOCKED' || e.code === 'MERGE_BLOCKED');
  }, fake);
  assert.equal(fake.calls.some((c) => c.method === 'PUT'), false);
});

test('diagnostic fails closed on unsafe policy and snapshots caller target before reads', async () => {
  const fake = fakeGitHub(); fake.set.review(null); fake.set.reviewState('NONE');
  const p = new GitHubAutopilotProvider({ transport: fake.transport });
  const input = { ...target, pr: 7, reviewPolicy: 'independent-oms' };
  const pending = p.diagnosePr(input); input.repo = 'attacker/other'; input.account = 'attacker'; input.pr = 8;
  const diagnostic = await pending;
  assert.equal(diagnostic.repo, target.repo); assert.equal(diagnostic.pr, 7); assert.equal(diagnostic.ready, true);
  assert.equal(diagnostic.requiredChecks[0].state, 'passed');
  fake.set.review('APPROVED'); fake.set.reviewState('APPROVED');
  const defaultPolicy = await p.diagnosePr({ ...target, pr: 7 });
  assert.equal(defaultPolicy.ready, true); assert.deepEqual(defaultPolicy.requiredChecks, []);
  fake.set.mergeability('dirty');
  const conflict = await p.diagnosePr({ ...target, pr: 7, reviewPolicy: 'independent-oms' });
  assert.equal(conflict.mergeableState, 'dirty'); assert.equal(conflict.ready, false);
  for (const setup of [
    (f) => f.set.rules([{}]), (f) => f.set.protectedBase(false),
    (f) => f.set.protection({ required_status_checks: { strict: true, contexts: ['ci/test'], checks: [{ context: 'ci/test' }] } }),
    (f) => f.set.protection({ required_status_checks: { strict: true, contexts: ['ci/test'], checks: [{ context: 'ci/test', app_id: 123 }] },
      enforce_admins: { enabled: true }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false },
      required_pull_request_reviews: { required_approving_review_count: 0, require_code_owner_reviews: true } }),
  ]) {
    const unsafe = fakeGitHub(); setup(unsafe);
    await assert.rejects(new GitHubAutopilotProvider({ transport: unsafe.transport }).diagnosePr({ ...target, pr: 7, reviewPolicy: 'independent-oms' }),
      (e) => e.code === 'SERVER_POLICY_UNKNOWN');
    assert.equal(unsafe.calls.some((c) => c.method === 'PUT'), false);
  }
});

test('documented empty review restrictions remain auditable; populated bypass restrictions fail closed', async () => {
  const fake = fakeGitHub(); fake.set.review(null); fake.set.reviewState('NONE');
  const reviewRules = { url: 'https://api.github.com/repos/acme/project/branches/main/protection/required_pull_request_reviews',
    required_approving_review_count: 0, dismiss_stale_reviews: true, require_code_owner_reviews: false,
    require_last_push_approval: false, dismissal_restrictions: { url: 'https://api.github.com/repos/acme/project/branches/main/protection/dismissal_restrictions',
      users_url: 'https://api.github.com/repos/acme/project/branches/main/protection/dismissal_restrictions/users',
      teams_url: 'https://api.github.com/repos/acme/project/branches/main/protection/dismissal_restrictions/teams',
      users: [], teams: [], apps: [] },
    bypass_pull_request_allowances: { users: [], teams: [], apps: [] } };
  const protection = { required_status_checks: { strict: true, contexts: ['ci/test'], checks: [{ context: 'ci/test', app_id: 123 }] },
    enforce_admins: { enabled: true }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false },
    required_pull_request_reviews: reviewRules };
  fake.set.protection(protection);
  const p = new GitHubAutopilotProvider({ transport: fake.transport });
  assert.equal((await p.diagnosePr({ ...target, pr: 7, reviewPolicy: 'independent-oms' })).ready, true);
  fake.set.protection({ ...protection, required_pull_request_reviews: { ...reviewRules,
    bypass_pull_request_allowances: { users: [{ login: 'someone' }], teams: [], apps: [] } } });
  await assert.rejects(p.diagnosePr({ ...target, pr: 7, reviewPolicy: 'independent-oms' }),
    (e) => e.code === 'SERVER_POLICY_UNKNOWN');
});

test('unsafe review policy wins over red CI in diagnostic and strict inspection', async () => {
  const fake = fakeGitHub(); fake.set.checks('failed');
  fake.set.protection({ required_status_checks: { strict: true, contexts: ['ci/test'], checks: [{ context: 'ci/test', app_id: 123 }] },
    enforce_admins: { enabled: true }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false },
    required_pull_request_reviews: { required_approving_review_count: 0, dismiss_stale_reviews: true,
      require_code_owner_reviews: false, require_last_push_approval: false, unknown_review_rule: true } });
  const p = new GitHubAutopilotProvider({ transport: fake.transport });
  for (const action of [p.diagnosePr({ ...target, pr: 7, reviewPolicy: 'independent-oms' }),
    p.inspectPr({ ...target, pr: 7, reviewPolicy: 'independent-oms' })])
    await assert.rejects(action, (e) => e.code === 'SERVER_POLICY_UNKNOWN');
  assert.equal(fake.calls.some((c) => c.method === 'PUT'), false);
});

test('create journals intent, readback, deduplicates, and keeps body out of journal', async () => {
  await withJournal(async ({ provider, fake, storePath, reload }) => {
    const input = { ...createInput, body: 'secret-looking raw user content' };
    input.authorization = auth(input, 'create');
    const result = await provider.createPullRequest(input);
    assert.equal(result.pr, 7);
    assert.equal(fake.calls.filter((c) => c.method === 'POST' && c.path === '/repos/acme/project/pulls').length, 1);
    const raw = await readFile(storePath, 'utf8');
    assert.match(raw, /"intent"/); assert.match(raw, /"outcome"/);
    assert.doesNotMatch(raw, /secret-looking raw user content|Safe body|credential/);
    const second = await (await reload()).createPullRequest(input);
    assert.deepEqual(second, result);
    assert.equal(fake.calls.filter((c) => c.method === 'POST' && c.path === '/repos/acme/project/pulls').length, 1);
    await assert.rejects(provider.createPullRequest({ ...input, title: 'Changed' }), (e) => e.code === 'OPERATION_CONFLICT');
  });
});

test('ambiguous create recovers exact marker without repeating POST; pending blocks another write', async () => {
  const fake = fakeGitHub({ createAmbiguous: true });
  await withJournal(async ({ provider, reload }) => {
    const input = { ...createInput, authorization: auth(createInput, 'create') };
    await assert.rejects(provider.createPullRequest(input), (e) => e.code === 'API_ERROR');
    const fresh = await reload();
    await assert.rejects(fresh.createPullRequest({ ...input, operationId: 'create-2', authorization: auth({ ...input, operationId: 'create-2' }, 'create') }),
      (e) => e.code === 'PENDING_OPERATION');
    assert.equal((await fresh.recoverOperation({ operationId: 'create-1', ...target })).pr, 7);
    assert.equal(fake.calls.filter((c) => c.method === 'POST' && c.path === '/repos/acme/project/pulls').length, 1);
  }, fake);
});

test('create recovery keeps branch-retargeted PR outcome unknown', async () => {
  const fake = fakeGitHub({ createAmbiguous: true });
  await withJournal(async ({ provider, reload }) => {
    const input = { ...createInput, authorization: auth(createInput, 'create') };
    await assert.rejects(provider.createPullRequest(input), (e) => e.code === 'API_ERROR');
    fake.set.baseRef('release');
    await assert.rejects((await reload()).recoverOperation({ operationId: input.operationId, ...target }),
      (e) => e.code === 'RECOVERY_UNKNOWN');
    assert.equal(fake.calls.filter((c) => c.method === 'POST' && c.path === '/repos/acme/project/pulls').length, 1);
  }, fake);
});

test('create requires scope and pinned remote refs', async () => {
  await withJournal(async ({ provider, fake }) => {
    await assert.rejects(provider.createPullRequest(createInput), (e) => e.code === 'UNAUTHORIZED');
    await assert.rejects(provider.createPullRequest({ ...createInput, base: 'release', authorization: auth(createInput, 'create') }),
      (e) => e.code === 'UNAUTHORIZED');
    await assert.rejects(provider.createPullRequest({ ...createInput, head: 'other', authorization: auth(createInput, 'create') }),
      (e) => e.code === 'UNAUTHORIZED');
    fake.set.head('d'.repeat(40));
    await assert.rejects(provider.createPullRequest({ ...createInput, authorization: auth(createInput, 'create') }), (e) => e.code === 'REF_DRIFT');
    assert.equal(fake.calls.filter((c) => c.method === 'POST' && c.path === '/repos/acme/project/pulls').length, 0);
  });
});

test('merge requires accepted server-policy boundary, scoped authorization, and independent receipt', async () => {
  await withJournal(async ({ provider, fake }) => {
    await assert.rejects(provider.mergePullRequest({ ...mergeInput, strictTargetCas: true }), (e) => e.code === 'UNSUPPORTED_TARGET_CAS');
    await assert.rejects(provider.mergePullRequest({ ...mergeInput, acceptServerPolicyBoundary: false }), (e) => e.code === 'SERVER_POLICY_BOUNDARY');
    await assert.rejects(provider.mergePullRequest({ ...mergeInput, reviewReceipt: receipt }), (e) => e.code === 'UNAUTHORIZED');
    await assert.rejects(provider.mergePullRequest({ ...mergeInput, authorization: auth(mergeInput, 'merge') }), (e) => e.code === 'INDEPENDENT_REVIEW_REQUIRED');
    await assert.rejects(provider.mergePullRequest({ ...mergeInput, authorization: auth(mergeInput, 'merge'),
      reviewReceipt: { ...receipt, reviewer: 'MAINTAINER' } }), (e) => e.code === 'INDEPENDENT_REVIEW_REQUIRED');
    await assert.rejects(provider.mergePullRequest({ ...mergeInput, base: 'release', authorization: auth(mergeInput, 'merge'),
      reviewReceipt: receipt }), (e) => e.code === 'UNAUTHORIZED');
    await assert.rejects(provider.mergePullRequest({ ...mergeInput, authorization: auth(mergeInput, 'merge'),
      reviewReceipt: { ...receipt, head: 'other' } }), (e) => e.code === 'INDEPENDENT_REVIEW_REQUIRED');
    assert.equal(fake.calls.some((c) => c.method === 'PUT'), false);
  });
});

test('merge blocks drift, draft, unknown checks and unresolved threads before PUT', async () => {
  for (const [kind, value] of [['head', 'd'.repeat(40)], ['base', 'd'.repeat(40)], ['baseRef', 'release'],
    ['headRef', 'other'], ['draft', true], ['checks', 'unknown'], ['threads', 'unresolved'], ['review', null],
    ['statusTruncated', true], ['graphErrors', true]]) {
    const fake = fakeGitHub(); fake.set[kind](value);
    await withJournal(async ({ provider }) => {
      await assert.rejects(provider.mergePullRequest({ ...mergeInput, authorization: auth(mergeInput, 'merge'), reviewReceipt: receipt }),
        (e) => e.code === 'MERGE_BLOCKED');
      assert.equal(fake.calls.some((c) => c.method === 'PUT'), false);
    }, fake);
  }
});

test('stale identical merge intent cannot repeat PUT after ambiguous first response', async () => {
  const fake = fakeGitHub(); const original = fake.transport; let puts = 0;
  fake.transport = async (request) => {
    if (request.method === 'PUT') { puts += 1; if (puts === 1) throw Error('lost before acceptance'); }
    return original(request);
  };
  await withJournal(async ({ provider, reload }) => {
    const stale = await reload();
    const input = { ...mergeInput, authorization: auth(mergeInput, 'merge'), reviewReceipt: receipt };
    await assert.rejects(provider.mergePullRequest(input), (e) => e.code === 'API_ERROR');
    await assert.rejects(stale.mergePullRequest(input), (e) => e.code === 'STALE_JOURNAL');
    assert.equal(puts, 1);
    await assert.rejects((await reload()).recoverOperation({ operationId: input.operationId, ...target }),
      (e) => e.code === 'RECOVERY_UNKNOWN');
    assert.equal(puts, 1);
  }, fake);
});

test('dismissed or stale remote review cannot satisfy independent receipt', async () => {
  const fake = fakeGitHub(); fake.set.reviewState('DISMISSED');
  await withJournal(async ({ provider }) => {
    await assert.rejects(provider.mergePullRequest({ ...mergeInput, authorization: auth(mergeInput, 'merge'), reviewReceipt: receipt }),
      (e) => e.code === 'INDEPENDENT_REVIEW_REQUIRED');
    assert.equal(fake.calls.some((c) => c.method === 'PUT'), false);
  }, fake);
});

test('unprotected base branch blocks normal shipping merge', async () => {
  const fake = fakeGitHub(); fake.set.protectedBase(false);
  await withJournal(async ({ provider }) => {
    await assert.rejects(provider.mergePullRequest({ ...mergeInput, authorization: auth(mergeInput, 'merge'), reviewReceipt: receipt }),
      (e) => e.code === 'SERVER_POLICY_UNKNOWN');
    assert.equal(fake.calls.some((c) => c.method === 'PUT'), false);
  }, fake);
});

test('independent OMS policy permits an unreviewed PR only with bound review and audited server policy', async () => {
  const fake = fakeGitHub(); fake.set.review(null); fake.set.reviewState('NONE');
  await withJournal(async ({ provider }) => {
    assert.equal((await provider.inspectPr({ ...target, pr: 7 })).ready, false);
    assert.equal((await provider.inspectPr({ ...target, pr: 7, reviewPolicy: 'independent-oms' })).ready, true);
    const input = { ...mergeInput, reviewPolicy: 'independent-oms', authorization: omsAuth, review: omsReview,
      frontier: { ...omsReview, bottomPr: 7, frozen: true, countersignedBy: 'root-1' } };
    const result = await provider.mergePullRequest(input);
    assert.equal(result.status, 'merged');
    assert.equal(fake.calls.filter((c) => c.method === 'PUT').length, 1);
  }, fake);
});

test('provider independently rejects bad OMS authority and evidence before PUT', async () => {
  for (const edit of [
    (x) => { x.authorization.reviewPolicy = 'github-review'; },
    (x) => { x.authorization.targetPolicy = 'strict'; },
    (x) => { x.authorization.actorSession = 'child-1'; },
    (x) => { x.review.reviewerSession = 'writer-1'; },
    (x) => { x.review.patchId = 'other'; },
    (x) => { x.review.headSha = 'd'.repeat(40); },
    (x) => { x.review.verification = []; },
    (x) => { x.frontier.bottomPr = 8; },
  ]) {
    const fake = fakeGitHub(); fake.set.review(null); fake.set.reviewState('NONE');
    await withJournal(async ({ provider }) => {
      const input = structuredClone({ ...mergeInput, reviewPolicy: 'independent-oms', authorization: omsAuth,
        review: omsReview, frontier: { ...omsReview, bottomPr: 7, frozen: true, countersignedBy: 'root-1' } });
      edit(input);
      await assert.rejects(provider.mergePullRequest(input));
      assert.equal(fake.calls.some((c) => c.method === 'PUT'), false);
    }, fake);
  }
});

test('independent OMS policy respects required GitHub reviews and fails closed on policy uncertainty', async () => {
  const required = { required_status_checks: { strict: true, contexts: ['ci/test'], checks: [{ context: 'ci/test', app_id: 123 }] },
    enforce_admins: { enabled: true }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false },
    required_pull_request_reviews: { required_approving_review_count: 1, dismiss_stale_reviews: true,
      require_code_owner_reviews: false, require_last_push_approval: false } };
  for (const setup of [
    (f) => f.set.protection(required), (f) => f.set.protectedBase(false),
    (f) => f.set.policyError(true), (f) => f.set.rules([{}]),
    (f) => f.set.protection({ ...required, enforce_admins: null }),
    (f) => f.set.checksAvailable(false), (f) => f.set.reviewState('CHANGES_REQUESTED'),
    (f) => f.set.graphMissing(true),
    (f) => f.set.protection({ ...required, required_status_checks: { strict: true, contexts: [], checks: [{ context: 'ci/test', app_id: 456 }] }, required_pull_request_reviews: { required_approving_review_count: 0 } }),
    (f) => f.set.protection({ ...required, required_pull_request_reviews: { required_approving_review_count: 0, require_code_owner_reviews: true } }),
  ]) {
    const fake = fakeGitHub(); fake.set.review(null); fake.set.reviewState('NONE'); setup(fake);
    await withJournal(async ({ provider }) => {
      await assert.rejects(provider.mergePullRequest({ ...mergeInput, reviewPolicy: 'independent-oms', authorization: omsAuth,
        review: omsReview, frontier: { ...omsReview, bottomPr: 7, frozen: true, countersignedBy: 'root-1' } }));
      assert.equal(fake.calls.some((c) => c.method === 'PUT'), false);
    }, fake);
  }
});

test('independent OMS rejects required checks without a pinned GitHub app', async () => {
  const valid = { strict: true, contexts: ['ci/test'], checks: [{ context: 'ci/test', app_id: 123 }] };
  for (const checks of [
    [], [{ context: 'ci/test' }], [{ context: 'ci/test', app_id: null }],
    [{ context: 'ci/test', app_id: -1 }], [{ context: 'ci/test', app_id: 0 }],
    [{ context: 'other', app_id: 123 }],
  ]) {
    const fake = fakeGitHub(); fake.set.review(null); fake.set.reviewState('NONE');
    fake.set.protection({ required_status_checks: { ...valid, checks }, enforce_admins: { enabled: true },
      allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false } });
    await withJournal(async ({ provider }) => {
      const input = { ...mergeInput, reviewPolicy: 'independent-oms', authorization: omsAuth,
        review: omsReview, frontier: { ...omsReview, bottomPr: 7, frozen: true, countersignedBy: 'root-1' } };
      await assert.rejects(provider.mergePullRequest(input), (e) => e.code === 'SERVER_POLICY_UNKNOWN');
      assert.equal(fake.calls.some((c) => c.method === 'PUT'), false);
    }, fake);
  }
});

test('valid remote review policy blocks insufficient approvals and accepts current-head approval', async () => {
  for (const count of [2, 1]) {
    const fake = fakeGitHub();
    fake.set.protection({ required_status_checks: { strict: true, contexts: ['ci/test'],
      checks: [{ context: 'ci/test', app_id: 123 }] }, enforce_admins: { enabled: true },
      allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false },
      required_pull_request_reviews: { required_approving_review_count: count, dismiss_stale_reviews: true,
        require_code_owner_reviews: false, require_last_push_approval: false } });
    await withJournal(async ({ provider }) => {
      const input = { ...mergeInput, reviewPolicy: 'independent-oms', authorization: omsAuth,
        review: omsReview, frontier: { ...omsReview, bottomPr: 7, frozen: true, countersignedBy: 'root-1' } };
      if (count === 2) await assert.rejects(provider.mergePullRequest(input), (e) => e.code === 'MERGE_BLOCKED');
      else assert.equal((await provider.mergePullRequest(input)).status, 'merged');
      assert.equal(fake.calls.filter((c) => c.method === 'PUT').length, count === 1 ? 1 : 0);
    }, fake);
  }
});

test('later comments cannot erase a requested change or a current-head approval', async () => {
  const fake = fakeGitHub();
  const p = new GitHubAutopilotProvider({ transport: fake.transport });
  fake.set.review(null);
  fake.set.reviewList([{ id: 1, user: { login: 'reviewer' }, state: 'CHANGES_REQUESTED', commit_id: HEAD },
    { id: 2, user: { login: 'reviewer' }, state: 'COMMENTED', commit_id: HEAD }]);
  assert.equal((await p.inspectPr({ ...target, pr: 7, reviewPolicy: 'independent-oms' })).gates.review, 'blocked');
  fake.set.review('APPROVED');
  fake.set.reviewList([{ id: 1, user: { login: 'reviewer' }, state: 'APPROVED', commit_id: HEAD },
    { id: 2, user: { login: 'reviewer' }, state: 'PENDING', commit_id: HEAD }]);
  assert.deepEqual((await p.inspectPr({ ...target, pr: 7 })).approvedReviewers, ['reviewer']);
});

test('unknown no-review rule flags do not authorize a null decision', async () => {
  const fake = fakeGitHub(); fake.set.review(null); fake.set.reviewState('NONE');
  fake.set.protection({ required_status_checks: { strict: true, contexts: ['ci/test'], checks: [{ context: 'ci/test', app_id: 123 }] },
    enforce_admins: { enabled: true }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false },
    required_pull_request_reviews: { required_approving_review_count: 0, require_code_owner_reviews: 'false' } });
  const p = new GitHubAutopilotProvider({ transport: fake.transport });
  await assert.rejects(p.inspectPr({ ...target, pr: 7, reviewPolicy: 'independent-oms' }),
    (e) => e.code === 'SERVER_POLICY_UNKNOWN');
});

test('direct provider snapshots independent review, authority, and frontier before asynchronous reads', async () => {
  const fake = fakeGitHub(); fake.set.review(null); fake.set.reviewState('NONE');
  await withJournal(async ({ provider, storePath }) => {
    const input = structuredClone({ ...mergeInput, reviewPolicy: 'independent-oms', authorization: omsAuth,
      review: omsReview, frontier: { ...omsReview, bottomPr: 7, frozen: true, countersignedBy: 'root-1' } });
    const pending = provider.mergePullRequest(input);
    input.authorization.actorSession = 'child-1'; input.review.pr = 8;
    input.frontier.bottomPr = 8; input.review.verification[0].status = 'failed';
    assert.equal((await pending).status, 'merged');
    const saved = JSON.parse(await readFile(storePath, 'utf8'));
    assert.equal(saved.events[0].payload.intent.reviewPolicy, 'independent-oms');
    assert.equal(fake.calls.filter((c) => c.method === 'PUT').length, 1);
  }, fake);
});

test('merge uses GitHub head SHA guard and remote readback; ambiguous response recovers without another PUT', async () => {
  for (const ambiguous of [false, true]) {
    const fake = fakeGitHub({ mergeAmbiguous: ambiguous });
    await withJournal(async ({ provider, reload }) => {
      const input = { ...mergeInput, authorization: auth(mergeInput, 'merge'), reviewReceipt: receipt };
      if (ambiguous) {
        await assert.rejects(provider.mergePullRequest(input), (e) => e.code === 'API_ERROR');
        provider = await reload();
      }
      if (ambiguous) fake.set.sourceDeleted(true);
      const result = ambiguous ? await provider.recoverOperation({ operationId: 'merge-1', ...target }) : await provider.mergePullRequest(input);
      fake.set.sourceDeleted(true);
      assert.equal(result.mergeSha, MERGE);
      const puts = fake.calls.filter((c) => c.method === 'PUT');
      assert.equal(puts.length, 1); assert.deepEqual(puts[0].body, { sha: HEAD, merge_method: 'merge' });
      assert.deepEqual(await (await reload()).mergePullRequest(input), result);
      assert.equal(fake.calls.filter((c) => c.method === 'PUT').length, 1);
    }, fake);
  }
});

test('merge recovery refuses PR retarget with same SHAs', async () => {
  const fake = fakeGitHub({ mergeAmbiguous: true });
  await withJournal(async ({ provider, reload }) => {
    const input = { ...mergeInput, authorization: auth(mergeInput, 'merge'), reviewReceipt: receipt };
    await assert.rejects(provider.mergePullRequest(input), (e) => e.code === 'API_ERROR');
    fake.set.baseRef('release');
    await assert.rejects((await reload()).recoverOperation({ operationId: input.operationId, ...target }),
      (e) => e.code === 'RECOVERY_UNKNOWN');
    assert.equal(fake.calls.filter((c) => c.method === 'PUT').length, 1);
  }, fake);
});

test('completed replay rechecks account and recovery refuses another account', async () => {
  const fake = fakeGitHub();
  await withJournal(async ({ provider, reload }) => {
    const input = { ...createInput, authorization: auth(createInput, 'create') };
    await provider.createPullRequest(input);
    await assert.rejects((await reload()).recoverOperation({ operationId: 'create-1', repo: target.repo, account: 'other' }),
      (e) => e.code === 'TARGET_MISMATCH');
    const mismatched = { ...input, account: 'other', authorization: auth({ ...input, account: 'other' }, 'create') };
    await assert.rejects((await reload()).createPullRequest(mismatched), (e) => e.code === 'OPERATION_CONFLICT');
  }, fake);
});

test('concurrent writer lock blocks before mutation', async () => {
  await withJournal(async ({ provider, root, fake }) => {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(root, 'journal.json.operation.lock'), String(process.pid));
    await assert.rejects(provider.createPullRequest({ ...createInput, authorization: auth(createInput, 'create') }),
      (e) => e.code === 'CONCURRENT_WRITER');
    assert.equal(fake.calls.length, 0);
  });
});

test('stale local journal instance fails CAS before remote mutation', async () => {
  await withJournal(async ({ provider, reload, fake }) => {
    const stale = await reload();
    await provider.createPullRequest({ ...createInput, authorization: auth(createInput, 'create') });
    const next = { ...createInput, operationId: 'create-2' };
    await assert.rejects(stale.createPullRequest({ ...next, authorization: auth(next, 'create') }),
      (e) => ['EVENT_CONFLICT', 'REVISION_CONFLICT'].includes(e.code));
    assert.equal(fake.calls.filter((c) => c.method === 'POST' && c.path === '/repos/acme/project/pulls').length, 1);
  });
});

test('CLI offers reads only and refuses mutation commands', async () => {
  const help = await exec(process.execPath, [tool, '--help']);
  assert.match(help.stdout, /inspect-repository/); assert.match(help.stdout, /inspect-pr/);
  await assert.rejects(exec(process.execPath, [tool, 'merge-pull-request', '--repo', target.repo, '--account', target.account]),
    (e) => e.code === 1 && /CLI_READ_ONLY/.test(e.stderr));
  const root = await mkdtemp(join(tmpdir(), 'oms-gh-cli-link-'));
  try {
    const alias = join(root, 'provider.mjs'); await symlink(tool, alias);
    assert.match((await exec(process.execPath, [alias, '--help'])).stdout, /inspect-pr/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('stdin module import is a library import when argv[1] is not a path', () => {
  const child = spawnSync(process.execPath, ['--input-type=module', '-'], {
    input: `import { GitHubAutopilotProvider } from ${JSON.stringify(pathToFileURL(tool).href)};\nprocess.stdout.write(typeof GitHubAutopilotProvider);`,
    encoding: 'utf8',
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, 'function');
});

test('gh transport passes shell-like content as inert JSON stdin and bounds stderr', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'oms-gh-transport-'));
  const originalSpawn = childProcess.spawn;
  try {
    const executable = join(root, 'fake-gh');
    await writeFile(executable, `#!/usr/bin/env node\nlet input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{const body=JSON.parse(input);if(body.mode==='error'){process.stderr.write('raw-secret-credential');process.exit(1)}if(body.mode==='flood'){process.stderr.write('x'.repeat(1000));process.exit(1)}process.stdout.write(JSON.stringify({args:process.argv.slice(2),body,cwd:process.cwd()}))});\n`);
    await chmod(executable, 0o700);
    if (process.platform === 'win32') {
      t.mock.method(childProcess, 'spawn', (binary, args, options) => {
        assert.equal(binary, executable);
        assert.equal(options.shell, false);
        return originalSpawn(process.execPath, [executable, ...args], options);
      });
      syncBuiltinESMExports();
    }
    const transport = createGhTransport({ executable, maxOutputBytes: 500 });
    const result = await transport({ method: 'POST', path: '/graphql', body: { text: '$(touch /tmp/never-run) `uname`', mode: 'ok' } });
    assert.equal(result.body.text, '$(touch /tmp/never-run) `uname`');
    assert.deepEqual(result.args.slice(0, 5), ['api', '--hostname', 'github.com', '--method', 'POST']);
    assert.deepEqual(result.args.slice(-2), ['--input', '-']);
    assert.notEqual(result.cwd, root);
    await assert.rejects(transport({ method: 'POST', path: '/graphql', body: { mode: 'error' } }),
      (e) => e.code === 'API_ERROR' && !e.message.includes('raw-secret-credential'));
    await assert.rejects(transport({ method: 'POST', path: '/graphql', body: { mode: 'flood' } }),
      (e) => e.code === 'OUTPUT_LIMIT');
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
    await rm(root, { recursive: true, force: true });
  }
});
