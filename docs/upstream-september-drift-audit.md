# Cursor pstack upstream drift audit

Date: 2026-09-23. Compared pinned pstack commit
`86ecc82055e4d3cb567e72c56f390800a4978c9b` with current observed main
`70b2dc8b4b85c8d5648624ca40d692c421fff32f`. This is a semantic review
of the delta, not a claim of complete behavior parity with Cursor.

The pstack tree has 158 blob paths at both revisions: no additions or removals,
34 changed blobs, 81 inserted lines, and 101 deleted lines. The 47 main Skill
directories and 23 poteto-mode playbooks remain the same names. The changes
do not require new public Oh My Stack entries.

## Decisions

| Delta | Decision in Oh My Stack | Boundary |
| --- | --- | --- |
| Default Cursor models change to Opus 5.5 and Grok 4.7, with three rather than four default panel entries | Do not copy Cursor model slugs into the portable core. Continue resolving available host models and explicit user preferences at runtime. | The prior Codex and OMP parallel runs proved no model diversity. Role-routing parity needs separate native evidence. |
| `swarm` names exact revisions and measurement method, rejects incomplete receipts, and reports every proven issue | Adopt conditional revision/method requirements and one bounded retry for missing receipts. | Coverage-only smoke runs do not prove measurement or changed-patch handling. |
| `autopilot-full` and `autopilot-stack` start independent verification at code-ready, repeat on changed patches, use multiple focused audit lanes, track child state, and rebase at merge prep | Adopt the host-neutral round, evidence, owner-ledger, and gate order. Preserve explicit authority and native-provider stop conditions. | No real forge or long-running queue has passed this revised contract. |
| `shipping` can reuse a lane after a changed patch limited to tests/docs/lint only if repeated builds show merely reproducible noise | Keep the safer local rule: a changed stable patch invalidates the verdict. Do not grant the new exception without a deterministic build fixture and real provider evidence. | Less permissive than upstream, deliberately so. |
| `show-me-your-work/scripts/log.sh` changes header creation from overwrite to append | Adopt the no-truncate change while retaining local header validation and symlink refusal. | Local empty-file and append tests pass; a real faulty network mount was not reproduced. |
| `poteto-mode` adds decisions under a full-autonomy grant; `multi-phase-plan` quiets unchanged audit ticks | Retain the existing explicit-authority and bounded-wake contracts. Review these as host-specific autonomy and notification behavior, not a license to override operator gates. | No new unattended wake/approval test was performed. |
| Shorter prose in `blast-radius`, `figure-it-out`, `tdd`, `technical-writing`, `unslop`, and principles | Keep local stricter evidence and validation language where it protects behavior; do not remove it solely to match upstream wording. | Wording is not line-by-line synchronized. |

## Acceptance still needed

All three packages were generated and `npm run check` passed on 2026-09-23,
including 86 tests and the decision-log helper's empty-file preservation case.
These checks verify packaging and the script change, not model behavior.
The four changed Codex Skills passed Skill Creator validation. A local release
bundle was built and Plugin Creator validation passed. Codex's registered local
marketplace now serves version
`0.2.0-alpha.4+codex.20260923055103` from
`.local/share/oh-my-stack/releases/local-september-drift-w7cCKD/oh-my-stack-marketplace`
under the user's home directory. The installed cache tree matched the candidate
source recursively. This is a local candidate, not a public release; a new
Codex task is needed to load its changed instructions. OMP's normal-profile
plugin remains linked to the regenerated package; its plugin doctor passed and
native `omp read skill://swarm` and `skill://autopilot-full` returned the revised
instructions on OMP 18.2.10. Those are loading checks only.

Two read-only simulated receipts were then evaluated on the normal OMP profile
and fresh Codex CLI sessions. For `swarm`, a required worker's self-reported
PASS omitted exact base/head revisions and measurement sample count, unit, and
order. Both runtimes rejected PASS, required one retry under the frozen
contract, and withheld overall completion. For `autopilot-full`, a clean
`h1/p1` round was followed by changed patch `p2` at `h2`, with only old checks
and live proof. Both runtimes rejected the provider's merge-ready label,
required a fresh `h2/p2` verification round, and reserved the single-use
countersign for the root and landing for the owner. The Codex session IDs were
`01a0cce6-0024-76c0-b088-f204f40da190` and
`01a0cce6-e442-7240-abf2-531f9706473f`; each read the installed Skill file
under the versioned cache. OMP JSON traces
`01a0cce7-aac7-7354-800f-e2a9b0feaef9` and
`01a0cce7-fb95-761f-8897-21c61e5396a1` show native `read` calls resolving
to the linked package's respective Skill files. An earlier OMP plain-text
answer invented a workspace Skill path, so only the native tool traces are
used as loading-path evidence.

These are decision-branch simulations, not a live provider fixture or full
parallel run. Remaining acceptance is to prove actual child drainage and
retry, code-ready review timing, changed-patch invalidation with real CI and
live-surface receipts, and merge-preparation rebase/countersign behavior on
disposable provider-backed changes. Keep Claude Code live runs deferred until
the user has an account. No commit, tag, push, or public release is implied by
this audit.
