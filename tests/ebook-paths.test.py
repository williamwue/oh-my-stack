"""Exercise EPUB ZIP paths with Windows filesystem names on any host."""
import ast
import datetime
import hashlib
import html
import json
from pathlib import Path, PureWindowsPath
import re
import sys
import tempfile
import unittest
import uuid
import zipfile

from bs4 import BeautifulSoup
from lxml import etree

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / 'tools/books'
sys.path.insert(0, str(TOOLS))
from epub_layout import EPUB_CSS
from epub_tables import parse_table_policy
from epub_publication import navigation, title_page, reading_about


class WindowsFont:
    def is_file(self):
        return True

    def relative_to(self, folder):
        return PureWindowsPath('fonts') / 'regular.otf'

    def read_bytes(self):
        return b'test font bytes'


class FontFolder:
    def glob(self, pattern):
        return [WindowsFont()]


class WindowsFolder:
    def __init__(self, path):
        self.path = path

    def __truediv__(self, name):
        return FontFolder() if name == 'fonts' else self.path / name


class EbookPathsTest(unittest.TestCase):
    def test_packaged_windows_files_have_posix_zip_and_manifest_names(self):
        source = ast.parse((TOOLS / 'build-pstack-ebooks.py').read_text())
        functions = [node for node in source.body if isinstance(node, ast.FunctionDef)
                     and node.name in {'package_epub', 'xhtml'}]
        namespace = dict(globals(), TITLE={'en': 'Test book'}, SUB={'en': 'Subtitle'},
                         SOURCE_REV='test', CHAPTERS=[], BOOK=ROOT / 'docs/books/pstack',
                         sha=lambda value: hashlib.sha256(value).hexdigest())
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            (folder / 'images').mkdir()
            cover = folder / 'images/original-cover.jpg'
            cover.write_bytes(b'test original cover')
            exec(compile(ast.Module(body=functions, type_ignores=[]), 'builder', 'exec'), namespace)
            artifact = namespace['package_epub']('en', WindowsFolder(folder), [], '', cover,
                                                 target=folder / 'test.epub')
            with zipfile.ZipFile(artifact) as epub:
                self.assertIn('OEBPS/fonts/regular.otf', epub.namelist())
                self.assertFalse(any('\\' in name for name in epub.namelist()))
                opf = etree.fromstring(epub.read('OEBPS/content.opf'))
                item = opf.xpath("//*[local-name()='item'][@href='images/original-cover.jpg']")[0]
                self.assertEqual(item.get('properties'), 'cover-image')
                self.assertEqual(item.get('media-type'), 'image/jpeg')
                self.assertNotIn('OEBPS/images/cover.png', epub.namelist())


if __name__ == '__main__':
    unittest.main()
