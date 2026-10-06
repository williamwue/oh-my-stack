# Skill directory

Generated from the packaged public catalog and Skill descriptions. To refresh this file,
run `npm run docs:generate` from the source checkout. `npm run docs:check` checks for drift.

89 public entries: 65 workflows and 24 principles.

This directory reflects the generated source packages. Released installations may differ;
see [published releases](https://github.com/williamwue/oh-my-stack/releases/latest)
and the [AIHero guide](aihero-original-skills.md) for unreleased additions.

For a first task, start with [the walkthrough](getting-started.md) or
[common task examples](guides/common-tasks.md). You do not need to learn every entry.

## Invocation and sources

Select `oh-my-stack:<name>` in Codex, or use `/oh-my-stack:<name>` in the Claude Code
conversation. `explicit` requires user selection; `automatic` also allows the agent
to invoke the Skill when appropriate. It does not guarantee automatic selection.

The links below open packaged Skill instructions. Those files are instructions for
agents; the user guides explain how to start tasks and what results to expect.

`OMS core` includes pstack-derived workflows and OMS additions. `aihero original`
identifies the selected original source directories. See the
[AIHero guide](aihero-original-skills.md), [source notices](../THIRD_PARTY_NOTICES.md),
and [support policy](support-policy.md) for source and testing boundaries.

## Workflows

65 entries.

| Skill | When to use it | Invocation | Source |
| --- | --- | --- | --- |
| [`architect`](../packages/codex/skills/architect/SKILL.md) | Design caller-first types and modules, compare alternatives, then implement within scope. | explicit | OMS core |
| [`arena`](../packages/codex/skills/arena/SKILL.md) | Compare independent candidates, select a base, graft stronger ideas, and verify. | explicit | OMS core |
| [`authoring-a-skill`](../packages/codex/skills/authoring-a-skill/SKILL.md) | Create or revise a scoped Skill and check its behavior. | explicit | OMS core |
| [`automate-me`](../packages/codex/skills/automate-me/SKILL.md) | Capture a user's recurring work conventions in a personal Skill. | explicit | OMS core |
| [`autonomous-run`](../packages/codex/skills/autonomous-run/SKILL.md) | Run a bounded task until its completion condition is verified. | explicit | OMS core |
| [`autopilot-full`](../packages/codex/skills/autopilot-full/SKILL.md) | Build, review, and land a queue only with explicit authorization. | explicit | OMS core |
| [`autopilot-stack`](../packages/codex/skills/autopilot-stack/SKILL.md) | Build and review a linear change stack; leave landing to the operator. | explicit | OMS core |
| [`babysit`](../packages/codex/skills/babysit/SKILL.md) | Check or repair a pull request; require separate merge authorization. | explicit | OMS core |
| [`benchmark-checklist`](../packages/codex/skills/benchmark-checklist/SKILL.md) | Vet performance measurements before reporting or acting on them. | explicit | OMS core |
| [`blast-radius`](../packages/codex/skills/blast-radius/SKILL.md) | Prove the safety assumptions and downstream risks of a change. | explicit | OMS core |
| [`bro`](../packages/codex/skills/bro/SKILL.md) | Restate the last answer plainly without changing its meaning. | explicit | OMS core |
| [`bug-fix`](../packages/codex/skills/bug-fix/SKILL.md) | Reproduce, fix, and independently verify a software defect. | automatic | OMS core |
| [`codebase-design`](../packages/codex/skills/codebase-design/SKILL.md) | Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill needs the deep-module vocabulary. | automatic | aihero original |
| [`correct`](../packages/codex/skills/correct/SKILL.md) | Prevent repeated repository mistakes with structural checks and failing proof. | explicit | OMS core |
| [`create-verification-skill`](../packages/codex/skills/create-verification-skill/SKILL.md) | Create and exercise a project-local user-path verification Skill. | explicit | OMS core |
| [`domain-modeling`](../packages/codex/skills/domain-modeling/SKILL.md) | Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a GLOSSARY.md, or recording or editing an ADR. | automatic | aihero original |
| [`eval`](../packages/codex/skills/eval/SKILL.md) | Compare workflow variants with blinded outputs and a frozen rubric. | explicit | OMS core |
| [`feature`](../packages/codex/skills/feature/SKILL.md) | Add or change behavior with design and end-to-end verification. | explicit | OMS core |
| [`figure-it-out`](../packages/codex/skills/figure-it-out/SKILL.md) | Plan and verify a complex task with an auditable decision trail. | explicit | OMS core |
| [`grill-me`](../packages/codex/skills/grill-me/SKILL.md) | A relentless interview to sharpen a plan or design. | explicit | aihero original |
| [`grill-with-docs`](../packages/codex/skills/grill-with-docs/SKILL.md) | A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go. | explicit | aihero original |
| [`grilling`](../packages/codex/skills/grilling/SKILL.md) | Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases. | automatic | aihero original |
| [`hillclimb`](../packages/codex/skills/hillclimb/SKILL.md) | Improve one metric through bounded measured attempts. | explicit | OMS core |
| [`how`](../packages/codex/skills/how/SKILL.md) | Explain a code path or subsystem using verified repository evidence. | explicit | OMS core |
| [`improve-codebase-architecture`](../packages/codex/skills/improve-codebase-architecture/SKILL.md) | Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick. | explicit | aihero original |
| [`interrogate`](../packages/codex/skills/interrogate/SKILL.md) | Review frozen inputs with independent reviewers and root judgment. | explicit | OMS core |
| [`investigation`](../packages/codex/skills/investigation/SKILL.md) | Answer an engineering question from evidence without changing code. | explicit | OMS core |
| [`maintain-verification-skill`](../packages/codex/skills/maintain-verification-skill/SKILL.md) | Audit and update a verification Skill using source and live behavior. | explicit | OMS core |
| [`make-bot-ui`](../packages/codex/skills/make-bot-ui/SKILL.md) | Build a local control page for an authenticated webhook. | explicit | OMS core |
| [`multi-phase-plan`](../packages/codex/skills/multi-phase-plan/SKILL.md) | Write a dependency plan with verifiable units and live checks. | explicit | OMS core |
| [`no-comments`](../packages/codex/skills/no-comments/SKILL.md) | Review comments, remove redundancy, and encode real constraints. | explicit | OMS core |
| [`opening-a-pr`](../packages/codex/skills/opening-a-pr/SKILL.md) | Prepare a reviewed pull request; publish only when explicitly requested. | explicit | OMS core |
| [`orchestrate`](../packages/codex/skills/orchestrate/SKILL.md) | Coordinate ongoing engineering work with bounded tasks and independent checks. | explicit | OMS core |
| [`pause-safely`](../packages/codex/skills/pause-safely/SKILL.md) | Checkpoint in-flight work when the user requests a pause. | explicit | OMS core |
| [`perf-issue`](../packages/codex/skills/perf-issue/SKILL.md) | Fix one performance issue with before and after traces. | explicit | OMS core |
| [`poteto-help`](../packages/codex/skills/poteto-help/SKILL.md) | Answer setup and workflow questions with a usable prompt and verified source. | explicit | OMS core |
| [`poteto-mode`](../packages/codex/skills/poteto-mode/SKILL.md) | Route an engineering request to the appropriate Oh My Stack workflow. | explicit | OMS core |
| [`prototype`](../packages/codex/skills/prototype/SKILL.md) | Test a design decision with an isolated throwaway experiment. | explicit | OMS core |
| [`prove-it-works`](../packages/codex/skills/prove-it-works/SKILL.md) | Check Skill loading and workspace facts without changing files. | automatic | OMS core |
| [`recall`](../packages/codex/skills/recall/SKILL.md) | Rebuild recent work context from history and live state. | explicit | OMS core |
| [`refactoring`](../packages/codex/skills/refactoring/SKILL.md) | Improve code structure while verifying unchanged behavior. | explicit | OMS core |
| [`reflect`](../packages/codex/skills/reflect/SKILL.md) | Review conversation lessons and propose scoped Skill improvements. | explicit | OMS core |
| [`reproduce-and-fix-issues`](../packages/codex/skills/reproduce-and-fix-issues/SKILL.md) | Benny repro automation only: reproduce triaged bugs before a draft PR. | explicit | OMS core |
| [`research`](../packages/codex/skills/research/SKILL.md) | Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent. | automatic | aihero original |
| [`runtime-forensics`](../packages/codex/skills/runtime-forensics/SKILL.md) | Diagnose a live process using runtime evidence. | explicit | OMS core |
| [`session-pickup`](../packages/codex/skills/session-pickup/SKILL.md) | Resume checkpointed work without repeating completed steps. | explicit | OMS core |
| [`setup-benny`](../packages/codex/skills/setup-benny/SKILL.md) | Configure Benny triage and reproduction automations. | explicit | OMS core |
| [`setup-matt-pocock-skills`](../packages/codex/skills/setup-matt-pocock-skills/SKILL.md) | Configure this repo for the engineering skills: set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills. | explicit | aihero original |
| [`setup-oh-my-stack`](../packages/codex/skills/setup-oh-my-stack/SKILL.md) | Configure role models from observed runtime inventory. | explicit | OMS core |
| [`shipping`](../packages/codex/skills/shipping/SKILL.md) | Land an explicitly authorized PR or stack after independent checks. | explicit | OMS core |
| [`show-me-your-work`](../packages/codex/skills/show-me-your-work/SKILL.md) | Record an append-only decision trail for long or delegated work. | explicit | OMS core |
| [`swarm`](../packages/codex/skills/swarm/SKILL.md) | Run bounded coverage or races, drain workers, and consolidate verified results. | explicit | OMS core |
| [`tdd`](../packages/codex/skills/tdd/SKILL.md) | Use for requested TDD or cheap local regression tests; skip unclear or costly test paths. | explicit | OMS core |
| [`teach`](../packages/codex/skills/teach/SKILL.md) | Explain mechanics and rationale plainly while preserving evidence and uncertainty. | explicit | OMS core |
| [`technical-writing`](../packages/codex/skills/technical-writing/SKILL.md) | Write or review docs, RFCs, READMEs, PR descriptions, and commit messages. | explicit | OMS core |
| [`to-questionnaire`](../packages/codex/skills/to-questionnaire/SKILL.md) | Turn a decision you can't fully answer into a questionnaire for someone else to fill in. | explicit | aihero original |
| [`to-spec`](../packages/codex/skills/to-spec/SKILL.md) | Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed. | explicit | aihero original |
| [`to-tickets`](../packages/codex/skills/to-tickets/SKILL.md) | Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker (edges as text in one file per ticket locally, or native blocking links on a real tracker). | explicit | aihero original |
| [`trace-forensics`](../packages/codex/skills/trace-forensics/SKILL.md) | Diagnose an existing trace or profile and map it to source. | explicit | OMS core |
| [`triage-issue-reports`](../packages/codex/skills/triage-issue-reports/SKILL.md) | Benny triage automation only: assess Slack reports and deduplicate tickets. | explicit | OMS core |
| [`typescript-best-practices`](../packages/codex/skills/typescript-best-practices/SKILL.md) | Apply type and boundary guidance to TS or TSX work. | explicit | OMS core |
| [`unslop`](../packages/codex/skills/unslop/SKILL.md) | Remove AI writing patterns when editing prose. | explicit | OMS core |
| [`visual-parity`](../packages/codex/skills/visual-parity/SKILL.md) | Migrate a UI against frozen visual baselines. | explicit | OMS core |
| [`why`](../packages/codex/skills/why/SKILL.md) | Investigate design rationale using cited history and available evidence sources. | explicit | OMS core |
| [`worktree-cleanup`](../packages/codex/skills/worktree-cleanup/SKILL.md) | Audit and reclaim scoped worktrees while preserving active work. | explicit | OMS core |

## Principles

24 entries.

| Skill | When to use it | Invocation | Source |
| --- | --- | --- | --- |
| [`principle-attack-the-premise`](../packages/codex/skills/principle-attack-the-premise/SKILL.md) | Question a shared premise after multiple fixes fail the same check. | explicit | OMS core |
| [`principle-boundary-discipline`](../packages/codex/skills/principle-boundary-discipline/SKILL.md) | Validate external boundaries and keep internal logic simple. | explicit | OMS core |
| [`principle-build-the-lever`](../packages/codex/skills/principle-build-the-lever/SKILL.md) | Use reusable tools for nontrivial edits, migrations, and checks. | explicit | OMS core |
| [`principle-encode-lessons-in-structure`](../packages/codex/skills/principle-encode-lessons-in-structure/SKILL.md) | Turn recurring corrections into executable rules. | explicit | OMS core |
| [`principle-exhaust-the-design-space`](../packages/codex/skills/principle-exhaust-the-design-space/SKILL.md) | Compare prototypes for unfamiliar UI or architecture decisions. | explicit | OMS core |
| [`principle-experience-first`](../packages/codex/skills/principle-experience-first/SKILL.md) | Prioritize polished user experience in product and scope decisions. | explicit | OMS core |
| [`principle-explain-the-number`](../packages/codex/skills/principle-explain-the-number/SKILL.md) | Explain what a measured number means and rule out misleading results. | explicit | OMS core |
| [`principle-fix-root-causes`](../packages/codex/skills/principle-fix-root-causes/SKILL.md) | Reproduce a defect and repair its cause instead of hiding symptoms. | explicit | OMS core |
| [`principle-foundational-thinking`](../packages/codex/skills/principle-foundational-thinking/SKILL.md) | Choose core data structures and shared-state ownership before logic. | explicit | OMS core |
| [`principle-guard-the-context-window`](../packages/codex/skills/principle-guard-the-context-window/SKILL.md) | Manage context growth from large outputs, repeated reads, and fan-out. | explicit | OMS core |
| [`principle-laziness-protocol`](../packages/codex/skills/principle-laziness-protocol/SKILL.md) | Prefer deletion and small changes when considering abstractions. | explicit | OMS core |
| [`principle-make-operations-idempotent`](../packages/codex/skills/principle-make-operations-idempotent/SKILL.md) | Make retries and partial runs converge on the same result. | explicit | OMS core |
| [`principle-migrate-callers-then-delete-legacy-apis`](../packages/codex/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md) | Migrate callers and remove the old internal API in the same change. | explicit | OMS core |
| [`principle-minimize-reader-load`](../packages/codex/skills/principle-minimize-reader-load/SKILL.md) | Reduce indirection and hidden state in hard-to-follow code. | explicit | OMS core |
| [`principle-model-the-domain`](../packages/codex/skills/principle-model-the-domain/SKILL.md) | Model state and repeated assumptions in explicit data structures. | explicit | OMS core |
| [`principle-never-block-on-the-human`](../packages/codex/skills/principle-never-block-on-the-human/SKILL.md) | Proceed with authorized reversible work; ask when authority is needed. | explicit | OMS core |
| [`principle-outcome-oriented-execution`](../packages/codex/skills/principle-outcome-oriented-execution/SKILL.md) | Keep phased migrations focused on the target architecture. | explicit | OMS core |
| [`principle-prove-it-works`](../packages/codex/skills/principle-prove-it-works/SKILL.md) | Verify the actual result before declaring a task complete. | explicit | OMS core |
| [`principle-redesign-from-first-principles`](../packages/codex/skills/principle-redesign-from-first-principles/SKILL.md) | Reconsider the design around a new requirement. | explicit | OMS core |
| [`principle-separate-before-serializing-shared-state`](../packages/codex/skills/principle-separate-before-serializing-shared-state/SKILL.md) | Separate concurrent writers before serializing shared state. | explicit | OMS core |
| [`principle-sequence-verifiable-units`](../packages/codex/skills/principle-sequence-verifiable-units/SKILL.md) | Order multi-step work into small, independently verified units. | explicit | OMS core |
| [`principle-subtract-before-you-add`](../packages/codex/skills/principle-subtract-before-you-add/SKILL.md) | Remove dead code and redundant structure before adding behavior. | explicit | OMS core |
| [`principle-test-behavior-not-implementation`](../packages/codex/skills/principle-test-behavior-not-implementation/SKILL.md) | Test observable behavior through the user's interface. | explicit | OMS core |
| [`principle-type-system-discipline`](../packages/codex/skills/principle-type-system-discipline/SKILL.md) | Model valid states and parse external data at typed boundaries. | explicit | OMS core |
