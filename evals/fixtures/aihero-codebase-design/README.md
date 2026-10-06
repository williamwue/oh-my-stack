# Original codebase-design live fixture

This fixture reproduces the design-only task in the
[2026-10-06 acceptance record](../../../docs/aihero-original-acceptance-2026-10-06.md).
`src/order-flow.mjs` and `GLOSSARY.md` match the recorded live inputs.
The Stripe object is injected; no real service is contacted or required.
Do not execute the fixture during the design-only acceptance run.

Copy these two files into a disposable directory. For Codex, copy the generated
`packages/codex/skills/codebase-design` into `.agents/skills/codebase-design`.
For Claude Code, copy `packages/claude-code` to `candidate-plugin` and launch
the CLI with `--plugin-dir` pointing to that copy. Use the host-specific prompt
from the [sanitized record](../../../docs/acceptance/2026-10-06/aihero-original-skills.json).

Require three independent parallel designs with distinct constraints, complete
interfaces and caller examples, dependency categories, test strategy, and
parent comparison. Check actual host tool calls and completed child outputs.
The request ends after the recommendation; it does not authorize source edits,
fixture execution, external service access, or publication. Native plugin
lifecycle and automatic triggering require separate acceptance.
