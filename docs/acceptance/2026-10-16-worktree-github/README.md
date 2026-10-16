# Worktree audit and native GitHub observation

This record covers the final reference-inspired infrastructure batch for the
0.19.0 source candidate. Official pstack 0.15.25 at `99743e9` remains the sole
workflow semantic source. pstack-claude remains a reference; no additional
semantic upstream, watcher or cleanup authority is introduced.

## Design and ownership

The parent grounded the existing GitHub provider, workflow adapter, generated
bindings and assessment before implementation. Two alternatives were compared:
a live worktree observer with explicitly forwarded GitHub budgets, and frozen
worktree evidence with an observation-local GitHub reader. The latter was
selected because supported host evidence belongs to the caller and all GitHub
reads can share one private budget. Pure classification remains private.

One available configured design runner produced both structurally distinct
alternatives. The configured Cursor seat could not run: `Provider cursor cannot
run child tasks`. It is recorded as a dropout; this was not a complete independent
two-model design panel. A fresh independent judge scored the alternatives
20/30 and 25/30 and recommended the second with numeric REST pagination,
current-context status semantics, explicit suite-cap proof, transport
cancellation and separate host coverage requirements.

The runner and judge both reported Codex / `gpt-6-astra`, matching their requested
model identities. Requested effort was respectively `xhigh` and `high`;
independent runtime enforcement of those options was not established. Two
implementation tasks reported Codex / `gpt-6.1-sol`, matching the prepared
feature route. Their requested `xhigh`/default-service options likewise are
requests, not backend proof. The saved model configuration was not edited.

## Behavior and evidence boundary

The [worktree helper](../../../tools/worktree-audit.mjs) freezes local physical
identity, HEAD, inventory and status, validates caller evidence, and re-observes
local state before classifying. All four host usage surfaces need separate
complete fresh evidence. Ignored content, local activity, locks and main
worktrees block candidacy. Hidden index entries and incomplete submodule
inspection stay unresolved. Squash proof binds the exact PR head and confirmed
merge result contained in the evidenced target; source-head ancestry alone is
insufficient. Candidate is advisory and does not permit deletion. See the
[evidence contract](../../worktree-audit.md).

The [GitHub provider](../../../tools/github-autopilot-provider.mjs) collects REST
and GraphQL pages with complete shapes, stable counts, unique IDs and advancing
cursors. Complete unfiltered suite inventory must prove the documented
1,000-suite cap cannot hide runs. The scoped reader covers identity, policy and
final PR/ref reads with one finite deadline, request and byte budget. Native
transport bytes include stdout and stderr; injected parsed JSON uses explicitly
approximate accounting. Existing authorization, journals and merge re-audits
remain in place. See the [provider guide](../../github-autopilot-provider.md).

## Local observations

The initial GitHub provider, pagination and workflow-adapter suites passed
56/56 tests under official Node 22.23.3 with zlib 1.3.1-e00f703. A real read-only
observation of `williamwue/oh-my-stack` PR #33 reported its merged state,
consistent identity, 11 requests and 71,310 actual stdout/stderr bytes. It was
not ready for merge; no mutation was attempted. This is one real GitHub read,
not proof of every pagination endpoint on a large live PR.

An additional parent subprocess probe found an inherited-pipe timeout gap:
a 500ms timeout killed the direct process but completion took 2,905ms while a
descendant retained stdio. The follow-up now observes actual direct-child exit and limits pipe draining
to 250ms. Eight handshake regressions for inherited stdout/stderr failed before
the fix and passed afterward, covering cancellation, timeout, output overflow
and successful direct exit with truncated pipes. Descendants stay alive until
fixture-owned cleanup. All 64 GitHub/provider/workflow tests passed in the
follow-up; final integrated checks are recorded separately.

The 20 worktree tests passed under the same pinned Node runtime, including
real Git worktrees, squash proof, hidden/ignored content, lock and permission
failures, path replacement, scan races, activity recovery, evidence age, command
output bounds and preservation of files/index/refs/worktrees. The real source
checkout scan resolved the exact repository and main worktree; assessment with
explicitly missing host evidence produced no cleanup candidate. No supported
host coverage was invented and no worktree was deleted.

The integrated `npm run check` passed under official Node 22.23.3 with zlib
1.3.1-e00f703: generated packages, current documentation facts, conformance,
eight reproducible release outputs, static/link validation, book validation,
Markdown and all 780 tests passed with zero failures or skips. The first
integrated attempt caught a missing package-local historical guide link; source
links were corrected before regeneration and the successful complete run.

Independent final reviews and installed release evidence remain separate gates.
This record does not claim publication, native installation or live model
option enforcement from the implementation task's completed status.

## Final native candidate gates

The default 0.19.0 archives were built locally and integrity-verified before
extraction. The [native candidate receipt](native-candidate.json) records a
real OMP installation in an isolated profile: list, doctor, complete bundled
`poteto-help` loading and uninstall cleanup passed without targeting the user's
profile. Real installed Pi ran the packaged extension with a simulated local
provider: discovery, native tool start/collect, completed child, cancellation,
parent shutdown, retry and requested/reported fixture model identity passed.
No real model account was called. These candidate gates precede publication;
they are not the later user-scope installation update.
