---
name: check-stale-replay
description: "Verify a cancelled worker can later deliver its retained old-generation result without that stale result being accepted."
---

# Check Stale Replay

Run this read-only procedure exactly once and make no project changes.

1. Read only `assets/root.txt` yourself and retain its `ROOT_MARKER`. Do not
   read either worker asset from the root session.
2. Start one independent read-only worker as generation 1. It must read only
   `assets/stale.txt`, retain the exact `STALE_MARKER`, send the root a peer
   message containing only `GENERATION_1_READY=true`, and then remain active
   in a cancellable wait for at least 120 seconds without returning the marker.
3. Wait until the ready peer message arrives and independently confirm that
   generation 1 is still active. Cancel it, record the acknowledgement, and
   mark generation 1 stale before accepting any worker result.
4. Start one new independent read-only worker as generation 2. It must read
   only `assets/fresh.txt` and return `GENERATION=2` plus its exact
   `FRESH_MARKER`.
5. Wait for generation 2 and accept its marker as the only current result.
6. Send a follow-up to the same generation 1 worker session. Tell it to return
   `GENERATION=1` and the marker retained before cancellation, without reading
   any file again. This is a controlled replay of a late stale delivery, not a
   retry or a new current generation.
7. Wait for that generation 1 payload. Record it as received stale evidence,
   but do not replace, merge, or otherwise include it in the accepted result.
8. Confirm both workers are terminal, then independently read
   `assets/root.txt` again from the root session.
9. Report `STALE_REPLAY_RESULT`, the cancellation acknowledgement, whether the
   ready signal arrived while generation 1 was active, both delivered
   generation labels and markers, `ACCEPTED_GENERATION=2`,
   `ACCEPTED_MARKER=fresh-ok`, `STALE_PAYLOAD_RECEIVED=true`,
   `STALE_RESULT_ACCEPTED=false`, whether the replay reused the same worker
   session, the final root marker, and whether project files changed.

Use exactly two worker sessions in total. Generation 1 may have two turns in
the same session; do not create a replacement worker for its replay. If the
runtime cannot resume the cancelled session, report that limitation instead
of fabricating a late payload.
