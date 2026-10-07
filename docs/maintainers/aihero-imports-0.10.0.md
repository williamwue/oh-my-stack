# AIHero 0.10.0 source candidate import record

Status: unreleased source candidate. The published release remains 0.9.1.
See the [user guide](../aihero-original-skills.md) for invocation and file effects.

## Source and selection

This candidate adds `research`, `to-questionnaire`,
`setup-matt-pocock-skills`, `to-spec`, and `to-tickets` to the six originals
shipped in 0.9.1. All eleven use
[mattpocock/skills at the pinned revision](https://github.com/mattpocock/skills/tree/6fd947921b935b7e1e69293a200400f0fdd5c15f).
The upstream main revision was rechecked on 2026-10-07 before import.

The same revision-bound snapshot is extended with 15 new original files;
all previously recorded files remain unchanged. The new directories retain
complete original instructions, UI metadata, and setup seed templates for
GitHub, GitLab, local Markdown, triage labels, and domain documents.
The existing MIT license is unchanged.

`upstream/source-skills.json` records exact file hashes and host requirements.
Each target copies the original files byte for byte and adds attribution,
`LICENSE`, and `SOURCE.json`. No original text or model routes are changed.
The adaptation list remains empty. Source and package validation reject drift,
omitted resources, and missing original invoked dependencies.

## Dependencies and configuration

None of the five new bodies invokes another skill through a Skill tool, so
all five have empty invoked-skill dependency lists. References to setup describe
a project configuration prerequisite; they are not automatic dependency calls.
`research` does require real background delegation and writing a cited note.

`setup-matt-pocock-skills` uses relative seed templates and edits existing
project instructions only after confirmation. `to-spec` and `to-tickets` read
the configured tracker and domain vocabulary. The original `triage` is not
selected, so setup skips its optional label section. The downstream original
workflows still apply `ready-for-agent`; a missing tracker or status vocabulary
must be supplied before proceeding. The local tracker template's mentions of
`wayfinder` do not mean that skill is installed.

Local Markdown acceptance is separate from remote tracker writes. A configured
GitHub, GitLab, or other tracker can produce real issues after the original
confirmation gates and applicable repository authorization.

## Design and throughput checkpoint

The existing source-manifest data shape already represents original directory,
invocation mode, required capabilities, dependency closure, and source hashes.
A direct manifest extension is sufficient; no generator redesign is needed.
The root is the sole writer for the overlapping manifest, generated packages,
and documentation. Independent host fixtures use distinct directories.

Blocking gates are original-byte integrity, complete resource packaging,
correct invocation mode, approval-before-write behavior, real background
research, and the full repository checks. Tests first exposed the five absent
skills, then passed after import. Existing release and installation gates remain
separate; these source changes do not publish or upgrade a personal plugin.

The [0.9.0 record](aihero-imports-0.9.0.md) remains historical. A future upstream
revision update still needs a new immutable snapshot and fresh affected-host
acceptance.
