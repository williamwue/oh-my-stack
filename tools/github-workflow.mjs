#!/usr/bin/env node
import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GitHubAutopilotProvider } from './github-autopilot-provider.mjs';

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const LOGIN = /^[A-Za-z0-9-]{1,39}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const SHA = /^[a-f0-9]{40}$/i;
const pairs = { 'opening-a-pr': ['inspect', 'create', 'recover'], babysit: ['inspect'], shipping: ['inspect', 'merge', 'recover'] };
const requiredPins = ['repo', 'account', 'base', 'head', 'baseSha', 'headSha'];

export class GitHubWorkflowError extends Error {
  constructor(code, message) { super(message); this.name = 'GitHubWorkflowError'; this.code = code; }
}
function check(ok, code, message) { if (!ok) throw new GitHubWorkflowError(code, message); }
function bounded(value, max = 128) { return typeof value === 'string' && value.length > 0 && value.length <= max; }
function targetPins(target, { pr = false } = {}) {
  check(target && REPO.test(target.repo ?? '') && !target.repo.includes('..') && LOGIN.test(target.account ?? ''),
    'INVALID_TARGET', 'explicit github.com repository and account are required');
  if (pr) check(Number.isSafeInteger(target.pr) && target.pr > 0, 'INVALID_PR', 'one PR number is required');
  for (const name of ['base', 'head']) check(BRANCH.test(target[name] ?? '') && !target[name].includes('..'), 'INVALID_TARGET', `${name} branch is required`);
  for (const name of ['baseSha', 'headSha']) check(SHA.test(target[name] ?? ''), 'INVALID_TARGET', `${name} must be a full SHA`);
}
function matchPins(record, target, { pr = false } = {}) {
  return record && requiredPins.every((name) => record[name] === target[name]) && (!pr || record.pr === target.pr);
}
function journalIdentity(journal, mode) {
  check(journal?.mode === mode && journal.private === true && isAbsolute(journal.storeRoot ?? '')
    && isAbsolute(journal.storePath ?? '') && ID.test(journal.runId ?? '')
    && Number.isSafeInteger(journal.generation) && journal.generation > 0,
  'INVALID_JOURNAL', `explicit private ${mode} journal identity is required`);
  check(resolve(journal.storePath) !== resolve(journal.storeRoot), 'INVALID_JOURNAL', 'journal path must be a file below its root');
}
function authority(request, mutation) {
  const { authorization: a, target: t, workflow, operationId } = request;
  check(a?.approved === true && a.workflow === workflow && a.action === mutation && a.operationId === operationId
    && matchPins(a, t, { pr: mutation === 'merge' })
    && ID.test(a.actorSession ?? '') && ID.test(a.rootSession ?? '') && ID.test(a.ownerSession ?? ''),
  'UNAUTHORIZED', 'approved workflow, operation, target, actor, root and owner scope are required');
  if (mutation === 'merge') {
    check(a.actorSession === a.rootSession, 'ROOT_REQUIRED', 'only the root session may merge');
    check(a.targetPolicy === request.targetPolicy && a.patchId === request.review?.patchId,
      'UNAUTHORIZED', 'policy and patch identity must be bound into merge authority');
  }
}
function shippingEvidence(request) {
  const { target: t, review: r, frontier: f, authorization: a } = request;
  check(matchPins(r, t, { pr: true }) && ID.test(r?.writerSession ?? '') && ID.test(r?.reviewerSession ?? '')
    && r.writerSession === a.ownerSession && r.reviewerSession !== r.writerSession
    && bounded(r.patchId, 256) && ['PASS', 'PASS+NOTES'].includes(r.verdict)
    && Array.isArray(r.verification) && r.verification.length > 0 && r.verification.length <= 256
    && Array.from(r.verification).every((v) => bounded(v?.command, 2000) && v?.status === 'passed'
      && bounded(v?.observed, 2000)),
  'INDEPENDENT_REVIEW_REQUIRED', 'revision-bound independent OMS review and verification evidence are required');
  check(matchPins(f, t, { pr: true }) && f.bottomPr === t.pr && f.frozen === true
    && f.countersignedBy === a.rootSession && f.patchId === r.patchId,
  'FRONTIER_REQUIRED', 'root-countersigned frozen single bottom PR is required');
  const receipt = request.reviewReceipt;
  check(receipt && receipt !== r && matchPins(receipt, t, { pr: true })
    && receipt.verdict === 'passed' && LOGIN.test(receipt.owner ?? '')
    && LOGIN.test(receipt.reviewer ?? '') && receipt.owner.toLowerCase() === t.account.toLowerCase()
    && receipt.owner.toLowerCase() !== receipt.reviewer.toLowerCase() && receipt.revoked !== true,
  'INDEPENDENT_REVIEW_REQUIRED', 'separate bound GitHub review receipt is required');
}
function validate(request) {
  check(request && typeof request === 'object' && !Array.isArray(request), 'INVALID_REQUEST', 'request object is required');
  check(request.provider === 'github.com', 'UNSUPPORTED_PROVIDER', 'provider must explicitly equal github.com');
  check(Object.hasOwn(pairs, request.workflow), 'UNSUPPORTED_WORKFLOW', 'only three bounded PR workflows are supported');
  check(pairs[request.workflow].includes(request.action), 'UNSUPPORTED_ACTION', 'action is not supported by this workflow');
  check(request.workflow === 'babysit' ? request.mode === 'check' : request.mode === undefined,
    'UNSUPPORTED_MODE', 'only babysit check mode is supported');
  if (request.action === 'inspect') {
    check(request.target && REPO.test(request.target.repo ?? '') && !request.target.repo.includes('..')
      && LOGIN.test(request.target.account ?? ''), 'INVALID_TARGET', 'explicit repository and account are required');
    if (request.workflow !== 'opening-a-pr' || request.target.pr !== undefined)
      check(Number.isSafeInteger(request.target.pr) && request.target.pr > 0, 'INVALID_PR', 'one PR number is required');
    return;
  }
  const merge = request.workflow === 'shipping';
  targetPins(request.target, { pr: merge });
  check(ID.test(request.operationId ?? ''), 'INVALID_OPERATION', 'stable operationId is required');
  journalIdentity(request.journal, request.action === 'recover' ? 'load' : request.journal?.mode);
  if (request.action === 'recover') return;
  check(['create', 'load'].includes(request.journal.mode), 'INVALID_JOURNAL', 'journal mode must be create or load');
  if (merge) check(request.targetPolicy === 'server-policy', 'UNSUPPORTED_TARGET_CAS',
    'strict target CAS is the default; explicit server-policy boundary is required for GitHub merge');
  authority(request, request.action);
  if (request.action === 'create') {
    check(bounded(request.title, 200) && typeof (request.body ?? '') === 'string' && (request.body ?? '').length <= 30_000,
      'INVALID_INPUT', 'bounded title and body are required');
  } else {
    shippingEvidence(request);
  }
}

