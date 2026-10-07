"""Exercise EPUB ZIP paths with Windows filesystem paths on any host."""
import ast
import datetime
import hashlib
import html
import importlib.util
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
TOOLS = ROOT / "tools/books"
sys.path.insert(0, str(TOOLS))
from epub_layout import EPUB_CSS, reflow_tables


class WindowsFile:
    def __init__(self, name):
        self.name = name

    def is_file(self):
        return True

    def relative_to(self, folder):
        return PureWindowsPath("images") / self.name

    def read_bytes(self):
        return b"test image bytes"


class WindowsFolder:
    def __truediv__(self, group):
        self.group = group
        return self

    def glob(self, pattern):
        return [WindowsFile("cover.png")] if self.group == "images" else []


class EbookPathsTest(unittest.TestCase):
    def test_packaged_windows_files_have_posix_zip_and_manifest_names(self):
        # Load the real packaging functions without native PDF/font initialization.
        source = ast.parse((TOOLS / "build-pstack-ebooks.py").read_text())
        functions = [node for node in source.body if isinstance(node, ast.FunctionDef)
                     and node.name in {"package_epub", "xhtml"}]
        namespace = dict(globals(), TITLE={"en": "Test book"}, SOURCE_REV="test",
                         sha=lambda value: hashlib.sha256(value).hexdigest())
        with tempfile.TemporaryDirectory() as directory:
            namespace["ROOT"] = Path(directory)
            (Path(directory) / "output/epub").mkdir(parents=True)
            exec(compile(ast.Module(body=functions, type_ignores=[]), "builder", "exec"), namespace)
            artifact = namespace["package_epub"]("en", WindowsFolder(), [], "", None)
            with zipfile.ZipFile(artifact) as epub:
                self.assertIn("OEBPS/images/cover.png", epub.namelist())
                self.assertFalse(any("\\" in name for name in epub.namelist()))
                opf = etree.fromstring(epub.read("OEBPS/content.opf"))
                item = opf.xpath("//*[local-name()='item'][@href='images/cover.png']")[0]
                self.assertEqual(item.get("properties"), "cover-image")

    def test_validator_uses_archive_paths_even_with_windows_path_class(self):
        spec = importlib.util.spec_from_file_location("ebook_validator", TOOLS / "validate-pstack-ebooks.py")
        validator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(validator)
        validator.Path = PureWindowsPath
        for language in ["zh-CN", "en"]:
            with self.subTest(language=language):
                result = validator.validate(language, ROOT / f"output/epub/pstack-{language}.epub")
                self.assertEqual(result["xml_resources_links_code_and_reading_order"], "passed")


if __name__ == "__main__":
    unittest.main()
