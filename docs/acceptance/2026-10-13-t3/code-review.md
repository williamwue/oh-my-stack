# Independent T3 code review

## Round one

The frozen source scope excluded the unrelated `package.json` package-manager edit.
Both reviewers ran as T3-owned children. T3 reported their provider and model;
effective reasoning and service-tier options remain unverified.

### Reviewer A, gpt-6-astra

#### Findings from Astra

### 1. [critical] Detached-output guard allows probe generation to delete source directories

**Location**: `tools/generate.mjs:922`, `generateProbeTargets`

**Finding**: The new guard accepts both `src` and the repository’s parent directory as detached destinations. Probe generation then recursively deletes that destination.

**Evidence**: Read-only execution of the exact guard accepted both paths. The CLI path `--orchestration t3 --include-probes --output-root src` reaches `generateProbeTargets`, loads the model, and executes `rm(out, { recursive: true, force: true })`. This deletes canonical source before rendering fails. Choosing the repository’s parent deletes the checkout too.

**Suggestion**: Before recursive removal, reject repository ancestors and protected source directories. Confine probe output to an explicitly disposable destination.

### 2. [critical] Recording a queued task prevents observing its eventual start

**Location**: `tools/t3-orchestration.mjs:298`

**Finding**: `observeT3Task` treats initial assignment of `childRunId` as an identity violation.

**Evidence**: The host response contract permits `childRunId: null`, and the observer accepts that initial queued observation. Passing its result as `previous` when the same task becomes running with an assigned run ID throws `Original childRunId changed`. I reproduced this in memory. The fixtures always begin with an assigned run ID, so they miss this transition.

**Suggestion**: Allow null-to-assigned initialization while the original task is pending; enforce identity stability after assignment.

### 3. [warning] Inherited model selection rejects a valid nullable catalog value

**Location**: `tools/t3-orchestration.mjs:211`

**Finding**: Default `{ inheritParent: true }` selections cannot prepare requests when the catalog reports `inheritedModel: null`.

**Evidence**: `orchestrator_capabilities` explicitly allows a nullable inherited model. Parsing and configuration accept it, but `executableTarget` requires a matching model entry and throws `Inherited or selected model null is unavailable…`. I reproduced this using the fixture catalog with that single field changed. The resulting delegated request would otherwise omit `target`, leaving model resolution to the host.

**Suggestion**: Preserve host inheritance when the inherited model is unspecified, and record model/options evidence as unknown. Continue requiring exact catalog matches for explicit model selections.

ROLE_POLICY=independent-frozen-review

### Reviewer B, gpt-6.1-sol

#### Findings from Sol

### 1. [critical] Detached-output guard permits deleting the source checkout

**Location**: `tools/generate.mjs:927`, `generateProbeTargets`

**Finding**: The guard accepts ancestors of the repository, which probe generation then recursively deletes.

**Evidence**: A read-only invocation of the guard accepted `the checkout parent directory` for this repository. The CLI forwards that destination through `--orchestration t3 --include-probes --output-root`. After loading the model, line 1275 executes `rm(out, { recursive: true, force: true })`, deleting this checkout and sibling projects.

**Suggestion**: Reject canonical destinations containing the source checkout. Before recursive removal, also require the destination to be a dedicated generated directory.

### 2. [critical] Queued tasks cannot acquire their original run ID

**Location**: `tools/t3-orchestration.mjs:298`, `observeT3Task`

**Finding**: The identity check rejects the transition from an unassigned queued task to its executing run.

**Evidence**: The host response contract permits `childRunId: null`. Observing a queued response stores that null in `previous.original.childRunId`. A subsequent running response with the same task, node, thread and provider but an assigned run ID throws `Original childRunId changed`. This was reproduced without writes. Consequently, retaining the initial async observation prevents recording subsequent progress or completion.

**Suggestion**: Allow null to transition to the first assigned run ID; enforce identity equality once that ID is established. Add a queued → running → completed regression test.

ROLE_POLICY=independent-frozen-review

## Lead judgment

| Finding | Attribution | Verdict | Response |
| --- | --- | --- | --- |
| Dangerous detached output paths and recursive probe removal. | A and B. | ActOn, fixed. | Reject source ancestors and protected source subdirectories, including symlink aliases. T3 probes stage and validate before replacing generated adapter trees; unrelated output files remain. |
| Queued tasks cannot acquire their initial run identity. | A and B. | ActOn, fixed. | Allow pending null to acquire the first run ID; reject subsequent changes and terminal identity changes. |
| Nullable inherited model blocks host inheritance. | A. | ActOn, fixed. | Omit target and record inherited model as unknown; explicit selections still require catalog matches. |

No findings were dismissed. The regression suite exercises all three paths.
Round two uses fresh tasks with the original brief, all findings, lead responses,
and an empty unresolved-objection list.

## Round two

Both `gpt-6-astra` and `gpt-6.1-sol` returned `No findings` on the complete
updated frozen scope. Both tasks completed with `result_available` and no
pending child runs. The lead accepts the source candidate for local handoff.
Installation, cross-provider execution, and effective T3 options remain
outside the evidence established by this review.
