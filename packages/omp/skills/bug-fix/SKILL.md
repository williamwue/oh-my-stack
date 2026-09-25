---
name: bug-fix
description: "Diagnose and fix a reproducible software defect with bounded scope, same-surface evidence, and independent root verification."
---

# Bug Fix

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
For this workflow's implementers use `code.bug-fix`.

The root coordinator owns reproduction, scope, decisions, integration, and the
final verification claim. Delegation can accelerate one bounded implementation
unit, but a worker report is never sufficient proof that the defect is fixed.

## 1. Frame the defect

State the intended behavior, observed behavior, affected surface, smallest
known reproduction, and the boundary of the requested fix. Inspect the current
workspace before accepting assumptions from an issue, prior report, or another
session.

Reproduce the defect on the same user-facing or programmatic surface that will
be used for the final check. Capture the exact command, input, environment
facts that affect the result, exit status, and decisive output. If the original
surface is unreachable, stop claiming an exact reproduction: identify the
missing authority or environment and use the closest bounded check with that
limitation stated.

## 2. Establish the cause

Form concrete hypotheses and eliminate them with repository or runtime
evidence. Prefer the split that removes the most uncertainty. Instrument a
bounded path when state is otherwise invisible. The surviving explanation
must account for both the failing observation and the expected behavior.

Do not ship speculative guards or unrelated cleanup. Revert experimental edits
whose hypotheses were disproved. Preserve user changes outside the fix.

## 3. Choose the verification cadence

Use the `tdd` Skill when the defect has a clear, cheap executable test path or
the user requested a regression test. Record the failing-before result before
editing production code. When such a test would be misleading, expensive, or
unavailable, state why and choose the closest executable regression check.

For a multi-phase or unattended fix, use `show-me-your-work` to keep the
decision trail. A small direct fix does not need a ceremonial log.

## 4. Implement one bounded change

Prefer root-only execution when the fix is small, tightly coupled to the root's
context, or cannot be safely isolated. Otherwise start exactly one independent
implementer session using the active `code.bug-fix` route when configured,
or the runtime model otherwise, with:

- the confirmed reproduction and root-cause evidence;
- an explicit file and behavior scope;
- the required failing and passing checks;
- instructions to preserve unrelated work;
- an isolated workspace when the runtime supports it.

If custom roles are unavailable, provide the implementer contract inline. If
delegation or result collection is unavailable, execute the same bounded unit
in the root session. If isolation is unavailable, permit only one writer at a
time. Never let the root and worker edit the same checkout concurrently.

## 5. Review and verify from the root

Collect the worker result if one was used, then inspect the actual diff and
workspace state yourself. Reject out-of-scope changes and verify that the
implementation matches the established mechanism rather than merely hiding the
symptom.

Run the original reproduction again from the root on the same surface with the
same decisive inputs. Then run the focused regression check and proportionate
nearby validation. `INCONCLUSIVE`, a different surface, a worker's statement,
or a test that never demonstrated the failure is not evidence of a fix.

Do not create a commit, publish a branch, open a change request, deploy, or
perform another external mutation unless the user requested that action.

## Final report

Report:

- what was broken and the confirmed root cause;
- the bounded implementation change;
- whether execution was root-only or used one delegated implementer;
- failing-before and passing-after commands, exit states, and decisive output;
- nearby validation and any remaining limitation;
- confirmation that the root inspected the diff and reran the final checks.
