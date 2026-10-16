import { createHash, randomUUID } from 'node:crypto';
import { open, rm, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRun, loadRun } from './durable-run-state.mjs';
import { GitHubProviderError, createGhTransport, observationLimits, withReadScope, restCollection,
  reviewThreads } from './github-observation.mjs';
export { GitHubProviderError, createGhTransport } from './github-observation.mjs';

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const SHA = /^[a-f0-9]{40}$/i;
const LOGIN = /^[A-Za-z0-9-]{1,39}$/;
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
function validCheckRun(r, requireId) {
  return (!requireId || (Number.isSafeInteger(r?.id) && r.id > 0))
    && typeof r?.name === 'string' && r.name.length > 0 && r.name.length <= 200
    && Number.isSafeInteger(r?.app?.id) && r.app.id > 0 && SHA.test(r?.head_sha ?? '')
    && ['queued', 'in_progress', 'completed', 'pending', 'requested', 'waiting'].includes(r.status)
    && (r.status === 'completed'
      ? ['success', 'failure', 'neutral', 'skipped', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'stale'].includes(r.conclusion)
      : r.conclusion == null);
}
function validCommitStatus(s, requireId) {
  return (!requireId || (Number.isSafeInteger(s?.id) && s.id > 0))
    && typeof s?.context === 'string' && s.context.length > 0 && s.context.length <= 200
    && ['success', 'failure', 'pending', 'error'].includes(s?.state);
}
function scopedAuthorization(authorization, intent) {
  check(authorization && authorization.approved === true && authorization.action === intent.action && authorization.operationId === intent.operationId
    && authorization.repo === intent.repo && authorization.account === intent.account && authorization.baseSha === intent.baseSha
    && authorization.headSha === intent.headSha && authorization.base === intent.base && authorization.head === intent.head
    && (intent.pr === null || authorization.pr === intent.pr),
  'UNAUTHORIZED', 'scoped authorization is required');
}
const REVIEW_POLICIES = ['github-review', 'independent-oms'];
function reviewPolicyOf(value) {
  check(value === undefined || REVIEW_POLICIES.includes(value), 'INVALID_REVIEW_POLICY', 'review policy must be explicit and supported');
  return value ?? 'github-review';
}
function omsEvidence(review, frontier, authorization, intent) {
  const pins = ['repo', 'account', 'pr', 'base', 'head', 'baseSha', 'headSha'];
  check(authorization?.reviewPolicy === 'independent-oms' && authorization.actorSession === authorization.rootSession
    && ID.test(authorization.rootSession ?? '') && ID.test(authorization.ownerSession ?? '')
    && authorization.targetPolicy === 'server-policy' && typeof authorization.patchId === 'string'
    && authorization.patchId.length > 0 && authorization.patchId.length <= 256,
  'UNAUTHORIZED', 'root authorization must bind the independent review policy and patch');
  check(review && pins.every((key) => review[key] === intent[key]) && review.writerSession === authorization.ownerSession
    && ID.test(review.writerSession ?? '') && ID.test(review.reviewerSession ?? '')
    && review.reviewerSession !== review.writerSession && review.patchId === authorization.patchId
    && ['PASS', 'PASS+NOTES'].includes(review.verdict) && Array.isArray(review.verification)
    && review.verification.length > 0 && review.verification.length <= 256
    && review.verification.every((v) => typeof v?.command === 'string' && v.command.length > 0 && v.command.length <= 2000
      && v.status === 'passed' && typeof v.observed === 'string' && v.observed.length > 0 && v.observed.length <= 2000),
  'INDEPENDENT_REVIEW_REQUIRED', 'bound independent OMS review and successful verification are required');
  check(frontier && pins.every((key) => frontier[key] === intent[key]) && frontier.bottomPr === intent.pr
    && frontier.frozen === true && frontier.countersignedBy === authorization.rootSession && frontier.patchId === review.patchId,
  'FRONTIER_REQUIRED', 'root-countersigned frozen current bottom PR is required');
}

