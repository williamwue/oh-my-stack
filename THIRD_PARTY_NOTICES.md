# Third-party notices

## Cursor pstack

The `principle-*`, `tdd`, `show-me-your-work`, and `bug-fix` Skills under
`src/core/skills/` contain modified material from the pstack plugin in the
Cursor plugins repository:

- Source: <https://github.com/cursor/plugins/tree/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack>
- Revision: `6ed0f7a9504f577d7529064103cecce9be7dfc5e`
- Copyright: Copyright (c) 2026 Lauren Tan
- License: MIT

The immutable imported source and its license are retained under
[`upstream/snapshots/cursor-pstack/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/`](upstream/snapshots/cursor-pstack/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/).
The portable transformation removes the source host's invocation frontmatter;
the canonical metadata records explicit-only invocation and each adapter emits
the corresponding target-native policy. Per-file ownership and hashes are in
[`upstream/ownership.yaml`](upstream/ownership.yaml) and
[`upstream/patches/`](upstream/patches/).

`show-me-your-work` and `bug-fix` are reviewed semantic ports rather than
mechanical frontmatter transformations. Their source snapshots, output
ownership, hashes, and transformation rationale are recorded in
[`upstream/semantic-derivations.json`](upstream/semantic-derivations.json).

The other projects in [`upstream/sources.yaml`](upstream/sources.yaml) remain
reference-only and have not contributed copied source material.
