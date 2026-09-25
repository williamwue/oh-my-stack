# Local release-candidate readiness

Historical alpha.4 record. For current release status and remaining tasks,
see [project status](project-status.md).

Date: 2026-09-23. This document records bounded acceptance of the unpublished
`0.2.0-alpha.4` working tree and installed Codex candidate
`0.2.0-alpha.4+codex.20260923055103`. It is not a tagged release claim.

## Current user-approved scope

Complete local, read-only representative Skill decisions, Codex/OMP package
loading, and release preparation. Defer real project collaboration, external
pull requests, authenticated integrations, scheduled recovery, and Claude Code
live testing to later user-led work. A passing simulated decision cannot be
promoted to a real workflow result.

## Package and runtime acceptance

| Check | Observed result | Boundary |
| --- | --- | --- |
| Codex CLI 0.155.1 | The installed version exposed exactly 74 public entries. Eight fresh read-only app-server turns selected every entry; all 74 complete Skill bodies matched the installed source. | Native loading, not Desktop picker rendering or workflow execution. |
| OMP 18.2.10 | Native `omp read skill://...` returned each of the 74 generated public bodies; `plugin doctor` was healthy and preserved the unrelated plugin. | Loading and manager health, not full behavior parity. |
| Codex Desktop | The user confirmed visibility and selection of `$how` and `$swarm` on 2026-09-23. Direct application interaction was denied to the agent by the host's safety boundary. | User-reported UI acceptance for two entries; no agent-observed screenshot or exhaustive Desktop picker audit. |
| OMP `plugin link --dry-run` | **Failed safety expectation.** A disposable `oms-dry-run-probe` acquired a user plugin symlink and lock entry despite `--dry-run`. `omp plugin uninstall` removed only that probe; the lock and package-manifest SHA-256 hashes returned exactly to their pre-probe values, and doctor passed. | Do not describe OMP `--dry-run` as read-only or use it as an installation safety proof. |
| OMP native failure | A fresh normal-profile `swarm` turn started two read-only workers in one batch. A counted 74 public Skills; B attempted an absent fixture and returned `BLOCKED`. The root drained both, checked both paths itself, and reported overall incomplete. | Proves a bounded coverage failure path, not retries, writes, or a real project. |
| OMP native cancellation | A fresh normal-profile turn started the read-only `SlowInventory` worker, called native `hub cancel` for that handle, and confirmed `cancelled` via `hub jobs`. | Proves this one cancellation path; not general cancellation of writers or external tasks. |

The OMP dry-run probe changed no project source. Its fixture is ignored under
`.tmp/`. The Codex installed package and candidate source matched recursively
before this acceptance; this run checked its complete Skill bodies via native
selection. The earlier [OMP normal-profile run](omp-18.2.9-live-test-plan.md)
and [upstream completion record](upstream-completion-acceptance.md) remain
historical evidence, not results silently relabeled for the new version.

## Representative decisions

Codex and OMP each loaded the named installed Skills and evaluated three
read-only groups of four simulated scenarios:

| Group | Tested decisions | Both runtimes |
| --- | --- | --- |
| History/design | `why` lacked history, `architect` was design-only, `arena` lost a candidate, `teach` knew mechanics but not rationale | Preserved missing evidence, stopped at design, refused a verified winner, and separated current behavior from historical intent. |
| Measurement/diagnosis | `eval` lacked held-out data, `hillclimb` gain was inside noise, `perf-issue` lacked a baseline, `trace-forensics` lacked correlation IDs | Refused a generalizable win, measured improvement, performance pass, and causal chain respectively. |
| UI/integration/safety | `visual-parity` compared different viewports, `make-bot-ui` lacked webhook and secret storage, `worktree-cleanup` targeted the current dirty checkout, `create-verification-skill` had only a build result | Refused parity, live delivery, deletion, and user-facing verification; named the missing proofs and safe fallback. |

These are fail-closed decision tests with simulated inputs. No candidate work,
user-facing session, screenshot comparison, webhook delivery, cleanup, or
performance measurement was executed. Earlier positive local `arena` and
`swarm` runs are documented in the upstream completion record, but they do not
graduate every branch or the newer `swarm` instructions.

A separate positive, read-only `why` exercise used the actual local history of
four-entry compact packaging (`41c096b`) and direct-entry restoration
(`4820c9b`). Codex and OMP both identified the documented initial catalog-size
goal, the later direct-invocation decision, and the shorter-description plus
category alternative. Both separated those recorded facts from an inferred
product tradeoff and left external review or user-feedback motives unknown.
OMP's native trace read `skill://why` and its evidence references before Git
inspection (session `01a0cd0c-809c-768d-8cec-476010f34e8f`). This proves a
bounded local-history explanation, not authenticated seven-source coverage or
independent synthesis.

The new OMP native failure and cancellation session IDs were
`01a0cd09-ba05-7542-b16b-f1e26b11e65a` and
`01a0cd0a-f0ab-7247-81fa-9a38ad565aa7` respectively. The initial failure
fixture attempt (`01a0cd08-f461-76c3-becd-999a4434b673`) ended after
planning without launching workers, so it is recorded as unsuccessful.

## Release gates

- The full deterministic `npm run check` passed: three generated public targets,
  12 conformance records, reproducible release bytes, seven capability
  profiles, Markdown lint, and 86 tests. Four archive checksums and the release
  manifest checksum passed. The plugin archive contains 74 public Skill files
  and zero internal `check-*` probes. The source and MIT notices were reviewed
  and the latest semantic drift is explicitly attributed.
- A temporary Git index froze 287 intended files into local snapshot object
  `b28c395`; no branch or tag moved. Its detached checkout remained clean
  after `npm ci --ignore-scripts`, the full check, release build, and all five
  checksum validations. The Codex plugin archive SHA-256 matched the dirty
  working-tree build. The temporary worktree was removed after verification.
  One verbatim upstream snapshot has a trailing blank line flagged by
  `git diff --check`; excluding immutable snapshots, the staged diff check is
  clean. The main checkout remains deliberately uncommitted.
- Keep the user's Desktop picker confirmation separate from CLI loading; it
  covers the two selected entries, not every visual state.
- Preserve the OMP dry-run warning in installation docs. A safe preflight must
  use read-only package validation and inventory; actual link/install is an
  explicit mutation. The upstream OMP manager defect remains outside this
  repository's control.
- Defer authenticated and real-project W4 checks by user choice, and label any
  first public release with those limitations. Do not claim full Cursor parity.

At the time of this alpha.4 candidate record, no branch commit, tag, push,
GitHub release, or package publication had been made. The unreferenced
snapshot commit object was created solely for a clean-checkout test. The later
alpha.5 release preparation is recorded separately.
