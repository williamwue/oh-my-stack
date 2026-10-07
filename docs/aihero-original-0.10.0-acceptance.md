# AIHero 0.10.0 source candidate acceptance

Date: 2026-10-07. Status: unreleased source candidate based on 0.9.1 main
`30d6764e6d3fb7431df1b4b1bd52a0dd8fd49c42`.
Source: `mattpocock/skills@6fd947921b935b7e1e69293a200400f0fdd5c15f`.
No global plugin upgrade or publication is established by this record.

## Bounded live behavior

[Sanitized evidence](acceptance/aihero-0.10.0/live.json) retains all simulated
user exchanges, completed responses, before/after file contents, content hashes,
and native tool events. [Fixture instructions](../evals/fixtures/aihero-spec-research/README.md)
explain the method. Raw CLI traces and preliminary runs remain private.

Codex CLI 0.160.1 used gpt-6.1-sol with high effort and project-local original
skills, selected through structured native input. Claude Code 2.1.287 used
claude-opus-5-5 with high effort, a candidate session plugin, and native user
slash invocation. Each host ran five separate fresh projects:

- `research`: a background child reads the original first-party local tracker
  template and writes one cited Markdown note in the established research
  directory. The parent performs read-only work while the child runs. Actual
  child reads, note writes, and completion events are recorded.
- `to-questionnaire`: waits first for recipient information, then for three
  knowledge gaps; only the third exchange writes the discovery questionnaire,
  with answer stubs, recipient, deadline, and effort.
- `setup-matt-pocock-skills`: explores and presents original template-based
  local tracker and domain settings without writes; after explicit approval,
  creates both configuration files and one `Agent skills` section in the
  existing `CLAUDE.md`, preserving surrounding policy and `AGENTS.md`.
  No optional triage file or section is created.
- `to-spec`: inspects existing code and tests, proposes the existing public
  testing seam and waits; explicit confirmation permits one local spec with
  original sections, extensive user stories, and `ready-for-agent` status.
- `to-tickets`: reads the complete supplied spec, proposes two end-to-end slices
  and a genuine blocker, and waits; approval produces two separate numbered
  ticket files with acceptance criteria and status, preserving the parent spec.

Recorded snapshots verify that source, tests, existing policies, and package
configuration remain unchanged. The approval-sensitive workflows do not write
before their explicit fixture answers. The specimen spec's operation is
`cancelOrder(orderLine, quantity)`; it does not introduce an alternative operation.

## Observations that limit the claim

The first Claude spec run inferred an additional operation name from incomplete
implementation context despite a later seam confirmation. Both hosts repeated
that fixture in fresh sessions with the agreed operation contract made explicit
in the initial conversation. The successful records use these repeated runs;
preliminary traces remain available privately. No original instruction was
changed to achieve the result. Synthesized specs can contain inferred decisions
and still need a user's content review before implementation.

Initial fixtures used the same candidate skill files before the project-version
metadata was corrected from 0.9.1 to 0.10.0. The repeated spec fixtures used the
corrected metadata. All tested original resources and source receipts match the
final candidate exactly. This is not an installed global 0.10.0 observation.

Codex research exposes a successful child named `tracker_reading_retry` and its
real read/write/completion events. The native trace does not expose its spawn
model and effort; full spawn attribution is not claimed. Claude exposes native
`run_in_background` and child tool events; its exact child model and effort
were not independently audited either.

The original setup seed retains a reference to `triage-labels.md` even when
optional triage setup is skipped. Both hosts surfaced that absent-file reference;
original bytes are preserved. The spec fixtures explicitly supply the downstream
`ready-for-agent` vocabulary. Setup alone is not evidence that every project's
tracker and label context is complete.

Research exercised a bundled first-party source rather than live internet
retrieval. No real remote tracker issues were written. GitHub/GitLab/other
publication, native blocking links, automatic selection quality, global candidate
installation, Desktop picker interaction, and live OMP behavior are unverified.

## Offline verification

`npm run check` verifies package generation, source resource hashes, invocation
modes, dependency closure, documentation drift, Markdown links/style, reproducible
release builds, book coverage, and repository tests. The recorded host fixture
verifier checks approval snapshots, actual artifacts and hashes, background
activity evidence, and preservation of implementation files.

The five Python book-audit tests and the complete bilingual source audit pass:
96 source chapter entries, 48 translated chapters, and 444 code blocks.
Claude's native candidate plugin manifest validation passes.
All 470 prior packaged skill files remain byte-identical to 0.9.1.

This record does not complete independent release review, clean tagged builds,
remote CI, downloaded-asset checks, or native installed-plugin acceptance.
Those remain publication gates in the [release procedure](release-process.md).
