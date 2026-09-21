---
name: check-panel
description: Verify parallel independent candidates, frozen review inputs, and separate review and synthesis sessions.
---

# Check Panel

Run this read-only procedure exactly once and make no project changes.

1. Read only `assets/root.txt` yourself and retain its `ROOT_MARKER`. Do not
   read either candidate asset from the root session.
2. Start exactly two independent read-only candidate sessions. Assign the
   first only `assets/candidate-a.txt` and the second only
   `assets/candidate-b.txt`. Each candidate must return the exact `OPTION`,
   `SCORE`, and `EVIDENCE_MARKER` from its assigned asset. A candidate may
   receive or inspect workflow instructions, but its assigned candidate asset
   must be the only evidence asset it reads.
3. Start both candidates before waiting for either result. Do not expose one
   candidate's work to the other.
4. Wait for both candidates and capture their complete, separately
   attributable results. Treat those captured strings as frozen: do not ask a
   candidate to revise them and do not rewrite them before review.
5. After both results are frozen, start one new read-only reviewer session.
   Give it both captured candidate strings verbatim. Instruct it to select the
   candidate with the greater numeric `SCORE`, reject any marker not present
   in the frozen strings, and return `REVIEW_WINNER`, `WINNING_SCORE`, and
   `WINNING_EVIDENCE_MARKER`. The reviewer may receive or inspect workflow
   instructions, but must not read root or candidate assets and must base its
   decision only on the frozen strings.
6. After the review result is frozen, start one different new read-only
   synthesizer session. Give it both frozen candidate strings and the frozen
   reviewer result verbatim. Instruct it to verify the arithmetic and return
   `SYNTHESIS_WINNER`, `WINNING_SCORE`, `WINNING_EVIDENCE_MARKER`, and
   `REVIEW_CONSISTENT`. The synthesizer may receive or inspect workflow
   instructions, but must not read root or candidate assets and must base its
   decision only on the frozen strings.
7. Collect the synthesis result, then independently read `assets/root.txt`
   exactly once again from the root session.
8. Report `PANEL_RESULT` with both candidate records, reviewer and synthesis
   winners, whether both candidates were active before the first wait,
   whether candidate inputs froze before review, whether reviewer and
   synthesizer used distinct new sessions, whether their decisions agree,
   whether the root marker was independently re-read, and whether project
   files changed.

Use exactly four child sessions in total: two candidates, one reviewer, and
one synthesizer. Never retry, replace, or duplicate a terminal child session.
If any child result is malformed, report the failed invariant instead of
starting another child. After the final root read, use no more operations and
return the result immediately.
