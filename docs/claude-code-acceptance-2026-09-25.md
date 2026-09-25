# Claude Code first native acceptance — 2026-09-25

This is a bounded macOS CLI observation on Claude Code 2.1.282, not complete
pstack parity or a user-level Oh My Stack installation. The user had an
authenticated Claude Code session. Testing used `--plugin-dir`, which loads the
plugin only for the test session and did not change Claude Code plugin settings.

The published `v0.2.0-beta.3` Claude Code archive was extracted into a
dedicated temporary directory. `claude plugin validate` passed against its
plugin root. A fresh plan-mode run explicitly invoked
`/oh-my-stack:prove-it-works` from that extracted package. Session
`ac5351e3-222b-4f6a-81d8-cd16793e078e` reported the installed Skill path,
the repository root, and a clean Git tree; the invocation had no permission
denials or file changes.

A second fresh plan-mode run selected the packaged native
`oh-my-stack:explorer` agent once. Session
`7895af48-f81f-4d00-b0c7-8f3ae5f7c395` recorded one requested, spawned,
and completed child of that exact type. Its child transcript reported
`claude-opus-5-5`; the root independently confirmed `package.json` name and
version. The run did not set a route model or effort, so it verifies native
role discovery and basic delegation, **not** Oh My Stack model routing or
reasoning intensity. Neither a three-worker panel nor a write workflow ran.

`claude -p '/model'` returned aliases including Fable, but a separate
session-local `/model fable` request reported that Fable 5.1 requires one-time
interactive consent on this account. A menu entry is therefore not sufficient
evidence of account entitlement. The current Claude inventory collector
continues to fail closed, and `setup-oh-my-stack` must not write a guessed
model mapping. The next implementation slice is a verified account-aware
inventory, native `model` and `effort` route definitions, and parent/child
acceptance that checks the actual model and effort. Personal Claude settings
and the project repository were not changed by these live probes.

Machine-readable evidence: [native-plugin-smoke.json](../evals/evidence/claude-code-2.1.282/native-plugin-smoke.json).
