# Single-maintainer GitHub review policy

## Intent and current boundary

The maintainer explicitly requested the proposed single-maintainer adaptation,
real protected-branch merge, and interrupted-merge recovery. The original
workspace contains unrelated book and release work; implementation uses the
isolated `feature/single-maintainer-review` worktree based on release 0.4.0,
commit `427f15733894448ca8474c5434500444f96aeef4`.

A root trace of `executeGitHubWorkflow`, `shippingEvidence`, `inspectPr`, and
`mergePullRequest` found two different review requirements: the workflow's
independent OMS session and the provider's independent GitHub login. The
portable shipping workflow requires the first; the 0.4.0 adapter always adds
the second. Its thread completeness was also coupled to GitHub approval.

## Chosen structure

Use an explicit `reviewPolicy` discriminator. The default `github-review`
retains the existing GitHub approval requirement. `independent-oms` accepts a
revision-bound independent OMS session verdict, root-scoped authorization and
frozen landing frontier. It must not silently replace a configured GitHub
review requirement. Both entry layers check evidence, and the durable intent
binds the policy to the operation. These records are caller assertions, not
cryptographic reviewer authentication.

The new mode audits classic branch protection, required check contexts and
sources, strict freshness, administrator enforcement, and active branch rules.
Unknown or unsupported policy is a stop, not evidence that no approval is
required. GraphQL approval and thread completeness are separate observations.
GitHub still enforces its rules when processing the merge request. The API's
lack of an atomic expected-base-SHA guard remains an explicit limitation.

A direct discriminator is sufficient: this is one bounded alternative within
an existing request, not a second scheduler or a general policy engine.
Conservative support for audited protection shapes is preferable to guessing
at unknown rulesets.

## Throughput checkpoint

- Blocking gates: implementation checks, independent frozen review, protected
  target, fresh successful CI, and attributable independent fixture review.
- Independent work: one implementation session owns provider/workflow source
  and their tests; the root owns documentation, generation and hosted setup.
- Shared mutable state: source tests are serialized under one writer. Only
  the root mutates GitHub. Each remote mutation uses a private journal.
- Smallest decomposition: one implementation unit, one independent code
  review, then sequential normal-merge and interrupted-merge fixtures.

## Hosted target decision

The private `williamwue/oms-github-acceptance` repository returned HTTP 403 for
protection and effective branch-rule reads because the current plan does not
support that feature there. The user explicitly selected a new public,
synthetic-only `williamwue/oms-github-acceptance-public` repository. The private
repository is preserved. No subscription or visibility change was made.

The public target requires the `acceptance` check from GitHub Actions, strict
branch freshness, and administrator enforcement. Force pushes and deletions
are disabled. Its PR rule requires zero GitHub approvals; independent OMS
review remains a caller-side merge condition.

## Evidence boundaries

Successful normal merge does not prove recovery. Recovery acceptance must kill
the process after a real accepted merge and before its outcome journal entry,
then reopen the same operation, reconcile through reads, and verify the landed
commit is in the target. Orphan-lock handling requires evidence that the exact
owner is dead; lock age alone is insufficient. This is operator-assisted
recovery, not unattended service restart.
