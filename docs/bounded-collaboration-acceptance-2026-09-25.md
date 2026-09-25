# Bounded collaboration acceptance — 2026-09-25

These are bounded disposable-repository tests, not acceptance of real pull
requests, provider failures, or all Cursor pstack behavior. The first suite
was read-only; a later isolated-writer fixture modified only its disposable
repository.
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

OMP session `01a0d787-2771-76c5-8772-d3d204b662e0` separately declared
an eight-second worker deadline. The persisted parent calls show one native
task, an actual `sleep 8`, non-consuming `read proc://DeadlineSleeper` while
the worker was still running, `write proc://DeadlineSleeper/kill`, and a second
status read confirming cancellation. The disposable repository stayed clean.
This verifies deadline-driven cancellation, not natural late-result delivery.

Codex CLI session `01a0d787-900b-77e0-a47f-9e056db4f6d9` ran the generated
`check-stale-replay` probe from a disposable project. Generation 1 sent a
ready signal while active, was interrupted, and generation 2 returned
`FRESH_MARKER=fresh-ok`. A follow-up to the *same* generation-1 session then
delivered its retained `STALE_MARKER=late-generation-one-must-be-rejected`.
The root reported `STALE_PAYLOAD_RECEIVED=true` but retained
`ACCEPTED_GENERATION=2` and `STALE_RESULT_ACCEPTED=false`. The parent record
contains the spawn, interrupt, second spawn, and follow-up calls in that order;
external Git status stayed clean. This is controlled replay, not a naturally
racing network response. OMP hard cancellation has not been shown to permit
same-session replay.

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

## Active-worker process boundary

OMP session `01a0d785-f6ab-7335-932e-8a7a9033e36e` launched one read-only
`RecoverySleeper` job and exited normally while it was active. The child JSONL
recorded `stopReason=aborted` at parent disposal, before its promised
90-second sleep and result. A fresh process resuming that same session read
the old transcript but found no live `proc://` job and no `agent://` result;
it reported `ACTIVE_WORKER_RECOVERY=UNVERIFIED` without spawning a replacement.
The fixture stayed clean. This is evidence against claiming native live-worker
reattachment after a completed OMP coordinator process, not a forced-crash
test. The validated checkpoint pickup above remains the safe recovery path
for completed units; pending work must be re-evaluated and newly dispatched.

## Isolated concurrent writers

OMP session `01a0d783-36e9-73a2-95a7-7d3c757ac84f` used a disposable
`conflicting-writers` fixture at baseline
`67a0de36a6b9e3b55ec3626d73c3b3b5bd2b9a01`. The native task call
started `BatchWriter` and `RetryWriter` in one batch, both selecting
`ohmystack-code-feature-refactoring` with `isolated: true`; a run-local OMP
overlay set `task.isolation.enabled: true` and `apply: false`. Before root
integration, the source checkout was clean at its original file hash. Each
child returned a retained patch against the same baseline and passed its
focused command. The root inspected the ownership-limited patches, then
applied the two numeric edits in order. External verification confirmed the
only diff was `workspace/settings.mjs`, `node verify.mjs combined` passed,
and the final file matched `expected/settings.mjs` byte-for-byte. This proves
one current OMP isolated-writer case; it used the existing user-configured
native agent, not a newly installed beta.2 plugin package. No commit or
publication occurred.

## Remaining acceptance

The OMP deadline/cancel path, Codex controlled stale replay, and one OMP
isolated concurrent-writer case now have positive evidence. Still unverified:
natural late delivery on either host, OMP same-session stale replay after hard
cancel, and native live-worker reattachment after coordinator process exit.
Cold checkpoint pickup is a fallback, not the latter capability. Re-run
installed beta.2 plugin-native selection and model-facing execution before
claiming beta.2 end-to-end acceptance; the new model sessions used a
project-local Codex probe or the existing OMP user agent. Unrelated optional
MCP authorization warnings did not participate in these local cases.
