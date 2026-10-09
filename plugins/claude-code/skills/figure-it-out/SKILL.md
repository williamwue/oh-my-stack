---
name: figure-it-out
description: "Design and execute an auditable plan for a complex task that lacks a narrower workflow."
disable-model-invocation: true
---

# Figure it out

## Child session handoff

Read [the handoff contract](../poteto-mode/references/subagent-handoff.md).
New tasks, repair rounds, retries, and queue items use fresh child sessions
with the original brief, every later directive, prior findings and responses,
and unresolved objections. Reuse only for required costly live state, and
only when the host allows it. Stop and fence active writers before replacement.
A host-owned orchestrator's model catalog, workspace binding, child tools,
and review-round rules take precedence over the native binding above.
Keep its task handles and attribution receipts. Do not use a backing child
conversation as a new delegated review, or claim native-record verification
for a host-owned child. Report attribution evidence gaps explicitly.

## Local delivery evidence binding

Read [the delivery guide](../../docs/delivery-evidence.md) for the frozen
plan/evidence shapes and supported provenance protocol. The portable CLI is
`../../scripts/delivery-evidence.mjs` relative to this installed Skill.
Freeze before implementation, retain the lock digest, then inspect or run
explicitly selected checks against the actual final artifact. Unknown
required provenance stays unverified; local success does not certify release.

Use when no narrower workflow owns the requested outcome. First state a
falsifiable done condition, scope, estimated units, dependencies, and what
would stop the run. Choose verification rigor from reversibility, blast radius,
and cost of a wrong result. For extended work, show the phase plan before a
long run so the user can redirect; authorized reversible work can continue.

Design independently verifiable units. Put the riskiest unknown and its proof
early; capture the baseline before changes. Use [architect](../architect/SKILL.md)
for a consequential one-way design, not for mechanical work. Parallelize only
independent ownership, with isolated writers. Name the artifact and check for
each unit, along with any publication or human decision gate.

Pair every delegated implementation unit with a distinct independent judge
of its frozen output before accepting it. Root inspection complements the
judge. One review may cover several named units if it gives a verdict for each
at the same artifact revision. Preserve findings and repair responses; an
unavailable judge leaves independent acceptance unverified.
For consequential design, delegated implementation, or visual delivery, freeze
the [delivery evidence contract](../poteto-mode/references/delivery-evidence.md)
before implementation and check the final integrated revision. An unverified
required gate remains an explicit completion gap.

Run a hypothesis loop for each unit: state prediction, make one bounded change,
measure on the relevant surface, inspect the artifact, and decide VERIFIED,
NOT VERIFIED, or INCONCLUSIVE. A child report is not root proof. Reject or
revise an unsuccessful change without discarding unrelated user edits. If the
measurement gate is wrong, correct it explicitly before relying on new runs.
Record decisions as work proceeds with [show-me-your-work](../show-me-your-work/SKILL.md).
Verify and save each usable unit before dependent work. Changed artifacts need
fresh proof. Reference-matching UI work uses
[visual-parity](../visual-parity/SKILL.md) as a named acceptance stage.

At the end, check the complete outcome against the original predicate on the
real artifact. Encode repeated mistakes in a test, schema, or check when that
is warranted. Return the designed phases, decision trail, per-unit verdicts,
overall proof, and open gaps. This workflow does not imply unbounded autonomy,
an unattended schedule, or authority to publish.
