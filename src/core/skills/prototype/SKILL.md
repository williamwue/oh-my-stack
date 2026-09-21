---
name: prototype
description: Build an isolated throwaway experiment that produces evidence for one explicit design or behavior decision.
---

# Prototype

A prototype is a decision instrument, not production implementation.

1. State the single decision, alternatives, and observable result that will
   distinguish them. If there is no decision, route to `feature`.
2. Gather prior art only when the design space is genuinely open. Separate
   external inspiration from repository constraints.
3. Build the smallest experiment in an isolated scratch directory outside
   production source. Do not modify shipping code, introduce production
   abstractions, or disguise the prototype as a finished feature.
4. When comparing alternatives, expose them through one repeatable switch or
   command and label each variant.
5. Observe the decision variable on the matching surface. Capture screenshots
   for visual differences or exact output, timing, and environment for
   behavioral differences.
6. Recommend one direction from the evidence. Preserve rejected alternatives
   only when they explain the decision.
7. Hand the decision to a separate `feature` run for production implementation.

Return the decision, variants, observed evidence, tradeoffs, recommendation,
scratch path, cleanup status, and a plain statement that the artifact is
throwaway.
