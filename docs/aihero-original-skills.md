# Use the AIHero originals

[English](aihero-original-skills.md) | [简体中文](zh-CN/guides/aihero.md)

Oh My Stack includes six selected original skills from Matt Pocock's
[skills repository](https://github.com/mattpocock/skills). Select one directly
when you want its original process. You do not need to enter `poteto-mode` first.

## Choose a capability

| Your task | Skill | Result and file effects |
| --- | --- | --- |
| Clarify a plan or design | `grill-me` | Numbered question rounds with recommendations; waits for your answers before moving on. |
| Clarify a plan and retain agreed domain language | `grill-with-docs` | Question rounds plus glossary updates and important architectural decision records when needed. |
| Find modules worth improving | `improve-codebase-architecture` | An HTML report with candidates; waits for your selection before discussing a candidate. It does not implement the refactor. |
| Compare module interfaces | `codebase-design` | Shared design vocabulary and principles, with references for deepening a module and comparing alternative designs. |
| Sharpen domain terminology | `domain-modeling` | Consistent terms in glossaries and architectural decision records, using the original formats. |
| Interview through a design's decisions | `grilling` | Questions in rounds whose prerequisites are settled; waits for answers and shared understanding. |

`grill-me`, `grill-with-docs`, and `improve-codebase-architecture` require explicit
user invocation. The other three can also be invoked by the agent, including
as dependencies of those workflows. All six remain separately selectable.

## Start an interview

In Codex, type `$` and select `oh-my-stack:grill-me`, then send:

```text
Help me plan partial cancellation of an Order Line.
Start with the first question round and wait for my answers.
Do not implement or change project files.
```

In Claude Code, send this in the conversation:

```text
/oh-my-stack:grill-me Help me plan partial cancellation of an Order Line. Start with the first question round and wait for my answers. Do not implement or change project files.
```

Expect questions with recommended answers. Answer the round before continuing.
The agent should investigate facts it can find in the project and leave
business decisions to you. Full implementation is a separate task after you
confirm shared understanding.

To keep the agreed language, select `oh-my-stack:grill-with-docs` in Codex or
use this Claude Code conversation command:

```text
/oh-my-stack:grill-with-docs Clarify partial Order cancellation. Record only confirmed domain terms and decisions; do not implement the feature.
```

This workflow can write `GLOSSARY.md`, contextual glossaries, and architectural
decision records in your project. Unresolved choices remain questions.

## Inspect a module's design

Select `oh-my-stack:improve-codebase-architecture` in Codex, or use:

```text
/oh-my-stack:improve-codebase-architecture Inspect the checkout module for improvement opportunities. Produce the report and wait for my choice; do not change implementation files.
```

The original workflow loads `codebase-design`, explores the codebase, writes
an HTML report to the operating system's temporary directory, and asks which
candidate to examine. Its later discussion also uses `grilling` and
`domain-modeling`, which can record agreed terms and decisions.

If the report does not open automatically, open the reported file yourself.
The report uses Tailwind and Mermaid from external CDNs; full styling and
diagrams need network access. Report creation has been observed in the
[bounded acceptance fixtures](aihero-original-0.9.0-acceptance.md), but automatic
opening and visual rendering are not fully verified.

For an interface design discussion without the codebase-wide scan, select
`codebase-design` and send:

```text
Examine the checkout module's interface and dependencies.
Use the original Design It Twice process to compare alternative interfaces.
Return the candidates and tradeoffs before editing implementation files.
```

The original reference asks for three or more independent parallel designs
with distinct constraints, then a comparison and recommendation. That process
can use multiple agent calls. It does not automatically enter OMS `architect`,
`arena`, or `refactoring`.

## Included source and support

The six original directories, references, and UI metadata retain their upstream
bytes at revision `6fd947921b935b7e1e69293a200400f0fdd5c15f`, with MIT licensing.
OMS packaging adds attribution and source receipts without inserting model
routing or replacing original dependencies with OMS workflows.

This selection does not include original `to-spec`, `to-tickets`,
`setup-matt-pocock-skills`, `wayfinder`, or `research`. See the
[Skill directory](skill-directory.md) for what is installed and the
[support policy](support-policy.md) for tested tools and remaining limits.

Source hashes, dependency closure, and the reviewed update procedure are in the
[maintainer import record](maintainers/aihero-imports-0.9.0.md).
