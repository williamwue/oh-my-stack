# Bounded GitHub babysit drive design

Status: design selected; full drive is not implemented or accepted. This
continues the post-0.5.0 checklist at baseline
`c91b85b428e8eb05b5dca676c8c0b6597398239b`.

## Decision

Select an **assisted reviewed-commit wave**. The root reproduces a CI defect,
repairs it, runs focused checks and obtains independent review. A future
adapter validates that immutable commit, records push intent, performs one
ordinary push and observes CI within fixed bounds. Recovery only reads remote
state and records the observed outcome; it never repeats an uncertain push.
This subset would not be unattended repair or merge authority.

Two independent candidates were frozen before an independent cross-judge:

| Candidate | Shape | Root score / 20 | Judge score / 20 | Decision |
| --- | --- | ---: | ---: | --- |
| 1 | Root supplies a reviewed direct-child commit; adapter owns push/recovery/observation. | 16 | 17 | Selected, subject to the requirements below. |
| 2 | Driver invokes trusted repair/review callbacks and owns tests, commit and push. | 12 | 12 | Rejected for the initial implementation. |

Both root and judge preferred candidate 1. The one-point scoring difference
does not change the required gates. Graft candidate 2's explicit blocker
classification and focused policy-diagnostic test matrix. Do not graft its
callback execution or arbitrary test-command interface. The current host
probes did not establish cancellation of a running child; an AbortSignal does
not prove that callback effects stopped.

The candidate panel used separately resolved Astra and Sol sessions. The
independent judge used Astra, the same model family as candidate 1 but a
distinct session. This is not a claim of three-model diversity.

## Proposed caller flow

These calls are **pseudocode**, not available API:

```js
const prepared = await drive.prepare(frozenScope);
// Root repairs, tests and obtains exact-commit independent review here.
const result = await drive.publish(prepared.continuation, reviewedCommit);
// One adapter-owned normal push, followed by bounded read-only observation.
const recovered = await drive.recover(originalOperation);
// Never repeats the push. Uncertainty remains quarantined.
```

One future `github-babysit-drive.mjs` module would own state transitions,
local Git provenance, target exclusion, push intent and bounded observation.
The existing provider owns authenticated remote reads and policy parsing.
The durable store remains a generic event store. Existing workflow check and
shipping retain their current boundaries; drive must not call merge.

## Required before publication effects

1. Bind an explicit ordinary-fast-forward/no-target-CAS policy to request,
   authority and durable intent. A normal push does not atomically assert the
   original head or base; do not imply otherwise.
2. Use a trusted canonical target-claim namespace across journals and run
   directories. Unresolved outcomes quarantine the target across new operation
   IDs. Neither lock age nor an observed old ref permits blind retry.
3. Verify actual Git push URLs, URL rewrites, credentials, hooks and settings
   that could add refs. Use the verified native account and preserve required
   hooks. Fetch-origin equality alone is insufficient.
4. Prove ownership and termination behavior of the fixed Git transport and
   its supported descendants. After push intent, cancellation cannot promise
   that no remote mutation occurred.
5. Separate immutable operation scope, prepared snapshot and publication
   payload digests. Repeated identical publication performs no extra push;
   changed commits or evidence conflict. Route push recovery explicitly.
6. Accept only an exact reviewed direct-child commit, clean owned checkout,
   bounded before/after verification evidence and an independent review tied
   to that commit. Never execute forge text or recorded receipt commands.

## First implementation and next acceptance

The independently verifiable prerequisite is a shared read-only CI diagnostic
path: audit the entire policy, return app-pinned failed/pending/missing check
identities, and keep strict inspection and shipping rejection unchanged.
Diagnostic readiness is observation, not repair, push or merge authority.

After that unit, publication/recovery still needs implementation and tests for
cross-journal exclusion, altered effective Git configuration, crashes around
push intent/outcome, stale continuations, deadline/cancellation and duplicate
calls. The live acceptance must use only the user-authorized synthetic public
repository: real red CI, root repair and focused verification, independent
exact-commit review, one adapter-owned push, new-head CI and an unmerged PR.
A diagnostic-only implementation cannot close checklist item 5.

Full frozen candidates, rubric, attribution, runtime verification and judgment
are retained with the private local checklist evidence. No candidate grants
external publication authority or broadens the existing single-PR capability.
