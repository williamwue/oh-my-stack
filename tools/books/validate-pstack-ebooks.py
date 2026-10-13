#!/usr/bin/env python3
"""Independently verify packaged EPUB payloads against reviewed Markdown."""

import argparse
from collections import Counter, defaultdict
from copy import deepcopy
import hashlib
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET
import zipfile

from bs4 import BeautifulSoup, Comment, NavigableString, Tag
import mistune

ROOT = Path(__file__).resolve().parents[2]
BOOK = ROOT / "docs/books/pstack"
RENDER = mistune.create_markdown(escape=False, plugins=["table", "strikethrough"])
KANA = re.compile(r"[\u3040-\u30ff]")
FRONT = {"cover", "titlepage", "about", "nav"}


def digest(value):
    return hashlib.sha256(value).hexdigest()


def normalize_text(element):
    return re.sub(r"\s+", "", element.get_text())


def source_tree(node):
    """table-tree-v1; intentionally independent of the table transformer."""
    if isinstance(node, Comment):
        return ["comment", str(node)]
    if isinstance(node, NavigableString):
        return ["text", str(node)]
    return ["element", node.name.lower(),
            sorted([[key, value] for key, value in node.attrs.items()]),
            [source_tree(child) for child in node.contents]]


def table_hash(table):
    return digest(json.dumps(source_tree(table), ensure_ascii=False,
                             separators=(",", ":")).encode("utf-8"))


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


def _json(text):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            assert key not in result, f"duplicate policy key {key}"
            result[key] = value
        return result
    return json.loads(text, object_pairs_hook=unique)


def _load_sources(language, manifest):
    result = {}
    for chapter in manifest["chapters"]:
        order = chapter["order"]
        path = BOOK / chapter["translation_file" if language == "zh-CN" else "english_file"]
        text = path.read_text()
        match = re.search(r"<!-- book-body:start -->\n([\s\S]*?)<!-- book-body:end -->", text)
        assert match, f"{path}: missing reviewed body markers"
        result[f"ch{order:02}"] = (path, BeautifulSoup(RENDER(match[1]), "html.parser"), chapter)
    if language == "zh-CN":
        for name, path in [("glossary", BOOK / "zh-CN/GLOSSARY.md"),
                           ("image-notes", BOOK / "assets/README.md")]:
            result[name] = (path, BeautifulSoup(RENDER(path.read_text()), "html.parser"), None)
    return result


def _cells(table, table_id):
    assert not table.select("table, [rowspan], [colspan]"), f"{table_id}: nested/spanned table"
    rows = [row.find_all(["th", "td"], recursive=False) for row in table.find_all("tr")]
    assert rows and rows[0] and all(cell.name == "th" for cell in rows[0]), f"{table_id}: explicit th header required"
    assert all(len(row) == len(rows[0]) for row in rows), f"{table_id}: ragged table"
    return rows


def _policy(path, language, sources):
    policy = _json(Path(path).read_text())
    assert set(policy) == {"version", "source_snapshot", "tables"}, "unknown policy root keys"
    assert policy["version"] == 1 and policy["source_snapshot"] == "2026-10-03", "unsupported policy version/snapshot"
    assert isinstance(policy["tables"], dict), "policy tables must be object"
    inventory = {}
    for name, (_, source, _) in sources.items():
        for index, table in enumerate(source.select("table"), 1):
            inventory[f"{name}-t{index:02}"] = table
    selected = {key for key, entries in policy["tables"].items() if language in entries}
    assert selected == set(inventory), f"policy inventory differs: missing={sorted(set(inventory)-selected)}, extra={sorted(selected-set(inventory))}"
    rules = {}
    for table_id, entries in policy["tables"].items():
        assert re.fullmatch(r"(?:ch\d{2}|glossary)-t\d{2}", table_id), f"unknown table ID {table_id}"
        assert isinstance(entries, dict) and entries and set(entries) <= {"zh-CN", "en"}, f"{table_id}: unknown language"
        for lang, rule in entries.items():
            assert isinstance(rule, dict), f"{table_id}: rule must be object"
            mode = rule.get("mode")
            allowed = {"source_sha256", "mode", "reason"} | ({"key_column", "groups"} if mode == "split" else set())
            assert set(rule) == allowed, f"{table_id}: unknown/missing rule keys"
            assert mode in {"table", "records", "split"}, f"{table_id}: unknown mode"
            assert isinstance(rule["reason"], str) and rule["reason"].strip(), f"{table_id}: missing reason"
            assert re.fullmatch(r"[0-9a-f]{64}", rule["source_sha256"]), f"{table_id}: invalid source hash"
            if lang != language:
                continue
            table = inventory[table_id]
            rows = _cells(table, table_id)
            assert table_hash(table) == rule["source_sha256"], f"{table_id}: stale source hash"
            assert len(rows) > 1 or mode == "table", f"{table_id}: header-only table must stay table"
            if mode == "split":
                groups = rule["groups"]
                assert rule["key_column"] == 0 and isinstance(groups, list) and groups, f"{table_id}: invalid split key/groups"
                assert all(isinstance(g, list) and g and all(type(c) is int for c in g) for g in groups), f"{table_id}: invalid groups"
                assert [c for group in groups for c in group] == list(range(1, len(rows[0]))), f"{table_id}: split groups must be contiguous ordered non-key columns"
            rules[table_id] = rule
    return inventory, rules


