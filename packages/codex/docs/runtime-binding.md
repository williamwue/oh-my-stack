# codex runtime binding

Prepare each worker with scripts/codex-delegation.mjs and pass its model, reasoning_effort, task_name, fork_turns=none and full role/task message to the native spawn tool. Resolve saved configuration with scripts/model-resolution.mjs. Verify observed routing from native records when available.

## Portable plan checker

The dependency-free Node helper `skills/poteto-mode/scripts/check-plan.mjs` is supported on this native host.
Resolve `<installed-package-root>` from the installed package that supplied this guide. Keep the project as the working directory.
Run `node "<installed-package-root>/skills/poteto-mode/scripts/check-plan.mjs" "/absolute/path/plan.md"`.
The checker exits 0 for a valid plan, 1 for plan problems, and 2 when the plan argument is missing.
A successful check validates the plan structure. It does not establish live, performance, review, or release evidence.

Relative to `skills/poteto-mode/SKILL.md` or `WORKFLOW.md`, the helper is `scripts/check-plan.mjs`.
Relative to `skills/poteto-mode/playbooks/multi-phase-plan.md`, it is `../scripts/check-plan.mjs`.
Relative to the public `skills/multi-phase-plan/SKILL.md` or `WORKFLOW.md`, it is `../poteto-mode/scripts/check-plan.mjs`.
These paths are relative to the named document, not the project working directory. Resolve them before invoking Node.

Other source-host helpers under a Skill's scripts directory remain reference-only unless this binding documents their exact native execution.
Cursor watch-pr, orchestration, and worktree helpers have no execution mapping in this native binding.

## Read-only worktree audit

The OMS-owned helper supports `node "<installed-package-root>/scripts/worktree-audit.mjs" scan --cwd PATH` and `assess --scan FILE --evidence FILE`.
Read [the evidence contract](worktree-audit.md) before collecting supported host evidence. Missing activity, pinned-thread, child-task or process coverage remains unresolved.
The helper rechecks local Git identities and status. A candidate is advisory and does not authorize deletion.

The native bounded GitHub helpers scripts/github-workflow.mjs, scripts/github-autopilot-provider.mjs and scripts/durable-run-state.mjs support only their documented single-PR operations and gates. Read docs/github-workflow.md before invoking them.

Role contracts preserve upstream task semantics. Follow the selected workflow's stages and review standard. Delegate the workers that workflow calls for. Host authorization and available tool contracts continue to apply.
