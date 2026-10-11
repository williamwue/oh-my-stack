---
name: reflect
description: "Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect."
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

Host adaptation. Read the installed package's [runtime binding](../../docs/runtime-binding.md) for delegation, tools, paths, transcript access, and control surfaces, and [model selection](../../docs/model-selection.md) for the named routes and ordered panels below. These bindings translate host calls; they add no workflow stages. Continue already authorized implementation through its checks. Advice-only requests end with advice. Publication, merge, deployment, billable requests, credential access, and user-scope configuration retain the host and project authorization gates. A workflow step naming one of these actions does not grant that authority. Source-host helpers under `scripts/` are reference-only unless the generated binding identifies supported execution for that exact helper; use the documented native helper only for the capability it supports. Report unavailable capabilities and verification separately.

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, find this conversation's transcript in the `agent-transcripts/` directory the system prompt names. Do not glob across `unrelated host workspace transcript roots`. That crosses workspace boundaries and reads private chats from unrelated projects.

```bash
ls -t <agent-transcripts>/*.jsonl <agent-transcripts>/*/*.jsonl <agent-transcripts>/*/subagents/*.jsonl 2>/dev/null | head -10
```

That covers the legacy flat (`<id>.jsonl`), current nested (`<id>/<id>.jsonl`), and subagent (`<parent>/subagents/<child>.jsonl`) layouts. For each candidate, read the first JSONL line. Take the file whose `message.content[0].text` contains the conversation's opening user prompt. If none matches, pass a tight digest of the session instead.

## 2. Spawn three reviewers in parallel

One message, three native child delegation calls, the bounded role from the generated runtime binding, agent mode (evidence-tool access with writes bounded by the assignment). Reviewers need MCP access to look up the tickets, chat threads, and observability traces the transcript references, and the source-host readonly mode strips MCPs; preserve evidence access through the host binding.

Each reviewer and the synthesizer name a role line in the `effective host model resolution` rule and a default. Set `model` to that line's value, or to the default if the rule or the line is missing. Leave `model` unset when the value is `auto` or `inherit-parent`. If the host rejects a configured model, reconcile it against the current inventory and generated model selection guide. Use only an observed, authorized replacement and disclose it; never guess a slug. Alias entries inherit the parent model and are not rejected real model names.

| Lens | Role line | Default `model` | Prompt template |
|---|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `observed judgment-model choice` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `observed code-model choice` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `observed judgment-model choice` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the native child delegation response body.

## 3. Synthesize

One native child delegation call, the bounded role from the generated runtime binding, `model` from the `reflect judgment, divergent, synthesizer` line (default `observed judgment-model choice`), agent mode (evidence-tool access with writes bounded by the assignment). It spot-verifies citations through MCP, and the source-host readonly mode strips MCPs; preserve evidence access through the host binding. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File each Backlog item to your team's devex or backlog tracker without waiting. Only the Accepted list waits for approval.

Follow each approved row's Routing exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to the host's available skill-authoring workflow skill and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to the host skill-authoring workflow and run its description-optimization loop.
- `new skill via create-skill: <kebab-name>`: hand creation to the host skill-authoring workflow. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
