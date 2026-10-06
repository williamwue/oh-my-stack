# AIHero original skills in Oh My Stack

Version 0.9.0 provides six complete original skills from
[mattpocock/skills](https://github.com/mattpocock/skills), pinned at
`6fd947921b935b7e1e69293a200400f0fdd5c15f` under the original MIT license.
It adds five skills to the released 0.8.0 `codebase-design` baseline:
`grill-me`, `grilling`, `domain-modeling`, `grill-with-docs`, and
`improve-codebase-architecture`.

The [0.9.0 acceptance record](aihero-original-0.9.0-acceptance.md) separates
original-byte checks, bounded live behavior, and unverified surfaces.
[The first design acceptance](aihero-original-acceptance-2026-10-06.md)
remains historical evidence for its earlier source baseline.
Publication status is recorded by [GitHub releases](https://github.com/williamwue/oh-my-stack/releases/latest);
installed versions require fresh native-manager checks.

## Use the original capability

After installing through the normal package lifecycle, select the corresponding
`oh-my-stack:<name>` in Codex's skill picker or invoke `/oh-my-stack:<name>`
directly in Claude Code. In particular, `grill-me`, `grill-with-docs`, and
`improve-codebase-architecture` are user-invoked originals; asking Claude's
model to call their Skill tool is not the same entry and is rejected by the
host. `grilling`, `domain-modeling`, and `codebase-design` retain their original
model-invocable behavior.

- `grill-me` loads original `grilling`: ask design questions in dependency-aware
  rounds with recommended answers, then wait. It does not implement before
  shared understanding is confirmed.
- `grill-with-docs` loads original `grilling` and `domain-modeling`: interview
  while recording resolved domain terms and offering important ADRs.
- `domain-modeling` sharpens domain language and maintains `GLOSSARY.md`,
  contextual glossaries, and ADRs using both original reference formats.
- `improve-codebase-architecture` loads original `codebase-design`, then scans
  for deepening opportunities, writes a visual HTML report to the OS temp
  directory, and waits for a candidate selection. Its later conversation loads
  original `grilling` and `domain-modeling`; it does not implement the refactor.

Original dependency names resolve to the selected skills on the observed
Codex project-local and Claude plugin surfaces; no text adaptation or OMS
workflow substitution is applied. Native Codex plugin dependency resolution
is a separate release-install gate. OMP original-file packaging is verified;
these five workflows have not received live OMP acceptance.

Example Claude commands (select the same names in Codex):

```text
/oh-my-stack:grill-me Plan partial cancellation of an Order Line.
/oh-my-stack:grill-with-docs Clarify Order cancellation and retain agreed domain terms.
/oh-my-stack:improve-codebase-architecture Inspect the checkout module for deepening opportunities.
```

The HTML report uses the author's Tailwind and Mermaid CDN dependencies;
viewing it fully styled requires network access. The report is written outside
the repository, but domain-modeling can write glossaries and ADRs inside it.
These are original effects, not an OMS automatic implementation or shipping flow.

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

Every selected original `SKILL.md`, reference document, and `agents/openai.yaml`
is copied byte for byte into each generated target. Original explicit or
automatic invocation is preserved. No OMS model routing or delegation instructions are
inserted. Each skill receives an additional `LICENSE` and `SOURCE.json`; the
package also contains `licenses/aihero/LICENSE`. The catalog identifies the
source repository, revision, resource path, dependencies, and adaptations.
The adaptation list is empty for all six selected skills.

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

## Selection boundary

The manifest includes the complete invoked dependency closure. `grill-me`
depends on `grilling`; `grill-with-docs` depends on `grilling` and
`domain-modeling`; `improve-codebase-architecture` depends on `codebase-design`,
`grilling`, and `domain-modeling`. Complete original directories include
`GLOSSARY-FORMAT.md`, `ADR-FORMAT.md`, and `HTML-REPORT.md` where required.

No original `to-spec`, `to-tickets`, `setup-matt-pocock-skills`, `wayfinder`,
or `research` is included in 0.9.0. Those need their own selection and host
acceptance. Future OMS combinations will have their own names and opt-in
entry points. Original source entries remain separately usable.
