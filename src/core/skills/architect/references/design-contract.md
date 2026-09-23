# Design candidate contract

Every candidate gets the same task, grounding, constraints, and isolated output.
Produce a package with these sections:

1. Problem and preserved constraints, including confidence of historical claims.
2. Caller usage: two or three realistic calls, imports, inputs, results, failures.
3. Shape: domain types, signatures, data flow, module ownership, boundary parsing,
   explicit non-goals, and clearly unfinished bodies or pseudocode.
4. Interface depth: complexity hidden versus knowledge still required of callers.
5. Accepted tradeoffs and at least one concrete rejected alternative shape.
6. Open questions, risks, and the first independently verifiable implementation unit.

Derive types from usage, not usage from a predetermined abstraction. Trace
dominant access patterns before adding caches or indexes. Encode valid states
and boundary validation explicitly; derive shared facts rather than maintaining
parallel copies. Keep pure logic separate from external effects, and analyze
retry/partial-failure behavior. Isolate concurrent writers before adding locks.

Screen four design red flags: shallow modules with a large surface but little
hidden complexity; leaked transport/storage details; decomposition by temporal
steps that duplicates invariants; pass-through methods adding no policy or
adaptation. Prefer short call chains and a coherent domain owner. Do not reject
necessary complexity simply to minimize file count.

The parent appends a synthesis decision after arena: selected base, criterion
scores and judge verdict, grafts with candidate attribution, rejected ideas and
reasons, and checks on the final synthesized design. Candidate authors do not
write a fictional synthesis of work they have not seen.
