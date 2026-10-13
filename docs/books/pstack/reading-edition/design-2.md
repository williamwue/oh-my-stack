# Candidate 2: transform source once, validate emitted coordinates independently

## Problem and grounding

The table boundary is small but content-sensitive: retain compact tables, split short wide comparisons, and emit long records without a enclosing row box. Policies must fail when their reviewed source changes. The existing builder shares prepared HTML with PDF, rewrites source links and IDs in `make_content`, and calls `reflow_tables` only from `package_epub` (`build-pstack-ebooks.py:45-95,115-119`). The current transform rejects merged/nested tables but turns every data cell into a labelled field (`epub_layout.py:47-105`). The validator independently renders reviewed Markdown, but bans every table and compares whitespace-stripped field strings rather than individual cells, links or coordinates (`validate-pstack-ebooks.py:80,97-115`).

Keep those ownership boundaries. Transform the rendered reviewed source **before** builder link/ID preparation; the builder prepares the resulting EPUB body and the untouched PDF body separately. This avoids hashing rewritten Git revision URLs, duplicating normalization logic in the table worker, or changing the PDF input. No application changes are part of this candidate.

## Usage: caller first

```python
# Builder: policy file is loaded once; no automatic fallback classification.
from epub_layout import load_table_policy, transform_tables

policy = load_table_policy(BOOK / "epub-table-policy.json")
raw = str(source_soup)  # direct RENDER(book-body) output, before preparation
result = transform_tables(raw, chapter_id="ch04", language="zh-CN", policy=policy)
epub_body = prepare_body(result.html, chapter, language, assets)
pdf_body = prepare_body(raw, chapter, language, assets)
# package_epub serializes epub_body without another table transformation.
```

```python
# Unit test: no file IO or builder globals inside the transform.
result = transform_tables(fixture_html, chapter_id="ch20", language="en",
                          policy=fixture_policy)
assert result.tables[0].layout == "split"
assert source_soup_is_unchanged  # string input cannot be mutated
```

```python
# Validator: independent source reconstruction, not transform-generated receipts.
report = validate(language="zh-CN", artifact=sample_epub,
                  policy_path=BOOK / "epub-table-policy.json",
                  chapter_ids=("ch04", "ch13", "ch20", "ch27", "ch29", "ch38"))
# Existing full CLI defaults to all 48 manifest entries.
```

`prepare_body` above means the builder's existing link/ID/media preparation, extracted or adapted locally by its owner. It is not a new table-worker API. Render expensive diagram assets once per source asset and reuse their files across the two bodies.

## Shape and signatures

```python
@dataclass(frozen=True)
class Compact:
    layout: Literal["compact"] = "compact"

@dataclass(frozen=True)
class Records:
    layout: Literal["records"] = "records"

@dataclass(frozen=True)
class Split:
    groups: tuple[tuple[int, ...], ...]  # e.g. ((0, 1, 2), (0, 3, 4))
    layout: Literal["split"] = "split"

@dataclass(frozen=True)
class TableRule:
    source_sha256: str
    presentation: Compact | Records | Split

@dataclass(frozen=True)
class TableReceipt:
    table_id: str
    source_sha256: str
    layout: Literal["compact", "split", "records"]
    rows: int  # excludes header
    columns: int

@dataclass(frozen=True)
class TransformedChapter:
    html: str
    tables: tuple[TableReceipt, ...]

def load_table_policy(path: Path) -> TablePolicy:
    """Parse and validate versioned JSON into immutable domain rules."""
    raise NotImplementedError

def transform_tables(source_html: str, *, chapter_id: str, language: str,
                     policy: TablePolicy) -> TransformedChapter:
    """Pure: exact chapter policy coverage, stale-hash checks, transform."""
    raise NotImplementedError
```

`TablePolicy` is an immutable mapping keyed by `(language, chapter_id, table_ordinal)` with an internal validated rule value. No soup objects escape and no public per-cell helpers are needed. Two functions hide parsing, canonical hashing, unsupported-shape checks, coordinate emission and repeated-cell handling; the builder supplies only source identity and content. This is a deep interface with a short caller path, per boundary-discipline and single-source-of-truth principles. Typed layout variants prevent meaningless groups on a records rule; raw schema details remain in the loader.

### Minimal explicit manifest

Proposed owned path: `docs/books/pstack/epub-table-policy.json`, maintained only by the table worker. Example placeholders are not actual hashes:

```json
{
  "schema_version": 1,
  "source_snapshot": "2026-10-03",
  "tables": {
    "zh-CN/ch04/t01": {"source_sha256": "<64 lowercase hex>", "layout": "compact"},
    "zh-CN/ch20/t01": {"source_sha256": "<64 lowercase hex>", "layout": "split", "groups": [[0, 1, 2], [0, 3, 4], [0, 5]]},
    "zh-CN/ch27/t01": {"source_sha256": "<64 lowercase hex>", "layout": "records"}
  }
}
```

