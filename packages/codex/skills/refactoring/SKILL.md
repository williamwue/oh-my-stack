---
name: refactoring
description: "Improve code structure while verifying unchanged behavior."
---

# Refactoring

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
For this workflow's implementers use `code.feature-refactoring`.

The root owns the behavior contract. Structure may change; behavior may not.

1. Use `how` to trace the affected behavior and callers. Pin the current
   contract with a characterization test, snapshot, equivalence harness, or
   recorded real-surface result before structural edits. Type checking alone is
   not a behavior pin.
2. Name the current reader-load problem and the target shape. The target should
   remove branches, invalid states, duplication, or needless layers rather than
   add speculative abstraction.
3. Remove dead code and redundant indirection before introducing the target
   structure. For an API reshape, migrate all in-scope callers and delete the
   obsolete path in the same verified wave.
4. Assign one bounded writer or implement at the root. A delegated writer uses
   the active `code.feature-refactoring` route when configured. Use isolation when
   available; otherwise serialize writes. Keep each step behavior-preserving and
   rerun the pin after each independently meaningful slice.
5. The root reviews the diff and runs an equivalence check on the real artifact.
   If behavior changes, split it into a separately requested feature or bug fix.
6. Keep the refactor only if the final code measurably lowers reader load.
7. Do not publish or open a pull request unless the user explicitly requested it.

Return the pinned contract, structural before and after, exact equivalence
proof, reader-load reduction, reverted experiments, and verification boundary.
