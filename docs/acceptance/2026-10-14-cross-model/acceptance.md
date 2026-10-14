# Explicit cross-family model selection

The user authorized predictable provider/model selection after comparing
`t3-pstack` and the original pstack. This change extends the existing optional
T3 adapter. Native distribution packages and pinned pstack bodies remain
unchanged. The repository already contained staged T3 implementation and
installation records; the original index was preserved.

## Result

An optional `selectionPolicy` declares ordered trail-review candidates,
explicit same-family fallback targets, custom model-family assignments and
panel family minimums. Configuration validates runnable provider/model pairs
and typed options. Required trail review rejects an unknown author family or
a reviewer from that family. Runtime selection records skipped targets and
reasons, without enabling a provider or searching for an unconfigured model.

Prepared requests retain exact targets and stable retry identities. `observe`
can compare a saved request with reported provider/model metadata. Reported
model names and requested options do not establish backend identity or
reasoning-budget enforcement.

See [the English guide](../../t3-orchestration.md) and
[the Chinese guide](../../zh-CN/t3-orchestration.md).

## Local verification

The two affected test files pass 37 checks, covering unavailable providers,
ordered candidates, same-family rejection, custom family handling, panel
minimums, observation mismatches and retry stability. Detached T3 generation
and its consistency check pass. Default package generation, documentation
catalog, conformance and release consistency checks pass. Markdown lint and
the book validator pass.

At the initial installation snapshot, the complete repository check was blocked by the pre-existing
`docs/acceptance/2026-10-13-t3/cleanup.json` absolute-home-path violation.
That full Node run reported 440 passing tests, two skips and one failure in
`tests/delivery-evidence.test.mjs`, the executable-copy baseline test. Its
expected exit code is 1 and its observed exit code is null. A targeted rerun
reproduced that failure. Neither that test nor its implementation had been edited
at that snapshot. The repository gate was not reported as passing then.

## Local installation and boundaries

A detached build was installed through the native Codex plugin manager from
`~/.local/share/oh-my-stack/local-builds/t3-cross-model-20261014`. It replaces
only the machine's OMS marketplace source. The old released source remains
available for rollback. The local build retains version 0.16.0 and is not a
published release.

The installed cache matches all 302 packaged files. The new complete T3 user
resolution lives at `~/.oh-my-stack/t3/resolution.json`. Ordinary code roles use
Codex Sol, deep judgment uses Astra, and each configured panel uses Astra plus
Cursor Opus with a two-family minimum. For a GPT-authored trail, the ordered
cross-family candidates are Cursor Opus, Gemini, then Grok, at high effort.
The configured Astra target remains usable when the author is from a different
family. No unconfigured fallback channel is permitted.

Preparation using the installed helper and actual captured T3 catalog resolves
this policy from both the OMS source checkout and the FishSpeech worktree.
No reviewer was invoked, so this establishes selection preparation, not live
cross-provider execution. New sessions load the installed T3 Skill binding;
already-injected session instructions are not claimed to refresh.

Native Codex model configuration and manual routing match their pre-install
hashes. The independent Claude provider remains disabled. T3 provider settings
were not written. FishSpeech application files were not modified. No commit,
push, remote publication or production deployment was performed.

Ignored local artifacts under `.audit/cross-model-selection-20261014/` preserve
the baseline patches, logs, live catalog, configuration preview, installed
preparation results, cache comparison and a guarded rollback script. The
rollback script restores the original marketplace source and removes the new
T3 user resolution only if its hash still matches the installed candidate.

## Subsequent source closeout

The [source closeout](closeout.md) records the later user-authorized fixes,
independent review and local commit. The initial observations above remain
historical; the closeout does not add a model ranking or new-session workflow
acceptance.
