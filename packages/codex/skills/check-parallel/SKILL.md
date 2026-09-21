---
name: check-parallel
description: "Verify two independent read-only workers start before waiting and return separately attributable results."
---

# Check Parallel

Run this read-only procedure exactly once and make no project changes.

1. Read only `assets/root.txt` yourself and retain its `ROOT_MARKER`. Do not
   read either child asset from the root session.
2. Start exactly two independent read-only workers, one assigned only
   `assets/left.txt` and the other assigned only `assets/right.txt`.
3. Start both workers before waiting for either result. Do not run one worker
   to completion before starting the other.
4. Wait until both workers finish and collect both results. Keep each marker
   attributable to its assigned worker and path.
5. After both results are collected, independently read `assets/root.txt`
   again from the root session.
6. Report whether both workers were active before the wait, both results were
   collected, all three markers match their expected labels, the root
   performed the final independent read, and no project files were changed.
