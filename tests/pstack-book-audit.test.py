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


if __name__ == '__main__':
    unittest.main()
