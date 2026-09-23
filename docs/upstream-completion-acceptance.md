# Upstream gap implementation acceptance

Date: 2026-09-23. This record concerns an unreleased working tree based on
`4820c9b11be779f7e826041fa8f15df482520a81`, not a tagged publication.

## Implemented

The 11 remaining upstream main entries and nine missing poteto-mode playbooks
are now 20 directly selectable portable Skills. Together with the five from
the prior batch, the public catalog has 74 entries: 51 workflows and 23
principles. The 12 `check-*` probes remain outside public packages.

Each new Skill has core instructions, explicit invocation metadata, a concise
Codex discovery description, a specific poteto-mode route, and generated OMP,
Codex, and Claude Code packages. The semantic derivation record binds all 20
outputs to 29 frozen upstream files from revision `86ecc820`, including source
references and MIT license. All 29 local Git blob hashes matched the pinned
upstream tree. The registry now models `automation.webhook`; every runtime
profile marks it `unknown` pending a native probe.

The portable bot UI flow supports a provider with a real webhook and secret
mechanism. It does not claim that any target host has Cursor's specific bot
routine, credential card, or private-network behavior. The generated
verification, eval, trace, and cleanup workflows likewise describe complete
procedures but require task-specific live evidence before an outcome can pass.

## Checks

- `npm run check` passed: deterministic generation, 12 prior conformance
  records, reproducible release archives, provenance validation, Markdown
  lint, and 85 tests.
- Skill Creator's validator passed for all 20 second-batch source Skills.
- A regression test confirms retained upstream path examples do not weaken
  checks for private keys. Broken links in published instructions still fail.
- Plugin Creator's validator passed on the versioned local candidate.
- The installed plugin and candidate each contain 185 files, with identical
  content hashes, sizes, names, and normalized modes.
- Codex CLI 0.155.1 app-server discovered 74 enabled public namespaced Skills
  from the installed version. Three fresh read-only sessions selected all 25
  added entries in groups of 10, 10, and five. The persisted model-visible
  selected body matched each installed `SKILL.md` completely. The loading turns
  did not execute workflows or tools.

## Bounded behavior checks

Two additional fresh, explicitly selected, read-only Codex sessions exercised
negative boundaries using the installed package:

| Skill | Request and observed result | Boundary |
| --- | --- | --- |
| `make-bot-ui` | With no endpoint or credential, read installed instructions and host capability profile; identified the missing webhook trigger, server-side secret, action schema, and target readback. It invented no URL/key and made no webhook call. | No live webhook or page built. |
| `worktree-cleanup` | Inventoried registered worktrees and current dirty state; correctly held the only checkout and did not remove or prune anything. | Process inspection was blocked; no clean disposable target existed. |

Root inspected the completed app-server items. All tool calls in these two
runs were read-only commands. The first session checked `automation.webhook`
as `unknown`; the second found one dirty current worktree. The negative runs
do not prove successful webhook delivery or cleanup of a recoverable target.

## Positive native collaboration checks

On 2026-09-23, Codex CLI 0.155.1 selected the installed `swarm` and `arena`
Skills in two fresh, persisted, read-only app-server sessions. Both turns
completed. The raw JSON-RPC event logs were retained outside the repository in
temporary run directories; the session IDs are listed below. These tests used
the local unreleased candidate, not the published alpha.4 bundle.

| Skill | Session | Native observation and root verification |
| --- | --- | --- |
| `swarm` | `01a0cbf7-0f7d-7dc2-9920-cb378c438445` | The root started `public_skill_count` and `omp_manifest_generation` before waiting; both were concurrently active, each returned a separately attributable full result, and the root drained both. The root independently counted 74 unique public entries and 12 probes, checked the generated OMP manifest against its adapter source and project version, and counted 74 public entries in the installed Codex catalog. |
| `arena` | `01a0cbf8-3a53-7211-88ec-115e2b981485` | The root froze a four-criterion rubric before results, started `candidate_a` and `candidate_b` on the same half-open-interval API brief before waiting, collected both complete proposals, then started a distinct `judge`. The judge scored A 7/8 and B 8/8. The root chose B's named-interval API, grafted A's explicit empty-interval guard, and independently checked touching, overlapping, invalid, and empty cases. |

No project files were edited by either test session. The `swarm` exercise
proves real read-only coverage fan-out and root verification; the `arena`
exercise proves a two-candidate, separate-judge design comparison. Both
candidates inherited the same model, so this does not prove model diversity.
The `arena` result is pseudocode only: no implementation or executable test was
run. These checks do not graduate other newly ported workflows or OMP.

## Installed candidate and remaining acceptance

Local developer candidate: `0.2.0-alpha.4+codex.20260923005815`, installed
from the persistent `local-upstream-parity-x8V3hI` marketplace source under the
user's local Oh My Stack releases directory. The previous published alpha.4
source and earlier local candidate source remain available for rollback.
No repository version, tag, commit, push, or public release was changed.

Behavior still needs representative positive and failure runs for most new
workflows, especially verification Skill launch/cleanup, blinded `eval`,
measured `hillclimb`/performance, paired trace and visual evidence, and a
provider-backed webhook. The focused `why`, `architect`, `arena`, and `swarm`
checks do not prove every branch of those workflows. OMP needs separate native
acceptance. Claude Code live testing remains deferred until the user has an
account. The 12 existing conformance records were not relabeled as proof for
the new workflows.
