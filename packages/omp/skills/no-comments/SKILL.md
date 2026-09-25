---
name: no-comments
description: "Review comments and suppressions in a scoped diff, remove redundant ones, and encode real constraints in structure where feasible."
disable-model-invocation: true
---

# No comments

## OMP model routing

At the start of this workflow, run `../../scripts/model-resolution.mjs`
with `--runtime omp --cwd` set to the current workspace. Read the returned
manifest: nearest project first, then the user's `~/.omp/agent/` default.
For each configured route, select its named agent through OMP's native
task-agent selector and verify that its source matches the chosen scope;
for a canonical role, use the manifest role's `agent` name (user
defaults use namespaced `ohmystack-role-*` agents).
Preserve panel entry order and count. If no mapping is present, retain the
workflow's normal runtime model. Verify resolved worker model and thinking
level from OMP session/job metadata, not from the role file alone.
When `task` returns a background job id, retain it until terminal status.
On OMP hosts exposing `proc://` (observed in 18.3.0), use `read proc://<id>`
for non-consuming status, `wait` to drain, and `write proc://<id>/kill`
to cancel an owned job with the required approval. Confirm cancellation
before replacing a worker and reject results from older generations.
Do not assume the deprecated `hub` tool exists. If safe cancellation
is unavailable, wait or report the unit incomplete; never silently
treat an unconfirmed worker as cancelled.

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
