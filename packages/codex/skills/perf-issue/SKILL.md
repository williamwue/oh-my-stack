---
name: perf-issue
description: "Fix one performance issue with before and after traces."
---

# Perf issue

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
