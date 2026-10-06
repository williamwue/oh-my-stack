# AIHero original codebase-design acceptance

Date: 2026-10-06. Status: local candidate on the 0.6.0 source baseline,
not published and not installed into the user's global plugin configuration.
Source: `mattpocock/skills@6fd947921b935b7e1e69293a200400f0fdd5c15f`.

The original skill, both references, and UI metadata remain byte-identical
in all three generated packages. No OMS workflow or model-routing instructions
are inserted. Original source coordinates and the MIT license are included
in each generated package. Original resource hashes are recorded in the
repository's `upstream/source-skills.json` and checked during package validation.
See the [usage and update guide](aihero-original-skills.md).

## Bounded live results

Both hosts ran the original Design It Twice process on the same small checkout
module. The request explicitly asked for design only and three independent
parallel agents with different constraints. Each host read the original
resources, produced three complete designs, and compared them before returning
a recommendation. Both CLI processes exited successfully.

| Runtime | Observed version and model | Tested entry | Result |
| --- | --- | --- | --- |
| Codex | CLI 0.160.1; gpt-6.1-sol, high effort | Project-local `.agents/skills/codebase-design` | Three parent-linked child records contain completed designs; parent comparison returned |
| Claude Code | CLI 2.1.287; claude-opus-5-5 | Session plugin and native `Skill` call to `oh-my-stack:codebase-design` | Three `Agent` calls returned attributed designs; parent comparison returned |
| OMP | Generated package only | Original file and license validation | Live host behavior not tested |

The [sanitized evidence record](acceptance/2026-10-06/aihero-original-skills.json)
contains the prompts, fixture hashes, complete child outputs, parent responses,
and private trace hashes. The [reproduction fixture](../evals/fixtures/aihero-codebase-design/README.md)
contains the exact source and glossary used. Raw authentication/configuration
logs stay in local scratch storage. Codex parent spawn briefs are encrypted in
its persisted records; parent linkage and child completion outputs are readable.

These runs establish one explicitly invoked design scenario. They do not
establish full behavioral equivalence, automatic trigger quality, implementation
or test execution, native Codex plugin installation/picker behavior, Claude
marketplace installation/update, or cross-project quality. The existing OMS
delegation binding is deliberately absent from this original skill.

## Regression and build checks

The task's changes over the recorded source baseline pass `npm run check` in
a clean local candidate checkout: 238 tests pass, with generation, package
validation, conformance, documentation, and existing book checks included.
Regression tests also reject source drift, missing declared dependencies,
unrecorded references, snapshot symlinks, and changed packaged originals.
All pre-existing generated skill files retain their baseline hashes.

`npm run release:build` builds three target archives and two plugin bundles.
`claude plugin validate packages/claude-code` passes. These are candidate
build/validation results, not publication or installation claims.

The original working directory contains unrelated book/research changes.
Its baseline full check stops at the existing markdown error in
`docs/research/2026-10-04/pstack-search-intent/report.md:176` (MD012).
The clean candidate check excludes those unrelated modifications. Their
recorded tracked-file hashes remain unchanged by this integration.

## Next original imports

The first candidate includes only complete `codebase-design`.
`domain-modeling` is next, with both original document templates. Follow it
with `grilling` and `grill-with-docs`, then `improve-codebase-architecture`
with its complete skill dependencies and HTML reference. Resolve host-native
dependency invocation explicitly before importing those workflows. Preserve
the original entries; any later OMS combination gets a separate opt-in entry.
