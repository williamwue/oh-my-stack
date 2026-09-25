---
name: investigation
description: "Answer a read-only engineering question from repository evidence without changing implementation files."
disable-model-invocation: true
---

# Investigation

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

Use this workflow for code behavior, ownership, layering, feasibility, and
engineering tradeoff questions whose requested outcome is an answer rather
than a change.

1. Freeze the question, inspected scope, and current revision when available.
2. Run the `how` workflow over the affected area. For an alternatives decision,
   gather evidence for each viable option under the same constraints.
3. Verify important claims against current files, executable behavior, or both.
4. State facts, inferences, and unknowns separately. Do not infer historical
   motivation without evidence.
5. Keep the workspace unchanged. If investigation reveals a requested change,
   stop at the diagnosis and route a later implementation request separately.
6. Apply `technical-writing` and `unslop` when producing a durable document.

Return the `how` output for explanatory questions. For a decision, return the
decision criteria, evidence, tradeoffs, recommendation, and verification
boundary. State that the investigation was read-only.
