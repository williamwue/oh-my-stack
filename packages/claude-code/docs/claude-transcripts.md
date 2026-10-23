# Native Claude transcript evidence

Use the transcript path supplied by the native host when available. The
OMS helper provides a bounded fallback based on the exact session ID. It does
not read chat contents, infer the session from the shell's current directory,
or modify native configuration.

## Locate a file

Resolve the package root from the installation that supplied the workflow.
Run its `scripts/claude-transcript-location.mjs` with Node. In a source checkout,
use `tools/claude-transcript-location.mjs` instead.

```sh
node tools/claude-transcript-location.mjs --session-id SESSION_ID --config-dir /absolute/claude-config
node tools/claude-transcript-location.mjs --session-id SESSION_ID --transcript /absolute/session.jsonl
```

With no arguments, the CLI takes `CLAUDE_CODE_SESSION_ID` and
`CLAUDE_CONFIG_DIR` from the native environment. An unset configuration override
uses the user's `.claude` directory. Arguments override the corresponding
values. The explicit transcript path is authoritative; a missing or mismatched
path does not trigger a search for other chats.

The JSON result contains `status`, `basis`, `reason`, `sessionId`,
`transcriptPath` and `transcriptDirectory`. Status is `located`, `unavailable`
or `ambiguous`. Exit codes are 0 for located, 1 for unavailable or ambiguous,
and 2 for invalid input. File names establish location only, not transcript
content, tool execution, model identity or completed review.

## Search scope and limits

Session-ID lookup examines metadata beneath the selected configuration's
`projects` directory, checking direct `ID.jsonl` and nested `ID/ID.jsonl` files.
It scans at most 1,024 project entries and never reads unrelated chat bodies.
A bare session directory is not evidence. Multiple matches, incomplete reads
or symbolic links that prevent complete observation stay unresolved.
No path-encoding or hash heuristic is used when identity lookup fails.

Use this only for the authorized native session. Review the located transcript
through supported native tools before treating it as evidence, and recheck its
identity if the host session changes. This locator does not create decision
logs or enforce cross-family review. T3 workflows continue to use T3's thread
and task tools rather than this native fallback.
