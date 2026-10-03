import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, open, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRun, loadRun } from './durable-run-state.mjs';

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const SHA = /^[a-f0-9]{40}$/i;
const LOGIN = /^[A-Za-z0-9-]{1,39}$/;
const MAX_OUTPUT = 2_000_000;

export class GitHubProviderError extends Error {
  constructor(code, message) { super(message); this.name = 'GitHubProviderError'; this.code = code; }
}
const fail = (code, message) => { throw new GitHubProviderError(code, message); };
const check = (ok, code, message) => { if (!ok) fail(code, message); };
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const encoded = (s) => encodeURIComponent(s);
const clone = (v) => JSON.parse(JSON.stringify(v));

function validateTarget(repo, account) {
  check(REPO.test(repo ?? '') && !repo.includes('..'), 'INVALID_TARGET', 'explicit owner/repository is required');
  check(LOGIN.test(account ?? ''), 'INVALID_ACCOUNT', 'explicit account login is required');
}
function validateSha(sha, label) { check(SHA.test(sha ?? ''), 'INVALID_SHA', `${label} must be a full SHA`); }
function validateBranch(branch, label) { check(BRANCH.test(branch ?? '') && !branch.includes('..'), 'INVALID_BRANCH', `${label} is invalid`); }
function validateOp(operationId) { check(ID.test(operationId ?? ''), 'INVALID_OPERATION', 'operationId must be a bounded identifier'); }
function validatePr(pr) { check(Number.isSafeInteger(pr) && pr > 0, 'INVALID_PR', 'PR number is required'); }
function boundedText(value, label, max) { check(typeof value === 'string' && value.length > 0 && value.length <= max, 'INVALID_INPUT', `${label} is required and bounded`); }
function scopedAuthorization(authorization, intent) {
  check(authorization && authorization.approved === true && authorization.action === intent.action && authorization.operationId === intent.operationId
    && authorization.repo === intent.repo && authorization.account === intent.account && authorization.baseSha === intent.baseSha
    && authorization.headSha === intent.headSha && authorization.base === intent.base && authorization.head === intent.head
    && (intent.pr === null || authorization.pr === intent.pr),
  'UNAUTHORIZED', 'scoped authorization is required');
}

/** Official gh API transport. No shell, repository cwd, env file, verbose output, or raw error propagation. */
export function createGhTransport({ executable = 'gh', timeoutMs = 15_000, maxOutputBytes = MAX_OUTPUT } = {}) {
  check(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 60_000, 'INVALID_INPUT', 'timeoutMs out of range');
  check(Number.isSafeInteger(maxOutputBytes) && maxOutputBytes > 0 && maxOutputBytes <= MAX_OUTPUT, 'INVALID_INPUT', 'maxOutputBytes out of range');
  return async ({ method = 'GET', path, body }) => {
    check(['GET', 'POST', 'PUT'].includes(method) && typeof path === 'string' && path.startsWith('/') && !path.includes('://'),
      'INVALID_REQUEST', 'invalid GitHub API request');
    const cwd = await mkdtemp(join(tmpdir(), 'oms-gh-api-'));
    try {
      const args = ['api', '--hostname', 'github.com', '--method', method, path,
        '--header', 'Accept: application/vnd.github+json', '--header', 'X-GitHub-Api-Version: 2022-11-28'];
      if (body !== undefined) args.push('--input', '-');
      return await new Promise((resolve, reject) => {
        const child = spawn(executable, args, { cwd, shell: false, stdio: ['pipe', 'pipe', 'pipe'],
          env: { PATH: process.env.PATH, HOME: process.env.HOME, GH_CONFIG_DIR: process.env.GH_CONFIG_DIR, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME } });
        let output = ''; let bytes = 0; let rejected = false;
        const rejectSafe = (code) => { if (!rejected) { rejected = true; child.kill('SIGKILL'); reject(new GitHubProviderError(code, 'GitHub API request did not complete safely')); } };
        const timer = setTimeout(() => rejectSafe('TIMEOUT'), timeoutMs);
        child.stdout.on('data', (chunk) => { bytes += chunk.length; if (bytes > maxOutputBytes) rejectSafe('OUTPUT_LIMIT'); else output += chunk; });
        child.stderr.on('data', (chunk) => { bytes += chunk.length; if (bytes > maxOutputBytes) rejectSafe('OUTPUT_LIMIT'); });
        child.on('error', () => rejectSafe('TRANSPORT_ERROR'));
        child.stdin.on('error', () => rejectSafe('TRANSPORT_ERROR'));
        child.on('close', (code) => {
          clearTimeout(timer);
          if (rejected) return;
          if (code !== 0) return rejectSafe('API_ERROR');
          try { resolve(output.trim() ? JSON.parse(output) : null); }
          catch { rejectSafe('INVALID_RESPONSE'); }
        });
        child.stdin.end(body === undefined ? undefined : JSON.stringify(body));
      });
    } finally { await rm(cwd, { recursive: true, force: true }); }
  };
}

