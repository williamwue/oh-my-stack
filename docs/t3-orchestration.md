# T3 support

The standard Codex, Claude Code and Pi packages include the centralized
[T3 mapping](../src/adapters/t3-tools.md). Session context and poteto-mode point
to it only when T3 tools are present. No detached candidate build is required.
The mapping translates tools, model options, worktree dispatch, terminal return
and cancellation. It does not replace upstream stages, roles or model policies.
A requested dispatch/cancel is not evidence of completion. Live checks and
unverified boundaries are reported separately.
