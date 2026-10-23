# Reference hardening: implementation and verification

This work follows the [incremental reference assessment](../../maintainers/pstack-claude-assessment-2026-10-23.md).
The earlier uncommitted pstack 0.15.30 upgrade is preserved. Official pstack
remains the sole workflow semantic source; no reference policy fork is imported.

## Scope

- Parse local Markdown destinations with angle brackets, escapes, balanced
  parentheses, titles and rendered references using CommonMark tokens. Preserve
  code-example exclusions, URI checks and repository containment; reject symlink
  escapes. Decode character references before resolving destinations. Unused
  reference definitions create no rendered link and are ignored.
- Retain worktrees when their HEAD reflog is the only remaining reachability
  source for commits. Unknown observations cannot establish candidacy. The
  audit stays read-only and does not authorize cleanup.
- Locate an authorized native Claude transcript by explicit host path or exact
  session identity. Report ambiguity, missing metadata and incomplete scans;
  do not substitute chats based on the shell's current directory.
- Calibrate the real PNG comparison with swapped pixels that preserve color
  totals, and refuse missing required images. Existing pixel/channel checks
  remain the controls for changed quantities.

## Verification

- `npm run generate` passed during integration. After review corrections,
  `npm run release:build` and the required `npm run check` passed:
  **904 tests, 864 passed, 40 skipped, 0 failed**. The 40 skips comprise 38
  TLC-dependent cases and two cases requiring the pinned release runtime.
- Parent reran all 56 worktree-audit tests successfully. The original real-Git
  reflog-only reproduction changed from `candidate` with no reasons to `hold`
  with `HEAD_REFLOG_ONLY_COMMITS`.
- Markdown, transcript locator and image-comparison focused checks passed:
  36 tests, no failures. The valid angle-bracket destination now passes; known
  missing, escaping and malformed targets remain rejected.
- Detached T3 + AIHero generation and its `--check` both passed after final
  integration. Public native packages were generated from source.
- `git diff --check` passed. No live Claude session or installed cache was
  used to claim runtime acceptance.

Full root output is retained locally in
`.tmp/reference-hardening-20261023/check-r2.log`, with focused logs and the
original probe result alongside it. The independent review's source hashes are
captured in `review-r2-source-hashes.json` and match the final source files.

The independent implementation worktrees are retained under `/tmp/` for this
session. The local decision trail and prepared task receipts are in the ignored
`.tmp/reference-hardening-20261023/` directory. Logs contain local fixture and
source evidence rather than user chat bodies.

## Review boundary

The configured cross-family trail-review preparation returned
`BLOCKED: independent review`: the primary role is the same GPT family and all
permitted non-GPT channels are disabled. No reviewer has been silently replaced.
This does not count as a completed trail audit. Ordinary independent code review
round one with GPT-6 Astra (high reasoning) found two P2 Markdown extraction
defects: nested or multiline labels and blockquote reference definitions were
missed, and character references were not decoded before fragment handling.
The custom extraction was replaced with `markdown-it` CommonMark tokens. The
existing transitive version 15.0.1 is now an exact development dependency;
the lockfile changes only the root dependency entry. New regressions produced
eight failing cases before the correction; all 17 Markdown tests now pass.

A fresh round two with GPT-6 Astra (high reasoning) reported **no findings**.
It confirmed both fixes with 18 read-only Markdown cases, comparator controls,
and source/generated-byte checks. The parent subsequently completed the full
check above. Review receipts remain in the local evidence directory. This is
ordinary independent code review and does not satisfy the blocked cross-family
trail-audit requirement.

No push, publication, installed-plugin update, native live-model execution or
worktree deletion is part of this change.
