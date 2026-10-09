import importlib.util
from pathlib import Path
import unittest

from bs4 import BeautifulSoup

path = Path(__file__).resolve().parents[1] / "tools/books/epub_layout.py"
spec = importlib.util.spec_from_file_location("epub_layout", path)
layout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)
validator_path = path.with_name("validate-pstack-ebooks.py")
validator_spec = importlib.util.spec_from_file_location("epub_validator", validator_path)
validator = importlib.util.module_from_spec(validator_spec)
validator_spec.loader.exec_module(validator)


class TableReadingOrder(unittest.TestCase):
    def test_interleaved_rows_cannot_be_normalized_into_a_pass(self):
        def field(row, value):
            return f'<p class="table-field" data-table-row="{row}">{value}</p>'
        intact = BeautifulSoup(field('a', 'A1') + field('a', 'A2') + field('b', 'B1'), 'html.parser')
        self.assertEqual(validator.table_rows_in_reading_order(intact), [['A1', 'A2'], ['B1']])
        interleaved = BeautifulSoup(field('a', 'A1') + field('b', 'B1') + field('a', 'A2'), 'html.parser')
        with self.assertRaisesRegex(AssertionError, 'interleaved table row'):
            validator.table_rows_in_reading_order(interleaved)

    def test_table_prose_has_no_box_spanning_multiple_paragraphs(self):
        source = '<table><tr><th>检查</th><th>回答</th></tr><tr><td>无法检查？</td><td>如实说明。</td></tr></table><p>随后正文。</p>'
        result = BeautifulSoup(layout.reflow_tables(source), 'html.parser')
        fields = result.select('.table-field')
        self.assertEqual(len(fields), 2)
        self.assertTrue(all(field.parent is result for field in fields),
                        'Table paragraphs must flow independently across reader columns')
        self.assertNotIn('.table-record', layout.EPUB_CSS)
        self.assertNotIn('border', layout.EPUB_CSS.split('.table-field')[1].split('}')[0])

    def test_every_value_keeps_its_label_and_link_without_css(self):
        original = '''<table id="checks" class="code-line"><thead><tr>
        <th>要检查的事</th><th>如果答案是「否」</th></tr></thead><tbody>
        <tr><td>无法检查时，回复是否会如实说明？</td><td>允许回答「无法得出结论」</td></tr>
        <tr><td>人离开座位后能运转吗？</td><td>替换成机制（<a href="ch05.xhtml">第 3 章</a>）</td></tr>
        </tbody></table><p>第一项「完成条件」见随附指南。</p>'''
        result = BeautifulSoup(layout.reflow_tables(original), "html.parser")
        fields = result.select(".table-field")
        self.assertEqual(len(fields), 4)
        self.assertEqual([field['data-table-row'] for field in fields], ['0:0', '0:0', '0:1', '0:1'])
        self.assertEqual(fields[3].select_one("strong").text, "如果答案是「否」: ")
        self.assertEqual(result.select_one("a[href]")["href"], "ch05.xhtml")
        self.assertIsNotNone(result.select_one("#checks"))
        self.assertEqual(result.find_all("p")[-1].text,
                         "第一项「完成条件」见随附指南。")
        self.assertIsNone(result.select_one("table"))

    def test_block_cells_and_code_text_are_preserved(self):
        source = '<table><tr><th>Example</th></tr><tr><td><p>Intro</p><pre><code>x &lt; 3\n</code></pre></td></tr></table>'
        result = BeautifulSoup(layout.reflow_tables(source), "html.parser")
        self.assertEqual(result.select_one("pre code").text, "x < 3\n")
        self.assertEqual(result.select_one(".table-field").get_text(" ", strip=True),
                         "Example: Intro x < 3")
        self.assertIsNone(result.select_one("p p"))

    def test_ambiguous_reading_order_is_rejected(self):
        for source in [
            '<table><tr><td>No header</td></tr></table>',
            '<table><tr><th>A</th><th>B</th></tr><tr><td colspan="2">Merged</td></tr></table>',
            '<table><tr><th>A</th><th>B</th></tr><tr><td>Missing B</td></tr></table>',
        ]:
            with self.assertRaises(ValueError):
                layout.reflow_tables(source)

    def test_blank_corner_header_keeps_row_label(self):
        source = '<table><tr><th></th><th>学习</th><th>工作</th></tr><tr><td>行动</td><td>tutorial</td><td>how-to</td></tr></table>'
        result = BeautifulSoup(layout.reflow_tables(source), "html.parser")
        fields = result.select(".table-field")
        self.assertEqual([field.text for field in fields], ["行动", "学习: tutorial", "工作: how-to"])

    def test_column_label_links_survive_repetition(self):
        source = '<table><tr><th>章节（<a href="ch02.xhtml">第一部分</a>）</th></tr><tr><td>A</td></tr><tr><td>B</td></tr></table>'
        result = BeautifulSoup(layout.reflow_tables(source), "html.parser")
        self.assertEqual([link["href"] for link in result.select("a")], ["ch02.xhtml", "ch02.xhtml"])


if __name__ == "__main__":
    unittest.main()
