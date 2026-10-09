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
Preserve panel entry order and count. If no mapping is present, retain the
workflow's normal runtime model. Verify resolved worker model and thinking
level from OMP session/job metadata, not from the role file alone.
When `task` returns a background job id, retain it until terminal status.
On OMP hosts exposing `proc://` (observed in 18.3.0), use `read proc://<id>`
for non-consuming status, `wait` to drain, and `write proc://<id>/kill`
to cancel an owned job with the required approval. Confirm cancellation
before replacing a worker and reject results from older generations.
Do not assume the deprecated `hub` tool exists. If safe cancellation
is unavailable, wait or report the unit incomplete; never silently
treat an unconfirmed worker as cancelled.
For this workflow's implementers use `code.feature-refactoring`.

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

## Local delivery evidence binding

Read [the delivery guide](../../docs/delivery-evidence.md) for the frozen
plan/evidence shapes and supported provenance protocol. The portable CLI is
`../../scripts/delivery-evidence.mjs` relative to this installed Skill.
Freeze before implementation, retain the lock digest, then inspect or run
explicitly selected checks against the actual final artifact. Unknown
required provenance stays unverified; local success does not certify release.

The root owns design, integration, and proof. Use the complete workflow for
nontrivial changes and explicit pstack-style or full execution. An automatically
routed narrow change with a known local boundary may use a simplified root
pass when full execution was not requested. Name that simplification and its
omitted stages before work; it cannot support a full-workflow equivalence claim.
Freeze the [delivery evidence contract](../poteto-mode/references/delivery-evidence.md)
before implementation. Run its actual local acceptance checks on the integrated
revision; missing or unverified required evidence prevents a complete-delivery
claim. A root-owned narrow change uses the separately labeled narrow contract.

1. Inspect the affected subsystem with the `how` workflow. Name the user-visible
   behavior, current boundary, and the data shape that should organize the new
   behavior.
2. In the complete workflow, use [architect](../architect/SKILL.md) for parallel
   design exploration. Preserve structurally distinct candidates, a comparison
   by a distinct judge, and the chosen design rationale. Honor the configured
   candidate panel. Use a `prototype` for an empirical fork and `interrogate`
   for a contested design.
3. Write a throughput checkpoint covering blocking gates, independent work,
   shared mutable state, and the smallest safe decomposition. Use one writer
   when ownership overlaps.
4. Establish failing or absent behavior with a test or executable reproduction
   before implementation when practical.
5. In the complete workflow, assign bounded implementation writers. When
   multiple valid implementation shapes remain, use [arena](../arena/SKILL.md)
   before accepting one; a good first candidate does not remove the comparison.
   A delegated writer gets
   exact paths, the named data shape, constraints, and success commands. Use an
   isolated workspace when available. Use the configured `code.feature-refactoring` route
   when active; otherwise inherit the runtime model. If isolation is missing,
   serialize writes and disclose it. A bounded child that cannot delegate
   implements its own unit while its parent supplies independent judgment.
   If required delegation is unavailable, disclose the fallback and leave
   complete-workflow execution unverified.
6. The root inspects the actual diff, rejects unrelated changes, and runs the
   stated checks on the matching surface. Do not accept a child summary as
   verification.
7. Pair each delegated output with a distinct independent judge of the frozen
   artifact revision before acceptance. Root inspection complements this review.
   Preserve findings and repair responses; changed artifacts require fresh
   review and verification. Reference-matching UI work includes
   [visual-parity](../visual-parity/SKILL.md) as an acceptance stage.
8. Verify and save each independently usable small unit before dependent work.
   Keep commits small and independently verifiable. Do not publish or open a
   pull request unless the user explicitly requested that external action.

Return what changed for the user, the chosen structure and tradeoffs, the
throughput checkpoint, exact verification commands and outcomes, evidence
limitations, and any open product decision.
