---
name: arena
description: "Compare independent candidates, select a base, graft stronger ideas, and verify."
---

# Arena

## Codex delegation binding

For every delegated worker in this workflow, derive the exact `model`,
`reasoning_effort`, and complete role-plus-task `message` with
`../../scripts/codex-delegation.mjs prepare` relative to this Skill. It resolves
the nearest project manifest first, then the user manifest. Supply the named
route/panel entry where configured; otherwise supply the canonical role
and the observed parent model and effort. Pass
the returned `task_name`, `fork_turns=none`, model, effort, and message
explicitly to the spawn call. Do not use a generated custom-role name as a selector or
claim its TOML was activated. After the worker finishes, run the helper's
`verify` mode on the persisted parent and child records when available; it
checks the spawn metadata, parent link, and child `turn_context`.
The persisted spawn message may be encrypted; disclose when its exact
role/task text cannot be audited. If records are unavailable, state that
runtime model resolution is unverified.

Produce competing solutions to one task, then one coherent verified result.
For partitioned coverage or a race with no synthesis, use [swarm](../swarm/SKILL.md).
Keep a phase checklist: frame, fan out, cross-judge, pick, graft, verify.

## Frame

Define the artifact, scope, source revision, constraints, and verification.
Freeze a rubric of three to six gradeable criteria before seeing candidates.
Keep it for the parent and judge; candidates receive the same task contract and
grounding, not the judging rubric or other candidates' work.

Use the requested candidate count, or the length of an active
`arena.runners` panel in the current resolution manifest; without one, start
with two independent attempts. Assign entries in panel order, repeating only
when the user explicitly requests more candidates than configured entries.
For a separate cross-judge, select one entry from `arena.cross-judge-pool`,
preferably a different resolved model family when observable. Bound total
attempts and concurrency. Disclose same-model execution and unsupported
diversity. Give each
candidate an isolated output location. For implementation candidates, ensure
each checkout has the same intended base and required local changes; a clean
checkout that omits relevant uncommitted work is not the same starting state.
Do not share writable branches, databases, ports, or external resources.

If isolation is unavailable, candidates may return designs or patches without
editing the shared tree. If delegation is unavailable, use clearly separated
root candidate passes and disclose that they are not independent agents. Do
not imply a multi-agent or multi-model result from that fallback.

## Fan out and freeze

Start independent candidates within the runtime limit before waiting. Each
brief includes the common task, immutable grounding, ownership, allowed actions,
verification command or check, and required artifact plus rationale naming
rejected alternatives. Workers may not publish or expand task authority.

Drain every started candidate; retain attributable outputs, exact revisions,
checks, and failures. Freeze artifacts before judgment. A dropout remains a
dropout, not a passing candidate. With fewer than two usable candidates, retry
within the declared budget or report a single-candidate result, not a completed
comparison. Do not let a timed-out writer continue changing a judged artifact.

## Cross-judge and pick

After candidates are frozen, start a distinct read-only judge with the rubric
and path-labeled artifacts. The parent reads every candidate end to end while
the judge scores them. Prefer configured model diversity only when supported.
Without a separate judge, run a distinct root critique after freezing and
explicitly mark the independent cross-judge as unavailable.

Score every criterion with evidence. Compare the judge's recommendation with
the parent's scores. Resolve disagreement against artifacts and constraints,
not majority opinion. Prefer maintainable boundaries and smaller public APIs
when otherwise tied. Record the selected base and rationale.

## Graft and verify

Revisit each losing candidate. Adapt valuable ideas into the base under one
coherent design, recording source candidate, accepted grafts, and rejections.
Convergence may need no graft; wildly incompatible assumptions require reframing
within the budget, not averaging. One root integrator owns the final artifact.
For an explanation or design-only request, return that artifact without code
changes. Integrate code only when implementation is in scope; preserve unrelated
user edits and never mechanically overwrite the working tree.

Verify the synthesized artifact itself, not just its winning precursor. Run
relevant tests or evaluate the complete design against realistic usage and
invariants. A failed check sends work back to framing or grafting within the
budget, otherwise report the unresolved failure. No implicit commit, push,
release, or merge is authorized by this workflow.

Return the artifact and compact synthesis record: candidate statuses, rubric
scores, judge verdict and disagreement resolution, base, grafts, rejected ideas,
verification evidence, dropouts, and execution fallbacks. Do not claim verified
success when the final check or a required candidate is missing.
