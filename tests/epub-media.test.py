import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "docs/books/pstack"
spec = importlib.util.spec_from_file_location("epub_media", ROOT / "tools/books/epub_media.py")
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)


def prepared(name, language="zh-CN", dimensions=None, extra=""):
    if dimensions is None:
        svg = ET.parse(BOOK / "diagrams" / language / (name + ".svg")).getroot()
        dimensions = svg.attrib["viewBox"].split()[2:]
    return (f'<figure data-w="{dimensions[0]}" data-h="{dimensions[1]}" {extra}>'
            f'<img src="images/{language}-{name}.png" alt="Original overview {name}" '
            f'data-original="diagrams/{language}/{name}.svg"/></figure>')


def transform(content, language="zh-CN", book=BOOK):
    return BeautifulSoup(media.prepare_diagram_reading_aids(
        content, book_dir=book, language=language), "html.parser")


class DiagramReadingAids(unittest.TestCase):
    def test_full_inventories_parse_and_only_risky_overviews_get_aids(self):
        for language, expected in (("zh-CN", 11), ("en", 13)):
            files = sorted((BOOK / "diagrams" / language).glob("*.svg"))
            self.assertEqual(len(files), 31)
            self.assertEqual({p.stem for p in files},
                             {p.stem for p in (BOOK / "diagrams" / language).glob("*.md")})
            content = "".join(prepared(p.stem, language) for p in files)
            soup = transform(content, language)
            self.assertEqual(len(soup.select(".diagram-reading-aid")), expected)
            self.assertEqual(len(soup.select("figure img")), 31)
            self.assertFalse(soup.select("pre, code"))
            all_risky = "".join(prepared(p.stem, language, (1000, 1000)) for p in files)
            self.assertEqual(len(transform(all_risky, language).select(".diagram-reading-aid")), 31)

    def test_real_wide_fan_out_and_fan_in_keep_every_ordered_edge(self):
        soup = transform(prepared("28-05"))
        aid = soup.select_one(".diagram-reading-aid")
        self.assertEqual([node.text for node in aid.select(".diagram-nodes li")], [
            "通过 git blame 和 gh pr view 收集相关行、提交与 PR", "为每个可用 MCP 启动一位调查者",
            "源代码管理", "工单", "长篇文档", "聊天", "基础设施", "错误追踪", "产品分析",
            "synthesizer 汇总各项主张，并标注确定程度"])
        edges = aid.select(".diagram-relationships li")
        self.assertEqual([(edge["data-source-node"], edge["data-target-node"]) for edge in edges],
                         [("A", "B")] + [("B", "C" + str(i)) for i in range(1, 8)]
                         + [("C" + str(i), "D") for i in range(1, 8)])
        self.assertEqual([edge.text for edge in aid.select(".diagram-edge-label")],
                         ["将收集到的线索交给所有人"] + ["返回结果，包括未找到的情况"] * 7)
        self.assertEqual(aid["data-generated"], "diagram-reading-aid")
        self.assertEqual(aid.select_one("a")["href"], "#diagram-28-05")
        self.assertEqual(soup.figure["id"], "diagram-28-05")
        self.assertEqual(soup.figure.find_next_sibling(), aid)
        self.assertEqual(soup.img["src"], "images/zh-CN-28-05.png")
        self.assertEqual(soup.img["alt"], "Original overview 28-05")

    def test_real_tall_nodes_breaks_and_branches_keep_exact_words(self):
        soup = transform(prepared("40-02", extra='id="existing-overview"'))
        labels = soup.select(".diagram-nodes .diagram-node-label")
        self.assertEqual([label.get_text("\n") for label in labels], [
            "检测可用模型的 slug", "若上次 /setup-pstack 写入的\n规则文件存在，就读取它",
            "用户选择推理预算", "按预算替换各角色的 slug", "展示全部角色和模型，\n询问接受还是修改",
            "确认将要写入的 slug\n对应可用模型", "写入完整规则文件",
            "告知规则已写入，\n将从新对话开始应用", "是否有运行真实应用\n并进行验证的手段",
            "仅建议一次创建验证 Skill", "结束"])
        self.assertEqual([label.text for label in soup.select(".diagram-edge-label")], ["没有", "有"])
        self.assertEqual(len(soup.select(".diagram-relationships li")), 11)
        self.assertEqual(soup.select_one(".diagram-reading-aid a")["href"], "#existing-overview")

    def test_real_risky_sequence_keeps_participants_messages_and_notes(self):
        soup = transform(prepared("31-01", "en"), "en")
        self.assertEqual([node.text for node in soup.select(".diagram-participants li")], [
            "The user's browser", "Local server that holds the sender key", "webhook URL", "The Bot's routine"])
        events = soup.select(".diagram-events li")
        self.assertEqual([event["data-event-kind"] for event in events], ["message"] * 3 + ["note"])
        self.assertEqual([label.text for label in soup.select(".diagram-event-label")], [
            "Pressing a button POSTs the JSON", "Adds the sender key and POSTs the JSON",
            "Starts the routine and passes the JSON", "Reads the JSON as external data, not as instructions"])
        self.assertEqual([event["data-participants"] for event in events], ["U S", "S W", "W R", "R"])

    def test_loop_boundaries_and_reply_order_are_readable(self):
        soup = transform(prepared("28-03", "en", (1000, 1000)), "en")
        events = soup.select(".diagram-events li")
        self.assertEqual([event["data-event-kind"] for event in events],
                         ["message", "reply", "loop-start", "message", "reply", "loop-end"])
        self.assertEqual([event["data-loop-depth"] for event in events], ["0", "0", "0", "1", "1", "0"])
        self.assertEqual(events[2].text, "Loop starts: Repeat for each ID, queries 2 to 101")
        self.assertEqual(events[-1].text, "Loop ends: Repeat for each ID, queries 2 to 101")

    def test_subgraph_memberships_and_group_to_group_relationship(self):
        soup = transform(prepared("45-01", "en"), "en")
        groups = soup.select(".diagram-group")
        self.assertEqual([group.select_one(".diagram-group-label").text for group in groups],
                         ["Before the split", "After the split"])
        self.assertEqual([group["data-group-members"] for group in groups], ["A", "B C"])
        self.assertEqual(soup.select(".diagram-relationships li")[-1].text,
                         "Before the split → After the split")

    def test_small_figures_and_unrelated_source_content_are_unchanged(self):
        source = '<p id="prose">A &amp; B <a href="ch02.xhtml#check">link</a></p><pre><code>x &lt; 3\n</code></pre>'
        content = source + prepared("22-01")
        self.assertEqual(media.prepare_diagram_reading_aids(content, book_dir=BOOK, language="zh-CN"), content)
        soup = transform(source + prepared("28-05"))
        self.assertEqual(soup.select_one("#prose").text, "A & B link")
        self.assertEqual(soup.select_one("#prose a")["href"], "ch02.xhtml#check")
        self.assertEqual(soup.code.text, "x < 3\n")
        self.assertEqual(len(soup.select("pre code")), 1)

    def test_transformation_does_not_write_diagram_assets(self):
        paths = sorted((BOOK / "diagrams").glob("*/*"))
        before = {path: hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}
        transform(prepared("28-05") + prepared("40-02"))
        self.assertEqual(before, {path: hashlib.sha256(path.read_bytes()).hexdigest() for path in paths})

    def test_repeat_transform_is_stable(self):
        first = media.prepare_diagram_reading_aids(prepared("28-05"), book_dir=BOOK, language="zh-CN")
        self.assertEqual(media.prepare_diagram_reading_aids(first, book_dir=BOOK, language="zh-CN"), first)

    def fixture(self, source):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        book = Path(directory.name)
        path = book / "diagrams/en/99-01.md"
        path.parent.mkdir(parents=True)
        path.write_text("```mermaid\n" + source + "\n```\n", encoding="utf-8")
        return book

    def test_entities_and_html_breaks_are_real_safe_text(self):
        book = self.fixture('flowchart TD\n A["One &amp; two<br/>next &lt; 3"] -->|yes &amp; sure| B["End"]')
        soup = transform(prepared("99-01", "en", (1000, 1000)), "en", book)
        node = soup.select_one(".diagram-nodes .diagram-node-label")
        self.assertEqual(node.get_text("\n"), "One & two\nnext < 3")
        self.assertEqual(len(node.select("br")), 1)
        self.assertEqual(soup.select_one(".diagram-edge-label").text, "yes & sure")

    def test_unsupported_constructs_fail_closed_after_valid_statements(self):
        cases = [
            "flowchart TD\n A[First] --> B[Second]\n B --- C[Third]",
            "flowchart TD\n A[First] --> B[Second]\n style B fill:red",
            "flowchart TD\n A[First] --> B[Second]\n C((Unsupported circle))",
            "flowchart TD\n A[First] --> B[Second]\n B --> C[Third]:::red",
            "flowchart TD\n A[First] --> B[Second]\n subgraph incomplete\n C[Third]\n end",
            "flowchart TD\n A[First] --> B[Second]\n subgraph group[Group]\n C[Third]",
            "sequenceDiagram\n participant A as First\n participant B as Second\n A->>B: Hello\n alt OK\n B-->>A: Yes\n end",
            "sequenceDiagram\n participant A as First\n participant B as Second\n A->>B: Hello\n activate B",
            "sequenceDiagram\n participant A as First\n participant B as Second\n A->>B: Hello\n B->>C: Lost participant",
            "sequenceDiagram\n participant A as First\n loop forever\n A->>A: Hello",
            "flowchart TD\n A[First] --> B[\"<em>Silent formatting loss</em>\"]",
            "stateDiagram-v2\n First --> Second",
        ]
        for source in cases:
            with self.subTest(source=source), self.assertRaises(ValueError):
                book = self.fixture(source)
                transform(prepared("99-01", "en", (1000, 1000)), "en", book)

    def test_invalid_dimensions_and_sources_fail_closed(self):
        for dimensions in (("nan", 50), (50, 0), ("bad", 500)):
            with self.subTest(dimensions=dimensions), self.assertRaises(ValueError):
                transform(prepared("28-05", dimensions=dimensions))
        for source in ("diagrams/en/28-05.svg", "diagrams/zh-CN/../../28-05.svg"):
            content = prepared("28-05").replace("diagrams/zh-CN/28-05.svg", source)
            with self.subTest(source=source), self.assertRaises(ValueError):
                transform(content)
        with self.assertRaisesRegex(ValueError, "anchor collision"):
            transform('<p id="diagram-28-05">Existing</p>' + prepared("28-05"))


if __name__ == "__main__":
    unittest.main()
