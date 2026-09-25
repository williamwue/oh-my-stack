# Upstream completion plan

All 25 entries in this plan are now implemented. The remaining acceptance
scenarios below describe behavioral coverage, not missing entrypoints. See
[project status](project-status.md) for current priorities and user deferrals.

## Priority and scope

On 2026-09-23 the user prioritized upstream workflow completion before release
polish and publication. Compare against the fixed
[86ecc820 pstack snapshot](https://github.com/cursor/plugins/tree/86ecc82055e4d3cb567e72c56f390800a4978c9b/pstack).
Do not keep expanding scope as upstream main moves.

The original gap is 16 main entries and nine nested playbooks. All remain in
the completion program; no item is silently removed as out of scope. Runtime
limitations must be explicit adaptation boundaries, not stub implementations.

## Batch 1: discovery and design

Five new core workflows and all three generated packages now exist:

| Entry | Preserved contract | Remaining behavioral acceptance |
| --- | --- | --- |
| why | Code anchor, seven source categories, independent collection/synthesis, five confidence tiers, citation checks | Authenticated multi-source investigation and unavailable-source negatives |
| arena | Frozen task/rubric, isolated candidates, distinct cross-judge, base selection, attributed grafts, final verification | Real multi-worker candidates, judge disagreement, dropout, final failed check |
| architect | Grounding with how/why, two distinct caller-first sketches, arena synthesis, scoped implementation, deviation/redesign | Implement against a chosen sketch and demonstrate an evidence-driven redesign |
| swarm | Coverage/race/mixed shapes, declared selection, bounded concurrency, complete drainage, root checks | Mixed slices, false worker PASS, dropout, timeout, confirmed cancellation |
| teach | Execute how/why, revision alignment, confidence-preserving explanation, learner pacing | End-to-end composed explanation and contradictory/missing rationale |

They retain upstream explicit invocation policy. All five are direct public
entries, also reachable through explicit intent routes in poteto-mode. The
catalog was then 54 public entries: 31 workflows and 23 principles, plus 12
unpublished probes. The earlier installed-plugin acceptance covers the old
49-entry local build; the later 74-entry acceptance is recorded below.

Source files, referenced originals, and MIT license are frozen with hashes in
the discovery-design provenance record. Portable references condense the
relevant instructions; provider/model/host bindings are not copied into core.

See [bounded acceptance](discovery-design-acceptance.md) for the 84-test gate,
five Skill format checks, local-history why run, and design-only architect run.
These do not clear the remaining native multi-worker and installed-plugin gates.

## Second batch of main entries: 11

All eleven now have portable core instructions, direct public entries, and
generated packages. Live behavior and host-specific capability checks remain
to be accepted. The source contracts were read from the pinned revision.

| Batch | Entry | Implementation and acceptance focus |
| --- | --- | --- |
| 2 | blast-radius | Trace downstream consumers beyond the diff; execute the critical safety check; unsupported safety remains unknown |
| 2 | figure-it-out | Bounded hypothesis/measurement loop, adaptable plan, durable decision trail; no unbounded autonomy or implicit publication |
| 2 | create-verification-skill | Repository-derived user-facing driver and feature map; prove the generated driver before claiming success |
| 2 | maintain-verification-skill | Compare feature source with one live user-facing session; scoped corrections and explicit publication authority |
| 3 | recall | Reconcile accessible history with current state; label stale, inaccessible, and conflicting records |
| 3 | reflect | Independent transcript reviews, structural enforcement, changes to existing Skills within authorized scope |
| 3 | automate-me | Evidence-backed personal preferences; review/update existing customization without overwriting unrelated policy |
| 3 | no-comments | Review comments for redundant knowledge and offer structural encodings; preserve necessary rationale and legal notices |
| 3 | bro | Plain-language restatement preserving technical meaning and uncertainty; no implementation side effects |
| 3 | typescript-best-practices | Portable language guidance and preserved trigger semantics; test relevant and unrelated task selection |
| 5 | make-bot-ui | Assess webhook wake, credentials, local hosting, and private networking; use capability-gated adapters and fail closed when unsupported |

## Second batch of nested playbooks: 9

All nine now have portable direct entries, consistent with the existing
extracted playbooks. The router also recognizes their specific intents.

| Batch | Playbook | Implementation and acceptance focus |
| --- | --- | --- |
| 2 | authoring-a-skill | Scoped authoring, genuine trigger boundaries, reusable resources, independent behavior checks |
| 4 | eval | Frozen evaluation task, dataset/metric provenance, repeatable scoring and held-out checks |
| 4 | hillclimb | Bounded baseline/candidate measurement, strict improvement, reject regressions, retain failed attempts |
| 4 | multi-phase-plan | Verifiable units, dependencies, owner handoff, checkpoints and explicit integration authority |
| 4 | perf-issue | Representative workload and baseline, causal hypothesis, measured improvement without correctness regressions |
| 4 | runtime-forensics | Capture runtime evidence and explain gaps without turning diagnosis into unrequested fixes |
| 4 | trace-forensics | Correlate trace events and identifiers; distinguish observation, inference, and missing coverage |
| 4 | visual-parity | Compare equivalent viewport/state and actual visual evidence; never claim parity from compilation alone |
| 5 | worktree-cleanup | Resolve exact ownership, dirty state and active workers; preserve user data and require authority for destructive cleanup |

## Acceptance before release

The working tree now has **74 public entries: 51 workflows and 23 principles**.
The 20 second-batch entries have pinned source snapshots, capability metadata,
and all three generated packages. Static checks and live behavior are separate
gates; a package build does not certify a workflow's real-world outcome.
The [second-batch acceptance record](upstream-completion-acceptance.md) includes
the installed Codex candidate and bounded negative behavior checks.

For every batch: immutable source/license, reviewed semantic adaptation,
capability requirements and honest fallbacks, direct discovery metadata,
three-target deterministic generation, regression checks, realistic positive
and negative behavioral runs, and an updated parity matrix.

Do not equate static instruction checks with workflow execution. Record native
runtime/version, request, source revision, actual calls/results, root checks,
and limitations for live acceptance. Existing primitive fixtures do not become
evidence for new named workflows merely because the coordination looks similar.

After implementation and bounded tests, update the local Codex candidate and
repeat direct-entry loading and workflow acceptance. Keep release publication a
separate step. OMP needs its own live runs. Claude Code live runs remain deferred
until the user has an account; offline packaging checks do not clear that gate.
