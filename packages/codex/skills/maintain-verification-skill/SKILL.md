---
name: maintain-verification-skill
description: "Audit and update a verification Skill using source and live behavior."
---

# Maintain verification Skill

Locate the project verification Skill with launch/drive instructions and a
feature map. If several match, resolve the target from the request or ask.
If none exists, use [create-verification-skill](../create-verification-skill/SKILL.md).
Only edit that Skill, its feature map, and its owned helpers. Product defects
are reported separately; documentation must not hide them.

Check the map index against feature files for missing, duplicate, or dead
entries. For each feature, assign a bounded read-only source pass that returns
the entry points, likely drift with citations, and one live verification recipe.
Parallelize within runtime capacity; sequential root passes are an explicit
fallback. Reconcile every feature and inspect recent source changes for missing
user-facing paths.

The coordinator then runs one live pass covering every feature. Follow the
verification Skill's launch model: one checked shared instance or fresh
isolated sessions. Doctor before first drive and after a surprising failure;
reset a wedged state rather than repeatedly trusting a healthy process check.
For each drive, preserve evidence before cleanup. Clean residual state after
failed attempts and tear down the instance after the final pass. Record an
unreachable feature only with the attempted path and concrete prerequisite.

Classify findings: doc drift, harness gap, or product gap. Fix only the first
two under the owned Skill directory and re-run any changed harness live.
Re-read the final diff and evidence. Outcome is `clean` when all mapped features
have source and live coverage with no correction; `changed` when corrections
are proven; `blocked` when coverage or safe correction cannot finish. A source
scan alone cannot yield `clean`. Return per-feature coverage and remaining
prerequisites. If the user explicitly requested a pull request, create at most
one from the verified changes; otherwise leave the scoped changes local.
