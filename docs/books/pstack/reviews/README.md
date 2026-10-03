# Bilingual book acceptance record

The local candidate contains all 48 English and 48 Simplified Chinese entries.
All Chinese bodies, titles and 31 diagram translations have attributed AI
review records. The records distinguish translator self-checks from review by
a different agent. This is not a claim of human editorial approval.

- [Source audit](source-audit.json): 96 frozen source entries, 48 translations,
  code bodies, structure, anchors, destinations and image hashes.
- [Validation summary](validation-summary.json): complete book gate, 11 Node
  tests, five Python tests, and scoped Markdown lint passed.
- [Reading QA](reading-qa.json): representative desktop/mobile pages, navigation,
  source image, static diagrams, tables and code disclosure behavior.
- [Clean copy](clean-copy.json): assembly and both audits pass with no temporary
  translation drafts or node_modules in a base archive plus book file overlay.
- [Decision trail](decisions.tsv): original append-only records and corrections.
- [Final independent review](final-review.json): no flags within the documented
  evidence boundary; all four integration findings resolved.

## Publication candidate

The publication branch is based on remote main at `bbb8fce0a8d8ff694ca21ee1cf20498057c0b14c`.
The older work below used `52bec251d379799afc56a3eb538ad82e68908020`.
Remote main had already removed the dated cloud-management acceptance file.
Its local historical-path exception and dependent regression are therefore not
part of this publication candidate. The surviving historical OMP document is
unchanged; its narrow heading-style exception is retained. Current instruction
files receive formatting only. Book content and source snapshots are unchanged.

[Publication verification](publication-validation.json) records the current
candidate checks; older logs below retain their original scope and results.
CI now also runs the complete book gate, source audit and Python regressions.

## Earlier repository gates

[Independent closeout review](closeout-review.json): no remaining findings.

The [isolated closeout candidate](closeout-isolated-summary.json) passes the full
`npm run check` with 191 Node tests, plus the complete book gate, source audit
and five Python tests. The [isolated log](closeout-isolated-check.log) records
all four commands and exit codes. It uses a local clone at the recorded base
with only book and closeout-owned overlays; concurrent provider work is excluded.

An earlier [shared-workspace check](closeout-check.log) passed 211 Node tests
and Markdown lint across 690 files. During final review, concurrent work added
`docs/github-target-policy-prototype-2026-10-03.md` linking to the unfinished
`github-workflow.md`. The [shared check at that point](closeout-shared-validation.log)
therefore fails on that unrelated link. This report does not claim the evolving
shared workspace currently passes. The concurrent file was left unchanged.

The [book check log](closeout-book-check.log) also records a separate complete
gate, source audit and Python test run. An initial archive-only isolation attempt
could not run release verification without Git metadata; its
[failed attempt](closeout-isolated-archive-attempt.log) is retained.

The [initial acceptance](initial-validation-summary.json) was blocked by an
absolute path and Markdown formatting in pre-existing historical reports.
Those reports retain their exact original bytes. The earlier local validator bound them to
specific paths and SHA-256 hashes; only their path example and selected style
rules receive exceptions. That earlier regression checked changed reports, copied personal paths and
secret material. Current instruction files received formatting only.
The [failing-before regression](closeout-before.log) records the original defect.

Earlier failure logs remain in [check-final.log](check-final.log),
[tests-final.log](tests-final.log) and [markdownlint-final.log](markdownlint-final.log).
Absolute workspace prefixes in copied logs are replaced with `<repository>`;
raw logs remain local.

## Review boundary

Per-entry reports bind review coverage to source and translated body hashes.
Title and diagram review records are separately bound to their content.
The final integration reviewer found four validation gaps; coverage, destination
preservation, Chinese title review binding and frozen source title checks were
fixed and rechecked. Reviewer model identities are unverified at runtime.

The final trail review uses visible agent messages, tool outputs and repository
artifacts; no complete attributable runtime transcript was available. A local
preview does not certify GitHub-hosted rendering. Publication status is recorded separately from these earlier local receipts.
