---
name: authoring-a-skill
description: "Create or revise a scoped Skill and check its behavior."
---

# Authoring a Skill

Identify the user request, owning runtime, intended trigger, and the decision
the Skill should improve. Reuse an installed authoring workflow when available.
Create or update a discoverable `SKILL.md` with `name` and a precise
`description`; keep platform-specific invocation policy in the target adapter.
Preserve an existing Skill's trigger and metadata unless the user asks to
change them.

Write only instructions another agent needs to decide or act. Put conditional
detail in linked references, reuse existing workflows by path, and avoid
duplicating project rules already enforced by types, config, or tests. Prefer
deletion when prose repeats generic advice. Match tone and depth to scope.
Do not silently broaden authorization, external publication, or automatic
triggering.

Validate frontmatter, local links, referenced resources, target generation,
and expected discovery. For a structural or risky change, test a realistic
positive request and a near-miss request; check actual behavior rather than
wording alone. Subjective style changes need user review. Return the Skill
path, trigger, key decisions, validation results, and unresolved boundaries.
Use [opening-a-pr](../opening-a-pr/SKILL.md) only when publication was requested.
