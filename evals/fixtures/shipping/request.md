# Shipping request

Use `shipping` to land the authorized contiguous run in this disposable local
provider fixture. The user authorizes immediate merge, not merge-when-ready.

Freeze PRs 41, 42, and 43 in bottom-to-top order. Assign one distinct read-only
reviewer session per PR; no reviewer may be the recorded writer. Each reviewer
must bind its verdict to the exact base, head, stable patch identity, and
`node review.mjs verify . <pr-id>` result, then record it with `review.mjs`.

Compute the frontier. Only the root may invoke `forge.mjs merge`. Merge one
bottom PR at a time, re-read provider state after each merge, and never merge or
arm a change above the first failing verdict. Finish with `forge.mjs report`
and `verify.mjs`. Do not repair PR 43, rewrite stack topology, publish outside
the fixture, or weaken an observed failure.
