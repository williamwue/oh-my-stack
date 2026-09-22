# Third-party notices

## Cursor pstack

The `principle-*`, `tdd`, `technical-writing`, `unslop`, `how`,
`show-me-your-work`, `bug-fix`, `interrogate`, `poteto-mode`, `investigation`,
`feature`, `refactoring`, `prototype`, `opening-a-pr`, `shipping`, `orchestrate`,
`autopilot-stack`, `autopilot-full`, `setup-benny`,
`triage-issue-reports`, and `reproduce-and-fix-issues` Skills under
`src/core/skills/` contain modified material from the pstack plugin in the
Cursor plugins repository:

- Source: <https://github.com/cursor/plugins/tree/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack>
- Revision: `6ed0f7a9504f577d7529064103cecce9be7dfc5e`
- Advanced-workflow source: <https://github.com/cursor/plugins/tree/640ea3abfbdef74aad432b58d8586e4bf645f42d/pstack>
- Advanced-workflow revision: `640ea3abfbdef74aad432b58d8586e4bf645f42d`
- Autopilot-full source: <https://github.com/cursor/plugins/tree/53e579f1481697931fc44f5445171397cfa2b24b/pstack>
- Autopilot-full revision: `53e579f1481697931fc44f5445171397cfa2b24b`
- Benny source: <https://github.com/cursor/plugins/tree/53e579f1481697931fc44f5445171397cfa2b24b/pstack/automations/benny>
- Benny revision: `53e579f1481697931fc44f5445171397cfa2b24b`
- Copyright: Copyright (c) 2026 Lauren Tan
- License: MIT

The immutable imported source and its license are retained under
[`upstream/snapshots/cursor-pstack/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/`](upstream/snapshots/cursor-pstack/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/).
The advanced-workflow source files are retained in revision-bound snapshot
directories whose names start with `cursor-pstack-shipping`,
`cursor-pstack-orchestrate`, and `cursor-pstack-autopilot-stack`.
The `autopilot-full` source is retained under the revision-bound
`cursor-pstack-autopilot-full` snapshot directory.
The Benny Skills, references, prompts, configuration example, and license are
retained under the revision-bound `cursor-pstack-benny` snapshot directory.
The portable transformation removes the source host's invocation frontmatter;
the canonical metadata records explicit-only invocation and each adapter emits
the corresponding target-native policy. Per-file ownership and hashes are in
[`upstream/ownership.yaml`](upstream/ownership.yaml) and
[`upstream/patches/`](upstream/patches/).

`how`, `show-me-your-work`, `bug-fix`, `interrogate`, `poteto-mode`,
`investigation`, `feature`, `refactoring`, `prototype`, `opening-a-pr`,
`shipping`, `orchestrate`, `autopilot-stack`, `autopilot-full`, `setup-benny`,
`triage-issue-reports`, and `reproduce-and-fix-issues` are reviewed semantic
ports rather than mechanical frontmatter transformations. Their source
snapshots, output ownership, hashes, and transformation rationale are recorded in
[`upstream/semantic-derivations.json`](upstream/semantic-derivations.json).

The other projects in [`upstream/sources.yaml`](upstream/sources.yaml) remain
reference-only and have not contributed copied source material.
