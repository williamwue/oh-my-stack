#!/usr/bin/env python3
"""Independent ZIP-level acceptance and mutation tests; no builder imports."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("epub_validator", ROOT / "tools/books/validate-pstack-ebooks.py")
V = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(V)

BODY = '''<h2 id="section">Original heading</h2>
<p>Intro <a href="https://example.org/intro">original link</a>.</p>
<table id="original-table"><thead><tr><th id="key">Key</th><th><a href="https://example.org/header">Value</a></th><th>Extra</th></tr></thead>
<tbody><tr id="first-row"><td id="first-key"><em>One</em></td><td><a href="https://example.org/one">First</a></td><td>Alpha</td></tr>
<tr><td>Two</td><td>Second</td><td>Beta</td></tr></tbody></table>
<p>After the table. Every sentence stays.</p>
<pre><code>print("a  b")\n\treturn 1\n</code></pre>
<p><img src="images/example.png" alt="Original image"/></p>
'''


class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.old_root, self.old_book = V.ROOT, V.BOOK
        V.ROOT, V.BOOK = self.root, self.root / "docs/books/pstack"
        V.BOOK.mkdir(parents=True)
        (V.BOOK / "en").mkdir()
        self.chapters = []
        for order in (1, 2):
            file = f"en/{order:02}.md"
            (V.BOOK / file).write_text("<!-- book-body:start -->\n" + BODY + "<!-- book-body:end -->")
            self.chapters.append({"order": order, "english_file": file, "translation_file": file,
                                  "title_en": f"Chapter {order}", "title_zh_cn": f"章节 {order}",
                                  "source_ja": f"https://zenn.dev/book/ja/{order}", "source_en": f"https://zenn.dev/book/en/{order}"})
        (V.BOOK / "source-manifest.json").write_text(json.dumps({"chapters": self.chapters}))
        self.source = BeautifulSoup(V.RENDER(BODY), "html.parser")
        self.policy_path = V.BOOK / "epub-table-policy.json"
        self.policy = {"version": 1, "source_snapshot": "2026-10-03", "tables": {
            f"ch{order:02}-t01": {"en": {"source_sha256": V.table_hash(self.source.table), "mode": "table", "reason": "Small comparison"}}
            for order in (1, 2)}}
        self.write_policy()

    def tearDown(self):
        V.ROOT, V.BOOK = self.old_root, self.old_book
        self.tmp.cleanup()

    def write_policy(self):
        self.policy_path.write_text(json.dumps(self.policy))

    def payload(self, r, c, copy_index, counts, soup, label_for=None, tag="span"):
        cell = self.source.table.find_all("tr")[r].find_all(["th", "td"], recursive=False)[c]
        node = soup.new_tag(tag)
        for child in cell.contents:
            node.append(deepcopy(child))
        if copy_index == 0:
            if cell.get("id"):
                node["id"] = V._ident("ch01", cell["id"])
            for item in node.select("[id]"):
                item["id"] = V._ident("ch01", item["id"])
        else:
            for item in node.select("[id]"):
                del item["id"]
        node.attrs.update({"data-table-id": "ch01-t01", "data-source-row": str(r), "data-source-col": str(c), "data-copy": str(copy_index)})
        if label_for:
            node["data-label-for"] = label_for
        counts[(r, c)] = copy_index + 1
        return node

    def document(self, mode="table"):
        soup = BeautifulSoup(str(self.source), "html.parser")
        for item in soup.select("[id]"):
            item["id"] = V._ident("ch01", item["id"])
        for image in soup.select("img"):
            origin = Path(image["src"])
            image["src"] = "images/diagram-en-"+origin.stem+".png" if origin.suffix == ".svg" else "images/example.png"
        holder = soup.new_tag("div")
        counts = {}
        if mode in {"table", "split"}:
            panels = [(None, None, [0, 1, 2], [0, 1, 2])] if mode == "table" else [(r, p, [0]+cols, [0, r]) for r in (1, 2) for p, cols in enumerate([[1], [2]])]
            for r, panel, cols, row_indices in panels:
                table = soup.new_tag("table", attrs={"data-table-id": "ch01-t01", "data-table-mode": mode})
                if mode == "split":
                    table["data-table-row"], table["data-panel"] = str(r), str(panel)
                else:
                    table["id"] = V._ident("ch01", "original-table")
                for rr in row_indices:
                    group = soup.new_tag("thead" if rr == 0 else "tbody")
                    tr = soup.new_tag("tr")
                    if rr == 1 and (mode == "table" or panel == 0):
                        tr["id"] = V._ident("ch01", "first-row")
                    for c in cols:
                        node = self.payload(rr, c, counts.get((rr, c), 0), counts, soup, tag="th" if rr == 0 else "td")
                        if rr == 0:
                            node["scope"] = "col"
                        tr.append(node)
                    group.append(tr)
                    table.append(group)
                holder.append(table)
            if mode == "split":
                holder.insert(0, soup.new_tag("a", id=V._ident("ch01", "original-table")))
        else:
            holder.append(soup.new_tag("a", attrs={"data-table-id": "ch01-t01", "data-table-mode": "records", "id": V._ident("ch01", "original-table")}))
            for r in (1, 2):
                if r == 1:
                    holder.append(soup.new_tag("a", id=V._ident("ch01", "first-row")))
                for c in (0, 1, 2):
                    field = soup.new_tag("p", attrs={"class": "table-field table-row-start table-record-title" if c == 0 else "table-field"})
                    header = self.payload(0, c, counts.get((0, c), 0), counts, soup, f"ch01-t01:{r}:{c}")
                    value = self.payload(r, c, counts.get((r, c), 0), counts, soup)
                    field.append(header)
                    field.append(": ")
                    if c == 0:
                        strong = soup.new_tag("strong")
                        strong.append(value)
                        field.append(strong)
                    else:
                        field.append(value)
                    holder.append(field)
        if self.source.table.caption:
            caption = deepcopy(self.source.table.caption)
            if caption.get("id"):
                caption["id"] = V._ident("ch01", caption["id"])
            for item in caption.select("[id]"):
                item["id"] = V._ident("ch01", item["id"])
            if mode == "table":
                holder.table.insert(0, caption)
            else:
                caption.name = "p"
                caption["class"] = "table-caption"
                holder.insert(0, caption)
        soup.table.replace_with(*list(holder.contents))
        return BeautifulSoup('<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Fixture</title></head><body><section class="chapter" id="ch01"><h1>Generated title</h1><p class="running">Generated running</p><p class="source-line">Generated provenance</p>' + str(soup) + '</section></body></html>', "html.parser")

    def nav(self):
        return BeautifulSoup('<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><h1>Contents</h1><ol><li><a href="titlepage.xhtml">Title page</a></li><li><a href="about.xhtml">About this edition</a></li><li><a href="ch01.xhtml">Chapter 1</a><ol><li><a href="ch01.xhtml#'+V._ident("ch01", "section")+'">Original heading</a></li></ol></li></ol></nav></body></html>', "html.parser")

    def package(self, document, nav=None):
        artifact = self.root / "fixture.epub"
        with zipfile.ZipFile(artifact, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
            z.writestr("META-INF/container.xml", '<container/>')
            z.writestr("OEBPS/ch01.xhtml", str(document))
            z.writestr("OEBPS/nav.xhtml", str(nav if nav is not None else self.nav()))
            for name in ("titlepage", "about"):
                z.writestr("OEBPS/"+name+".xhtml", '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Front matter</h1></body></html>')
            for image in document.select("img"):
                if image.get("src", "").startswith("images/diagram-"):
                    z.writestr("OEBPS/"+image["src"], b"diagram fixture")
            z.writestr("OEBPS/book.css", "body {line-height:1.8;} table {width:100%;table-layout:fixed;}")
            z.writestr("OEBPS/images/example.png", b"fixture image resource")
            z.writestr("OEBPS/content.opf", '<package xmlns="http://www.idpf.org/2007/opf"><manifest><item id="chapter" href="ch01.xhtml"/></manifest><spine><itemref idref="chapter"/></spine></package>')
        return artifact

    def validate(self, document):
        return V.validate("en", self.package(document), expected_documents=["ch01"], policy_path=self.policy_path)

    def test_valid_native_split_and_records(self):
        for mode in ("table", "split", "records"):
            with self.subTest(mode=mode):
                rule = self.policy["tables"]["ch01-t01"]["en"]
                rule["mode"] = mode
                rule.pop("groups", None)
                rule.pop("key_column", None)
                if mode == "split":
                    rule.update({"key_column": 0, "groups": [[1], [2]]})
                self.write_policy()
                report = self.validate(self.document(mode))
                self.assertEqual(report["xml_resources_links_code_and_reading_order"], "passed")
                self.assertEqual(report["total_tables"], 1)
                self.assertEqual(report["total_code_blocks"], 1)
                self.assertEqual(report["rendering"], "not assessed")

    def test_sample_checks_unselected_policy_hash(self):
        self.policy["tables"]["ch02-t01"]["en"]["source_sha256"] = "0"*64
        self.write_policy()
        with self.assertRaisesRegex(AssertionError, "stale source hash"):
            self.validate(self.document())

    def test_missing_extra_and_duplicate_policy_rules(self):
        original = deepcopy(self.policy)
        for change in ("missing", "extra", "unknown"):
            with self.subTest(change=change):
                self.policy = deepcopy(original)
                if change == "missing":
                    del self.policy["tables"]["ch02-t01"]
                elif change == "extra":
                    self.policy["tables"]["ch99-t01"] = deepcopy(self.policy["tables"]["ch01-t01"])
                else:
                    self.policy["tables"]["ch01-t01"]["en"]["unreviewed"] = True
                self.write_policy()
                with self.assertRaises(AssertionError):
                    self.validate(self.document())
        self.policy_path.write_text('{"version":1,"version":1}')
        with self.assertRaisesRegex(AssertionError, "duplicate policy key"):
            self.validate(self.document())

    def test_hash_includes_markup_whitespace_attributes_and_comments(self):
        baseline = V.table_hash(self.source.table)
        for mutation in (lambda t: t.th.append(" "), lambda t: t.th.__setitem__("title", "changed"), lambda t: t.th.append(BeautifulSoup("<!--audit-->", "html.parser").contents[0])):
            modified = deepcopy(self.source.table)
            mutation(modified)
            self.assertNotEqual(baseline, V.table_hash(modified))

    def test_payload_and_prose_mutations_fail(self):
        mutations = {
            "lost payload": lambda d: d.select('[data-source-row="1"][data-source-col="1"]')[0].decompose(),
            "duplicate payload": lambda d: d.table.tbody.tr.append(deepcopy(d.select('[data-source-row="1"][data-source-col="1"]')[0])),
            "altered markup": lambda d: setattr(d.select('[data-source-row="1"][data-source-col="0"] em')[0], "name", "strong"),
            "empty inline addition": lambda d: d.select('[data-source-row="1"][data-source-col="1"]')[0].append(d.new_tag("span")),
            "altered payload": lambda d: d.select('[data-source-row="1"][data-source-col="2"]')[0].append("added"),
            "altered link": lambda d: d.select('[data-source-row="1"][data-source-col="1"] a')[0].__setitem__("href", "https://example.org/wrong"),
            "altered label": lambda d: setattr(d.select('[data-source-row="0"][data-source-col="1"] a')[0], "string", "Wrong"),
            "altered coordinates": lambda d: d.select('[data-source-row="1"][data-source-col="1"]')[0].__setitem__("data-source-col", "2"),
            "altered copy": lambda d: d.select('[data-source-row="1"][data-source-col="1"]')[0].__setitem__("data-copy", "1"),
            "code whitespace": lambda d: setattr(d.pre.code, "string", 'print("a b")\n\treturn 1\n'),
            "lost word separation": lambda d: setattr(d.find("p", string="After the table. Every sentence stays."), "string", "Afterthe table. Every sentence stays."),
            "skipped prose": lambda d: d.find("p", string="After the table. Every sentence stays.").decompose(),
            "duplicated prose": lambda d: d.section.append(deepcopy(d.find("p", string="After the table. Every sentence stays."))),
            "duplicate anchor": lambda d: d.find("h2").__setitem__("id", V._ident("ch01", "first-key")),
            "changed heading": lambda d: setattr(d.h2, "string", "Wrong heading"),
            "image missing": lambda d: d.img.decompose(),
            "image wrong": lambda d: d.img.__setitem__("src", "https://example.org/another.png"),
            "native header association": lambda d: d.th.__setitem__("scope", "row"),
        }
        for name, mutation in mutations.items():
            with self.subTest(mutation=name):
                document = self.document()
                mutation(document)
                with self.assertRaises(AssertionError):
                    self.validate(document)

    def test_records_physical_pairing_and_split_reading_order(self):
        rule = self.policy["tables"]["ch01-t01"]["en"]
        rule["mode"] = "records"
        self.write_policy()
        for mutation in (lambda d: d.select('[data-label-for="ch01-t01:1:1"]')[0].__setitem__("data-label-for", "ch01-t01:2:1"),
                         lambda d: d.select(".table-field")[2].append(d.select('[data-label-for="ch01-t01:1:1"]')[0].extract()),
                         lambda d: d.select(".table-field")[1].append("Unmarked prose")):
            document = self.document("records")
            mutation(document)
            with self.assertRaises(AssertionError):
                self.validate(document)
        rule.update({"mode": "split", "key_column": 0, "groups": [[1], [2]]})
        self.write_policy()
        document = self.document("split")
        panels = document.select('[data-table-mode="split"]')
        panels[0].insert_before(panels[2].extract())
        with self.assertRaisesRegex(AssertionError, "split row/group order"):
            self.validate(document)

    def test_caption_preserved_once_with_markup_and_links(self):
        body = BODY.replace('<thead>', '<caption id="caption"><em>Reviewed caption</em> <a href="https://example.org/caption">caption link</a></caption><thead>', 1)
        self.source = BeautifulSoup(V.RENDER(body), "html.parser")
        for chapter in self.chapters:
            (V.BOOK / chapter["english_file"]).write_text("<!-- book-body:start -->\n" + body + "<!-- book-body:end -->")
            self.policy["tables"][f'ch{chapter["order"]:02}-t01']["en"]["source_sha256"] = V.table_hash(self.source.table)
        for mode in ("table", "records", "split"):
            with self.subTest(mode=mode):
                rule = self.policy["tables"]["ch01-t01"]["en"]
                rule["mode"] = mode
                if mode == "split":
                    rule.update({"key_column": 0, "groups": [[1], [2]]})
                self.write_policy()
                self.validate(self.document(mode))
                document = self.document(mode)
                caption = document.select("caption, .table-caption")[0]
                caption.append("changed")
                with self.assertRaises(AssertionError):
                    self.validate(document)

    def install_diagram(self, mermaid, aid_body):
        folder = V.BOOK / "diagrams/en"
        folder.mkdir(parents=True)
        (folder / "01-01.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"/>')
        (folder / "01-01.md").write_text("```mermaid\n"+mermaid+"\n```\n")
        body = BODY + '<figure><img src="../diagrams/en/01-01.svg" alt="Diagram"/></figure>'
        self.source = BeautifulSoup(V.RENDER(body), "html.parser")
        for chapter in self.chapters:
            (V.BOOK / chapter["english_file"]).write_text("<!-- book-body:start -->\n" + body + "<!-- book-body:end -->")
        document = self.document()
        figure = document.select('figure')[0]
        figure["id"] = "diagram-01-01"
        aid = BeautifulSoup('<div class="diagram-reading-aid" data-generated="diagram-reading-aid" data-diagram-source="diagrams/en/01-01.svg"><p><a href="#diagram-01-01">Back to overview</a></p>'+aid_body+'</div>', "html.parser").div
        figure.insert_after(aid)
        return document

    def test_risky_flow_aid_required_and_semantically_complete(self):
        mermaid = 'flowchart TD\nsubgraph G["Group label"]\nA["First<br/>node"] -->|success| B["Second"]\nend\nB -. retry .-> A'
        aid = '''<ol class="diagram-nodes"><li data-node-id="A"><span class="diagram-node-label">First<br/>node</span></li><li data-node-id="B"><span class="diagram-node-label">Second</span></li></ol>
<p class="diagram-group" data-group-id="G" data-group-members="A B" data-parent-groups=""><span class="diagram-group-label">Group label</span><span class="diagram-node-label">First<br/>node</span><span class="diagram-node-label">Second</span></p>
<ol class="diagram-relationships"><li data-source-node="A" data-target-node="B" data-edge-style="solid"><span class="diagram-node-label">First<br/>node</span> → <span class="diagram-node-label">Second</span> (<span class="diagram-edge-label">success</span>)</li><li data-source-node="B" data-target-node="A" data-edge-style="dotted"><span class="diagram-node-label">Second</span> → <span class="diagram-node-label">First<br/>node</span> (<span class="diagram-edge-label">retry</span>)</li></ol>'''
        original = self.install_diagram(mermaid, aid)
        self.validate(original)
        mutations = {
            "missing entire aid": lambda d: d.select_one(".diagram-reading-aid").decompose(),
            "lost node": lambda d: d.select_one(".diagram-nodes > li").decompose(),
            "node label": lambda d: setattr(d.select_one(".diagram-nodes .diagram-node-label"), "string", "Changed"),
            "changed edge": lambda d: d.select_one(".diagram-relationships > li").__setitem__("data-target-node", "A"),
            "lost edge": lambda d: d.select_one(".diagram-relationships > li").decompose(),
            "reversed visible arrow": lambda d: d.select_one(".diagram-relationships > li").find(string=" → ").replace_with(" ← "),
            "changed edge label": lambda d: setattr(d.select_one(".diagram-edge-label"), "string", "Wrong"),
            "group membership": lambda d: d.select_one(".diagram-group").__setitem__("data-group-members", "B A"),
            "wrong source": lambda d: d.select_one(".diagram-reading-aid").__setitem__("data-diagram-source", "diagrams/en/other.svg"),
            "wrong overview": lambda d: d.select_one(".diagram-reading-aid a").__setitem__("href", "#"+V._ident("ch01", "section")),
        }
        for name, mutation in mutations.items():
            with self.subTest(mutation=name):
                document = deepcopy(original)
                mutation(document)
                with self.assertRaises(AssertionError):
                    self.validate(document)

    def test_sequence_aid_events_labels_and_loop_depth(self):
        mermaid = 'sequenceDiagram\nparticipant M as Main\nparticipant S as Subagent\nloop Retry\nM->>S: Request\nS-->>M: Result\nNote over M,S: Shared note\nend'
        aid = '''<ol class="diagram-participants"><li data-participant-id="M"><span class="diagram-participant-label">Main</span></li><li data-participant-id="S"><span class="diagram-participant-label">Subagent</span></li></ol>
<ol class="diagram-events"><li data-event-kind="loop-start" data-loop-depth="0">Loop starts: <span class="diagram-event-label">Retry</span></li>
<li data-event-kind="message" data-loop-depth="1" data-participants="M S"><span class="diagram-participant-label">Main</span> → <span class="diagram-participant-label">Subagent</span>: <span class="diagram-event-label">Request</span></li>
<li data-event-kind="reply" data-loop-depth="1" data-participants="S M"><span class="diagram-participant-label">Subagent</span> → <span class="diagram-participant-label">Main</span>: <span class="diagram-event-label">Result</span></li>
<li data-event-kind="note" data-loop-depth="1" data-participants="M S">Note over <span class="diagram-participant-label">Main</span>, <span class="diagram-participant-label">Subagent</span>: <span class="diagram-event-label">Shared note</span></li>
<li data-event-kind="loop-end" data-loop-depth="0">Loop ends: <span class="diagram-event-label">Retry</span></li></ol>'''
        original = self.install_diagram(mermaid, aid)
        self.validate(original)
        for mutation in (lambda d: d.select_one(".diagram-events > li").decompose(),
                         lambda d: d.select_one('[data-event-kind="message"]').__setitem__("data-loop-depth", "0"),
                         lambda d: setattr(d.select_one('[data-event-kind="reply"] .diagram-event-label'), "string", "Wrong reply"),
                         lambda d: d.select_one('[data-event-kind="message"]').__setitem__("data-participants", "S M")):
            document = deepcopy(original)
            mutation(document)
            with self.assertRaises(AssertionError):
                self.validate(document)

    def test_nav_entries_section_associations_and_front_required(self):
        document = self.document()
        mutations = {
            "lost chapter": lambda nav: nav.find("a", href="ch01.xhtml").parent.decompose(),
            "wrong chapter label": lambda nav: setattr(nav.find("a", href="ch01.xhtml"), "string", "Wrong chapter"),
            "lost section": lambda nav: nav.find("a", href="ch01.xhtml#"+V._ident("ch01", "section")).parent.decompose(),
            "wrong section target": lambda nav: nav.find("a", href="ch01.xhtml#"+V._ident("ch01", "section")).__setitem__("href", "ch01.xhtml"),
            "lost titlepage entry": lambda nav: nav.find("a", href="titlepage.xhtml").parent.decompose(),
            "wrong section nesting": lambda nav: nav.nav.ol.append(nav.find("a", href="ch01.xhtml#"+V._ident("ch01", "section")).parent.extract()),
        }
        for name, mutate in mutations.items():
            with self.subTest(mutation=name):
                nav = self.nav()
                mutate(nav)
                with self.assertRaises(AssertionError):
                    V.validate("en", self.package(document, nav), expected_documents=["ch01"])
        packaged = self.package(document)
        for missing in ("titlepage", "about", "nav"):
            broken = self.root / (missing+"-missing.epub")
            with zipfile.ZipFile(packaged) as original, zipfile.ZipFile(broken, "w") as actual:
                for info in original.infolist():
                    if info.filename != f"OEBPS/{missing}.xhtml":
                        actual.writestr(info, original.read(info))
            with self.assertRaises(AssertionError):
                V.validate("en", broken, expected_documents=["ch01"])

    def test_nav_catalog_part_transitions_and_supplement_group(self):
        catalog = []
        titles = ["Part I: Foundation", "Chapter 1: Start", "Part II: Methods", "Chapter 2: Work", "Appendix: Reference", "Afterword"]
        sources = {}
        for order, title in enumerate(titles, 1):
            catalog.append({"order": order, "title_en": title, "title_zh_cn": title})
            sources[f"ch{order:02}"] = (None, BeautifulSoup('<h2 id="section">Section</h2>', "html.parser"), catalog[-1])
        selected = [f"ch{order:02}" for order in range(1, 7)] + ["glossary", "image-notes"]
        def chapter(order, sections=True):
            anchor = '<ol><li><a href="ch%02d.xhtml#%s">Section</a></li></ol>' % (order, V._ident(f"ch{order:02}", "section")) if sections else ""
            return '<li><a href="ch%02d.xhtml">%s</a>%s</li>' % (order, titles[order-1], anchor)
        part1 = '<li><a href="ch01.xhtml">'+titles[0]+'</a><ol>'+chapter(2)+'</ol></li>'
        part2 = '<li><a href="ch03.xhtml">'+titles[2]+'</a><ol>'+chapter(4)+'</ol></li>'
        extras = '<li><span>Supplementary material</span><ol><li><a href="glossary.xhtml">附加资料：术语表</a></li><li><a href="image-notes.xhtml">附加资料：图片文字说明</a></li></ol></li>'
        raw = '<html xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><h1>Contents</h1><ol><li><a href="titlepage.xhtml">Title page</a></li><li><a href="about.xhtml">About this edition</a></li>'+part1+part2+chapter(5)+chapter(6)+extras+'</ol></nav></body></html>'
        nav = BeautifulSoup(raw, "html.parser")
        docs = {"OEBPS/nav.xhtml": nav, "OEBPS/titlepage.xhtml": self.document(), "OEBPS/about.xhtml": self.document()}
        V._navigation("en", docs, sources, selected, {"chapters": catalog})
        for href in ("ch02.xhtml", "ch05.xhtml", "glossary.xhtml"):
            mutated = deepcopy(nav)
            entry = mutated.find("a", href=href).parent.extract()
            mutated.find("a", href="ch03.xhtml").parent.ol.append(entry)
            with self.assertRaises(AssertionError):
                V._navigation("en", {**docs, "OEBPS/nav.xhtml": mutated}, sources, selected, {"chapters": catalog})

    def test_full_validation_requires_every_document(self):
        with self.assertRaisesRegex(AssertionError, "document inventory"):
            V.validate("en", self.package(self.document()), policy_path=self.policy_path)


if __name__ == "__main__":
    unittest.main()
