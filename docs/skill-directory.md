# Skill directory

Generated from the packaged public catalog and Skill descriptions. To refresh this file,
run `npm run docs:generate` from the source checkout. `npm run docs:check` checks for drift.

78 public entries: 54 workflows and 24 principles.

This directory reflects the generated source packages. Released installations may differ;
see [published releases](https://github.com/williamwue/oh-my-stack/releases/latest)
and the [AIHero guide](aihero-original-skills.md) for version requirements.

For a first task, start with [the walkthrough](getting-started.md) or
[common task examples](guides/common-tasks.md). You do not need to learn every entry.

## Invocation and sources

Select `oh-my-stack:<name>` in Codex, or use `/oh-my-stack:<name>` in the Claude Code
conversation. `explicit` requires user selection; `automatic` also allows the agent
to invoke the Skill when appropriate. It does not guarantee automatic selection.

The links below open packaged Skill instructions. Those files are instructions for
agents; the user guides explain how to start tasks and what results to expect.

The default catalog contains pinned pstack workflows, built-in OMS routing and necessary host bindings. `aihero original`
identifies the selected original source directories. See the
[AIHero guide](aihero-original-skills.md), [source notices](../THIRD_PARTY_NOTICES.md),
and [support policy](support-policy.md) for source and testing boundaries.

## Workflows

54 entries.

| Skill | When to use it | Invocation | Source |
| --- | --- | --- | --- |
| [`architect`](../packages/codex/skills/architect/SKILL.md) | Design caller-first types and modules, compare alternatives, then implement within scope. | explicit | pstack core / host binding |
| [`arena`](../packages/codex/skills/arena/SKILL.md) | Compare independent candidates, select a base, graft stronger ideas, and verify. | explicit | pstack core / host binding |
| [`authoring-a-skill`](../packages/codex/skills/authoring-a-skill/SKILL.md) | Create or revise a scoped Skill and check its behavior. | explicit | pstack core / host binding |
| [`automate-me`](../packages/codex/skills/automate-me/SKILL.md) | Capture a user's recurring work conventions in a personal Skill. | explicit | pstack core / host binding |
| [`autonomous-run`](../packages/codex/skills/autonomous-run/SKILL.md) | Run a bounded task until its completion condition is verified. | explicit | pstack core / host binding |
| [`autopilot-full`](../packages/codex/skills/autopilot-full/SKILL.md) | Build, review, and land a queue only with explicit authorization. | explicit | pstack core / host binding |
| [`autopilot-stack`](../packages/codex/skills/autopilot-stack/SKILL.md) | Build and review a linear change stack; leave landing to the operator. | explicit | pstack core / host binding |
| [`babysit`](../packages/codex/skills/babysit/SKILL.md) | Check or repair a pull request; require separate merge authorization. | explicit | pstack core / host binding |
| [`benchmark-checklist`](../packages/codex/skills/benchmark-checklist/SKILL.md) | Vet performance measurements before reporting or acting on them. | explicit | pstack core / host binding |
| [`blast-radius`](../packages/codex/skills/blast-radius/SKILL.md) | Prove the safety assumptions and downstream risks of a change. | explicit | pstack core / host binding |
| [`bro`](../packages/codex/skills/bro/SKILL.md) | Restate the last answer plainly without changing its meaning. | explicit | pstack core / host binding |
| [`bug-fix`](../packages/codex/skills/bug-fix/SKILL.md) | Reproduce, fix, and independently verify a software defect. | automatic | pstack core / host binding |
| [`correct`](../packages/codex/skills/correct/SKILL.md) | Prevent repeated repository mistakes with structural checks and failing proof. | explicit | pstack core / host binding |
| [`create-verification-skill`](../packages/codex/skills/create-verification-skill/SKILL.md) | Create and exercise a project-local user-path verification Skill. | explicit | pstack core / host binding |
| [`eval`](../packages/codex/skills/eval/SKILL.md) | Compare workflow variants with blinded outputs and a frozen rubric. | explicit | pstack core / host binding |
| [`feature`](../packages/codex/skills/feature/SKILL.md) | Add or change behavior with design and end-to-end verification. | explicit | pstack core / host binding |
| [`figure-it-out`](../packages/codex/skills/figure-it-out/SKILL.md) | Plan and verify a complex task with an auditable decision trail. | explicit | pstack core / host binding |
| [`hillclimb`](../packages/codex/skills/hillclimb/SKILL.md) | Improve one metric through bounded measured attempts. | explicit | pstack core / host binding |
| [`how`](../packages/codex/skills/how/SKILL.md) | Explain a code path or subsystem using verified repository evidence. | explicit | pstack core / host binding |
| [`in-your-own-words`](../packages/codex/skills/in-your-own-words/SKILL.md) | Restate the user's goal and problem before work starts. | explicit | pstack core / host binding |
| [`interrogate`](../packages/codex/skills/interrogate/SKILL.md) | Review frozen inputs with independent reviewers and root judgment. | explicit | pstack core / host binding |
| [`investigation`](../packages/codex/skills/investigation/SKILL.md) | Answer an engineering question from evidence without changing code. | explicit | pstack core / host binding |
| [`ketchup`](../packages/codex/skills/ketchup/SKILL.md) | Catch up on this chat, current work status, and decisions waiting on you. | explicit | pstack core / host binding |
| [`maintain-verification-skill`](../packages/codex/skills/maintain-verification-skill/SKILL.md) | Audit and update a verification Skill using source and live behavior. | explicit | pstack core / host binding |
| [`make-bot-ui`](../packages/codex/skills/make-bot-ui/SKILL.md) | Build a local control page for an authenticated webhook. | explicit | pstack core / host binding |
| [`multi-phase-plan`](../packages/codex/skills/multi-phase-plan/SKILL.md) | Write a dependency plan with verifiable units and live checks. | explicit | pstack core / host binding |
| [`no-comments`](../packages/codex/skills/no-comments/SKILL.md) | Review comments, remove redundancy, and encode real constraints. | explicit | pstack core / host binding |
| [`oms-auto`](../packages/codex/skills/oms-auto/SKILL.md) | Route opted-in repository engineering tasks; skip chat, translation, and tool help. | automatic | OMS built-in |
| [`opening-a-pr`](../packages/codex/skills/opening-a-pr/SKILL.md) | Prepare a reviewed pull request; publish only when explicitly requested. | explicit | pstack core / host binding |
| [`orchestrate`](../packages/codex/skills/orchestrate/SKILL.md) | Coordinate ongoing engineering work with bounded tasks and independent checks. | explicit | pstack core / host binding |
| [`pause-safely`](../packages/codex/skills/pause-safely/SKILL.md) | Checkpoint in-flight work when the user requests a pause. | explicit | pstack core / host binding |
| [`perf-issue`](../packages/codex/skills/perf-issue/SKILL.md) | Fix one performance issue with before and after traces. | explicit | pstack core / host binding |
| [`poteto-help`](../packages/codex/skills/poteto-help/SKILL.md) | Answer setup and workflow questions with a usable prompt and verified source. | explicit | pstack core / host binding |
| [`poteto-mode`](../packages/codex/skills/poteto-mode/SKILL.md) | Route engineering work while preserving required design, judgment, and proof. | explicit | pstack core / host binding |
| [`prototype`](../packages/codex/skills/prototype/SKILL.md) | Test a design decision with an isolated throwaway experiment. | explicit | pstack core / host binding |
| [`recall`](../packages/codex/skills/recall/SKILL.md) | Rebuild recent work context from history and live state. | explicit | pstack core / host binding |
| [`refactoring`](../packages/codex/skills/refactoring/SKILL.md) | Improve code structure while verifying unchanged behavior. | explicit | pstack core / host binding |
| [`reflect`](../packages/codex/skills/reflect/SKILL.md) | Review conversation lessons and propose scoped Skill improvements. | explicit | pstack core / host binding |
| [`runtime-forensics`](../packages/codex/skills/runtime-forensics/SKILL.md) | Diagnose a live process using runtime evidence. | explicit | pstack core / host binding |
| [`session-pickup`](../packages/codex/skills/session-pickup/SKILL.md) | Resume checkpointed work without repeating completed steps. | explicit | pstack core / host binding |
| [`setup-oh-my-stack`](../packages/codex/skills/setup-oh-my-stack/SKILL.md) | Configure role models or optional Codex automatic routing. | explicit | pstack core / host binding |
| [`sharpen`](../packages/codex/skills/sharpen/SKILL.md) | Frame a task around the user's goal, expert methods, and an outside check, then execute. | explicit | pstack core / host binding |
| [`shipping`](../packages/codex/skills/shipping/SKILL.md) | Land an explicitly authorized PR or stack after independent checks. | explicit | pstack core / host binding |
| [`show-me-your-work`](../packages/codex/skills/show-me-your-work/SKILL.md) | Record an append-only decision trail for long or delegated work. | explicit | pstack core / host binding |
| [`swarm`](../packages/codex/skills/swarm/SKILL.md) | Run bounded coverage or races, drain workers, and consolidate verified results. | explicit | pstack core / host binding |
| [`tdd`](../packages/codex/skills/tdd/SKILL.md) | Use for requested TDD or cheap local regression tests; skip unclear or costly test paths. | explicit | pstack core / host binding |
| [`teach`](../packages/codex/skills/teach/SKILL.md) | Explain mechanics and rationale plainly while preserving evidence and uncertainty. | explicit | pstack core / host binding |
| [`technical-writing`](../packages/codex/skills/technical-writing/SKILL.md) | Write or review docs, RFCs, READMEs, PR descriptions, and commit messages. | explicit | pstack core / host binding |
| [`trace-forensics`](../packages/codex/skills/trace-forensics/SKILL.md) | Diagnose an existing trace or profile and map it to source. | explicit | pstack core / host binding |
| [`typescript-best-practices`](../packages/codex/skills/typescript-best-practices/SKILL.md) | Apply type and boundary guidance to TS or TSX work. | explicit | pstack core / host binding |
| [`unslop`](../packages/codex/skills/unslop/SKILL.md) | Remove AI writing patterns when editing prose. | explicit | pstack core / host binding |
| [`visual-parity`](../packages/codex/skills/visual-parity/SKILL.md) | Match a reference UI or migrate against frozen visual baselines. | explicit | pstack core / host binding |
| [`why`](../packages/codex/skills/why/SKILL.md) | Investigate design rationale using cited history and available evidence sources. | explicit | pstack core / host binding |
| [`worktree-cleanup`](../packages/codex/skills/worktree-cleanup/SKILL.md) | Audit and reclaim scoped worktrees while preserving active work. | explicit | pstack core / host binding |

## Principles

24 entries.

| Skill | When to use it | Invocation | Source |
| --- | --- | --- | --- |
| [`principle-attack-the-premise`](../packages/codex/skills/principle-attack-the-premise/SKILL.md) | Question a shared premise after multiple fixes fail the same check. | explicit | pstack core / host binding |
| [`principle-boundary-discipline`](../packages/codex/skills/principle-boundary-discipline/SKILL.md) | Validate external boundaries and keep internal logic simple. | explicit | pstack core / host binding |
| [`principle-build-the-lever`](../packages/codex/skills/principle-build-the-lever/SKILL.md) | Use reusable tools for nontrivial edits, migrations, and checks. | explicit | pstack core / host binding |
| [`principle-encode-lessons-in-structure`](../packages/codex/skills/principle-encode-lessons-in-structure/SKILL.md) | Turn recurring corrections into executable rules. | explicit | pstack core / host binding |
| [`principle-exhaust-the-design-space`](../packages/codex/skills/principle-exhaust-the-design-space/SKILL.md) | Compare prototypes for unfamiliar UI or architecture decisions. | explicit | pstack core / host binding |
| [`principle-experience-first`](../packages/codex/skills/principle-experience-first/SKILL.md) | Prioritize polished user experience in product and scope decisions. | explicit | pstack core / host binding |
| [`principle-explain-the-number`](../packages/codex/skills/principle-explain-the-number/SKILL.md) | Explain what a measured number means and rule out misleading results. | explicit | pstack core / host binding |
| [`principle-fix-root-causes`](../packages/codex/skills/principle-fix-root-causes/SKILL.md) | Reproduce a defect and repair its cause instead of hiding symptoms. | explicit | pstack core / host binding |
| [`principle-foundational-thinking`](../packages/codex/skills/principle-foundational-thinking/SKILL.md) | Choose core data structures and shared-state ownership before logic. | explicit | pstack core / host binding |
| [`principle-guard-the-context-window`](../packages/codex/skills/principle-guard-the-context-window/SKILL.md) | Manage context growth from large outputs, repeated reads, and fan-out. | explicit | pstack core / host binding |
| [`principle-laziness-protocol`](../packages/codex/skills/principle-laziness-protocol/SKILL.md) | Prefer deletion and small changes when considering abstractions. | explicit | pstack core / host binding |
| [`principle-make-operations-idempotent`](../packages/codex/skills/principle-make-operations-idempotent/SKILL.md) | Make retries and partial runs converge on the same result. | explicit | pstack core / host binding |
| [`principle-migrate-callers-then-delete-legacy-apis`](../packages/codex/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md) | Migrate callers and remove the old internal API in the same change. | explicit | pstack core / host binding |
| [`principle-minimize-reader-load`](../packages/codex/skills/principle-minimize-reader-load/SKILL.md) | Reduce indirection and hidden state in hard-to-follow code. | explicit | pstack core / host binding |
| [`principle-model-the-domain`](../packages/codex/skills/principle-model-the-domain/SKILL.md) | Model state and repeated assumptions in explicit data structures. | explicit | pstack core / host binding |
| [`principle-never-block-on-the-human`](../packages/codex/skills/principle-never-block-on-the-human/SKILL.md) | Proceed with authorized reversible work; ask when authority is needed. | explicit | pstack core / host binding |
| [`principle-outcome-oriented-execution`](../packages/codex/skills/principle-outcome-oriented-execution/SKILL.md) | Keep phased migrations focused on the target architecture. | explicit | pstack core / host binding |
| [`principle-prove-it-works`](../packages/codex/skills/principle-prove-it-works/SKILL.md) | Verify the actual result before declaring a task complete. | explicit | pstack core / host binding |
| [`principle-redesign-from-first-principles`](../packages/codex/skills/principle-redesign-from-first-principles/SKILL.md) | Reconsider the design around a new requirement. | explicit | pstack core / host binding |
| [`principle-separate-before-serializing-shared-state`](../packages/codex/skills/principle-separate-before-serializing-shared-state/SKILL.md) | Separate concurrent writers before serializing shared state. | explicit | pstack core / host binding |
| [`principle-sequence-verifiable-units`](../packages/codex/skills/principle-sequence-verifiable-units/SKILL.md) | Order multi-step work into small, independently verified units. | explicit | pstack core / host binding |
| [`principle-subtract-before-you-add`](../packages/codex/skills/principle-subtract-before-you-add/SKILL.md) | Remove dead code and redundant structure before adding behavior. | explicit | pstack core / host binding |
| [`principle-test-behavior-not-implementation`](../packages/codex/skills/principle-test-behavior-not-implementation/SKILL.md) | Test observable behavior through the user's interface. | explicit | pstack core / host binding |
| [`principle-type-system-discipline`](../packages/codex/skills/principle-type-system-discipline/SKILL.md) | Model valid states and parse external data at typed boundaries. | explicit | pstack core / host binding |
