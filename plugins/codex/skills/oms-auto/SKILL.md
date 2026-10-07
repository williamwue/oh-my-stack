---
name: oms-auto
description: "Route opted-in repository engineering tasks; skip chat, translation, and tool help."
---

# OMS Auto

## Codex automatic routing binding

Run `node ../../scripts/routing.mjs status` from the user's project, resolving
the script path relative to this installed Skill, before automatic routing.
Use the returned `enabled` flag; errors mean automatic routing is unavailable.
The nearest project switch overrides the user switch; absence defaults to manual.
For a routing setup request, preview `node ../../scripts/routing.mjs set
--scope user|project --mode auto|manual`, then use the same command with
`--apply` only when applying that switch is authorized. Replace the choice
placeholders with the requested values. Report the returned effective mode
and any project override. Routing setup does not require model setup.
The bundled SessionStart hook adds a short routing hint only in auto mode.
Native hook trust and observed hook execution are separate from configuration.
Read [the routing guide](../../docs/automatic-routing.md) for exact scope paths
and hook verification. Do not modify native hook trust automatically.

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

Prefer the existing simple path when the affected behavior and check are local.
Escalate exploration or design when evidence reveals unknown causes, changed
interfaces, or independent subsystem boundaries. Explicit independent-review
requests retain the selected workflow's complete review contract. Verification
of the actual result is required at every size; fewer agents never means less
evidence. Do not lower configured model effort or shrink an explicitly requested
panel as a consequence of automatic routing.

Name the selected workflow in one short sentence when it helps the user, then
execute within scope. Do not expose an internal routing analysis or ask the
user to choose a workflow that the request already determines.
