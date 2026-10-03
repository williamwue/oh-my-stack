# Maintaining the bilingual book

The frozen source lives in `upstream/books/pstack/2026-10-03/`. Each language has
48 raw API responses and 48 normalized Markdown bodies. `inventory.json` records
source URLs, update timestamps, SHA-256 hashes, and structure counts. This book
snapshot is distinct from the pstack plugin revision cited by the author.

## Import a new source revision

Use a disposable Python environment with `beautifulsoup4==4.14.2` and
`markdownify==1.2.0`, then run the importer with a new date:

```sh
python3 tools/books/import-pstack-book.py --snapshot-date YYYY-MM-DD
```

A completed snapshot refuses overwrite. Compare the new and previous snapshots
before rebasing translations. Update the assembler and validator snapshot path
and chapter manifest together when adopting a new baseline. Never silently
replace the source beneath a reviewed translation.

For a repeatable full source audit, install `tools/books/requirements.txt` in
that environment and run `python3 tools/books/audit-source.py`. It compares all
exactly 96 unique source entries against the manifest, source hashes, rendered
text, link/media destinations, anchors, and 444 code blocks without network access.
It also checks every assembled Chinese chapter against its translator receipt,
including heading anchors, code, links, paragraph/list/table structure, and the
local image hashes. It works from the repository files without `.tmp` drafts.

## Assemble completed chapters

The assembly tool reads the frozen English bodies and completed Chinese bodies
from `.tmp/pstack-book/translations/NN.md`, accompanied by matching SHA-256
receipts under `.tmp/pstack-book/translation-reports/NN.json`. Missing drafts
stay explicitly incomplete; they are never replaced by Japanese placeholders.

```sh
python3 tools/books/prepare-editions.py
npm run check:books
```

It copies self-check receipts into `reviews/translator/`, refreshes edition
navigation and retains attribution. Source body text, including code, remains
separate from generated navigation through `book-body` comment markers. The
assembler grants no independent review or human review status. A revised draft
must be reviewed again before changing its manifest state to `ready`.

## Figures and embedded references

The original Zenn Mermaid iframes are retained as source evidence. GitHub does
not render those iframes, so each chapter also includes a local static SVG and
a link to its editable Mermaid source. There are 31 figures in each edition.
`diagrams/content.json` stores the exact Japanese and English source diagrams
and the Chinese label translations. Change Chinese labels there, then rerun
the assembler to refresh the editable Markdown files.

Render changed figures with Mermaid 12.1.0 using `mermaid.render(id, source)`.
Initialize with `securityLevel: "strict"`, `theme: "neutral"`,
`htmlLabels: false`, and `fontFamily: "Arial, sans-serif"`. Set `htmlLabels`
at the top level; the flowchart-only setting does not cover every figure.
Save the resulting SVG under the corresponding language and figure ID. Check
the complete visible diagram, then update its source, translation, and SVG
SHA-256 values in `diagrams/render-manifest.json`. The book validator rejects
stale renders and SVGs containing scripts or HTML `foreignObject` elements.
Recheck translations independently when labels or relationships change.

The two source screenshots are local, byte-identical copies; the Chinese
explanation of their labels is in [assets/README.md](assets/README.md).
External GitHub snippets, articles, and videos retain their source links.
Those external references still require network access; the offline checks
verify repository content and local navigation, not external availability.

## Review and release checks

Review Japanese and Chinese side by side, consulting the author's English for
ambiguities. Verify paragraphs, qualifications, numbers, lists, table cells,
notes, links, code, and reader-visible rendered output. Record the reviewer,
source and translation hashes, actual coverage, findings, and unresolved items
for each chapter. Translator self-checks are not independent review.

```sh
npm run check
node tools/books/validate-pstack-book.mjs --complete
python3 tools/books/audit-source.py
node --test tests/pstack-book.test.mjs
python3 tests/pstack-book-audit.test.py
```

The complete check requires 48 ready entries in both editions with review
records, independently reviewed titles and figure labels, and matching published
headings. Changed titles invalidate the corresponding review evidence. A local candidate does not claim human final review or publication.
Check the actual GitHub rendering after separately authorized publication;
local preview cannot certify the hosted renderer.
