# Review all current OMS modules against both references

The module review covers current active implementations, including older OMS
code that is still used. It does not re-review every deleted Git version or
rewrite frozen historical acceptance. Each current module has an explicit
decision, counterparts or searched-scope explanation, evidence and file hashes
in `upstream/module-reviews.json`.

## Inspect or check coverage

```sh
node tools/module-review.mjs inventory
node tools/module-review.mjs check
```

Both commands read local files and write JSON only to stdout. `inventory` lists
the current modules and source fingerprints. It does not make review decisions
or update the registry. `check` verifies recorded coverage and returns module
and file counts. Exit 1 means invalid input, incomplete coverage, stale source
revisions, changed files or missing evidence. Neither command fetches, applies,
installs or invokes a model. Use `--root /path/to/oms` for another checkout.

The normal validation stage runs the same coverage check. Adding a module,
adding or deleting a file within a module, or changing reviewed source bytes
requires reassessing that module before refreshing its record. Compare the two
fixed sources using [dual-reference maintenance](dual-reference.md), preserve
intentional host differences, fix confirmed defects, and record why the retained
implementation is suitable. `inventory` supplies fingerprints only after that
review; copying them without comparison does not establish acceptance.

The adoption registry records particular reuse, adaptation and policy choices.
The module registry accounts for the complete current scope, including local
capabilities with no counterpart. Review evidence explains both. A matching
hash proves the reviewed bytes, not the truth of a rationale or optimality.

## Scope

The authoritative scanner covers `src`, `tools`, `scripts`, `.github`,
`.claude-plugin`, `security`, unit-test infrastructure, active eval fixtures and
configs, active top-level upstream manifests, root executable files and the
explicit build/governance inputs named in the scanner. Skills and roles are
individual modules; runtime adapters, maintenance tools and fixture families
retain their own identities. Tests support the module decisions and are also
accounted for as current verification infrastructure.

Generated `packages`, `dist`, `output`, conformance results, frozen eval evidence,
source snapshots, historical records and book-source editions keep their
existing provenance/generation checks rather than being counted as independent
implementations. Dependency directories, scratch directories and Python
bytecode are outside current source ownership. Symlinks in the reviewed input
scope are rejected rather than followed. General documentation and assets are
evidence or source resources, not claims of separately executed modules.

Official counterpart paths resolve against the complete pinned official receipt.
Secondary paths resolve against a complete fixed Git-tree metadata index under
`upstream/reference-indexes/`. That index records paths, modes, blob identities
and hashes, not an automatic import of the secondary repository. Local pins and
receipts establish reproducible source identity, not independent repository
attestation. An absent counterpart must name the search scope and reason.

## Review standard and limits

Read implementations and their behavior tests; exact official derivation alone
does not evaluate a secondary policy fork. Classify findings as defects, useful
implementation improvements, intentional policy differences or host-only
capabilities. Resolve actionable findings with original repros and negative
controls. Keep the source reports attributable and record accepted or rejected
findings in the final acceptance rather than rewriting their original result.

Current coverage cannot certify every future task choice, every provider or
every operating system. Real Claude Code model execution remains excluded by
the user's scope. Fixture checks, native Pi with a local simulated provider,
installed runtime acceptance and external publication remain distinct evidence.
