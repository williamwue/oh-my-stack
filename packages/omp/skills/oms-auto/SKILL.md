---
name: oms-auto
description: "Route an opted-in repository engineering task to OMS; honor explicit Skills and skip ordinary chat, translation, and tool help."
---

# OMS Auto

## Automatic routing availability

Automatic routing is not configured on this target. For oms-auto or a
routing-only setup request, return control to the host without automatic
execution. Use the explicit poteto-mode entry for engineering work.
For ordinary model setup, continue with the procedure below.

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
