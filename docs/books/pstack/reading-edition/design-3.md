# Candidate 3: reviewed table policies with source-cell receipts

## Problem

The EPUB builder currently turns every source table into labelled paragraphs, and the validator bans tables and infers cell association from a flat sequence. The reading edition needs three deliberate outcomes—retain compact tables, split wide short comparisons, and linearize long or catalog tables—while making a source edit fail closed until its layout decision is reviewed. Builder and validator are separate owners, so emitted structure must carry enough provenance for validation that does not trust the transformation code.

## Usage (caller's view)

The build path loads one versioned policy file, then transforms each rendered chapter with its one-based chapter order:

```python
policies = load_table_policies(BOOK / "table-layouts.json")
result = transform_epub_tables(rendered_html, chapter_order=4, policies=policies)
chapter_xhtml = xhtml(title, result.html, lang)
```

The transformed HTML is ordinary semantic XHTML. Its EPUB-only `data-source-cell` receipts connect each rendered cell or field to its source table, body row, and column. They are stripped from PDFs and do not affect reading or styling.

The validator independently reads the reviewed source and the same policy file:

```python
receipt = validate_emitted_tables(source_html, emitted_xhtml,
                                  chapter_order=4, policies=policies)
```

It returns per-table counts and fails on a missing, extra, stale, duplicated, reordered, or content-mismatched source coordinate. EPUBCheck remains a separate package-level check.

## Shape

Keep the public boundary in `tools/books/epub_layout.py`; the policy file is `docs/books/pstack/table-layouts.json`. Policies are content decisions rather than builder heuristics, so no width or row-count cutoff silently changes a published edition.

The manifest has a fixed schema version and one entry for every source table in the frozen 48 chapters:

```json
{
  "schema_version": 1,
  "hash_algorithm": "sha256-table-v1",
  "tables": {
    "ch04-t01": {
      "source_sha256": "<64 lowercase hex characters>",
      "layout": "compact"
    },
    "ch20-t01": {
      "source_sha256": "<64 lowercase hex characters>",
      "layout": "split",
      "key_column": 0,
      "groups": [[1, 2], [3, 4, 5]]
    },
    "ch27-t01": {
      "source_sha256": "<64 lowercase hex characters>",
      "layout": "prose",
      "title_column": 0
    }
  }
}
```

IDs derive only from frozen source location: `ch{chapter_order:02}-t{table_ordinal:02}`, with table ordinal counted in document order. A moved or inserted table therefore changes the map and requires review. `source_sha256` is computed over UTF-8 canonical JSON for the parsed table subtree: element names, sorted attributes, exact text nodes, and child order; JSON uses compact separators and `ensure_ascii=False`. This includes captions, links, IDs, headers, and cell markup, while ignoring serializer-only quote and attribute-order differences. Version `sha256-table-v1` pins those rules. Unknown versions, absent/extra IDs, invalid columns/groups, or any digest mismatch are fatal; update the policy only with an intentional layout review.

The three layouts have narrow semantics:

- `compact`: emit a semantic `<table>` with `<caption>` when present, a header row, and body rows; never add fixed widths, horizontal scrolling, or reader-dependent scripting. This is limited to tables whose reviewed content remains useful with natural column wrapping.
- `split`: emit one semantic table per declared contiguous column group, repeating the declared key column in each group. Groups must cover each non-key source column exactly once; no empty group or implicit fallback is allowed.
- `prose`: emit the optional source caption as an unboxed heading, then each body row as an unboxed labelled record; the declared title column supplies the record heading and remaining columns supply labels. This accommodates long explanations and catalogs without a large bordered container.

Every emitted source-derived cell carries `data-source-cell="ch04-t01:r01:c02"`, where row and column are zero-based within the body matrix (header row is `r00`). Every split duplicate also carries `data-copy-of` with the same coordinate and a required `data-split-group` index. Compact and prose output use each source coordinate exactly once. Split output uses each non-key coordinate exactly once and repeats the key coordinate once per group; the validator derives that expected multiplicity from policy. Caption and header content receive coordinates too, so associations and ordering can be checked across all source cells, not only body text. Preserve IDs and links on their original emitted content.