def _ident(name, raw):
    if name.startswith("ch"):
        return f"c{name[2:]}-a" + digest(unquote(raw).encode())[:16]
    return raw


def _link(href, name, path, sources, selected, manifest, actual=None):
    url = urlsplit(href)
    url_map = {chapter[key]: f'ch{chapter["order"]:02}'
               for chapter in manifest["chapters"] for key in ("source_ja", "source_en")}
    base = url._replace(fragment="", query="").geturl()
    target = name if href.startswith("#") else url_map.get(base)
    if target is not None:
        fragment = unquote(url.fragment)
        ids = {unquote(item["id"]) for item in sources[target][1].select("[id]")}
        if not fragment or fragment in ids:
            if target in selected:
                return target + ".xhtml" + ("#" + _ident(target, fragment) if fragment else "")
            chapter = sources[target][2]
            return chapter["source_ja"] + ("#" + url.fragment if fragment else "")
        return href
    if not url.scheme and not url.netloc:
        local = (path.parent / unquote(url.path)).resolve()
        relative = local.relative_to(ROOT).as_posix().replace(" ", "%20")
        pattern = r"https://github\.com/williamwue/oh-my-stack/blob/[^/]+/" + re.escape(relative)
        pattern += re.escape("#" + url.fragment) if url.fragment else ""
        assert actual and re.fullmatch(pattern, actual), f"{name}: altered local link {href}: {actual}"
        return actual
    return href


def _links_match(source, actual, context, mapping):
    expected = source.select("a[href]")
    emitted = actual.select("a[href]")
    assert len(expected) == len(emitted), f"{context}: link count differs"
    for old, new in zip(expected, emitted):
        assert new["href"] == mapping(old["href"], new["href"]), f"{context}: link target changed"
        assert old.get_text() == new.get_text(), f"{context}: link label changed"


def _payload_children(element):
    def content(node):
        if isinstance(node, Comment) or (isinstance(node, Tag) and node.name == "iframe"):
            return None
        if isinstance(node, NavigableString):
            return ["text", str(node)]
        name = {"details": "section", "summary": "p"}.get(node.name, node.name)
        return ["element", name, [item for child in node.contents if (item := content(child)) is not None]]
    return [item for child in element.contents if (item := content(child)) is not None]


def _payload(source, actual, context, mapping, name, copy_index):
    assert source.get_text() == actual.get_text(), f"{context}: exact cell text differs"
    assert _payload_children(source) == _payload_children(actual), f"{context}: original cell markup differs/unmarked inline addition"
    _links_match(source, actual, context, mapping)
    old_ids = ([source["id"]] if source.has_attr("id") else []) + [item["id"] for item in source.select("[id]")]
    new_ids = ([actual["id"]] if actual.has_attr("id") else []) + [item["id"] for item in actual.select("[id]")]
    assert new_ids == ([_ident(name, raw) for raw in old_ids] if copy_index == 0 else []), f"{context}: original/repeated IDs differ"
    assert [item.get_text() for item in source.select("pre code")] == [item.get_text() for item in actual.select("pre code")], f"{context}: block code differs"
    assert copy_index == 0 or not source.select("pre"), f"{context}: repeated block-code payload"


