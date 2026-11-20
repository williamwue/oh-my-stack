---
name: oms-swarm
description: Run a partitioned coverage swarm in T3 Code, Codex CLI, Claude Code or OpenCode 2, collecting evidence from real worker terminal messages.
---

# OMS coverage swarm

Declare the completion predicate, slices, expected evidence and independent writable outputs before launch. Resolve the swarm workers model and effort from the active role configuration. Give each worker the task, scope, input and verification method, plus its return contract: one bare JSON object with status PASS, ISSUES or BLOCKED, its observed value, and each sha or method field named by the brief.

Dispatch all initial slices before waiting. On T3 use delegate_task with an explicit configured target, retain the task ID and follow its next instruction. On native Codex use spawn_agent, setting fork_turns to none when specifying model or effort, and wait for terminal messages. Keep each slice's IDs and final texts together across turns.

In standalone Claude Code use parallel Agent calls with the configured subagent type and model. For a background Agent, pair its task_id with the final worker text in the completed task_notification. For a foreground Agent, use the agent ID or unique tool-use ID and the final worker text in its result.

In standalone OpenCode 2 use the advertised subagent tool with an available agent type. Use the role's configured model and variant when supported, or inherit the session model when the role calls for inheritance. Keep the returned child session ID. Extract the final worker text from inside the completed subagent result. On either host, wait for terminal text before collecting and start a fresh child for a retry.

For each newly completed slice run the bundled collector with Node. Resolve scripts/collect.mjs relative to this SKILL.md. Feed JSON via stdin or a UTF-8 file passed as the sole argument. Supply required from the original brief (sha and/or method, or an empty object), and attempts in dispatch order. Each receipt has id (the host task ID) and text (the worker's exact final text, or null for a terminal dropout). Keep absent fields absent. Do not use dispatch metadata or a parent's paraphrase as worker evidence.

Act on the collector's stdout:

- retry: dispatch a fresh worker for that slice immediately, on the same model, using the original assignment and requesting the missing fields. Reuse any already-started second attempt for this slice on resume. On T3 use a stable second-attempt clientRequestId. Feed both receipts to the collector after completion.
- gap: record the slice as uncovered and stop dispatching it.
- PASS or ISSUES: preserve the result and independently verify the reported value or artifact. Evidence metadata alone does not prove the result.

A collector input error is a coordinator error; correct the envelope from the host receipts before proceeding. Summarize results, findings, retry counts and gaps across all assigned slices.
