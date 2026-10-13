"""Explicit, source-bound EPUB table layouts (table-tree-v1).

The policy is editorial input. There is deliberately no layout classifier or
fallback: a source change must be reviewed before it can enter an EPUB.
"""
from collections import defaultdict
from copy import deepcopy
import hashlib
import json
import re
from types import MappingProxyType
from typing import NamedTuple

from bs4 import BeautifulSoup, Comment, NavigableString, Tag


class TableRule(NamedTuple):
    source_sha256: str
    mode: str
    reason: str
    key_column: int | None = None
    groups: tuple[tuple[int, ...], ...] = ()


class TablePolicy(NamedTuple):
    version: int
    source_snapshot: str
    tables: object


class TableReceipt(NamedTuple):
    table_id: str
    source_sha256: str
    layout: str
    rows: int
    columns: int


class TableResult(NamedTuple):
    html: str
    tables: tuple[TableReceipt, ...]


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate policy key: {key}")
        result[key] = value
    return result


def _keys(value, required, optional=()):
    if not isinstance(value, dict):
        raise ValueError("policy entry must be an object")
    missing = set(required) - value.keys()
    unknown = value.keys() - set(required) - set(optional)
    if missing or unknown:
        raise ValueError(f"invalid policy keys: missing={sorted(missing)}, unknown={sorted(unknown)}")


def parse_table_policy(text):
    """Parse version 1 policy, rejecting duplicates and undeclared schema keys."""
    try:
        data = json.loads(text, object_pairs_hook=_unique_object)
    except (TypeError, json.JSONDecodeError) as error:
        raise ValueError("invalid table policy JSON") from error
    _keys(data, ("version", "source_snapshot", "tables"))
    if type(data["version"]) is not int or data["version"] != 1:
        raise ValueError("unsupported table policy version")
    if data["source_snapshot"] != "2026-10-03":
        raise ValueError("unsupported source snapshot")
    if not isinstance(data["tables"], dict):
        raise ValueError("tables must be an object")
    tables = {}
    for table_id, languages in data["tables"].items():
        if not re.fullmatch(r"[A-Za-z0-9_-]+-t[0-9]{2,}", table_id):
            raise ValueError(f"invalid table ID: {table_id}")
        if not isinstance(languages, dict) or not languages or set(languages) - {"en", "zh-CN"}:
            raise ValueError(f"invalid table languages: {table_id}")
        rules = {}
        for language, entry in languages.items():
            _keys(entry, ("source_sha256", "mode", "reason"), ("key_column", "groups"))
            if not isinstance(entry["source_sha256"], str) or not re.fullmatch(r"[0-9a-f]{64}", entry["source_sha256"]):
                raise ValueError(f"invalid source hash: {table_id}/{language}")
            if entry["mode"] not in ("table", "records", "split"):
                raise ValueError(f"invalid layout mode: {table_id}/{language}")
            if not isinstance(entry["reason"], str) or not entry["reason"].strip():
                raise ValueError(f"missing editorial reason: {table_id}/{language}")
            groups = ()
            key_column = None
            if entry["mode"] == "split":
                if type(entry.get("key_column")) is not int or entry["key_column"] != 0:
                    raise ValueError("split requires key_column 0")
                raw_groups = entry.get("groups")
                if not isinstance(raw_groups, list) or not raw_groups:
                    raise ValueError("split requires nonempty groups")
                if any(not isinstance(group, list) or not group or
                       any(type(column) is not int or column < 1 for column in group)
                       for group in raw_groups):
                    raise ValueError("split groups must contain positive column indexes")
                columns = [column for group in raw_groups for column in group]
                if columns != list(range(1, len(columns) + 1)):
                    raise ValueError("split groups must be ordered contiguous non-key columns")
                groups = tuple(tuple(group) for group in raw_groups)
                key_column = 0
            elif "key_column" in entry or "groups" in entry:
                raise ValueError("only split policies may declare key_column or groups")
            rules[language] = TableRule(entry["source_sha256"], entry["mode"], entry["reason"], key_column, groups)
        tables[table_id] = MappingProxyType(rules)
    return TablePolicy(1, data["source_snapshot"], MappingProxyType(tables))


