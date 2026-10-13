"""Reading-layout invariants after retiring blanket table conversion."""
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

from bs4 import BeautifulSoup, Comment, NavigableString

ROOT = Path(__file__).resolve().parents[1]

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT/path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

layout = load('epub_layout', 'tools/books/epub_layout.py')
tables = load('epub_tables', 'tools/books/epub_tables.py')


def transform(source, mode):
    def tree(node):
        if isinstance(node, Comment): return ['comment',str(node)]
        if isinstance(node,NavigableString): return ['text',str(node)]
        return ['element',node.name.lower(),[[k,v] for k,v in sorted(node.attrs.items())],[tree(c) for c in node.contents]]
    table = BeautifulSoup(source,'html.parser').table
    digest = hashlib.sha256(json.dumps(tree(table),ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
    policy = tables.parse_table_policy(json.dumps({'version':1,'source_snapshot':'2026-10-03','tables':{
        'sample-t01':{'en':{'source_sha256':digest,'mode':mode,'reason':'Reviewed layout fixture.'}}}}))
    return BeautifulSoup(tables.transform_tables(source,source_html=source,document_id='sample',language='en',policy=policy).html,'html.parser')


class ReadingLayout(unittest.TestCase):
    def test_explanation_fields_flow_without_enclosing_row_box(self):
        source = '<table><tr><th>Check</th><th>Response</th></tr><tr><td>Cannot verify?</td><td>Say so.</td></tr></table><p>Next prose.</p>'
        result = transform(source,'records')
        fields = result.select('.table-field')
        self.assertEqual(len(fields),2)
        self.assertTrue(all(field.parent is result for field in fields))
        self.assertIsNone(result.select_one('.table-record, .reflow-table'))
        self.assertNotIn('.table-record {',layout.EPUB_CSS)
        field_rule = layout.EPUB_CSS.split('.table-field')[1].split('}')[0]
        self.assertNotIn('border',field_rule)

    def test_records_remain_labelled_and_readable_without_author_css(self):
        source = '<table><tr><th>Check</th><th>Response</th></tr><tr><td>Cannot verify?</td><td>Say so (<a href="ch05.xhtml">Chapter 3</a>).</td></tr></table>'
        result = transform(source,'records')
        self.assertEqual([p.get_text() for p in result.select('.table-field')],
                         ['Check: Cannot verify?','Response: Say so (Chapter 3).'])
        self.assertEqual(result.select_one('a[href]')['href'],'ch05.xhtml')
        self.assertEqual(len(result.select('[data-label-for]')),2)

    def test_compact_matrix_retains_native_table_associations(self):
        source = '<table><tr><th></th><th>Learning</th><th>Work</th></tr><tr><td>Action</td><td>tutorial</td><td>how-to</td></tr><tr><td>Understanding</td><td>explanation</td><td>reference</td></tr></table>'
        result = transform(source,'table')
        self.assertEqual([th.get_text() for th in result.thead.select('th')],['','Learning','Work'])
        self.assertTrue(all(th['scope']=='col' for th in result.thead.select('th')))
        self.assertEqual([[td.get_text() for td in row.select('td')] for row in result.tbody.select('tr')],
                         [['Action','tutorial','how-to'],['Understanding','explanation','reference']])


if __name__ == '__main__':
    unittest.main()
