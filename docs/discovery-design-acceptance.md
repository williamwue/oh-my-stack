# Discovery/design batch: bounded acceptance

Date: 2026-09-23. Unreleased dirty working tree on alpha.4 commit
`4820c9b11be779f7e826041fa8f15df482520a81`. This is not an installed-plugin or
three-runtime behavior certification.

## Static and packaging checks

- `npm run check`: passed, including 84 tests, all three generated targets,
  12 existing conformance records, release reproducibility, provenance hashes,
  local links, and Markdown lint.
- Skill Creator quick validation passed for all five generated Codex entries.
- The public catalog contains 54 entries and no internal probes. Existing
  package tests and lossless long-entry tests run against the expanded catalog.
- All 21 frozen upstream files, including the MIT license and original
  references, have Git blob hashes matching the pinned upstream tree.
- A new regression test demonstrates that immutable snapshots may retain
  upstream example links while broken links in published instructions fail.
  Snapshot content remains guarded by source hashes; it is not rewritten to
  satisfy local Markdown link resolution.

Existing conformance records were not promoted or relabeled as coverage of the
new named workflows. Package version remains alpha.4 in this development tree;
do not publish rebuilt artifacts under the existing released identity.

## Independent forward test: why

Tester: `why_forward_test`, a fresh context with only the skill path, a user
request, and the permitted local repository scope. No proposed answer was given.

Request: Why do public packages omit check-* probes? The user suspects they are
unstable; verify the claim. Network, writes, installation, and nested delegation
were forbidden for this run.

Observed result:

- Identified the recorded public/internal audience boundary and unnecessary
  context budget as direct evidence; did not affirm the supplied instability
  hypothesis without evidence.
- Cited the alpha.3 release explanation in commit `998dcc0cf8d0b272a1ff1f88b1896db2f8b2c1fd`
  and the actual public-catalog filtering implementation.
- Distinguished direct historical statements, interpretation, speculation, and
  unknown motives. Returned all seven source-category coverage rows with local
  scope and external-source exclusions.
- Disclosed same-session collection/synthesis and absent independent synthesis.
  Did not claim that historical success records proved the current installation.

Root verification reopened the release note from the cited commit and the
current `packageSkills` filter. Both support the central claim. This is a
successful bounded local-history behavior test, not an authenticated multi-source
run or proof of every citation/failure branch.

## Independent forward test: architect

Tester: `architect_forward_test`, a fresh context given only the skill path and
a greenfield design-only request. No intended architecture was supplied.

Request: Design a local CSV/JSON importer with preview before confirmation,
idempotent re-import, and safe operation from two windows. Do not implement.
No network, writes, or nested delegation; two candidate attempts and one synthesis.

Observed result:

- Produced two distinct designs: database-owned staged batches and a single-writer
  service with a command log. Compared caller-facing interfaces and ownership.
- Selected a base, attributed the retained operation-identity/receipt idea,
  and rejected unnecessary service/log lifecycle complexity.
- Kept the response at design scope. Identified business-key deduplication,
  preview identity, transaction boundaries, retries, and conflict behavior.
- Labeled sketches and scenario reasoning as unimplemented; did not present
  passing execution evidence. Disclosed root-only passes and no independent judge.

Root review confirmed the two shapes, explicit synthesis, and design-only
boundary in the returned artifact. Types are illustrative sketches, not a
compiled importer. The run exercises architect with arena's root fallback, not
native independent candidates, code integration, or an implementation/redesign loop.

## Pending

- Installed Codex discovery/loading of the five new entries and behavior tests.
- Arena native cross-judge, synthesis verification failures, and candidate dropout.
- Swarm real coverage/race/mixed selection and complete drainage under failure.
- Teach actual how/why composition and uncertainty retention.
- Authenticated why sources and architect implementation/redesign.
- Equivalent OMP live runs. Claude Code live runs explicitly deferred until an
  account is available.

The installed 49-entry local plugin was not replaced. No commit, push, tag, or
release was created by this batch.
