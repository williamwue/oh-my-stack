---
name: poteto-mode
description: "Route a software-engineering request to the smallest admitted Oh My Stack workflow while preserving root ownership and evidence boundaries."
disable-model-invocation: true
---

# Poteto Mode

Use this router when the user asks for the pstack-style execution mode or when
they explicitly invoke this Skill. Select one primary workflow from observable
intent. Do not combine workflows merely because several could be relevant.

## Route

Use the first matching row:

| Observable request | Primary workflow |
| --- | --- |
| Build a local control page for an authenticated bot webhook | `make-bot-ui` |
| Create a project-local user-path verification Skill | `create-verification-skill` |
| Audit and repair an existing verification Skill and feature map | `maintain-verification-skill` |
| Capture recurring personal working conventions in a mode Skill | `automate-me` |
| Create or revise a task-specific Skill | `authoring-a-skill` |
| Reflect on conversation lessons and route them to scoped Skill changes | `reflect` |
| Reconstruct recent work from scoped history and current state | `recall` |
| Restate the last answer in plain language | `bro` |
| Compare workflow variants in a blinded experiment | `eval` |
| Improve one metric through sustained measured attempts | `hillclimb` |
| Diagnose an existing trace or profile artifact | `trace-forensics` |
| Diagnose a live process with captured runtime evidence | `runtime-forensics` |
| Migrate components against a frozen visual baseline | `visual-parity` |
| Audit and reclaim scoped worktrees or simulator state | `worktree-cleanup` |
| Write a dependency plan for several verifiable units without executing it | `multi-phase-plan` |
| Investigate downstream risks and prove the safety assumption behind a diff | `blast-radius` |
| Diagnose and fix one measured performance issue | `perf-issue` |
| Review comments and encode real constraints in scoped code | `no-comments` |
| Read or edit TypeScript with type and boundary guidance | `typescript-best-practices` |
| Execute a complex task that lacks a narrower workflow with an auditable plan | `figure-it-out` |
| Autonomously build, independently verify, and owner-land a bounded queue | `autopilot-full` |
| Autonomously build and verify a queue as one linear operator-landed stack | `autopilot-stack` |
| Coordinate a standing multi-session program with dependent units and repeated integration | `orchestrate` |
| Drive one bounded task to a checkable predicate without intermediate prompting | `autonomous-run` |
| Explicitly stop current in-flight work and leave it resumable | `pause-safely` |
| Resume or take over prior in-flight work from a durable trail | `session-pickup` |
| Check or make an existing pull request merge-ready without landing it | `babysit` |
| Explicitly land, merge, or ship an existing pull request or stack | `shipping` |
| Teach a subsystem or change with mechanics and rationale | `teach` |
| Investigate why a design, threshold, or tradeoff exists | `why` |
| Design caller-first types, signatures, and module boundaries before implementation | `architect` |
| Compare competing candidates and synthesize one artifact | `arena` |
| Run bounded parallel coverage or races and return one report | `swarm` |
| Explain code, trace ownership, or answer a read-only engineering question | `investigation` |
| Reproduce and correct defective behavior | `bug-fix` |
| Add or intentionally change product behavior | `feature` |
| Change structure while preserving behavior | `refactoring` |
| Build a throwaway experiment to decide between alternatives | `prototype` |
| Adversarially review a bounded change or design | `interrogate` |
| Improve prose without changing technical meaning | `technical-writing`, then `unslop` when useful |
| Publish the current reviewed branch as a pull request, explicitly requested by the user | `opening-a-pr` |

If a request mixes categories, choose the workflow that owns the requested end
state and record the secondary concern inside it. A discovered bug or feature
must not be hidden inside a behavior-preserving refactor. A prototype decides;
it does not silently become production code.

`autopilot-full` requires an explicit bounded full-autonomy grant and keeps
verdict authority in the root while each change owner performs its own
authorized merge. `autonomous-run` owns one bounded predicate and does not grant shipping
authority. `babysit` never implies landing; only explicit land, merge, or ship
intent routes to `shipping`. `autopilot-stack` owns autonomous queue build,
verification, and topology but never landing. `orchestrate` owns a durable
program that outlives one worker; it is not a more elaborate name for one
bounded task.

## Common invariants

- The root owns scope, the verdict boundary, and the final claim; each selected
  workflow assigns integration authority explicitly.
- Read-only questions do not modify implementation files.
- Writers receive bounded ownership and use isolation when available.
- A child report is evidence to inspect, not proof of success.
- Verification runs on the surface and artifact named by the request.
- External publication requires explicit user intent in the current request.
- Runtime configuration resolves models and tools. A current Oh My Stack
  resolution manifest may supply named workflow routes and ordered model
  panels; absent it, inherit the runtime model. Portable workflow text does
  not name concrete providers or model identifiers.
- Report fallbacks and evidence gaps where they affect confidence.

## Output

Name the selected workflow and the evidence in the request that selected it.
Then follow that workflow's output contract. Do not expose an internal routing
essay when a single sentence is enough.
