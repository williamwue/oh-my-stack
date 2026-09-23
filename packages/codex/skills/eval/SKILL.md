---
name: eval
description: "Compare workflow variants with blinded outputs and a frozen rubric."
---

# Eval

## Codex delegation binding

For every delegated worker in this workflow, derive the exact `model`,
`reasoning_effort`, and complete role-plus-task `message` with
`../../scripts/codex-delegation.mjs prepare` relative to this Skill. Supply the active
resolution manifest and named route/panel entry where configured; otherwise
supply the canonical role and the observed parent model and effort. Pass
the returned `task_name`, `fork_turns=none`, model, effort, and message
explicitly to the spawn call. Do not use a generated custom-role name as a selector or
claim its TOML was activated. After the worker finishes, run the helper's
`verify` mode on the persisted parent and child records when available; it
checks the spawn metadata, parent link, and child `turn_context`.
The persisted spawn message may be encrypted; disclose when its exact
role/task text cannot be audited. If records are unavailable, state that
runtime model resolution is unverified.

Define the variant, observable success, baseline, and three to six rubric
criteria before running candidates. Freeze the task input, data snapshot,
runtime versions, and scoring procedure. Separate setup, candidate execution,
judgment, and root synthesis. A better score must survive an actual check of
the artifact, not merely a candidate's self-report.

Give each candidate an isolated equivalent workspace and the same organic
user request. Remove evaluation vocabulary from paths, prompts, and visible
files when blinding is part of the question. Do not hint that competitors or
grading exist. Keep judging criteria away from candidates. If a variant
necessarily changes visible instructions, identify that exposure as part of
the treatment rather than pretending it is blind.

Run candidates within an explicit budget, recording model/runtime identities,
starting state, actual outputs, and failures. [Arena](../arena/SKILL.md) can
coordinate independent attempts when available, but do not let it merge outputs
before scoring. Give a judge anonymous output labels and one shared rubric;
score all variants on the same scale in one pass. Verify tool use or Skill
loading from scoped, available transcripts and artifact shape, never from
self-description. Read every output and resolve disagreement against criteria.

Return the variant and baseline, prompt, rubric, each result and failure,
judge verdict, root checks, uncertainty, and promote/hold recommendation.
Report loss of blinding, unavailable transcripts, or unequal environments.
No promotion, Skill edit, or external publication is implicit in running eval.
