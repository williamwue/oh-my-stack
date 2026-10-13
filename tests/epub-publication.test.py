"""Check actual navigation destinations, sample links and code preservation."""
from pathlib import Path
import sys
import unittest

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools/books'))
from epub_tables import parse_table_policy
from epub_publication import ReadingDocument, navigation, prepare_document


class PublicationTest(unittest.TestCase):
    def test_nested_nav_resolves_parts_chapters_sections_supplements(self):
        catalog = [{'order': 1, 'title_en': 'Preface'}, {'order': 2, 'title_en': 'Part I: Work'},
                   {'order': 3, 'title_en': 'Chapter 1'}, {'order': 4, 'title_en': 'Afterword'}]
        docs = [ReadingDocument(f'ch{i:02}.xhtml', title, '', '<h2 id="section">Topic</h2>')
                for i, title in [(1, 'Preface'), (2, 'Part I'), (3, 'Chapter 1'), (4, 'Afterword')]]
        docs.append(ReadingDocument('glossary.xhtml', 'Glossary', '', '<h2>Words</h2>'))
        nav = BeautifulSoup(navigation(docs, language='en', catalog=catalog), 'html.parser')
        chapter = nav.find('a', href='ch03.xhtml')
        self.assertEqual(chapter.parent.parent.parent.find('a', recursive=False)['href'], 'ch02.xhtml')
        self.assertIsNotNone(chapter.parent.find('a', href='ch03.xhtml#section'))
        self.assertEqual(nav.find('a', href='ch04.xhtml').parent.parent.parent.name, 'nav')
        self.assertEqual(nav.find('a', href='glossary.xhtml').parent.parent.parent.span.text, 'Supplementary material')

    def test_language_label_does_not_change_code_or_add_code_blocks(self):
        raw = '<pre><code class="language-python"><span class="code-line">x = 1\n</span>\nprint(x)\n</code></pre>'
        doc = ReadingDocument('ch99.xhtml', 'Test', raw, raw)
        result, receipts = prepare_document(doc, language='en', book_dir=ROOT / 'docs/books/pstack',
            policy=parse_table_policy('{"version":1,"source_snapshot":"2026-10-03","tables":{}}'),
            selected_documents={'ch99.xhtml'}, catalog=[])
        soup = BeautifulSoup(result.content, 'html.parser')
        self.assertEqual(soup.select_one('pre code').get_text(), BeautifulSoup(raw, 'html.parser').code.get_text())
        self.assertEqual(soup.select_one('.code-language').text, 'python')
        self.assertFalse(soup.select('.code-line'))
        self.assertEqual(len(soup.select('pre code')), 1)
        self.assertEqual(receipts, ())


if __name__ == '__main__':
    unittest.main()
