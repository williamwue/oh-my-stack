---
name: perf-issue
description: "Fix one performance issue with before and after traces."
---

# Perf issue

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
For this workflow's implementers use `code.perf-issue`.

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

Define the user's slow path, surface, workload, and metric. Capture a baseline
trace or profile through the real control surface before changing code. Use
[how](../how/SKILL.md) to connect cost to architecture. Do not claim a ceiling
or bottleneck by reading source alone.

Vet the baseline and each later number with
[benchmark-checklist](../benchmark-checklist/SKILL.md). Record successful and
failed work counts, tuning, repeated samples, spread, and the measured limiter.
If the requested task is only measurement validation, stay in that workflow.

Try hypotheses supported by the trace in this order: do not do unused work;
avoid repeated work; do less; do it later; move it outside the interactive
moment; do it concurrently; then do it cheaper. Stop when an earlier strategy
meets the target. A source read establishes that work is unused; a trace alone
does not authorize deletion. More specific mechanisms remain hypothesis tools,
not a checklist:
 remove unnecessary work; divide
scaling work; cache repeated work with explicit invalidation; index or add
indirection; batch fixed overhead; duplicate a dominant wait when capacity
allows; defer unused work; or schedule necessary work outside the critical
moment. These are hypothesis families, not a checklist to implement blindly.

Make one bounded change, using [architect](../architect/SKILL.md) if it alters
module boundaries. Review the diff, capture a post-change trace under the same
workload, compare numeric artifacts using a repeatable command, and run the
correctness gate. A change that improves one number but breaks the user flow
does not pass. A noisy or different-surface comparison is inconclusive.

Return baseline, after value, delta, trace paths, correctness result, and
remaining uncertainty. For sustained repeated iterations, route to
[hillclimb](../hillclimb/SKILL.md). Publish only when the user requested it.
