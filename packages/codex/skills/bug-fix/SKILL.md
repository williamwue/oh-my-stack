---
name: bug-fix
description: "Reproduce, fix, and independently verify a software defect."
---

# Bug Fix

## Codex delegation binding

For every delegated worker in this workflow, derive the exact `model`,
`reasoning_effort`, and complete role-plus-task `message` with
`../../scripts/codex-delegation.mjs prepare` relative to this Skill. It resolves
the nearest project manifest first, then the user manifest. Supply the named
route/panel entry where configured; otherwise supply the canonical role
and the observed parent model and effort. Pass
the returned `task_name`, `fork_turns=none`, model, effort, and message
explicitly to the spawn call. Do not use a generated custom-role name as a selector or
claim its TOML was activated. After the worker finishes, run the helper's
`verify` mode on the persisted parent and child records when available; it
checks the spawn metadata, parent link, and child `turn_context`.
The persisted spawn message may be encrypted; disclose when its exact
role/task text cannot be audited. If records are unavailable, state that
runtime model resolution is unverified.
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
