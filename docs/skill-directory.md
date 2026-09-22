# Skill directory

All 49 public Skills remain directly invocable. In Codex, select a Skill with
`$` or use `poteto-mode` to choose a workflow. Names below are unchanged.
Categories are documentation and display labels, not separate installations.

## Workflows (26)

| Skill | Scope |
| --- | --- |
| [autonomous-run](../src/core/skills/autonomous-run/SKILL.md) | Run a bounded task until its completion condition is verified. |
| [autopilot-full](../src/core/skills/autopilot-full/SKILL.md) | Build, review, and land a queue only with explicit authorization. |
| [autopilot-stack](../src/core/skills/autopilot-stack/SKILL.md) | Build and review a linear change stack; leave landing to the operator. |
| [babysit](../src/core/skills/babysit/SKILL.md) | Check or repair a pull request; require separate merge authorization. |
| [bug-fix](../src/core/skills/bug-fix/SKILL.md) | Reproduce, fix, and independently verify a software defect. |
| [feature](../src/core/skills/feature/SKILL.md) | Add or change behavior with design and end-to-end verification. |
| [how](../src/core/skills/how/SKILL.md) | Explain a code path or subsystem using verified repository evidence. |
| [interrogate](../src/core/skills/interrogate/SKILL.md) | Review frozen inputs with independent reviewers and root judgment. |
| [investigation](../src/core/skills/investigation/SKILL.md) | Answer an engineering question from evidence without changing code. |
| [opening-a-pr](../src/core/skills/opening-a-pr/SKILL.md) | Prepare a reviewed pull request; publish only when explicitly requested. |
| [orchestrate](../src/core/skills/orchestrate/SKILL.md) | Coordinate ongoing engineering work with bounded tasks and independent checks. |
| [pause-safely](../src/core/skills/pause-safely/SKILL.md) | Checkpoint in-flight work when the user requests a pause. |
| [poteto-mode](../src/core/skills/poteto-mode/SKILL.md) | Route an engineering request to the appropriate Oh My Stack workflow. |
| [prototype](../src/core/skills/prototype/SKILL.md) | Test a design decision with an isolated throwaway experiment. |
| [prove-it-works](../src/core/skills/prove-it-works/SKILL.md) | Check Skill loading and workspace facts without changing files. |
| [refactoring](../src/core/skills/refactoring/SKILL.md) | Improve code structure while verifying unchanged behavior. |
| [reproduce-and-fix-issues](../src/core/skills/reproduce-and-fix-issues/SKILL.md) | Benny repro automation only: reproduce triaged bugs before a draft PR. |
| [session-pickup](../src/core/skills/session-pickup/SKILL.md) | Resume checkpointed work without repeating completed steps. |
| [setup-benny](../src/core/skills/setup-benny/SKILL.md) | Configure Benny triage and reproduction automations. |
| [setup-oh-my-stack](../src/core/skills/setup-oh-my-stack/SKILL.md) | Configure role models from observed runtime inventory. |
| [shipping](../src/core/skills/shipping/SKILL.md) | Land an explicitly authorized PR or stack after independent checks. |
| [show-me-your-work](../src/core/skills/show-me-your-work/SKILL.md) | Record an append-only decision trail for long or delegated work. |
| [tdd](../src/core/skills/tdd/SKILL.md) | Use for requested TDD or cheap local regression tests; skip unclear or costly test paths. |
| [technical-writing](../src/core/skills/technical-writing/SKILL.md) | Write or review docs, RFCs, READMEs, PR descriptions, and commit messages. |
| [triage-issue-reports](../src/core/skills/triage-issue-reports/SKILL.md) | Benny triage automation only: assess Slack reports and deduplicate tickets. |
| [unslop](../src/core/skills/unslop/SKILL.md) | Remove AI writing patterns when editing prose. |

## Principles (23)

| Skill | Scope |
| --- | --- |
| [principle-attack-the-premise](../src/core/skills/principle-attack-the-premise/SKILL.md) | Question a shared premise after multiple fixes fail the same check. |
| [principle-boundary-discipline](../src/core/skills/principle-boundary-discipline/SKILL.md) | Validate external boundaries and keep internal logic simple. |
| [principle-build-the-lever](../src/core/skills/principle-build-the-lever/SKILL.md) | Use reusable tools for nontrivial edits, migrations, and checks. |
| [principle-encode-lessons-in-structure](../src/core/skills/principle-encode-lessons-in-structure/SKILL.md) | Turn recurring corrections into executable rules. |
| [principle-exhaust-the-design-space](../src/core/skills/principle-exhaust-the-design-space/SKILL.md) | Compare prototypes for unfamiliar UI or architecture decisions. |
| [principle-experience-first](../src/core/skills/principle-experience-first/SKILL.md) | Prioritize polished user experience in product and scope decisions. |
| [principle-fix-root-causes](../src/core/skills/principle-fix-root-causes/SKILL.md) | Reproduce a defect and repair its cause instead of hiding symptoms. |
| [principle-foundational-thinking](../src/core/skills/principle-foundational-thinking/SKILL.md) | Choose core data structures and shared-state ownership before logic. |
| [principle-guard-the-context-window](../src/core/skills/principle-guard-the-context-window/SKILL.md) | Manage context growth from large outputs, repeated reads, and fan-out. |
| [principle-laziness-protocol](../src/core/skills/principle-laziness-protocol/SKILL.md) | Prefer deletion and small changes when considering abstractions. |
| [principle-make-operations-idempotent](../src/core/skills/principle-make-operations-idempotent/SKILL.md) | Make retries and partial runs converge on the same result. |
| [principle-migrate-callers-then-delete-legacy-apis](../src/core/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md) | Migrate callers and remove the old internal API in the same change. |
| [principle-minimize-reader-load](../src/core/skills/principle-minimize-reader-load/SKILL.md) | Reduce indirection and hidden state in hard-to-follow code. |
| [principle-model-the-domain](../src/core/skills/principle-model-the-domain/SKILL.md) | Model state and repeated assumptions in explicit data structures. |
| [principle-never-block-on-the-human](../src/core/skills/principle-never-block-on-the-human/SKILL.md) | Proceed with authorized reversible work; ask when authority is needed. |
| [principle-outcome-oriented-execution](../src/core/skills/principle-outcome-oriented-execution/SKILL.md) | Keep phased migrations focused on the target architecture. |
| [principle-prove-it-works](../src/core/skills/principle-prove-it-works/SKILL.md) | Verify the actual result before declaring a task complete. |
| [principle-redesign-from-first-principles](../src/core/skills/principle-redesign-from-first-principles/SKILL.md) | Reconsider the design around a new requirement. |
| [principle-separate-before-serializing-shared-state](../src/core/skills/principle-separate-before-serializing-shared-state/SKILL.md) | Separate concurrent writers before serializing shared state. |
| [principle-sequence-verifiable-units](../src/core/skills/principle-sequence-verifiable-units/SKILL.md) | Order multi-step work into small, independently verified units. |
| [principle-subtract-before-you-add](../src/core/skills/principle-subtract-before-you-add/SKILL.md) | Remove dead code and redundant structure before adding behavior. |
| [principle-test-behavior-not-implementation](../src/core/skills/principle-test-behavior-not-implementation/SKILL.md) | Test observable behavior through the user's interface. |
| [principle-type-system-discipline](../src/core/skills/principle-type-system-discipline/SKILL.md) | Model valid states and parse external data at typed boundaries. |
