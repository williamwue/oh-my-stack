"""Readable text companions for the frozen book's large Mermaid overviews.

This deliberately recognizes the inventoried Mermaid subset, rather than
guessing at unfamiliar syntax. It never writes or changes an image asset.
"""

from __future__ import annotations

import html
import math
from pathlib import Path
import re

from bs4 import BeautifulSoup


_ID = r"[A-Za-z_][A-Za-z_0-9]*"
_BREAK = re.compile(r"<br\s*/?>", re.IGNORECASE)


def _label(value: str) -> str:
    value = value.strip()
    if value.startswith('"'):
        if not value.endswith('"') or len(value) < 2:
            raise ValueError("Unclosed Mermaid label quote")
        value = value[1:-1]
    if '"' in value or re.search(r"<[^>]*>", _BREAK.sub("", value)):
        raise ValueError("Unsupported Mermaid label markup or quote")
    return value


def _lines(markdown: str) -> list[str]:
    fences = re.findall(r"^```mermaid\s*\n(.*?)^```\s*$", markdown,
                        flags=re.MULTILINE | re.DOTALL)
    if len(fences) != 1:
        raise ValueError("Expected exactly one Mermaid fence")
    return [line.strip() for line in fences[0].splitlines() if line.strip()]


def _flow(lines: list[str]):
    if not re.fullmatch(r"(?:flowchart|graph) (?:TD|TB|LR|RL|BT)", lines[0]):
        raise ValueError("Unsupported flowchart direction")
    nodes, groups, edges, stack = {}, {}, [], []
    explicit = set()

    def node(line, pos):
        match = re.match(_ID, line[pos:])
        if not match:
            raise ValueError("Expected Mermaid node: " + line[pos:])
        name = match.group()
        pos += len(name)
        label = None
        if pos < len(line) and line[pos] in "[{":
            opening = line[pos]
            closing = "]" if opening == "[" else "}"
            start, pos = pos + 1, pos + 1
            quoted = False
            while pos < len(line):
                if line[pos] == '"':
                    quoted = not quoted
                elif line[pos] == closing and not quoted:
                    break
                pos += 1
            if pos == len(line) or quoted:
                raise ValueError("Unclosed Mermaid node label")
            label = _label(line[start:pos])
            pos += 1
        if name in groups:
            if label is not None:
                raise ValueError("Subgraph reused as a labelled node")
        else:
            if label is not None and name in explicit and nodes[name] != label:
                raise ValueError("Conflicting Mermaid node label: " + name)
            nodes.setdefault(name, name)
            if label is not None:
                nodes[name] = label
                explicit.add(name)
            if stack and name not in groups[stack[-1]][1]:
                groups[stack[-1]][1].append(name)
        return name, pos

    def node_set(line, pos):
        names = []
        while True:
            while pos < len(line) and line[pos].isspace():
                pos += 1
            name, pos = node(line, pos)
            names.append(name)
            while pos < len(line) and line[pos].isspace():
                pos += 1
            if pos == len(line) or line[pos] != "&":
                return names, pos
            pos += 1

    for line in lines[1:]:
        if line.startswith("subgraph "):
            match = re.fullmatch(r"subgraph (" + _ID + r")\[(.*)\]", line)
            if not match or match[1] in nodes or match[1] in groups:
                raise ValueError("Unsupported or duplicate subgraph: " + line)
            name = match[1]
            groups[name] = (_label(match[2]), [], tuple(stack))
            stack.append(name)
            continue
        if line == "end":
            if not stack:
                raise ValueError("Unmatched subgraph end")
            stack.pop()
            continue
        left, pos = node_set(line, 0)
        while pos < len(line):
            tail = line[pos:]
            arrow = re.match(r"-->(?:\|([^|]+)\|)?\s*", tail)
            style = "solid"
            if not arrow:
                arrow = re.match(r"--\s+(.+?)\s+-->\s*", tail)
            if not arrow:
                arrow = re.match(r"-\.\s+(.+?)\s+\.->\s*", tail)
                style = "dotted"
            if not arrow:
                raise ValueError("Unsupported Mermaid relationship: " + tail)
            edge_label = _label(arrow[1]) if arrow[1] else ""
            pos += len(arrow[0])
            right, pos = node_set(line, pos)
            for source in left:
                for target in right:
                    edges.append((source, target, edge_label, style))
            left = right
    if stack:
        raise ValueError("Unclosed subgraph")
    if not nodes:
        raise ValueError("Empty flowchart")
    return nodes, groups, edges


