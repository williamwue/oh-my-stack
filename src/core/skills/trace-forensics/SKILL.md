---
name: trace-forensics
description: Diagnose an existing trace, profile, heap snapshot, or spindump without recapturing the process.
---

# Trace forensics

The capture already exists. Record its path, format, time range, producer,
build identity, and whether samples are complete. Choose a parser for that
format and transform large data into a queryable table of frames, events,
samples, or nodes. Keep raw data intact; report any parse loss or clock skew.

Narrow to the dominant cost or failure path. For CPU, inspect inclusive and
self time plus callers; for heap, trace retainers to a root; for a spindump,
identify on-CPU or blocked threads and wait reasons. Correlate event IDs and
time windows before claiming a causal sequence. Map frames to source using
the artifact's symbols and the matching build. If source mapping is absent,
return an artifact-level finding, not a precise code-line diagnosis.

Compare a paired before/after capture when available and equivalent. Without
one, present the strongest supported hypothesis and the discriminating next
check. Return reduced findings with artifact offsets or queries, source
locations if proven, and confidence. This is read-only diagnosis; a requested
fix belongs to [bug-fix](../bug-fix/SKILL.md) or
[perf-issue](../perf-issue/SKILL.md).
