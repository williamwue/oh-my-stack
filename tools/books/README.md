# Book tools

The pstack ebook builder reads the reviewed Markdown editions and local diagrams.
It generates PDF and EPUB separately: PDF keeps its page layout and tables;
EPUB uses relative typography and an explicit source-bound table policy:
compact semantic tables, row-major split comparisons, and unboxed labelled
records for long explanations. Large diagrams retain their overview and gain
scalable text companions. It performs no upload
or publication.

## Local environment

```sh
npm ci
uv venv .tmp/ebook-venv
uv pip install --python .tmp/ebook-venv/bin/python -r tools/books/ebook-requirements.txt
```

WeasyPrint also requires the native Pango/GLib libraries. On this macOS workspace,
the existing Homebrew libraries are under `/opt/homebrew/lib`; pass
`DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib` to the Python build command.

Supply the full Noto CJK font files and their SIL Open Font License in
`.tmp/ebook-assets/`, or select another directory with `--assets`:

- `NotoSansCJKsc-Regular.otf`
- `NotoSansCJKsc-Bold.otf`
- `NotoSansMonoCJKsc-Regular.otf`
- `OFL.txt`

The upstream font project is [Noto CJK](https://github.com/notofonts/noto-cjk).
Full fonts are build inputs; each ebook includes a subset and the font license.
The builder does not download fonts or operate any provider credentials.

## Build and verify

```sh
DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib .tmp/ebook-venv/bin/python tools/books/build-pstack-ebooks.py --language zh-CN
DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib .tmp/ebook-venv/bin/python tools/books/build-pstack-ebooks.py --language en --format epub
.tmp/ebook-venv/bin/python tests/ebook-layout.test.py
.tmp/ebook-venv/bin/python tests/epub-tables.test.py
.tmp/ebook-venv/bin/python tests/epub-validation.test.py
.tmp/ebook-venv/bin/python tests/epub-media.test.py
.tmp/ebook-venv/bin/python tests/epub-publication.test.py
.tmp/ebook-venv/bin/python tests/pstack-book-audit.test.py
.tmp/ebook-venv/bin/python tests/ebook-paths.test.py
.tmp/ebook-venv/bin/python tools/books/audit-source.py
.tmp/ebook-venv/bin/python tools/books/validate-pstack-ebooks.py --language zh-CN
.tmp/ebook-venv/bin/python tools/books/validate-pstack-ebooks.py --language en
```

The default build produces both formats for the selected languages. `--format
epub` only updates the EPUB output. Source manifests and review hashes must pass
the complete book check before generation. Run EPUBCheck 5.4.0 separately on
each resulting EPUB, inspect the rendered output, then refresh
a new dated `output/ebook-mainline-validation-YYYY-MM-DD.json` and
`output/SHA256SUMS.txt`. Preserve `output/ebooks-validation.json` as historical
evidence; do not overwrite it with new build results.

Chinese natural-language code changes have per-block deviations and a
supplemental receipt in `reviews/ebook-comment-translations.json`. Original
translator receipts retain their historical hashes. The source audit compares
every changed code block with its specific before/after hashes; unrelated code
changes still fail even when a body hash is refreshed.

File validity, text preservation, and local rendering are separate from actual
reader compatibility. Before publishing a reader compatibility claim, import
the resulting EPUB into the named reader and verify the reported page at its
default and enlarged font sizes.

## EPUB sample and visual QA

Use `--format epub --sample --language zh-CN` to write
`output/epub/pstack-zh-CN-sample.epub` without replacing the full edition. It
contains the representative table, code and diagram chapters. Validate it with
`--expected-documents ch04 ch13 ch20 ch22 ch27 ch28 ch29 ch31 ch38 ch40 ch45 glossary image-notes`
and the explicit `--epub` path. Full source-policy coverage is checked even for samples.

For the local paginated reader:

```sh
npm install --prefix .tmp/epub-reading-20261013/reader-deps epubjs@0.3.93 jszip@3.10.1
python3 tools/books/preview-pstack-epub.py
```

Open `http://127.0.0.1:8974/`. It serves only the allowlisted EPUBs and pinned
viewer assets on loopback. Reader JavaScript is not included in the books.
[The 2026-10-13 reading edition record](../../docs/books/pstack/reading-edition/README.md)
documents source preservation, actual reader screenshots and remaining acceptance boundaries.
