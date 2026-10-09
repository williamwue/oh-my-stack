# Frozen delivery evidence

Before implementation, write a task plan containing the predicate, source roots,
immutable acceptance harness, full or narrow mode, candidate requirements,
owned units and required combined check. Freeze it with the packaged delivery
checker and retain the returned lock digest in the pre-work task record.
Evidence cannot lower these requirements after work.

```bash
node /installed/oh-my-stack/scripts/delivery-evidence.mjs freeze --root /project --plan task/plan.json --out task/lock.json
node /installed/oh-my-stack/scripts/delivery-evidence.mjs inspect --root /project --lock task/lock.json --expected-lock-sha256 SHA --evidence task/evidence.json
node /installed/oh-my-stack/scripts/delivery-evidence.mjs verify --root /project --lock task/lock.json --expected-lock-sha256 SHA --evidence task/evidence.json --run-check combined --out task/report.json
```

Replace paths and `SHA` with actual values. Plan, evidence and outputs use safe
workspace-relative paths. Keep task output directories outside declared source
roots or freeze explicit exclusions. `inspect` executes nothing and returns
`acceptance: not-assessed`. `verify` runs only explicitly selected frozen check
IDs; repeat `--run-check` for additional required checks. Commands can have side
effects: the task's existing authorization still controls their use.

## Required evidence

- Full execution requires all ordered configured candidate slots, or at least
  two without a panel; complete comparative judgment and a root decision.
- Each delegated unit requires a distinct review of its actual output digest.
  Replacing a reviewed artifact or integration revision invalidates that proof.
- Final source inventories include actual bytes, added and deleted files.
  Immutable harness/configuration and evidence must remain unchanged during
  checks. An unchanged commit ID cannot establish freshness.
- Required combined behavior executes against the final integrated source;
  unit success flags or supplied command receipts cannot replace this run.
- Visual checks pin configuration, baseline or approved target, dimensions and
  tolerance before work. The checker measures supported original PNG pixels
  and retains a difference artifact. Unsupported formats fail closed.

Narrow mode requires a reason and explicitly named omitted full requirements.
Its local acceptance never establishes full-workflow execution. Simplification
does not waive independent review of delegated output.

## Claim boundaries

Keep structural checks, observed behavior, pixel measurements, task provenance
and external release separate. Unknown or encrypted required task attribution
is inconclusive and produces a nonzero full-verification result. A separately
named actor or caller-authored verified flag is insufficient. Preserve the
host's task authority; a backing child conversation cannot replace it.

The supported native protocol binds recorded completion declarations to the
frozen task and exact artifact/review digests. It establishes recorded task
attribution, not authorship or review quality. Use the generated target's
delivery guide for the exact input shapes and supported provenance adapter.
Image math alone does not authenticate browser captures. The root must still
judge meaningful coverage, design differences and product correctness.

A passing local report cannot prove original-pstack equivalence, activate an
installed plugin, authorize publication or certify production deployment.
