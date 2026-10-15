# Official pstack 0.15.25 source update

The 0.19.0 source candidate pins official [cursor/plugins commit 99743e9](https://github.com/cursor/plugins/commit/99743e9c151c8537cbbf1f98bb38f34ef3368453).
It was the newest commit affecting `pstack/` observed on 2026-10-16. Both
official plugin manifests report 0.15.25. The commit names Git tree
`3b74ce7f478b3c2d4f6fd9c70a5d39f8664dc862`.

## Source integrity and ownership

The new snapshot contains all 169 official pstack files. Each downloaded blob
was checked against the recursive Git tree by Git blob ID; SHA-256 and size
are retained in the [provenance receipt](acceptance/2026-10-16-pstack-sync/source/provenance.json).
Relative to the preserved 0.15.23 snapshot, 19 files changed, one was added,
and none were deleted. Historical snapshots and receipts retain their bytes.

Official pstack remains the sole semantic authority for the pstack-derived
workflows. No pstack-claude content or policy was imported. Existing optional
extensions and their separately attributed sources retain their distribution.

The [parity manifest](../upstream/parity-derivations.json) records 167 exact
derivations, including all official runtime sources and 23 promoted playbooks.
The [migration script](acceptance/2026-10-16-pstack-sync/source/migrate.py)
preserves existing literal replacements and fails on unmatched anchors.
Four changed official frontmatter blocks and the new Skill's host adaptation
are recorded in the [replacement review](acceptance/2026-10-16-pstack-sync/source/replacement-review.json).
Generated workflow bodies are materialized by `tools/derive-pstack.mjs`.

## Adopted behavior

- `sharpen` frames a task using expert methods, the user's goal, appropriate
  specification, and an outside check, then performs the authorized work.
  It is an explicit public entry in all four generated native packages.
- `ketchup` explains changes using available screenshots, videos and useful
  diagrams. Its prose limit excludes visuals; action items are plain bullets.
  Autopilot replies and changed audit ticks use the updated catch-up behavior.
- Four principles explain their reasoning instead of prescribing particular
  mechanisms: question shared premises, fix the first wrong state, make retries
  converge, and test observable behavior. `correct` follows the revised test rule.
- The lead-judgment reference, swarm, type-system principle and caller-migration
  principle retain the official section removals.

These changes preserve existing host authorization, model resolution, automatic
routing settings, optional T3 selection and configuration ownership. Source-host
helpers keep their previously documented execution support. No additional
review stage or external action authority is introduced.

## Verification scope

The [acceptance record](acceptance/2026-10-16-pstack-sync/result.md) records local
checks. Snapshot integrity, deterministic generation and offline fixtures are
separate from live model execution, native installation, UI discovery and
publication. This source update does not upgrade an installed plugin.
