# Dual-reference maintenance acceptance

OMS now uses official pstack as the preferred baseline and pstack-claude as a
tracked secondary implementation and policy reference. Existing uncommitted
pstack 0.15.30 and reference-hardening work is preserved. Installed plugins,
personal configuration, publication and runtime workflow stages are unchanged.

## Source and decisions

The official assessed pin remains `4ec7ffa173eaa70d3d9467a627baf0954645a353`.
The secondary assessed pin is `356c6e0f978df729eb16f227d795f34d221c5aad`.
Its own metadata declares official revision
`7b353f78f6ec193bdbe48ed8059444eb09b6878e`; this is recorded separately instead
of assuming it equals the OMS pin.

The registry records the dual-reference maintenance implementation and four
implemented hardening adaptations (Markdown destinations,
HEAD reflog preservation, native Claude transcript location and PNG comparison
controls), deferred native Claude effort and Pi observation work, and the
rejected automatic cleanup policy. Eleven selected reference files, including
LICENSE and upstream metadata, have immutable snapshots and byte/Git receipts.
This is selected evidence, not a claim of a full reference-repository import.

## Behavior

- The joint read-only planner composes the original official preview with the
  complete secondary Git-tree diff and impacts on registered OMS capabilities.
  Unmapped changes remain unassessed. Byte equality is only a convergence hint.
- Each capability separates the source it adopted from the newer source it has
  assessed. Older receipts remain usable after a newer assessment.
- The normal validation stage checks receipt identities, hashes, adopted local
  output fingerprints and evidence paths. Workflow policy deviations require a
  named adoption and matching exact `policy` derivation with `adoptionId`.
- Agent and contributor instructions require comparing both sources before
  changing a capability or pin. Mechanical checks establish structure and bytes;
  review still judges the comparison, evidence and choice.

The existing official planner reuses extracted bounded Git/path helpers without
changing its CLI or official-origin contract. Neither planner fetches, checks
out, applies updates or advances a pin. Snapshots are excluded from runtime
distributions; the new maintenance tools are not installed into runtime packages.

## Verification

The 33 focused planner/adoption checks passed. They exercise deterministic and
write-free previews, source working-file exclusion, both source deltas, unknown
changes, deletion and symlink blockers, output/snapshot drift, missing evidence,
origin/object rejection, policy registration in both directions, and retaining
an older adoption after reviewing a newer source.

The actual fixed-source preview covers 373 reference files and returns
`unchanged` for both current pins and all eight capability assessments. This
means no update against these assessed revisions, not complete feature parity.
The required `npm run check` passed after the final code and test changes:
**912 tests, 872 passed, 40 skipped, 0 failed**. The skips comprise 38
TLC-dependent cases and two pinned-release-runtime cases. Generation and release
build passed, and all 181 official exact derivations remain valid. Final local
validation passed after adding the maintenance implementation's own adoption
record. CLI help returns 0 and unsupported apply mode returns 2.

Local evidence is retained under `.tmp/dual-reference-20261023/`, including
focused logs, the real-source plan and full-check output. No native live-model,
installation, release, commit, push or automatic cleanup was performed.
