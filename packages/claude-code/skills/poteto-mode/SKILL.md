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
| Drive one bounded task to a checkable predicate without intermediate prompting | `autonomous-run` |
| Explicitly stop current in-flight work and leave it resumable | `pause-safely` |
| Resume or take over prior in-flight work from a durable trail | `session-pickup` |
| Check or make an existing pull request merge-ready without landing it | `babysit` |
| Explicitly land, merge, or ship an existing pull request or stack | `shipping` |
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

Requests for multi-project orchestration or autopilot programs remain outside
the admitted set. State that boundary and execute only the independently useful
admitted portion. Do not simulate an unimplemented advanced workflow.
`autonomous-run` owns one bounded predicate and does not grant shipping
authority. `babysit` never implies landing; only explicit land, merge, or ship
intent routes to `shipping`.

## Common invariants

- The root owns scope, integration, verification, and the final claim.
- Read-only questions do not modify implementation files.
- Writers receive bounded ownership and use isolation when available.
- A child report is evidence to inspect, not proof of success.
- Verification runs on the surface and artifact named by the request.
- External publication requires explicit user intent in the current request.
- Runtime configuration resolves models and tools; portable workflow text does
  not name concrete providers or model identifiers.
- Report fallbacks and evidence gaps where they affect confidence.

## Output

Name the selected workflow and the evidence in the request that selected it.
Then follow that workflow's output contract. Do not expose an internal routing
essay when a single sentence is enough.
