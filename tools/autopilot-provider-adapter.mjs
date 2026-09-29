import { randomUUID } from "node:crypto";

import { createRun, loadRun } from "./durable-run-state.mjs";

const SCHEMA_VERSION = 1;
const CHECK_STATUSES = new Set(["PENDING", "PASSED", "FAILED"]);
const OPERATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class AutopilotProviderError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "AutopilotProviderError";
    this.code = code;
    Object.assign(this, details);
  }
}

function fail(code, message, details) {
  throw new AutopilotProviderError(code, message, details);
}

function assert(condition, code, message, details) {
  if (!condition) fail(code, message, details);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function id(value, label) {
  assert(typeof value === "string" && OPERATION_ID.test(value), "INVALID_INPUT", `${label} must be a bounded identifier`);
  return value;
}

function nonEmpty(value, label) {
  assert(typeof value === "string" && value.length > 0 && value.length <= 200, "INVALID_INPUT", `${label} is required`);
  return value;
}

function normalizeCheckStatus(status) {
  const normalized = typeof status === "string" ? status.toUpperCase() : status;
  assert(CHECK_STATUSES.has(normalized), "INVALID_CHECK_STATUS", `unsupported CI status: ${status}`);
  return normalized;
}

function emptyProviderState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    nextPullRequest: 1,
    branches: {
      main: { name: "main", base: null, baseRevision: 0, headRevision: 0, protected: true },
    },
    pullRequests: {},
    operations: {},
  };
}

function validateState(state) {
  assert(state && typeof state === "object" && !Array.isArray(state), "STATE_INVALID", "provider state must be an object");
  assert(state.schemaVersion === SCHEMA_VERSION, "STATE_INVALID", "unsupported provider state schema");
  assert(Number.isSafeInteger(state.revision) && state.revision >= 0, "STATE_INVALID", "provider revision is invalid");
  assert(Number.isSafeInteger(state.nextPullRequest) && state.nextPullRequest > 0, "STATE_INVALID", "next pull-request number is invalid");
  assert(state.branches && typeof state.branches === "object", "STATE_INVALID", "branches are required");
  assert(state.pullRequests && typeof state.pullRequests === "object", "STATE_INVALID", "pullRequests are required");
  assert(state.operations && typeof state.operations === "object", "STATE_INVALID", "operations are required");
  assert(state.branches.main, "STATE_INVALID", "main branch is required");
  return state;
}

function result(state, extra = {}) {
  return { revision: state.revision, ...clone(extra) };
}

/**
 * A deterministic local Git/PR provider contract for autopilot workflows.
 * It has no network client and never reads provider credentials. State is
 * persisted through the provider-independent durable run primitive.
 */
export class AutopilotProviderAdapter {
  constructor({ run, providerState }) {
    this.run = run;
    this.providerState = validateState(providerState);
  }

  get state() {
    return clone(this.providerState);
  }

  get durableState() {
    return this.run.state;
  }

  static async create({ storePath, storeRoot, runId = "autopilot-provider", generation = 1, metadata = {} } = {}) {
    const run = await createRun({ storePath, storeRoot, runId, generation, metadata: { provider: "disposable-git", ...metadata } });
    return new AutopilotProviderAdapter({ run, providerState: emptyProviderState() });
  }

  static async load({ storePath, storeRoot, runId, generation } = {}) {
    const run = await loadRun({ storePath, storeRoot, runId, generation });
    const event = run.state.events.at(-1);
    const providerState = event?.payload?.providerState ?? emptyProviderState();
    return new AutopilotProviderAdapter({ run, providerState });
  }

  async recover() {
    await this.run.recover();
    const event = this.run.state.events.at(-1);
    this.providerState = validateState(event?.payload?.providerState ?? emptyProviderState());
    return this.state;
  }

  _checkRevision(expectedRevision) {
    if (expectedRevision === undefined) return;
    assert(Number.isSafeInteger(expectedRevision) && expectedRevision >= 0, "INVALID_REVISION", "expectedRevision must be a non-negative integer");
    if (expectedRevision !== this.providerState.revision) {
      fail("STALE_REVISION", `expected revision ${expectedRevision}, current revision is ${this.providerState.revision}`, {
        expectedRevision,
        currentRevision: this.providerState.revision,
      });
    }
  }