export class GitHubAutopilotProvider {
  constructor({ transport = createGhTransport(), run = null } = {}) { this.transport = transport; this.run = run; }
  static async create({ storePath, storeRoot, runId = 'github-provider', generation = 1, transport } = {}) {
    const run = await createRun({ storePath, storeRoot, runId, generation, metadata: { provider: 'github.com' } });
    return new GitHubAutopilotProvider({ run, transport });
  }
  static async load({ storePath, storeRoot, runId = 'github-provider', generation = 1, transport } = {}) {
    const run = await loadRun({ storePath, storeRoot, runId, generation });
    check(run.state.metadata.provider === 'github.com', 'STORE_MISMATCH', 'journal belongs to another provider');
    return new GitHubAutopilotProvider({ run, transport });
  }
  async _api(method, path, body) {
    try { return await this.transport({ method, path, body }); }
    catch (error) { if (error instanceof GitHubProviderError) throw error; fail('API_ERROR', 'GitHub API request failed'); }
  }
  async inspectRepository({ repo, account } = {}) {
    validateTarget(repo, account);
    const user = await this._api('GET', '/user');
    check(user?.login?.toLowerCase() === account.toLowerCase(), 'ACCOUNT_MISMATCH', 'authenticated GitHub account differs from expected account');
    const remote = await this._api('GET', `/repos/${repo}`);
    check(remote?.full_name?.toLowerCase() === repo.toLowerCase(), 'TARGET_MISMATCH', 'remote repository differs from exact target');
    return { repo: remote.full_name, account: user.login, defaultBranch: remote.default_branch ?? null, private: remote.private === true };
  }
  async _ref(repo, branch) {
    const ref = await this._api('GET', `/repos/${repo}/git/ref/heads/${encoded(branch)}`);
    validateSha(ref?.object?.sha, 'remote ref SHA');
    return ref.object.sha;
  }
  async inspectPr({ repo, account, pr } = {}) {
    await this.inspectRepository({ repo, account }); validatePr(pr);
    const raw = await this._api('GET', `/repos/${repo}/pulls/${pr}`);
    check(raw?.number === pr && raw?.base?.repo?.full_name?.toLowerCase() === repo.toLowerCase(), 'TARGET_MISMATCH', 'PR does not belong to exact repository');
    const headSha = raw.head?.sha; const baseSha = raw.base?.sha;
    validateSha(headSha, 'PR head SHA'); validateSha(baseSha, 'PR base SHA');
    const sameRepo = raw.head?.repo?.full_name?.toLowerCase() === repo.toLowerCase();
    const checks = await this._api('GET', `/repos/${repo}/commits/${headSha}/check-runs?per_page=100`);
    const statuses = await this._api('GET', `/repos/${repo}/commits/${headSha}/status?per_page=100`);
    const reviews = await this._api('GET', `/repos/${repo}/pulls/${pr}/reviews?per_page=100`);
    const graph = await this._api('POST', '/graphql', { query: `query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewDecision reviewThreads(first:100){nodes{isResolved} pageInfo{hasNextPage}}}}}`, variables: { owner: repo.split('/')[0], name: repo.split('/')[1], number: pr } });
    const gpr = Array.isArray(graph?.errors) && graph.errors.length ? null : graph?.data?.repository?.pullRequest;
    const runs = checks?.check_runs;
    const contexts = statuses?.statuses;
    const state = raw.merged === true ? 'merged' : raw.state === 'open' ? 'open' : 'closed';
    const currentHead = state === 'open' && sameRepo ? await this._ref(repo, raw.head.ref) : null;
    const checkComplete = Array.isArray(runs) && checks.total_count === runs.length && runs.length < 100
      && Array.isArray(contexts) && statuses.total_count === contexts.length && contexts.length < 100
      && statuses?.sha === headSha && statuses?.state !== undefined;
    const allChecks = checkComplete && runs.length + contexts.length > 0
      && runs.every((r) => r.head_sha === headSha && r.status === 'completed' && ['success', 'neutral', 'skipped'].includes(r.conclusion))
      && contexts.every((s) => s.state === 'success');
    const threads = gpr?.reviewThreads;
    const reviewsKnown = gpr?.reviewDecision === 'APPROVED' && Array.isArray(threads?.nodes)
      && threads.pageInfo?.hasNextPage === false && threads.nodes.length <= 100;
    const reviewThreadsResolved = reviewsKnown && threads.nodes.every((t) => t.isResolved === true);
    const reviewsComplete = Array.isArray(reviews) && reviews.length < 100 && reviews.every((r) =>
      Number.isSafeInteger(r?.id) && LOGIN.test(r?.user?.login ?? '') && typeof r.state === 'string');
    const latestByReviewer = new Map();
    if (reviewsComplete) for (const review of reviews) {
      const login = review.user.login.toLowerCase();
      if (!latestByReviewer.has(login) || latestByReviewer.get(login).id < review.id) latestByReviewer.set(login, review);
    }
    const approvedReviewers = reviewsComplete ? [...latestByReviewer.entries()]
      .filter(([, r]) => r.state === 'APPROVED' && r.commit_id === headSha)
      .map(([login]) => login) : [];
    const gates = {
      checks: !checkComplete ? 'unknown' : allChecks ? 'passed' : 'blocked',
      review: !gpr || !threads || threads.pageInfo?.hasNextPage !== false || !reviewsComplete ? 'unknown' : gpr.reviewDecision === 'APPROVED' ? 'approved' : gpr.reviewDecision == null ? 'unknown' : 'blocked',
      threads: !reviewsKnown ? 'unknown' : reviewThreadsResolved ? 'resolved' : 'blocked',
      mergeability: raw.mergeable === true && raw.mergeable_state === 'clean' ? 'clean' : raw.mergeable == null || raw.mergeable_state === 'unknown' ? 'unknown' : 'blocked',
    };
    return { repo, account, pr, state, draft: raw.draft === true, sameRepo, base: raw.base.ref, head: raw.head.ref,
      baseSha, headSha, currentHead, url: raw.html_url ?? null, merged: raw.merged === true,
      mergeSha: raw.merge_commit_sha ?? null, approvedReviewers, gates,
      ready: state === 'open' && raw.draft === false && sameRepo && currentHead === headSha && Object.values(gates).every((v) => ['passed', 'approved', 'resolved', 'clean'].includes(v)) };
  }
  async _append(payload) {
    check(this.run, 'JOURNAL_REQUIRED', 'writes require a durable journal');
    return this.run.append({ eventId: `evt-${this.run.state.revision + 1}`, generation: this.run.state.generation,
      revision: this.run.state.revision + 1, type: this.run.state.revision === 0 ? 'start' : 'checkpoint', payload });
  }
  _operations() {
    const ops = new Map();
    for (const event of this.run.state.events) {
      const p = event.payload;
      if (p?.intent) ops.set(p.intent.operationId, { intent: p.intent, status: 'pending' });
      if (p?.outcome) { const op = ops.get(p.outcome.operationId); if (op) { op.status = p.outcome.status; op.result = p.outcome.result; } }
    }
    return ops;
  }
  async _lock(fn) {
    check(this.run, 'JOURNAL_REQUIRED', 'writes require a durable journal');
    const path = `${this.run.storePath}.operation.lock`;
    let handle;
    try { handle = await open(path, 'wx'); await handle.writeFile(String(process.pid)); }
    catch { fail('CONCURRENT_WRITER', 'journal operation lock exists; inspect it before manual recovery'); }
    try { return await fn(); }
    finally { await handle.close(); await rm(path, { force: true }); }
  }
  async _begin(intent) {
    const ops = this._operations();
    const old = ops.get(intent.operationId);
    if (old) {
      check(old.intent.inputHash === intent.inputHash && old.intent.repo === intent.repo && old.intent.account === intent.account,
        'OPERATION_CONFLICT', 'operationId reused with different inputs');
      return old;
    }
    check(![...ops.values()].some((op) => op.status === 'pending' || op.status === 'unknown'), 'PENDING_OPERATION', 'reconcile pending operation before writing');
    const appended = await this._append({ intent });
    check(appended.duplicate === false, 'STALE_JOURNAL', 'intent already exists; recover it without repeating the remote mutation');
    return null;
  }
  async _outcome(intent, status, result) {
    await this._append({ outcome: { operationId: intent.operationId, status, result } });
    return result;
  }
  async _recoverCreate(intent) {
    await this.inspectRepository(intent);
    const list = await this._api('GET', `/repos/${intent.repo}/pulls?state=all&head=${encoded(`${intent.repo.split('/')[0]}:${intent.head}`)}&base=${encoded(intent.base)}&per_page=100`);
    check(Array.isArray(list) && list.length < 100, 'RECOVERY_UNKNOWN', 'PR listing may be truncated');
    const matches = list.filter((p) => p.body?.includes(intent.marker) && p.head?.sha === intent.headSha
      && p.base?.sha === intent.baseSha && p.head?.ref === intent.head && p.base?.ref === intent.base
      && p.head?.repo?.full_name?.toLowerCase() === intent.repo.toLowerCase()
      && p.base?.repo?.full_name?.toLowerCase() === intent.repo.toLowerCase());
    if (matches.length !== 1) fail('RECOVERY_UNKNOWN', 'create outcome is ambiguous; no safe retry is possible');
    const p = matches[0];
    return this._outcome(intent, 'completed', { status: 'created', repo: intent.repo, pr: p.number,
      url: `https://github.com/${intent.repo}/pull/${p.number}`, headSha: intent.headSha, baseSha: intent.baseSha });
  }
  async _recoverMerge(intent) {
    await this.inspectRepository({ repo: intent.repo, account: intent.account });
    const pr = await this._api('GET', `/repos/${intent.repo}/pulls/${intent.pr}`);
    check(pr?.number === intent.pr && pr?.base?.repo?.full_name?.toLowerCase() === intent.repo.toLowerCase(),
      'TARGET_MISMATCH', 'merged PR does not belong to exact repository');
    if (pr.merged === true && pr.head?.sha === intent.headSha && pr.head?.ref === intent.head
      && pr.base?.ref === intent.base && SHA.test(pr.merge_commit_sha ?? ''))
      return this._outcome(intent, 'completed', { status: 'merged', repo: intent.repo, pr: intent.pr,
        mergeSha: pr.merge_commit_sha, headSha: intent.headSha, baseSha: intent.baseSha });
    fail('RECOVERY_UNKNOWN', 'merge outcome is ambiguous; no safe retry is possible');
  }
  async recoverOperation({ operationId, repo, account } = {}) {
    validateOp(operationId); validateTarget(repo, account);
    return this._lock(async () => {
      const op = this._operations().get(operationId);
      check(op, 'OPERATION_MISSING', 'operation not found');
      check(op.intent.repo === repo && op.intent.account === account, 'TARGET_MISMATCH', 'recovery target/account differs from journal');
      await this.inspectRepository({ repo, account });
      if (op.status === 'completed') return clone(op.result);
      return op.intent.action === 'create' ? this._recoverCreate(op.intent) : this._recoverMerge(op.intent);
    });
  }
  async createPullRequest({ operationId, repo, account, base, head, baseSha, headSha, title, body = '', authorization } = {}) {
    validateOp(operationId); validateTarget(repo, account); validateBranch(base, 'base'); validateBranch(head, 'head');
    validateSha(baseSha, 'baseSha'); validateSha(headSha, 'headSha'); boundedText(title, 'title', 200);
    check(typeof body === 'string' && body.length <= 30_000, 'INVALID_INPUT', 'body is too long');
    const inputHash = hash({ operationId, repo, account, base, head, baseSha, headSha, title, body, authorization });
    return this._lock(async () => {
      const known = this._operations().get(operationId);
      const marker = known?.intent.marker ?? `<!-- oms-gh-operation:${randomUUID()} -->`;
      const intent = { operationId, action: 'create', repo, account, base, head, baseSha, headSha, pr: null, marker, inputHash };
      scopedAuthorization(authorization, intent);
      const old = this._operations().get(operationId);
      if (old) {
        check(old.intent.inputHash === inputHash && old.intent.repo === repo && old.intent.account === account, 'OPERATION_CONFLICT', 'operationId reused with different inputs');
        await this.inspectRepository({ repo, account });
        return old.status === 'completed' ? clone(old.result) : this._recoverCreate(old.intent);
      }
      await this.inspectRepository({ repo, account });
      check(await this._ref(repo, base) === baseSha && await this._ref(repo, head) === headSha, 'REF_DRIFT', 'base or head changed');
      await this._begin(intent);
      const remote = await this._api('POST', `/repos/${repo}/pulls`, { title, body: `${body}\n\n${marker}`, base, head, draft: false });
      check(Number.isSafeInteger(remote?.number), 'RECOVERY_UNKNOWN', 'create response is ambiguous');
      return this._recoverCreate(intent);
    });
  }
  async mergePullRequest({ operationId, repo, account, pr, base, head, baseSha, headSha, authorization, reviewReceipt,
    strictTargetCas = false, acceptServerPolicyBoundary = false } = {}) {
    validateOp(operationId); validateTarget(repo, account); validatePr(pr); validateBranch(base, 'base'); validateBranch(head, 'head');
    validateSha(baseSha, 'baseSha'); validateSha(headSha, 'headSha');
    check(strictTargetCas === false, 'UNSUPPORTED_TARGET_CAS', 'GitHub merge API cannot atomically guard target base SHA');
    check(acceptServerPolicyBoundary === true, 'SERVER_POLICY_BOUNDARY', 'explicit acceptance of GitHub server policy boundary is required');
    const intent = { operationId, action: 'merge', repo, account, pr, base, head, baseSha, headSha,
      inputHash: hash({ operationId, repo, account, pr, base, head, baseSha, headSha, reviewReceipt, authorization, acceptServerPolicyBoundary }) };
    scopedAuthorization(authorization, intent);
    check(reviewReceipt?.repo === repo && reviewReceipt?.pr === pr && reviewReceipt?.base === base && reviewReceipt?.head === head
      && reviewReceipt?.baseSha === baseSha && reviewReceipt?.headSha === headSha
      && reviewReceipt?.verdict === 'passed' && LOGIN.test(reviewReceipt?.owner ?? '')
      && LOGIN.test(reviewReceipt?.reviewer ?? '') && reviewReceipt.owner.toLowerCase() !== reviewReceipt.reviewer.toLowerCase()
      && reviewReceipt.owner.toLowerCase() === account.toLowerCase() && reviewReceipt.revoked !== true,
      'INDEPENDENT_REVIEW_REQUIRED', 'bound independent passing review receipt is required');
    return this._lock(async () => {
      const old = this._operations().get(operationId);
      if (old) {
        check(old.intent.inputHash === intent.inputHash && old.intent.repo === repo && old.intent.account === account, 'OPERATION_CONFLICT', 'operationId reused with different inputs');
        await this.inspectRepository({ repo, account });
        return old.status === 'completed' ? clone(old.result) : this._recoverMerge(old.intent);
      }
      const current = await this.inspectPr({ repo, account, pr });
      check(current.ready && current.baseSha === baseSha && current.headSha === headSha
        && current.base === base && current.head === head, 'MERGE_BLOCKED', 'PR drifted or remote gates are blocked/unknown');
      check(current.approvedReviewers.includes(reviewReceipt.reviewer.toLowerCase()), 'INDEPENDENT_REVIEW_REQUIRED', 'reviewer has no current GitHub approval on head SHA');
      check(await this._ref(repo, current.base) === baseSha, 'BASE_DRIFT', 'base branch changed');
      const protectedBase = await this._api('GET', `/repos/${repo}/branches/${encoded(current.base)}`);
      check(protectedBase?.name === current.base && protectedBase?.commit?.sha === baseSha && protectedBase.protected === true,
        'SERVER_POLICY_UNKNOWN', 'base branch protection is absent or unknown');
      await this._begin(intent);
      await this._api('PUT', `/repos/${repo}/pulls/${pr}/merge`, { sha: headSha, merge_method: 'merge' });
      return this._recoverMerge(intent);
    });
  }
}

