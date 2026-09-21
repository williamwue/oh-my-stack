---
name: investigation
description: "Answer a read-only engineering question from repository evidence without changing implementation files."
---

# Investigation

Use this workflow for code behavior, ownership, layering, feasibility, and
engineering tradeoff questions whose requested outcome is an answer rather
than a change.

1. Freeze the question, inspected scope, and current revision when available.
2. Run the `how` workflow over the affected area. For an alternatives decision,
   gather evidence for each viable option under the same constraints.
3. Verify important claims against current files, executable behavior, or both.
4. State facts, inferences, and unknowns separately. Do not infer historical
   motivation without evidence.
5. Keep the workspace unchanged. If investigation reveals a requested change,
   stop at the diagnosis and route a later implementation request separately.
6. Apply `technical-writing` and `unslop` when producing a durable document.

Return the `how` output for explanatory questions. For a decision, return the
decision criteria, evidence, tradeoffs, recommendation, and verification
boundary. State that the investigation was read-only.
