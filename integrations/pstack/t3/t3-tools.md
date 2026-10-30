# T3 Code mapping

Use this mapping only when the session exposes T3 Code tools. Keep the installed
pstack-claude workflow, model defaults, review rules and failure handling.
Resolve the current tool schemas before dispatch; tool availability is not proof
that a model ran.

For a same-provider child that inherits settings, needs no separate checkout and
finishes this turn, use the native agent tool and wait for its result. Claude
Agent calls use `run_in_background:false`. Codex uses `spawn_agent`, then waits.
For another provider, user-specified settings, background execution or a separate
checkout, use `delegate_task`. A user request naming `delegate_task` also uses it.
Do not implement another scheduler or role router.

Before the first delegate, call `orchestrator_capabilities` once per thread.
Use its provider/model identifiers and pass settings in `target.options`.
An unavailable provider or model is a reported blocker; never silently substitute.
When a delegate needs a separate checkout, set `isolation:"worktree"`; never
create that checkout in shell commands or in the task prompt. Each task includes scope, goal, owned files,
acceptance commands and the absolute installed poteto-mode path.

A native spawn or delegate request means requested, not completed. Preserve the
returned task ID and follow `next`. If completion will wake the thread, end the
turn instead of polling, sleeping or creating a watcher. A terminal result must
include actual output and checks; a catalog entry alone is no execution evidence.
Use a new `delegate_task` for each independent review or re-check, never a thread
message. Handle a pending question through the returned pending-request contract.

Cancel abandoned delegates with `task_cancel` and their task ID. Report requested
until the returned state or completion event confirms cancellation. Never call
`t3_thread_interrupt` on a delegate's child thread. A failed or ambiguous cancel
leaves the worktree held; do not reuse it. Native agents use their native cancel
mechanism and likewise require confirmation before reusing their files.

`create_threads` and `t3_thread_launch` create top-level threads only when the user
asks for a new thread. They are not subagent mappings. In replies, use the exact
returned thread link. Children return findings to their parent; they never watch
PRs. Link any PR created or pushed with `link_pull_request` as the next tool call.
