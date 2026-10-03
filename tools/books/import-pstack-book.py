#!/usr/bin/env python3
"""Import the authorized Zenn pstack book in Japanese and English.

Prerequisites (install outside the repository, or in a local virtualenv):
    python3 -m pip install beautifulsoup4==4.14.2 markdownify==1.2.0

Run from any directory:
    python3 tools/books/import-pstack-book.py

A completed snapshot is immutable. Use --snapshot-date YYYY-MM-DD to create a
new source revision. A partial import may resume until its inventory is complete.
Use --through 12 to prepare an initial translation batch.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    from bs4 import BeautifulSoup
    from markdownify import MarkdownConverter
except ImportError as exc:
    raise SystemExit(
        "Missing import dependency. Run: python3 -m pip install "
        "beautifulsoup4==4.14.2 markdownify==1.2.0"
    ) from exc

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "docs/books/pstack/source-manifest.json"
DEST = ROOT / "upstream/books/pstack/2026-10-03"
NEXT_DATA = re.compile(r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.S)
USER_AGENT = "oh-my-stack-pstack-book-import/1.0 (authorized archival import)"


def request_bytes(url: str) -> bytes:
    for attempt in range(5):
        try:
            request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json, text/html"})
            with urlopen(request, timeout=30) as response:
                return response.read()
        except (HTTPError, URLError, TimeoutError) as exc:
            if isinstance(exc, HTTPError) and exc.code not in (429, 500, 502, 503, 504):
                raise
            if attempt == 4:
                raise
            time.sleep(min(2 ** attempt, 8))
    raise AssertionError("unreachable")


def page_chapters(url: str) -> list[dict]:
    page = request_bytes(url).decode("utf-8")
    match = NEXT_DATA.search(page)
    if not match:
        raise ValueError(f"No __NEXT_DATA__ in {url}")
    chapters = json.loads(match.group(1))["props"]["pageProps"]["chapters"]
    if len(chapters) != 48:
        raise ValueError(f"Expected 48 chapters at {url}, found {len(chapters)}")
    return chapters


def atomic_write(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".tmp")
    temp.write_bytes(content)
    temp.replace(path)


class FaithfulMarkdown(MarkdownConverter):
    """Render ordinary text as Markdown and preserve rich structures as HTML."""

    def convert_strong(self, el, text, parent_tags):
        # Markdown strong delimiters beside Japanese punctuation can be treated
        # as literal asterisks by some CommonMark renderers.
        return f"<strong>{text}</strong>"

    def convert_b(self, el, text, parent_tags):
        return self.convert_strong(el, text, parent_tags)

    def convert_pre(self, el, text, parent_tags):
        code = el.find("code")
        raw = (code or el).get_text()
        # Shiki spans include the original newlines. A final newline belongs to
        # the code, so fence it without trimming or rebuilding the lines.
        longest = max((len(m.group()) for m in re.finditer(r"`+", raw)), default=0)
        fence = "`" * max(3, longest + 1)
        classes = (code or el).get("class", [])
        language = next((c[9:] for c in classes if c.startswith("language-")), "")
        if raw and not raw.endswith("\n"):
            # Fenced code requires a separator; the actual source is recoverable
            # byte-for-byte from body_html in the paired JSON.
            raw += "\n"
        return f"\n\n{fence}{language}\n{raw}{fence}\n\n"

    def convert_aside(self, el, text, parent_tags):
        return "\n\n" + str(el) + "\n\n"

    def convert_details(self, el, text, parent_tags):
        return "\n\n" + str(el) + "\n\n"

    def convert_section(self, el, text, parent_tags):
        if "footnotes" in el.get("class", []):
            return "\n\n" + str(el) + "\n\n"
        return text

    def convert_sup(self, el, text, parent_tags):
        if "footnote-ref" in el.get("class", []):
            return str(el)
        return text

    def convert_table(self, el, text, parent_tags):
        return "\n\n" + str(el) + "\n\n"

    def convert_span(self, el, text, parent_tags):
        if "embed-block" in el.get("class", []):
            return str(el)
        return text

    def convert_iframe(self, el, text, parent_tags):
        return str(el)

    def convert_img(self, el, text, parent_tags):
        # Original attributes can carry useful image sizing and attribution.
        if any(key not in {"src", "alt", "title"} for key in el.attrs):
            return str(el)
        return super().convert_img(el, text, parent_tags)

    def convert_hN(self, n, el, text, parent_tags):
        heading = super().convert_hN(n, el, text, parent_tags)
        identifier = el.get("id")
        if identifier:
            return f'\n\n<a id="{identifier}"></a>\n' + heading
        return heading

    def convert_a(self, el, text, parent_tags):
        if "header-anchor-link" in el.get("class", []):
            return ""
        return super().convert_a(el, text, parent_tags)


def counts(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    return {
        "headings": len(soup.select("h1,h2,h3,h4,h5,h6")),
        "heading_ids": len(soup.select("h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]")),
        "code_blocks": len(soup.select("pre")),
        "tables": len(soup.select("table")),
        "callouts": len(soup.select("aside")),
        "lists": len(soup.select("ul,ol")),
        "images": len(soup.select("img")),
        "details": len(soup.select("details")),
        "iframes": len(soup.select("iframe")),
        "embeds": len(soup.select(".embed-block")),
    }


def convert(chapter: dict) -> str:
    html = chapter["body_html"]
    if not isinstance(html, str) or not html.strip():
        raise ValueError(f"Empty body_html for chapter {chapter['id']}")
    content = FaithfulMarkdown(
        heading_style="ATX", bullets="-", strong_em_symbol="*",
        escape_underscores=False, strip_pre=None,
    ).convert(html).strip() + "\n"
    source = BeautifulSoup(html, "html.parser")
    for heading in source.select("h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]"):
        if f'id="{heading["id"]}"' not in content:
            raise ValueError(f"Missing heading ID in chapter {chapter['id']}")
    for pre in source.select("pre"):
        code = (pre.find("code") or pre).get_text()
        retained_html = pre.find_parent(["aside", "details", "table"])
        if code not in content and not (retained_html and str(pre) in content):
            raise ValueError(f"Missing code in chapter {chapter['id']}")
    for embed in source.select(".embed-block"):
        if str(embed) not in content:
            raise ValueError(f"Missing embed in chapter {chapter['id']}")
    for element in source.select("[id]"):
        if f'id="{element["id"]}"' not in content:
            raise ValueError(f"Missing element ID in chapter {chapter['id']}")
    return content


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def import_one(language: str, order: int, catalog: dict, source_url: str) -> dict:
    basename = f"{order:02d}"
    raw_path = DEST / language / f"{basename}.json"
    md_path = DEST / language / f"{basename}.md"
    cached = None
    if raw_path.exists():
        try:
            cached = json.loads(raw_path.read_text("utf-8"))
        except (json.JSONDecodeError, UnicodeError):
            pass
    chapter = cached.get("chapter") if isinstance(cached, dict) else None
    if not chapter or chapter.get("id") != catalog["id"] or chapter.get("body_updated_at") != catalog["bodyUpdatedAt"]:
        raw = json.loads(request_bytes(f'https://zenn.dev/api/chapters/{catalog["id"]}'))
        chapter = raw["chapter"]
        if chapter["id"] != catalog["id"] or chapter["slug"] != catalog["slug"]:
            raise ValueError(f"API identity mismatch for {language}/{basename}")
        raw_bytes = (json.dumps(raw, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        atomic_write(raw_path, raw_bytes)
    else:
        raw_bytes = raw_path.read_bytes()
    markdown = convert(chapter)
    md_bytes = markdown.encode("utf-8")
    if not md_path.exists() or md_path.read_bytes() != md_bytes:
        atomic_write(md_path, md_bytes)
    html = chapter["body_html"]
    stats = counts(html)
    return {
        "order": order,
        "language": language,
        "id": chapter["id"],
        "slug": chapter["slug"],
        "title": chapter["title"],
        "source_url": source_url,
        "source_updated_at": chapter["body_updated_at"],
        "json": str(raw_path.relative_to(ROOT)),
        "json_bytes": len(raw_bytes),
        "json_sha256": sha(raw_bytes),
        "body_html_bytes": len(html.encode("utf-8")),
        "body_html_sha256": sha(html.encode("utf-8")),
        "markdown": str(md_path.relative_to(ROOT)),
        "markdown_bytes": len(md_bytes),
        "markdown_sha256": sha(md_bytes),
        "structure": stats,
        "conversion_caveats": [
            "Tables, callouts, embeds, and details retain source HTML inside Markdown.",
            "Syntax highlighting markup is omitted from fenced code; the raw HTML is retained in JSON.",
        ],
    }


def main() -> int:
    global DEST
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot-date", default="2026-10-03", help="new immutable snapshot date (YYYY-MM-DD)")
    parser.add_argument("--through", type=int, default=48, help="last chapter to import (default: 48)")
    args = parser.parse_args()
    if not 1 <= args.through <= 48:
        parser.error("--through must be 1..48")
    from datetime import date
    try:
        date.fromisoformat(args.snapshot_date)
    except ValueError:
        parser.error("--snapshot-date must be YYYY-MM-DD")
    DEST = ROOT / "upstream/books/pstack" / args.snapshot_date
    inventory_path = DEST / "inventory.json"
    if inventory_path.exists():
        previous = json.loads(inventory_path.read_text("utf-8"))
        if previous.get("imported_per_language") == {"ja": 48, "en": 48}:
            parser.error("complete snapshot is frozen; choose a new --snapshot-date")
    manifest = json.loads(MANIFEST.read_text("utf-8"))
    entries = manifest["chapters"]
    if len(entries) != 48 or [e["order"] for e in entries] != list(range(1, 49)):
        raise ValueError("Manifest must contain orders 1..48")
    catalogs = {
        "ja": page_chapters(entries[0]["source_ja"]),
        "en": page_chapters(entries[0]["source_en"]),
    }
    for language in ("ja", "en"):
        for entry, catalog in zip(entries, catalogs[language]):
            if catalog["position"] != entry["order"] or not entry[f"source_{language}"].endswith("/" + catalog["slug"]):
                raise ValueError(f"Catalog/manifest mismatch: {language}/{entry['order']}")
    tasks = [
        (language, entry["order"], catalogs[language][entry["order"] - 1], entry[f"source_{language}"])
        for entry in entries[:args.through] for language in ("ja", "en")
    ]
    results = []
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {executor.submit(import_one, *task): task for task in tasks}
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            print(f'{result["language"]}/{result["order"]:02d}: {result["markdown_bytes"]} markdown bytes', flush=True)
    results.sort(key=lambda item: (item["order"], item["language"]))
    inventory = {
        "source_manifest": str(MANIFEST.relative_to(ROOT)),
        "source_books": {"ja": manifest["japanese_book_url"], "en": manifest["english_book_url"]},
        "expected_per_language": 48,
        "imported_per_language": {language: sum(x["language"] == language for x in results) for language in ("ja", "en")},
        "prerequisites": ["beautifulsoup4==4.14.2", "markdownify==1.2.0"],
        "chapters": results,
    }
    atomic_write(DEST / "inventory.json", (json.dumps(inventory, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
