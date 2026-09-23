---
name: architect
description: Ground a nontrivial design, compare distinct caller-first type and module sketches, then implement within scope and redesign when evidence contradicts the shape.
---

# Architect

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
