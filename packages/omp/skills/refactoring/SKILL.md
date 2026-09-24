---
name: refactoring
description: "Improve code structure while pinning and proving unchanged externally observable behavior."
disable-model-invocation: true
---

# Refactoring

## OMP model routing

At the start of this workflow, run `../../scripts/model-resolution.mjs`
with `--runtime omp --cwd` set to the current workspace. Read the returned
manifest: nearest project first, then the user's `~/.omp/agent/` default.
For each configured route, select its named agent through OMP's native
task-agent selector and verify that its source matches the chosen scope;
for a canonical role, use the manifest role's `agent` name (user
defaults use namespaced `ohmystack-role-*` agents).
preserve panel entry order and count. If no mapping is present, retain the
workflow's normal runtime model. Verify resolved worker model and thinking
level from OMP session/job metadata, not from the role file alone.
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
