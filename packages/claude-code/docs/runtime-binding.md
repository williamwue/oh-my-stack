# claude-code runtime binding

Prepare native Agent calls with scripts/claude-delegation.mjs using the configured agent role/model and captured native capabilities. Read docs/claude-delegation.md for per-call effort, environment precedence and correlated evidence. Preserve the workflow's specified worker count and order; distinguish requested model/effort from observed execution. Record unavailable cancellation or effort evidence explicitly.

## Portable plan checker

The self-contained Node helper `skills/poteto-mode/scripts/check-plan.mjs` is supported on this native host. No runtime installation is required.
Resolve `<installed-package-root>` from the installed package that supplied this guide. Keep the project as the working directory.
Run `node "<installed-package-root>/skills/poteto-mode/scripts/check-plan.mjs" "/absolute/path/plan.md"`.
The checker exits 0 for a valid plan, 1 for plan problems, and 2 when the plan argument is missing.
A successful check validates the plan structure. It does not establish live, performance, review, or release evidence.

Relative to `skills/poteto-mode/SKILL.md` or `WORKFLOW.md`, the helper is `scripts/check-plan.mjs`.
Relative to `skills/poteto-mode/playbooks/multi-phase-plan.md`, it is `../scripts/check-plan.mjs`.
Relative to the public `skills/multi-phase-plan/SKILL.md` or `WORKFLOW.md`, it is `../poteto-mode/scripts/check-plan.mjs`.
These paths are relative to the named document, not the project working directory. Resolve them before invoking Node.

## Statechart helper

Run `node "<installed-package-root>/skills/statechart/scripts/statechart.mjs" --help` for the official commands and exit codes.
The portable Node scripts support from-spec and from-chart. Use a scratch folder and explicit absolute input and output paths.
TLC execution requires a separately installed TLA2TOOLS JAR and Java through the documented TLA2TOOLS and JAVA settings.
PNG rendering additionally requires mermaid-cli and a working browser. Missing tools are unavailable checks, not successful verification.

Other source-host helpers under a Skill's scripts directory remain reference-only unless this binding documents their exact native execution.
Cursor watch-pr, orchestration, and worktree helpers have no execution mapping in this native binding.

## Read-only worktree audit

The OMS-owned helper supports `node "<installed-package-root>/scripts/worktree-audit.mjs" scan --cwd PATH` and `assess --scan FILE --evidence FILE`.
Add `--format text` to assess for readable verdicts and reasons; JSON remains the default evidence format.
Read [the evidence contract](worktree-audit.md) before collecting supported host evidence. Missing activity, pinned-thread, child-task or process coverage remains unresolved.
The helper rechecks local Git identities and status. A candidate is advisory and does not authorize deletion.

## Locate the current native transcript

Prefer the transcript path supplied by the host. Otherwise run `node "<installed-package-root>/scripts/claude-transcript-location.mjs"` with the native CLAUDE_CODE_SESSION_ID and optional CLAUDE_CONFIG_DIR.
The helper returns JSON and reads directory and file metadata only. Exit 0 means a file was located; it does not prove its contents or the work. Exit 1 means unavailable or ambiguous; exit 2 means invalid input.
Use `--transcript ABSOLUTE_PATH` for an explicit host path and `--session-id ID` to constrain it. Missing or multiple matches must stay unresolved; do not substitute cwd-derived chats.
Read [native transcript evidence](claude-transcripts.md) for scope and limitations.

Role contracts preserve upstream task semantics. Follow the selected workflow's stages and review standard. Delegate the workers that workflow calls for. Host authorization and available tool contracts continue to apply.

## Skill navigation

Choose the task group, then read the selected Skill. Use the full catalog for other workflows.

- **Start and setup:** [`poteto-help`](../skills/poteto-help/SKILL.md), [`poteto-mode`](../skills/poteto-mode/SKILL.md), [`oms-auto`](../skills/oms-auto/SKILL.md), [`setup-oh-my-stack`](../skills/setup-oh-my-stack/SKILL.md).
- **Plan and design:** [`multi-phase-plan`](../skills/multi-phase-plan/SKILL.md), [`architect`](../skills/architect/SKILL.md).
- **Build and fix:** [`feature`](../skills/feature/SKILL.md), [`bug-fix`](../skills/bug-fix/SKILL.md), [`tdd`](../skills/tdd/SKILL.md), [`perf-issue`](../skills/perf-issue/SKILL.md).
- **Review and prove:** [`interrogate`](../skills/interrogate/SKILL.md), [`swarm`](../skills/swarm/SKILL.md), [`create-verification-skill`](../skills/create-verification-skill/SKILL.md).
- **Deliver:** [`opening-a-pr`](../skills/opening-a-pr/SKILL.md), [`babysit`](../skills/babysit/SKILL.md), [`shipping`](../skills/shipping/SKILL.md), [`autopilot-full`](../skills/autopilot-full/SKILL.md), [`autopilot-stack`](../skills/autopilot-stack/SKILL.md).
- **Resume and status:** [`pause-safely`](../skills/pause-safely/SKILL.md), [`session-pickup`](../skills/session-pickup/SKILL.md), [`ketchup`](../skills/ketchup/SKILL.md), [`recall`](../skills/recall/SKILL.md).

**Principles (24, read as needed):** [`principle-attack-the-premise`](../skills/principle-attack-the-premise/SKILL.md), [`principle-boundary-discipline`](../skills/principle-boundary-discipline/SKILL.md), [`principle-build-the-lever`](../skills/principle-build-the-lever/SKILL.md), [`principle-encode-lessons-in-structure`](../skills/principle-encode-lessons-in-structure/SKILL.md), [`principle-exhaust-the-design-space`](../skills/principle-exhaust-the-design-space/SKILL.md), [`principle-experience-first`](../skills/principle-experience-first/SKILL.md), [`principle-explain-the-number`](../skills/principle-explain-the-number/SKILL.md), [`principle-fix-root-causes`](../skills/principle-fix-root-causes/SKILL.md), [`principle-foundational-thinking`](../skills/principle-foundational-thinking/SKILL.md), [`principle-guard-the-context-window`](../skills/principle-guard-the-context-window/SKILL.md), [`principle-laziness-protocol`](../skills/principle-laziness-protocol/SKILL.md), [`principle-make-operations-idempotent`](../skills/principle-make-operations-idempotent/SKILL.md), [`principle-migrate-callers-then-delete-legacy-apis`](../skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md), [`principle-minimize-reader-load`](../skills/principle-minimize-reader-load/SKILL.md), [`principle-model-the-domain`](../skills/principle-model-the-domain/SKILL.md), [`principle-never-block-on-the-human`](../skills/principle-never-block-on-the-human/SKILL.md), [`principle-outcome-oriented-execution`](../skills/principle-outcome-oriented-execution/SKILL.md), [`principle-prove-it-works`](../skills/principle-prove-it-works/SKILL.md), [`principle-redesign-from-first-principles`](../skills/principle-redesign-from-first-principles/SKILL.md), [`principle-separate-before-serializing-shared-state`](../skills/principle-separate-before-serializing-shared-state/SKILL.md), [`principle-sequence-verifiable-units`](../skills/principle-sequence-verifiable-units/SKILL.md), [`principle-subtract-before-you-add`](../skills/principle-subtract-before-you-add/SKILL.md), [`principle-test-behavior-not-implementation`](../skills/principle-test-behavior-not-implementation/SKILL.md), [`principle-type-system-discipline`](../skills/principle-type-system-discipline/SKILL.md).

This is a documentation index. Invocation metadata and the host's native picker remain authoritative.