async function main(args) {
  const usage = 'Usage: github-autopilot-provider.mjs --help | inspect-repository --repo owner/name --account login | inspect-pr --repo owner/name --account login --pr number';
  if (args.includes('--help') || args.length === 0) { process.stdout.write(`${usage}\n`); return; }
  const command = args.shift();
  check(['inspect-repository', 'inspect-pr'].includes(command), 'CLI_READ_ONLY', usage);
  const flags = {};
  while (args.length) {
    const key = args.shift(); const val = args.shift();
    check(['--repo', '--account', '--pr'].includes(key) && val !== undefined && flags[key] === undefined, 'INVALID_INPUT', usage);
    flags[key] = val;
  }
  const provider = new GitHubAutopilotProvider();
  const result = command === 'inspect-pr'
    ? await provider.inspectPr({ repo: flags['--repo'], account: flags['--account'], pr: Number(flags['--pr']) })
    : await provider.inspectRepository({ repo: flags['--repo'], account: flags['--account'] });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function isCliEntry() {
  if (!process.argv[1]) return false;
  try { return await realpath(fileURLToPath(import.meta.url)) === await realpath(process.argv[1]); }
  catch { return false; }
}

if (await isCliEntry()) {
  main(process.argv.slice(2)).catch((error) => { process.stderr.write(`${error.code ?? 'ERROR'}: ${error.message}\n`); process.exitCode = 1; });
}
