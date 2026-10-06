# AIHero original skills in Oh My Stack

The first integration provides Matt Pocock's original `codebase-design` skill.
It is selected from [mattpocock/skills](https://github.com/mattpocock/skills),
pinned at `6fd947921b935b7e1e69293a200400f0fdd5c15f`, and distributed under its
original MIT license. The 0.8.0 release candidate builds on the 0.7.0 source baseline.
Publication status is recorded in the
[GitHub release](https://github.com/williamwue/oh-my-stack/releases/tag/v0.8.0);
installed versions require fresh native-manager checks.
The first bounded design acceptance was collected on the earlier 0.6.0 baseline.
The [acceptance record](aihero-original-acceptance-2026-10-06.md) separates
original-byte checks, bounded live behavior, and unverified entry points.

## Use the original capability

After installing a candidate package through the normal package lifecycle:

- Codex: select `oh-my-stack:codebase-design` in the skill picker. A project-local
  copy under `.agents/skills/codebase-design/` is also available for a disposable
  CLI acceptance run; that route is tested separately from native plugin selection.
- Claude Code: invoke `/oh-my-stack:codebase-design`. A session-only candidate can
  be loaded with `claude --plugin-dir /absolute/path/to/candidate-plugin`.

Example request:

```text
Use codebase-design to examine the checkout module's interface and dependencies.
Explore alternative interfaces using the original Design It Twice process.
Design only; return the three candidates and their tradeoffs before editing code.
```

The original skill defines module/interface/depth/seam vocabulary and interface
design principles. `DEEPENING.md` supplies dependency categories and testing
strategy. `DESIGN-IT-TWICE.md` specifies three or more independent parallel
designs with distinct constraints, followed by comparison and a recommendation.
These remain the original process. The skill does not automatically enter
Oh My Stack's `architect`, `arena`, or `refactoring` workflows.

## Original content and packaging

The original `SKILL.md`, both reference documents, and `agents/openai.yaml`
are copied byte for byte into each generated target. Original automatic
invocation is preserved. No OMS model routing or delegation instructions are
inserted. Each skill receives an additional `LICENSE` and `SOURCE.json`; the
package also contains `licenses/aihero/LICENSE`. The catalog identifies the
source repository, revision, resource path, dependencies, and adaptations.
The adaptation list is empty for this first skill.

[The source manifest](../upstream/source-skills.json) records every source file
hash. The loader rejects changed originals, missing dependencies, unrecorded
resources, symlinks, unsafe paths, and names conflicting with an existing skill.
Package validation checks original resource hashes again after generation.
Markdown style exceptions preserve the author's formatting; they do not modify
the imported documents.

The existing pstack-derived core remains a separate provenance path with its
historical adaptations in [third-party notices](../THIRD_PARTY_NOTICES.md) and
`upstream/semantic-derivations.json`. Those historical adaptations are not
represented as original-byte equivalence.

## Updating the selected source

1. Inspect the upstream commit and the complete selected skill directory.
2. Keep the existing revision snapshot unchanged. Create a new revision-bound
   snapshot with the skill, references, UI metadata, and original license.
3. Review content, invocation, resource links, and new skill/tool dependencies.
   Extend the selection with required dependencies, or report an unsupported
   dependency. Do not silently substitute another OMS workflow.
4. Update the source manifest's revision, snapshot path, and file hashes. Record
   any required host syntax adaptation before applying it.
5. Generate packages and run regression checks. Repeat affected live host
   acceptance against the new source and candidate package.

This is a reviewed source update procedure. There is no automatic upstream
promotion or claim that unchanged packaging proves changed workflow behavior.

## Next selected capabilities

`domain-modeling` is the next candidate. Its complete dependency set includes
`GLOSSARY-FORMAT.md` and `ADR-FORMAT.md`. It maintains domain terms and records
decisions during a session; it is separate from the existing pstack domain
principle.

`grill-with-docs` depends on the original `grilling` and `domain-modeling`
skills. `improve-codebase-architecture` depends on `codebase-design`, `grilling`,
and `domain-modeling`, plus `HTML-REPORT.md`. The latter skills explicitly call
the host's Skill tool and include interaction/document-writing behavior.
Their import needs a source-faithful dependency invocation binding on Codex and
OMP, and plugin-qualified resolution checks on Claude Code. They are not
included in this first candidate; packaging unresolved dependencies would make
the original ability incomplete.

Future OMS combinations will have their own names and opt-in entry points.
Original source entries remain separately usable.
