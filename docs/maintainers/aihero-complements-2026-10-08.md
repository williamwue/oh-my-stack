# AIHero complements for pstack: source import

Date: 2026-10-08. Base: `3bc672568a8ccba812a804bec082d6d24a1d0cab`.
Status: source additions after the 0.12.0 baseline, not a published or globally
installed release. See the [user guide](../aihero-original-skills.md).

## Source and selection

Add original `writing-for-agents`, `retro`, and `handoff` to the eleven selected
AIHero originals. Retain the existing source revision
`6fd947921b935b7e1e69293a200400f0fdd5c15f` and MIT license. The three complete
directories add seven files. Their bytes also match the inspected latest
upstream revision `f3fc5632f401156837ee3872f14fe33ccf1024ea`; updating existing
originals is unnecessary for this selection.

The source manifest records every added hash, requirement, and invoked
dependency. Each OMP, Codex, and Claude Code package copies the original files
and adds the existing license and source receipts. The adaptation list remains
empty. Previously selected original file hashes remain unchanged.

## Invocation and pstack integration

| Original | Invocation | Invoked dependency | Complement |
| --- | --- | --- | --- |
| `writing-for-agents` | Automatic or explicit | None | Agent-document reference for `technical-writing` and `authoring-a-skill`. |
| `retro` | Explicit | `writing-for-agents` | Project-environment retrospective; `reflect` retains its Skill-correction workflow. |
| `handoff` | Explicit | None | Temporary export for `session-pickup`, pointing at the existing `show-me-your-work` trail. |

The portable writing workflows name the shared reference only for documents
agents consume. The user guide explains choosing `retro` or `reflect` and
exporting a portable handoff; it does not add automatic calls to either
explicit-only original. The routing table and configured model routes are
unchanged. A handoff file does not grant a fresh session authority to perform
external actions or launch a conversation.

## Long original documents

`writing-for-agents` exceeds the Codex core entry's 7,500-byte wrapper threshold
and has no H1. The existing wrapper path both assumed an H1 and would have
rewritten this source original. Source entries now retain their full bytes;
only portable core entries use the short wrapper and complete `WORKFLOW.md`.
Package tests require both the core size bound and exact original preservation.
Native complete loading and model selection remain separate acceptance gates.

## Verification boundaries

All four source tests pass: they reject missing `writing-for-agents` when
`retro` is selected, verify invocation policy and every resource on all three
generated targets, and reject changed originals. The full `npm run check`
passes target and documentation generation checks, conformance, release
reproducibility, source validation, book validation, and Markdown linting.
The source and generator test files also pass together, with 19 passing tests.
Repository tests report 281 passed, four failed, and two skipped. This is a
failed full check, not an all-pass release receipt.

All four failures also reproduce on an unchanged archive of base `3bc6725`:

| Existing test | Windows failure |
| --- | --- |
| Claude default probes all three families | `spawn EFTYPE` for the executable JavaScript fixture. |
| Generated Codex routing hook | Native-path assertion on the hook's context. |
| Generated Claude routing hook and setup | Native-path assertion on the hook's context. |
| Git promotion history | `spawn which ENOENT`. |

The [local check receipt](../acceptance/aihero-complements-2026-10-08/local-checks.json)
records the baseline comparison. These failures remain open and prevent
claiming the full repository gate or release gate passed.

The [native discovery receipt](../acceptance/aihero-complements-2026-10-08/native-discovery.json)
records Codex CLI 0.161.0 `skills/list` against a temporary repository-local
installation of the three generated originals. All three are enabled with
their expected names and interface labels, and the response reports no errors.
No model turn was started and global installation was unchanged. The response
returns `policy: null`; it does not verify native invocation policy or complete
loading of the long reference.

These checks establish local source and package consistency and Codex metadata
discovery. Live invocation, automatic trigger quality, complete reference
loading, document-pruning behavior, retrospective quality, a generated handoff
artifact, native OMP or Claude Code discovery, global installation, independent
release review, and remote CI remain unverified.

## Design and ownership

The existing source-selection manifest is sufficient; no new source renderer
or namespace mapping is needed for these three non-conflicting names. The root
is the single writer for the source manifest, integration references, tests,
and generated packages in an isolated worktree. Source dependency and byte
checks precede package generation; publication and installation retain the
existing [release gates](../release-process.md).
