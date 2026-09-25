---
name: perf-issue
description: "Fix one performance defect using representative before and after traces and a correctness gate."
disable-model-invocation: true
---

# Perf issue

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