Use the frozen manifest's `order` for `chNN`, and 1-based source DOM table order for `tNN`. Language is part of identity: wording and line lengths can justify different choices even where source structure matches. These IDs are stable across changes to titles, fonts, output filenames and Git HEAD. Inserting/reordering tables may invalidate ordinal associations; do not silently search by matching hash or reassign rules. Full validation requires exact manifest inventory for both reviewed editions, including supplemental XHTML source documents that contain tables; inventory extras and chapters without tables must be handled explicitly rather than bypassing the transform. If supplements contain tables, extend the chapter identity with their existing fixed document stem (`glossary`, `image-notes`) using the same rules. The 48-entry acceptance count applies to book chapters independently of supplements.

Reject unknown fields, unknown versions/layouts, duplicate JSON keys, malformed IDs/hashes, missing rules and rules for absent tables. The build validates the full selected language inventory once, including before a sample build; a sample then selects output chapters from that valid inventory. No runtime heuristic or default layout.

For `split`, column 0 is the sole repeated key. Every group begins with 0 and contains at least one non-key column. Non-key columns partition `1..N-1` exactly once, strictly in original order, and groups are contiguous ordered slices. Emit groups consecutively **within each source data row**, so primary data cells remain row-major in DOM reading order. Each small subtable has its own visible column headers and one data row. This accepts some repeated headings in exchange for the strongest interpretation of preserved source row/cell order; real-reader sampling decides whether that presentation is acceptable. A policy cannot contain arbitrary titles or translated labels: captions, key titles and field labels derive only from reviewed source.

### Hash rules

Define `source_sha256` over a canonical source table JSON value, not output HTML, whitespace-stripped text, an entire chapter, or a transform receipt:

1. Render only the reviewed `book-body` with the existing Mistune table/strikethrough configuration; parse once with BeautifulSoup's `html.parser`.
2. Capture table attributes, optional direct caption, ordered rows and ordered direct cells. Cells include their original tag (`th`/`td`), attributes and recursively ordered child nodes. A node is either `["text", exact_decoded_text]` or `["element", lowercase_tag, sorted_attribute_pairs, children]`. Attribute keys sort lexically; multivalued attributes retain parser order. Comments are excluded consistently with existing content preparation.
3. Ignore parser formatting whitespace **between structural table/row/cell elements only**; retain all text inside caption/cells, including code whitespace, punctuation, link targets, IDs and empty cell strings. No NFC normalization and no trimming or whitespace collapsing. Merged/nested tables, absent explicit headers, ragged rows and empty non-key column headers fail before hashing/emission. A header-only table can use compact; records/split require at least one data row.
4. UTF-8 encode `json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))` without a trailing newline; SHA-256 gives lowercase 64-character hex. The version fixes this algorithm. Hash all tables before any source link/ID/media rewriting.

Changing cell content, markup, links, IDs, rows or columns fails that table's policy; formatting outside the table does not. Identical tables may share a digest but cannot share an identity. Loader rejects an incompatible policy algorithm through `schema_version`, rather than guessing. Validator implements this published algorithm independently and has fixed golden hash fixtures; it never imports transform/hash code.

### Emitted coordinate and content contract

Every table representation has a marker carrying `data-table-id="zh-CN/ch04/t01"`, `data-table-layout` and `data-table-source-sha256`. Native compact tables use the `<table>` itself. Records use a standalone anchor/marker before unboxed fields; no parent table/row container encloses their prose. Each split subtable uses the same table identity plus integer `data-table-part` and source `data-table-row` to state its row/group position.

Every original header/data cell has a value wrapper with `data-source-cell="zh-CN/ch04/t01:r1:c2"` and `data-source-copy="primary"`. Coordinates are zero-based: `r0` is the header, `r1` the first data row; columns are source order. The wrapper contains **only the original cell children**, not injected label text. Header/key repetition uses the same coordinate with `data-source-copy="repeat"`; exactly one occurrence of every coordinate is primary. A first group/header occurrence is primary and subsequent occurrences repeat. Source cell IDs are retained once on the primary value wrapper; repeats omit IDs recursively. Table, row and caption IDs also survive exactly once at the corresponding first semantic occurrence or standalone anchor. Builder applies its existing deterministic anchor rewriting afterward and must preserve these new `data-*` attributes.

Compact/split output uses `<thead>`, `<tbody>`, `<th scope="col">` and, where applicable, first-column `<th scope="row">`. Add deterministic emitted header IDs and `headers` attributes; do not overwrite an existing source ID. Records emit the key as an unboxed row-title field, with its original column label visible when nonempty, followed by the remaining labelled fields in order. Each injected visible label has `data-table-label-for="...:r1:c2"` and `data-table-header-ref="...:r0:c2"`. Labels copy the exact source header inline children, omit IDs, and live outside the value wrapper. Caption content has a separate `data-table-caption` wrapper, appears once and precedes data. No hidden original table, duplicate full text representation, image-only fallback or CSS-generated essential label.

Split policies additionally reject block/code content in repeated header/key cells: repeated `pre code` would change the global reviewed-code sequence. The current source inventory must establish that selected split tables satisfy this restriction. Inline code/links may repeat and are validated as declared repeat content.

