# Native effort and Pi observation convergence

This follow-up implements the two previously deferred capability entries in
the dual-reference registry. Official pstack remains pinned at `4ec7ffa`; the
secondary comparison remains `356c6e0`. The previous source upgrade, hardening
and dual-reference changes are preserved.

## Native Claude contract

The per-call helper uses the shared saved-role/task selection logic, requires
captured native capabilities, preserves the agent type, and emits native
`Agent.model`/`Agent.effort` fields. It does not dispatch, generate effort-wrapper
agents or rewrite saved configuration. Explicit no-effort selections omit the
field. Unsupported selectors, effort, model force and pre-2.1.292 per-call
effort fail before dispatch.

The audit separates configured, requested, environment-overridden expected and
observed effort. Verification needs the actual dispatch and child-ID-correlated
native PreToolUse effort evidence. Missing evidence stays inconclusive and a
model identity claim cannot be established from this hook. The hook accepts
both configured and packaged agent names, caps stored identity fields and
continues to omit tool inputs. The helper and contracts are generated into the
native Claude package; T3 continues using its separate `target.options` binding.

The official harness already maps model and effort. The secondary implementation
uses direct per-invocation effort instead of wrapper agents. OMS adapts those
contracts while retaining capability checks and evidence separation. The current
[native Claude documentation](https://code.claude.com/docs/en/sub-agents#choose-an-effort-level)
was checked for the minimum version and environment precedence.

## Pi observation and explicit persistence

`oms_delegate` now supports `list` alongside start/collect/cancel. It reports
only handles owned by this manager, cached phase/tool activity, bounded counters
and native session identity. Listing excludes tool arguments, prompts and full
output. Session identity changes and paths outside the explicitly selected
persistence directory fail instead of substituting a different session. Collection retains the bounded output contract and copy semantics.
Cancellation and shutdown terminate owned children and mark tool activity idle.

Ephemeral children remain the default. A start may explicitly select an existing
absolute `sessionDir` to enable native persistence for that child. Session ID and
file come from native RPC state; OMS does not infer paths or scan chat folders.
The reference's child activity and session visibility are adapted without its
broader orchestration policy or automatic worktree cleanup.

## Verification and remaining boundary

Focused source and generated-package behavior checks and a real installed Pi
CLI 1.2.0 against the generated Pi package are recorded in the local evidence folder
`.tmp/native-convergence-20261023/`. The native Pi runner uses an isolated local
simulated provider and disposable configuration, with no real model account.
It checks extension discovery, native start/collect/list, observed read-tool
activity, an actual persisted session file, cancellation, shutdown, retry
interception and requested/observed model equality.

The initial checks caught macOS path-alias assertion differences and a changed
trailing-RPC error caused by an extra state request. Assertions now compare real
paths; the final state refresh is limited to explicitly persisted tasks, keeping
the ephemeral malformed-output behavior intact. Both issues were rerun.

Final verification passed:

- 72 focused tests passed with no failures, including generated Claude CLI
  preparation and inconclusive verification, malformed Pi activity/session
  records, foreign-handle exclusion and session-directory containment.
- The installed Pi CLI 1.2.0 passed the generated-package local-provider
  acceptance, including actual read-tool events and a saved session file.
- `npm run generate`, `npm run release:build` and `npm run check` passed:
  **926 tests, 886 passed, 40 skipped, 0 failed**. The skips comprise 38 TLC
  prerequisites and two pinned-release-runtime cases.
- Detached T3 + AIHero generation and its comparison passed. All 181 official
  exact derivations remain valid. The actual dual-reference preview reports
  unchanged assessed source revisions and valid adoption records.
- `git diff --check` passed. Both former deferred implementation entries are now
  `adapted`; the automatic-cleanup policy remains explicitly rejected.

 Claude Code real-session
validation is intentionally excluded: actual native dispatch, alias routing,
environment precedence and hook correlation still require that observation.
Synthetic Claude records establish helper behavior only. No install, personal
configuration change, commit, push, publication or live-account call is performed.
