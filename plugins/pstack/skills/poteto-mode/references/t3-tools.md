# T3 Code mapping

Read this only when the session exposes T3 Code tools. The host's current
instructions and tool schemas govern dispatch, lifecycle, permissions, and UI
operations. This mapping does not replace them or change pstack's workflows,
role defaults, review rules, or failure handling.

## Role overrides

Before role-based dispatch, load `.agents/pstack-models.t3.md` at the repository
root, or the session's starting directory outside Git. If absent, load
`~/.t3/pstack-models.md`. A project sheet replaces the user sheet as a whole.
These T3-only rows override the backend's effective choices for matching roles.
Missing roles retain the backend's existing choices. With neither sheet, keep
the upstream behavior. Do not merge a shadowed user sheet into a project sheet.
See [T3 model configuration](../../setup-pstack/references/t3.md) for the format
and validation, including aliases, panels, and `session` effort.

Resolve `<providerInstanceId>/<full-model-id> @<effort>` against the current
host catalog. Pass the provider and full model separately in the host target.
Pass effort using that model's advertised option ID, such as `reasoningEffort`
for Codex or `effort` for Claude. A cross-provider or explicitly configured
model/effort uses the host's `delegate_task` path. Do not feed a Codex target to
Claude's native Agent enum, or silently substitute unavailable targets.

Give each delegate the active T3 sheet's absolute path and tell it that this
sheet governs the same project in its checkout. This keeps a worktree from
losing an uncommitted project sheet or selecting another user sheet. Also pass
the absolute installed poteto-mode path and the task's scope and acceptance.
This context does not grant permission for further delegation.

## Tool actions

| pstack action | T3 binding |
| --- | --- |
| Dispatch an Agent/Task or role worker | Follow the host's native-agent versus `delegate_task` selection. Supply the task scope, acceptance criteria, and absolute installed poteto-mode path; a T3 delegate receives its brief, not this conversation. |
| Apply a role's model or effort | Resolve the role's choice against the host's capabilities and option names. `session` means the active session setting, not the model catalog's default. |
| Give a delegate a separate checkout | Use `delegate_task` with `isolation: "worktree"`; the host prepares and binds the checkout. |
| Wait, resume, or cancel delegated work | Use the chosen dispatch tool's own identifiers and obey its returned `next`, even when an upstream workflow names another wait tool. |
| Follow a PR until checks or reviews change | Use the host's PR watch mechanism in place of an upstream CLI polling loop. |

Use the backend's upstream mapping for remaining actions. Browser, device,
thread-link, PR-link, and secret-input rules come from the host; do not maintain
another copy here.

T3 adaptation copyright 2026 Oh My Stack contributors, under the
[MIT license](licenses/LICENSE-oms).
