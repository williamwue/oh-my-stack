# Candidate 1: policy-driven replacement at the EPUB packaging boundary

## Problem

Keep the builder's prepared chapter HTML and PDF flow intact, replacing only the current `reflow_tables` call. Today `make_content` rewrites source links and IDs, strips browser attributes, and produces the HTML used by both formats (`build-pstack-ebooks.py:47–95`). Packaging applies the EPUB transform later (`:115–120`). Consequently a policy hash must use the reviewed source before these rewrites, while emitted content must use the prepared HTML. The validator currently bans all tables and compares concatenated label/value text (`validate-pstack-ebooks.py:80,107–114`); that cannot prove mixed layouts or detect a correct value under the wrong label.

## Usage (caller's view)

```python
# Build: raw_source_html comes from existing parse_body, before mutations.
policy = parse_table_policy(policy_path.read_text(encoding="utf-8"))
result = transform_tables(
    prepared_html,
    source_html=raw_source_html,
    document_id="ch04",
    language="zh-CN",
    policy=policy,
)
files["ch04.xhtml"] = xhtml(title, result.html, "zh-CN")
table_receipts.extend(result.tables)

# Table-free chapter: same call; an empty receipt tuple is a successful result.
# PDF uses prepared_html, never result.html.

# Independent acceptance: reads source and actual ZIP, not builder receipts.
report = validate("zh-CN", sample_epub, expected_documents=SAMPLE_DOCUMENTS)
report = validate("zh-CN", full_epub)  # all frozen manifest entries and appendices
```

The builder supplies immutable source HTML by document ID, captured during its existing parse pass. No second Markdown parser configuration and no source file edits are needed. Supplemental documents use IDs `glossary` and `image-notes`; their tables also require policy coverage, separately from the 102 body tables.

## Shape

One new table module owns policy parsing and pure transformation. The root owns `epub_layout.py` CSS and builder integration; the table worker owns `epub_tables.py`, policy JSON, and layout unit tests; the validator worker owns `validate-pstack-ebooks.py` and mutation tests. The old table transformer is removed from builder use in the same integration change, avoiding two competing implementations.

```python
@dataclass(frozen=True)
class SemanticTable: pass

@dataclass(frozen=True)
class SplitTable:
    key_column: int
    groups: tuple[tuple[int, ...], ...]  # non-key columns only

@dataclass(frozen=True)
class RecordTable: pass  # first column is the record title

Layout = SemanticTable | SplitTable | RecordTable

@dataclass(frozen=True)
class TableRule:
    source_sha256: str
    layout: Layout

@dataclass(frozen=True)
class TablePolicy:
    # Immutable domain lookup, not a public JSON dict.
    rules: Mapping[tuple[str, str], TableRule]  # (language, table_id)

@dataclass(frozen=True)
class TableReceipt:
    table_id: str
    source_sha256: str
    layout: str
    rows: int       # excludes header
    columns: int

@dataclass(frozen=True)
class TableResult:
    html: str
    tables: tuple[TableReceipt, ...]

def parse_table_policy(text: str) -> TablePolicy:
    raise NotImplementedError

def transform_tables(html: str, *, source_html: str, document_id: str,
                     language: str, policy: TablePolicy) -> TableResult:
    raise NotImplementedError
```

Parsing validates schema and converts the discriminated union; transformation validates table-specific dimensions, hashes, and coverage. Both fail with `ValueError` naming language/table ID. There is no fallback classifier. The public surface hides copying, ID deduplication, splitting, and markup emission behind one operation, per boundary-discipline and interface-depth principles. Receipts are useful reporting data, never validation authority.

### Policy schema and hash

Proposed file: `docs/books/pstack/epub-table-policy.json`.

```json
{
  "version": 1,
  "source_snapshot": "2026-10-03",
  "tables": {
    "ch04-t01": {
      "zh-CN": {"source_sha256": "<64 lowercase hex>", "mode": "table"},
      "en": {"source_sha256": "<64 lowercase hex>", "mode": "table"}
    },
    "ch20-t01": {
      "zh-CN": {
        "source_sha256": "<64 lowercase hex>", "mode": "split",
        "key_column": 0, "groups": [[1, 2], [3, 4], [5]]
      }
    },
    "ch27-t01": {
      "zh-CN": {"source_sha256": "<64 lowercase hex>", "mode": "records"}
    }
  }
}
```

Example entries illustrate structure, not completed editorial classifications. Missing languages are rejected when built. IDs use immutable frozen manifest chapter order and one-based source table ordinal, scoped to the document; IDs do not contain content hashes. Insertion/reordering produces missing/stale entries and requires deliberate policy review. They are stable across rebuilding/localization, not promised stable under future editorial restructuring.

Hash definition `table-tree-v1`: SHA-256 of UTF-8 compact JSON (`ensure_ascii=False`, separators `(',', ':')`) for the complete reviewed rendered `<table>` tree. Text nodes become `["text", exact_text]`; comments become `["comment", exact_text]`; elements become `["element", lowercase_tag, sorted_attribute_pairs, child_nodes]`. Attribute values retain exact strings or parser-provided lists, without whitespace normalization. Include caption, header, IDs, hrefs, and all table/row/cell attributes; do not include neighboring prose. Use the same pinned Mistune/BeautifulSoup source parse as the existing builder, before rewriting IDs or URLs. A parser upgrade can intentionally invalidate hashes. Never regenerate hashes automatically during a build. The independent validator implements this short canonicalization spec itself rather than importing the transformer.

