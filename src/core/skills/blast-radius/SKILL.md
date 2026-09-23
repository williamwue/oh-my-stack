---
name: blast-radius
description: Find downstream breakage a diff may cause and prove its load-bearing safety assumptions against real code.
---

# Blast radius

Use for a proposed change or bounded diff. This is an investigation unless the
user also requested a fix. Start from the exact revision, changed symbols,
behavioral difference, and relevant history. Use [how](../how/SKILL.md) for
mechanics and [why](../why/SKILL.md) for uncertain historical constraints.

Identify the one or two assumptions on which safety depends. Search past direct
callers: serialized formats, API consumers, database columns, other languages,
feature flags, retries, timing, teardown, and pinned library behavior. Check the
actual version and local patches of dependencies. A text search alone cannot
clear a dynamic or external consumer.

For each assumption, record the strongest evidence reached: assertion, cited
source, a failure path shown unreachable, executable check of the real code, or
running-product reproduction. Run a small check of the actual code for the
load-bearing assumption whenever authorized and practical. A test of a mock
does not prove a library's real behavior. If proof is unavailable, label it
unproven and name the cheapest discriminating check.

Keep confirmed risks separate from investigated and cleared cases. For each
risk, give the mechanism, affected surface, likelihood with basis, impact,
source location, and detection step. Wide independent investigations may use
[arena](../arena/SKILL.md) within the available budget; root rechecks central
claims. Do not turn a plausible story into a safety verdict. Report what
changed, the safety assumptions and proof level, real risks, cleared cases,
and the check required before shipping. No merge or publication follows from
this review alone.
