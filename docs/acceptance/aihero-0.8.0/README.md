# AIHero 0.8.0 candidate checklist

The selected original `codebase-design` is carried forward from the local
0.6.0 candidate onto released 0.7.0 main at
`6d2c43a12297338034bf9265cea91e2521048ece`.
The exact base is verified in the review packet before publication.
Source and license hashes are in `upstream/source-skills.json`.

## Required gates

- Verify all original skill resources and license across the three targets.
- Preserve all existing pstack skill bytes from the 0.7.0 base.
- Pass `npm run check` on this isolated candidate.
- Run the complete book audit used by remote CI.
- Review the frozen candidate independently and resolve concrete blockers.
- Require fresh remote CI for the submitted candidate and merged main.
- Run clean tagged checks and deterministic builds at `v0.8.0`.
- Publish all five archives, the manifest and checksums; download and compare
  every asset with the trusted tagged output.
- Update the user's existing Codex marketplace through the native manager;
  inspect version and bytes, and run a fresh-session discovery smoke.

[The earlier original design evidence](../2026-10-06/aihero-original-skills.json)
is bounded to one explicitly invoked fixture per host. It is not relabeled as
a new 0.8.0 host execution. Codex desktop picker interaction remains a user
acceptance lane; no OMP live acceptance is claimed for this new skill.

## Completed candidate checks

On reviewed candidate `b8d15bb496f779b08785fb21b63d003696cf6307`,
`npm run check` passed 244 tests. The complete bilingual book audit and five
Python tests passed. All 383 prior generated pstack skill resources match the
0.7.0 base. Original skill hashes match all three targets. Claude's native
plugin manifest validator passes, and the candidate Codex archive passes the
owned-directory install and integrity check.

[The independent review record](review.json) preserves three reviewer results,
a separate synthesis and root judgment. Two reviewers reported no findings;
one identified a provenance wording error. The root verified the cited metadata
and corrected the prose. No implementation blocker remained. Native records
verify each configured model, effort and parent linkage; exact spawn messages
are encrypted in persisted parent records. The implementation remains the
reviewed tree; subsequent changes only correct or record acceptance evidence.

Fresh remote CI passed for that first candidate. Final-head and clean tagged
checks, downloaded-asset comparisons and native Codex discovery remain
publication/install gates, recorded when executed.
