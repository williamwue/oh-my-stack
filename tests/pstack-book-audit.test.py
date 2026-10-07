"""Negative fixtures for the offline book audit (run with unittest)."""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('book_audit', ROOT / 'tools/books/audit-source.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for relative in [module.SNAPSHOT, module.BOOK]:
            shutil.copytree(ROOT / relative, self.root / relative)
        self.inventory_path = self.root / module.SNAPSHOT / 'inventory.json'
        self.inventory = json.loads(self.inventory_path.read_text())

    def write_inventory(self):
        self.inventory_path.write_text(json.dumps(self.inventory))

    def test_empty_inventory_rejected(self):
        self.inventory['chapters'] = []
        self.write_inventory()
        with self.assertRaisesRegex(ValueError, 'inventory coverage'):
            module.audit(self.root)

    def test_duplicate_pair_rejected(self):
        self.inventory['chapters'][-1] = self.inventory['chapters'][0]
        self.write_inventory()
        with self.assertRaisesRegex(ValueError, 'inventory coverage'):
            module.audit(self.root)

    def test_changed_destination_with_updated_hashes_rejected(self):
        row = self.inventory['chapters'][0]
        path = self.root / row['markdown']
        body = path.read_text()
        # Change a destination only, leaving all visible text intact.
        import re
        match = re.search(r'href="([^"]+)"', body)
        self.assertIsNotNone(match)
        body = body[:match.start(1)] + 'https://example.invalid/changed' + body[match.end(1):]
        path.write_text(body)
        row['markdown_sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
        self.write_inventory()
        manifest_path = self.root / module.BOOK / 'source-manifest.json'
        manifest = json.loads(manifest_path.read_text())
        manifest['chapters'][row['order'] - 1]['source_snapshot'][row['language'] + '_sha256'] = row['markdown_sha256']
        manifest_path.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(ValueError, '"kind": "links"'):
            module.audit(self.root)

    def test_english_title_and_heading_drift_rejected(self):
        manifest_path = self.root / module.BOOK / 'source-manifest.json'
        manifest = json.loads(manifest_path.read_text())
        chapter = manifest['chapters'][0]
        chapter['title_en'] = 'Changed English title'
        manifest_path.write_text(json.dumps(manifest))
        path = self.root / module.BOOK / chapter['english_file']
        lines = path.read_text().splitlines(keepends=True)
        lines[0] = '# Changed English title\n'
        path.write_text(''.join(lines))
        with self.assertRaisesRegex(ValueError, 'manifest title differs from frozen source'):
            module.audit(self.root)

    def test_media_and_anchor_signatures_include_destinations(self):
        soup = lambda value: module.BeautifulSoup(value, 'html.parser')
        original = module.destinations(soup('<h2 id="first">Title</h2><img src="a.png"><iframe src="a" data-content="one"></iframe>'))
        changed = module.destinations(soup('<h2 id="second">Title</h2><img src="b.png"><iframe src="b" data-content="two"></iframe>'))
        for key in ['anchors', 'images', 'embeds']:
            self.assertNotEqual(original[key], changed[key], key)

    def make_comment_correction(self):
        import re
        book = self.root / module.BOOK
        manifest = json.loads((book / 'source-manifest.json').read_text())
        chapter = manifest['chapters'][3]
        path = book / chapter['translation_file']
        original = path.read_text()
        source = (self.root / module.SNAPSHOT / 'ja/04.md').read_text()
        original_code = module.BeautifulSoup(module.RENDER(source), 'html.parser').select('pre code')[0].get_text()
        corrected_code = original_code.replace('このコマンドにJSON出力を加えて。', '给这个命令添加 JSON 输出。')
        changed = re.sub(r'(```[^\n]*\n)([\s\S]*?)(\n```)',
                         lambda match: match[1] + corrected_code.rstrip('\n') + match[3], original, count=1)
        self.assertNotEqual(original, changed)
        path.write_text(changed)
        body = re.search(r'<!-- book-body:start -->\n([\s\S]*?)<!-- book-body:end -->', changed)[1]
        receipt = json.loads((book / 'reviews/translator/04.json').read_text())
        code = module.BeautifulSoup(module.RENDER(body), 'html.parser').select('pre code')[0].get_text()
        report_path = book / 'reviews/ebook-comment-translations.json'
        report = json.loads(report_path.read_text()) if report_path.exists() else {'chapters': []}
        entry = {'order': 4, 'before_body_sha256': receipt['translation_sha256'],
                 'after_body_sha256': module.digest(body.encode()),
                 'rendered_code_changes': [{'block': 1, 'before_sha256': module.digest(original_code.encode()),
                                           'after_sha256': module.digest(code.encode()),
                                           'rationale': 'Translate explanatory comment'}]}
        report['chapters'] = [item for item in report['chapters'] if item['order'] != 4] + [entry]
        report_path.write_text(json.dumps(report))
        review_path = self.root / chapter['review']['report']
        review = json.loads(review_path.read_text())
        review['translation_sha256'] = module.digest(body.encode())
        review_path.write_text(json.dumps(review))
        return path, report_path, report, review_path, review

    def test_hash_bound_comment_correction_preserves_historical_receipt(self):
        receipt = self.root / module.BOOK / 'reviews/translator/04.json'
        before = receipt.read_bytes()
        self.make_comment_correction()
        self.assertEqual(module.audit(self.root)['issues'], [])
        self.assertEqual(receipt.read_bytes(), before)

    def test_unrecorded_code_change_is_rejected_after_body_hash_refresh(self):
        import re
        path, report_path, report, review_path, review = self.make_comment_correction()
        changed = path.read_text().replace('/poteto-mode add json output', '/poteto-mode delete json output')
        path.write_text(changed)
        body = re.search(r'<!-- book-body:start -->\n([\s\S]*?)<!-- book-body:end -->', changed)[1]
        next(item for item in report['chapters'] if item['order'] == 4)['after_body_sha256'] = module.digest(body.encode())
        review['translation_sha256'] = module.digest(body.encode())
        report_path.write_text(json.dumps(report))
        review_path.write_text(json.dumps(review))
        with self.assertRaisesRegex(ValueError, '"kind": "code"'):
            module.audit(self.root)

    def test_note_markup_cannot_hide_code_or_link_changes(self):
        import re
        path, report_path, report, review_path, review = self.make_comment_correction()
        corrected = path.read_text()
        for addition, kind in [
            ('```js\ndeleteAllRecords();\n```', 'code'),
            ('[Unexpected destination](https://example.invalid/unreviewed)', 'links'),
        ]:
            with self.subTest(kind=kind):
                changed = corrected.replace('<!-- book-body:end -->',
                    '<!-- book-code-note:start -->\n' + addition + '\n<!-- book-code-note:end -->\n<!-- book-body:end -->')
                path.write_text(changed)
                body = re.search(r'<!-- book-body:start -->\n([\s\S]*?)<!-- book-body:end -->', changed)[1]
                next(item for item in report['chapters'] if item['order'] == 4)['after_body_sha256'] = module.digest(body.encode())
                review['translation_sha256'] = module.digest(body.encode())
                report_path.write_text(json.dumps(report))
                review_path.write_text(json.dumps(review))
                with self.assertRaisesRegex(ValueError, '"kind": "' + kind + '"'):
                    module.audit(self.root)


if __name__ == '__main__':
    unittest.main()
