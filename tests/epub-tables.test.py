"""Focused behavioral and frozen-source inventory checks for EPUB tables."""
from collections import Counter, defaultdict
from copy import deepcopy
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

from bs4 import BeautifulSoup, Comment, NavigableString
import mistune

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("epub_tables", ROOT / "tools/books/epub_tables.py")
tables = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tables)


def source_hash(table):
    def tree(node):
        if isinstance(node, Comment):
            return ["comment", str(node)]
        if isinstance(node, NavigableString):
            return ["text", str(node)]
        return ["element", node.name.lower(), [[k, v] for k, v in sorted(node.attrs.items())],
                [tree(child) for child in node.children]]
    return hashlib.sha256(json.dumps(tree(table), ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def policy_data(html, mode="records", groups=None, document="sample", language="en"):
    entries = {}
    for i, table in enumerate(BeautifulSoup(html, "html.parser").select("table"), 1):
        rule = {"source_sha256": source_hash(table), "mode": mode, "reason": "Reviewed fixture layout."}
        if mode == "split":
            rule.update(key_column=0, groups=groups)
        entries[f"{document}-t{i:02d}"] = {language: rule}
    return {"version": 1, "source_snapshot": "2026-10-03", "tables": entries}


def policy_for(html, mode="records", groups=None, document="sample", language="en"):
    return tables.parse_table_policy(json.dumps(policy_data(html, mode, groups, document, language)))


def run_transform(html, mode="records", groups=None, prepared=None, policy=None):
    return tables.transform_tables(prepared if prepared is not None else html,
                                   source_html=html, document_id="sample", language="en",
                                   policy=policy if policy is not None else policy_for(html, mode, groups))


def coord(node):
    return int(node["data-source-row"]), int(node["data-source-col"]), int(node["data-copy"])


SIMPLE = '<table><tr><th>Key</th><th>Meaning</th></tr><tr><td>A</td><td>Alpha</td></tr><tr><td>B</td><td>Beta</td></tr></table>'
RICH = '''<p id="before">Before <a href="outside.html">outside</a>.</p><table id="comparison" class="source-table">
<caption id="caption">Caption <em id="caption-em">markup</em>.</caption>
<thead id="header-group"><tr id="header-row"><th id="key-header"><em id="key-em">Key</em></th>
<th id="meaning-header"><a id="header-link" href="old-target#section">Meaning</a></th><th>Extra</th></tr></thead>
<tbody id="body-group"><tr id="row-a"><td id="key-a"><strong id="key-a-strong">A</strong></td><td id="value-a"> One <a id="value-link" href="old-target#value">link</a><!--exact comment--> </td><td>last A</td></tr>
<tr id="row-b"><td>B</td><td>Two &amp; three</td><td>last B</td></tr></tbody></table><p id="after">After.</p>'''


class PolicyParsing(unittest.TestCase):
    def test_parser_returns_immutable_explicit_rules(self):
        policy = policy_for(SIMPLE)
        self.assertIsInstance(policy, tables.TablePolicy)
        self.assertEqual(policy.tables['sample-t01']['en'].mode, 'records')
        self.assertEqual(policy.version, 1)
        with self.assertRaises(TypeError):
            policy.tables['unexpected'] = {}
        with self.assertRaises(TypeError):
            policy.tables['sample-t01']['en'] = None

    def test_duplicate_keys_fail_at_every_level(self):
        text = json.dumps(policy_data(SIMPLE))
        for original, duplicate in [('"version": 1', '"version": 1, "version": 1'),
                                    ('"mode": "records"', '"mode": "records", "mode": "table"'),
                                    ('"en": {', '"en": {}, "en": {')]:
            with self.subTest(original=original), self.assertRaisesRegex(ValueError, 'duplicate'):
                tables.parse_table_policy(text.replace(original, duplicate))

    def test_unknown_keys_and_invalid_types_fail(self):
        data = policy_data(SIMPLE)
        mutations = []
        for key, value in [('version', 2), ('version', True), ('source_snapshot', '2026-10-04'),
                           ('tables', []), ('unapproved', True)]:
            altered = deepcopy(data); altered[key] = value; mutations.append(altered)
        for key, value in [('source_sha256', '0'*63), ('source_sha256', []), ('mode', 'auto'),
                           ('reason', '  '), ('reason', None), ('classifier', 'short'),
                           ('groups', [[1]]), ('key_column', 0)]:
            altered = deepcopy(data); altered['tables']['sample-t01']['en'][key] = value; mutations.append(altered)
        altered = deepcopy(data); altered['tables']['sample-t01']['ja'] = altered['tables']['sample-t01']['en']; mutations.append(altered)
        altered = deepcopy(data); altered['tables']['bad-id'] = altered['tables'].pop('sample-t01'); mutations.append(altered)
        altered = deepcopy(data); del altered['tables']['sample-t01']['en']['reason']; mutations.append(altered)
        for altered in mutations:
            with self.subTest(data=altered), self.assertRaises(ValueError):
                tables.parse_table_policy(json.dumps(altered))
        for invalid in ('{', 'null', '[]'):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                tables.parse_table_policy(invalid)

    def test_split_schema_requires_ordered_contiguous_nonkey_groups(self):
        data = policy_data(RICH, 'split', [[1], [2]])
        for groups in ([], [[]], [[0], [1]], [[2], [1]], [[1], [1]], [[1, 3]], [[True], [2]], 'auto'):
            altered = deepcopy(data); altered['tables']['sample-t01']['en']['groups'] = groups
            with self.subTest(groups=groups), self.assertRaises(ValueError):
                tables.parse_table_policy(json.dumps(altered))
        for key in (1, False, None):
            altered = deepcopy(data); altered['tables']['sample-t01']['en']['key_column'] = key
            with self.subTest(key=key), self.assertRaises(ValueError):
                tables.parse_table_policy(json.dumps(altered))


class HashBinding(unittest.TestCase):
    def test_complete_tree_includes_attributes_lists_comments_and_whitespace(self):
        original = '<table z="末" class="b a" id="t">\n<!-- note --><tr><th>H</th></tr><tr><td><a href="x#i">V</a></td></tr></table>'
        table = BeautifulSoup(original, 'html.parser').table
        self.assertEqual(tables.table_source_sha256(table), source_hash(table))
        self.assertEqual(tables.table_tree(table)[2], [['class', ['b', 'a']], ['id', 't'], ['z', '末']])
        for changed in (original.replace(' note ', 'note'), original.replace('\n', ''),
                        original.replace('x#i', 'x#j'), original.replace('b a', 'a b'),
                        original.replace('id="t"', 'id="other"')):
            self.assertNotEqual(source_hash(BeautifulSoup(changed, 'html.parser').table), source_hash(table))
        reordered = original.replace('z="末" class="b a" id="t"', 'id="t" z="末" class="b a"')
        self.assertEqual(source_hash(BeautifulSoup(reordered, 'html.parser').table), source_hash(table))

    def test_prepared_links_are_copied_but_raw_source_is_hashed(self):
        prepared = RICH.replace('old-target#section', 'ch02.xhtml#section').replace('old-target#value', 'ch03.xhtml#value')
        result = run_transform(RICH, prepared=prepared)
        self.assertEqual(result.tables[0].source_sha256, source_hash(BeautifulSoup(RICH, 'html.parser').table))
        soup = BeautifulSoup(result.html, 'html.parser')
        self.assertEqual([a['href'] for a in soup.select('[data-source-row="0"][data-source-col="1"] a')],
                         ['ch02.xhtml#section', 'ch02.xhtml#section'])
        self.assertEqual(soup.select_one('#value-link')['href'], 'ch03.xhtml#value')
        with self.assertRaisesRegex(ValueError, 'stale source hash'):
            run_transform(prepared, policy=policy_for(RICH))

    def test_changed_cell_text_or_missing_prepared_tables_fails(self):
        for prepared in (SIMPLE.replace('Alpha', 'Changed'), SIMPLE.replace('<td>Beta</td>', ''), '<p>No table.</p>'):
            with self.subTest(prepared=prepared), self.assertRaises(ValueError):
                run_transform(SIMPLE, prepared=prepared)

    def test_stale_source_mutations_fail(self):
        policy = policy_for(SIMPLE)
        for html in (SIMPLE.replace('Alpha', 'Alfa'), SIMPLE.replace('<table>', '<table id="new">'),
                     SIMPLE.replace('<tr>', '\n<tr>', 1), SIMPLE.replace('Beta', 'Beta<!--new-->')):
            with self.subTest(html=html), self.assertRaisesRegex(ValueError, 'stale source hash'):
                run_transform(html, policy=policy)


class EmittedPayloads(unittest.TestCase):
    def check_payloads(self, original, result):
        source = BeautifulSoup(original, 'html.parser')
        output = BeautifulSoup(result.html, 'html.parser')
        source_cells = [[c for c in row.find_all(['th', 'td'], recursive=False)] for row in source.table.select('tr')]
        payloads = output.select('[data-source-row]')
        counts = defaultdict(int)
        data_order = []
        for payload in payloads:
            r, c, copy = coord(payload)
            self.assertEqual(copy, counts[r, c]); counts[r, c] += 1
            cell = source_cells[r][c]
            self.assertEqual(payload.get_text(), cell.get_text())
            self.assertEqual([a['href'] for a in payload.select('a[href]')], [a['href'] for a in cell.select('a[href]')])
            expected = deepcopy(cell)
            if copy:
                expected.attrs.pop('id', None)
                for tag in expected.select('[id]'): del tag['id']
            self.assertEqual(payload.decode_contents(), expected.decode_contents())
            if r and c and not copy: data_order.append((r, c))
        self.assertEqual(data_order, [(r, c) for r in range(1, len(source_cells)) for c in range(1, len(source_cells[0]))])
        self.assertEqual(Counter(tag['id'] for tag in output.select('[id]')), Counter(tag['id'] for tag in source.select('[id]')))
        self.assertEqual(output.select_one('#before').decode_contents(), source.select_one('#before').decode_contents())
        self.assertEqual(output.select_one('#after').decode_contents(), source.select_one('#after').decode_contents())
        self.assertEqual(output.select_one('#caption').decode_contents(), source.select_one('#caption').decode_contents())
        return output, counts

    def test_native_table_preserves_semantics_payloads_anchors_and_receipt(self):
        result = run_transform(RICH, 'table')
        output, counts = self.check_payloads(RICH, result)
        table = output.select_one('table[data-table-mode="table"]')
        self.assertIsNotNone(table.thead)
        self.assertEqual(len(table.tbody.select('tr')), 2)
        self.assertTrue(all(th['scope'] == 'col' for th in table.thead.select('th')))
        self.assertTrue(all(copy_count == 1 for copy_count in counts.values()))
        self.assertEqual(result.tables[0], tables.TableReceipt('sample-t01', source_hash(BeautifulSoup(RICH,'html.parser').table), 'table', 2, 3))
        self.assertIsInstance(result.tables, tuple)

    def test_records_have_visible_labels_title_and_no_enclosing_box(self):
        result = run_transform(RICH)
        output, counts = self.check_payloads(RICH, result)
        marker = output.select_one('a[data-table-mode="records"]')
        self.assertEqual(marker['data-table-id'], 'sample-t01')
        self.assertIsNone(output.table)
        fields = output.select('.table-field')
        self.assertEqual(len(fields), 6)
        self.assertTrue(all(field.parent is output for field in fields))
        self.assertEqual(len(output.select('.table-row-start.table-record-title')), 2)
        self.assertEqual(fields[0].get_text(), 'Key: A')
        self.assertEqual(fields[3].get_text(), 'Key: B')
        self.assertIsNotNone(fields[0].select_one('strong [data-source-row="1"]'))
        for field in fields:
            label, value = field.select('[data-source-row]')
            r, c, _ = coord(value)
            self.assertEqual(label['data-label-for'], f'sample-t01:{r}:{c}')
            self.assertEqual(coord(label)[:2], (0, c))
            self.assertLess(str(field).index(str(label)), str(field).index(str(value)))
        self.assertEqual(counts[0, 0], 2)
        self.assertEqual(len(output.select('#header-link')), 1)
        self.assertEqual(len(output.select('[data-source-row="0"][data-source-col="1"] a[href]')), 2)
        self.assertIsNone(output.select_one('.table-record, .reflow-table'))

    def test_split_is_row_major_then_group_major_and_repeats_keys(self):
        result = run_transform(RICH, 'split', [[1], [2]])
        output, counts = self.check_payloads(RICH, result)
        panels = output.select('table[data-table-mode="split"]')
        self.assertEqual([(p['data-table-row'], p['data-panel']) for p in panels], [('1','0'),('1','1'),('2','0'),('2','1')])
        self.assertEqual([[coord(c)[:2] for c in panel.tbody.select('td')] for panel in panels],
                         [[(1,0),(1,1)],[(1,0),(1,2)],[(2,0),(2,1)],[(2,0),(2,2)]])
        self.assertEqual(counts[0, 0], 4)
        self.assertEqual(counts[1, 0], 2)
        self.assertEqual(counts[0, 1], 2)
        self.assertEqual(counts[1, 1], 1)
        self.assertTrue(all(len(panel.tbody.select('tr')) == 1 for panel in panels))
        self.assertTrue(all(th.get('scope') == 'col' for panel in panels for th in panel.thead.select('th')))

    def test_blank_corner_header_still_has_empty_label_payload(self):
        source = '<table><tr><th id="blank"></th><th>Learning</th><th>Work</th></tr><tr><td>Action</td><td>tutorial</td><td>how-to</td></tr></table>'
        output = BeautifulSoup(run_transform(source).html, 'html.parser')
        field = output.select_one('.table-record-title')
        label = field.select_one('[data-source-row="0"]')
        self.assertEqual(label.get_text(), '')
        self.assertEqual(label['id'], 'blank')
        self.assertEqual(label['data-label-for'], 'sample-t01:1:0')
        self.assertEqual(field.get_text().strip(), 'Action')
        native = BeautifulSoup(run_transform(source, 'table').html,'html.parser')
        self.assertEqual(native.thead.select_one('th').get_text(), '')

    def test_block_cells_code_bytes_and_entities_are_unchanged(self):
        source = '<table><tr><th>Key</th><th>Example</th></tr><tr><td>A</td><td id="code-cell"><p>Intro</p><pre id="code-block"><code> x &lt; 3\n\tvalue &amp; more\n</code></pre><ul><li>Item</li></ul></td></tr></table>'
        for mode in ('table', 'records', 'split'):
            result = run_transform(source, mode, [[1]] if mode == 'split' else None)
            output = BeautifulSoup(result.html, 'html.parser')
            self.assertEqual(output.select_one('pre code').get_text(), ' x < 3\n\tvalue & more\n')
            self.assertEqual(len(output.select('#code-block')), 1)
            self.assertEqual(output.select_one('[data-source-row="1"][data-source-col="1"]').decode_contents(),
                             BeautifulSoup(source,'html.parser').select_one('#code-cell').decode_contents())
            self.assertIsNone(output.select_one('p p, p pre, p ul, strong div'))

    def test_non_table_content_is_not_rewritten(self):
        content = '<section id="s"><p>Exact <em>markup</em> &amp; text.</p><!-- note --><pre><code>  bytes\n</code></pre></section>'
        result = run_transform(content)
        self.assertEqual(result.html, str(BeautifulSoup(content, 'html.parser')))
        self.assertEqual(result.tables, ())

    def test_multiple_tables_keep_source_order_and_distinct_coordinates(self):
        result = run_transform(SIMPLE + '<p>Between</p>' + SIMPLE)
        self.assertEqual([receipt.table_id for receipt in result.tables], ['sample-t01', 'sample-t02'])
        output = BeautifulSoup(result.html,'html.parser')
        self.assertEqual([node['data-table-id'] for node in output.select('a[data-table-mode="records"]')], ['sample-t01', 'sample-t02'])
        self.assertEqual(len(output.select('[data-copy="0"][data-source-row="1"][data-source-col="1"]')), 2)


class InvalidTransformation(unittest.TestCase):
    def test_ambiguous_source_shapes_fail(self):
        invalid = [
            '<table></table>', '<table><tr><td>No header</td></tr></table>',
            '<table><tr><th>A</th><td>B</td></tr><tr><td>A</td><td>B</td></tr></table>',
            '<table><tr><th>A</th><th>B</th></tr><tr><td>A</td></tr></table>',
            '<table><tr><th>A</th><th>B</th></tr><tr><td>A</td><td>B</td><td>C</td></tr></table>',
            '<table><tr><th>A</th><th></th></tr><tr><td>A</td><td>B</td></tr></table>',
            '<table><tr><th>A</th></tr><tr><td colspan="1">B</td></tr></table>',
            '<table><tr><th rowspan="2">A</th></tr><tr><td>B</td></tr></table>',
            '<table><tr><th>A</th></tr><tr><td><table><tr><th>Nested</th></tr></table></td></tr></table>',
        ]
        for source in invalid:
            with self.subTest(source=source), self.assertRaises(ValueError):
                run_transform(source)

    def test_header_only_requires_native_mode(self):
        source = '<table><tr><th>A</th><th>B</th></tr></table>'
        result = run_transform(source, 'table')
        self.assertEqual(result.tables[0].rows, 0)
        for mode, groups in [('records', None), ('split', [[1]])]:
            with self.subTest(mode=mode), self.assertRaisesRegex(ValueError, 'header-only'):
                run_transform(source, mode, groups)

    def test_missing_extra_wrong_language_and_raw_policy_fail(self):
        data = policy_data(SIMPLE)
        variants = []
        missing = deepcopy(data); missing['tables'] = {}; variants.append(missing)
        extra = deepcopy(data); extra['tables']['sample-t02'] = extra['tables']['sample-t01']; variants.append(extra)
        wrong = deepcopy(data); wrong['tables']['sample-t01']['zh-CN'] = wrong['tables']['sample-t01'].pop('en'); variants.append(wrong)
        for variant in variants:
            with self.subTest(variant=variant), self.assertRaisesRegex(ValueError, 'inventory'):
                run_transform(SIMPLE, policy=tables.parse_table_policy(json.dumps(variant)))
        with self.assertRaisesRegex(ValueError, 'must be parsed'):
            run_transform(SIMPLE, policy=data)
        for document, language in [('sample/../../', 'en'), ('sample', 'ja')]:
            with self.subTest(document=document, language=language), self.assertRaises(ValueError):
                tables.transform_tables(SIMPLE, source_html=SIMPLE, document_id=document, language=language, policy=policy_for(SIMPLE))

    def test_incomplete_or_extra_split_coverage_fails(self):
        for groups in ([[1]], [[1], [2,3]]):
            with self.subTest(groups=groups), self.assertRaisesRegex(ValueError, 'cover'):
                run_transform(RICH, 'split', groups)

    def test_repeated_block_code_labels_and_keys_fail(self):
        source = SIMPLE.replace('<th>Meaning</th>', '<th><pre><code>Header bytes\n</code></pre></th>')
        with self.assertRaisesRegex(ValueError, 'repeated block-code'):
            run_transform(source)
        key = RICH.replace('<strong id="key-a-strong">A</strong>', '<pre><code>Key bytes\n</code></pre>')
        with self.assertRaisesRegex(ValueError, 'repeated block-code'):
            run_transform(key, 'split', [[1], [2]])
        self.assertIn('Header bytes', run_transform(source, 'table').html)


class FrozenClassificationInventory(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.book = ROOT / 'docs/books/pstack'
        cls.manifest = json.loads((cls.book / 'source-manifest.json').read_text())
        cls.policy = tables.parse_table_policy((cls.book / 'epub-table-policy.json').read_text())
        cls.render = staticmethod(mistune.create_markdown(escape=False, plugins=['table', 'strikethrough']))

    def test_complete_raw_source_inventory_hashes_layouts_and_payloads(self):
        seen = set()
        for language, source_field, expected_total in [('zh-CN','translation_file',103), ('en','english_file',102)]:
            counts = Counter(); row_total = 0; table_total = 0
            files = [('ch'+Path(c[source_field]).name[:2], self.book/c[source_field]) for c in self.manifest['chapters']]
            self.assertEqual(len(files), 48)
            if language == 'zh-CN': files.append(('glossary', self.book/'zh-CN/GLOSSARY.md'))
            for document, path in files:
                raw_html = self.render(path.read_text())
                original = BeautifulSoup(raw_html, 'html.parser')
                result = tables.transform_tables(raw_html, source_html=raw_html, document_id=document, language=language, policy=self.policy)
                output = BeautifulSoup(result.html, 'html.parser')
                for index, table in enumerate(original.select('table'), 1):
                    table_id = f'{document}-t{index:02d}'; seen.add((table_id, language))
                    rule = self.policy.tables[table_id][language]
                    self.assertEqual(rule.source_sha256, source_hash(table), table_id+'/'+language)
                    self.assertTrue(rule.reason.strip())
                    counts[rule.mode] += 1; table_total += 1
                    rows = table.select('tr'); row_total += len(rows)-1
                    for r,row in enumerate(rows):
                        for c,cell in enumerate(row.find_all(['th','td'],recursive=False)):
                            payloads = output.select(f'[data-table-id="{table_id}"][data-source-row="{r}"][data-source-col="{c}"]')
                            self.assertTrue(payloads, f'{table_id}/{language}/{r}/{c}')
                            self.assertEqual([int(p['data-copy']) for p in payloads], list(range(len(payloads))))
                            self.assertTrue(all(p.get_text() == cell.get_text() for p in payloads))
                            self.assertTrue(all(p.decode_contents() == cell.decode_contents() for p in payloads))
                    receipt = result.tables[index-1]
                    self.assertEqual((receipt.layout, receipt.rows, receipt.columns), (rule.mode, len(rows)-1,len(rows[0].select('th'))))
            self.assertEqual(table_total, expected_total)
            self.assertEqual(row_total, 592 if language == 'zh-CN' else 574)
            self.assertEqual(counts, Counter(table=25, split=5, records=73 if language=='zh-CN' else 72))
        self.assertEqual(seen, {(table_id,language) for table_id,rules in self.policy.tables.items() for language in rules})

    def test_critical_editorial_modes_are_explicit(self):
        critical = {'ch04-t01':'table','ch04-t02':'records','ch13-t02':'records',
                    'ch20-t04':'split','ch27-t02':'records','ch29-t01':'records','ch38-t12':'table'}
        for table_id,mode in critical.items():
            for language in ('zh-CN','en'):
                with self.subTest(table=table_id,language=language):
                    self.assertEqual(self.policy.tables[table_id][language].mode, mode)
        self.assertEqual(self.policy.tables['ch20-t04']['en'].groups, ((1,2),(3,4),(5,)))
        self.assertEqual(set(self.policy.tables['glossary-t01']), {'zh-CN'})
        self.assertFalse(any(key.startswith(('readme-', 'image-notes-', 'full-body-')) for key in self.policy.tables))


if __name__ == '__main__':
    unittest.main()
