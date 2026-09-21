---
name: check-custom-role
description: "Verify a generated canonical read-only role is discovered and applied to one delegated worker."
---

# Check Custom Role

Run this read-only procedure exactly once and make no project changes.

1. Read only `assets/root.txt` yourself. Retain its `ROOT_MARKER` and expected
   role-policy marker. Do not read `assets/role.txt` from the root session.
2. Start exactly one independent read-only worker using the runtime mapping for
   the canonical `evidence-reader` role. The role may use a runtime-safe name
   variation. Do not place the expected role-policy marker in the assignment.
3. Ask the worker only to read `assets/role.txt`, report its exact
   `ROLE_MARKER`, identify the inspected path, and obey its loaded role
   instructions. It must make no changes.
4. Wait for and collect the worker result and identity. Do not start a fallback
   worker under a built-in or general-purpose role.
5. Independently verify that the result contains the asset marker and the
   expected role-policy marker. If the runtime exposes completed-worker
   metadata or a transcript, verify that it identifies the generated custom
   role rather than merely a task name.
6. Read `assets/root.txt` again. Report the runtime role name, worker identity,
   asset marker, role-policy marker, role evidence, root marker, and whether any
   project file changed.
