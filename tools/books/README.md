# Book tools

The pstack ebook builder reads the reviewed Markdown editions and local diagrams.
It generates PDF and EPUB separately: PDF keeps its page layout and tables;
EPUB uses relative typography and independent unboxed labelled paragraphs,
without table or row containers spanning reader columns. It performs no upload
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
