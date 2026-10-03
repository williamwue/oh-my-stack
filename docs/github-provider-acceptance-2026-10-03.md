# GitHub provider continuation — October 3, 2026

## Frozen intent and scope

The user asked to continue improving OMS after a read-only pstack parity audit.
The selected `feature` unit adds an actual GitHub transport and durable
reconciliation for interrupted PR operations. Its baseline is
`52bec251d379799afc56a3eb538ad82e68908020`. It is source tooling; the 74-Skill
catalog and installed plugin version are unchanged.

The implementation keeps the disposable provider intact and uses a separate
GitHub module. This keeps deterministic fixtures offline and prevents their
simulated approvals and CI states from being mistaken for remote evidence.
The direct design reuses `DurableRunState`; a new scheduler or unified
credential service is not needed for this bounded unit.

## Throughput checkpoint

- One implementation writer owns the provider and its tests in an isolated
  worktree. The root owns documentation, executable inventory and integration.
- The mutable shared resource is the per-run operation journal. An intent must
  be durable before any remote mutation; local writers serialize and unresolved
  operations stop subsequent writes.
- Tests, provider readback and independent review are completion gates for the
  source change. Live publication or merge requires an explicit target and
  action scope beyond this implementation request.
- Existing book, package and documentation edits in the user's checkout remain
  independent. Integration adds only this unit's files and inventory entry.

## Evidence boundaries

Before implementation, the existing durable store, disposable provider and
failure/security suites passed 22 tests on this Mac. Native official `gh`
read-only calls verified account `williamwue` and repository
`williamwue/oh-my-stack`, default branch `main`, neither archived nor a fork.
Those calls did not create a PR, run CI, merge or release anything.

The new provider's deterministic tests cover real API-shaped responses and
subprocess behavior. They remain distinct from authenticated hosted writes.

## Completed source verification

| Check | Observed outcome |
| --- | --- |
| `node --test tests/github-autopilot-provider.test.mjs tests/durable-run-state.test.mjs tests/autopilot-provider-adapter.test.mjs` | 36 passed, including 20 new provider tests |
| The same suites plus `tests/failure-security.test.mjs` after integration into the user's checkout | 42 passed; integrated provider/test hashes match the independently reviewed versions |
| `npm test` in the isolated source worktree | 198 passed, 1 pre-existing repository-validation failure; 199 total |
| `npm run generate:check` | Three generated targets, 74 public Skills verified |
| `npm run conformance:check` | Twelve retained conformance records verified; no new workflow execution claim |
| `npm run release:check` | Seven reproducible release outputs verified; no publication |
| Executable inventory and local Markdown-link validators | Passed |
| Markdown lint on all five changed/new documentation files | Passed |
| Live `inspect-repository` | Native account and exact repository read succeeded |
| Live `inspect-pr` using historical merged PR 1 as read-only test input | Returned exact revisions and merged state; missing current review information left `ready: false` |

The full validator fails on an absolute home path in
`docs/operations/cloud-management-acceptance-2026-10-01.md`. This was reproduced
in a separate clean checkout of the baseline commit. The same issue accounts
for the one failing test in `npm test`. Full Markdown lint reports 12 existing
issues across `AGENTS.md`, `docs/omp-18.2.9-live-test-plan.md` and two operations
documents. All four files match baseline Git content. No historical evidence
was rewritten and no validation gate was disabled. The complete repository
gate is therefore still failing; the source feature's passing checks do not
override that result.

Independent review found two P1 defects in the first candidate: a stale
instance could repeat an uncertain merge after an idempotent intent append,
and branch names were missing from authorization/review bindings. Both were
reproduced and fixed with negative tests. Re-review observed one PUT only
(`STALE_JOURNAL` on the stale retry), zero POSTs for same-SHA branch substitution
(`UNAUTHORIZED`), and no PUT for a retargeted PR (`MERGE_BLOCKED`). A later stdin
library-import defect was also fixed and independently rechecked together with
symlink invocation and CLI mutation rejection. Final review returned no findings
within these frozen scopes.

Final reviewed source SHA-256 values:

- `tools/github-autopilot-provider.mjs`:
  `6c08a3182afedbcc70a19e7cb2d6c786a10ca015eda9910a164dffc83cf5a440`
- `tests/github-autopilot-provider.test.mjs`:
  `b781d6d0decfd28b782e0947626a569dfbb8599b7e898c31935c69cf50773fc6`

Delegation verification checked the implementer's `gpt-6-sol/high` and separate
reviewer's `gpt-6-astra/high` against persisted parent/child records. Parent
spawn-message text was encrypted, so its exact role/task text was not audited;
native custom-role activation is not claimed. The root independently inspected
the diff, reproduced the duplicate request and import defects, ran the source
checks and performed the live read-only inspections.

No hosted PR creation, new CI execution, approval, merge, commit, push, release
or global plugin upgrade was performed in this continuation. The existing PR
was only a read-only API fixture, not a change under review in this task.
The integrated inventory retained all pre-existing entries, and unrelated book,
README, package and Markdown configuration edits were preserved.

## Remaining parity boundary

GitHub accepts an expected head SHA for a merge, but no atomic expected base
SHA. Strict target-revision programs therefore remain unsupported by this
adapter. Explicitly accepting normal server-policy merge behavior must not be
used to silently weaken `autopilot-full` countersigns.

This unit does not implement native worker reattachment, a persistent scheduler,
all-Skill end-to-end coverage or authenticated Benny/webhook services. It does
not authorize publication, deployment or a global plugin upgrade.
