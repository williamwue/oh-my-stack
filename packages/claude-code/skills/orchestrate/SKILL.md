---
name: orchestrate
description: "Coordinate a standing multi-session engineering program through durable briefs, bounded rolling work, independent verification, and a continuously safe integration frontier."
disable-model-invocation: true
---

# Orchestrate

Use this workflow only for a program that outlives one worker or one bounded
session: multiple dependent units, sustained delegation, durable handoff, and
repeated integration. Route a single checkable task to `autonomous-run`, even
when that task is large.

The coordinator owns the program contract, briefs, durable state, queue drains,
integration decisions, and final claim. It does not implement program units.
If independent worker sessions are unavailable, persist the framed program and
exact first briefs, then stop instead of performing the units in the coordinator.

## Frame the program

Before any worker starts, record:

- one countable done predicate and its measurement;
- units, dependency edges, ownership boundaries, and integration order;
- time, concurrency, retry, and external-action budgets;
- authorized repositories, branches, provider mutations, and forbidden paths;
- verification levels required by unit class;
- stop conditions and the point when new work stops so verified work can land.

Use a durable program identifier and generation. A changed decomposition,
authority boundary, or integration base increments the generation; work from an
older generation must be reconciled before acceptance.

## Keep one-writer durable state

Maintain a store outside worker-owned implementation paths with:

- standing orders copied into every new or resumed assignment;
- one row per unit with generation, dependencies, owner, state, branch, head,
  brief, verification, retry count, and terminal disposition;
- an append-only inbox of completion pointers;
- a revision-bound verification ledger;
- a computed integration frontier;
- decisions, human gates, and a derived status view.

Every state artifact has one writer. Owners publish facts; the coordinator
aggregates them at drain time. Never infer liveness from transcript age or treat
a child summary as current provider state.

## Pilot before scale

Send one representative unit through the full path: complete brief, isolated
worker, result freeze, independent verification when required, frontier update,
integration, and predicate measurement. Use the pilot to correct unit size,
acceptance checks, standing orders, and retry policy before widening the rolling
window. A cheap repeated unit may verify inline, but the pilot may not be skipped.

Each brief names the goal, exclusive write scope, immutable context and upstream
receipts, acceptance criteria, exact verification, timebox, forbidden actions,
report shape, and full standing orders. Missing dependency context is a blocked
brief, not permission for a worker to guess.

## Run a bounded rolling window

Start only ready units whose dependencies and ownership are frozen. Give each
writer an isolated branch or workspace and prevent sibling-to-sibling mutation
or hidden coordination. Refill capacity as completed results are drained rather
than waiting for a fixed batch. Stop refilling when the landing reserve or another
recorded stop condition is reached.

When durable state must bind a runtime-issued worker identity before mutation,
start the worker in a no-write standby turn carrying the complete brief, persist
the returned native handle, then send the execution directive to that same
worker. If same-worker continuation is unavailable, stop before execution rather
than inventing an identity or accepting an unattributed result.

Completions are queue events. At each drain boundary, freeze arrivals, classify
every pointer, update unit rows and the verification ledger, recompute ready work
and the integration frontier, then start the next ready units. Arrivals during a
drain wait for the next drain. Every started worker ends as accepted, failed,
abandoned, or reconciled stale work; silently redoing missing work is forbidden.

## Verify and integrate continuously

Bind every verdict to the unit generation, branch, head revision, acceptance
contract, commands, and observed outcomes. Use an independent verifier for
judgment-heavy or high-impact work. A changed head invalidates its verdict.

Integrate from the lowest safe frontier while other units continue. Only the
coordinator or one named integration owner may mutate a frontier. Refresh the
provider and re-measure dependencies after each mutation. Never pre-land above a
gap, rewrite topology to hide a failed unit, or accept work that exists only in
an ephemeral worker environment.

## Recover without losing authority

Retry by recorded failure class within the unit retry budget. A late result must
reconcile its generation, dependencies, head, and frontier before reuse. When a
systemic defect would multiply across new units, stop refilling, preserve active
results, correct the program contract, and pilot the corrected shape.

A restart reads standing orders and durable rows, refreshes the real provider,
reconciles active work through native task handles or published branches, and
continues from the first ready unit. Historical state never expands mutation,
publication, spending, or merge authority.

## Close

Drain the final inbox and reconcile every started unit to a terminal state.
Confirm the done predicate against the real integrated artifact and verify that
every accepted head has a current ledger verdict. Preserve the store as the
postmortem.

Report the predicate and count, generation, unit-state counts, tracks, accepted
heads, current frontier, verification summary, retries and abandoned units,
open human gates, store location, exact final measurement, and stop reason.
