# Use the AIHero originals

[English](aihero-original-skills.md) | [简体中文](zh-CN/guides/aihero.md)

The current source includes sixteen selected original skills from Matt Pocock's
[skills repository](https://github.com/mattpocock/skills). Select one directly
when you want its original process. You do not need to enter `poteto-mode` first.

The five research, questionnaire, setup, spec, and ticket entries below require
**0.10.0 or later**. Check the [published release](https://github.com/williamwue/oh-my-stack/releases/latest)
and your actual installed version before using them.

`writing-for-agents`, `retro`, `handoff`, `diagnosing-bugs`, and `code-review`
require **0.13.0 or later** and are absent from 0.12.0 or earlier. Check the actual
Skill catalog; see the [source import record](maintainers/aihero-complements-2026-10-08.md)
for their verification and release boundaries.
The [second-batch record](maintainers/aihero-complements-second-batch-2026-10-08.md)
covers the newer diagnosis and review originals.

## Choose a capability

| Your task | Skill | Result and file effects |
| --- | --- | --- |
| Clarify a plan or design | `grill-me` | Numbered question rounds with recommendations; waits for your answers before moving on. |
| Clarify a plan and retain agreed domain language | `grill-with-docs` | Question rounds plus glossary updates and important architectural decision records when needed. |
| Find modules worth improving | `improve-codebase-architecture` | An HTML report with candidates; waits for your selection before discussing a candidate. It does not implement the refactor. |
| Compare module interfaces | `codebase-design` | Shared design vocabulary and principles, with references for deepening a module and comparing alternative designs. |
| Sharpen domain terminology | `domain-modeling` | Consistent terms in glossaries and architectural decision records, using the original formats. |
| Interview through a design's decisions | `grilling` | Questions in rounds whose prerequisites are settled; waits for answers and shared understanding. |
| Research a technical question | `research` | A background agent reads primary sources and saves a cited Markdown note in the project. |
| Ask another person for missing facts | `to-questionnaire` | Two short exchanges about the recipient and needed answers, then a questionnaire file you can send yourself. |
| Configure original engineering skills for a project | `setup-matt-pocock-skills` | A draft of the tracker and domain-doc settings; waits for confirmation before editing project instructions and configuration. |
| Capture an agreed feature as a spec | `to-spec` | Synthesizes existing context, confirms testing seams, then writes to the configured tracker. |
| Split a spec into executable work | `to-tickets` | Proposes vertical slices and blockers; publishes one ticket per item only after you approve. |
| Write documents an agent consumes | `writing-for-agents` | Shared reference for context pointers, information hierarchy, pruning, and checkable completion criteria. |
| Retrospect on the agent's project environment | `retro` | Reads the named session and proposes navigation, checks, standards, and tooling improvements; does not implement the proposals. |
| Export work for another session or tool | `handoff` | Writes a redacted handoff file to the OS temporary directory, referencing existing artifacts instead of duplicating them. |
| Diagnose a difficult defect or performance regression | `diagnosing-bugs` | Builds a specific failing feedback loop, minimises reproduction, tests hypotheses, fixes the cause, and removes temporary probes. |
| Review committed changes against standards and a spec | `code-review` | Runs independent Standards and Spec reviews, reporting the axes separately; does not implement the findings. |

`codebase-design`, `domain-modeling`, `grilling`, `research`, and
`writing-for-agents`, `diagnosing-bugs`, and `code-review` can also be invoked by
the agent. The other nine require explicit user invocation. All sixteen remain
separately selectable.

## Start an interview

In Codex, type `$` and select `oh-my-stack:grill-me`, then send:

```text
Help me plan partial cancellation of an Order Line.
Start with the first question round and wait for my answers.
Do not implement or change project files.
```

In Claude Code, send this in the conversation:

```text
/oh-my-stack:grill-me Help me plan partial cancellation of an Order Line. Start with the first question round and wait for my answers. Do not implement or change project files.
```

Expect questions with recommended answers. Answer the round before continuing.
The agent should investigate facts it can find in the project and leave
business decisions to you. Full implementation is a separate task after you
confirm shared understanding.

To keep the agreed language, select `oh-my-stack:grill-with-docs` in Codex or
use this Claude Code conversation command:

```text
/oh-my-stack:grill-with-docs Clarify partial Order cancellation. Record only confirmed domain terms and decisions; do not implement the feature.
```

This workflow can write `GLOSSARY.md`, contextual glossaries, and architectural
decision records in your project. Unresolved choices remain questions.

## Inspect a module's design

Select `oh-my-stack:improve-codebase-architecture` in Codex, or use:

```text
/oh-my-stack:improve-codebase-architecture Inspect the checkout module for improvement opportunities. Produce the report and wait for my choice; do not change implementation files.
```

The original workflow loads `codebase-design`, explores the codebase, writes
an HTML report to the operating system's temporary directory, and asks which
candidate to examine. Its later discussion also uses `grilling` and
`domain-modeling`, which can record agreed terms and decisions.

If the report does not open automatically, open the reported file yourself.
The report uses Tailwind and Mermaid from external CDNs; full styling and
diagrams need network access. Report creation has been observed in the
[bounded acceptance fixtures](aihero-original-0.9.0-acceptance.md), but automatic
opening and visual rendering are not fully verified.

For an interface design discussion without the codebase-wide scan, select
`codebase-design` and send:

```text
Examine the checkout module's interface and dependencies.
Use the original Design It Twice process to compare alternative interfaces.
Return the candidates and tradeoffs before editing implementation files.
```

The original reference asks for three or more independent parallel designs
with distinct constraints, then a comparison and recommendation. That process
can use multiple agent calls. It does not automatically enter OMS `architect`,
`arena`, or `refactoring`.

## Research and ask someone else

Select `oh-my-stack:research` in Codex or use this Claude Code command:

```text
/oh-my-stack:research Check the documented cancellation guarantees of the API we use. Use primary sources, cite every finding, and save a Markdown note under our research directory.
```

The original delegates to a background agent. It needs access to the relevant
sources and permission to write the resulting note. Follow the reported path
and citations to inspect the result.

For decisions held by a colleague or customer, select `to-questionnaire`:

```text
/oh-my-stack:to-questionnaire Prepare a discovery questionnaire about our launch requirements for the customer operations lead.
```

Expect one exchange about the recipient and one about the facts or decisions
you need back. The result is `to-questionnaire-<slug>.md` in the current
directory. Sending the document is a separate user action.

## Prepare a spec and tickets

Run `setup-matt-pocock-skills` once in the target project. It proposes the
tracker and domain documentation layout, shows a draft, and waits before
writing. For a local trial:

```text
/oh-my-stack:setup-matt-pocock-skills Configure this project to use local Markdown issues. Show the draft and wait for my confirmation before writing.
```

It prefers an existing `CLAUDE.md`, otherwise an existing `AGENTS.md`, and asks
which to create if neither exists. It preserves surrounding sections and writes
`docs/agents/issue-tracker.md` and `docs/agents/domain.md`. The original `triage`
skill is not included in this selection, so its optional label-configuration
section is skipped; the spec and ticket workflows still use `ready-for-agent`.

Then use the agreed conversation to create a specification:

```text
/oh-my-stack:to-spec Turn our agreed cancellation design into a spec. Confirm the testing seam with me before writing it to the configured local tracker.
```

This synthesizes existing decisions; it does not start a new requirements
interview. It can ask you to confirm the testing seam. Local specs live at
`.scratch/<feature-slug>/spec.md`; a remote tracker configuration instead
creates an issue. Missing tracker or label context leads to a setup request.

Next, pass the actual spec path to `to-tickets`:

```text
/oh-my-stack:to-tickets .scratch/partial-cancellation/spec.md
```

Expect a proposed numbered breakdown with deliveries and blocking edges,
followed by a pause for approval. After approval, local tickets live separately
at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, with acceptance criteria,
blockers, and `ready-for-agent` status. Remote tracker publication creates real
issues and blocking relationships where supported. These original capabilities
do not automatically run an OMS implementation or release workflow.

## Complement the pstack workflows

Use `writing-for-agents` alongside `technical-writing` when editing `AGENTS.md`,
Skills, or operating documents an agent reaches through a pointer. It supplies
the agent-facing document reference; `technical-writing` retains the reader's
task and factual verification. `authoring-a-skill` consults the same reference
and its bundled `SKILL-MECHANICS.md` for invocation and router choices.
Read the complete reference, using bounded chunks if a tool truncates it.

For an environment-focused retrospective, explicitly select `retro`:

```text
/oh-my-stack:retro Review this session for missing navigation pointers, duplicated instructions, and checks that would prevent repeated mistakes. Propose improvements only; do not edit Skills or project files.
```

The original loads `writing-for-agents` and reports improvement candidates.
`reflect` remains the pstack workflow for evidence-backed Skill corrections;
choose the desired output without automatically running both retrospectives.
Use only the authorized session record, and redact secrets from evidence.

For a portable handoff, explicitly select `handoff`:

```text
/oh-my-stack:handoff Prepare a handoff for the documentation-cleanup session. Reference the current plan and completed changes, include suggested Skills, redact sensitive information, and report the temporary file path.
```

Use the corresponding `oh-my-stack:<entry>` picker selection in Codex.
The handoff writes a file; it does not launch another agent or conversation.
The receiving session can use `session-pickup` to validate the checkpoint
against current repository state. `show-me-your-work` remains the canonical
evidence trail; the handoff points to it rather than replacing it.

## Diagnose or review with the second batch

Choose `diagnosing-bugs` for a hard defect that needs a reproducible feedback
loop, minimisation, and falsifiable probes. It owns a full diagnosis-and-fix
process; do not automatically nest that process inside another full workflow.
`bug-fix` remains the pstack entry for coordinating a bounded fix and verifying
the final result. Performance work still requires a measured baseline.

```text
/oh-my-stack:diagnosing-bugs Diagnose the reported export failure in the local fixture. Establish and run a failing command for that exact symptom before testing hypotheses. Preserve unrelated edits and redact captured output.
```

The optional `scripts/hitl-loop.template.sh` requires Bash and must be copied
and tailored to the actual reproduction. Its example URL and Export button are
placeholders. It prints captured observations; never enter credentials in a
capture prompt. On Windows select an available Bash shell for this fallback.
Existing provider, production, and billable-operation gates still apply.

Choose `code-review` for two independent reports about repository standards
and the originating spec. Supply a resolvable fixed ref and tracker instructions
or spec context; it skips the Spec reviewer when no spec is available. The
original uses `git diff <fixed-point>...HEAD`, so uncommitted edits are excluded.
For uncommitted files, a design review, or an adversarial verdict with synthesis,
choose pstack `interrogate` with its explicit frozen scope.

```text
/oh-my-stack:code-review Review committed changes since origin/main. Use CONTRIBUTING.md and the originating spec at docs/specs/export.md; keep Standards and Spec findings separate. Do not implement findings or publish comments.
```

Replace the example spec path with a real source. The original requires actual
parallel sub-agent support; report unavailable capabilities rather than claiming
independent review. These entries keep the original automatic invocation modes,
but do not replace `bug-fix` or `interrogate` in the OMS router. No review grants
merge or publication authority. In Codex use the corresponding Skill picker.

## Included source and support

The first fourteen original directories, references, and UI metadata retain
their bytes at revision `6fd947921b935b7e1e69293a200400f0fdd5c15f`.
`diagnosing-bugs` and `code-review` retain their complete originals at
`f3fc5632f401156837ee3872f14fe33ccf1024ea`. Both sources use MIT licensing.
OMS packaging adds attribution and source receipts without inserting model
routing or replacing original dependencies with OMS workflows.
Codex's 7,500-byte wrapper policy applies to portable core entries. Source
originals, including the longer `writing-for-agents` and `diagnosing-bugs`
entries, remain intact;
complete native loading and automatic selection are separate live checks.

This selection does not include original `wayfinder` or `triage`. See the
[Skill directory](skill-directory.md) for what is installed and the
[support policy](support-policy.md) for tested tools and remaining limits.

Source hashes, dependency closure, and the reviewed update procedure are in the
[first-batch record](maintainers/aihero-complements-2026-10-08.md) and
[second-batch record](maintainers/aihero-complements-second-batch-2026-10-08.md).
