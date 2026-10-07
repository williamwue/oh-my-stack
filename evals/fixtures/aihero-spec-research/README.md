# AIHero research and planning fixture

Bounded acceptance of five original skills on Codex CLI and Claude Code.
The [scenario prompts](scenarios.json) record each simulated user exchange;
approval responses are explicit fixture inputs, never inferred from elapsed time.

## Prepare separate projects

Create a fresh Git repository for each host and skill. Include an orders module
with one public `cancelOrder` operation and existing Node behavior tests, an
`AGENTS.md` with source-preservation instructions, and a `CLAUDE.md` with a
separate existing policy section. Do not provide a real remote or credentials.

- For `research`, copy the original local tracker seed to
  `docs/agents/issue-tracker.md` and establish `docs/research/` as the note convention.
- For `to-questionnaire`, leave the recipient and knowledge gaps unspecified
  until the matching user exchanges.
- For setup, retain both instruction files to check that only `CLAUDE.md` is edited.
- For `to-spec`, provide the local tracker, `ready-for-agent` vocabulary, a domain
  glossary, and the explicitly agreed existing operation contract.
- For `to-tickets`, supply a local partial-cancellation spec and glossary.

Load the complete eleven original skills project-locally in Codex and select the
entry through structured native skill input. In Claude, load the candidate with
`--plugin-dir` and invoke the initial user `/oh-my-stack:<name>` command;
continue subsequent answers in that same session. Use a separate fresh session
for every host/skill fixture. These are model-backed manual checks, not offline CI.

## Observe before and after each answer

Capture each prompt, completed response, visible project files, actual command
or tool events, and native child activity. Verify source and existing policy bytes
remain unchanged. Before approval, no setup, spec, or ticket files may be written.
The questionnaire must wait through both fact-gathering exchanges.

For research, require a completed background child, its primary-source reads,
its actual note write, and a parent action while the child is running. Merely
mentioning a background agent does not satisfy the check. Retain attribution
limits when the host omits the spawn model or other metadata.

After confirmation, inspect actual files:

- Research: one cited Markdown note in `docs/research/`.
- Questionnaire: one `to-questionnaire-<slug>.md`, covering all three gaps with
  answer stubs, the named recipient, Friday deadline, and 10-minute effort.
- Setup: original seed-based tracker and domain configuration, one `Agent skills`
  block in `CLAUDE.md`, unchanged surrounding policy and `AGENTS.md`, no optional
  triage file or section when the original skill is absent.
- Spec: original sections, substantial user stories, `ready-for-agent`, the
  confirmed existing public operation, and no implementation file paths.
- Tickets: exactly two numbered files in dependency order, original per-ticket
  fields, acceptance checkboxes, second ticket blocked by the first, unchanged spec.

## Recorded evidence

See [the candidate acceptance](../../../docs/aihero-original-0.10.0-acceptance.md)
and [sanitized fixture evidence](../../../docs/acceptance/aihero-0.10.0/live.json).
From the source checkout, run:

```bash
node evals/fixtures/aihero-spec-research/verify.mjs
```

This checks recorded approval snapshots and actual artifacts. It does not rerun
models or certify remote trackers, installed global plugins, automatic triggers,
or live OMP behavior.