def _sequence(lines: list[str]):
    participants, events, loops = {}, [], []
    for line in lines[1:]:
        declaration = re.fullmatch(r"participant (" + _ID + r") as (.+)", line)
        if declaration:
            if events or declaration[1] in participants:
                raise ValueError("Late or duplicate sequence participant")
            participants[declaration[1]] = _label(declaration[2])
            continue
        loop = re.fullmatch(r"loop (.+)", line)
        if loop:
            label = _label(loop[1])
            events.append(("loop-start", [], label, len(loops)))
            loops.append(label)
            continue
        if line == "end":
            if not loops:
                raise ValueError("Unmatched sequence loop end")
            label = loops.pop()
            events.append(("loop-end", [], label, len(loops)))
            continue
        note = re.fullmatch(r"Note over (" + _ID + r"(?:," + _ID + r")*): (.+)", line)
        if note:
            names, label, kind = note[1].split(","), _label(note[2]), "note"
        else:
            message = re.fullmatch(r"(" + _ID + r")(->>|-->>)(" + _ID + r"): (.+)", line)
            if not message:
                raise ValueError("Unsupported sequence statement: " + line)
            names, label = [message[1], message[3]], _label(message[4])
            kind = "message" if message[2] == "->>" else "reply"
        if any(name not in participants for name in names):
            raise ValueError("Undeclared sequence participant")
        events.append((kind, names, label, len(loops)))
    if loops or not participants:
        raise ValueError("Unclosed loop or empty sequence")
    return participants, events


def _text(soup, parent, value, **attrs):
    span = soup.new_tag("span", attrs=attrs)
    for index, fragment in enumerate(_BREAK.split(value)):
        if index:
            span.append(soup.new_tag("br"))
        span.append(soup.new_string(html.unescape(fragment)))
    parent.append(span)
    return span


def _paragraph(soup, parent, value, **attrs):
    tag = soup.new_tag("p", attrs=attrs)
    tag.string = value
    parent.append(tag)
    return tag


