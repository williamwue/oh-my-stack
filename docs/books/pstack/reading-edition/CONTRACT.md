# EPUB reading edition contract

Approved implementation scope is recorded in [PLAN.md](PLAN.md). Base is design 1; independent cross-judge selected it at 22/25 versus 20/25 and 12/25. Graft row-major split subtables and strict policy inventory from design 2. No change to reviewed sources or PDFs.

## Table API

New tools/books/epub_tables.py owns parse_table_policy(text) -> TablePolicy and transform_tables(html, *, source_html, document_id, language, policy) -> TableResult. TableResult has html and tables tuple; each TableReceipt has table_id, source_sha256, layout, rows, columns. Root supplies raw reviewed rendered source separately from prepared rewritten HTML. Hash raw source; copy prepared payloads. PDF consumes prepared untransformed HTML.

Policy file docs/books/pstack/epub-table-policy.json has version:1, source_snapshot:"2026-10-03", tables: {"ch04-t01":{"zh-CN": {source_sha256,mode,reason}, "en": {...}}}. Modes table, records, split. Split includes key_column:0, groups: ordered nonempty contiguous non-key columns, e.g. [[1,2],[3,4],[5]]. Reason is nonempty audit prose. One rule per table per selected language, including zh-CN glossary-t01. IDs use document stem plus 1-based source table order. No automatic fallback at build time. Unknown keys, duplicates, missing/extra rules, nested/spanned/ragged tables, missing explicit th header and stale hashes fail. Extra policy IDs across selected complete inventory fail in validator. Hash named table-tree-v1 implied by version1.

Canonical hash is SHA256 UTF8 JSON of the complete source table tree. A text node is ["text", exact_text]; comment ["comment", exact_text]; element ["element", lowercase_name, sorted([[key,value],...]), [children...]]. Preserve exact strings and parser-provided attribute lists. JSON ensure_ascii=False, separators=(",",":"). Include all source attributes, link/ID, formatting whitespace and child order. Builder cleanup occurs after this source input is captured. The validator independently implements these rules.

## Emitted representation

Payload occurrences carry data-table-id, data-source-row, data-source-col, data-copy. Row0 is header; first data row1. Col0 first column. data-copy increments per coordinate from0. Payload nodes contain ONLY original cell children; added colons/labels live outside. Preserve original cell and descendant IDs once, drop IDs recursively on repeats; preserve hrefs on every occurrence. Table/row/caption anchors survive once. Header-only table uses mode table. Reject repeated block-code payloads.

Table mode uses `<table data-table-id=... data-table-mode="table"><thead>...<th scope="col">header payload</th>...</thead><tbody>... cells ...</tbody></table>`. Source cell itself may carry coordinates. Use native table semantics and natural text wrapping.

Split mode emits one small subtable per source row per declared group, row-major then group-major; each small table carries data-table-id, data-table-mode="split", data-panel (zero based group) and data-table-row (source row). Key column0 repeats; headers repeated per row/group. Every non-key data payload once. This preserves primary data cell reading order. Each subtable contains its own headers and one source data row.

Records mode has NO enclosing table or row box. Emit a standalone marker <a data-table-id=... data-table-mode="records" ...></a>, followed by unboxed field paragraphs/block-safe divs. First-column value is an emphasized record title, other fields retain real visible header text. Each header occurrence carries its header coordinate, data-copy and `data-label-for="<table_id>:<row>:<col>"`. First visible occurrence preserves source header/descendant IDs; repeats strip IDs. Even empty first header gets an empty coordinate payload. Label and data payload adjacency or field containment is verifiable. Mark field .table-field and first field .table-row-start/.table-record-title for CSS; no .table-record/reflow-table containers.

Captions appear once, outside split/records groups, retaining markup/ID. No essential content hidden or generated in CSS. Removing author CSS must leave readable labels and values. data attributes are proof on packaged XHTML, not required by reader rendering.

## Validation

validate(language, artifact, *, expected_documents=None, policy_path=None) retains old positional calls. Full validation checks all 48 chapters and supplemental content/policy, using actual ZIP DOM. Sample expected_documents limits artifact chapter set but policy full-source inventory stays checked. Independent parsing, hash/coordinate sequences, physical header/value associations, row/group order, exact decoded cell text, link mapping, unique mapped IDs, code bytes and non-table prose. Exclude only documented generated front matter, table labels/repeats, diagram reading aids and code language labels. Invalid input must be tested with mutation cases. No transformer imports. Report truth of XML/resources/content separately from rendering.

## Ownership

Table worker owns epub_tables.py, epub-table-policy.json and tests/epub-tables.test.py plus replacement of old tests/ebook-layout.test.py where necessary. Validator worker owns validate-pstack-ebooks.py and tests/epub-validation.test.py. Root owns builder, epub_layout.py CSS, tests/ebook-paths.test.py, QA viewer, metadata/nav, generated ebooks and docs. Media worker owns epub_media.py and tests/epub-media.test.py. All workers use isolated worktrees. Root transfers patch artifacts and reviews. No worker edits other ownership, builds ebooks, commits, publishes, installs global tools, reads credentials, or delegates.

## Verification sequence

Capture baseline. Test tables/validator/media independently. Generate representative Chinese sample without overwriting full book; source links to non-sample chapters become original Zenn links. Inspect sample using real EPUB engine, run EPUBCheck. Build complete zh-CN and en editions, verify content and source invariants, inspect all table chapters and risky figures, run full repo checks, independent review. Actual WeChat browser/native acceptance stays separate with explicit unavailable states.
