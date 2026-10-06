---
name: worktree-cleanup
description: "Audit and reclaim explicitly scoped Git worktrees and disposable simulator state while preserving active and uncommitted work."
disable-model-invocation: true
---

# Worktree cleanup

Inventory exact paths from the repository's worktree listing, plus disk size,
branch/commit, merge or PR state, tracked/untracked/ignored changes, and active
task ownership. A classification script is advice, not deletion authority.
Cross-check pinned or running tasks and sibling worktrees those tasks spawned.
Do not infer inactivity from an old directory timestamp alone.

Classify each target: active, uncommitted, clean recoverable, or uncertain.
Never force-remove a worktree with tracked or untracked user work based on a
`safe` label. Show the exact dirty paths and request a disposition before
irreversible loss. For clean merged/abandoned paths explicitly within the
cleanup request, use the native worktree removal operation without force;
record retained branch refs. If ignored data prevents removal, inspect and
name it before deciding whether it is disposable.

Simulator clones and runtime caches are separate targets. Enumerate each one,
check whether a running task needs it, and use the provider's targeted delete
operation. Do not use broad recursive deletion against a home, workspace,
repository root, or unresolved glob. Preserve captures and evidence whose
retention is still needed.

Re-list worktrees and disk usage afterward. Report exact paths removed,
reclaimed space, remaining refs, and held targets with reasons. State whether
removed data is recoverable from a branch or backup. If task state is not
observable, stop deletion of that candidate and explain the uncertainty.
