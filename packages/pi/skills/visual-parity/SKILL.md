---
name: visual-parity
description: "Follow the upstream Visual parity playbook for its named task."
disable-model-invocation: true
---

## Pi native binding

Read [the native binding](../../docs/runtime-binding.md) and
[model selection](../../docs/model-selection.md). Use `oms_delegate` with
`start`, `collect`, and `cancel` for the workflow's explicitly requested
route/member. Saved Pi resolution and packaged role contracts select
the child model, thinking level, and permissions. Preserve panel order and
count. Supply explicit context and an isolated checkout for writing roles.
Report actual model and effort separately from requested configuration.

Host adaptation. Read the installed package's [runtime binding](../../docs/runtime-binding.md) for delegation, tools, paths, transcript access, and control surfaces, and [model selection](../../docs/model-selection.md) for the named routes and ordered panels below. These bindings translate host calls; they add no workflow stages. Continue already authorized implementation through its checks. Advice-only requests end with advice. Publication, merge, deployment, billable requests, credential access, and user-scope configuration retain the host and project authorization gates. A workflow step naming one of these actions does not grant that authority. Source-host helpers under `../poteto-mode/scripts/` are reference-only unless the generated binding identifies supported execution for that exact helper; use the documented native helper only for the capability it supports. Report unavailable capabilities and verification separately.

### Visual parity

**You own pixel-exact equivalence. The baseline is the spec. You do not touch it.** Equivalence is verified by image diff, not by eye.

1. Establish the baseline first, before any migration: a visual regression harness that screenshots the current component across its states, plus the target when matching two implementations. No baseline, no parity claim. A blocking prerequisite, not a follow-up.
2. Anti-shortcut clauses, stated and held: no harness modifications, no baseline tampering, no component restructuring to make a diff pass. If the baseline looks wrong, stop and ask, don't edit it.
3. Migrate one component at a time. Parallelize across worktrees, one owner per component (the **separate-before-serializing-shared-state** principle skill). Shared primitives migrate first as a blocking phase.
4. Verify each component against its baseline via image diff on the matching surface via the control skill. A nonzero diff is a fail. Investigate the pixel delta. `/loop` per component until the diff is zero.
5. Run **Opening a PR** per component or per safe batch.

**Reply:** components migrated, the diff result for each, the baseline harness location, what's left.
