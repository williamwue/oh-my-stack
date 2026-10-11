---
name: eval
description: "Follow the upstream Eval playbook for its named task."
disable-model-invocation: true
---

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

Host adaptation. Read the installed package's [runtime binding](../../docs/runtime-binding.md) for delegation, tools, paths, transcript access, and control surfaces, and [model selection](../../docs/model-selection.md) for the named routes and ordered panels below. These bindings translate host calls; they add no workflow stages. Continue already authorized implementation through its checks. Advice-only requests end with advice. Publication, merge, deployment, billable requests, credential access, and user-scope configuration retain the host and project authorization gates. A workflow step naming one of these actions does not grant that authority. Source-host helpers under `../poteto-mode/scripts/` are reference-only unless the generated binding identifies supported execution for that exact helper; use the documented native helper only for the capability it supports. Report unavailable capabilities and verification separately.

### Eval

**You own the experiment design. Plan, blind, run, synthesize.**

**Non-negotiables for blinding:**

- No `eval`, `test`, `judge`, `experiment`, `rubric`, `score`, `compare`, `benchmark`, `candidate`, or `arena` in any directory, file, or prompt the candidate sees.
- The candidate prompt looks like an organic user request. State the goal, not the meta.
- No chain-eliciting cues. Don't ask the candidate to list which skills, principles, or files they applied. Ask for design notes generally and grade chain-following from code shape, not self-report.
- Sanitize directory and slug names. Use project-shaped names a user might pick.
- Don't tell the candidate other candidates exist.
- The judge can know it's judging but sees outputs by sanitized label only, never by model name.
- Comparing two variants: one judge scores both sets in a single pass on one scale, blind to which set each came from.

**Steps:**

1. **Frame.** State what variant is under test and what behavior counts as success. Write the rubric (3-6 concrete criteria) for the judge only. Hold it back from candidates.
2. **Set up sanitized environments.** Per-candidate working dir with the variant in place. Plant any context an organic task would have: a project skeleton, the skills the candidate would naturally read.
3. **Author one organic prompt.** What a user would type. No leakage of what's being measured.
4. **Spawn N parallel candidates** on different models per the **arena** skill's Phase B. Each works in its own sanitized dir. Same prompt to each.
5. **Spawn one blinded judge** on a different model family per the **arena** skill's Phase C. Judge sees outputs by sanitized label and the rubric, never a model name.
6. **Verify the chain from transcripts, not self-report.** Read each candidate's local transcript under the active workspace's `agent-tran../poteto-mode/scripts/` directory (the system prompt names this path). Do not glob across `unrelated host workspace transcript roots`. That crosses workspace boundaries and reads private chats from unrelated projects. Look at which files each candidate actually opened. Grade chain-following from the files it really read plus the shape of the code, never from the candidate's own claims.
7. **Read every candidate output yourself** end to end. Compare to the judge's verdict. Disagreement means a model is biased or the rubric is ambiguous. Synthesize.

**Reply:** variant under test, rubric, per-candidate notes, judge's verdict, your synthesis, and a recommendation for whether to promote the variant.
