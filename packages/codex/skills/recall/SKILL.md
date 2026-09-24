---
name: recall
description: "Rebuild recent work context from history and live state."
---

# Recall

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

Use for a current-state briefing across recent work. A single saved task to
resume belongs to [session-pickup](../session-pickup/SKILL.md); a personal
working-style Skill belongs to [automate-me](../automate-me/SKILL.md).

Fix topic, workspace, and time window first. Use a named window when supplied;
otherwise state a short recent range. Search only history belonging to that
workspace and the named topic. Prefer a host task-history API when available,
otherwise inspect an explicitly identified workspace transcript directory.
Use modification time rather than opaque IDs for recency. Skip unrelated,
subagent, and test conversations. If the user supplied a complete state capsule,
verify it directly without redundant history mining.

For a named feature or bug, also sweep the shared record through
[why](../why/SKILL.md) with a current-status question: source history, issues,
docs, reports, incidents, and errors actually available in this workspace.
Record inaccessible sources and empty searches. Keep direct customer reports,
team actions, code changes, deployments, and current symptoms distinct.

Verify cited branches, PRs, tickets, and runtime state live when possible.
A conversation that says a fix shipped is not proof it remains deployed.
Inspect full transcript regions when the answer depends on exact actions,
errors, or authorization. Label stale or contradictory records.

Return a brief capsule, one status line per relevant thread, up to five active
problems, and the single most useful next action. Cite task IDs and shared
records. Mark observed, historical, inferred, and unavailable state clearly.
This is a read-only briefing, not implicit authorization to resume work.
