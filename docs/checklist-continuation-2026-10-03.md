# Post-0.5.0 checklist continuation

Baseline: `c91b85b428e8eb05b5dca676c8c0b6597398239b` (`v0.5.0`).
This is a local follow-up, not a new published release. Source changes use
`followup/oms-050-checklist`; installed-host observations use the published
0.5.0 packages. The user deferred authenticated Benny/Webhook acceptance
because no disposable account or endpoint is available.

## Checklist and current evidence

| Item | Result | Remaining boundary |
| --- | --- | --- |
| 1. Installer alias entry point | Fixed locally; regression failed before the change, then all 12 release tests passed; independent review passed. | Not yet published or installed as a new release. Windows alias test not executed here. |
| 2. Original workspace and retained worktrees | All 590 changed/untracked files preserved and SHA-256 verified; 17 differ from the release. Original checkout moved to clean `maintenance/post-050` at v0.5.0. | Retained dirty worktrees, ignored evidence and independent book publication branch; no reclaim claim. |
| 3. Installed host activation | Codex and Claude loaded the installed Skill and ran one child each. | OMP authentication blocked before a model turn. Claude actual child effort is not exposed in observed runtime records. |
| 4. Host recovery and lifecycle | Codex and Claude reopened their saved parent sessions. Installed local store deduplication, conflict, generation and lock probes passed. | Transcript pickup is not worker reattachment. Detached child cancellation, natural late-result rejection and host-native durable effects remain unverified. |
| 5. GitHub babysit drive | [Assisted reviewed-commit design selected](github-babysit-drive-design.md); read-only CI diagnostic prerequisite implemented with 42 focused passing tests. | Full bounded repair/push/CI adapter and real acceptance remain open. |
| 6. Multiple PR queue / stack | No new acceptance claim. | Depends on drive and lifecycle ownership. Strict target CAS remains unsupported by the GitHub merge API. |
| 7. Additional repository policies | Existing fail-closed behavior retained. | Rulesets, CODEOWNERS and latest-push approval need separate implementation and live policy evidence; no independent GitHub reviewer is available. |
| 8. Workflow / host / OS matrix | macOS arm64 Node 22.16.0 and Bun 1.4.2 durable-state probes passed; baseline Ubuntu CI was re-read as successful. | These bounded probes are not all-workflow certification. Windows and Linux interactive host coverage remain open. |
| 9. Benny / Webhook / scheduled delivery | Deferred by the user. | No disposable authenticated environment; no credential requested. |

## Installer proof

`tools/install-release.mjs` compared `process.argv[1]` to the module URL as
literal paths. On macOS, `/tmp` and `/private/tmp` can identify the same file
with different strings, so the CLI silently exited 0 without running its
operation. Comparing canonical real paths fixes file and directory aliases.
A library import still does not execute the CLI.

The regression covers nonempty successful inspect output and malformed-action
failure through file and directory aliases. Independent checks also exercised
eval import, stdin import, preload and an unrelated entry path. The initial
full repository gate passed **228 tests**, with no failures or skips.

## Workspace preservation

The preservation directory is
`~/.local/share/oh-my-stack/workspace-preservation/20261003-pre-convergence/`.
Its `manifest.json` records each original path, Git blob, SHA-256 and
classification; `files/` retains the exact bytes and `RESTORE.md` explains
inspection in a separate worktree. Stash commit
`2b8bbcbcf62ba0abce8a93adc65e82f4d1b0f13a` provides another retained copy.
No stash was dropped, no branch history rewritten and no ignored directory
removed. The independent `docs/pstack-book-publication` branch remains intact.

## Installed-host and recovery boundaries

| Host | Installed / CLI | Actual runtime evidence | Recovery observation |
| --- | --- | --- | --- |
| Codex | OMS 0.5.0 / 0.160.0 | `how` parent at `gpt-6-astra` high; linked child at `gpt-6-luna` high, verified from persisted turn contexts. | Same saved thread resumed, but native warning reported current default `gpt-6.1-sol`; model continuity is not established. |
| Claude Code | OMS 0.5.0 / 2.1.287 | Native Skill expanded; parent `claude-opus-5-5`, child `claude-sonnet-5`; child effort unknown. | Same saved parent session resumed and reread unchanged fixture; no running child was reattached. |
| OMP | OMS 0.5.0 / 18.3.2 | Corrected native command failed before a model turn because the existing `openai-codex` login had signed out. | Not retried; restore login through the native host before further acceptance. |

A fresh Codex cancellation stopped the coordinator after an in-progress sleep
request, but the sleep detached and exited naturally. That does not prove
contained cancellation or rejection of late writes. Claude rejected the test
sleep before execution, so its running-child cancellation case was blocked.
The fixtures remained unchanged and the final probe found no surviving sleep.

The separate local-store probe retained one event after identical replay,
rejected conflicting and stale-generation events, and returned `STORE_LOCKED`
for an existing lock. The Node/Bun macOS matrix independently exercised reopen,
duplicate, conflict and generation behavior. Neither result certifies native
host side effects or permits removing an orphan lock automatically.

## Evidence and provenance

The working evidence root is `/tmp/oms-checklist-evidence/`; a permanent copy
is retained at `~/.local/share/oh-my-stack/continuations/post-050-20261003/evidence/`. It includes
`decisions.tsv`, `workspace-audit.json`, installer before/after logs,
`host-acceptance/runtime-evidence.json`, `host-lifecycle/acceptance.md`,
`platform-matrix.json`, and focused recovery tests (**29 passed**).
Native host transcripts remain local. Delegation verification confirmed actual
child model/effort and parent linkage; encrypted parent spawn records prevent
an exact persisted role/task-text audit. Configured roles are not represented
as native custom-role activation.

The baseline [Ubuntu CI run](https://github.com/williamwue/oh-my-stack/actions/runs/37125585130)
was re-read at the exact v0.5.0 SHA as successful. It is evidence for that
published revision, not the current uncommitted follow-up or interactive hosts.

## Revised source verification

Independent diagnostic review found two malformed-observation gaps after the
initial 40-test result: default-mode false readiness and null-entry exceptions.
Both were reproduced as failing tests before correction. The revised focused
suite passed **42 tests**; the full source gate passed **235 tests**, with no
failures or skips. Generated Codex helper/documentation were regenerated from
source. The first rejected review and its logs remain in the decision trail. Final
independent review returned **PASS+NOTES**, with no remaining findings; it
reran the 42 focused tests and 16 additional reproduction combinations.

The follow-up changes are local and unpublished. No PR, branch push, merge,
protection change or plugin upgrade was performed in this continuation.

After review, the same 14 changed/new source files were copied into the original
checkout on `maintenance/post-050`, with matching per-file SHA-256 values and
tracked diff. Its current changes are this reviewed follow-up; the original
pre-convergence work remains in the preservation directory and retained stash.
