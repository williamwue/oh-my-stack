---
name: hillclimb
description: "Improve one measurable outcome through bounded, single-change experiments against a frozen harness."
disable-model-invocation: true
---

# Hillclimb

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
For this workflow's implementers use `code.hillclimb`.

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

Use for sustained iterative improvement, not one isolated defect. Ground the
path with [how](../how/SKILL.md), choose a representative workload that
reproduces the complaint, one metric and direction, and a stop condition with
minimum attempts or independent confirmation. If no workload reproduces the
problem, fix the measurement before changing code.

Build a harness that distinguishes target and easier cases. Vet it with
[benchmark-checklist](../benchmark-checklist/SKILL.md) before freezing it. Make
the command emit error counts and actual work counts as well as the metric.
Freeze its command,
inputs, sampling, and noise rule. Record baseline and passing correctness gates
before edits. Use [show-me-your-work](../show-me-your-work/SKILL.md) for an
append-only attempt log: hypothesis, change, baseline, result, noise, tests,
verdict. Preserve each failed attempt's evidence.

For a performance metric, order hypotheses using the strategies in
[perf-issue](../perf-issue/SKILL.md), but retain this workflow's declared
minimum attempts, independent confirmation, and stop condition. Reaching one
attempt's target does not waive the frozen sustained-run contract.

One attempt tests one mechanism. Give writers isolated ownership or use a
single writer. Root reviews the actual diff, runs the frozen measurement and
regression gate, and keeps an attempt only if improvement clears the noise
threshold while correctness holds. Otherwise undo only that attempt's own
changes; never reset unrelated worktree edits. Finish the check before the
next attempt. Combining near misses requires a new measured attempt.

When results plateau, revisit the architecture and try a distinct hypothesis
within budget. Stop at the declared predicate or a documented cost boundary;
do not relax the metric to manufacture success. Report baseline, final metric,
delta, attempts kept/rejected, retained changes, log path, and next plausible
idea. Opening a pull request requires its own user authorization.
