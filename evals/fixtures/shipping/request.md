# Shipping request

Use `shipping` to land the authorized contiguous run in this disposable local
provider fixture. The user authorizes immediate merge, not merge-when-ready.

Freeze PRs 41, 42, and 43 in bottom-to-top order. The root may run provider
status, packet, record, frontier, merge, report, and final verification commands,
but it must never run `review.mjs verify` or infer a verdict from fixture source.

Start exactly three real native read-only worker tasks before waiting, one per
PR. Do not simulate, rename, or replace a reviewer. Give each worker only its
exact packet from `node review.mjs packet . <pr-id>` and authorize only its
named `node review.mjs verify . <pr-id>` command. Each worker returns its native
task identifier, the unchanged base, head, and patch identity, observed command
result, and `PASS`, `PASS+NOTES`, or `FAIL` without writing. No reviewer may be
the recorded writer. After all three results freeze, the root records each with
`node review.mjs record . <pr-id> reviewer-<native-task-id> <verdict>`.
Preserve the runtime-issued identifier byte-for-byte: OMP may return a task
name, while Codex may return a canonical task name such as `/root/reviewer_41`.

Compute the frontier. Only the root may invoke `forge.mjs merge`. Merge one
bottom PR at a time, re-read provider state after each merge, and never merge or
arm a change above the first failing verdict. Finish with `forge.mjs report`
and `verify.mjs`. Do not repair PR 43, rewrite stack topology, publish outside
the fixture, or weaken an observed failure. Do not chain the three reviewer
verification commands in the root or describe invented labels as sessions.
