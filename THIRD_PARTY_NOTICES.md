# Current distribution 0.21.0

Active direct workflow source: michael-denyer/pstack-claude e2cbd491f94ee4ece30e028b9ff69a8b418d1723.
Official comparison: cursor/plugins c742dd61706fbacc1b95f1a20b7b988cf096ce6c.
AIHero originals: mattpocock/skills 59db609eb1e18aaf59b63284d0e52255aff0c63c.
All are MIT licensed. Each package includes upstream LICENSE, LICENSE-cursor-team-kit,
LICENSE-thermos, NOTICE.md, NOTICE-skills.md and LICENSE-AIHero. Full original trees,
receipts and the explicit 20-skill selection plus prototype dependency are committed
under upstream/vendor and upstream/distribution.json. OMS adapts plugin identity,
namespaces and T3 dispatch pointers in the packaging layer. Model policy and personal
configuration locations retain upstream behavior. The following entries document the
previous implementation and its retained historical sources.

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

## pstack October 11 semantic update

Source: [cursor/plugins](https://github.com/cursor/plugins), pstack 0.15.17 at
`978ca6e9c0e012047cd5058b8e829240336e704e`.
License: MIT, retained with the 45 changed source files under
`upstream/snapshots/cursor-pstack-october-11/`.
OMS adapts current-chat catch-up, setup help, model defaults and prose while
retaining its portable delivery rules. Current output ownership is recorded in
`upstream/semantic-derivations.json`; dated transition receipts retain earlier
claims. Historical snapshots and previously published books remain unchanged.

## AIHero / Matt Pocock Skills

Selected original skills from [mattpocock/skills](https://github.com/mattpocock/skills)
are pinned at `6fd947921b935b7e1e69293a200400f0fdd5c15f`. Copyright (c) 2026
Matt Pocock. License: MIT. The original license and complete selected resources
are retained in the revision-bound `upstream/snapshots/aihero/` directory.
`upstream/source-skills.json` records every imported file hash and dependency.

Version 0.9.0 selects original `codebase-design`, `grill-me`, `grilling`,
`domain-modeling`, `grill-with-docs`, and `improve-codebase-architecture`.
The generated packages retain original source instructions and resources.
Each selected skill includes the upstream MIT license and a `SOURCE.json`
coordinate. Runtime verification is recorded separately; importing or packaging
a skill does not establish behavioral parity.

The unreleased 0.10.0 source candidate adds original `research`,
`to-questionnaire`, `setup-matt-pocock-skills`, `to-spec`, and `to-tickets`
from the same pinned revision. All resources and UI metadata are retained.

The 2026-10-08 source additions select original `writing-for-agents`, `retro`,
and `handoff` from the same revision. Their seven original files remain intact,
including `SKILL-MECHANICS.md` and UI metadata. `retro` retains its original
`writing-for-agents` dependency. The added references in pstack document-writing
workflows are local integration changes; they do not change AIHero originals.

The second 2026-10-08 batch selects original `diagnosing-bugs` and `code-review`
at `f3fc5632f401156837ee3872f14fe33ccf1024ea`, under source ID
`aihero-20261008`. Their five resources and the MIT license are retained in a
separate immutable snapshot. This includes the original Bash HITL template;
existing AIHero originals and source hashes are unchanged.

The 2026-10-15 batch selects original `triage`, `wayfinder`, `wizard`, and
`git-guardrails-claude-code` at `49dd158d1076134a641b33efb035946536778336`,
under source ID `aihero-20261015`. Their thirteen files and the MIT license
are retained in a separate immutable snapshot. This includes the original Bash
wizard template and Claude Code hook script; existing AIHero originals and
source hashes are unchanged.

## Current pstack candidate source

The current local candidate imports pstack 0.15.30 from cursor/plugins at
`4ec7ffa173eaa70d3d9467a627baf0954645a353` under the MIT license.
The immutable snapshot contains the original LICENSE. Older notices retain
their historical source coordinates.

## Pinned pstack-claude reference evidence

Selected files from michael-denyer/pstack-claude at
`356c6e0f978df729eb16f227d795f34d221c5aad` are retained for maintenance comparison
under `upstream/snapshots/pstack-claude/`. The reference is MIT licensed; its
original LICENSE is preserved alongside the selected files. The complete
selection and hashes are recorded in `upstream/reference-receipts/`.
These snapshots are reference evidence and are excluded from runtime packages.
Implementation inspirations and policy decisions are recorded separately in
`upstream/reference-adoptions.json`.

## Markdown-it browser parser

The portable plan checker includes an unchanged copy of the markdown-it 15.0.1
browser ESM distribution from the existing local installation. Markdown-it is
MIT licensed, copyright Vitaly Puzrin and Alex Kocharin. Its bundled dependency
families include mdurl, entities, linkify-it, uc.micro and punycode.js. Retained
notices include the Joyent/Node URL-code notice in mdurl and the BSD-2-Clause
conditions and disclaimer for entities.

Complete license texts ship beside the parser in
[LICENSES.txt](src/core/skills/poteto-mode/scripts/vendor/markdown-it/LICENSES.txt).
Artifact bytes, local license-source coordinates, hashes, the lockfile receipt
and the update procedure are recorded in
[SOURCE.json](src/core/skills/poteto-mode/scripts/vendor/markdown-it/SOURCE.json).
These records verify local installed bytes and lock metadata. They do not
independently attest the npm tarball or the publisher bundle's internal
dependency versions.
