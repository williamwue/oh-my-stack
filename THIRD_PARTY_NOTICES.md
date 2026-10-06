# Third-party notices

## The pstack book by kaito

The Chinese chapters under `docs/books/pstack/zh-CN/` are translated from
[kaito's Japanese book](https://zenn.dev/sc30gsw/books/080faba713547b), with the
[author's English edition](https://zenn.dev/sc30gsw/books/7ff701b9811d04) used
for comparison and archived under `docs/books/pstack/en/`. Source snapshots
are retained under `upstream/books/pstack/`. Original author: kaito. Translation preparation: Oh My Stack,
with AI assistance. The full translation has AI review records and is pending human review.

The maintainer reports the author's verbal permission to publish Chinese and
English editions. The [authorization record](docs/books/pstack/AUTHORIZATION.md)
documents that report and its scope. The book is not designated MIT-licensed;
the pstack plugin's MIT license does not establish the license of the book.
Source chapter URLs and translation status are in
[`source-manifest.json`](docs/books/pstack/source-manifest.json).

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

The later semantic drift review compared pstack revision `86ecc820` with
`70b2dc8b4b85c8d5648624ca40d692c421fff32f`. Host-neutral evidence and
round-timing rules were adapted into `swarm`, `autopilot-full`, and
`autopilot-stack`; the decision-log helper adopted no-truncate append behavior.
See [the drift audit](docs/upstream-september-drift-audit.md). No Cursor model
IDs or host-specific permission rules were copied. The Cursor pstack MIT
attribution above also applies to these adaptations.

## Remaining main workflows and playbooks

The later 11 main Skills and nine poteto-mode playbooks were adapted from the
same pinned [Cursor pstack revision](https://github.com/cursor/plugins/tree/86ecc82055e4d3cb567e72c56f390800a4978c9b/pstack).
Copyright (c) 2026 Lauren Tan. MIT licensed. Their original texts, linked
references, and license are retained under
`upstream/snapshots/cursor-pstack-completion/86ecc82055e4d3cb567e72c56f390800a4978c9b/pstack/`.
Per-file source and output hashes are in `upstream/semantic-derivations.json`.

## Discovery and design workflow batch

The `why`, `architect`, `arena`, `swarm`, and `teach` Skills are semantic
ports of [Cursor pstack at 86ecc820](https://github.com/cursor/plugins/tree/86ecc82055e4d3cb567e72c56f390800a4978c9b/pstack).
Copyright (c) 2026 Lauren Tan. MIT licensed. Original instructions, referenced
documents, and license are retained under
`upstream/snapshots/cursor-pstack-discovery-design/86ecc82055e4d3cb567e72c56f390800a4978c9b/pstack/`.
Source hashes and transformed output ownership are recorded in the semantic
derivation manifest. Runtime bindings, authority, and evidence limitations are
adapted explicitly; this is not a claim of host-specific feature equivalence.

September 28 semantic reconciliation imports the decision-log and autopilot-full
reference files from Cursor pstack commit `ecc249f1e306fc64ddf83c7bed16cacf7c2239db`
under MIT. Immutable files and license are in
`upstream/snapshots/cursor-pstack-september-28/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack`.

## pstack 0.15.13 semantic update

Source: <https://github.com/cursor/plugins/tree/2cbf58508f40de470d7490b55c51d71241928fa2/pstack>.
Revision: `2cbf58508f40de470d7490b55c51d71241928fa2`.
License: MIT; the exact license and changed files are retained under
`upstream/snapshots/cursor-pstack-october-06/`.
This update adds four portable Skills and adapts workflow and guide changes.
Original source snapshots and dated acceptance records remain historical.
