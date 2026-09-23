---
name: swarm
description: "Run bounded parallel coverage or races, drain all started workers, verify their evidence, and consolidate outcomes and gaps into one report."
disable-model-invocation: true
---

# Swarm

Coordinate one bounded fan-out and return one report. This is not a standing
program, background monitor, or permission to publish. Keep a checklist: frame,
fan out, aggregate, report.

## Frame

State the done predicate, required result, and allowed actions. Choose coverage
(distinct required slices), race (same brief), or mixed (races within slices).
For each race declare first pass, rank all, or best-of plus measurable selection
criteria before dispatch. Define how a PASS is verified, not just self-reported.

Set total worker count and maximum concurrency separately, with an attempt or
time budget. Every required slice must have an owner. For mixed work, define
the selection rule per slice and require all slices for overall completion.
Resolve available configured roles without inventing models or execution hosts.
Local-only dependencies remain local; do not upload workspace data to a remote
worker merely because the runtime supports it.

Give each writer its own isolated output and explicit resource ownership. Check
the starting revision and any necessary local changes. If isolation is missing,
use read-only reports or patch proposals for overlapping scopes; only serialize
writes when the requested task permits sequential work. Never run conflicting
writers on the same resource.

## Fan out and drain

Each standalone brief states goal, shared grounding, exact slice or race arm,
ownership, allowed tools/actions, verification, and a PASS / ISSUES / BLOCKED
report with evidence. When a worker verifies a change, name its exact base and
head revisions. When it measures a result, also freeze the method: sample
count, what constitutes one sample, and sample order. Require the worker to
repeat those coordinates and the method in its result. Dispatch within the
concurrency limit and track native worker handles. Do not count a launch
acknowledgment as a terminal result.

Read and drain every started worker, including losers in a first-pass race.
A verified first-pass result may select a winner early, but cannot justify
abandoning active writers. If safe cancellation is supported, request it and
confirm terminal state. Otherwise wait within budget, or report outstanding
handles and incomplete drainage without claiming completion. Never fabricate
cancellation or terminate unrelated tasks.

If parallel dispatch is unavailable, use bounded sequential workers and say so.
If delegation is unavailable, run separated root passes only for work that can
honestly be done that way. A requested genuine race or independent coverage
remains unverified; do not relabel root passes as workers.

## Aggregate and report

Inspect actual terminal artifacts and root-check critical evidence before
accepting PASS. A dropout leaves a coverage gap; assign a bounded retry or mark
that slice BLOCKED. Race winners must meet the predeclared rule; no passing arm
means no winner. A result missing required revisions or measurement method is
not a PASS: retry that worker once with the same frozen contract, then record a
gap if it still omits them. A worker with a proven defect reports ISSUES with
every defect it can substantiate, not just the first. Keep failed or
contradictory evidence visible.

Return one table of slice/arm, actual worker identity, status, evidence, and
remaining gap, followed by concise findings and the applied selection rule.
Report overall completion only when every required slice passes and all started
workers are drained. Do not paste raw worker dumps or integrate competing code
implicitly; use [arena](../arena/SKILL.md) when synthesis is the requested task.
