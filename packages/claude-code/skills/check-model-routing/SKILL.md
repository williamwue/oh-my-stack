---
name: check-model-routing
description: Verify one delegated worker resolves an explicit alternate model and reasoning setting with observable runtime metadata.
---

# Check Model Routing

Run this read-only procedure exactly once and make no project changes.

1. Read only `assets/root.txt` yourself and retain its `ROOT_MARKER`. Do not
   read `assets/worker.txt` from the root session.
2. Inspect the live runtime inventory or the supplied probe routing
   configuration. Select one available worker model that differs from the root
   model and one explicit supported reasoning setting that differs from the
   root setting. Do not guess an unavailable model identifier.
3. Start exactly one independent read-only worker with both selections applied.
   A runtime may apply them directly at spawn time or through a probe-specific
   role binding. Ask the worker only to read `assets/worker.txt`, report its
   exact `ROUTING_MARKER`, and make no changes.
4. Wait for and collect the worker result and identity.
5. Independently inspect runtime-produced metadata after completion. Verify the
   resolved worker model identity and configured reasoning setting. A worker's
   self-report alone is not evidence. If either value is not observable, report
   that capability as unverified rather than inferring it.
6. Read `assets/root.txt` again. Report the root model and reasoning setting,
   requested and resolved worker values, metadata source, worker marker, root
   marker, and whether any project file changed.