Reject unknown schema keys/modes, invalid hashes, nested tables, spans, nonrectangular rows, missing explicit header row, empty non-key headers, missing or surplus policy entries for a selected document, and source/prepared table counts or dimensions that differ. For split mode, each group is nonempty and strictly ascending; concatenating groups equals the original non-key column sequence exactly; key is a valid column. This guarantees deterministic grouping without silent omission or duplicate non-key cells. Full validation additionally rejects policy IDs absent from the frozen source inventory; sample validation selects the declared document subset and does not claim full coverage.

### Emitted coordinate and association contract

Every original cell occurrence has `data-table-id`, `data-source-row`, `data-source-col`; rows are zero-based including the header at row 0, columns zero-based. Every occurrence also has `data-copy="0"` for its first appearance, `"1"` for its second, etc. These attributes identify the payload element, not a wrapper containing a generated label plus value. Whitespace-exact code payloads are preserved; markup descendants retain their order. Generated punctuation sits outside payload nodes.

* **table:** one semantic `<table data-table-id="…" data-table-mode="table">`, original row order, `<thead>` and `<tbody>`. Header cells use `scope="col"`. One occurrence per coordinate.
* **split:** sequential semantic tables with matching `data-table-id`, mode `split`, and zero-based `data-panel`. Each panel contains key then its declared columns, complete original row order, explicit column headers. Key cells and key header repeat once per panel; other coordinates occur once. Table reading order is panel-major, row-major within panel. This is the declared exception to one global row-major traversal.
* **records:** no enclosing row/catalog box. First-column value is an unboxed title paragraph; every other cell follows as an unboxed labelled paragraph (or block-safe `div`). The label is a real-text header clone tagged with header coordinates; its value has its own data coordinates. Include the key header as a small label before each title as well, preserving even a nonempty first-column header. Order is row-major, column-major. Each header coordinate appears once per data row; each data coordinate once. A zero-data-row table requires `table` mode; selecting `records` is an explicit policy error rather than dropping its headers.

For record markup, attach `data-label-for="<table_id>:<row>:<col>"` to the label occurrence; the validator checks both this reference and actual adjacency/field containment. For tables, the validator checks header cell coordinates, column positions and `scope`; metadata alone cannot make a swapped visible label pass.

Captions appear once before a transformed table group. Preserve table and row IDs once as anchor elements when containers disappear; preserve cell/descendant IDs only on first occurrences, removing them from repeated clones. Never remove hrefs from clones. Existing builder ID rewriting remains authoritative. The validator checks every original ID's mapped target exists exactly once, including caption and header descendants.

### Independent emitted-content validation

Read reviewed Markdown and policy independently, derive the expected coordinate occurrence sequence for its declared mode, and compare with parsed ZIP XHTML. Require exact occurrence multiplicities and positions, including generated labels and repeated key cells; reject unknown coordinates, unexpected tables and untagged transformed cell content. Compare each occurrence's text and semantic descendant structure, excluding only generated metadata and documented layout wrappers. Preserve text spacing (code byte-equivalent), formatting/link ordering, href destinations after the builder's documented rewrite, and IDs after the builder's documented mapping. Validate both payload and association: swapping coordinates, labels, values, rows, panels, or deleting duplicates must fail.

Also compare source content outside tables against chapter content after excluding known generated front matter, so matching table coordinates cannot hide dropped prose. Whole-chapter code sequence equality and existing package/resource checks remain independent. Mutation fixtures must cover stale hash, dropped/duplicated cell, swapped labels, row/panel permutation, altered link, duplicate ID, and a missing code newline. EPUBCheck checks package conformance; actual-reader screenshots check rendering. Neither substitutes for the other.

## Synthesis decision

Reserved for the coordinating lead; this candidate makes no selection among runners.

## Tradeoffs accepted

* We accept passing reviewed and prepared HTML together in exchange for preserving the PDF pipeline and hashing before dynamic resource rewrites.
* We accept a tiny independently implemented hash/coordinate specification in exchange for avoiding a validator that reproduces the transformer's own mistakes.
* We accept explicit per-language rules and a frozen ordinal identity in exchange for stable, reviewable classification without heuristic drift.
* We accept repeated visible labels and split keys in exchange for associations that remain readable with author CSS disabled.

## Alternatives considered

1. Transform source DOM before builder normalization, with separate PDF/EPUB preparations. This hides the dual-HTML parameter but exposes format branching throughout preparation, requires preserving newly added data attributes through stripping, and risks drifting media/anchor behavior. Deeper transformation interface, broader integration surface; rejected for this bounded change.
2. Introduce a shared table IR consumed by renderer and validator. This makes renderer callers elegant but adds source-extraction/build pipeline changes and can make validation trust the same faulty extraction. Better if multiple future renderers need semantic tables; excessive here.

Red-flag screen: one transform entry; no staged caller choreography; no mutable shared state; one policy owner; no class hierarchy beyond a small closed layout union; no runtime classifier competing with the manifest.

## Open questions and risks

Can split comparisons still fit WeChat Read at representative user font sizes? Only native-reader acceptance can resolve this; CSS and static checks cannot. Do any supplemental source tables contain unsupported spans or nested content? Inventory them before policy freeze; fail explicitly if found. Neither question blocks contract implementation.

## Next implementation step

Implement policy parsing, source hashing and the coordinate-emitting pure transform with representative three-mode fixtures, then integrate at the existing package boundary.

No code was implemented and no reader, EPUBCheck, or mutation test was run during this design-only task.
