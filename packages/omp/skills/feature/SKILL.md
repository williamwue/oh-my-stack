---
name: feature
description: "Add or intentionally change behavior through an evidence-backed design, bounded implementation, and matching-surface verification."
disable-model-invocation: true
---

# Feature

## OMP model routing

At the start of this workflow, run `../../scripts/model-resolution.mjs`
with `--runtime omp --cwd` set to the current workspace. Read the returned
manifest: nearest project first, then the user's `~/.omp/agent/` default.
For each configured route, select its named agent through OMP's native
task-agent selector and verify that its source matches the chosen scope;
for a canonical role, use the manifest role's `agent` name (user
defaults use namespaced `ohmystack-role-*` agents).
preserve panel entry order and count. If no mapping is present, retain the
workflow's normal runtime model. Verify resolved worker model and thinking
level from OMP session/job metadata, not from the role file alone.
For this workflow's implementers use `code.feature-refactoring`.

The root owns design, integration, and proof.

1. Inspect the affected subsystem with the `how` workflow. Name the user-visible
   behavior, current boundary, and the data shape that should organize the new
   behavior.
2. Compare multiple designs only when the choice is consequential. Use a
   `prototype` for an empirical fork and `interrogate` for a contested design.
   Otherwise record why the direct design is sufficient.
3. Write a throughput checkpoint covering blocking gates, independent work,
   shared mutable state, and the smallest safe decomposition. Use one writer
   when ownership overlaps.
4. Establish failing or absent behavior with a test or executable reproduction
   before implementation when practical.
5. Assign one bounded writer or implement at the root. A delegated writer gets
   exact paths, the named data shape, constraints, and success commands. Use an
   isolated workspace when available. Use the configured `code.feature-refactoring` route
   when active; otherwise inherit the runtime model. If isolation is missing,
   serialize writes and disclose it.
6. The root inspects the actual diff, rejects unrelated changes, and runs the
   stated checks on the matching surface. Do not accept a child summary as
   verification.
7. Keep commits small and independently verifiable. Do not publish or open a
   pull request unless the user explicitly requested that external action.

Return what changed for the user, the chosen structure and tradeoffs, the
throughput checkpoint, exact verification commands and outcomes, evidence
limitations, and any open product decision.
