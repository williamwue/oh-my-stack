---
name: feature
description: "Add or intentionally change behavior through an evidence-backed design, bounded implementation, and matching-surface verification."
disable-model-invocation: true
---

# Feature

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
   isolated workspace when available. Use the configured `code.delegates` route
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
