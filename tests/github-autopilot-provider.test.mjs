import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
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

function fakeGitHub({ createAmbiguous = false, mergeAmbiguous = false } = {}) {
  const calls = []; let created = false; let merged = false; let head = HEAD; let base = BASE;
  let draft = false; let checks = 'passed'; let threads = 'resolved'; let review = 'APPROVED'; let mergeability = 'clean';
  let protectedBase = true; let sourceDeleted = false; let statusTruncated = false; let reviewState = 'APPROVED'; let graphErrors = false;
  let baseRef = 'main'; let headRef = 'feature';
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
    if (path === '/repos/acme/project/pulls/7') return pr();
    if (path === '/repos/acme/project/pulls/7/reviews?per_page=100')
      return [{ id: 1, user: { login: 'reviewer' }, state: reviewState, commit_id: head }];
    if (path.startsWith('/repos/acme/project/commits/') && path.includes('/check-runs'))
      return { total_count: 1, check_runs: [{ head_sha: head, status: checks === 'unknown' ? 'queued' : 'completed',
        conclusion: checks === 'passed' ? 'success' : 'failure' }] };
    if (path.startsWith('/repos/acme/project/commits/') && path.includes('/status'))
      return { sha: head, state: 'success', total_count: statusTruncated ? 1 : 0, statuses: [] };
    if (path === '/graphql') return { ...(graphErrors ? { errors: [{ message: 'partial' }] } : {}), data: { repository: { pullRequest: { reviewDecision: review,
      reviewThreads: { nodes: [{ isResolved: threads === 'resolved' }], pageInfo: { hasNextPage: threads === 'unknown' } } } } } };
    if (path.startsWith('/repos/acme/project/pulls?')) return created ? [{ ...pr(), body: calls.find((c) => c.path === '/repos/acme/project/pulls' && c.method === 'POST')?.body?.body }] : [];
    if (method === 'POST' && path === '/repos/acme/project/pulls') { created = true; if (createAmbiguous) throw Error('timeout secret-credential'); return pr(); }
    if (method === 'PUT' && path === '/repos/acme/project/pulls/7/merge') { merged = true; if (mergeAmbiguous) throw Error('timeout secret-credential'); return { merged: true, sha: MERGE }; }
    throw Error(`unexpected ${method} ${path}`);
  };
  return { transport, calls, set: { head: (v) => { head = v; }, base: (v) => { base = v; }, draft: (v) => { draft = v; },
    checks: (v) => { checks = v; }, threads: (v) => { threads = v; }, review: (v) => { review = v; }, mergeability: (v) => { mergeability = v; },
    protectedBase: (v) => { protectedBase = v; }, sourceDeleted: (v) => { sourceDeleted = v; }, statusTruncated: (v) => { statusTruncated = v; },
    reviewState: (v) => { reviewState = v; }, graphErrors: (v) => { graphErrors = v; },
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
    input: `import { GitHubAutopilotProvider } from ${JSON.stringify(join(dirname(fileURLToPath(import.meta.url)), '../tools/github-autopilot-provider.mjs'))};\nprocess.stdout.write(typeof GitHubAutopilotProvider);`,
    encoding: 'utf8',
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, 'function');
});

test('gh transport passes shell-like content as inert JSON stdin and bounds stderr', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oms-gh-transport-'));
  try {
    const executable = join(root, 'fake-gh');
    await writeFile(executable, `#!/usr/bin/env node\nlet input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{const body=JSON.parse(input);if(body.mode==='error'){process.stderr.write('raw-secret-credential');process.exit(1)}if(body.mode==='flood'){process.stderr.write('x'.repeat(1000));process.exit(1)}process.stdout.write(JSON.stringify({args:process.argv.slice(2),body,cwd:process.cwd()}))});\n`);
    await chmod(executable, 0o700);
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
  } finally { await rm(root, { recursive: true, force: true }); }
});
