---
name: hillclimb
description: "Follow the upstream Hillclimb playbook for its named task."
disable-model-invocation: true
---

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

Host adaptation. Read the installed package's [runtime binding](../../docs/runtime-binding.md) for delegation, tools, paths, transcript access, and control surfaces, and [model selection](../../docs/model-selection.md) for the named routes and ordered panels below. These bindings translate host calls; they add no workflow stages. Continue already authorized implementation through its checks. Advice-only requests end with advice. Publication, merge, deployment, billable requests, credential access, and user-scope configuration retain the host and project authorization gates. A workflow step naming one of these actions does not grant that authority. Source-host helpers under `../poteto-mode/scripts/` are reference-only unless the generated binding identifies supported execution for that exact helper; use the documented native helper only for the capability it supports. Report unavailable capabilities and verification separately.

### Hillclimb

**You own the metric and the experiment's integrity. Supervise and review. Delegate the attempts.** For sustained, iterative improvement of one measurable thing against a target. A one-off fix is Bug fix or Perf issue. This is the loop.

Core discipline: one change, one measurement, keep or revert. Never stack untested changes, and never claim a win from code inspection (the **prove-it-works** principle skill).

1. Ground the workload and architecture before choosing the metric. Run the **how** skill over the target, name the realistic workload dimensions that can move the result (data size, history, state, concurrency), and select a case that reproduces the user's complaint. If no case reproduces it, fix the repro instead of hillclimbing. Then fix one metric, the direction that counts as better, and a checkable stop predicate that pairs a target with a floor on attempts so a lucky early win can't end the run (the example "at least 50% better than baseline and at least 10 iterations" is this shape). Use the user's numbers when given, otherwise agree them.
2. Build the measurement harness, prove its sensitivity, then freeze it (the **build-the-lever** principle skill). Run contrasting realistic workloads and confirm the target case reproduces the symptom while easier cases separate as expected. If the harness cannot distinguish them, revise the workload or metric. Vet the harness with the **benchmark-checklist** skill before you freeze it, and make it print its error count and a count of the work done. Once frozen, one repeatable command emits the metric, sampled enough to clear the noise (median of N, not a single run). Record the baseline metric and a green run of the regression gate (the tests that must keep passing) before any change.
3. Open the decision log via the **show-me-your-work** skill. A `decision.tsv`, one row per attempt: id, hypothesis, change, before, after, delta, tests, verdict (kept or reverted), note. Read it before each attempt. Keep it out of the tree (gitignored).
4. Ground each hypothesis in the architecture model from step 1, so it names a specific mechanism ("defer X off the boot path because it blocks first paint"), not "try memoizing something". For a perf metric, order hypotheses by the performance mantras in step 2 of the Perf issue playbook (`playbooks/perf-issue.md`). Borrow only their order, not that step's stop rule.
5. Loop, one hypothesis per iteration:
   - Hand the change to a subagent using your configured hillclimb model (default `observed code-model choice`) with a tight scope. Supervise and review the diff rather than typing it (the **guard-the-context-window** principle skill). When several independent hypotheses are live, fan them to parallel subagents, each in its own worktree (the **separate-before-serializing-shared-state** principle skill).
   - Measure before and after with the frozen harness, and run the regression gate.
   - Accept only when the metric moves past noise and the gate stays green. Otherwise revert the change in full. A tweak that "might help" is not kept.
   - One commit per accepted fix, staging only the files you changed (`git add <files>`, never `-A`). Log the row either way, kept or reverted.
   Each iteration ends in a check before the next begins (the **sequence-verifiable-units** principle skill). If the run is unattended, borrow only the wake mechanism from the Autonomous run playbook (`playbooks/autonomous-run.md`), not its stop rule.
6. Push past the first plateau. On a stall, several rejects in a row, pivot category, combine near-misses, re-read the source, or try something more radical before concluding the hill is climbed. Correctness and simplicity outrank the number. Revert a win that breaks behavior, and keep a simplification that holds the number (the **laziness-protocol** principle skill).
7. Stop when the predicate is met, or when the remaining ideas are marginal and not worth their cost. Don't relax the predicate to meet it, and don't quit while cheap untried hypotheses remain. If you are stuck, surface it instead of spinning.
8. Run **Opening a PR** with the accepted commits stacked in the order they landed.

**Reply:** the metric and target, baseline to final with the percent delta, iterations run (kept vs reverted), each accepted fix on one line, the `decision.tsv` path, and the best idea you would try next if pushed further.
