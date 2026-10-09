---
name: oms-auto
description: "Route an opted-in repository engineering task to OMS; honor explicit Skills and skip ordinary chat, translation, and tool help."
---

# OMS Auto

## Claude Code automatic routing binding

Run `node ../../scripts/routing.mjs status --runtime claude-code` from the
user's project, resolving the script path relative to this installed Skill,
before automatic routing. Use the returned `enabled` flag; errors disable routing.
The nearest Claude project switch overrides the user switch; absence is manual.
The user directory is the absolute CLAUDE_CONFIG_DIR, or ~/.claude when unset.
Claude uses .oh-my-stack/routing.claude-code.json for project overrides;
Codex's .oh-my-stack/routing.json is independent and must not be rewritten.
For a routing setup request, preview `node ../../scripts/routing.mjs
set --runtime claude-code --scope user|project --mode auto|manual`, then
use the same command with `--apply` for the authorized selection.
Report saved scope, effective mode, and project overrides separately.
Routing-only setup needs no model inventory, paid probes, or model mapping changes.
The plugin's SessionStart hook adds the oms-auto entry pointer only in auto mode.
Use the Skill tool for oh-my-stack:oms-auto when available; otherwise read its
installed file. Always recheck the switch before reading poteto-mode or a workflow.
After enabled=true, read ../poteto-mode/SKILL.md and follow its workflow routing.
When enabling, review the plugin SessionStart hook through Claude Code's /hooks
and start a fresh session. Do not bypass host hook permissions or alter trust.
Saving a switch does not prove hook execution or workflow selection.
Read [the routing guide](../../docs/automatic-routing.md) for verification.

This is an optional automatic entry, not a separate engineering workflow.
Before routing, use the generated target binding to read the effective routing
switch as a separate first command. Do not read poteto-mode or an engineering
workflow in the same command as this entry, or before the switch result. Even
when the host lists another matching OMS Skill, its listing does not bypass
this gate for an automatic request. Missing configuration means manual mode. If the switch is disabled,
invalid, or unavailable, return control to the host without loading engineering
workflows or changing configuration. Do not ask the user to enable it each turn.

An explicit Skill, a bounded child assignment, or a request to skip OMS takes
precedence. Ordinary chat, translation, and questions about how to use a tool
do not enter engineering execution. A user asking how a change could be made
has requested an explanation, not implementation.

For an opted-in repository engineering request, read
[poteto-mode](../poteto-mode/SKILL.md) and follow its shared routing rules.
The user's actual request supplies the scope and authority; automatic selection
does not authorize writes, delegation, publication, merge, deployment, or
credential access. Do not route AIHero explicit-only entries automatically.

Prefer the existing simple path when the affected behavior and check are local
and full execution was not requested. Name a simplified path and its omitted
stages before work; do not present it as complete pstack-style execution.
Escalate exploration or design when evidence reveals unknown causes, changed
interfaces, or independent subsystem boundaries. Explicit independent-review
requests retain the selected workflow's complete review contract. Verification
of the actual result is required at every size; fewer agents never means less
evidence. Do not lower configured model effort or shrink an explicitly requested
panel as a consequence of automatic routing. Nontrivial changes retain the
selected workflow's mandatory stages. Reference-matching UI work includes
visual acceptance even when another workflow owns the overall task.

Name the selected workflow in one short sentence when it helps the user, then
execute within scope. Do not expose an internal routing analysis or ask the
user to choose a workflow that the request already determines.
