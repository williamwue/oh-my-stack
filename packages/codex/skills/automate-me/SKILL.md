---
name: automate-me
description: "Capture a user's recurring work conventions in a personal Skill."
---

# Automate me

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

Use when the user wants agents to follow their durable working conventions.
For one task-specific workflow, use [authoring-a-skill](../authoring-a-skill/SKILL.md)
directly. Resolve an existing mode Skill before drafting: an update preserves
uncontradicted rules and considers history since its last edit. A new Skill
needs the user's chosen name or a simple suggested handle; do not infer a
personal identity from private records.

Inspect only authorized current-workspace history. Divide a sizeable period
into independent slices if available, and collect recurring corrections with
task citations. One isolated remark is weak evidence; contradictions stay
visible. Ask the user briefly about areas history cannot reveal, such as
autonomy, verification, format, and publication boundaries. Do not mine other
projects or personal accounts by default.

Cluster only non-default, actionable preferences. Draft the Skill using
[authoring-a-skill](../authoring-a-skill/SKILL.md). Keep its trigger narrow to
the user or chosen handle; do not make ordinary coding requests activate a
personal mode. Link to existing workflows rather than duplicating them. Use
[unslop](../unslop/SKILL.md) to cut generic prose. For an update, show which
rules were retained, revised, or removed and why.

Show the draft and its evidence for user correction before treating a subjective
mode as finished. Validate frontmatter, links, and trigger behavior. Put it in
the runtime's chosen personal or project Skill location; do not overwrite
unrelated configuration. Commit or publish only when requested. Return path,
trigger, key rules, weak or disputed findings, and the review status.
