# Official pstack 0.15.25 local acceptance

Source candidate: OMS 0.19.0. Official revision:
`99743e9c151c8537cbbf1f98bb38f34ef3368453`.

The [source migration](../../upstream-pstack-0.15.25.md) describes the adopted
behavior. The [source receipt](upstream-files.json) lists all 169 official
files. The preceding snapshot and its dated evidence remain unchanged.

## Validation

- `npm run check` passed. The [complete output](full-check.txt) records
  generation, catalog documentation, 12 conformance records, reproducible
  release artifacts, validation, book checks, Markdown lint and Node tests.
- Node reported 665 tests: 663 passed, zero failed and two skipped. The two
  real local-release fixtures require the pinned release runtime and were not
  exercised in this environment. A passing top-level command does not close
  those skipped fixture scopes.
- `node tools/derive-pstack.mjs --check` verified all 167 exact derivations.
  The source tests also verified every new official blob and all previous
  0.15.23 snapshot bytes, and checked `sharpen` on all four native targets.
- A detached T3 generation passed. Separate assertions checked explicit
  `sharpen` catalog entries, preserved official behavior and T3 binding docs on
  Codex and Claude Code. Codex's T3 entry points to its complete `WORKFLOW.md`.
  These are generated-file assertions, not live delegated model calls.

The [validation summary](validation.json) records the command scopes. The
[source decisions](source/source-decisions.json) account for all 19 modified
files and the one addition. The [replacement review](source/replacement-review.json)
records the four refreshed official frontmatter blocks and new entry binding.
Official pstack is the sole workflow semantic source for this update.

## Boundaries

No live model workflow, native plugin installation or UI discovery was run for
this source update. No personal model or routing configuration was changed.
No push, PR, merge, tag, publication or installed-plugin upgrade was performed.
Historical host observations retain their original versions and scopes.
