---
name: architect
description: "Ground a nontrivial design, compare distinct caller-first type and module sketches, then implement within scope and redesign when evidence contradicts the shape."
disable-model-invocation: true
---

# Architect

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

Design before implementation. Track grounding, sketches, synthesis/checkpoint,
implementation, and redesign. A design-only request stops at a design. This
workflow does not expand a request for advice into permission to edit code.

## Ground

Run [how](../how/SKILL.md) on affected subsystems, retaining traced entry points,
data flow, ownership, boundaries, and invariants. For changing ownership or
layering, also run [why](../why/SKILL.md) and carry forward Preserve / Change /
Avoid / Risk constraints with their confidence. Genuinely greenfield work may
skip existing-system grounding, but must still identify integration constraints.

## Sketch and synthesize

Read [the design contract](references/design-contract.md). Run
[arena](../arena/SKILL.md) with the same grounded problem for each runner and
that design contract. Require at least two structurally distinct candidates,
not two cosmetic versions of one design. State this requirement in the common
brief. If candidates converge, ask for a concrete alternative within the budget
or mark alternative exploration incomplete; do not silently waive the requirement.
When configured, pass the ordered `architect.runners` panel to Arena rather
than its general runner panel; its length sets the default candidate count.

Candidates write caller usage first, derive types/signatures and module
ownership from it, and mark bodies as pseudocode or not implemented. Keep
unfinished scaffolding out of the user's working code unless scaffold editing
was requested as part of implementation. Screen red flags before synthesis.
The parent selects and grafts against the rubric, recording interface depth,
invariants, tradeoffs, rejected alternatives, and open questions.

## Checkpoint and implement

Respect an explicit request to stop for approval. Otherwise proceed only when
the user requested implementation and the chosen scope is authorized. A design
request ends with the sketch, rationale, risks, and next implementation step.
Publication, destructive migration, or new external authority still needs its
own authorization.

For implementation, replace placeholders incrementally and verify each usable
unit against the caller examples and invariants. Maintain a deviation ledger:
changed signature or ownership, triggering evidence, and whether the sketch,
requirement, or implementation was wrong. Do not absorb contradictions silently.

## Redesign when needed

Repeated workarounds across unrelated paths, internal details leaking to
callers, type escape hatches, or two independent deviations of the same shape
trigger reassessment. A single legitimate edge case is not automatically a
failed architecture. Re-run how on the actual implementation, make the new
constraints explicit, subtract unnecessary structure, and return to arena
within the agreed budget. Preserve user changes; redesign never authorizes
destructive reset or discarding unrelated work.

Return caller usage, chosen types/signatures and module map, synthesis rationale,
tradeoffs, alternative shapes, open risks, and the next step. If implementation
ran, also report deviations and checks of the final code. Clearly distinguish
a verified design sketch from implemented and behaviorally verified software.
