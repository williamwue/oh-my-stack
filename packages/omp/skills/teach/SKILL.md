---
name: teach
description: "Teach a change or subsystem in plain language by composing verified mechanics and historical rationale, preserving uncertainty and the learner's pace."
disable-model-invocation: true
---

# Teach

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

Help the person understand what something is, how it works, and why it has that
shape. Do not change implementation or external state as part of teaching.

## Establish understanding

Infer the needed depth from the conversation: newcomer, reviewer, debugger, or
prospective implementer. Orient briefly in the code and decide what they need
to understand. State a narrow interpretation if needed; do not quiz the user
or demand background information that the conversation already supplies.

Read and execute [how](../how/SKILL.md) for mechanics and
[why](../why/SKILL.md) for rationale. These are actual evidence-gathering workflows,
not headings filled from intuition. Independent passes may run in parallel
within available capacity; otherwise run them sequentially and retain their
evidence. Scope why to the question while preserving all seven coverage rows
and reasons for omitted categories. A small question may need only one of the
two; say which evidence boundary applies and do not fabricate the other half.

Check both accounts refer to the same target and revision. Resolve discrepancies
by reading the cited evidence, keeping present behavior distinct from historical
intent. Preserve why's confidence tiers and hedges verbatim in substance:
rewriting for clarity must not promote inference to fact. Missing rationale
remains unknown even when the mechanics are clear.

## Explain in layers

Lead with a plain definition and the smallest complete answer, then connect it
to the person's case using a concrete call or user action. Explain the mechanism
and problem solved, not just a list of symbols. Use the user's language and
stable terminology. Cite the few references that substantiate the explanation.

Show code, a short example, or a small diagram only when it helps. For a complex
flow, introduce parts progressively instead of dumping an entire architecture.
Use available visual tools only within task scope; unavailable image generation
does not block a useful textual or diagrammatic explanation.

Use [unslop](../unslop/SKILL.md) to remove stylistic filler, never evidentiary
uncertainty. Keep the exchange conversational. Do not print pacing directions,
quiz the reader, or force them to repeat the explanation. In an interactive
exchange, stop after a useful layer and follow their next question. For a
one-shot request, deliver a compact complete explanation with optional next
topics. Return the explanation itself, not a report of internal orchestration.
