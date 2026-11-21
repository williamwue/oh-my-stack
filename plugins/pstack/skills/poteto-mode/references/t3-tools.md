# T3 Code mapping

Read this when the session exposes T3 Code's orchestration tools (`delegate_task`, `orchestrator_capabilities`, `task_status`). On T3 it replaces the backend's dispatch mapping (Claude Code's `Agent`, [Codex's](codex-tools.md) `spawn_agent`, [OpenCode's](opencode-tools.md) task tool) for every subagent a pstack skill starts, so a panel can mix Claude, GPT, Gemini, and Grok. The backend's mapping still covers every other action. The host's injected instructions and tool schemas govern links, browser, device, and secret input, so they are not repeated here. Workflow steps, review rules, and failure handling stay as the skills write them.

## Model sheet

The T3 model sheet is `~/.config/t3-pstack/models.md` (`$XDG_CONFIG_HOME/t3-pstack/models.md` when that is set), one per machine, and `/setup-pstack` on T3 writes it ([T3 model configuration](../../setup-pstack/references/t3.md)). When it is missing, read `t3-pstack-models.md` in the host's config directory (`$CLAUDE_CONFIG_DIR` or `~/.claude` on Claude Code, `$CODEX_HOME` or `~/.codex` on Codex). The native `pstack-models.md` sheet does not apply on T3: its values name a backend's own model slugs.

An entry is `<providerInstanceId>/<modelId>` plus `<optionId>=<value>` pairs, and it maps onto `delegate_task`'s `target`, with the provider instance as `providerInstanceId`, the model as `model`, and the pairs as `options`. It splits at its first `/`, so a model ID with its own `/`, such as OpenCode's `<provider>/<model>`, is written whole after it. Option IDs differ per provider, so take them from `orchestrator_capabilities`. `inherit-parent` or `auto` omits `target`. A role with no line runs on its default below. If the sheet has no `# defaults: 3` line, an older setup wrote it. Keep honoring its lines, and tell the user once per session to rerun `/setup-pstack`.

## Role defaults

Stamped from `plugins/pstack/models.json`'s `t3` section (edit there, rerun `tools/generate.mjs`). A role line in the T3 model sheet overrides each one.

- feature, refactoring: `claudeAgent/claude-opus-5-5 effort=xhigh`
- bug-fix: `claudeAgent/claude-opus-5-5 effort=xhigh`
- perf-issue: `claudeAgent/claude-opus-5-5 effort=xhigh`
- hillclimb: `claudeAgent/claude-opus-5-5 effort=xhigh`
- judgment and prose: `claudeAgent/claude-opus-5-5 effort=xhigh`
- strongest judgment: `claudeAgent/claude-fable-5-2 effort=high`
- arena runners: `claudeAgent/claude-fable-5-2 effort=high`, `claudeAgent/claude-opus-5-5 effort=high`, `antigravity/gemini-4-neon thought_level=xhigh`
- arena cross-judge pool: `claudeAgent/claude-opus-5-5 effort=high`, `antigravity/gemini-4-neon thought_level=xhigh`
- swarm workers: `claudeAgent/claude-opus-5-5 effort=high`
- interrogate reviewers: `claudeAgent/claude-fable-5-2 effort=high`, `claudeAgent/claude-opus-5-5 effort=high`, `antigravity/gemini-4-neon thought_level=xhigh`
- thermos reviewers: `claudeAgent/claude-fable-5-2 effort=high`, `claudeAgent/claude-opus-5-5 effort=high`, `antigravity/gemini-4-neon thought_level=xhigh`
- no-comments reviewer: `claudeAgent/claude-opus-5-5 effort=xhigh`

## Subagents on T3

These rules take the place of poteto-mode's Subagents section on T3. Where a skill names a role, a model slug, or an `Agent` field, read it through this section.

**Defaults for every `delegate_task` call.** `mode: "async"`, full tool access (a read-only child gets "inspect only, change no file" in its brief), file pointers not inlined context, and an explicit `target` per role from the sheet or [Role defaults](#role-defaults). Each code playbook reads its own role (`feature, refactoring`, `bug-fix`, `perf-issue`, or `hillclimb`), prose and judgment read `judgment and prose`, and trivial mechanical edits read `swarm workers`. Diverse review and design panels run one child per entry of the panel role.

**Fable 5.2 is an exception.** It runs outside a panel only when the user named it for this task or two Opus 5.5 xhigh runs of the same brief failed its check. Say which. Difficulty alone never qualifies, so `strongest judgment` stays on its entry only under those conditions and otherwise runs on `judgment and prose`.

**Match the model to the job.** Start from the role's line or default, keep its family, and set the level the job needs with the entry's reasoning option (`effort` on Claude, `reasoningEffort` on Codex and Grok, `thought_level` on Antigravity). The sheet's `# budget` line sets each role's starting level. Panel seats keep their listed level. Raise any other role one step, up to xhigh, for the hardest or subtlest work, lower it one step for judgment, and two or more steps for routine work. No role runs above xhigh. Opus 5.5 runs at standard speed, so leave out `fastMode`, which on T3 is a priced fast mode. Verification always runs on the `swarm workers` entry. A Gemini seat runs at an `xhigh` reasoning level unless its line names another level. If `delegate_task` rejects an entry, never pass it again. Fall back to the role's line or default, then the calling skill's fallback, then another target of the same family from `orchestrator_capabilities`, then omit `target`. Say so.

**Dispatch.** Every subagent is a `delegate_task` call from the chat that runs the playbook, same model family included, so every child shows up in T3. When you are a `delegate_task` child, you are a leaf. Do the work yourself, and start no subagent unless your brief names one. Give each call its own `clientRequestId`, stable across retries of that call, and keep each returned `taskId`. A child's completion wakes this thread, so end the turn instead of polling, and call `task_status` only when a result is needed mid-turn. A child gets only its brief, never your context, so pass absolute paths.

**Briefs and personas.** The first line of every brief is `Read <path>/worker.md before anything else.`, with `<path>` the absolute path of poteto-mode's folder. A child has no subagent types, so a persona is a brief that names files to read in full. A `poteto-agent` brief names poteto-mode's `SKILL.md` by absolute path. A `comment-sicko` brief names `<path>/references/agents/comment-sicko.md`. A thermo-nuclear reviewer's brief names its rubric skill, `thermo-nuclear-review` or `thermo-nuclear-code-quality-review`, by the absolute path of its `SKILL.md`, and limits the review to the diff and file contents in the brief. A skill that names a read-only or explore agent gets a brief with no persona and `role: "research"` or `role: "review"`.

**Fresh subagents.** Give a fix round, a follow-up, a retry, or the next queue item to a fresh `delegate_task` with the original brief, every later directive, and the prior agent's report and branch. Send a follow-up to an existing child (`t3_thread_send` to its `childThreadId`) only when the work needs state that lives in it and is costly to move: its checkout, its uncommitted changes, or a process it still runs. Stop an abandoned child whose writes could overlap its replacement's with `task_cancel`, which also stops the tasks it delegated, and read `task_status` until the task is terminal with no `hasPendingChildRuns`. Autopilot-full's audit still replaces a stuck agent at once, per that playbook. A claim about the working tree that `git status` contradicts means a child is still running.

**Checkouts.** A child starts in your checkout, which suits one writer while you write nothing. A writer that runs beside other writers or your own edits gets `isolation: "worktree"`, and T3 gives it a new worktree and branch from your thread's checkout at its `HEAD` commit. Commit what it builds on first, because uncommitted edits stay behind. A child that must start from another commit, such as a PR head or fresh trunk, gets `isolation: "worktree"` even when it only reads. Its brief names that commit or ref, and before anything else the child runs `git fetch` and moves its own branch there with `git reset --hard`. T3 can rename that branch during the run, so the brief tells the child to end its reply with the output of `pwd`, `git branch --show-current`, and `git rev-parse HEAD`. After review, bring its commits onto your branch with `git merge <branch>`. A PR opens only from a T3 thread's branch, yours or that of a child that owns the PR. In a repo with no commit yet, `delegate_task` refuses the worktree with `Unable to resolve the parent checkout commit`, so commit first. When this thread's project is not a git checkout, when your work lives in a checkout other than the one `t3_worktree_status` names, or when you copy uncommitted changes into the child's worktree, create that worktree with `git worktree add` from `HEAD` instead, and remove it and its branch after the result. A child sent into a worktree it does not own keeps `isolation: "shared"`. Its brief names that absolute path as the only place it writes, and tells it to run every command there (`workdir` on Codex) and to edit by absolute path. Record your own `git status --porcelain` before you dispatch a writer to another checkout, and check after the result that it is unchanged.

**Families and independent review.** A model's family is the first segment of its ID's last `/` part, such as `claude`, `gpt`, or `gemini`, whatever provider instance serves it, except that a Fable model is its own family. Your own family is the one in `orchestrator_capabilities`' `inheritedModel`. `orchestrator_capabilities` lists a short set of models per provider, and its `search` finds the others. A reviewer child that fails or is interrupted gets a fresh `delegate_task` in its place. A required review with no reviewer from another family stays `BLOCKED: independent review`, as poteto-mode's review-gate rule says.

**Dispatch ledger.** End every reply that ran a playbook with one line per delegated step, naming the role and the `providerInstanceId/model` it ran on, or `in-thread: <reason>`.

## Tool actions

| pstack action | T3 binding |
| --- | --- |
| `Agent` / `spawn_agent` / task tool | `delegate_task` per [Subagents on T3](#subagents-on-t3) |
| `run_in_background: true` | `mode: "async"` |
| `model` and effort on a spawn | `target` with the entry's provider, model, and options |
| Separate checkout for a child | `isolation: "worktree"`, or `git worktree add` where [Checkouts](#subagents-on-t3) says so |
| Wait for, stop, or message a child | completion wakes the thread; `task_status`, `task_cancel`, `t3_thread_send` |
| `/loop`, a heartbeat, or a recurring audit | `schedule_task` bound to this thread with a `title` naming the run; `delete_scheduled_task` when it ends |
| Wait for another account's PR review | `watch_pull_request`, then end the turn; `unwatch_pull_request` when babysitting stops. A child never watches, it reports the wait to its parent |
| Read a transcript or past chat | `t3_thread_list`, `t3_thread_search`, `t3_thread_read` within this project; this thread's ID from `t3_thread_configure` with no `threadId` |
| A chart or diagram for the user | `html_preview`, then `html_render`; a video embeds as a Markdown image of its absolute path |
| Check a PR this thread opened | `list_thread_pull_requests` |

## Per-skill notes

| Skill | On T3 |
| --- | --- |
| `arena` | Runners come from `arena runners`, one child each. Each writing candidate gets `isolation: "worktree"`, and its brief names its own worktree as its output location and its reply names the path. The judge comes from `arena cross-judge pool` in list order, the first entry from a vendor other than the parent's, briefed to inspect only. Fable counts as Claude for that check. If `orchestrator_capabilities` names no `inheritedModel`, use the first real target and say the vendor check did not run. |
| `interrogate` | Adversaries come from `interrogate reviewers`, each a `delegate_task` child with `role: "review"` and no persona. |
| `swarm` | Workers run on `swarm workers`, spawned in one response. A worker that writes gets `isolation: "worktree"`, and a worker that must start from another branch starts from its head commit per Checkouts. |
| `thermos` | Two `role: "review"` children on the first two model families of `thermos reviewers`, each briefed with its rubric skill per Briefs and personas. |
| `no-comments` | One `role: "review"` child on `no-comments reviewer`, briefed with the `comment-sicko` persona per Briefs and personas, with no worktree, because a worktree lacks the scope's uncommitted changes. |
| `how`, `why`, `reflect` | Research children take `role: "research"` and omit `target` unless a role names one. `reflect` reads this thread with `t3_thread_read` (`view: "activity"`, `afterPosition: -1`, then each `nextPosition`). |
| `recall` | Chat history is this project's T3 threads, ordered by `updatedAt`, cited by thread ID. Shared-record investigators are `delegate_task` children with full tool access. |
| `show-me-your-work`, `session-pickup`, `eval` | Read the run's own thread and each child's `childThreadId` with `t3_thread_read`. Never read another project's threads. |
| `ketchup` | Check each child with `task_status` and this thread's PRs with `list_thread_pull_requests`. |
| Autopilot-full, Shipping | Each owner or verifier is a `delegate_task` child with `isolation: "worktree"` from the commit it serves. An owner's brief names this thread's ID so it reports with `t3_thread_send`, and says it is not a leaf. Verifiers round-robin over `interrogate reviewers` so the lanes span families. The decision trail lives under `${XDG_STATE_HOME:-~/.local/state}/oms/`. |
| Opening a PR | Before you commit, merge, or deploy from a worktree, `task_cancel` every live child that holds it and confirm each stop with `task_status`. |

Adapted from [t3-pstack](https://github.com/chhoumann/t3-pstack) by Christian Bager Bach Houmann, under the [MIT license](licenses/LICENSE-t3-pstack).
