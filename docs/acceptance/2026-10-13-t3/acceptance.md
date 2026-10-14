# T3 source candidate acceptance

The local implementation on `codex/t3-orchestration` supports an explicitly
selected T3 orchestration build. Codex and Claude Code retain their package
formats. Default generation, OMP and Pi keep their native output.

```bash
node tools/generate.mjs --orchestration t3 --output-root .tmp/t3
```

The maintainer can generate candidate packages and prepare complete T3-owned
child requests using the live provider/model catalog. Separate T3 resolution
preserves ordered panels and typed options. Fresh review rounds receive new
identities, while retries retain the saved request. Result observation separates
the original task, later child work, wait timeout, and observed interruption.

The implementation consists of one local request-preparation module, a
generator binding, a resolution schema, generated role contracts, and English
and Chinese guides. It introduces no provider transport or daemon. Runtime
execution remains with T3 tools.

## Evidence

- [Repository verification](verification.json) records 434 passing tests, zero
  failures and two skips, plus 30 passing focused tests. The
  [check summary](check-summary.txt) preserves the aggregate stages and counts.
- The complete check used a temporary Node preload to restore the library
  search path for copied Homebrew Node binaries. The baseline had the same
  loader failure before source changes. No test assertions or product source
  were changed to suppress it.
- Default and selected generation checks passed. Default `packages`, pinned
  Skill bodies, and parity derivations have no changes. OMP/Pi equality is
  checked by the generation tests.
- [Live probes](live-probes.json) record an actual read result, retry reuse of
  the same task ID, a wait timeout while work remained live, and interruption
  observed after a cancellation request with no pending work.
- [Cursor probes](cursor-probes.json) subsequently verify the same read, retry
  and interruption behavior across providers. The explicit Haiku option
  combination was rejected by the SDK despite appearing in its catalog.
  The same model succeeded with options unpinned. Effective option enforcement
  remains unverified.
- [Extracted SDK observations](cursor-sdk-observations.json) retain the model,
  parameters, result, source record hashes and timestamps for the rejected
  Haiku request, successful unpinned request, and Opus trail review. Opus's
  accepted request reports `effort=high`; backend enforcement is unverified.
- [Candidate installation acceptance](installation.md) verifies native install
  and discovery of 76 Skills in each isolated candidate, explicit native `how`
  loading, and an installed simple workflow through one real T3 explainer per
  host. Claude loaded its installed cache through session-only `--plugin-dir`,
  rather than its isolated manager registration. Native entry and T3 workflow
  were tested separately; Claude registration-to-session loading and a T3 UI
  picker flow remain unverified. [The receipt](installation-receipt.json) records
  cache equality, task identities and preserved normal plugin settings.
- [Independent code review](code-review.md) found three defects. All were fixed
  and covered by behavior tests. Both fresh round-two reviewers returned
  `No findings`. [Task receipts](review-evidence.json) preserve their identities.
- [Trail review](trail-review.md) found no new contradictions. Its frozen-snapshot
  pending-review flag was resolved by the later Sol receipt. Its different-family
  limitation was subsequently filled by the [Cursor Claude review](cursor-trail-review.md).
  That review found four recordkeeping issues. Round two independently verified
  three fixes; the coordinator completed the remaining index-operation record
  against the original transcript. No implementation defect was reported.

## Principles and concrete choices

| Principle | Choice it shaped |
| --- | --- |
| Foundational Thinking and Model the Domain. | Separate installation host, orchestration, target selection, request identity and observed lifecycle state. |
| Exhaust the Design Space. | Compare two independent designs before selecting the smaller orchestration axis. |
| Laziness Protocol. | Keep one local helper and reuse native packaging without a fifth adapter or daemon. |
| Build the Lever. | Generate bindings, role contracts and candidate packages from source. |
| Boundary Discipline. | Validate captured catalogs, configuration and output paths at the boundary. |
| Separate Before Serializing Shared State. | Assign implementation units separate worktrees and file ownership. |
| Make Operations Idempotent. | Preserve request identity across retries and use a fresh identity for each review round. |
| Sequence Work into Verifiable Units. | Verify domain support, generation and integrated behavior before handoff. |
| Test Behavior, Not Implementation. | Exercise null-to-assigned task identity and protect real fixture source/output files. |
| Prove It Works. | Run actual T3 read, retry and cancellation probes separately from fixtures. |
| Never Block on the Human. | Complete authorized reversible fixes and validation without another confirmation round. |

## Remaining evidence limits

This is a reviewed local source candidate with isolated installation acceptance.
The normal plugin registrations were not replaced. No commit, publication, PR,
merge or deployment was performed. The unrelated `package.json` package-manager
modification was preserved.

Claude installation-host live execution is verified for the bounded `how`
simple workflow. A Claude lifecycle sweep, T3 UI Skill picker-to-workflow path,
effective T3 option enforcement, PR watches, persistent schedules, browser and
device behavior remain unverified. Their instructions or fixtures do not
establish live acceptance.
The initial run had only Codex available. Cursor was later authenticated and
cross-provider execution was verified using its Claude Haiku model. The initial
Astra trail reviewer was an independent same-family fallback. The later Cursor
Claude review completed and its result is recorded separately. Source-check
evidence remains a timestamped snapshot; later live probes have their own
timestamps. Two missing temporary worktree registrations and their local
branches remain preserved, as documented in `worktree-disposition.json`.
Native encrypted task messages cannot establish exact prompt provenance.
