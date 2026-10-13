# The pstack book by kaito

This directory hosts the author's English edition and Oh My Stack's Simplified
Chinese translation of kaito's
book about building an environment for development with AI agents.
The maintainer reports the author's verbal permission to publish Chinese and
English editions; see the [authorization record](AUTHORIZATION.md).

## Editions

- [Simplified Chinese translation](zh-CN/README.md): all 48 translated entries with AI review records.
- [English edition](en/README.md): all 48 entries, imported from the author’s edition.
- [Japanese original](https://zenn.dev/sc30gsw/books/080faba713547b): primary translation source.
- [Oh My Stack companion](companion/README.md): project-specific workflows and runtime boundaries.
- [Translation standards](TRANSLATION.md) and [maintenance workflow](MAINTENANCE.md).

## PDF and EPUB

The ebooks preserve the October 3, 2026 snapshot with all 48 entries, expanded code examples, and bundled
diagrams. PDFs include a linked contents page and bookmarks; EPUBs support
reflowable text and include fonts for offline reading.

The [2026-10-13 reading edition](https://github.com/williamwue/oh-my-stack/releases/tag/pstack-book-2026-10-13)
provides both full EPUBs, a Chinese sample, both PDFs, SHA-256 checksums and validation records.

| Edition | PDF | EPUB |
| --- | --- | --- |
| Simplified Chinese | [542 pages](../../../output/pdf/pstack-zh-CN.pdf) | [Download EPUB](../../../output/epub/pstack-zh-CN.epub) |
| Author's English | [622 pages](../../../output/pdf/pstack-en.pdf) | [Download EPUB](../../../output/epub/pstack-en.epub) |

The October 13 EPUBs restore the original cover and reading hierarchy. Short
tables retain column comparisons, wide tables split in row order, and long tables
use labelled entries. Large diagrams include scalable text descriptions. The
Chinese sample contains representative layout chapters. Both PDFs retain their
October 7 bytes. The October 3 release remains historical; its Chinese PDF has
538 pages. The current Chinese PDF has 542 pages.

All three EPUBs passed EPUBCheck 5.4.0 with no errors or warnings. The Chinese
PDF passed text-boundary checks and representative visual inspection; the
English PDF retains its historical bytes and validation. Native ebook reader
testing, including reimporting the corrected file into WeChat Read, was deferred
by the maintainer for this run. Human editorial review of the Chinese
translation also remains pending.
See the [ebook notes and checksums](../../../output/README.md) and
[reading edition acceptance record](reading-edition/README.md).

## Source and attribution

The source has 39 numbered chapters and 48 table-of-contents entries, including
the preface, part introductions, appendix, and afterword. The
[source manifest](source-manifest.json) records both language URLs and the
translation status for each entry. All 96 Japanese and English source bodies
are archived in the [2026-10-03 snapshot](../../../upstream/books/pstack/2026-10-03/inventory.json).
Translation, automated comparison, independent review, and human review are
recorded separately.

The book discusses Cursor pstack 0.15.5. Oh My Stack's host-specific behavior
is described in the project's own documentation. Project notes in translations
are explicitly labeled and are separate from the author's text.

The book and its translation are separately attributed material. The MIT
license covering the pstack plugin and Oh My Stack does not assign an MIT
license to this book. See [AUTHORIZATION.md](AUTHORIZATION.md) for the reported
permission and its documented limits.
