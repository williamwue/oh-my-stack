"""Prepare reflowable book content without depending on reader table layout."""

from copy import deepcopy

from bs4 import BeautifulSoup


EPUB_CSS = '''
@font-face { font-family: Book; src: url("fonts/regular.otf"); }
@font-face { font-family: Book; src: url("fonts/bold.otf"); font-weight: bold; }
@font-face { font-family: BookMono; src: url("fonts/mono.otf"); }
body { font-family: Book, sans-serif; margin: 5%; line-height: 1.7; }
p { margin: 0 0 1em; }
h1, h2, h3, h4 { line-height: 1.4; margin: 1.5em 0 .8em; }
h1 { font-size: 1.7em; }
h2 { font-size: 1.4em; }
h3 { font-size: 1.15em; }
a, code { overflow-wrap: anywhere; word-wrap: break-word; }
ul, ol { padding-left: 1.5em; }
li { margin-bottom: .5em; }
blockquote, aside { margin: 1em 0; padding-left: 1em; border-left: .15em solid; }
code { font-family: BookMono, Book, monospace; font-size: .9em; }
pre { font-family: BookMono, Book, monospace; font-size: .85em;
      line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere;
      word-wrap: break-word; margin: 1em 0; padding: .7em; border: thin solid; }
pre code { font-size: inherit; line-height: inherit; white-space: inherit; }
.table-field { margin: 0 0 .7em; }
.table-row-start { margin-top: 1.4em; }
figure { margin: 1em 0; }
img { max-width: 100%; height: auto; }
figcaption, .source-line, .small { font-size: .85em; }
.source-line { margin-bottom: 1.5em; }
.running, .msg-symbol { display: none; }
.cover-image { width: 100%; height: auto; }
'''


def reflow_tables(content):
    """Express each data row as labelled paragraphs, preserving cell markup.

    Labels are real text so a reading system that discards author CSS still
    keeps column associations. Unsupported merged/nested tables fail the build
    rather than silently dropping data or attaching the wrong column label.
    """
    soup = BeautifulSoup(content, "html.parser")
    for table_index, table in enumerate(list(soup.select("table"))):
        if table.select("table, [rowspan], [colspan]"):
            raise ValueError("EPUB table has nested or merged cells; review its reading order")
        rows = table.find_all("tr")
        if not rows:
            raise ValueError("EPUB table has no rows")
        header = rows[0].find_all(["th", "td"], recursive=False)
        if not header or not all(cell.name == "th" for cell in header):
            raise ValueError("EPUB table requires an explicit column header row")
        labels = [cell.get_text(" ", strip=True) for cell in header]
        if any(not label for label in labels[1:]):
            raise ValueError("EPUB table has an empty data column label")
        # This temporary fragment is unwrapped below. Reader columns must not
        # fragment an enclosing table/row box across subsequent paragraphs.
        replacement = soup.new_tag("div")
        if table.get("id"):
            replacement.append(soup.new_tag("a", attrs={"id": table["id"]}))
        caption = table.find("caption", recursive=False)
        if caption:
            caption.name = "p"
            replacement.append(caption.extract())
        for row_index, row in enumerate(rows[1:]):
            cells = row.find_all(["th", "td"], recursive=False)
            if len(cells) != len(labels):
                raise ValueError("EPUB table row does not match its column headers")
            if row.get("id"):
                replacement.append(soup.new_tag("a", attrs={"id": row["id"]}))
            for column_index, (label, header_cell, cell) in enumerate(zip(labels, header, cells)):
                blocks = cell.find(["p", "pre", "ul", "ol", "blockquote", "div"])
                classes = "table-field table-row-start" if column_index == 0 else "table-field"
                field = soup.new_tag("div" if blocks else "p", attrs={
                    "class": classes, "data-table": str(table_index),
                    "data-table-row": f"{table_index}:{row_index}",
                })
                if cell.get("id"):
                    field["id"] = cell["id"]
                strong = soup.new_tag("strong")
                if label:
                    for child in header_cell.contents:
                        strong.append(deepcopy(child))
                    strong.append(": ")
                if blocks:
                    label_line = soup.new_tag("p")
                    label_line.append(strong)
                    field.append(label_line)
                elif label:
                    field.append(strong)
                for child in list(cell.contents):
                    field.append(child.extract())
                replacement.append(field)
        table.replace_with(*list(replacement.contents))
    for element in soup.select(".code-line"):
        classes = [name for name in element.get("class", []) if name != "code-line"]
        if classes:
            element["class"] = classes
        else:
            del element["class"]
    return str(soup)
