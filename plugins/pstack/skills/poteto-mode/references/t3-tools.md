# T3 Code mapping

Read this only when the session exposes T3 Code tools. The host's current
instructions and tool schemas govern dispatch, lifecycle, permissions, and UI
operations. This mapping does not replace them or change pstack's workflows,
role models, review rules, or failure handling.

| pstack action | T3 binding |
| --- | --- |
| Dispatch an Agent/Task or role worker | Follow the host's native-agent versus `delegate_task` selection. Supply the task scope, acceptance criteria, and absolute installed poteto-mode path; a T3 delegate receives its brief, not this conversation. |
| Apply a role's model or effort | Resolve the role's choice against the host's capabilities and option names. `session` means the active session setting, not the model catalog's default. |
| Give a delegate a separate checkout | Use `delegate_task` with `isolation: "worktree"`; the host prepares and binds the checkout. |
| Wait, resume, or cancel delegated work | Use the chosen dispatch tool's own identifiers and the lifecycle returned by the host. |
| Follow a PR until checks or reviews change | Use the host's PR watch mechanism in place of an upstream CLI polling loop. |

Use the backend's upstream mapping for remaining actions. Browser, device,
thread-link, PR-link, and secret-input rules come from the host; do not maintain
another copy here.

T3 adaptation copyright 2026 Oh My Stack contributors, under the
[MIT license](licenses/LICENSE-oms).
