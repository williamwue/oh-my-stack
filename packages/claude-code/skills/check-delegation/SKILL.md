---
name: check-delegation
description: Verify one read-only delegated worker, result collection, and independent root verification.
---

# Check Delegation

Use this procedure exactly once and make no project changes.

1. Read only `assets/root.txt` in this Skill directory yourself and retain its
   `ROOT_MARKER` value. Do not read the child asset from the root session.
2. Start exactly one independent read-only worker. Ask it to read the same
   Skill's `assets/child.txt` file and return its `CHILD_MARKER` value with the
   file path as evidence.
3. Wait until that worker finishes and collect its result.
4. After collecting the result, independently read `assets/root.txt` again
   from the root session. Do not accept the worker report as root evidence.
5. Report whether one worker started, its result was collected, both marker
   values match, the root performed the final independent read, and no project
   files were changed.
