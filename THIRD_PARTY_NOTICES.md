# Third-party notices

## Cursor pstack

The `principle-*`, `tdd`, `technical-writing`, `unslop`, `how`,
`show-me-your-work`, `bug-fix`, `interrogate`, `poteto-mode`, `investigation`,
`feature`, `refactoring`, `prototype`, `opening-a-pr`, `shipping`, `orchestrate`,
and `autopilot-stack` Skills under
`src/core/skills/` contain modified material from the pstack plugin in the
Cursor plugins repository:

- Source: <https://github.com/cursor/plugins/tree/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack>
- Revision: `6ed0f7a9504f577d7529064103cecce9be7dfc5e`
- Advanced-workflow source: <https://github.com/cursor/plugins/tree/640ea3abfbdef74aad432b58d8586e4bf645f42d/pstack>
- Advanced-workflow revision: `640ea3abfbdef74aad432b58d8586e4bf645f42d`
- Copyright: Copyright (c) 2026 Lauren Tan
- License: MIT

The immutable imported source and its license are retained under
[`upstream/snapshots/cursor-pstack/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/`](upstream/snapshots/cursor-pstack/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/).
The advanced-workflow source files are retained in revision-bound snapshot
directories whose names start with `cursor-pstack-shipping`,
`cursor-pstack-orchestrate`, and `cursor-pstack-autopilot-stack`.
The portable transformation removes the source host's invocation frontmatter;
the canonical metadata records explicit-only invocation and each adapter emits
the corresponding target-native policy. Per-file ownership and hashes are in
[`upstream/ownership.yaml`](upstream/ownership.yaml) and
[`upstream/patches/`](upstream/patches/).

`how`, `show-me-your-work`, `bug-fix`, `interrogate`, `poteto-mode`,
`investigation`, `feature`, `refactoring`, `prototype`, `opening-a-pr`,
`shipping`, `orchestrate`, and `autopilot-stack` are reviewed semantic ports
rather than mechanical frontmatter transformations. Their source snapshots,
output ownership, hashes, and transformation rationale are recorded in
[`upstream/semantic-derivations.json`](upstream/semantic-derivations.json).

The other projects in [`upstream/sources.yaml`](upstream/sources.yaml) remain
reference-only and have not contributed copied source material.
