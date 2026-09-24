---
name: investigation
description: "Answer an engineering question from evidence without changing code."
---

# Investigation

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
