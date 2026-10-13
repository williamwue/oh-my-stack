"""Conservative EPUB typography inspired by the Japanese Zenn edition."""

EPUB_CSS = '''
@font-face { font-family: Book; src: url("fonts/regular.otf"); }
@font-face { font-family: Book; src: url("fonts/bold.otf"); font-weight: bold; }
@font-face { font-family: BookMono; src: url("fonts/mono.otf"); }
body { font-family: Book, sans-serif; margin: 4%; line-height: 1.8; overflow-wrap: anywhere; word-wrap: break-word; }
p { margin: 0 0 1em; orphans: 2; widows: 2; }
h1, h2, h3, h4 { line-height: 1.45; font-weight: bold; break-after: avoid; page-break-after: avoid; }
h1 { font-size: 1.65em; margin: 0 0 1.3em; }
h2 { font-size: 1.4em; margin: 1.8em 0 .9em; padding-bottom: .3em; border-bottom: 1px solid #cbd5df; }
h3 { font-size: 1.18em; margin: 1.5em 0 .7em; }
h4 { font-size: 1em; margin: 1.3em 0 .6em; }
a { color: #256b9d; text-decoration: underline; overflow-wrap: anywhere; word-wrap: break-word; }
ul, ol { padding-left: 1.5em; margin: .7em 0 1.2em; }
li { margin-bottom: .4em; }
blockquote, aside { margin: 1.2em 0; padding-left: .8em; border-left: .15em solid #94a3b8; }
blockquote p:last-child, aside p:last-child { margin-bottom: 0; }
code { font-family: BookMono, Book, monospace; font-size: .9em; overflow-wrap: anywhere; word-wrap: break-word; }
pre { font-family: BookMono, Book, monospace; font-size: .86em; line-height: 1.65;
      white-space: pre-wrap; tab-size: 2; overflow-wrap: anywhere; word-wrap: break-word;
      margin: .4em 0 1.3em; padding: .65em; background: #edf2f7; color: #223342;
      border: 0; break-inside: auto; page-break-inside: auto; }
pre code { font-size: inherit; line-height: inherit; white-space: inherit; color: inherit; }
.code-language { font-family: sans-serif; font-size: .75em; margin: 1.3em 0 .2em; break-after: avoid; }
table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: .92em; line-height: 1.55; margin: 1.2em 0; }
th, td { border: 1px solid #b8c5d1; padding: .42em .48em; text-align: left; vertical-align: top; overflow-wrap: anywhere; word-wrap: break-word; }
th { background: #edf2f7; color: #223342; font-weight: bold; }
thead { display: table-header-group; break-after: avoid; page-break-after: avoid; }
tr { break-inside: avoid; page-break-inside: avoid; }
table p { margin: 0 0 .3em; }
.table-field { margin: 0 0 .65em; }
.table-row-start { margin-top: 1.4em; }
.table-record-title { font-weight: bold; }
.table-caption { margin: 1em 0 .5em; font-weight: bold; }
figure { margin: 1.3em 0; text-align: center; }
figure img { display: inline-block; max-width: 100%; max-height: 75vh; width: auto; height: auto; object-fit: contain; }
img { max-width: 100%; height: auto; }
figcaption, .source-line, .small, .edition-navigation { font-size: .84em; line-height: 1.65; }
.source-line { margin-bottom: 1.6em; }
.diagram-reading-aid { margin: 1em 0 1.5em; }
.diagram-reading-aid h3, .diagram-reading-aid h4 { font-size: 1em; }
.diagram-reading-aid li { overflow-wrap: anywhere; word-wrap: break-word; }
.disclosure-title { font-weight: bold; margin: 1.3em 0 .4em; }
.running, .msg-symbol { display: none; }
.cover-page { margin: 0; padding: 0; text-align: center; }
.cover-image { max-width: 100%; max-height: 92vh; width: auto; height: auto; }
.title-page { padding: 2em 0; }
.edition-kicker { letter-spacing: .15em; font-size: .9em; margin-bottom: 2em; }
nav ol { list-style: none; padding-left: 1em; }
nav > ol { padding-left: 0; }
nav li { margin: .65em 0; }
@media (prefers-color-scheme: dark) {
  a { color: #83c3ee; }
  pre, th { background: #202b38; color: #e0e8ef; }
  th, td, h2 { border-color: #657789; }
}
'''