def _table(source, doc, table_id, rule, name, mapping):
    rows = _cells(source, table_id)
    occurrences = doc.select(f'[data-table-id="{table_id}"][data-source-row]')
    roots = doc.select(f'[data-table-id="{table_id}"][data-table-mode]')
    mode = rule["mode"]
    assert roots and all(root["data-table-mode"] == mode for root in roots), f"{table_id}: incorrect layout mode"
    assert not any(item.find_parent(attrs={"data-source-row": True}) for item in occurrences), f"{table_id}: nested coordinate payload"
    if mode == "table":
        assert len(roots) == 1 and roots[0].name == "table", f"{table_id}: native table missing"
        expected = [(r, c) for r, row in enumerate(rows) for c in range(len(row))]
        _semantic_table(roots[0], [list(range(len(rows[0])))], list(range(len(rows))), table_id)
    elif mode == "split":
        panels = [(r, panel, [0] + group) for r in range(1, len(rows)) for panel, group in enumerate(rule["groups"])]
        assert len(roots) == len(panels), f"{table_id}: split panel count differs"
        expected = []
        for root, (r, panel, cols) in zip(roots, panels):
            assert root.name == "table" and root.get("data-panel") == str(panel) and root.get("data-table-row") == str(r), f"{table_id}: split row/group order differs"
            _semantic_table(root, [cols], [0, r], table_id)
            expected.extend([(0, c) for c in cols] + [(r, c) for c in cols])
    else:
        assert len(roots) == 1 and roots[0].name == "a" and not roots[0].get_text(), f"{table_id}: records marker missing"
        assert not roots[0].find_parent("table"), f"{table_id}: enclosing records table"
        expected = [(rr, c) for r in range(1, len(rows)) for c in range(len(rows[0])) for rr in (0, r)]
        for offset in range(0, len(occurrences), 2):
            pair = occurrences[offset:offset+2]
            assert len(pair) == 2, f"{table_id}: unpaired records label"
            header, value = pair
            assert header.get("data-label-for") == f'{table_id}:{value.get("data-source-row")}:{value.get("data-source-col")}', f"{table_id}: label association differs"
            field = value.find_parent(class_="table-field")
            assert field is not None and header in field.descendants, f"{table_id}: physical label/value pairing missing"
            assert field.name in {"p", "div"} and not field.find_parent("table"), f"{table_id}: boxed record"
            assert field.parent is roots[0].parent, f"{table_id}: enclosing record/row container"
            assert field.select("[data-source-row]") == pair, f"{table_id}: extra field payload"
            if value.get("data-source-col") == "0":
                assert {"table-row-start", "table-record-title"} <= set(field.get("class", [])), f"{table_id}: record title missing"
                assert value.name in {"strong", "b"} or value.find_parent(["strong", "b"]), f"{table_id}: record title not emphasized"
            remaining = deepcopy(field)
            for node in remaining.select("[data-source-row]"):
                node.decompose()
            assert re.fullmatch(r"[\s:：]*", remaining.get_text()), f"{table_id}: unmarked generated field text"
    actual = []
    copies = Counter()
    for item in occurrences:
        r, c = item.get("data-source-row"), item.get("data-source-col")
        assert r is not None and c is not None and re.fullmatch(r"0|[1-9]\d*", r) and re.fullmatch(r"0|[1-9]\d*", c), f"{table_id}: invalid coordinate"
        r, c = int(r), int(c)
        assert r < len(rows) and c < len(rows[0]), f"{table_id}: out-of-range coordinate"
        copy_index = copies[(r, c)]
        assert item.get("data-copy") == str(copy_index), f"{table_id}: copy sequence differs"
        _payload(rows[r][c], item, f"{table_id}:{r}:{c}", mapping, name, copy_index)
        copies[(r, c)] += 1
        actual.append((r, c))
    assert expected == actual, f"{table_id}: lost/duplicate payload or coordinate/reading order differs"
    return len(rows)-1


def _semantic_table(root, groups, row_indices, table_id):
    actual_rows = root.find_all("tr")
    assert len(actual_rows) == len(row_indices), f"{table_id}: semantic row count differs"
    cols = groups[0]
    for tr, r in zip(actual_rows, row_indices):
        cells = tr.find_all(["th", "td"], recursive=False)
        assert len(cells) == len(cols), f"{table_id}: semantic column count differs"
        if r == 0:
            assert tr.find_parent("thead") is not None and all(cell.name == "th" and cell.get("scope") == "col" for cell in cells), f"{table_id}: semantic column headers missing"
        else:
            assert tr.find_parent("tbody") is not None, f"{table_id}: semantic tbody missing"
        for cell, c in zip(cells, cols):
            payloads = ([cell] if cell.has_attr("data-source-row") else cell.select("[data-source-row]"))
            assert len(payloads) == 1 and payloads[0].get("data-source-row") == str(r) and payloads[0].get("data-source-col") == str(c), f"{table_id}: physical cell association differs"
            if payloads[0] is not cell:
                remaining = deepcopy(cell)
                remaining.select("[data-source-row]")[0].decompose()
                assert not remaining.get_text().strip(), f"{table_id}: unmarked text outside cell payload"