### Independent emitted validation

The validator owns `validate-pstack-ebooks.py` and imports neither the transformer nor its receipts. It re-renders reviewed sources, verifies policy inventory/hashes, and extracts expected caption/header/cell content and source coordinates. Then:

- Require every expected coordinate once as primary, no unknown coordinates, no overlapping/nested value wrappers, and repeats only for policy-declared headers/key cells. Compare every repeat to its primary; undeclared repetition fails.
- Compare exact decoded value text, code bytes as UTF-8, meaningful inline/block node order, source links and source IDs after the builder's published existing URL/ID mapping. Strip only documented display-only highlight spans when comparing semantic markup. Coordinate attributes alone never establish association: verify physical table row/column positions, part/group columns, `scope`/`headers`, and visible records labels against source headers.
- Verify primary data cells occur in original table/row/column order, and tables remain in chapter source order. Header primaries retain their column order; repeats never participate in primary data ordering. Check captions, empty cells, table/row/cell anchors and their internal link targets independently.
- Preserve the existing code sequence check for the entire chapter. Compare reviewed non-table body content independently after excluding generated labels/repeated table values and builder front matter; the old validator did not prove all prose retention. Compare required link occurrences in primary content, allowing only explicit repeated-header/key links and known builder-added links.
- Replace the blanket table ban with policy-specific shape checks. Records cannot have a enclosing row/table box. Native tables must correspond to compact/split policies. Preserve XML/resource/fragment validation and typography checks, adapting any rule that would incorrectly prohibit the approved native-table shape.

Mutation acceptance cases: delete/duplicate/swap a primary cell; exchange coordinates without moving content; attach a visible label or native `headers` to the wrong column; change a source href, empty cell, caption, key repeat, row anchor or code byte; change policy hash; introduce an unknown table; box a records row; omit a chapter. These must each fail for the relevant content or layout invariant. EPUBCheck and actual-reader screenshots remain separate checks and cannot be inferred from coordinate validation.

## Builder/worker boundary

Root owns `build-pstack-ebooks.py`, styles, common link/ID preparation, navigation/media and build reports. Table worker owns `epub_layout.py`, the policy manifest and table-unit fixtures. Validator worker owns `validate-pstack-ebooks.py` and mutation fixtures. Freeze the written hash/attribute contract first; no worker edits another's files. `EPUB_CSS` can retain its current export initially, but any style edits in that shared file must be supplied to its single file owner to avoid concurrent writes.

Remove the old `reflow_tables` call in `package_epub`; there is one transformation path. Chapter tuples handed to the packager already contain EPUB-ready prepared bodies. Transform return receipts are reporting convenience, not a second manifest and not validation evidence. Root's sample/full selection changes packaging coverage, never source policy checks. PDF consumes untouched source-table HTML and its existing PDF styles; retain historical PDF/report files.

## Tradeoffs and alternatives

- Accept preparing two body variants to keep exact raw-source hashes and unchanged PDF input. Asset generation is reusable; adding link-reversal logic to hashes would be more fragile.
- Accept verbose per-language rules and source-coordinate attributes for explicit review and independent detection of column reassociation. Rules are authoritative; inventory and reports are derived.
- Accept row-level split subtables and extra headers for source data reading order. Full vertical panels would be visually shorter but reorder primary cells across rows; that is a material contract choice, not a CSS issue.
- Alternative: keep the late transformation and hash only cell text. It has the shallowest caller but cannot detect source href/ID/markup edits; adding a second raw-source receipt makes callers coordinate representations anyway.
- Alternative: stamp a raw-source plan onto prepared DOM, then apply it later. It hides rewrite details and preserves one preparation pass, but adds a plan/apply lifecycle and metadata that can be stripped by the existing attribute cleanup. Early pure transformation exposes fewer internal stages.
- Alternative: retain every original table and provide a second records rendition. It doubles content, anchor/repetition handling and reader-facing choices, while weakening independent retention checks.

## Synthesis decision, assumptions and next step

This is an independent candidate; the coordinating lead owns synthesis. Screened red flags: one policy writer, one transform path, no hand-synced inventory, immutable outputs, no hidden fallback, no validator import of the code under test. The remaining multi-file coupling is the deliberately frozen wire contract for hashes and coordinates.

Assumptions to verify before implementation: the source inventory contains no supported-required merged/nested tables; chosen split headers/keys have no block code; supplemental tables receive explicit policy entries; current link/anchor mapping remains the validator's expected mapping. Can row-level split repetition fit comfortably in WeChat Read? Representative ch20 sampling must answer this before full artifacts. Can a second reader and native WeChat Read be exercised? Their absence must remain a recorded rendering gap, not a content-validation failure or inferred success.

Next implementation step: freeze the hash/coordinate fixtures and full policy inventory, then let table and validator workers implement against that shared contract while root wires the early EPUB branch and sample packaging.

Unavailable checks in this design phase: no implementation, tests, EPUBCheck or native reader rendering were performed; source evidence above is local code inspection only.
