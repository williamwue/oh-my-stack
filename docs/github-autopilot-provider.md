# GitHub provider and recovery

The source tool `tools/github-autopilot-provider.mjs` uses the official GitHub
CLI to observe a real repository and pull request. Its library also supports
explicitly authorized pull-request creation and merge, with a durable intent
record and remote result reconciliation. The existing
`autopilot-provider-adapter.mjs` remains the offline disposable provider.
Neither provider is an unattended service or a complete pstack parity claim.

The current Codex candidate bundles this provider with the
[single-PR workflow adapter](github-workflow.md) for `opening-a-pr`, `babysit`
and `shipping`. Use that adapter to carry workflow authority and independent
OMS review into provider calls. The original binding shipped in 0.4.0. New behavior is available only
when the installed package includes the corresponding policy implementation.

## Inspect a target

Install and authenticate `gh` using the maintainer's normal GitHub login. Do not
load repository production environment files. Every call names the repository
and expected account; the provider verifies them using GitHub before proceeding.
It supports `github.com`, not an inferred enterprise host or repository fork.

From a source checkout:

```sh
node tools/github-autopilot-provider.mjs --help
node tools/github-autopilot-provider.mjs inspect-repository --repo OWNER/REPO --account LOGIN
node tools/github-autopilot-provider.mjs inspect-pr --repo OWNER/REPO --account LOGIN --pr 123
```

Both inspection commands are read only. They do not create a run store, push a
branch, publish a PR, post a review, or merge. The transport runs `gh` outside
the application directory, uses argument arrays and JSON input, and bounds
execution time and output. Authentication uses the existing native CLI setup.
Transport failures expose stable errors rather than raw provider stderr.

A PR observation identifies its exact base and head, draft/state, checks and
review state. Unknown or incomplete observations cannot establish merge
readiness. A provider's green checks are not an independent OMS review or
permission to publish.

## Read-only CI diagnostics in 0.6.0

Version 0.6.0 adds `diagnosePr()` for failure investigation. It creates
no journal and performs no remote mutation. The earlier 0.5.0 package does not contain this method.

```js
import { GitHubAutopilotProvider } from './tools/github-autopilot-provider.mjs';
const provider = new GitHubAutopilotProvider();
const observation = await provider.diagnosePr({
  repo: 'OWNER/REPO', account: 'LOGIN', pr: 123,
  reviewPolicy: 'independent-oms',
});
// observation.requiredChecks: app-pinned identities and
// passed / failed / pending / missing / unknown classifications.
```

This method shares the authenticated PR collection and policy audit with
strict inspection. It audits review/protection structure before reporting red
CI, so a failed check cannot hide an unsupported review policy. Unknown review
fields and populated bypass/dismissal restrictions stop safely; documented
empty restriction collections are accepted. Current-head run identities are
bounded structured data; raw CI logs are not returned or executed. The
`mergeableState` field distinguishes a concrete `dirty` state from a general
`blocked` gate, which by itself does not identify a source conflict.

The default `github-review` mode retains its normal review gate; its empty
`requiredChecks` list does not assert that the repository requires no checks.
Use explicit `independent-oms` for the audited app-pinned requirement details.
Strict `inspectPr()` and `mergePullRequest()` still reject unsuccessful
required checks. A diagnostic result is never repair, push or merge authority.
The [drive design](github-babysit-drive-design.md) remains a separate unfinished
implementation; the workflow adapter still rejects drive mode.