export class GitHubAutopilotProvider {
  constructor({ transport = createGhTransport(), run = null, observationLimits: limits } = {}) {
    this.transport = transport; this.run = run; this.observationLimits = observationLimits(limits);
  }
  static async create({ storePath, storeRoot, runId = 'github-provider', generation = 1, transport, observationLimits } = {}) {
    const run = await createRun({ storePath, storeRoot, runId, generation, metadata: { provider: 'github.com' } });
    return new GitHubAutopilotProvider({ run, transport, observationLimits });
  }
  static async load({ storePath, storeRoot, runId = 'github-provider', generation = 1, transport, observationLimits } = {}) {
    const run = await loadRun({ storePath, storeRoot, runId, generation });
    check(run.state.metadata.provider === 'github.com', 'STORE_MISMATCH', 'journal belongs to another provider');
    return new GitHubAutopilotProvider({ run, transport, observationLimits });
  }
  async _api(method, path, body) {
    try { return await this.transport({ method, path, body }); }
    catch (error) { if (error instanceof GitHubProviderError) throw error; fail('API_ERROR', 'GitHub API request failed'); }
  }
  async _identity({ repo, account }, read = this._api.bind(this)) {
    validateTarget(repo, account);
    const user = await read('GET', '/user');
    check(user?.login?.toLowerCase() === account.toLowerCase(), 'ACCOUNT_MISMATCH', 'authenticated GitHub account differs from expected account');
    const remote = await read('GET', `/repos/${repo}`);
    check(remote?.full_name?.toLowerCase() === repo.toLowerCase(), 'TARGET_MISMATCH', 'remote repository differs from exact target');
    return { user, remote };
  }
  async inspectRepository(input = {}) {
    const { user, remote } = await this._identity(input);
    return { repo: remote.full_name, account: user.login, defaultBranch: remote.default_branch ?? null, private: remote.private === true };
  }
  async _ref(repo, branch, read = this._api.bind(this)) {
    const ref = await read('GET', `/repos/${repo}/git/ref/heads/${encoded(branch)}`);
    validateSha(ref?.object?.sha, 'remote ref SHA');
    return ref.object.sha;
  }
  async _serverPolicyDefinition(repo, base, baseSha, read) {
    const branch = await read('GET', `/repos/${repo}/branches/${encoded(base)}`);
    check(branch?.name === base && branch?.commit?.sha === baseSha && branch.protected === true,
      'SERVER_POLICY_UNKNOWN', 'base branch protection is absent or unknown');
    const policy = await read('GET', `/repos/${repo}/branches/${encoded(base)}/protection`);
    const rules = await read('GET', `/repos/${repo}/rules/branches/${encoded(base)}?per_page=100`);
    check(Array.isArray(rules) && rules.length < 100 && rules.length === 0,
      'SERVER_POLICY_UNKNOWN', 'active rulesets are not supported by this audited merge policy');
    const required = policy?.required_status_checks;
    check(required?.strict === true && Array.isArray(required.contexts) && Array.isArray(required.checks)
      && policy?.enforce_admins?.enabled === true && policy?.allow_force_pushes?.enabled === false
      && policy?.allow_deletions?.enabled === false, 'SERVER_POLICY_UNKNOWN', 'classic protection is incomplete or unsafe');
    const entries = required.checks;
    const validContext = (context) => typeof context === 'string' && context.length > 0 && context.length <= 200;
    check(entries.length > 0 && entries.length < 100 && required.contexts.length < 100
      && entries.every((e) => validContext(e?.context) && Number.isSafeInteger(e.app_id) && e.app_id > 0)
      && required.contexts.every((context) => validContext(context)
        && entries.some((entry) => entry.context === context)),
    'SERVER_POLICY_UNKNOWN', 'required checks must be bounded and pinned to a known GitHub app');
    const approvals = policy.required_pull_request_reviews;
    const emptyRestrictions = (value) => value === undefined || value === null || (typeof value === 'object' && !Array.isArray(value)
      && Object.keys(value).every((key) => ['users', 'teams', 'apps', 'url', 'users_url', 'teams_url', 'apps_url'].includes(key))
      && ['url', 'users_url', 'teams_url', 'apps_url'].every((key) => value[key] === undefined
        || (typeof value[key] === 'string' && value[key].length <= 2048 && value[key].startsWith('https://api.github.com/')))
      && ['users', 'teams', 'apps'].every((key) => value[key] === undefined || (Array.isArray(value[key]) && value[key].length === 0)));
    check(approvals === undefined || approvals === null || (Object.keys(approvals).every((key) =>
      ['url', 'required_approving_review_count', 'dismiss_stale_reviews', 'require_code_owner_reviews', 'require_last_push_approval',
        'dismissal_restrictions', 'bypass_pull_request_allowances'].includes(key))
      && Number.isSafeInteger(approvals.required_approving_review_count)
      && approvals.required_approving_review_count >= 0 && approvals.required_approving_review_count <= 6
      && typeof approvals.dismiss_stale_reviews === 'boolean' && typeof approvals.require_code_owner_reviews === 'boolean'
      && typeof approvals.require_last_push_approval === 'boolean'
      && emptyRestrictions(approvals.dismissal_restrictions) && emptyRestrictions(approvals.bypass_pull_request_allowances)),
    'SERVER_POLICY_UNKNOWN', 'required review policy is malformed');
    check(approvals?.require_code_owner_reviews !== true && approvals?.require_last_push_approval !== true,
      'SERVER_POLICY_UNKNOWN', 'code-owner and last-push review policy cannot be audited here');
    return { entries, requiredApprovals: approvals?.required_approving_review_count ?? 0,
      githubApprovalRequired: (approvals?.required_approving_review_count ?? 0) > 0 };
  }
  _requiredCheckStates(entries, runs, headSha, complete, requireMetadata) {
    const validRuns = complete && Array.isArray(runs) && runs.every((r) => validCheckRun(r, requireMetadata));
    return entries.map((entry) => {
      const matching = validRuns ? runs.filter((r) => r.name === entry.context && r.app.id === entry.app_id && r.head_sha === headSha) : [];
      const state = !validRuns ? 'unknown' : matching.length === 0 ? 'missing'
        : matching.some((r) => r.status === 'completed' && r.conclusion !== 'success') ? 'failed'
        : matching.some((r) => r.status !== 'completed') ? 'pending' : 'passed';
      return { name: entry.context, appId: entry.app_id, state,
        runs: matching.map((r) => ({ id: r.id, name: entry.context, appId: entry.app_id,
          headSha: r.head_sha, status: r.status, conclusion: r.conclusion ?? null })) };
    });
  }
  async _serverPolicy(repo, base, baseSha, runs, contexts, { diagnostic = false, headSha, complete = true, read = this._api.bind(this) } = {}) {
    const policy = await this._serverPolicyDefinition(repo, base, baseSha, read);
    if (!diagnostic) check(Array.isArray(runs) && Array.isArray(contexts), 'SERVER_POLICY_UNKNOWN', 'current checks are unavailable');
    const requiredChecks = this._requiredCheckStates(policy.entries, runs, headSha, complete, diagnostic);
    if (!diagnostic) check(requiredChecks.every((entry) => entry.state === 'passed'),
      'REQUIRED_CHECK_BLOCKED', 'required current-head check is missing or unsuccessful');
    return diagnostic ? { ...policy, requiredChecks } : policy;
  }
  async inspectPr(input = {}, { signal } = {}) { return this._inspectPr(clone(input), false, signal); }
  async diagnosePr(input = {}, { signal } = {}) { return this._inspectPr(clone(input), true, signal); }
  async _inspectPr({ repo, account, pr, reviewPolicy } = {}, diagnostic = false, signal) {
    reviewPolicy = reviewPolicyOf(reviewPolicy);
    validateTarget(repo, account); validatePr(pr);
    return withReadScope(this.transport, { signal, limits: this.observationLimits }, async (read) => {
      const identity = await this._identity({ repo, account }, read);
      const raw = await read('GET', `/repos/${repo}/pulls/${pr}`);
      check(raw?.number === pr && raw?.base?.repo?.full_name?.toLowerCase() === repo.toLowerCase(), 'TARGET_MISMATCH', 'PR does not belong to exact repository');
      const headSha = raw.head?.sha; const baseSha = raw.base?.sha;
      validateSha(headSha, 'PR head SHA'); validateSha(baseSha, 'PR base SHA');
      validateBranch(raw.base.ref, 'PR base'); validateBranch(raw.head.ref, 'PR head');
      const sameRepo = raw.head?.repo?.full_name?.toLowerCase() === repo.toLowerCase();
      const commitPath = `/repos/${repo}/commits/${headSha}`;
      const suites = await restCollection(read, `${commitPath}/check-suites?per_page=100`, {
        key: 'check_suites', maxTotal: 1000, valid: (s) => s.head_sha === headSha,
      });
      // GitHub defaults to filter=latest. Keep the established first-page URL.
      const checks = await restCollection(read, `${commitPath}/check-runs?per_page=100`, {
        key: 'check_runs', valid: (r) => validCheckRun(r, true),
      });
      let combinedState;
      const statuses = await restCollection(read, `${commitPath}/status?per_page=100`, {
        key: 'statuses', valid: (s) => validCommitStatus(s, true),
        metadata: (s) => {
          if (s?.sha !== headSha || !['success', 'failure', 'pending'].includes(s?.state)
            || (combinedState !== undefined && combinedState !== s.state)) return false;
          combinedState = s.state; return true;
        },
      });
      const contexts = statuses.items; const runs = checks.items;
      const expectedState = contexts.some((s) => ['failure', 'error'].includes(s.state)) ? 'failure'
        : contexts.length === 0 || contexts.some((s) => s.state === 'pending') ? 'pending' : 'success';
      const statusComplete = statuses.complete && combinedState === expectedState
        && new Set(contexts.map((s) => s.context.toLowerCase())).size === contexts.length;
      const checkComplete = suites.complete && checks.complete && statusComplete;
      const allChecks = checkComplete && runs.length + contexts.length > 0
        && runs.every((r) => r.head_sha === headSha && r.status === 'completed' && ['success', 'neutral', 'skipped'].includes(r.conclusion))
        && contexts.every((s) => s.state === 'success');
      const reviews = await restCollection(read, `/repos/${repo}/pulls/${pr}/reviews?per_page=100`, {
        valid: (r) => LOGIN.test(r?.user?.login ?? '')
          && ['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED', 'PENDING'].includes(r.state)
          && SHA.test(r.commit_id ?? ''),
      });
      const threads = await reviewThreads(read, repo, pr, raw);
      const latestByReviewer = new Map();
      if (reviews.complete) for (const review of reviews.items) {
        const login = review.user.login.toLowerCase();
        if (['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)
          && (!latestByReviewer.has(login) || latestByReviewer.get(login).id < review.id)) latestByReviewer.set(login, review);
      }
      const approvedReviewers = reviews.complete ? [...latestByReviewer.entries()]
        .filter(([, r]) => r.state === 'APPROVED' && r.commit_id === headSha).map(([login]) => login) : [];
      let policy = null;
      if (reviewPolicy === 'independent-oms') {
        try { policy = await this._serverPolicy(repo, raw.base.ref, baseSha, runs,
          contexts, { diagnostic, headSha, complete: checkComplete, read }); }
        catch (error) { if (error instanceof GitHubProviderError) throw error; fail('SERVER_POLICY_UNKNOWN', 'server policy audit failed'); }
      }
      const changesRequested = reviews.complete && [...latestByReviewer.values()].some((r) => r.state === 'CHANGES_REQUESTED');
      const decision = threads.decision;
      const reviewGate = !threads.complete || !reviews.complete ? 'unknown'
        : changesRequested || decision === 'CHANGES_REQUESTED' ? 'blocked'
        : decision === 'APPROVED' ? 'approved'
        : reviewPolicy === 'independent-oms' && policy?.githubApprovalRequired === false && decision === null ? 'not-required'
        : decision === null ? 'unknown' : 'blocked';
      const gates = {
        checks: !checkComplete || (diagnostic && policy?.requiredChecks.some((c) => c.state === 'unknown')) ? 'unknown'
          : allChecks && (!diagnostic || !policy || policy.requiredChecks.every((c) => c.state === 'passed')) ? 'passed' : 'blocked',
        review: reviewGate,
        threads: !threads.complete ? 'unknown' : threads.items.every((t) => t.isResolved) ? 'resolved' : 'blocked',
        mergeability: raw.mergeable === true && raw.mergeable_state === 'clean' ? 'clean'
          : raw.mergeable == null || raw.mergeable_state === 'unknown' ? 'unknown' : 'blocked',
      };
      const finalIdentity = await this._identity({ repo, account }, read);
      const finalPr = await read('GET', `/repos/${repo}/pulls/${pr}`);
      const state = raw.merged === true ? 'merged' : raw.state === 'open' ? 'open' : 'closed';
      const currentBase = state === 'open' && sameRepo ? await this._ref(repo, raw.base.ref, read) : null;
      const currentHead = state === 'open' && sameRepo ? await this._ref(repo, raw.head.ref, read) : null;
      const positiveId = (value) => Number.isSafeInteger(value) && value > 0;
      const identityPin = ({ user, remote }) => [user.id, user.login, remote.id, remote.full_name];
      const prPin = (p) => [p?.id, p?.node_id, p?.number, p?.state, p?.draft, p?.merged,
        p?.base?.ref, p?.base?.sha, p?.base?.repo?.id, p?.base?.repo?.full_name,
        p?.head?.ref, p?.head?.sha, p?.head?.repo?.id, p?.head?.repo?.full_name,
        p?.mergeable, p?.mergeable_state];
      const identityKnown = positiveId(identity.user.id) && positiveId(identity.remote.id)
        && positiveId(raw.id) && typeof raw.node_id === 'string' && raw.node_id.length > 0
        && raw.base.repo.id === identity.remote.id && positiveId(raw.head.repo?.id)
        && (!sameRepo || raw.head.repo.id === identity.remote.id)
        && ['open', 'closed'].includes(raw.state) && typeof raw.draft === 'boolean' && typeof raw.merged === 'boolean';
      const consistent = identityKnown && JSON.stringify(identityPin(identity)) === JSON.stringify(identityPin(finalIdentity))
        && JSON.stringify(prPin(raw)) === JSON.stringify(prPin(finalPr))
        && (state !== 'open' || !sameRepo || (currentBase === baseSha && currentHead === headSha));
      if (!consistent) for (const key of Object.keys(gates)) gates[key] = 'unknown';
      const mergeableState = ['clean', 'dirty', 'blocked', 'behind', 'unstable', 'has_hooks', 'unknown', 'draft'].includes(raw.mergeable_state)
        ? raw.mergeable_state : 'unknown';
      return { repo, account, pr, state, draft: raw.draft === true, sameRepo, base: raw.base.ref, head: raw.head.ref,
        baseSha, headSha, currentHead, currentBase, url: raw.html_url ?? null, merged: raw.merged === true,
        mergeSha: raw.merge_commit_sha ?? null, mergeableState, approvedReviewers, gates, reviewPolicy,
        observation: { consistent }, ...(diagnostic ? { requiredChecks: policy?.requiredChecks ?? [] } : {}),
        requiredApprovals: policy?.requiredApprovals ?? null,
        ready: consistent && state === 'open' && raw.draft === false && sameRepo && currentHead === headSha
          && Object.values(gates).every((v) => ['passed', 'approved', 'not-required', 'resolved', 'clean'].includes(v)) };
    });
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
    review, frontier, reviewPolicy, strictTargetCas = false, acceptServerPolicyBoundary = false } = {}) {
    // Caller evidence is a scoped assertion, not a signature. Freeze it before the first await.
    try { ({ authorization, reviewReceipt, review, frontier } = clone({ authorization, reviewReceipt, review, frontier })); }
    catch { fail('INVALID_INPUT', 'merge evidence must be JSON-cloneable'); }
    reviewPolicy = reviewPolicyOf(reviewPolicy);
    validateOp(operationId); validateTarget(repo, account); validatePr(pr); validateBranch(base, 'base'); validateBranch(head, 'head');
    validateSha(baseSha, 'baseSha'); validateSha(headSha, 'headSha');
    check(strictTargetCas === false, 'UNSUPPORTED_TARGET_CAS', 'GitHub merge API cannot atomically guard target base SHA');
    check(acceptServerPolicyBoundary === true, 'SERVER_POLICY_BOUNDARY', 'explicit acceptance of GitHub server policy boundary is required');
    const inputHash = reviewPolicy === 'github-review'
      ? hash({ operationId, repo, account, pr, base, head, baseSha, headSha, reviewReceipt, authorization, acceptServerPolicyBoundary })
      : hash({ operationId, repo, account, pr, base, head, baseSha, headSha,
        reviewPolicy, review, frontier, authorization, acceptServerPolicyBoundary });
    const intent = { operationId, action: 'merge', repo, account, pr, base, head, baseSha, headSha,
      reviewPolicy, inputHash };
    scopedAuthorization(authorization, intent);
    if (reviewPolicy === 'independent-oms') omsEvidence(review, frontier, authorization, intent);
    else check((authorization?.reviewPolicy === undefined ? 'github-review' : authorization.reviewPolicy) === 'github-review',
      'UNAUTHORIZED', 'review policy differs from authority');
    if (reviewPolicy === 'github-review') check(reviewReceipt?.repo === repo && reviewReceipt?.pr === pr && reviewReceipt?.base === base && reviewReceipt?.head === head
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
      const current = await this.inspectPr({ repo, account, pr, reviewPolicy });
      check(current.ready && current.baseSha === baseSha && current.headSha === headSha
        && current.base === base && current.head === head, 'MERGE_BLOCKED', 'PR drifted or remote gates are blocked/unknown');
      if (reviewPolicy === 'github-review') check(current.approvedReviewers.includes(reviewReceipt.reviewer.toLowerCase()),
        'INDEPENDENT_REVIEW_REQUIRED', 'reviewer has no current GitHub approval on head SHA');
      if (reviewPolicy === 'independent-oms' && current.requiredApprovals > 0)
        check(current.gates.review === 'approved' && current.approvedReviewers.filter((login) => login !== account.toLowerCase()).length >= current.requiredApprovals,
          'MERGE_BLOCKED', 'required GitHub approval has no current-head reviewer');
      check(await this._ref(repo, current.base) === baseSha, 'BASE_DRIFT', 'base branch changed');
      // Re-audit the server policy and all current-head checks after the last ref read.
      const fresh = await this.inspectPr({ repo, account, pr, reviewPolicy });
      check(fresh.ready && fresh.baseSha === baseSha && fresh.headSha === headSha && fresh.base === base && fresh.head === head,
        'MERGE_BLOCKED', 'PR or gates changed before mutation');
      if (reviewPolicy === 'independent-oms' && fresh.requiredApprovals > 0)
        check(fresh.gates.review === 'approved' && fresh.approvedReviewers.filter((login) => login !== account.toLowerCase()).length >= fresh.requiredApprovals,
          'MERGE_BLOCKED', 'required GitHub approval changed before mutation');
      if (reviewPolicy === 'github-review') check(fresh.approvedReviewers.includes(reviewReceipt.reviewer.toLowerCase()),
        'INDEPENDENT_REVIEW_REQUIRED', 'reviewer approval changed before mutation');
      check(await this._ref(repo, base) === baseSha && await this._ref(repo, head) === headSha,
        'REF_DRIFT', 'base or head changed before mutation');
      if (reviewPolicy === 'github-review') {
        const protectedBase = await this._api('GET', `/repos/${repo}/branches/${encoded(base)}`);
        check(protectedBase?.name === base && protectedBase?.commit?.sha === baseSha && protectedBase.protected === true,
          'SERVER_POLICY_UNKNOWN', 'base branch protection is absent or unknown');
      }
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
