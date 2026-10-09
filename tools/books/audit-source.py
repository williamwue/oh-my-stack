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
    correction_path = book / 'reviews/ebook-comment-translations.json'
    corrections = {}
    if correction_path.exists():
        correction_report = json.loads(correction_path.read_text())
        for row in correction_report['chapters']:
            require(row['order'] not in corrections, 'duplicate code translation correction chapter')
            corrections[row['order']] = row
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
        correction = corrections.get(order)
        translation_hash = receipt['translation_sha256'] == digest(body.encode())
        if correction:
            review = json.loads((root / chapter['review']['report']).read_text())
            translation_hash = (correction['before_body_sha256'] == receipt['translation_sha256']
                                and correction['after_body_sha256'] == digest(body.encode())
                                and review['translation_sha256'] == digest(body.encode())
                                and review['verdict'] == 'reviewed' and not review['unresolved'])
        structural_body = (re.sub(r'<!-- book-code-note:start -->[\s\S]*?<!-- book-code-note:end -->', '', body)
                           if correction else body)
        a, b = (BeautifulSoup(RENDER(text), 'html.parser') for text in [source_body, structural_body])
        full_translation = BeautifulSoup(RENDER(body), 'html.parser')
        original_codes = [x.get_text() for x in a.select('pre code')]
        translated_codes = [x.get_text() for x in full_translation.select('pre code')]
        code_valid = original_codes == translated_codes
        if correction:
            approved = {}
            for item in correction['rendered_code_changes']:
                require(item['block'] not in approved and item['rationale'].strip(),
                        f'chapter{order}: duplicate or unexplained code correction')
                approved[item['block']] = item
            changed = set()
            code_valid = len(original_codes) == len(translated_codes)
            for block, (before, after) in enumerate(zip(original_codes, translated_codes), 1):
                if before == after:
                    continue
                changed.add(block)
                item = approved.get(block)
                code_valid = code_valid and bool(item and item['before_sha256'] == digest(before.encode())
                                                and item['after_sha256'] == digest(after.encode()))
            code_valid = code_valid and changed == set(approved)
        checks = {
            'source_hash': receipt['source_sha256'] == digest(source_body.encode()),
            'translation_hash': translation_hash,
            'code': code_valid,
            'structure': {tag: len(a.select(tag)) for tag in tags} == {tag: len(b.select(tag)) for tag in tags},
        }
        original, translated = destinations(a), destinations(full_translation)
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
