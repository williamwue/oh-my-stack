# pstack 0.15.13 behavior checks

This fixture checks candidate Skill behavior. Reading generated instructions,
validating a report, and running a native model turn are separate evidence.

## Correct a real historical failure

`historical/install-release.mjs` is the unmodified OMS installer at the revision
in `historical/source.json`. The prior release accepted file and directory
aliases without running its CLI. The historical regression record is
`docs/checklist-continuation-2026-10-03.md` in this repository.

Run `node setup-correct.mjs <disposable-project>` and then
`node verify-correct.mjs <disposable-project>`. Verification must fail before
the correction. A candidate `correct` session may change only the disposable
installer. The verifier remains outside that project. Verification after the
fix requires both aliases to inspect real package metadata, reject malformed
actions, and leave module import free of CLI side effects.

## Reject misleading measurements

`measurements.json` contains named synthetic adversarial receipts, not actual
performance results. Ask `benchmark-checklist` and `principle-explain-the-number`
to inspect the receipts and return a JSON report with `receiptSha256` and a
`cases` array containing `id`, `verdict`, and `reason`. Each receipt needs one
entry in order. Run `node verify-measurements.mjs <receipts> <report>`.

The false measurements must not yield a speedup verdict. A valid report is
evidence of this bounded interpretation task, not performance improvement or
general benchmarking capability.

## Keep help separate from execution

Ask the generated `poteto-help` how to choose a workflow for repeated mistakes.
It must read the owning installed Skill, answer, cite a usable source, and give
at most one prompt. Hash the disposable project before and after; verify no
edits, model probes, delegation, installation, or workflow execution occurred.
In a separate turn, explicitly request the historical correction through
`poteto-mode`; it must route to `correct` rather than treating the work as help.
