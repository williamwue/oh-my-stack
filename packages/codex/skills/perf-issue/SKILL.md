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

Define the user's slow path, surface, workload, and metric. Capture a baseline
trace or profile through the real control surface before changing code. Use
[how](../how/SKILL.md) to connect cost to architecture. Do not claim a ceiling
or bottleneck by reading source alone.

Choose a hypothesis supported by the trace: remove unnecessary work; divide
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
