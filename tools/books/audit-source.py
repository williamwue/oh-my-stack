#!/usr/bin/env python3
"""Audit frozen sources and assembled translations offline.

Install tools/books/requirements.txt into an isolated Python environment first.
"""
import hashlib
import json
import re
from pathlib import Path

import mistune
from bs4 import BeautifulSoup

SNAPSHOT = 'upstream/books/pstack/2026-10-03'
BOOK = 'docs/books/pstack'
RENDER = mistune.create_markdown(escape=False, plugins=['table', 'strikethrough'])


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def destinations(soup):
    # Markdown escapes apostrophes as %27; do not decode other reserved characters.
    equivalent = lambda value: re.sub('%27', "'", value or '', flags=re.I)
    return {
        'links': [equivalent(x['href']) for x in soup.select('a[href]')
                  if 'header-anchor-link' not in x.get('class', [])],
        'anchors': [x['id'] for x in soup.select('[id]')],
        'images': [(equivalent(x.get('src')), x.get('srcset')) for x in soup.select('img')],
        'embeds': [(equivalent(x.get('src')), x.get('data-content')) for x in soup.select('iframe')],
    }


def audit(root):
    root = Path(root)
    book = root / BOOK
    snap = root / SNAPSHOT
    manifest = json.loads((book / 'source-manifest.json').read_text())
    inventory = json.loads((snap / 'inventory.json').read_text())
    chapters = manifest['chapters']
    require([c['order'] for c in chapters] == list(range(1, 49)), 'manifest coverage must be orders1–48')
    expected = {(n, lang) for n in range(1, 49) for lang in ['ja', 'en']}
    rows = inventory['chapters']
    pairs = [(row['order'], row['language']) for row in rows]
    require(len(pairs) == len(expected) and set(pairs) == expected,
            'inventory coverage must contain exactly96 unique language/order pairs')
    issues = []
    code_count = 0
    for row in rows:
        order, lang = row['order'], row['language']
        chapter = chapters[order - 1]
        base = f'{SNAPSHOT}/{lang}/{order:02}'
        require(row['json'] == base + '.json' and row['markdown'] == base + '.md',
                f'chapter{order} {lang}: incorrect inventory path')
        require(row['source_url'] == chapter[f'source_{lang}'], f'chapter{order} {lang}: source identity mismatch')
        require(row['markdown'] == chapter['source_snapshot'][f'{lang}_file']
                and row['markdown_sha256'] == chapter['source_snapshot'][f'{lang}_sha256'],
                f'chapter{order} {lang}: inventory and manifest disagree')
        raw = (root / row['json']).read_bytes()
        md = (root / row['markdown']).read_bytes()
        require(digest(raw) == row['json_sha256'], f'chapter{order} {lang}: JSON hash mismatch')
        require(digest(md) == row['markdown_sha256'], f'chapter{order} {lang}: Markdown hash mismatch')
        payload = json.loads(raw)['chapter']
        require(all(payload[k] == row[k] for k in ['id', 'slug', 'title'])
                and row['source_url'].endswith('/viewer/' + payload['slug']),
                f'chapter{order} {lang}: raw chapter identity mismatch')
        require(chapter[f'title_{lang}'] == payload['title'],
                f'chapter{order} {lang}: manifest title differs from frozen source')
        require(digest(payload['body_html'].encode()) == row['body_html_sha256'],
                f'chapter{order} {lang}: HTML body hash mismatch')
        source = BeautifulSoup(payload['body_html'], 'html.parser')
        dest = BeautifulSoup(RENDER(md.decode()), 'html.parser')
        sc = [x.get_text() for x in source.select('pre code')]
        dc = [x.get_text() for x in dest.select('pre code')]
        if sc != dc:
            issues.append({'chapter': order, 'lang': lang, 'kind': 'code'})
        code_count += len(sc)
        normalize = lambda soup: re.sub(r'\s+', '', soup.get_text())
        if normalize(source) != normalize(dest):
            issues.append({'chapter': order, 'lang': lang, 'kind': 'rendered-text'})
        original, converted = destinations(source), destinations(dest)
        for kind in original:
            if original[kind] != converted[kind]:
                issues.append({'chapter': order, 'lang': lang, 'kind': kind})

    assets = json.loads((book / 'assets/sources.json').read_text())
    translations = []
    tags = ['h2', 'h3', 'h4', 'p', 'li', 'th', 'td', 'aside', 'details', 'img', 'iframe']
    for chapter in chapters:
        if not chapter.get('translation_file'):
            continue
        order = chapter['order']
        edition = (book / chapter['translation_file']).read_text()
        match = re.search(r'<!-- book-body:start -->\n([\s\S]*?)<!-- book-body:end -->', edition)
        require(match is not None, f'chapter{order}: missing body boundaries')
        body = re.sub(r'\n\n<!-- book-diagram-link:start -->[\s\S]*?<!-- book-diagram-link:end -->', '', match[1])
        for asset in assets:
            body = body.replace('src="../assets/' + asset['file'] + '"', 'src="' + asset['source_url'] + '"')
        source_body = (snap / f'ja/{order:02}.md').read_text()
        receipt = json.loads((book / f'reviews/translator/{order:02}.json').read_text())
        a, b = (BeautifulSoup(RENDER(text), 'html.parser') for text in [source_body, body])
        checks = {
            'source_hash': receipt['source_sha256'] == digest(source_body.encode()),
            'translation_hash': receipt['translation_sha256'] == digest(body.encode()),
            'code': [x.get_text() for x in a.select('pre code')] == [x.get_text() for x in b.select('pre code')],
            'structure': {tag: len(a.select(tag)) for tag in tags} == {tag: len(b.select(tag)) for tag in tags},
        }
        original, translated = destinations(a), destinations(b)
        checks.update({kind: original[kind] == translated[kind] for kind in original})
        translations.append({'chapter': order, 'checks': checks})
        for kind, passed in checks.items():
            if not passed:
                issues.append({'chapter': order, 'lang': 'zh-CN', 'kind': kind})
    for asset in assets:
        if digest((book / 'assets' / asset['file']).read_bytes()) != asset['sha256']:
            issues.append({'asset': asset['file'], 'kind': 'image hash'})
    require(not issues, json.dumps(issues, ensure_ascii=False))
    return {
        'chapters': len(rows), 'source_and_markdown_hashes': 'pass', 'rendered_text': 'pass',
        'source_destinations_and_anchors': 'pass', 'inventory_coverage': 'pass',
        'code_blocks': code_count, 'code_body_equality': 'pass',
        'translated_chapters': len(translations), 'translations': translations,
        'tool': 'mistune3.1.3 and BeautifulSoup4.14.2', 'issues': issues,
    }


if __name__ == '__main__':
    print(json.dumps(audit(Path(__file__).resolve().parents[2]), indent=2))
