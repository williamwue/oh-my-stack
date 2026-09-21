---
name: show-me-your-work
description: "Keep a reviewable, append-only decision trail for long-running, delegated, or unattended work."
disable-model-invocation: true
---

# Show Me Your Work

Keep one canonical decision log. Use it for work with multiple phases, delegated
sessions, important pivots, or verification that a reviewer will inspect later.
Do not turn routine commands into noise.

## Start the log

Copy `references/decision-log-template.tsv` to `decisions.tsv` in the working
directory, or to `.audit/<task-slug>.tsv` when several efforts run at once.
Treat it as a working artifact by default. Commit it only when the user or the
review contract requires the trail to travel with the result.

The columns are:

- `ts`: an ISO 8601 timestamp;
- `phase`: the phase or workstream;
- `decision`: the concrete choice or action;
- `why`: the reason in plain language;
- `evidence`: a short, resolvable pointer such as a revision, command output,
  file location, trace, or screenshot;
- `result`: the observed state, including `open` or `INCONCLUSIVE` when the
  evidence is not final.

Use `scripts/log.sh <logfile> <phase> <decision> <why> <evidence> <result>` to
append a row. The helper creates the header, keeps cells on one line, and
neutralizes spreadsheet formulas. If packaged-script execution is unavailable,
append the same six columns using another safe workspace-writing mechanism and
disclose that fallback.

## What to log

Append one row for a decision or checkpoint that changes how a reviewer should
understand the work:

- choosing one implementation path over another;
- completing a bounded unit and recording its verification;
- rejecting, reverting, or superseding earlier work;
- surfacing a blocker or changing a gate;
- accepting or rejecting a delegated result.

The log is append-only. Correct a bad row with a later row that identifies what
it supersedes. Never rewrite or delete history to make the run look cleaner.
Evidence is a pointer, not a paragraph, and a claim without resolvable evidence
must remain open or inconclusive.

## Audit before handoff

Walk every row against the best evidence available from the current run.

1. Confirm that every row maps to an action that actually occurred.
2. Resolve each evidence pointer and confirm it supports the stated result.
3. Append missing pivots, abandoned approaches, verification failures, or
   superseding decisions that affected the outcome.
4. Append corrections for inaccurate rows; do not edit the earlier rows.
5. Remove no history. If a trivial row is distracting, append a note explaining
   that it is non-material.

When the runtime exposes an attributable transcript, include it in the audit.
When transcript access is absent, incomplete, encrypted, or external, audit the
visible messages, tool evidence, repository state, and other resolvable
pointers instead, and state the limitation. Never search unrelated private
sessions to fill that gap.

## Independent trail review

For consequential work, ask one new read-only reviewer session to inspect the
frozen log and the attributable evidence. A different model family is preferred
when the runtime can select and prove it, but model diversity is not a condition
for truth. If a distinct model or reviewer session is unavailable, perform the
review in the root session and disclose that it was not independent.

The review checks for weak evidence, unverified success claims, risky pivots,
missing failures, and gaps between the log and the observable run. Freeze the
review before final reporting. The root coordinator then resolves or reports
each flag and independently verifies the final workspace state.

Finish with an `Attention` section that names the review boundary and lists
specific flagged rows or says `No flags`. Report the resolved model identity
only when runtime-produced evidence establishes it; otherwise say that the
model identity was not verified.
