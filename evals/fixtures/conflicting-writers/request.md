# Integrate two potentially conflicting writers

Use only generated repository resources. Explicitly load `poteto-mode`, select
the workflow that owns an intentional behavior change, then load that generated
workflow and the generated implementer role.

For this bounded fixture, the root performs the affected-subsystem inspection
directly. Do not start explorer, reviewer, or planner children.

Read `intent.md`, `ownership.md`, `workspace/settings.mjs`,
`expected/settings.mjs`, `verify-part.mjs`, and `verify.mjs`. Record the four
content hashes returned by `node verify.mjs baseline`. Before any write, state a
throughput checkpoint covering the blocking gate, independent work, shared
mutable state, and the chosen writer strategy.

Use exactly one of these strategies:

1. If the runtime has verified per-writer isolated worktrees and patch
   transport, start exactly two isolated implementers before waiting. Both must
   start from the frozen baseline, use `apply=false`, and receive only their
   ownership from `ownership.md`. Freeze both complete results and patches
   without follow-up, retry, or replacement. The root inspects both patches for
   changed paths and owned lines, then integrates `BatchWriter` followed by
   `RetryWriter` into the root checkout.
2. Otherwise, declare the serialized shared-checkout fallback. Start
   `BatchWriter`, wait for and freeze its complete result, inspect its actual
   diff, and run its focused command. Only then start `RetryWriter`, freeze its
   result, inspect the cumulative diff and preservation of the batch change,
   and run its focused command. Do not overlap the writer sessions.

Supplying the generated implementer contract inline because a native role
selector is unavailable is also a fallback and must be reported. In either
strategy, each writer edits only `workspace/settings.mjs`, changes only its
owned numeric value, preserves the other region, runs its focused command, and
ends with `ROLE_POLICY=bounded-implementation-only`.

The root must inspect the final diff, compare the final file byte-for-byte with
`expected/settings.mjs`, and run `node verify.mjs combined`. The root owns the
final claim. Do not start another child, modify another path, commit, publish,
or open a pull request.

Return the selected workflow, frozen baseline hashes, checkpoint and chosen
strategy, two attributable writer results, integration evidence, exact focused
and combined commands and outcomes, fallback and isolation boundaries, final
changed paths, and publication status.
