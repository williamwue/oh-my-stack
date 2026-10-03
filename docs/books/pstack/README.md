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

The 2026-10-03 ebooks contain all 48 entries, expanded code examples, and bundled
diagrams. PDFs include a linked contents page and bookmarks; EPUBs support
reflowable text and include fonts for offline reading.

The [2026-10-03 ebook release](https://github.com/williamwue/oh-my-stack/releases/tag/pstack-book-2026-10-03)
provides all four files and SHA-256 checksums as downloadable attachments.

| Edition | PDF | EPUB |
| --- | --- | --- |
| Simplified Chinese | [538 pages](../../../output/pdf/pstack-zh-CN.pdf) | [Download EPUB](../../../output/epub/pstack-zh-CN.epub) |
| Author's English | [622 pages](../../../output/pdf/pstack-en.pdf) | [Download EPUB](../../../output/epub/pstack-en.epub) |

Both EPUBs passed EPUBCheck 5.4.0 with no errors or warnings. The PDFs passed
text-boundary checks and representative visual inspection. Native ebook reader
testing and human editorial review of the Chinese translation remain pending.
See the [ebook notes and checksums](../../../output/README.md).

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
