---
name: check-cancellation
description: "Verify an active delegated worker can be cancelled and its generation excluded from accepted results."
---

# Check Cancellation

Run this read-only procedure exactly once and make no project changes.

1. Read only `assets/root.txt` yourself and retain its `ROOT_MARKER`. Do not
   read either worker asset from the root session.
2. Start one independent read-only worker as generation 1. Tell it to read
   only `assets/stale.txt`, perform a deliberately long analysis of that file,
   and return its marker only after the analysis finishes.
3. As soon as generation 1 is running, cancel it. Record the cancellation
   acknowledgement and mark generation 1 stale before accepting any result.
4. Start one new independent read-only worker as generation 2. Tell it to read
   only `assets/fresh.txt` and return `FRESH_MARKER`.
5. Wait for generation 2 and accept only its result. If any generation 1
   output arrives after cancellation, record it as stale evidence but do not
   include its marker in the accepted result.
6. Confirm generation 1 is no longer running. Independently read
   `assets/root.txt` again from the root session.
7. Report the cancellation acknowledgement, generation 1's terminal status,
   `ACCEPTED_MARKER`, `STALE_RESULT_ACCEPTED=false`, the final root marker,
   and whether any project files changed.