def _clean_source(source):
    source = deepcopy(source)
    for item in source.find_all(string=lambda value: isinstance(value, Comment)):
        item.extract()
    for item in source.select("iframe"):
        item.decompose()
    return source


def _clean_emitted(doc):
    result = deepcopy(doc.body or doc)
    for item in result.select(".running, .source-line, .diagram-reading-aid, .code-language, .edition-navigation"):
        item.decompose()
    for chapter in result.select(".chapter"):
        generated = chapter.find("h1", recursive=False)
        if generated:
            generated.decompose()
    return result


def _prose(source, emitted, name, mapping, inventory):
    source, emitted = _clean_source(source), _clean_emitted(emitted)
    ids = [item["id"] for item in emitted.select("[id]")]
    assert len(ids) == len(set(ids)), f"{name}: duplicate IDs"
    expected_ids = [_ident(name, item["id"]) for item in source.select("[id]")]
    assert all(ids.count(value) == 1 for value in expected_ids), f"{name}: original mapped anchor lost/duplicated"
    expected_tables = [f"{name}-t{index:02}" for index in range(1, len(source.select("table"))+1)]
    found = [item["data-table-id"] for item in emitted.select("[data-table-mode]")]
    compressed = [table_id for index, table_id in enumerate(found) if index == 0 or table_id != found[index-1]]
    assert compressed == expected_tables, f"{name}: table order/inventory differs"
    assert set(item["data-table-id"] for item in emitted.select("[data-table-id]")) == set(expected_tables), f"{name}: unknown table coordinates"
    for table_id, table in zip(expected_tables, list(source.select("table"))):
        caption = table.find("caption", recursive=False)
        if caption is not None:
            candidates = emitted.select("caption, .table-caption")
            if caption.get("id"):
                candidate = emitted.find(id=_ident(name, caption["id"]))
                candidates = [candidate] if candidate else []
            matches = [item for item in candidates if item.get_text() == caption.get_text()]
            assert len(matches) == 1, f"{table_id}: original caption differs/missing"
            _payload(caption, matches[0], table_id+":caption", mapping, name, 0)
            matches[0].decompose()
        table.replace_with(NavigableString(f"[TABLE:{table_id}]"))
        roots = emitted.select(f'[data-table-id="{table_id}"][data-table-mode]')
        roots[0].replace_with(NavigableString(f"[TABLE:{table_id}]"))
        for root in roots[1:]:
            root.decompose()
    for field in list(emitted.select(".table-field")):
        field.decompose()
    assert re.sub(r"\s+", " ", source.get_text()).strip() == re.sub(r"\s+", " ", emitted.get_text()).strip(), f"{name}: non-table prose lost/duplicated/added or table position changed"
    _links_match(source, emitted, name+":prose", mapping)
    old_headings = [(item.name, item.get_text()) for item in source.select("h1,h2,h3,h4,h5,h6")]
    new_headings = [(item.name, item.get_text()) for item in emitted.select("h1,h2,h3,h4,h5,h6")]
    if name in {"glossary", "image-notes"}:
        old_headings = [("h2" if level == "h1" else level, text) for level, text in old_headings]
    assert old_headings == new_headings, f"{name}: original headings changed"


def _mermaid_label(value):
    value = value.strip()
    if value.startswith('"'):
        assert value.endswith('"'), "unclosed Mermaid label"
        value = value[1:-1]
    assert '"' not in value, "unsupported Mermaid quote"
    import html
    return html.unescape(re.sub(r"<br\s*/?>", "", value, flags=re.I))


