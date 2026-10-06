---
name: hillclimb
description: "Improve one metric through bounded measured attempts."
---

# Hillclimb

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