The transformation is pure and returns explicit receipts for logging and focused tests:

```python
@dataclass(frozen=True)
class TableReceipt:
    table_id: str
    source_sha256: str
    layout: Literal["compact", "split", "prose"]
    source_cells: int
    emitted_cells: int

@dataclass(frozen=True)
class TableTransformResult:
    html: str
    receipts: tuple[TableReceipt, ...]

def transform_epub_tables(
    content: str, *, chapter_order: int, policies: TablePolicies
) -> TableTransformResult: ...

def validate_emitted_tables(
    source_html: str, emitted_xhtml: str, *, chapter_order: int,
    policies: TablePolicies
) -> tuple[TableReceipt, ...]: ...
```

`TablePolicies` is an immutable parsed domain map, not raw JSON. Parsing and schema checks happen once at the file boundary. Both entry points independently derive table IDs and hashes from their own input DOM. The validator does not call the transform function: it enumerates expected source coordinates and text/links, reads emitted coordinate receipts, checks expected multiplicity and row/column order, then compares associated normalized text and links. It also asserts that all source tables have exactly one policy and that no `data-source-cell` appears outside a recognized emitted table representation. This is the independent evidence boundary; malformed or missing receipts fail the EPUB build.

`build-pstack-ebooks.py` calls `transform_epub_tables` only from `package_epub` for EPUB chapters. PDF input remains the untransformed chapter content, preserving the existing PDF table layout. Add the table-layout version and policy digest to the EPUB build report so a reviewer can identify which decisions produced an artifact. The builder should not infer policy from table dimensions.

The surface is deliberately small: callers provide chapter identity and a parsed manifest, then receive transformed HTML and receipts. Hashing, policy validation, ID construction, and coordinate emission stay behind that boundary. The validator accepts source and emitted documents because validating only builder receipts would let a transformation bug certify itself.

## Tradeoffs accepted

- We accept a reviewed entry for every table and a policy update after source edits in exchange for layout decisions that cannot drift silently.
- We accept machine-readable `data-*` attributes in EPUB XHTML in exchange for an independent, coordinate-based content proof; readers ignore these attributes.
- We accept a little repeated key content in split comparisons in exchange for keeping every comparison value adjacent to its key on narrow screens.
- We accept custom canonicalization code in exchange for hashes that survive HTML serialization noise while covering content, links, IDs, and structure.
- We accept no automatic policy defaults in exchange for failing closed when a new source table appears.

## Alternatives considered

- Infer layout from column count, text length, or rendered width. This is a smaller manifest surface but exposes tuning thresholds to the builder and can silently reclassify a table after translation or source changes; explicit reviewed policies hide that variability.
- Keep all tables and put validation metadata in an external sidecar report. This avoids XHTML attributes, but the validator must align rendered cells by fragile positional heuristics and cannot prove that emitted cells retain source association after a reorder. Coordinate receipts make the relationship local and auditable.
- Store policy beside each chapter translation. This keeps decisions near editorial text, but duplicates policy parsing and fragments one global inventory; one manifest gives the builder and validator a complete, checkable set.

## Open questions and risks

- Should a split policy allow non-contiguous column groups, or are contiguous groups enough for the reviewed comparisons? Prefer contiguous groups unless a real table requires otherwise.
- Does the selected EPUB reading stack preserve harmless `data-*` attributes? If not, the same coordinate token can be emitted as visually hidden semantic annotation, but that must be verified with WeChat Read before choosing the fallback.
- Canonical subtree hashing must be implemented once as a small shared primitive; validator independence applies to transformation and emitted-cell checking, not duplicating a hash algorithm whose rules themselves can diverge.

## Next implementation step

Inventory all 102 frozen source tables, generate the initial policy skeleton and canonical hashes, then review each layout classification before wiring the pure transform and independent coordinate validator.