def _diagram_model(path):
    """Parse the frozen Mermaid subset from tokens, independently of rendering."""
    fences = re.findall(r"^```mermaid\s*\n(.*?)^```\s*$", path.read_text(), re.M | re.S)
    assert len(fences) == 1, f"{path}: expected one Mermaid fence"
    lines = [line.strip() for line in fences[0].splitlines() if line.strip()]
    assert lines, f"{path}: empty Mermaid"
    if lines[0] == "sequenceDiagram":
        participants, events, loops = {}, [], []
        for line in lines[1:]:
            declaration = re.fullmatch(r"participant (\w+) as (.+)", line)
            if declaration:
                assert declaration[1] not in participants and not events, "invalid participant declaration"
                participants[declaration[1]] = _mermaid_label(declaration[2])
                continue
            if line.startswith("loop "):
                label = _mermaid_label(line[5:])
                events.append(("loop-start", [], label, len(loops)))
                loops.append(label)
                continue
            if line == "end":
                assert loops, "unmatched Mermaid loop end"
                events.append(("loop-end", [], loops.pop(), len(loops)))
                continue
            note = re.fullmatch(r"Note over ([\w,]+): (.+)", line)
            message = re.fullmatch(r"(\w+)(-->>|->>)(\w+): (.+)", line)
            assert note or message, f"unsupported sequence syntax: {line}"
            if note:
                kind, names, label = "note", note[1].split(","), _mermaid_label(note[2])
            else:
                kind, names, label = "reply" if message[2] == "-->>" else "message", [message[1], message[3]], _mermaid_label(message[4])
            assert all(name in participants for name in names), "undeclared participant"
            events.append((kind, names, label, len(loops)))
        assert participants and not loops, "empty sequence/unclosed loop"
        return "sequence", participants, events
    assert re.fullmatch(r"(?:flowchart|graph) (?:TD|TB|LR|RL|BT)", lines[0]), "unsupported Mermaid graph"
    token = re.compile(r'\s*(?:(?P<arrow>-->(?:\|[^|]+\|)?|--\s+.+?\s+-->|-\.\s+.+?\s+\.->)|(?P<node>[A-Za-z_]\w*(?:\[(?:"[^"]*"|[^\]"]*)\]|\{(?:"[^"]*"|[^}"]*)\})?)|(?P<join>&))')
    nodes, groups, edges, stack, explicit = {}, {}, [], [], set()
    def register(text):
        match = re.fullmatch(r"([A-Za-z_]\w*)(?:[\[{](.*)[\]}])?", text)
        assert match, f"unsupported node: {text}"
        name, raw = match[1], match[2]
        if name in groups:
            assert raw is None, "group used as labelled node"
            return name
        label = _mermaid_label(raw) if raw is not None else name
        if raw is not None:
            assert name not in explicit or nodes[name] == label, "conflicting node label"
            explicit.add(name)
            nodes[name] = label
        else:
            nodes.setdefault(name, name)
        if stack and name not in groups[stack[-1]][1]:
            groups[stack[-1]][1].append(name)
        return name
    for line in lines[1:]:
        group = re.fullmatch(r"subgraph ([A-Za-z_]\w*)\[(.*)\]", line)
        if group:
            assert group[1] not in nodes and group[1] not in groups, "duplicate subgraph"
            groups[group[1]] = (_mermaid_label(group[2]), [], tuple(stack))
            stack.append(group[1])
            continue
        if line == "end":
            assert stack, "unmatched subgraph end"
            stack.pop()
            continue
        tokens, offset = [], 0
        while offset < len(line):
            match = token.match(line, offset)
            assert match, f"unsupported Mermaid syntax: {line[offset:]}"
            tokens.append((match.lastgroup, match[match.lastgroup]))
            offset = match.end()
        chunks, arrows, names, require_node = [], [], [], True
        for kind, value in tokens:
            if kind == "node":
                assert require_node, "missing node conjunction"
                names.append(register(value)); require_node = False
            elif kind == "join":
                assert names and not require_node, "invalid node conjunction"
                require_node = True
            else:
                assert names and not require_node, "arrow missing source"
                chunks.append(names); names = []; require_node = True
                if value.startswith("-->"):
                    arrows.append((_mermaid_label(value[4:-1]) if value.startswith("-->|" ) else "", "solid"))
                elif value.startswith("-."):
                    arrows.append((_mermaid_label(value[2:-3]), "dotted"))
                else:
                    arrows.append((_mermaid_label(value[2:-3]), "solid"))
        assert names and not require_node, "missing arrow target"
        chunks.append(names)
        assert len(chunks) == len(arrows)+1, "invalid arrow chain"
        for left, right, (label, style) in zip(chunks, chunks[1:], arrows):
            edges.extend((a, b, label, style) for a in left for b in right)
    assert nodes and not stack, "empty graph/unclosed subgraph"
    return "flow", nodes, groups, edges


