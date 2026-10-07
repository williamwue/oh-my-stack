# pstack 0.15.13 candidate acceptance

OMS baseline: `d64afa5a4509dde49182db5a1c8387bd060de867` (0.6.0).
Upstream: `ecc249f1e306fc64ddf83c7bed16cacf7c2239db` (0.15.5) through
`2cbf58508f40de470d7490b55c51d71241928fa2` (0.15.13).
Local branch: `codex/pstack-0.15.13-20261006`, isolated from the original checkout.
Source and archives are an unpublished WORKTREE candidate, without a release tag.

## Result

The local 0.7.0 candidate contains 78 public Skills (54 workflows and 24
principles), plus 12 internal probes. Four new explicit entries are correct,
poteto-help, benchmark-checklist, and principle-explain-the-number. All three
packages share the catalog and retain their native invocation conventions.

| Gate | Actual result | Evidence |
| --- | --- | --- |
| Exact upstream delta | 33 changed paths decided; 61 old/new/license blobs verified by SHA-256 and Git blob identity | [decisions](upstream-decisions.json), [source blobs](upstream-files.json) |
| Generated packages | 3 targets; 7 profiles; 90 source Skills; no generated drift | [full check](source-check-final.log) |
| Full repository check | Exit 0; 241 tests passed; generation, conformance, deterministic release, provenance, books, and Markdown checks passed | [receipt](source-check-final.json) |
| Upgrade and rollback | All 3 targets: published 0.6.0 → local 0.7.0 → published 0.6.0 → local 0.7.0; manifest trees and catalog counts verified; plans made no writes | [lifecycle](install-lifecycle.json), [baseline assets](baseline-assets.json) |
| Codex native help | Candidate help and catalog read; correct recommended; project hashes unchanged | [receipt](native/codex-help-receipt.json) |
| Codex native correction | Authentic historical alias bug failed first; model changed only the installer; external verifier passed both alias paths, malformed actions, and import isolation | [receipt](native/codex-correct-receipt.json) |
| Codex native measurement review | Five adversarial synthetic cases rejected as valid wins; external report verifier passed | [report](native/codex-measurement-report.json) |
| Claude native help | Candidate plugin invoked; correct recommended; disposable project unchanged; model returned successfully | [receipt](native/claude-help-receipt.json) |
| OMP native package | Isolated install, doctor, four new Skill reads, uninstall and cleanup verified | [receipt](native/omp-candidate-receipt.json) |
| OMP model behavior | Continuation help passed through existing Cursor auth and a session overlay; original isolated OpenAI auth failure remains historical | [verified behavior](native/omp-authenticated-help-verification.json), [original boundary](native/omp-candidate-receipt.json) |
| Independent implementation review | Three attributable reviewers; 3 findings fixed after independent synthesis; 3 fresh repair reviews had no findings | [root verdict](review/final-verdict.md) |

The [behavior fixture](../../../evals/fixtures/pstack-01513/README.md) uses an
authentic previous OMS installer and synthetic measurement receipts. A model's
success statement alone does not pass verification. The [content binding](native/behavior-content-binding.json)
confirms the exercised Codex entries are byte-identical in the final package.
Claude JSON result mode did not retain detailed tool events; its receipt proves
successful native invocation and unchanged project, with a narrower audit than
Codex. No actual performance improvement is claimed by the synthetic cases.

## Source ownership and pin

Four entries extend the existing portable Skill model without a new execution
framework. Catalog, provenance and generated output had one root writer.
[Prior derivations](prior-semantic-derivations.json) and [ownership transition](ownership-transition.json)
preserve previous attribution. Only the new October source's verified pin
advances to the reviewed head after source, package, behavior and repair gates.
It means acceptance of this scoped semantic delta, not full Cursor parity or
OMP authenticated model acceptance. Older source pins and dated evidence remain
unchanged. Final candidate content hashes are in [candidate inventory](candidate-inventory.json).

## Observed failures and boundaries

Earlier check rounds remain archived: round 1 rejected raw native JSONL under
publication hygiene; round 2 rejected an absolute home path in a Claude receipt;
round 3 found heading/style lint in verbatim reviewer results. Raw records were
moved outside the repository, summaries sanitized, and a narrow lint override
preserves original reviewer text. Full checks then passed. The first OMP model
attempt also left piped stdin open; the corrected harness closed it and reached
the actual missing-authentication boundary. Both attempts remain recorded.

No credentials were copied, login changed, personal plugin replaced, model
mapping applied, recurring scheduler armed, remote branch pushed, pull request
created, merge performed, or release published. The original checkout's book,
ebook, dependency and research edits remain outside this branch. Existing pinned
development-tool advisories retain the 0.6.0 disclosure; no dependency upgrade
was bundled. Remote CI, clean tagged release and downloaded 0.7.0 asset gates
remain release work. The local package archives are ready for review.

## Continuation result

The [continuation record](continuation.md) verifies native OMP model behavior,
the additional complete CI book audit and five Python tests. Implementation and
archive hashes remain unchanged. The [prepared release handoff](release-handoff.md)
records the concrete publication and personal upgrade steps pending explicit scope.