  async _commit({ operationId, action, input, mutate, expectedRevision }) {
    id(operationId, "operationId");
    const existing = this.providerState.operations[operationId];
    const fingerprint = JSON.stringify({ action, input });
    if (existing) {
      if (existing.fingerprint !== fingerprint) fail("OPERATION_CONFLICT", `operation ${operationId} was already used for a different request`);
      return { ...clone(existing.result), duplicate: true };
    }
    this._checkRevision(expectedRevision);

    const next = clone(this.providerState);
    next.revision += 1;
    const operationResult = mutate(next);
    const storedResult = { ...clone(operationResult), revision: next.revision };
    next.operations[operationId] = { action, fingerprint, result: storedResult };
    validateState(next);
    const event = {
      eventId: operationId,
      generation: this.run.state.generation,
      revision: this.run.state.revision + 1,
      type: this.run.state.revision === 0 ? "start"
        : action === "merge" && storedResult.status === "merged" ? "completed" : "checkpoint",
      payload: { action, operationId, providerRevision: next.revision, providerState: next },
    };
    await this.run.append(event);
    this.providerState = next;
    return { ...clone(storedResult), duplicate: false };
  }

  async createBranchIntent({ branch, baseBranch = "main", expectedRevision, operationId = `branch-${randomUUID()}` } = {}) {
    nonEmpty(branch, "branch");
    nonEmpty(baseBranch, "baseBranch");
    return this._commit({ operationId, action: "create-branch", input: { branch, baseBranch }, expectedRevision, mutate: (next) => {
      assert(!next.branches[branch], "BRANCH_EXISTS", `branch ${branch} already exists`);
      const base = next.branches[baseBranch];
      assert(base, "BASE_NOT_FOUND", `base branch ${baseBranch} does not exist`);
      next.branches[branch] = {
        name: branch,
        base: baseBranch,
        baseRevision: base.headRevision,
        headRevision: base.headRevision,
        protected: false,
      };
      return result(next, { status: "created", branch, baseBranch, baseRevision: base.headRevision });
    }});
  }

  async createBranch(options = {}) {
    return this.createBranchIntent(options);
  }

  async createPullRequestIntent({ branch, baseBranch = "main", title = "Autopilot change", body = "", checks = [], approvalRequired = true, mergeOutcome = "success", pullRequestId, expectedRevision, operationId = `pr-${randomUUID()}` } = {}) {
    nonEmpty(branch, "branch");
    nonEmpty(baseBranch, "baseBranch");
    assert(Array.isArray(checks), "INVALID_INPUT", "checks must be an array");
    assert(["success", "failure"].includes(mergeOutcome), "INVALID_INPUT", "mergeOutcome must be success or failure");
    const normalizedChecks = checks.map((name) => ({ name: nonEmpty(name, "check name"), status: "PENDING", attempts: 0 }));
    if (pullRequestId !== undefined) id(pullRequestId, "pullRequestId");
    return this._commit({ operationId, action: "create-pull-request", input: { branch, baseBranch, title, body, checks: normalizedChecks, approvalRequired, mergeOutcome, pullRequestId: pullRequestId ?? null }, expectedRevision, mutate: (next) => {
      const head = next.branches[branch];
      const base = next.branches[baseBranch];
      assert(head, "BRANCH_NOT_FOUND", `branch ${branch} does not exist`);
      assert(base, "BASE_NOT_FOUND", `base branch ${baseBranch} does not exist`);
      const prId = pullRequestId ?? `pr-${next.nextPullRequest++}`;
      assert(!next.pullRequests[prId], "PULL_REQUEST_EXISTS", `pull request ${prId} already exists`);
      const parsedNumber = Number(prId.slice(3));
      const pr = {
        id: prId,
        number: Number.isSafeInteger(parsedNumber) ? parsedNumber : null,
        title,
        body,
        branch,
        baseBranch,
        baseRevision: base.headRevision,
        headRevision: head.headRevision,
        status: "OPEN",
        checks: Object.fromEntries(normalizedChecks.map((check) => [check.name, check])),
        approvalRequired: Boolean(approvalRequired),
        approvedBy: null,
        mergeOutcome,
        mergeAttempts: [],
      };
      next.pullRequests[prId] = pr;
      return result(next, { status: "created", pullRequest: pr });
    }});
  }

  async createPullRequest(options = {}) {
    return this.createPullRequestIntent(options);
  }

  _pr(next, prId) {
    id(prId, "pullRequestId");
    const pr = next.pullRequests[prId];
    assert(pr, "PULL_REQUEST_NOT_FOUND", `pull request ${prId} does not exist`);
    return pr;
  }

