---
name: runtime-forensics
description: "Diagnose a live process from captured runtime evidence and connect the observed mechanism to source."
disable-model-invocation: true
---

# Runtime forensics

The deliverable is a diagnosis. Choose a capture that matches the symptom:
CPU profile for a spin, heap snapshot for retained memory, runtime trace for
stalls, or matching UI trace for visual timing. Verify process identity,
version, reproduction window, and diagnostic cost before attaching. Capture
the actual live signal with an authorized read-only control path; do not
substitute source speculation for a capture.

Reduce large artifacts with query or focused parsing. Identify a hot frame,
retainer chain to a root, repeatedly scheduled loop, blocked thread, or other
specific mechanism. Give file, symbol, and line only when the artifact can be
mapped correctly to that build. Verify the mechanism with a safe observation
or reproduction, preferably without changing the live process. Intrusive
instrumentation or a live hotfix needs separate authorization and rollback.

Report capture path, version/time, reduced finding, mechanism check, source
mapping, and remaining alternatives. If capture or source mapping fails, say
what is known from the artifact and mark cause unconfirmed. Route a requested
fix to [bug-fix](../bug-fix/SKILL.md) or [perf-issue](../perf-issue/SKILL.md).