def _diagram_aids(source, emitted, path, language, name):
    expected = []
    for original in source.select("img"):
        origin = (path.parent / unquote(original["src"])).resolve()
        if origin.suffix != ".svg" or not origin.is_relative_to((BOOK / "diagrams").resolve()):
            continue
        svg = ET.fromstring(origin.read_bytes())
        viewbox = [float(value) for value in svg.attrib["viewBox"].split()]
        assert len(viewbox) == 4 and all(value > 0 for value in viewbox[2:]), f"{name}: invalid SVG viewBox"
        width, height = viewbox[2:]
        if width >= 1000 or height >= 1000 or width/height >= 2.8 or height/width >= 2.8:
            expected.append(origin)
    aids = emitted.select(".diagram-reading-aid")
    assert len(aids) == len(expected), f"{name}: risky diagram reading aid missing/duplicated"
    for origin, aid in zip(expected, aids):
        context = f"{name}:{origin.stem}"
        assert aid.get("data-generated") == "diagram-reading-aid" and aid.get("data-diagram-source") == origin.relative_to(BOOK.resolve()).as_posix(), f"{context}: wrong diagram source association"
        figure = aid.find_previous_sibling()
        image_name = f"images/diagram-{origin.parent.name}-{origin.stem}.png"
        assert figure is not None and figure.name == "figure" and figure.find("img", src=image_name), f"{context}: aid not adjacent to original figure"
        assert figure.get("id") and aid.find("a", href="#"+figure["id"]), f"{context}: aid overview backlink differs"
        model = _diagram_model(origin.with_suffix(".md"))
        if model[0] == "sequence":
            _, participants, events = model
            actual = aid.select(".diagram-participants > li")
            assert [(item.get("data-participant-id"), item.get_text()) for item in actual] == list(participants.items()), f"{context}: participant labels/order differ"
            actual = aid.select(".diagram-events > li")
            actual_events = []
            for item in actual:
                label = item.select(".diagram-event-label")
                assert len(label) == 1, f"{context}: missing sequence event label"
                names = item.get("data-participants", "").split()
                assert [node.get_text() for node in item.select(".diagram-participant-label")] == [participants.get(participant) for participant in names], f"{context}: event endpoint label differs"
                actual_events.append((item.get("data-event-kind"), names, label[0].get_text(), item.get("data-loop-depth")))
            assert actual_events == [(kind, names, label, str(depth)) for kind, names, label, depth in events], f"{context}: sequence events/ordering differ"
            for item, (kind, names, label, _) in zip(actual, events):
                if kind.startswith("loop-"):
                    prefix = (("循环开始：" if kind == "loop-start" else "循环结束：") if language == "zh-CN" else ("Loop starts: " if kind == "loop-start" else "Loop ends: "))
                    visible = prefix+label
                elif kind == "note":
                    visible = ("说明（"+"、".join(participants[p] for p in names)+"）："+label if language == "zh-CN" else "Note over "+", ".join(participants[p] for p in names)+": "+label)
                else:
                    visible = " → ".join(participants[p] for p in names)+": "+label
                assert item.get_text() == visible, f"{context}: visible sequence event association differs"
        else:
            _, nodes, groups, edges = model
            actual = aid.select(".diagram-nodes > li")
            assert [(item.get("data-node-id"), item.get_text()) for item in actual] == list(nodes.items()), f"{context}: node labels/order differ"
            actual = aid.select(".diagram-group")
            actual_groups = []
            for item in actual:
                labels = item.select(".diagram-group-label")
                assert len(labels) == 1, f"{context}: group label missing"
                members = item.get("data-group-members", "").split()
                assert [node.get_text() for node in item.select(".diagram-node-label")] == [nodes.get(member) for member in members], f"{context}: group member labels differ"
                actual_groups.append((item.get("data-group-id"), labels[0].get_text(), members, tuple(item.get("data-parent-groups", "").split())))
            assert actual_groups == [(key, label, members, ancestors) for key, (label, members, ancestors) in groups.items()], f"{context}: subgraph membership/hierarchy differs"
            endpoints = {**nodes, **{key: value[0] for key, value in groups.items()}}
            actual_edges = []
            for item in aid.select(".diagram-relationships > li"):
                a, b = item.get("data-source-node"), item.get("data-target-node")
                assert [node.get_text() for node in item.select(".diagram-node-label")] == [endpoints.get(a), endpoints.get(b)], f"{context}: relationship endpoint labels differ"
                labels = item.select(".diagram-edge-label")
                assert len(labels) <= 1, f"{context}: duplicated relationship label"
                actual_edges.append((a, b, labels[0].get_text() if labels else "", item.get("data-edge-style")))
            assert actual_edges == edges, f"{context}: directed relationships/labels/order differ"
            for item, (a, b, label, _) in zip(aid.select(".diagram-relationships > li"), edges):
                visible = endpoints[a]+" → "+endpoints[b]
                if label:
                    visible += "（"+label+"）" if language == "zh-CN" else " ("+label+")"
                assert item.get_text() == visible, f"{context}: visible directed relationship differs"


