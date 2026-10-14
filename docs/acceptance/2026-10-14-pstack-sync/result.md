# Local pstack 0.15.23 alignment

Installed the unpublished local candidate `0.17.1-pstack01523.20261014` for
Codex/T3 and native Claude using their official plugin managers. Both managers
report the candidate enabled. The installed payloads match all 344 Codex/T3
and 185 native Claude file hashes. All five recorded personal model and routing
configuration hashes remain unchanged.

The installed code is commit `fabaabe909afdb7a60039cbbb06bbc71307c06a0`, tree
`21fec8fe6591c3f2f12d2ea0310e754835986397`. Its release build records a clean
source checkout. Later acceptance-only commits do not change that provenance.
The complete upstream snapshot pins pstack 0.15.23 at
`ce649c03ac3b75b6ae80cbd15b7e2c536caedb5a`: 168 verified source files,
166 exact derivations, and the new explicit-only `in-your-own-words` entry.
Historical snapshots and unsuccessful diagnostic evidence remain preserved.

The changes restore upstream workflow rules, context-relative portable checker
paths, task effort selection, fresh panel defaults, and reported-rejection
fallback semantics across host adapters. Receipt validation binds actual
requests and preserves their original channel and refusal history. The latest
validated error governs equivalent candidates. A flat receipt ledger avoids
exponential history growth while rejecting forged, cyclic, missing, and
conflicting records.

The final repository check passed 662 tests with no failures or skips, including
generation, conformance, release reproducibility, validation, documentation,
and lint gates. Fourteen-request rejection chains stayed below 179 KB in the
regression fixtures. The final fresh independent Astra review returned
`No findings.` See [review-round-11.json](review-round-11.json),
[round-10-fullcheck.txt](round-10-fullcheck.txt), and
[installation.json](installation.json).

The user explicitly accepted a Codex-only final review when Cursor was disabled
and its executable unavailable. The saved cross-model reviewer configuration
was preserved. Configured Cursor seats remain unavailable; this run does not
silently replace them or enable another provider. Earlier cross-model review
results retain their own status and attribution.

The installed helper dispatched a fresh read-only T3 child probe to Codex Luna.
The completed task verified installed versions, explicit-only invocation, the
T3 receipt module import, and both checkers' usage exits. Separately, both
installed checkers accepted their documented plan skeleton from an unrelated
temporary project directory with `1 PR sections, 0 problems`. See
[installed-probe.json](installed-probe.json). The final Codex Astra decision-trail
review also returned `No findings.` under the same explicit user exception.
See [decision-trail-review.json](decision-trail-review.json).
Backend enforcement of requested effort and speed remains unverified. The
existing parent session's Skill inventory does not establish a refreshed UI
index; start a new session to load the new entries.

This candidate is local and unpublished. No branch push, PR, merge, formal
release, or provider setting change occurred in this alignment run. The main
checkout remains at formal 0.17.1. Previous payloads and the native Claude
marketplace's sole executable-mode change were backed up before replacement.
Candidate and rollback coordinates are relative to the home directory in
[installation-manager-inventory.json](installation-manager-inventory.json)
and the local candidate provenance.