def _aid(soup, lines, language, source, anchor):
    zh = language == "zh-CN"
    aid = soup.new_tag("div", attrs={"class": "diagram-reading-aid",
        "data-generated": "diagram-reading-aid", "data-diagram-source": source})
    title = _paragraph(soup, aid, "图示文字说明：" if zh else "Diagram reading aid: ")
    link = soup.new_tag("a", href="#" + anchor)
    link.string = "返回原图" if zh else "Back to overview"
    title.append(link)
    if lines[0] == "sequenceDiagram":
        participants, events = _sequence(lines)
        _paragraph(soup, aid, "参与者" if zh else "Participants")
        listing = soup.new_tag("ol", attrs={"class": "diagram-participants"})
        aid.append(listing)
        for name, label in participants.items():
            item = soup.new_tag("li", attrs={"data-participant-id": name})
            _text(soup, item, label, **{"class": "diagram-participant-label"})
            listing.append(item)
        _paragraph(soup, aid, "按顺序的消息与说明" if zh else "Messages and notes in order")
        listing = soup.new_tag("ol", attrs={"class": "diagram-events"})
        aid.append(listing)
        for kind, names, label, depth in events:
            item = soup.new_tag("li", attrs={"data-event-kind": kind,
                "data-loop-depth": str(depth)})
            if kind.startswith("loop-"):
                item.append(("循环开始：" if kind == "loop-start" else "循环结束：") if zh
                            else ("Loop starts: " if kind == "loop-start" else "Loop ends: "))
            else:
                if kind == "note":
                    item.append("说明（" if zh else "Note over ")
                for index, name in enumerate(names):
                    if index:
                        item.append("、" if kind == "note" and zh else
                                    ", " if kind == "note" else " → ")
                    _text(soup, item, participants[name], **{"class": "diagram-participant-label"})
                item.append("）：" if zh and kind == "note" else ": ")
                item["data-participants"] = " ".join(names)
            _text(soup, item, label, **{"class": "diagram-event-label"})
            listing.append(item)
    elif re.match(r"(?:flowchart|graph)\b", lines[0]):
        nodes, groups, edges = _flow(lines)
        _paragraph(soup, aid, "节点" if zh else "Nodes")
        listing = soup.new_tag("ol", attrs={"class": "diagram-nodes"})
        aid.append(listing)
        for name, label in nodes.items():
            item = soup.new_tag("li", attrs={"data-node-id": name})
            _text(soup, item, label, **{"class": "diagram-node-label"})
            listing.append(item)
        for name, (label, members, ancestors) in groups.items():
            group = soup.new_tag("p", attrs={"class": "diagram-group", "data-group-id": name,
                "data-group-members": " ".join(members), "data-parent-groups": " ".join(ancestors)})
            group.append("分组：" if zh else "Group: ")
            _text(soup, group, label, **{"class": "diagram-group-label"})
            group.append(" — ")
            for index, member in enumerate(members):
                if index:
                    group.append("；" if zh else "; ")
                _text(soup, group, nodes[member], **{"class": "diagram-node-label"})
            aid.append(group)
        labels = {**nodes, **{name: group[0] for name, group in groups.items()}}
        _paragraph(soup, aid, "有向关系" if zh else "Directed relationships")
        listing = soup.new_tag("ol", attrs={"class": "diagram-relationships"})
        aid.append(listing)
        for source_node, target_node, label, style in edges:
            item = soup.new_tag("li", attrs={"data-source-node": source_node,
                "data-target-node": target_node, "data-edge-style": style})
            _text(soup, item, labels[source_node], **{"class": "diagram-node-label"})
            item.append(" → ")
            _text(soup, item, labels[target_node], **{"class": "diagram-node-label"})
            if label:
                item.append("（" if zh else " (")
                _text(soup, item, label, **{"class": "diagram-edge-label"})
                item.append("）" if zh else ")")
            listing.append(item)
    else:
        raise ValueError("Unsupported Mermaid diagram type: " + lines[0])
    return aid


def prepare_diagram_reading_aids(content: str, *, book_dir: Path, language: str) -> str:
    """Append semantic companions to risky prepared figures; return HTML only.

    Small figures return unchanged. A selected figure must have a trusted paired
    Mermaid source and the entire source must parse, or the build fails closed.
    Generated content is identified for independent prose/code validation.
    """
    if language not in {"zh-CN", "en"}:
        raise ValueError("Unsupported reading-aid language")
    soup = BeautifulSoup(content, "html.parser")
    changed = False
    for figure in soup.select("figure[data-w]"):
        try:
            width, height = float(figure["data-w"]), float(figure["data-h"])
        except (KeyError, ValueError) as error:
            raise ValueError("Invalid diagram dimensions") from error
        if not all(math.isfinite(value) and value > 0 for value in (width, height)):
            raise ValueError("Invalid diagram dimensions")
        if not (width >= 1000 or height >= 1000 or width / height >= 2.8 or height / width >= 2.8):
            continue
        image = figure.find("img", attrs={"data-original": True})
        if image is None or not image["data-original"].startswith("diagrams/"):
            continue
        source = image["data-original"]
        match = re.fullmatch(r"diagrams/" + re.escape(language) + r"/(\d{2}-\d{2})\.svg", source)
        if not match:
            raise ValueError("Invalid paired diagram source: " + source)
        source_path = Path(book_dir) / Path(source).with_suffix(".md")
        lines = _lines(source_path.read_text(encoding="utf-8"))
        if not lines:
            raise ValueError("Empty Mermaid fence")
        anchor = figure.get("id") or "diagram-" + match[1]
        if not figure.get("id") and soup.find(id=anchor) is not None:
            raise ValueError("Diagram overview anchor collision: " + anchor)
        aid = _aid(soup, lines, language, source, anchor)
        adjacent = figure.find_next_sibling()
        if adjacent is not None and adjacent.get("data-generated") == "diagram-reading-aid":
            if adjacent.get("data-diagram-source") != source:
                raise ValueError("Mismatched existing diagram reading aid")
            continue
        figure["id"] = anchor
        figure.insert_after(aid)
        changed = True
    return str(soup) if changed else content
