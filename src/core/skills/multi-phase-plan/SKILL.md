---
name: multi-phase-plan
description: Write a reviewable dependency plan with verifiable units, owner boundaries, live checks, and explicit execution gates.
---

# Multi-phase plan

The plan is the deliverable. Use for a change with multiple dependent units or
pull requests; a small obvious edit does not need this ceremony. Inspect the
repository and resolve technical unknowns with bounded prototypes when
authorized. Ask only for choices that evidence cannot settle.

Write one section per independently verifiable unit: outcome, dependencies,
owned files or interfaces, build action, user-observable result, unit check,
matching-surface live check, and relevant performance rule. State the actual
baseline for a comparative metric. If the old surface lacks a feature, use an
absolute budget for added work instead of an invalid old/new ratio. A missing
control harness is a prerequisite or named risk, never a fictional test lane.

Choose the later execution owner explicitly: a bounded stack, separately
landed queue, or standing program. State who may integrate, merge, and publish.
Identify concurrent work only across non-overlapping ownership and capture
its base revisions. Use a checklist whose boxes require concrete evidence such
as a file, result, screenshot, or commit. Include prototypes, alternatives,
risks, and reading links. Validate paths and the dependency graph; remove
unresolved placeholders. [Technical-writing](../technical-writing/SKILL.md)
can tighten the prose.

Return the plan path or complete in-chat plan, unit order, dependencies,
verification rules, unresolved product choices, and explicit start condition.
Do not implement the plan merely because its design is finished.
