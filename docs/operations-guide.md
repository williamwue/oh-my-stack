# Local operations guide

This guide covers the source tooling introduced in 0.3.0. It checks local run state and evidence. It does not operate a hosted
service or certify full pstack behavior.

The subsequent [GitHub provider](github-autopilot-provider.md) adds real
read-only account/repository/PR observation and a separately authorized library
interface for PR creation, merge and interrupted-operation reconciliation.
Its CLI remains read only. Hosted write acceptance and strict atomic target
revision protection are separate from the local tools described below.

The current Codex candidate also bundles a
[single-PR workflow helper](github-workflow.md), its provider, and durable
store dependency. Its CLI supports inspection and reconciliation; only the
library accepts authorized publication or merge. Reconciliation can update
the private local journal while performing only remote reads. These candidate
package files do not upgrade the user's existing plugin.

## Prerequisites and first checks

Use a Git source checkout with Node.js 20 or newer. Run commands from that
checkout. The `tools/*.mjs` commands are source tooling; the published Codex,
OMP, and Claude packages do not install them as global commands. Keep a backup
of any run and evidence files before manual recovery. Choose a store root that
contains separate run and evidence files, and retain the persisted runtime
matrix generated for this exact Git revision. Do not put credentials, private
transcripts, or sensitive command arguments in receipts or matrix probes.

```sh
node tools/operations-doctor.mjs --help
node tools/operations-doctor.mjs --store-root /store --run-store /store/run.json --evidence-store /store/evidence.json --matrix /store/matrix.json --run-id run-1 --generation 0 --json
```

Omit `--json` for a human report. Add `--source-root /checkout` if the command
is run outside the source checkout. The doctor resolves `git rev-parse HEAD`
there, rejects staged or modified tracked files as `SOURCE_DIRTY`, validates
the run store, checks current run evidence, and loads the matrix for that
revision. Untracked acceptance artifacts are ignored by the source check; they
are not source-revision evidence. It inspects both store lock paths. Every failed check
has a stable code and action; exit 0 means all checks pass, exit 1 means a check
failed, and exit 2 means invalid invocation. The CLI only reads local files and
does not output receipt commands, probe output, file contents, or error text
from untrusted files. A passing report is local consistency evidence, not proof
that a hosted provider, browser, or external merge worked.

The matrix can be created with the source harness, for example:

```sh
node tools/runtime-matrix.mjs --revision "$(git rev-parse HEAD)" --output /store/matrix.json
```

The example harness runs its declared local Node probe. Further runtime
capabilities need their own probes and evidence; an unavailable runtime remains
`unknown` or `unsupported`. The matrix command writes its explicit output file.

## Recovery and contention

The run and evidence stores use revision-bound event logs. Reopen an existing
run with its saved ID and generation; do not overwrite or silently migrate the
file. A `RUN_INVALID` or `EVIDENCE_INVALID` result calls for inspecting a backup
and the relevant schema. `EVIDENCE_STALE` means a receipt was recorded for an
older run revision or source commit; rerun verification and record a new
receipt. `MATRIX_STALE` requires a new probe at the current source revision.
`RUNTIME_UNKNOWN` and `RUNTIME_UNSUPPORTED` cannot support a passing claim.

Appending to a store uses a short-lived `.lock` file and may return
`STORE_LOCKED` after contention. A doctor `LOCK_PRESENT` result is a snapshot:
inspect the process that may own the store, its progress, the lock timestamp,
and the run's event revision. On Windows, inspect the process ID through Task
Manager or `Get-Process`; on POSIX, use an equivalent process listing. If the
writer is still alive, wait or coordinate with it. If the lock appears orphaned,
preserve the store and lock for investigation and follow the local incident
procedure before any manual change. Age alone is insufficient proof that a
lock is orphaned. The doctor never removes a lock, retries a write, or rewrites
a store.

Before resuming, verify the saved run generation, source revision, and
checkpoint. Keep one authoritative writer per run. A completed or failed run
can receive new evidence in its separate store, but a new attempt should have
its own generation. Existing store schema versions require explicit migration
and backup review; this tool does no automatic store rewrite. For verification
receipt format and status semantics, see [run evidence](run-evidence.md).

## Support boundary

The 0.3.0 release includes these tools in its source checkout. These source
commands are local development and operations aids; they do not install a
daemon, scheduler, credential service, or authenticated provider backend.
Hosted autopilot and complete cross-platform host compatibility need separate
implementation and live evidence. Bounded external PR/CI/merge and current
macOS probes have their own [acceptance records](checklist-continuation-2026-10-03.md). See the
[support policy](support-policy.md) and [project status](project-status.md).