def _navigation(language, documents, sources, selected, manifest):
    required = {f"OEBPS/{name}.xhtml" for name in ("titlepage", "about", "nav")}
    assert required <= set(documents), "missing title/about/navigation document"
    navs = documents["OEBPS/nav.xhtml"].select('nav[epub\\:type="toc"]')
    assert len(navs) == 1, "missing/duplicated packaged TOC"
    nav = navs[0]
    heading = nav.find("h1", recursive=False)
    assert heading is not None and heading.get_text() == ("目录" if language == "zh-CN" else "Contents"), "localized TOC title differs"
    root = nav.find("ol", recursive=False)
    assert root is not None, "TOC list missing"
    def read_list(listing):
        result = []
        for item in listing.find_all("li", recursive=False):
            links = item.find_all("a", recursive=False)
            labels = item.find_all("span", recursive=False)
            nested = item.find_all("ol", recursive=False)
            assert len(links)+len(labels) == 1 and len(nested) <= 1, "invalid TOC item"
            label = (links or labels)[0]
            result.append([label.get_text(" ", strip=True), label.get("href"), read_list(nested[0]) if nested else []])
        assert len(listing.find_all(recursive=False)) == len(result), "extra TOC element"
        return result
    expected = [["书名页" if language == "zh-CN" else "Title page", "titlepage.xhtml", []],
                ["关于本版" if language == "zh-CN" else "About this edition", "about.xhtml", []]]
    current = expected
    for chapter in manifest["chapters"]:
        name = f'ch{chapter["order"]:02}'
        title_en = chapter["title_en"]
        part = title_en.startswith("Part ")
        if part:
            current = expected
        if name not in selected:
            continue
        if title_en.startswith(("Appendix", "Afterword")):
            current = expected
        entry = [chapter["title_zh_cn" if language == "zh-CN" else "title_en"], name+".xhtml", []]
        current.append(entry)
        if part:
            current = entry[2]
        else:
            for index, heading in enumerate(sources[name][1].select("h2,h3"), 1):
                if heading.name == "h2":
                    anchor = _ident(name, heading["id"]) if heading.get("id") else f"{name}-section-{index}"
                    entry[2].append([heading.get_text(" ", strip=True), name+".xhtml#"+anchor, []])
    extras = [name for name in selected if not name.startswith("ch")]
    if extras:
        titles = {"glossary": "附加资料：术语表", "image-notes": "附加资料：图片文字说明"}
        expected.append(["附加资料" if language == "zh-CN" else "Supplementary material", None,
                         [[titles[name], name+".xhtml", []] for name in extras]])
    assert read_list(root) == expected, "packaged TOC labels/destinations/order/part nesting differ"


