---
name: eval
description: "Run a blinded, repeatable comparison of workflow or model variants using real artifacts and a frozen rubric."
disable-model-invocation: true
---

# Eval

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
