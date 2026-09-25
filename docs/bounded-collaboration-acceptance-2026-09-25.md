# Bounded collaboration acceptance — 2026-09-25

This is a read-only disposable-repository test, not acceptance of concurrent
writers, real pull requests, provider failures, or all Cursor pstack behavior.
OMP 18.3.0 and Codex CLI 0.155.1 used the beta.2 candidate package's Skill
instructions and helpers, but the user's normally installed plugins remained
beta.1. No personal plugin or model configuration was changed.

## Failed worker and route evidence

- OMP task `01a0d6d5-e92f-7612-bb4f-795549134b66` launched native
  `AbsentFileProbe`. Its read of a deliberately absent file returned BLOCKED;
  the root confirmed absence and reported INCOMPLETE. The beta.2 setup audit
  matched native `swarm.workers` at `openai-codex/gpt-6-sol@high`, with 35 owned
  role files verified. An earlier `always-ask` non-interactive attempt could
  not approve task dispatch and was not counted as a worker test.
- Codex task `01a0d6d7-753f-7fe1-a1dd-216fd15e013b` explicitly spawned
  `/root/absent_file_probe`. The child returned BLOCKED, the root confirmed the
  absent file and reported INCOMPLETE. Parent/child setup audit matched
  `gpt-6-sol@high`; the parent record encrypted the exact task message, so
  byte-for-byte message inspection was unavailable. Neither audit assesses
  task outcome by itself; the terminal reports and file checks supply that
  separate evidence.

## Parallel drain and bounded retry

The disposable Git repository began with one committed marker in `good.txt`.
OMP session `01a0d6d9-ef39-7178-88c3-486a6eb1e68b` launched GoodSlice and
MissingSlice in one native batch, drained both, then retried the missing slice
once as MissingRetry with the same read-only brief. The first slice passed;
both missing-file attempts returned BLOCKED. The root independently read both
paths and reported overall INCOMPLETE. All three children reported native role
`ohmystack-swarm-workers`, model `openai-codex/gpt-6-sol`, and high effort.

Codex session `01a0d6dc-2ebf-7892-a45e-58efadf9dc07` spawned good_slice
and missing_slice before either wait, drained both, then spawned missing_retry
once. Its root likewise reported PASS / BLOCKED / BLOCKED and overall
INCOMPLETE after independent reads. Three separate parent/child audits matched
the prepared `swarm.workers` requests and observed `gpt-6-sol@high` contexts.
The disposable repository HEAD remained unchanged and clean after both runs.

## Cancellation boundary

Codex session `01a0d6e0-680c-7c12-9891-3b575547e2e5` spawned generation 1,
then called its native interrupt while the child was running; the operation
returned `previous_status: running`, and the child ended interrupted. A new
generation returned `fresh-ok`, which was the sole accepted marker. No late
generation-1 payload arrived, so natural late-result rejection is not proven.
The cancelled child never exposed a turn context, so its runtime model/effort
cannot be certified from a child turn; the fresh child did expose
`gpt-6-sol@high`.

OMP 18.3.0 non-interactive session
`01a0d6df-27cd-77b9-a9a4-2ab680e7fd9c` did not expose a native `hub`
cancel/status operation in its available tool set. The probe stopped before
launching generation 1 and reported UNVERIFIED. This was a deprecated-interface
probe, not evidence that OMP cancellation was unavailable. OMP's bundled
`omp://tools/task.md`, `wait.md`, and `write.md` describe background jobs via
`proc://`: `read proc://<id>` inspects status and `write proc://<id>/kill`
cancels with approval. The OMP 18.3.0 release notes also mark `hub` deprecated.

A corrected non-interactive session
`01a0d6ec-78dd-753a-9f39-263a401d1ad8` launched StaleGeneration,
cancelled it through `write proc://StaleGeneration/kill`, inspected its
cancelled state, then launched and drained FreshGeneration. The fresh child
returned `FRESH_MARKER=fresh-ok`; the root recorded
`STALE_RESULT_ACCEPTED=false`. No natural late stale payload arrived, so
delayed-result rejection remains unverified. The command used explicit
execution approval for the native cancellation call. This proves the bounded
cancel-and-replace path on the tested OMP surface, not every interactive UI
or host version.

## Cold-start pickup

OMP session `01a0d6e2-b07e-76fc-b8e3-4ff876cac788` verified unit A and
wrote a checkpoint outside the disposable repository with branch `main`, HEAD
`587e2849d7786046e2ecdaea0301ba6c8e50c4cf`, and unit B pending. It
explicitly left the clean-state check to resume. A fresh Codex session
`01a0d6e3-a9f0-7432-af57-c22c71b89881` verified repository, branch, HEAD,
and clean state, then read only `second.txt`. It inherited A without rereading
it and reported B complete. This is a cross-host, read-only checkpoint pickup,
not native restoration of an in-flight worker or external provider.

After the fixture HEAD deliberately advanced to
`cdd1a6968b7d8480b248625db919aba4f48007eb`, a second fresh Codex session
`01a0d6e4-ab28-7651-9ff3-99804de64621` stopped with STALE_CHECKPOINT
before reading B. It did not repeat A. The checkpoint and OMP session records
are local test artifacts under `/tmp/ohmystack-negative-CSoKDp/`; Codex JSONL
records are in the user's local session store. They are not release assets.

## Remaining acceptance

Verify real timeout and delayed-result handling, active-worker recovery
after coordinator restart, and an isolated concurrent-writer scenario. Re-run
installed beta.2 plugin-native selection and model-facing execution before
claiming beta.2 end-to-end acceptance. Unrelated optional MCP authorization
warnings did not participate in these local read-only cases.
