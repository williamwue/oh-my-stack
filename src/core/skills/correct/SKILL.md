---
name: correct
description: Eliminate repeated repository mistakes through architecture, types, diagnostic checks, and behavior tests, with proof against real past failures.
---

# Correct

Use for repeated mistakes in this repository. Editing a workflow Skill belongs
to [reflect](../reflect/SKILL.md) or [authoring-a-skill](../authoring-a-skill/SKILL.md).
The user's request bounds the investigation and changes; a correction does not
itself authorize unrelated edits, publication, or changes to global rules.

## Find the mistake classes

Read scoped recent commits, reverts, available review comments, repository
instructions, and workaround comments. Group mistakes by mechanism. A repeated
class needs at least two attributable occurrences, with paths or revisions.
If history is unavailable, report the gap rather than inventing occurrences.
A single observed defect can still be fixed within the user's authorized scope.

Assume a contributor sees only the files it opened, copies the nearest example,
and takes the shortest path that compiles. Prefer a structure where a change
that looks right from one file is right across the repository.

## Eliminate each class at the highest useful level

1. Architecture: give state one owner and tasks one supported path. Hide
   internals, derive duplicated lists, migrate callers, and delete obsolete ways.
2. Types: make invalid states unrepresentable. When types cannot enforce the
   constraint, add a diagnostic lint or CI check that names the supported fix.
   For an existing widespread pattern, reject new occurrences without hiding
   current debt.
3. Behavior: assert the result a user observes. Reject a test that still passes
   when every function it calls returns nothing.
4. Documentation: use instructions only for judgment calls a check cannot
   enforce. Explain why a higher level is insufficient.

## Fix and prove

Fix one class per verifiable unit. Preserve unrelated edits. Prove the new
constraint fails on a real past mistake, then passes on the correction using
local commands and the same CI command when CI exists. Keep the historical
example and observed output with the result. If no authentic failing example
is available, mark that proof incomplete; a made-up example is not history.

Maintain a scoped rule-to-enforcement table in repository instructions when
useful. Remove redundant prose only after the corresponding check proves the
mistake impossible. Exceptions name the reason, expiry, and approval required
by repository policy; do not invent approval or expand the task's authority.

Return each class, its occurrences, chosen enforcement level, why higher levels
were insufficient, actual failing and passing commands, changed paths, and gaps.
