# T3 Code mapping

Read this file in full when T3 Code orchestration tools (`delegate_task`, `orchestrator_capabilities`, `task_status`) are available. This is a thin adapter on top of `pstack-claude`: **follow T3 Code's own orchestration rules** and `pstack-claude`'s upstream playbooks; only the T3-specific bridges below override host defaults.

## Subagent dispatch (aligned with T3 orchestration)

1. **Read the model sheet first.** Load `~/.config/t3-pstack/models.md` (`$XDG_CONFIG_HOME/t3-pstack/models.md`, fallback `t3-pstack-models.md` in `$CODEX_HOME` or `$CLAUDE_CONFIG_DIR`). When missing or a role line is absent, use the built-in medium profile in [Models](#models) below. Never truncate skill, playbook, or reference files with `head`/`tail`.
2. **Follow T3's native vs `delegate_task` boundary.**
   - Use `delegate_task` (`mode: "async"`) whenever the role entry targets another provider, sets a model or provider option that differs from the parent session (for example `codex/gpt-6.2-sol reasoningEffort=high` from a `gpt-6.2-astra` parent), needs `isolation: "worktree"`, or runs in the background.
   - Map `<providerInstanceId>/<modelId> <optionId>=<value>` onto `target: { providerInstanceId, model, options }`. Split at the first `/` so model IDs containing `/` (such as OpenCode's `<provider>/<model>`) stay intact. Omit `target` for `inherit-parent` or `auto`.
   - Call `orchestrator_capabilities` once per thread before the first `delegate_task`.
   - When staying on the parent's provider for a synchronous in-thread subagent via native tools (`spawn_agent` / `Agent`), **always pass the role's explicit `model` and reasoning effort** — never omit `model` and silently inherit a heavier parent model (such as `gpt-6.2-astra`).
3. **Persona and leaf rules for `delegate_task` children.**
   - A `delegate_task` child receives only its `task` prompt (no parent history and no `subagent_type`). Pass absolute file paths.
   - Open the `task` brief with `Read <poteto-mode-dir>/worker.md before anything else.` For persona subagents (`poteto-agent`, `comment-sicko`, `thermo-nuclear-review-subagent`, `thermo-nuclear-code-quality-review-subagent`), follow with `Read <plugin-root>/agents/<name>.md in full and act as it says`.
   - A `delegate_task` child is a leaf: do the work directly, start no subagents unless the brief asks, and never call `watch_pull_request`.
4. **Workspace isolation and review gates.**
   - Give parallel writers `isolation: "worktree"` (commit base work first). After completion, review the diff and merge its branch back.
   - End every reply that ran a playbook with a dispatch ledger: one line per delegated step naming the role and the `providerInstanceId/model` it ran on (or `in-thread: <reason>`).

## T3 tool bridges

- **Chat history (`recall`, `reflect`, `session-pickup`, `show-me-your-work`, and the eval playbook):** use `t3_thread_list`, `t3_thread_search`, and `t3_thread_read` (`view: "activity"`) for this project's threads instead of reading `~/.claude/projects/`.
- **PRs and schedules (`babysit`, `shipping`, `autonomous-run`, `autopilot-*`):** use T3's `pull_request_*`, `watch_pull_request`, and `schedule_task` when exposed; `delegate_task` children never call `watch_pull_request`.
- **Panels (`arena`, `interrogate`, `thermos`, `swarm`):** pick targets from the corresponding role list in [Models](#models) (or `~/.config/t3-pstack/models.md`), one `delegate_task` per seat. `arena cross-judge pool` picks the first entry from a vendor other than the parent's.

## Models

Built-in medium profile generated from `plugins/pstack/models.t3.json`. A role line in `~/.config/t3-pstack/models.md` overrides each entry. Run `/setup-pstack` to customize.

<!-- Begin generated T3 roles -->
- feature, refactoring: `codex/gpt-6.2-sol reasoningEffort=high`
- bug-fix: `codex/gpt-6.2-sol reasoningEffort=high`
- perf-issue: `codex/gpt-6.2-sol reasoningEffort=high`
- hillclimb: `codex/gpt-6.2-sol reasoningEffort=high`
- judgment and prose: `codex/gpt-6.2-sol reasoningEffort=high`

arena:

- arena runners: `codex/gpt-6.2-astra reasoningEffort=medium`, `claudeAgent/claude-opus-5-5 effort=medium`, `antigravity/gemini-4-neon thought_level=high`
- arena cross-judge pool: `claudeAgent/claude-opus-5-5 effort=medium`, `antigravity/gemini-4-neon thought_level=high`

swarm:

- swarm workers: `opencode/opencode-go/deepseek-v4.1-flash variant=high`

interrogate:

- interrogate reviewers: `codex/gpt-6.2-astra reasoningEffort=medium`, `claudeAgent/claude-opus-5-5 effort=medium`, `antigravity/gemini-4-neon thought_level=high`
<!-- End generated T3 roles -->
