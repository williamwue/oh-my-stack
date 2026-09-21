---
name: check-follow-up
description: Verify a second read-only instruction continues on the same delegated worker with preserved context.
---

# Check Follow Up

Run this read-only procedure exactly once and make no project changes.

1. Read only `assets/root.txt` yourself and retain its `ROOT_MARKER`. Do not
   read either worker asset from the root session.
2. Start exactly one independent read-only worker. Ask it to read only
   `assets/seed.txt`, return `SEED_MARKER`, and retain that value.
3. Wait for and collect the first result.
4. Send a second instruction to that same worker without starting another
   worker. Ask it not to reread the seed asset, to repeat the retained value as
   `REMEMBERED_SEED_MARKER`, and to read only `assets/follow-up.txt` for
   `FOLLOW_UP_MARKER`.
5. Wait for and collect the second result from the same worker identity.
6. Independently read `assets/root.txt` again from the root session.
7. Report whether exactly one worker handled both turns, the worker retained
   the seed value without rereading it, both results were collected, the root
   performed the final independent read, and no project files were changed.
