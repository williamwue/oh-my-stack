---
name: recall
description: Reconstruct recent work from scoped conversation history, current repository state, and available shared records.
---

# Recall

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