def table_tree(node):
    """Canonical complete parsed tree, retaining whitespace and attribute lists."""
    if isinstance(node, Comment):
        return ["comment", str(node)]
    if isinstance(node, NavigableString):
        return ["text", str(node)]
    if isinstance(node, Tag):
        return ["element", node.name.lower(),
                [[key, value] for key, value in sorted(node.attrs.items())],
                [table_tree(child) for child in node.contents]]
    raise ValueError("unsupported table tree node")


def table_source_sha256(table):
    encoded = json.dumps(table_tree(table), ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _cells(table):
    if table.select("table, [rowspan], [colspan]"):
        raise ValueError("nested or spanned table is unsupported")
    rows = table.find_all("tr")
    if not rows:
        raise ValueError("table has no rows")
    cells = [row.find_all(["th", "td"], recursive=False) for row in rows]
    if not cells[0] or any(cell.name != "th" for cell in cells[0]):
        raise ValueError("table requires an explicit th header row")
    if any(len(row) != len(cells[0]) for row in cells):
        raise ValueError("ragged table rows")
    if any(not cell.get_text(strip=True) for cell in cells[0][1:]):
        raise ValueError("table has an empty non-key header")
    if len(table.find_all("caption", recursive=False)) > 1:
        raise ValueError("table has multiple captions")
    return rows, cells


def _strip_ids(node):
    if isinstance(node, Tag):
        node.attrs.pop("id", None)
        for child in node.descendants:
            if isinstance(child, Tag):
                child.attrs.pop("id", None)


def _block(cell):
    return cell.find(["p", "pre", "ul", "ol", "blockquote", "div", "section", "figure", "dl", "h1", "h2", "h3", "h4"]) is not None


def transform_tables(html, *, source_html, document_id, language, policy):
    """Hash reviewed raw HTML and lay out the separately prepared cell payloads.

    Receipts report data-row count (excluding row 0) and source-column count.
    Coordinates belong to source cells; repeated labels/keys get copy 1, 2, ... .
    """
    if language not in ("en", "zh-CN") or not re.fullmatch(r"[A-Za-z0-9_-]+", document_id):
        raise ValueError("invalid document ID or language")
    if not isinstance(policy, TablePolicy):
        raise ValueError("policy must be parsed by parse_table_policy")
    soup = BeautifulSoup(html, "html.parser")
    source = BeautifulSoup(source_html, "html.parser")
    prepared_tables, source_tables = soup.select("table"), source.select("table")
    if len(prepared_tables) != len(source_tables):
        raise ValueError("prepared/source table inventory differs")
    expected = {f"{document_id}-t{i:02d}" for i in range(1, len(source_tables) + 1)}
    actual = {table_id for table_id, rules in policy.tables.items()
              if table_id.startswith(document_id + "-t") and language in rules}
    if actual != expected:
        raise ValueError(f"policy inventory mismatch: missing={sorted(expected-actual)}, extra={sorted(actual-expected)}")
    receipts = []
    for index, (table, raw_table) in enumerate(zip(prepared_tables, source_tables), 1):
        table_id = f"{document_id}-t{index:02d}"
        rule = policy.tables[table_id][language]
        raw_rows, raw_cells = _cells(raw_table)
        rows, cells = _cells(table)
        if len(rows) != len(raw_rows) or len(cells[0]) != len(raw_cells[0]):
            raise ValueError(f"prepared/source table shape differs: {table_id}")
        if any(cell.get_text() != raw_cells[r][c].get_text()
               for r, row in enumerate(cells) for c, cell in enumerate(row)):
            raise ValueError(f"prepared/source cell text differs: {table_id}")
        source_hash = table_source_sha256(raw_table)
        if source_hash != rule.source_sha256:
            raise ValueError(f"stale source hash: {table_id}/{language}")
        columns = len(cells[0])
        if len(rows) == 1 and rule.mode != "table":
            raise ValueError("header-only table must use table mode")
        if rule.mode == "split" and [c for group in rule.groups for c in group] != list(range(1, columns)):
            raise ValueError("split groups do not cover all non-key source columns")
        copies = defaultdict(int)

        def payload(r, c, name=None, label_for=None):
            cell = cells[r][c]
            copy_index = copies[r, c]
            if copy_index and cell.find("pre") is not None:
                raise ValueError("repeated block-code payload is unsupported")
            copies[r, c] += 1
            element = soup.new_tag(name or ("div" if _block(cell) else "span"))
            if cell.get("id") and not copy_index:
                element["id"] = cell["id"]
            element.attrs.update({"data-table-id": table_id, "data-source-row": str(r),
                                  "data-source-col": str(c), "data-copy": str(copy_index)})
            if label_for is not None:
                element["data-label-for"] = label_for
            for child in cell.contents:
                copied = deepcopy(child)
                if copy_index:
                    _strip_ids(copied)
                element.append(copied)
            return element

        emitted = []
        caption = table.find("caption", recursive=False)
        if rule.mode != "table":
            marker = soup.new_tag("a", attrs=({"data-table-id": table_id, "data-table-mode": rule.mode}
                                             if rule.mode == "records" else {}))
            if table.get("id"):
                marker["id"] = table["id"]
            if rule.mode == "records" or table.get("id"):
                emitted.append(marker)
            for structural in table.find_all(["thead", "tbody", "tfoot"]):
                if structural.get("id"):
                    emitted.append(soup.new_tag("a", attrs={"id": structural["id"]}))
            if rows[0].get("id"):
                emitted.append(soup.new_tag("a", attrs={"id": rows[0]["id"]}))
            if caption is not None:
                cap = deepcopy(caption)
                cap.name = "div" if _block(caption) else "p"
                cap["class"] = list(cap.get("class", [])) + ["table-caption"]
                emitted.append(cap)

        def native_table(row_indexes, selected, panel=None, source_row=None):
            result = soup.new_tag("table")
            if rule.mode == "table":
                result.attrs.update(deepcopy(table.attrs))
                if caption is not None:
                    result.append(deepcopy(caption))
            result.attrs.update({"data-table-id": table_id, "data-table-mode": rule.mode})
            if panel is not None:
                result["data-panel"] = str(panel)
                result["data-table-row"] = str(source_row)
            head, body = soup.new_tag("thead"), soup.new_tag("tbody")
            if rule.mode == "table":
                for name, target in (("thead", head), ("tbody", body)):
                    originals = table.find_all(name, recursive=False)
                    if originals:
                        target.attrs.update(deepcopy(originals[0].attrs))
                    for original in originals[1:]:
                        if original.get("id"):
                            emitted.append(soup.new_tag("a", attrs={"id": original["id"]}))
                for original in table.find_all("tfoot", recursive=False):
                    if original.get("id"):
                        emitted.append(soup.new_tag("a", attrs={"id": original["id"]}))
            result.append(head)
            result.append(body)
            for r in row_indexes:
                row = soup.new_tag("tr")
                if rule.mode == "table":
                    row.attrs.update(deepcopy(rows[r].attrs))
                for c in selected:
                    cell = cells[r][c]
                    output = payload(r, c, "th" if r == 0 else cell.name)
                    for key, value in cell.attrs.items():
                        if key != "id" and not key.startswith("data-"):
                            output[key] = deepcopy(value)
                    if r == 0:
                        output["scope"] = "col"
                    row.append(output)
                (head if r == 0 else body).append(row)
            return result

        if rule.mode == "table":
            emitted.append(native_table(range(len(rows)), range(columns)))
        elif rule.mode == "split":
            for r in range(1, len(rows)):
                if rows[r].get("id"):
                    emitted.append(soup.new_tag("a", attrs={"id": rows[r]["id"]}))
                for panel, group in enumerate(rule.groups):
                    emitted.append(native_table((0, r), (0, *group), panel, r))
        else:
            for r in range(1, len(rows)):
                if rows[r].get("id"):
                    emitted.append(soup.new_tag("a", attrs={"id": rows[r]["id"]}))
                for c in range(columns):
                    field = soup.new_tag("div" if _block(cells[r][c]) or _block(cells[0][c]) else "p")
                    field["class"] = ["table-field"] + (["table-row-start", "table-record-title"] if c == 0 else [])
                    label = payload(0, c, label_for=f"{table_id}:{r}:{c}")
                    label_wrap = soup.new_tag("div" if _block(cells[0][c]) else "strong")
                    label_wrap.append(label)
                    field.append(label_wrap)
                    if cells[0][c].get_text():
                        field.append(": ")
                    else:
                        field.append(" ")
                    value = payload(r, c)
                    if c == 0 and not _block(cells[r][c]):
                        title = soup.new_tag("strong")
                        title.append(value)
                        field.append(title)
                    else:
                        field.append(value)
                    emitted.append(field)
        table.replace_with(*emitted)
        receipts.append(TableReceipt(table_id, source_hash, rule.mode, len(rows) - 1, columns))
    return TableResult(str(soup), tuple(receipts))
