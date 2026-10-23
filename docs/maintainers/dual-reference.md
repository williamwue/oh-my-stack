# Maintain the official and secondary references

Official pstack is the preferred baseline. pstack-claude is the secondary
implementation and policy reference. OMS owns the resulting behavior and keeps
user authorization and host capability boundaries. This changes the maintenance
process; it does not import all reference policy forks or alter installed plugins.

## Change an OMS capability

1. Read the corresponding fixed implementations in both sources. The official
   pin is in `upstream/imports.json`; assessed revisions and decisions are in
   `upstream/reference-adoptions.json`. Use the preserved snapshots and receipts.
   If a counterpart does not exist, record the searched scope in `officialNote`.
2. Prefer reuse, then host adaptation, then a local implementation with a concrete
   reason. Compare input contracts, failure behavior, bounds and relevant tests.
   A reference test is evidence only after its assumptions fit the OMS host.
3. Update the capability's registry entry. Record `adopted`, `adapted`, `deferred`
   or `rejected`, implementation versus policy, exact reference revision and
   paths, official comparison paths, rationale, evidence and reconsideration
   condition. Entries describe capabilities rather than individual functions.
   For retained or local-only capabilities with no reference implementation to
   adopt, record the comparison and searched scope in the complete module registry.
4. For adopted implementations, refresh output SHA-256 values only after this
   comparison and relevant verification. The required validator detects output
   drift, missing evidence paths and altered reference snapshots. Existence of
   evidence files and matching hashes do not prove their assertions are true.
5. For a policy adoption, also list affected `derivations`. Add an exact
   replacement with category `policy`, an explicit `adoptionId`, and its rationale to
   `upstream/parity-derivations.json`. Materialize through `derive-pstack.mjs`.
   A registered decision and a corresponding replacement are both required;
   generated Skill bodies remain generator-owned.

The assessed reference revision is a comparison checkpoint. Each decision's
`referenceRevision` identifies the adopted comparison source; its own
`assessedRevision` records the latest version reviewed for that capability and
may advance while the adopted implementation retains an older receipt. Adding a
new assessment does not silently advance any adopted implementation. Deferred
and rejected decisions remain visible until their revisit condition is met.

## Preview updates from both sources

Provide local Git roots containing the assessed and candidate objects. Fetch
separately when needed and choose full SHAs from the intended repositories.

```sh
node tools/plan-reference-update.mjs --source-checkout /path/to/cursor-plugins --revision OFFICIAL_SHA --reference-checkout /path/to/pstack-claude --reference-revision REFERENCE_SHA
```

The planner writes JSON to stdout. It performs no fetch, checkout, apply, pin
advancement, installation or configuration update. Working files in the source
checkouts do not replace the committed candidate trees. The original
[official-only planner](pstack-update-planner.md) remains available.

Read these report sections together:

| Section | Review |
| --- | --- |
| `official` | Existing full official preview: changes, anchors, ownership and blockers. |
| `reference.files` | Whole reference-repository file and mode changes, including tools and fork declarations. |
| `reference.unmappedChanges` | Changed paths outside registered capability comparisons; these remain unassessed. |
| `reference.upstreamChanged` | Whether the reference's declared official baseline advanced; this alone does not prove the update is an upstream sync. |
| `adoptionImpacts` | Differences from the adopted source, unassessed changes since its capability checkpoint, official changes and possible convergence. |

Byte equality with a mapped official candidate is only a convergence candidate.
Different bytes may reflect host translation or a policy fork. Inspect
`tools/forks.json`, the actual diff and the saved rationale before choosing.
The two repositories have different paths and histories; never merge their
branches as if they were a shared upstream. Metadata and origin configuration
are local evidence, not independent attestation of repository ownership.

Exit 0 means unchanged or review-required; 1 means a reported blocker; 2 means
invalid inputs, missing objects or invalid local receipts/adoption records.
The report is deterministic and includes no timestamps or machine paths. It
reuses the official planner's bounded Git reads (10 seconds per command, 64 MiB
output, 4,096 files per tree, 8 MiB per blob); it is not a global wall-clock SLA.

## Record a completed assessment

Capture selected reference files as bytes from the chosen commit beneath
`upstream/snapshots/pstack-claude/FULL_SHA/`. Preserve the upstream LICENSE and
`tools/upstream.json`. Add a receipt under `upstream/reference-receipts/` with
repository, revision, declared official revision, file modes, Git blob IDs,
SHA-256 values and snapshot paths. Retain older receipts used by any decision.

Advance the reference's `assessedRevision` and the pstack-claude source record's
`inspected_commit` together after reviewing the complete source diff. Keep
unmapped or unresolved changes in the assessment report; an assessed revision
does not mean every feature was adopted. Update affected decisions or explain
why their older implementation remains suitable. Official pin updates retain
the existing exact-derivation and complete-source-receipt procedure.

Run the original repro and appropriate negative controls, generate changed
runtime artifacts, and run `npm run check`. The new adoption validator runs
inside the existing `validate` stage, so CI checks the same records. It checks
structure and bytes; human or agent review judges the comparison and evidence.
Keep live-host acceptance, installation and publication as separate evidence.

Maintain the [complete current-module review](module-review.md) alongside these
capability decisions. Its registry accounts for retained and local-only modules
as well as adoptions, and the same validation stage rejects new, deleted or
changed source files until the corresponding module has been reassessed.

The registry records implemented adaptations and explicit deferred/rejected
choices; consult it for current statuses rather than inferring them from older
assessment reports. The reference's declared official baseline is preserved
exactly from its metadata, even when it differs from OMS's official pin.
