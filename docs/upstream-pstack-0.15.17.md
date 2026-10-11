# pstack 0.15.17 semantic port

OMS 0.15.0 incorporates selected behavior from pstack 0.15.14 through 0.15.17.
The upstream comparison is pinned from
`2cbf58508f40de470d7490b55c51d71241928fa2` to
`978ca6e9c0e012047cd5058b8e829240336e704e` in `cursor/plugins`.
OMS keeps its own version, runtime adapters, and complete delivery contract.

The [comparison](acceptance/2026-10-11/upstream-compare.json),
[source receipts](acceptance/2026-10-11/upstream-files.json), and
[file decisions](acceptance/2026-10-11/upstream-decisions.json) account for all
45 changed pstack files. Immutable snapshots also include the MIT license.
Historical snapshots and the published book edition remain unchanged.

## Conversation behavior

`ketchup` is an explicitly invoked, read-only catch-up for the current chat.
It starts after the last actual user message before the invocation, checks
the current state of touched PRs, CI runs and agents where tools allow, and
reports unavailable checks. Notifications do not move the starting point.
Older unanswered decisions remain visible. Work the agent can do itself is
listed as remaining work, rather than an action assigned to the user.

Help offers model setup at most once per chat when missing configuration
matters to the question. It answers the question regardless of the response.
Choosing now supplies the setup invocation; later, cancellation and silence
leave configuration unchanged. A help turn does not authorize setup or probes.

## Models and reasoning

Only the OMP Cursor `pstack` preset adopts the two-member Opus/Grok panels.
Codex, Claude Code and OMP's separate OpenAI-Codex preset keep their model
choices. Model selectors and supported efforts must appear in an observed
inventory; an example in the source is not evidence of account access.

Fresh setup defaults to large (xhigh). Explicit `unlimited` targets max;
large, medium and small target xhigh, high and medium. A selected model that lacks the target uses its highest supported
lower effort. This does not substitute another model or impose a spending cap.
Legacy reruns preserve saved effective choices and ordered panel membership.
An explicit budget selection adopts the current target semantics without
changing model identities or panel membership. Personal configuration is not
changed by building this release.

## Prose and acceptance

Upstream prose condensation is reviewed semantically. OMS retains its full
exploration, configured design panel, independent judgment, isolated writers,
and frozen final delivery checks. Shorter upstream text is not evidence of a
measured token, cost or performance improvement in OMS.

Generated-package consistency, local behavior checks, native runtime behavior
and delivery attribution are separate evidence categories. A missing host or
encrypted native assignment remains an explicit verification gap. A local
candidate does not establish publication or activation in existing sessions.
