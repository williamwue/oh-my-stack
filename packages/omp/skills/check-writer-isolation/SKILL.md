---
name: check-writer-isolation
description: "Verify one delegated writer changes only an isolated workspace while a separate observer remains read-only."
---

# Check Writer Isolation

Run this controlled fixture exactly once. Modify only the named fixture file.

1. Read the Skill-owned `assets/root.txt` and the project-owned
   `.oh-my-stack-eval/writer-isolation/writer.txt` from the root session.
   Retain the root marker and confirm the initial writer state is `base`.
2. Start one independent read-only observer. Ask it to read only
   `.oh-my-stack-eval/writer-isolation/writer.txt`, report
   `OBSERVED_STATE=base`, and make no changes.
3. Collect the observer result and independently confirm that the fixture file
   remains unchanged.
4. Establish exactly one runtime isolation boundary for the writer:
   - Treat the root session's starting checkout as the source checkout by
     default. A temporary directory, or a path different from the project that
     authored this Skill, is not evidence of runtime isolation.
   - If the root session already runs in a runtime-managed checkout that is
     proven distinct from another checkout for this probe at the same revision
     and containing the same fixture, delegate the writer into that current
     checkout. Do not create a nested checkout or invoke an external workspace
     manager.
   - Otherwise, request the runtime's isolated workspace when starting the
     writer.
   Ask the writer to change only
   `.oh-my-stack-eval/writer-isolation/writer.txt`, replacing
   `WRITER_STATE=base` with `WRITER_STATE=isolated-ok`. It must report its
   workspace path and exact changed file.
5. Collect the writer result. Do not start another writer and do not manually
   reproduce its edit in the root session.
6. Independently verify the exact one-line change using the isolated workspace
   or its returned patch or revision. Confirm that no other tracked file
   changed and that the source checkout was not modified before an explicit
   transfer boundary.
7. Read `assets/root.txt` again. Report the observer state, writer isolation
   evidence, exact changed path, final writer state or retained patch state,
   source-checkout state, root marker, and any unexpected changes.
