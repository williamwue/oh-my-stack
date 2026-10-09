---
name: visual-parity
description: "Match a reference UI or migrate components while proving agreed visual equivalence against frozen captures."
disable-model-invocation: true
---

# Visual parity

## OMP model routing

At the start of this workflow, run `../../scripts/model-resolution.mjs`
with `--runtime omp --cwd` set to the current workspace. Read the returned
manifest: nearest project first, then the user's `~/.omp/agent/` default.
For each configured route, select its named agent through OMP's native
task-agent selector and verify that its source matches the chosen scope;
for a canonical role, use the manifest role's `agent` name (user
defaults use namespaced `ohmystack-role-*` agents).
Preserve panel entry order and count. If no mapping is present, retain the
workflow's normal runtime model. Verify resolved worker model and thinking
level from OMP session/job metadata, not from the role file alone.
When `task` returns a background job id, retain it until terminal status.
On OMP hosts exposing `proc://` (observed in 18.3.0), use `read proc://<id>`
for non-consuming status, `wait` to drain, and `write proc://<id>/kill`
to cancel an owned job with the required approval. Confirm cancellation
before replacing a worker and reject results from older generations.
Do not assume the deprecated `hub` tool exists. If safe cancellation
is unavailable, wait or report the unit incomplete; never silently
treat an unconfirmed worker as cancelled.

## Child session handoff

Read [the handoff contract](../poteto-mode/references/subagent-handoff.md).
New tasks, repair rounds, retries, and queue items use fresh child sessions
with the original brief, every later directive, prior findings and responses,
and unresolved objections. Reuse only for required costly live state, and
only when the host allows it. Stop and fence active writers before replacement.
A host-owned orchestrator's model catalog, workspace binding, child tools,
and review-round rules take precedence over the native binding above.
Keep its task handles and attribution receipts. Do not use a backing child
conversation as a new delegated review, or claim native-record verification
for a host-owned child. Report attribution evidence gaps explicitly.

## Local delivery evidence binding

Read [the delivery guide](../../docs/delivery-evidence.md) for the frozen
plan/evidence shapes and supported provenance protocol. The portable CLI is
`../../scripts/delivery-evidence.mjs` relative to this installed Skill.
Freeze before implementation, retain the lock digest, then inspect or run
explicitly selected checks against the actual final artifact. Unknown
required provenance stays unverified; local success does not certify release.

Freeze the visual inputs in the
[delivery evidence contract](../poteto-mode/references/delivery-evidence.md)
before changing the UI. Run the packaged checker on the actual final captures;
its pixel result is separate from capture authenticity and independent review.

Capture the baseline before migration. Freeze component states, viewport,
device scale, fonts, data, timing, and the image comparison method. Treat the
baseline as the current specification unless the user explicitly approves a
new appearance. Do not edit the baseline or loosen the harness to make a
failure pass.

For an adapted reference, freeze both the reference and the target capture
configuration. Declare authorized branding, copy, or media changes and their
bounded regions before implementation; keep those separate from areas that
must remain equivalent. A changed exception or tolerance starts an explicitly
revised acceptance boundary, not a hidden rerun of the original comparison.

Identify shared primitives and migrate them first when they affect multiple
components. Give each component an owner and distinct workspace if work is
parallel. Migrate one independently testable unit, render old and new on the
same controlled surface, and calculate the image difference. Investigate
nonzero differences with overlays and pixel locations; a compilation or
visual glance cannot establish parity.

Pixel-exact zero is the default when the request truly calls for exact parity.
If nondeterministic rendering makes zero impossible, surface the measured
variance and obtain an agreed tolerance before accepting it. Keep behavior
and accessibility checks alongside pixels when the migration touches them.

Retain image hashes, the capture-configuration hash, a calculated difference
artifact, measured counts, and a distinct review of residual differences.
Report every intentional region and per-component verdict. A sampled browser
playback alone does not prove visual equivalence.

Return baseline location, configuration, per-component diff result, approved
exceptions, and remaining components. Pull requests or publication need
separate user intent.
