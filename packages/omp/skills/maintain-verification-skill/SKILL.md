---
name: maintain-verification-skill
description: "Audit a project verification Skill against source and live user paths, correcting proven drift in its own files."
disable-model-invocation: true
---

# Maintain verification Skill

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

Locate the project verification Skill with launch/drive instructions and a
feature map. If several match, resolve the target from the request or ask.
If none exists, use [create-verification-skill](../create-verification-skill/SKILL.md).
Only edit that Skill, its feature map, and its owned helpers. Product defects
are reported separately; documentation must not hide them.

Check the map index against feature files for missing, duplicate, or dead
entries. For each feature, assign a bounded read-only source pass that returns
the entry points, likely drift with citations, and one live verification recipe.
Parallelize within runtime capacity; sequential root passes are an explicit
fallback. Reconcile every feature and inspect recent source changes for missing
user-facing paths.

The coordinator then runs one live pass covering every feature. Follow the
verification Skill's launch model: one checked shared instance or fresh
isolated sessions. Doctor before first drive and after a surprising failure;
reset a wedged state rather than repeatedly trusting a healthy process check.
For each drive, preserve evidence before cleanup. Clean residual state after
failed attempts and tear down the instance after the final pass. Record an
unreachable feature only with the attempted path and concrete prerequisite.

Classify findings: doc drift, harness gap, or product gap. Fix only the first
two under the owned Skill directory and re-run any changed harness live.
Re-read the final diff and evidence. Outcome is `clean` when all mapped features
have source and live coverage with no correction; `changed` when corrections
are proven; `blocked` when coverage or safe correction cannot finish. A source
scan alone cannot yield `clean`. Return per-feature coverage and remaining
prerequisites. If the user explicitly requested a pull request, create at most
one from the verified changes; otherwise leave the scoped changes local.
