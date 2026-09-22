---
name: autonomous-run
description: "Drive one bounded engineering task through evidence-based iterations to a fixed predicate without stopping for routine intermediate prompts."
---

# Autonomous Run

Use this workflow for one task the user explicitly wants driven without routine
intermediate prompting. It does not authorize publishing, merging, spending,
production changes, or a wider program of work.

## Contract before iteration one

Record:

- one immutable, checkable exit predicate;
- the exact measurement command or provider;
- an iteration, time, or cost budget;
- authorized mutation and external-action boundaries;
- stop conditions: predicate met, budget exhausted, stale or conflicting state,
  an irreversible or preference decision, unavailable required capability, or a
  genuine dead end.

Never weaken the predicate, silently extend the budget, or reinterpret a stop
condition as success.

## Choose execution or wake

Run ready local work now. When progress depends on a future external event,
select a host-native event wake or scheduled heartbeat and persist enough state
for a cold start. Size a heartbeat to when another observation is useful, not
to the shortest possible interval. If no verified wake mechanism exists, use a
durable pause checkpoint and stop; never simulate wake with an unbounded sleep
or busy-poll loop.

Before arming a wake, record the frozen predicate and provider revision, the
checkpoint location, next useful observation time, maximum wake count or
deadline, and the exact authority available to a later cold start. Store the
runtime-issued wake identifier after creation. A wake run must validate those
anchors and confirm that the checkpoint is still waiting before it measures or
mutates the provider. It then increments the durable wake count once and
re-measures instead of trusting an earlier status report. A recurring schedule
must leave enough time for the active run to disarm it before another occurrence
can queue; deletion does not cancel a run already queued. Stale queued runs exit
without measuring. Disarm the wake immediately when the predicate or another
stop condition is reached. If disarming cannot be verified, report the
still-active wake as an incomplete cleanup rather than claiming completion.

## Iteration

1. Measure the predicate and freeze the current evidence.
2. Select the smallest change that evidence justifies. Route a discovered
   bounded defect through its owning workflow without losing the main predicate.
3. Make and verify that change. Keep and commit it only when the predicate
   advances. Revert only the run's own unsuccessful changes when it does not.
4. Append one decision-log checkpoint naming the iteration, change or discard,
   evidence, and predicate movement.
5. Re-measure. Stop immediately when the predicate is met. Otherwise continue
   within the recorded budget or pivot when evidence disproves the approach.

A plateau is not success. Repeated evidence for the same blocker can establish a
dead end, but it must be reported rather than spun on or hidden behind retries.
Historical instructions and checkpoints never grant new external authority.

## Output

Report the fixed predicate and budget, wake strategy, iterations, kept commits,
discarded attempts, decision-log location, exact final measurement, stop reason,
and any remaining human decision.
