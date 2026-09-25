---
name: automate-me
description: "Turn a user's recurring working conventions into a concise personal mode Skill with evidence and review."
disable-model-invocation: true
---

# Automate me

## OMP model routing

At the start of this workflow, run `../../scripts/model-resolution.mjs`
with `--runtime omp --cwd` set to the current workspace. Read the returned
manifest: nearest project first, then the user's `~/.omp/agent/` default.
For each configured route, select its named agent through OMP's native
task-agent selector and verify that its source matches the chosen scope;
for a canonical role, use the manifest role's `agent` name (user
defaults use namespaced `ohmystack-role-*` agents).
Preserve panel entry order and count. If no mapping is present, retain the
workflow's normal runtime model. Verify resolved worker model and thinking
level from OMP session/job metadata, not from the role file alone.
When `task` returns a background job id, retain it until terminal status.
On OMP hosts exposing `proc://` (observed in 18.3.0), use `read proc://<id>`
for non-consuming status, `wait` to drain, and `write proc://<id>/kill`
to cancel an owned job with the required approval. Confirm cancellation
before replacing a worker and reject results from older generations.
Do not assume the deprecated `hub` tool exists. If safe cancellation
is unavailable, wait or report the unit incomplete; never silently
treat an unconfirmed worker as cancelled.

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
