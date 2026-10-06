---
name: no-comments
description: "Review comments and suppressions in a scoped diff, remove redundant ones, and encode real constraints in structure where feasible."
disable-model-invocation: true
---

# No comments

## Child session handoff

Read [the handoff contract](../poteto-mode/references/subagent-handoff.md).
New tasks, repair rounds, retries, and queue items use fresh child sessions
with the original brief, every later directive, prior findings and responses,
and unresolved objections. Reuse only for required costly live state, and
only when the host allows it. Stop and fence active writers before replacement.
A host-owned orchestrator's model catalog, workspace binding, child tools,
and review-round rules take precedence over the native binding above.
Keep its task handles and attribution receipts. Do not use a backing child
conversation as a new delegated review, or claim native-record verification
for a host-owned child. Report attribution evidence gaps explicitly.

Review the files or diff named by the user; otherwise use the current diff
against the actual base branch, including uncommitted changes. Freeze that
scope first. Ask a distinct reviewer to flag comments that merely narrate code,
stale warnings, unexplained suppressions, and constraints that could be types,
tests, or checks. Root-only review is a fallback, not independent review.

Inspect every finding and the actual diff. Preserve license notices,
public-interface documentation, external protocol requirements, and necessary
historical rationale. Do not treat a useful comment as guilty merely because
it looks emphatic. For disputed constraints, use [how](../how/SKILL.md) or
[why](../why/SKILL.md) on the symbol and cite the result.

Delete accepted redundant comments without changing behavior. For a
suppression, identify the underlying error and the narrowest real fix; never
remove a safety suppression while leaving the hazard. If changing code is
authorized, make the minimal root-cause change in scope and run the matching
checks. A substantial shape change can use a design sketch, but the review
does not authorize an unrelated refactor.

Offer type, test, lint, or runtime encodings for genuine constraints. Apply an
encoding only when within the requested edit scope. Where the source of truth
is external or the constraint remains unenforced, retain a concise useful
comment. Reinspect the final diff for missed suppressions and accidental code
edits. Return removed, retained, and revised comments, fixes and checks, plus
constraints still needing enforcement. Never claim a clean review from a
reviewer summary that the root has not checked.