Check classifications follow the documented
[GitHub check states](https://docs.github.com/en/rest/guides/using-the-rest-api-to-interact-with-checks),
while accepted review shapes use the
[branch-protection API](https://docs.github.com/en/rest/branches/branch-protection).

## Authorized library operations

Mutation is deliberately a library interface, not a CLI switch. The caller
must supply the existing workflow's scoped authorization and, for a merge,
independent review evidence. This interface validates the supplied records; it
does not create human consent or authenticate the independence of a reviewer.
Keep the owner, root verdict and external publication gates from the selected
OMS workflow. A request to install or inspect the tool grants no write scope.

Create a `GitHubAutopilotProvider` with `create({storePath, storeRoot, runId,
generation})`, or reopen it with `load()` and the same identity. Use a private
local store outside the repository. Coordinate one owner per store; the
durable store's lock protects cooperating local writers, not distributed
workers or malicious local processes.

- `createPullRequest()` accepts an already-pushed branch in the same repository,
  exact base/head branch names and SHAs, title/body, a stable operation ID and
  authorization bound to those same names and SHAs.
  It does not push or create a remote branch. The PR includes an operation
  marker used for subsequent reconciliation.
- `mergePullRequest()` requires an exact PR/base/head, separate merge authority,
  an independent passing review receipt and fresh provider gates. Inputs,
  authorization and review receipts all bind both branch names and SHAs;
  equal SHAs do not make two target branches interchangeable. The named
  reviewer must also have a current GitHub approval on that head under the
  default `github-review` policy. Explicit `independent-oms` uses a bound OMS
  review, root authorization and frozen frontier, while preserving any actual
  GitHub approval requirement. See the [policy binding](github-workflow.md).
  It does not fabricate approval, bypass checks or enable delayed auto-merge.
- Inspect the exported methods and executable examples in
  [the provider tests](../tests/github-autopilot-provider.test.mjs) for the
  complete argument records. Authorization is local caller evidence; GitHub's
  authentication, permissions and repository protections still apply.

The transport uses [official `gh api`](https://cli.github.com/manual/gh_api)
with JSON request bodies. Creation and merge use the documented
[GitHub pull-request API](https://docs.github.com/en/rest/pulls/pulls).

## Interrupted operations

Before a mutation, the provider records a durable operation intent containing
the repository, account, action, pinned revisions and operation identity. It
stores a fingerprint rather than the submitted PR prose. Treat the journal as
private metadata even though raw credentials and provider errors are excluded.

A timeout does not prove the remote write failed. Reopen the existing store
with `GitHubAutopilotProvider.load()` and call
`recoverOperation({operationId, repo, account})` to reconcile the pending
operation against GitHub. Never delete the journal,
change operation IDs or repeat a POST/PUT to work around an uncertain outcome.
Creation reconciliation requires the operation marker and exact target;
merge reconciliation requires authoritative merged state. An absent,
conflicting or unverifiable result remains unresolved and blocks further
writes. Reusing an operation ID for different input is rejected.

PR creation names mutable branch refs in GitHub's API. The preflight SHA check
cannot atomically prevent another actor from moving a branch before creation.
A changed revision in readback leaves the operation unresolved; it does not
prove that no PR was published. Keep remote branch ownership coordinated, and
do not use this interface where publication requires an atomic revision guard.

This recovery reconciles external side effects. It does not reattach to a live
Codex worker, restart a daemon, or schedule a future task. Unresolved operations
need an operator to inspect the recorded target and GitHub before deciding how
to proceed. Lock age alone is not proof that an owner is dead.

## Merge consistency boundary

GitHub's merge API supports an expected PR head SHA. It does not provide an
atomic expected-base-SHA parameter. A fresh base observation can therefore
become stale between the read and merge request.

`strictTargetCas: true` is unsupported and stops before mutation. Ordinary
shipping requires the caller to explicitly accept this boundary through
`acceptServerPolicyBoundary: true` and requires the current base branch to
report `protected: true`. The default `github-review` mode observes this
flag rather than auditing every effective rule or administrator permission.
The new `independent-oms` mode additionally audits supported classic protection,
required check sources, administrator enforcement and active branch rules;
unsupported or unreadable rules block it. GitHub remains
responsible for enforcing the configured rules at merge time. This does not
satisfy an `autopilot-full` contract requiring
the target to remain exactly unchanged after the root countersign. Do not
enable ordinary shipping as a fallback inside such a strict program.

## Verification scope

The provider's tests inject deterministic API responses to exercise publication,
gate failures, ambiguous outcomes and recovery without writing to GitHub.
Transport tests exercise the real subprocess boundary separately. A live
read-only repository inspection verifies the current login and target only.

The [hosted acceptance](github-hosted-acceptance-2026-10-03.md) now verifies real
PR creation, CI failure/repair and operator-assisted interrupted-create recovery
on an explicitly authorized disposable repository. The subsequent
[single-maintainer acceptance](github-single-maintainer-acceptance-2026-10-03.md)
verifies protected-target merge and operator-assisted interrupted-merge recovery
with the explicit OMS review policy. The default independent-GitHub-account
approval path remains unverified against live GitHub. Full
autonomous queue acceptance, scheduled recovery, Benny/webhook
integration and live-worker reattachment remain separate work.
