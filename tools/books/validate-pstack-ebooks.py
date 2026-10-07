#!/usr/bin/env python3
"""Verify EPUB content, reflow reading order, resources, and source receipts."""

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET
import zipfile

from bs4 import BeautifulSoup
import mistune

ROOT = Path(__file__).resolve().parents[2]
BOOK = ROOT / "docs/books/pstack"
RENDER = mistune.create_markdown(escape=False, plugins=["table", "strikethrough"])
KANA = re.compile(r"[\u3040-\u30ff]")


def digest(value):
    return hashlib.sha256(value).hexdigest()


def normalize_text(element):
    return re.sub(r"\s+", "", element.get_text())


def table_rows_in_reading_order(document):
    rows = []
    seen = set()
    previous = None
    for cell in document.select(".table-field"):
        key = cell["data-table-row"]
        if key != previous:
            assert key not in seen, f"interleaved table row {key}: reading order changed"
            seen.add(key)
            rows.append([])
            previous = key
        rows[-1].append(normalize_text(cell))
    return rows


def explanatory_comment(line):
    if re.match(r"\s*(?:#|/\*|\* |<!--)", line):
        return line
    quote = None
    escaped = False
    for index, char in enumerate(line):
        if escaped:
            escaped = False
        elif quote:
            if char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char in "\"'`":
            quote = char
        elif line[index:index + 2] == "//":
            return line[index + 2:]
    return ""


def validate(language, artifact):
    manifest = json.loads((BOOK / "source-manifest.json").read_text())
    rows = []
    with zipfile.ZipFile(artifact) as epub:
        names = set(epub.namelist())
        assert epub.namelist()[0] == "mimetype"
        assert epub.getinfo("mimetype").compress_type == zipfile.ZIP_STORED
        assert epub.read("mimetype") == b"application/epub+zip"
        documents = {}
        for name in names:
            if name.endswith((".xhtml", ".opf", ".xml")):
                ET.fromstring(epub.read(name))
            if name.endswith(".xhtml"):
                documents[name] = BeautifulSoup(epub.read(name), "html.parser")
        for name, doc in documents.items():
            assert not doc.select("table"), f"{name}: reader-dependent table layout remains"
            assert not doc.select(".table-record, .reflow-table"), f"{name}: enclosing table boxes remain"
            assert not doc.select(".code-line"), f"{name}: source browser classes remain"
            for element in doc.select("[href], [src]"):
                value = element.get("href", element.get("src"))
                url = urlsplit(value)
                if url.scheme or url.netloc:
                    continue
                destination = str(PurePosixPath(name).parent / unquote(url.path)) if url.path else name
                assert destination in names, f"{name}: missing resource {value}"
                if url.fragment:
                    assert destination in documents, f"{name}: fragment target is not XHTML"
                    assert documents[destination].find(id=unquote(url.fragment)), f"{name}: missing anchor {value}"
        css = epub.read("OEBPS/book.css").decode()
        assert not re.search(r"(?:^|[;{])\s*(?:position\s*:\s*(?:absolute|fixed)|height\s*:\s*\d|table-layout\s*:|bookmark-level\s*:|string-set\s*:)|@page", css)
        assert not re.search(r"\d(?:pt|mm)\b", css), "EPUB inherits fixed PDF dimensions"
        for chapter in manifest["chapters"]:
            order = chapter["order"]
            path = BOOK / chapter["translation_file" if language == "zh-CN" else "english_file"]
            markdown = path.read_text()
            body = re.search(r"<!-- book-body:start -->\n([\s\S]*?)<!-- book-body:end -->", markdown)[1]
            source = BeautifulSoup(RENDER(body), "html.parser")
            emitted = documents[f"OEBPS/ch{order:02}.xhtml"]
            original_code = [item.get_text() for item in source.select("pre code")]
            actual_code = [item.get_text() for item in emitted.select("pre code")]
            assert original_code == actual_code, f"chapter {order}: code differs from reviewed edition"
            expected = []
            for table in source.select("table"):
                table_rows = table.select("tr")
                labels = [normalize_text(cell) for cell in table_rows[0].find_all(["th", "td"], recursive=False)]
                for row in table_rows[1:]:
                    cells = row.find_all(["th", "td"], recursive=False)
                    expected.append([(label + ":" if label else "") + normalize_text(cell) for label, cell in zip(labels, cells)])
            actual = table_rows_in_reading_order(emitted)
            assert expected == actual, f"chapter {order}: column labels, row order, or cell content changed"
            if language == "zh-CN":
                assert not any(KANA.search(explanatory_comment(line)) for block in actual_code
                               for line in block.splitlines()), f"chapter {order}: untranslated Japanese comment"
                original = BeautifulSoup(RENDER((ROOT / chapter["source_snapshot"]["ja_file"]).read_text()), "html.parser")
                original_comments = {explanatory_comment(line).strip() for block in original.select("pre code")
                                     for line in block.get_text().splitlines()
                                     if re.search(r"[\u4e00-\u9fff]", explanatory_comment(line))}
                actual_comments = {explanatory_comment(line).strip() for block in actual_code
                                   for line in block.splitlines() if explanatory_comment(line).strip()}
                assert not original_comments.intersection(actual_comments), f"chapter {order}: original Japanese comment remains (including Kanji-only text)"
            rows.append({"order": order, "edition_file": path.relative_to(ROOT).as_posix(),
                         "edition_sha256": digest(path.read_bytes()), "code_blocks": len(actual_code),
                         "tables": len(source.select("table")), "table_rows": len(expected),
                         "blocks_with_kana": sum(bool(KANA.search(block)) for block in actual_code)})
    return {"language": language, "epub_sha256": digest(artifact.read_bytes()),
            "chapters": rows, "total_code_blocks": sum(row["code_blocks"] for row in rows),
            "total_tables": sum(row["tables"] for row in rows),
            "total_table_rows": sum(row["table_rows"] for row in rows),
            "remaining_blocks_with_kana": sum(row["blocks_with_kana"] for row in rows),
            "xml_resources_links_code_and_reading_order": "passed"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--language", choices=["zh-CN", "en"], required=True)
    parser.add_argument("--epub", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    result = validate(args.language, args.epub or ROOT / f"output/epub/pstack-{args.language}.epub")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({key: value for key, value in result.items() if key != "chapters"}, ensure_ascii=False))