  async recordCiStatus({ pullRequestId, prId = pullRequestId, check, name = check, status, expectedRevision, operationId = `ci-${randomUUID()}` } = {}) {
    nonEmpty(name, "check");
    const normalized = normalizeCheckStatus(status);
    return this._commit({ operationId, action: "record-ci", input: { prId, name, status: normalized }, expectedRevision, mutate: (next) => {
      const pr = this._pr(next, prId);
      assert(pr.status === "OPEN", "PULL_REQUEST_CLOSED", `pull request ${prId} is not open`);
      const checkState = pr.checks[name] ?? { name, status: "PENDING", attempts: 0 };
      if (normalized !== "PENDING") checkState.attempts += 1;
      checkState.status = normalized;
      pr.checks[name] = checkState;
      return result(next, { status: normalized.toLowerCase(), pullRequestId: prId, check: clone(checkState) });
    }});
  }

  async recordCheck(options = {}) {
    return this.recordCiStatus(options);
  }

  async recordCi(options = {}) {
    return this.recordCiStatus(options);
  }

  async recordCI(options = {}) {
    return this.recordCiStatus(options);
  }

  async retryFailedChecks({ pullRequestId, prId = pullRequestId, checks, expectedRevision, operationId = `retry-${randomUUID()}` } = {}) {
    const selected = checks === undefined ? null : checks.map((name) => nonEmpty(name, "check name"));
    return this._commit({ operationId, action: "retry-failed-checks", input: { prId, checks: selected }, expectedRevision, mutate: (next) => {
      const pr = this._pr(next, prId);
      const names = Object.keys(pr.checks).filter((name) => (!selected || selected.includes(name)) && pr.checks[name].status === "FAILED");
      for (const name of names) pr.checks[name].status = "PENDING";
      return result(next, { status: "pending", pullRequestId: prId, retried: names });
    }});
  }

  async recordApproval({ pullRequestId, prId = pullRequestId, approver = "reviewer", expectedRevision, operationId = `approval-${randomUUID()}` } = {}) {
    nonEmpty(approver, "approver");
    return this._commit({ operationId, action: "approve", input: { prId, approver }, expectedRevision, mutate: (next) => {
      const pr = this._pr(next, prId);
      assert(pr.status === "OPEN", "PULL_REQUEST_CLOSED", `pull request ${prId} is not open`);
      pr.approvedBy = approver;
      return result(next, { status: "approved", pullRequestId: prId, approver });
    }});
  }

  async approve(options = {}) {
    return this.recordApproval(options);
  }

  async approvePullRequest(options = {}) {
    return this.recordApproval(options);
  }

  async mergePullRequest({ pullRequestId, prId = pullRequestId, expectedRevision, operationId = `merge-${randomUUID()}` } = {}) {
    return this._commit({ operationId, action: "merge", input: { prId }, expectedRevision, mutate: (next) => {
      const pr = this._pr(next, prId);
      assert(pr.status === "OPEN", "PULL_REQUEST_CLOSED", `pull request ${prId} is not open`);
      const failed = Object.values(pr.checks).filter((check) => check.status !== "PASSED");
      let failure = failed.length > 0 ? "CHECKS_NOT_PASSED" : null;
      if (!failure && pr.approvalRequired && !pr.approvedBy) failure = "APPROVAL_REQUIRED";
      if (pr.mergeOutcome === "failure") failure = "MERGE_FAILED";
      if (failure) {
        pr.mergeAttempts.push({ revision: next.revision, status: "failed", reason: failure });
        return result(next, { status: "failed", pullRequestId: prId, reason: failure });
      }
      pr.status = "MERGED";
      pr.mergeAttempts.push({ revision: next.revision, status: "merged" });
      next.branches[pr.baseBranch].headRevision = next.revision;
      return result(next, { status: "merged", pullRequestId: prId });
    }});
  }

  async merge(options = {}) {
    return this.mergePullRequest(options);
  }
}

export const DisposableGitProvider = AutopilotProviderAdapter;
export const DisposableGitProviderAdapter = AutopilotProviderAdapter;
export const createAutopilotProvider = (options) => AutopilotProviderAdapter.create(options);
export const loadAutopilotProvider = (options) => AutopilotProviderAdapter.load(options);
export const AUTOPILOT_PROVIDER_SCHEMA_VERSION = SCHEMA_VERSION;
export default AutopilotProviderAdapter;