def validate(language, artifact, *, expected_documents=None, policy_path=None):
    assert language in {"zh-CN", "en"}, "unsupported language"
    artifact = Path(artifact)
    manifest = json.loads((BOOK / "source-manifest.json").read_text())
    sources = _load_sources(language, manifest)
    inventory, rules = _policy(policy_path or BOOK / "epub-table-policy.json", language, sources)
    selected = list(sources) if expected_documents is None else [f"ch{item:02}" if isinstance(item, int) else PurePosixPath(str(item)).stem for item in expected_documents]
    assert selected and len(selected) == len(set(selected)) and set(selected) <= set(sources), "invalid expected_documents"
    rows = []
    with zipfile.ZipFile(artifact) as epub:
        names = set(epub.namelist())
        assert len(names) == len(epub.namelist()), "duplicate ZIP entries"
        assert epub.namelist()[0] == "mimetype"
        assert epub.getinfo("mimetype").compress_type == zipfile.ZIP_STORED
        assert epub.read("mimetype") == b"application/epub+zip"
        documents = {}
        for name in names:
            if name.endswith((".xhtml", ".opf", ".xml")):
                ET.fromstring(epub.read(name))
            if name.endswith(".xhtml"):
                documents[name] = BeautifulSoup(epub.read(name), "html.parser")
        content_names = {PurePosixPath(name).stem for name in documents if PurePosixPath(name).stem not in FRONT}
        assert content_names == set(selected), f"EPUB document inventory differs: {sorted(content_names ^ set(selected))}"
        for name, doc in documents.items():
            ids = [item["id"] for item in doc.select("[id]")]
            assert len(ids) == len(set(ids)), f"{name}: duplicate IDs"
            assert not doc.select(".table-record, .reflow-table, .code-line"), f"{name}: browser/boxed table classes remain"
            for element in doc.select("[href], [src]"):
                for attribute in ("href", "src"):
                    if not element.has_attr(attribute):
                        continue
                    value = element[attribute]
                    url = urlsplit(value)
                    if url.scheme or url.netloc:
                        continue
                    destination = posixpath.normpath(str(PurePosixPath(name).parent / unquote(url.path))) if url.path else name
                    assert destination in names, f"{name}: missing resource {value}"
                    if url.fragment:
                        assert destination in documents and documents[destination].find(id=unquote(url.fragment)), f"{name}: missing anchor {value}"
        css = epub.read("OEBPS/book.css").decode()
        assert not re.search(r"(?:^|[;{])\s*(?:position\s*:\s*(?:absolute|fixed)|height\s*:\s*\d|bookmark-level\s*:|string-set\s*:)|@page", css)
        assert not re.search(r"\d(?:pt|mm)\b", css), "EPUB inherits fixed PDF dimensions"
        opf = ET.fromstring(epub.read("OEBPS/content.opf"))
        ns = {"opf": "http://www.idpf.org/2007/opf"}
        hrefs = {item.attrib["id"]: PurePosixPath(item.attrib["href"]).stem for item in opf.findall("opf:manifest/opf:item", ns)}
        spine = [hrefs[item.attrib["idref"]] for item in opf.findall("opf:spine/opf:itemref", ns)]
        assert [name for name in spine if name not in FRONT] == selected, "spine reading order differs"
        _navigation(language, documents, sources, selected, manifest)
        for name in selected:
            path, source, chapter = sources[name]
            emitted = documents[f"OEBPS/{name}.xhtml"]
            mapping = lambda href, actual: _link(href, name, path, sources, set(selected), manifest, actual)
            actual_code = [item.get_text() for item in emitted.select("pre code")]
            assert [item.get_text() for item in source.select("pre code")] == actual_code, f"{name}: code differs from reviewed edition"
            table_rows = 0
            for index, table in enumerate(source.select("table"), 1):
                table_id = f"{name}-t{index:02}"
                table_rows += _table(table, emitted, table_id, rules[table_id], name, mapping)
            original_images = source.select("img")
            actual_images = _clean_emitted(emitted).select("img")
            assert len(original_images) == len(actual_images), f"{name}: original image count differs"
            for original, image in zip(original_images, actual_images):
                origin = (path.parent / unquote(original["src"])).resolve()
                expected = f"diagram-{origin.parent.name}-{origin.stem}.png" if origin.suffix == ".svg" else origin.name
                assert image.get("src") == "images/"+expected, f"{name}: original image link differs"
            _diagram_aids(source, emitted, path, language, name)
            _prose(source, emitted, name, mapping, inventory)
            if language == "zh-CN" and chapter:
                assert not any(KANA.search(explanatory_comment(line)) for block in actual_code for line in block.splitlines()), f"{name}: untranslated Japanese comment"
                original = BeautifulSoup(RENDER((ROOT / chapter["source_snapshot"]["ja_file"]).read_text()), "html.parser")
                original_comments = {explanatory_comment(line).strip() for block in original.select("pre code") for line in block.get_text().splitlines() if re.search(r"[\u4e00-\u9fff]", explanatory_comment(line))}
                actual_comments = {explanatory_comment(line).strip() for block in actual_code for line in block.splitlines() if explanatory_comment(line).strip()}
                assert not original_comments.intersection(actual_comments), f"{name}: original Japanese comment remains (including Kanji-only text)"
            rows.append({"order": chapter["order"] if chapter else name, "edition_file": path.relative_to(ROOT).as_posix(), "edition_sha256": digest(path.read_bytes()), "code_blocks": len(actual_code), "images": len(actual_images), "diagram_reading_aids": len(emitted.select(".diagram-reading-aid")), "tables": len(source.select("table")), "table_rows": table_rows, "blocks_with_kana": sum(bool(KANA.search(block)) for block in actual_code)})
    return {"language": language, "epub_sha256": digest(artifact.read_bytes()), "chapters": rows,
            "total_code_blocks": sum(row["code_blocks"] for row in rows), "total_diagram_reading_aids": sum(row["diagram_reading_aids"] for row in rows), "navigation": "passed", "total_tables": sum(row["tables"] for row in rows), "total_table_rows": sum(row["table_rows"] for row in rows), "remaining_blocks_with_kana": sum(row["blocks_with_kana"] for row in rows), "xml_resources_links_code_and_reading_order": "passed", "rendering": "not assessed"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--language", choices=["zh-CN", "en"], required=True)
    parser.add_argument("--epub", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--expected-documents", nargs="+")
    parser.add_argument("--policy", type=Path)
    args = parser.parse_args()
    result = validate(args.language, args.epub or ROOT / f"output/epub/pstack-{args.language}.epub", expected_documents=args.expected_documents, policy_path=args.policy)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({key: value for key, value in result.items() if key != "chapters"}, ensure_ascii=False))
