# AIHero 0.9.0 original-skills acceptance

Date: 2026-10-06. Source revision:
`mattpocock/skills@6fd947921b935b7e1e69293a200400f0fdd5c15f`.
The isolated candidate builds on released 0.8.0 main. All selected original
files retain their upstream bytes; no host-syntax text adaptation is applied.

## Bounded live evidence

[The sanitized evidence](acceptance/aihero-0.9.0/live.json) retains prompts,
completed responses, actual document/report contents, hashes and attributed
agent activity. Raw traces and preliminary runs remain private scratch files.

Codex CLI 0.160.1 (gpt-6.1-sol, high effort) selected original project-local
skills through structured native inputs. Claude Code 2.1.287
(claude-opus-5-5, high effort) loaded the candidate as a session plugin;
explicit-only skills started through native user slash commands. Four separate
fresh fixtures on each host established:

- `grill-me` loads `grilling`, asks numbered questions with recommendations,
  and stops for answers without implementation.
- `grill-with-docs` loads both original dependencies, writes the already
  confirmed domain terms using the original glossary format, and asks the
  first unresolved question round before waiting.
- `domain-modeling` reads both original formats and writes four distinct
  canonical terms plus the explicitly agreed ADR, surfacing disagreement
  between the existing code and the agreed model without implementing it.
- `improve-codebase-architecture` loads `codebase-design` and `HTML-REPORT.md`,
  delegates read-only exploration, writes a real HTML report to the OS temp
  directory, and asks which candidate to explore before implementation.

All fixture code remains byte-identical. The Codex architecture run includes
an explorer retry; a completed attributed child is visible in the native trace.
Its OS browser-opening attempts failed with missing-executable errors, so report
creation is verified but automatic display is not. Claude also produced its
report; visual styling and CDN rendering were not browser-verified.

Claude correctly refused model Skill calls for explicit-only entries.
Those negative runs were not counted as workflow success. Native slash runs
were repeated with stdin closed so command arguments could not ingest the
Python transport script; preliminary traces were retained privately.

## Regression and publication boundary

`npm run check` passes 246 tests, including original-file integrity,
invocation modes, complete dependency closure, tamper rejection, and real
Markdown links outside fenced templates. All 401 prior generated skill files
match the 0.8.0 base. The complete bilingual book audit and five Python tests
pass; Claude's native plugin manifest validator passes.

These are bounded CLI observations, not full semantic equivalence. Complete
interviews, architecture's later selected-candidate loop, automatic trigger
quality, Desktop picker interaction and live OMP behavior remain unverified.
Native Codex plugin discovery and dependency loading after installation are
separate release gates. Independent review, fresh remote CI, clean tagged
builds and downloaded-asset verification follow the
[candidate checklist](acceptance/aihero-0.9.0/README.md).
