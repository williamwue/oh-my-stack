---
name: no-comments
description: "Review comments, remove redundancy, and encode real constraints."
---

# No comments

## Codex delegation binding

For every delegated worker in this workflow, derive the exact `model`,
`reasoning_effort`, and complete role-plus-task `message` with
`../../scripts/codex-delegation.mjs prepare` relative to this Skill. Supply the active
resolution manifest and named route/panel entry where configured; otherwise
supply the canonical role and the observed parent model and effort. Pass
the returned `task_name`, `fork_turns=none`, model, effort, and message
explicitly to the spawn call. Do not use a generated custom-role name as a selector or
claim its TOML was activated. After the worker finishes, run the helper's
`verify` mode on the persisted parent and child records when available; it
checks the spawn metadata, parent link, and child `turn_context`.
The persisted spawn message may be encrypted; disclose when its exact
role/task text cannot be audited. If records are unavailable, state that
runtime model resolution is unverified.

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
