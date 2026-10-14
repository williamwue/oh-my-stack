# Candidate installation acceptance

Checklist item 1 passed its bounded acceptance: both generated candidates were
installed with native plugin managers and inventoried their 76 Skills. Codex
loaded `how` through its candidate registration; Claude explicitly loaded the
installed cache through session-only `--plugin-dir`. Both completed the installed
`how` simple workflow through a real nested T3 explainer. These components were
tested separately. Claude session loading through its isolated marketplace
registration and the T3 UI Skill picker-to-workflow flow remain unverified.

## Installation and discovery

The candidates remain version `0.16.0`; this is no release or replacement of the
maintainer's normal plugins. The native managers used isolated configuration
homes and local marketplaces under ignored `.tmp/t3-install-acceptance`.

| Host | Native CLI | Candidate registration | Skills | Cache equality |
| --- | --- | --- | --- | --- |
| Codex | 0.162.1 | `oh-my-stack@oms-t3-codex-acceptance` | 76 | All 297 files match the generated candidate. |
| Claude Code | 2.1.295 | `oh-my-stack@oms-t3-claude-acceptance` | 76 | All 188 files match the generated candidate. |

Codex used `plugin marketplace add`, `plugin add`, and a marketplace-filtered
`plugin list --json`. An unfiltered list exceeded its 40-second budget while
checking other marketplaces; narrowing the list returned the candidate.
Native `skills/list` returned all 76 candidate entries, including enabled
`oh-my-stack:how`, with no discovery errors.

Claude used `plugin marketplace add`, `plugin install --scope user`, and
`plugin list --json` within its isolated home. `plugin validate` passed.
`plugin details` listed 76 Skills, ten agents and one SessionStart hook.
The isolated manager's user scope refers to the test home. Actual T3 execution
used a session-only `--plugin-dir` pointing to that installed cache and a
session-only setting requesting that the normal OMS registration be disabled.
Duplicate exclusion was intended, but was not independently verified. No Claude
session used the isolated marketplace registration for loading.

## Explicit native entry

Codex received the installed Skill through structured `UserInput` of type
`skill`, with its discovered name and exact cache path, in an ephemeral native
app-server session. Claude received `/oh-my-stack:how` through native print mode,
with tools disabled and session persistence disabled. This Claude probe also
used `--plugin-dir` to the installed cache and the normal native account/home,
rather than loading through the isolated manager registration. Both answered a narrow
installation audit from the host-supplied Skill content, reproducing the T3
binding heading, paragraph, `delegate_task` directive and role-contract path.
No tool calls supplied that content. These probes test native explicit loading;
they did not execute the workflow or create top-level T3 conversations.

The coordinators reported that `how` was absent from their automatic model
discovery. Codex's original injected inventory was not independently inspected.
Claude's Skill tool rejection was initially coordinator-reported; the root later
verified the actual failed tool item in [the coordinator timeline receipt](claude-entry-block.json).
It explicitly directed the agent not to replicate the workflow by other means.
The parent acceptance assignment authorized manual loading for a separate
pipeline probe, and the coordinator proceeded despite that tool instruction.
This deliberate fallback is not a supported native invocation success and does
not prove a T3 UI picker or slash-command-to-workflow path.

## Installed workflow through T3

Two project-scoped test providers were added in T3 settings:
`OMS T3 验收 Codex` (`oms_t3_codex_acceptance`) and
`OMS T3 验收 Claude` (`oms_t3_claude_acceptance`). Their native health checks
reported authenticated existing accounts. The default Codex provider and the
disabled default Claude provider were not replaced or reconfigured.

Each acceptance coordinator read the installed `how` workflow and complete
explainer reference, selected its simple branch for a four-line utility,
prepared the canonical role with the installed helper, invoked one real
T3-owned explainer, independently checked its explanation, and presented the
result. Both nested tasks completed with no pending child runs. Their reported
models were `gpt-6.1-sol` and `claude-sonnet-5-5` respectively. The coordinator
requests explicitly selected Codex `reasoningEffort=high, serviceTier=default`
and Claude `effort=high`; nested requests omitted option overrides. Both native
explicit-entry probes also requested high effort. Codex's native thread-start
response reported `gpt-6.1-sol`; Claude's result reported `claude-sonnet-5-5`.
None of those records proves backend option enforcement.

The root independently read both nested T3 timelines. Each has a completed run,
a subagent parent relationship, zero pending requests and an empty checkpoint
change list. Observed actions read the fixture; Codex also read the installed
runtime binding. This is timeline evidence, not an exhaustive filesystem audit.
Read-only role instructions are coordination constraints, not OS sandboxes.

The fixture independently confirmed integer quantity validation and total
rounding, including the `1.005` floating-point edge case. The Codex coordinator's
17 checks concern this fixture, not the OMS repository test suite.
Claude's trimmed helper catalog and abbreviated context-transfer IDs are
retained as report limitations; root timeline reads corroborate task identities
and terminal states. Requested inheritance and reported models do not establish
effective reasoning effort or service tier.

## Configuration preservation and evidence

The normal Codex configuration and Claude settings match the baseline collected
at 2026-10-13T15:30:57Z, after CLI help/auth preflight and before candidate setup.
This is not a baseline from before every CLI call.
No workspace native plugin configuration files were created. Codex reused its
existing login through a local auth-file symlink in the test home; no credential
value was read, copied or printed. The isolated Codex config selected
`gpt-6.1-sol` with high effort and reused trusted status for this workspace.
Those writes were confined to the test home. Claude reused its existing native account.
Native CLI bookkeeping changed `~/.claude.json` caches, usage/setup metadata and
a profile refresh timestamp. The comparison spans manager setup, T3 child
sessions and explicit-entry probes; it does not attribute all changes to one
command. Compared account identity fields remained equal; that file is not
claimed to be byte-identical.

The two test provider instances, local marketplaces, installed caches and
ignored reports were retained at the acceptance snapshot. The user subsequently
authorized cleanup: both Provider instances were removed from T3's live catalog
and `.tmp/t3-install-acceptance` was deleted. [The cleanup receipt](cleanup.json)
records preserved original settings and credentials. Historical T3 child threads,
curated repository receipts and the generated `.tmp/t3` build remain. No commit,
PR, merge, publication or deployment was performed.

[The curated receipt](installation-receipt.json) preserves native inventory,
cache equality, explicit-entry answers, task IDs, terminal timeline metadata,
configuration hashes and source-report hashes. Its `<workspace>` and `~` paths
are deliberate redactions. Full ignored local logs were removed during the
authorized cleanup; the curated receipts preserve the recorded results.
Earlier verification and decision rows remain historical snapshots.

The [independent trail review](installation-trail-review.md) reported five
recordkeeping findings and no implementation defect. Its frozen scope preceded
these corrections. The coordinator's responses and retained limits are recorded
with the findings; the corrected record has not received a second review.