function priorOperations(provider) {
  const operations = new Map();
  for (const event of provider.run.state.events) {
    if (event.payload?.intent) operations.set(event.payload.intent.operationId, { intent: event.payload.intent, status: 'pending' });
    if (event.payload?.outcome && operations.has(event.payload.outcome.operationId))
      operations.get(event.payload.outcome.operationId).status = event.payload.outcome.status;
  }
  return operations;
}

/** A single, caller-frozen PR boundary. Caller records are assertions, not authenticated consent. */
export async function executeGitHubWorkflow(request, { transport } = {}) {
  try { request = structuredClone(request); }
  catch { throw new GitHubWorkflowError('INVALID_REQUEST', 'request must contain cloneable data only'); }
  validate(request);
  const { action, workflow, target: t } = request;
  if (action === 'inspect') {
    const provider = new GitHubAutopilotProvider({ transport });
    return t.pr === undefined ? provider.inspectRepository(t) : provider.inspectPr(t);
  }
  const { journal: j } = request;
  const options = { storePath: j.storePath, storeRoot: j.storeRoot, runId: j.runId, generation: j.generation, transport };
  const provider = j.mode === 'create' ? await GitHubAutopilotProvider.create(options) : await GitHubAutopilotProvider.load(options);
  const operations = priorOperations(provider);
  if (action === 'recover') {
    const old = operations.get(request.operationId);
    const expected = workflow === 'shipping' ? 'merge' : 'create';
    check(old?.intent.action === expected && matchPins(old.intent, t, { pr: expected === 'merge' }),
      'OPERATION_MISMATCH', 'journal operation does not match workflow and frozen target');
    return provider.recoverOperation({ operationId: request.operationId, repo: t.repo, account: t.account });
  }
  check(!operations.has(request.operationId), 'RECOVERY_REQUIRED', 'existing operation must be recovered explicitly');
  check(![...operations.values()].some((op) => op.status !== 'completed' && op.status !== 'failed'),
    'PENDING_OPERATION', 'reconcile pending operation before a new mutation');
  const inputs = { operationId: request.operationId, ...t, authorization: request.authorization };
  if (action === 'create') return provider.createPullRequest({ ...inputs, title: request.title, body: request.body ?? '' });
  return provider.mergePullRequest({ ...inputs, reviewReceipt: request.reviewReceipt,
    strictTargetCas: false, acceptServerPolicyBoundary: true });
}

const usage = 'Usage: github-workflow.mjs --help | inspect --request FILE | recover --request FILE';
async function main(args) {
  if (args.length === 1 && args[0] === '--help') { process.stdout.write(`${usage}\n`); return; }
  check(args.length === 3 && ['inspect', 'recover'].includes(args[0]) && args[1] === '--request'
    && bounded(args[2], 4096), 'CLI_READ_ONLY', usage);
  const info = await stat(args[2]);
  check(info.isFile() && info.size <= 128_000, 'INVALID_REQUEST', 'request file must be bounded');
  const request = JSON.parse(await readFile(args[2], 'utf8'));
  check(request.action === args[0], 'CLI_READ_ONLY', 'request action must equal read-only CLI command');
  process.stdout.write(`${JSON.stringify(await executeGitHubWorkflow(request))}\n`);
}
async function isCliEntry() {
  if (!process.argv[1]) return false;
  try { return await realpath(fileURLToPath(import.meta.url)) === await realpath(process.argv[1]); }
  catch { return false; }
}
if (await isCliEntry()) main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error.code ?? 'ERROR'}: ${error.message}\n`); process.exitCode = 1;
});
