---
name: feature
description: Add or intentionally change behavior through an evidence-backed design, bounded implementation, and matching-surface verification.
---

# Feature

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
   isolated workspace when available. Use the configured `code.delegates` route
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
