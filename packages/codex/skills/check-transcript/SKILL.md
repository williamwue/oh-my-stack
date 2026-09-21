---
name: check-transcript
description: Verify a root session can retrieve a completed delegated worker transcript independently from its delivered result.
---

# Check Transcript

Run this read-only procedure exactly once and make no project changes.

1. Read only `assets/root.txt` yourself and retain its `ROOT_MARKER`. Do not
   read `assets/worker.txt` from the root session.
2. Start exactly one independent read-only worker. Ask it to read only
   `assets/worker.txt` and make no changes. Require it to write the exact
   `TRANSCRIPT_MARKER` in an ordinary assistant text message before returning
   the same marker through any structured result or yield mechanism. The text
   message and structured result are two independently inspectable records.
3. Wait for and collect the worker result and identity.
4. After the worker completes, retrieve that worker's transcript through the
   runtime's transcript resource, thread API, or persisted transcript
   interface. Reading only the delivered result again is not sufficient. Do
   not ask the worker to repeat its result and do not start another worker.
5. Independently verify that the retrieved transcript contains a worker
   assignment envelope attributable to that worker, evidence that the worker
   read `assets/worker.txt`, and the exact `TRANSCRIPT_MARKER` in an ordinary
   assistant message. A privacy-preserving encrypted assignment body is
   acceptable when the envelope still identifies the assigned worker and
   message type. Report the retrieval mechanism and whether it is native to
   the runtime or depends on an external persisted artifact.
6. Read `assets/root.txt` again. Report the worker identity, delivered marker,
   transcript marker, retrieval mechanism, independent transcript checks,
   root marker, and whether any project file changed.
