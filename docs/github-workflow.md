# Codex GitHub workflow binding

The generated Codex `opening-a-pr`, `babysit`, and `shipping` skills can select
this adapter only when the provider is explicitly `github.com`. Import
`executeGitHubWorkflow` from `scripts/github-workflow.mjs` in an installed
package, or `tools/github-workflow.mjs` in the source checkout. The CLI accepts
only `--help`, `inspect --request FILE`, and `recover --request FILE`. It cannot
create or merge. `recover` makes only remote reads but may append the resolved
outcome to the private local journal.

The adapter handles one PR at a time. `opening-a-pr` supports `inspect`,
`create`, and `recover`; `babysit` supports `inspect` with `mode: "check"` only;
`shipping` supports `inspect`, `merge`, and `recover`. Drive, threads-only,
background, polling, stack, and autopilot modes are unsupported. A caller must
discover and freeze the actual current bottom PR and have the root session
countersign it. The adapter does not discover or validate stack topology, push
branches, repair checks, create approvals, or verify merged SHA ancestry in the
target branch. The caller must verify landing before considering another PR.

These records are caller assertions. Passing validation does not authenticate
human consent, root or reviewer session provenance, stable patch calculation,
or GitHub permissions. Preserve the selected workflow's approval and review
gates. The separate `reviewReceipt` asserts a current GitHub reviewer approval;
the provider checks that reviewer against live GitHub review state. The OMS
`review` packet represents an independent agent review and cannot substitute
for that GitHub approval.

The entrypoint takes a complete synchronous snapshot before validation or
asynchronous work. Later edits to the caller's request cannot retarget an
in-flight operation or replace its checked authorization and review.

## Inspect

```json
{
  "workflow": "babysit", "provider": "github.com", "action": "inspect", "mode": "check",
  "target": { "repo": "acme/project", "account": "maintainer", "pr": 7 }
}
```

Use the same `target` for `shipping` inspection. `opening-a-pr` inspection may
omit `pr` to inspect the repository or include it to inspect an existing PR.
These calls create no journal. An inspection result is current observation,
not publication or merge authorization.

## Create one ready PR

The head branch must already be pushed. Replace every sample identity and SHA
with the frozen values. `storeRoot` and `storePath` must be absolute paths in a
private local area; `private: true` is an explicit caller assertion. Use an
unused journal with `mode: "create"`, or explicitly reopen an existing journal
with `mode: "load"`. An existing operation ID cannot be resent through the
mutation path; use `recover` instead.

```json
{
  "workflow": "opening-a-pr", "provider": "github.com", "action": "create",
  "target": { "repo": "acme/project", "account": "maintainer", "base": "main", "head": "feature", "baseSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "headSha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
  "operationId": "create-7",
  "journal": { "mode": "create", "private": true, "storeRoot": "/private/operator/oms", "storePath": "/private/operator/oms/pr-7.json", "runId": "pr-7", "generation": 1 },
  "authorization": { "approved": true, "workflow": "opening-a-pr", "action": "create", "operationId": "create-7", "repo": "acme/project", "account": "maintainer", "base": "main", "head": "feature", "baseSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "headSha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "actorSession": "root-1", "rootSession": "root-1", "ownerSession": "writer-1" },
  "title": "Add feature", "body": "Why: ...\n\nVerification: ..."
}
```

The provider pins both branch SHAs before creation, then reconciles the new PR
using a durable marker and exact remote readback. GitHub cannot atomically pin
branch refs during PR creation. An ambiguous result remains unresolved and
must never be retried under a fresh operation ID.

## Merge one frozen bottom PR

The default target policy is strict and stops before journal or network work:
GitHub's merge API has an expected head SHA but no atomic expected base SHA.
Only an explicit `targetPolicy: "server-policy"`, bound into the authorization,
allows the provider to rely on its fresh base read and GitHub branch protection.
That still leaves a race if the target moves after the read. Never silently
change a strict request into server-policy.

```json
{
  "workflow": "shipping", "provider": "github.com", "action": "merge", "targetPolicy": "server-policy",
  "target": { "repo": "acme/project", "account": "maintainer", "pr": 7, "base": "main", "head": "feature", "baseSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "headSha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
  "operationId": "merge-7",
  "journal": { "mode": "create", "private": true, "storeRoot": "/private/operator/oms", "storePath": "/private/operator/oms/pr-7-merge.json", "runId": "pr-7-merge", "generation": 1 },
  "authorization": { "approved": true, "workflow": "shipping", "action": "merge", "operationId": "merge-7", "repo": "acme/project", "account": "maintainer", "pr": 7, "base": "main", "head": "feature", "baseSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "headSha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "actorSession": "root-1", "rootSession": "root-1", "ownerSession": "writer-1", "targetPolicy": "server-policy", "patchId": "patch-abc" },
  "frontier": { "repo": "acme/project", "account": "maintainer", "pr": 7, "base": "main", "head": "feature", "baseSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "headSha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "bottomPr": 7, "frozen": true, "countersignedBy": "root-1", "patchId": "patch-abc" },
  "review": { "repo": "acme/project", "account": "maintainer", "pr": 7, "base": "main", "head": "feature", "baseSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "headSha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "writerSession": "writer-1", "reviewerSession": "reviewer-1", "patchId": "patch-abc", "verdict": "PASS", "verification": [{ "command": "npm test", "status": "passed", "observed": "All tests passed" }] },
  "reviewReceipt": { "repo": "acme/project", "account": "maintainer", "pr": 7, "base": "main", "head": "feature", "baseSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "headSha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "owner": "maintainer", "reviewer": "reviewer", "verdict": "passed" }
}
```

The OMS verdict may be `PASS` or `PASS+NOTES`; supply 1–256 actual verification
entries with no empty slots. Each verification entry needs a
nonempty command, `status: "passed"`, and a nonempty `observed` result. Failed
or unknown verification does not authorize merge. The reviewer session must differ from
the writer session, and only `actorSession === rootSession` may merge. The
provider independently requires live checks, GitHub approval, resolved
threads, mergeability, exact PR revisions, and a protected base branch.

## Reconcile an interrupted operation

Use the same `workflow`, `provider`, `target`, `operationId`, and journal
identity. Change `action` to `recover` and journal `mode` to `load`; the create
prose or merge review records are unnecessary. The adapter checks the journal
intent's action and frozen target before the provider makes remote reads. A
pending operation must be reconciled under its original ID; no new POST/PUT or
automatic retry follows an uncertain outcome.

```json
{
  "workflow": "shipping", "provider": "github.com", "action": "recover",
  "target": { "repo": "acme/project", "account": "maintainer", "pr": 7, "base": "main", "head": "feature", "baseSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "headSha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
  "operationId": "merge-7",
  "journal": { "mode": "load", "private": true, "storeRoot": "/private/operator/oms", "storePath": "/private/operator/oms/pr-7-merge.json", "runId": "pr-7-merge", "generation": 1 }
}
```

Use `node scripts/github-workflow.mjs recover --request packet.json` in an
installed package, or `node tools/github-workflow.mjs ...` in the source
checkout. Recovery does not retry a remote mutation. If the remote result is
ambiguous, it remains unresolved and blocks further writes.
