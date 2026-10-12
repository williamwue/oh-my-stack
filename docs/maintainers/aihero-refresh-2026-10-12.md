# AIHero grilling and tracker setup refresh

Date: 2026-10-12. Status: local source candidate, not published or globally
installed. The existing default-routing candidate is retained in the same
isolated worktree.

## Source and scope

The first `aihero` source advances from
`6fd947921b935b7e1e69293a200400f0fdd5c15f` to
[`49dd158d1076134a641b33efb035946536778336`](https://github.com/mattpocock/skills/commit/49dd158d1076134a641b33efb035946536778336).
Its fourteen skills share one source record so their existing dependency closure
remains intact. All forty recorded files match the upstream Git blobs at the
new revision. Five files changed; the other thirty-five, including the MIT
license, are byte-for-byte unchanged.

- `grilling/SKILL.md` words questions so accepting the recommendation means yes.
- `setup-matt-pocock-skills/SKILL.md` creates configured missing tracker labels
  after the user has selected that setup scope.
- Its GitHub template reads issue bodies, labels and comments as JSON.
- Its GitLab template fixes list output flags and child issue references.
- Its label template identifies the editable tracker-label column explicitly.

The import preserves original bytes, UI metadata, invocation policy and
dependency arrays. No text adaptations are introduced. This import does not
run tracker setup or create labels.

Both old snapshots are retained. The `aihero-20261008` diagnosis/review source
remains at `f3fc5632f401156837ee3872f14fe33ccf1024ea`; its recorded files already
match the latest upstream versions. No new skills, including wizard, are added.
AIHero remains an explicit distribution extension. Automatic routing remains
included in the default package under the separate local change.

The [source receipt](../acceptance/aihero-refresh-2026-10-12/source-receipt.json)
records each old and new SHA-256 plus the verified upstream Git blob identity.

## Validation

The four source checks pass. The AIHero extension is regenerated and its
deterministic generation check passes across Codex, Claude Code, Pi and OMP.
The two updated skills pass byte, resource and source-coordinate checks in all
four outputs. Default package generation still includes automatic routing and
excludes AIHero unless selected.

The ordinary `npm run check` passes generation, documentation, conformance,
release reproducibility, source validation, book checks and Markdown checks.
Its test phase reports 403 passed, one failed and two skipped. The remaining
failure is the previously reproduced Homebrew Node relocation fixture:
`executable replacement after validation cannot establish a new pre-execution
baseline`. A copied Node executable cannot find its relative dynamic library
on this workstation; the same test fails on the unchanged repository.

Running the complete repository suite directly with a temporary process-scoped
`DYLD_LIBRARY_PATH` reports 404 passed, zero failed and two skipped. No test
assertion, runtime installation or user configuration is changed for that run.
The [local check receipt](../acceptance/aihero-refresh-2026-10-12/local-checks.json)
records both results. These checks establish source/resource consistency and
regressions, not live model behavior, global installation or release acceptance.

The general skill-creator Python validator requires PyYAML, which is absent
from this workstation's default Python. OMS's original-source validators remain
the applicable checks for these upstream files and their preserved metadata.
