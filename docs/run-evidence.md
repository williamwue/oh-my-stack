# Run verification receipts

`tools/run-evidence.mjs` records verification observations for an existing
`DurableRunState` run. The run store is read only. Receipts go into a separate
`DurableRunState` event log, so a completed or failed run can still receive
verification evidence. Both files must be inside the explicit store root.

A receipt identifies the exact command arguments, observed exit code, run ID,
generation, run revision, and full source commit. Optional SHA-256 digests can
identify captured stdout and stderr without storing transcripts. Each named
check has an explicit `pass`, `fail`, or `unknown` status. The caller supplies
the observation; this tool does not execute the command or infer a pass from
exit code zero. A nonzero exit code requires at least one failed check. Keep
secrets, credential-bearing arguments, and private output
out of receipts. The schema rejects extra fields and obvious secret-bearing
names or arguments; it cannot detect every sensitive string.

Example receipt:

```json
{
  "receiptId": "unit-1",
  "runId": "run-1",
  "generation": 2,
  "runRevision": 3,
  "sourceCommit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "command": ["node", "--test", "tests/unit.test.mjs"],
  "result": { "exitCode": 0 },
  "checks": [
    { "name": "unit", "status": "pass" },
    { "name": "browser", "status": "unknown" }
  ]
}
```

Record a receipt with:

```sh
node tools/run-evidence.mjs record --run-store /store/run.json --evidence-store /store/evidence.json --store-root /store --source-commit aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa --receipt /store/receipt.json
```

Read the current status with:

```sh
node tools/run-evidence.mjs status --run-store /store/run.json --evidence-store /store/evidence.json --store-root /store --source-commit aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa --run-id run-1 --generation 2 --json
```

Omit `--json` for a compact human report. Status reads do not create or change
files. Receipts from another run revision or source commit are listed as stale
and never count as current passes. With no current receipt, status is `stale`
when prior evidence exists and `unknown` otherwise. For current checks, any
failure makes the aggregate `fail`; otherwise any unknown makes it `unknown`;
all current checks must pass for `pass`. Later receipts can update a named
check while the full event history remains intact.

The first writer creates the evidence store. Replaying an identical receipt ID
is idempotent; a different payload under that ID is rejected. The durable
store serializes individual appends with a lock and rejects stale revisions.
This does not authorize independent workers to share ownership of one run:
coordinate one authoritative writer and inspect lock contention before manual
recovery. No network requests or external actions are made by this tool. The
caller remains responsible for running the stated command, confirming its
source commit, and deciding whether its checks justify a broader release
claim. The read-only [operations doctor](operations-guide.md) checks the saved
run, evidence, matrix, and lock paths against the current source revision.
