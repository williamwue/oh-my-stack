#!/usr/bin/env python3
"""Assemble English sources and completed Chinese bodies without fetching content.

Run from any directory. Chinese drafts are accepted only with a matching self-check
receipt under .tmp/pstack-book; reruns preserve existing public bodies when no new
receipt is present. This operation never grants reviewed/ready status.
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BOOK = ROOT / 'docs/books/pstack'
SNAP = ROOT / 'upstream/books/pstack/2026-10-03'
TEMP = ROOT / '.tmp/pstack-book'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def filename(order):
    return '01-preface.md' if order == 1 else f'{order:02d}-chapter.md'


def main():
    manifest = json.loads((BOOK / 'source-manifest.json').read_text())
    inventory = json.loads((SNAP / 'inventory.json').read_text())
    sources = {(c['order'], c['language']): c for c in inventory['chapters']}
    for chapter in manifest['chapters']:
        order = chapter['order']
        chapter['source_snapshot'] = {}
        for language in ['ja', 'en']:
            source = sources[order, language]
            data = (ROOT / source['markdown']).read_bytes()
            assert digest(data) == source['markdown_sha256'], f'Source drift: {order} {language}'
            chapter['source_snapshot'].update({f'{language}_file': source['markdown'], f'{language}_sha256': digest(data)})
        chapter['source_body_observed_on'] = '2026-10-03'
        chapter['source_updated_on'] = sources[order, 'ja']['source_updated_at']
        chapter.setdefault('english_status', 'imported')
        chapter['english_file'] = f'en/{filename(order)}'
        chapter.setdefault('review', {'status': 'not_started', 'report': None})
        draft = TEMP / f'translations/{order:02d}.md'
        receipt = TEMP / f'translation-reports/{order:02d}.json'
        if draft.exists() and receipt.exists():
            report = json.loads(receipt.read_text())
            assert report['source_sha256'] == sources[order, 'ja']['markdown_sha256'], f'Stale draft {order}'
            assert report['translation_sha256'] == digest(draft.read_bytes()), f'Draft receipt mismatch {order}'
            chapter['translation_file'] = f'zh-CN/{filename(order)}'
            report_dir = BOOK / 'reviews/translator'
            old_receipt = report_dir / f'{order:02d}.json'
            previous_hash = json.loads(old_receipt.read_text()).get('translation_sha256') if old_receipt.exists() else None
            if previous_hash != report['translation_sha256']:
                chapter['translation_status'] = 'draft'
                chapter['review'] = {'status': 'not_started', 'report': None}
                if chapter['english_status'] == 'ready':
                    chapter['english_status'] = 'imported'
            report_dir.mkdir(parents=True, exist_ok=True)
            (report_dir / f'{order:02d}.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    diagrams = json.loads((BOOK / 'diagrams/content.json').read_text())
    for key, content in diagrams.items():
        order = int(key.split('-')[0])
        chapter = manifest['chapters'][order - 1]
        for language in ['en', 'zh-CN']:
            target = BOOK / 'diagrams' / language / f'{key}.md'
            target.parent.mkdir(parents=True, exist_ok=True)
            back = chapter.get('english_file' if language == 'en' else 'translation_file') or f'{language}/README.md'
            title = ('图示 ' if language == 'zh-CN' else 'Figure ') + key
            target.write_text(f'# {title}\n\n[返回章节 / Back to chapter](../../{back})\n\n作者：kaito · [日文来源]({chapter["source_ja"]}) · [English source]({chapter["source_en"]})\n\n```mermaid\n{content[language]}\n```\n')
    for chapter in manifest['chapters']:
        order = chapter['order']
        for language in ['en', 'zh-CN']:
            key = 'english_file' if language == 'en' else 'translation_file'
            if not chapter.get(key):
                continue
            dest = BOOK / chapter[key]
            if language == 'en':
                body = (ROOT / sources[order, 'en']['markdown']).read_text()
            else:
                draft = TEMP / f'translations/{order:02d}.md'
                receipt = TEMP / f'translation-reports/{order:02d}.json'
                if not (draft.exists() and receipt.exists()):
                    continue
                body = draft.read_text()
            for asset in json.loads((BOOK / 'assets/sources.json').read_text()):
                body = body.replace('src="' + asset['source_url'] + '"', 'src="../assets/' + asset['file'] + '"')
            diagram_number = 0
            def diagram_link(match):
                nonlocal diagram_number
                diagram_number += 1
                key = f'{order:02d}-{diagram_number:02d}'
                assert key in diagrams
                label = '查看图示' if language == 'zh-CN' else 'View diagram'
                return match[0] + f'\n\n<!-- book-diagram-link:start -->\n![{label} {diagram_number}](../diagrams/{language}/{key}.svg)\n\n[{label} {diagram_number}](../diagrams/{language}/{key}.md)\n<!-- book-diagram-link:end -->'
            body = re.sub(r'<span class="[^"]*zenn-embedded-mermaid[^"]*">.*?</span>', diagram_link, body)
            zh = language == 'zh-CN'
            title = chapter['title_zh_cn' if zh else 'title_en']
            nav = ['[目录](README.md)' if zh else '[Contents](README.md)']
            for adjacent, label in [(order - 1, '上一篇' if zh else 'Previous'), (order + 1, '下一篇' if zh else 'Next')]:
                if 1 <= adjacent <= 48 and manifest['chapters'][adjacent - 1].get(key):
                    nav.append(f'[{label}]({filename(adjacent)})')
            other = 'en' if zh else 'zh-CN'
            other_key = 'english_file' if zh else 'translation_file'
            counterpart = filename(order) if chapter.get(other_key) else 'README.md'
            nav.append(f'[{"English" if zh else "简体中文"}](../{other}/{counterpart})')
            navtext = ' · '.join(nav)
            attribution = (f'作者：kaito · [日文原文]({chapter["source_ja"]}) · [作者英文版]({chapter["source_en"]})\n\n'
                           '来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。') if zh else (
                           f'By kaito · [Japanese original]({chapter["source_ja"]}) · [Author’s English edition]({chapter["source_en"]})\n\n'
                           'Source snapshot: 2026-10-03. The text below preserves the author’s English edition.')
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(f'# {title}\n\n{navtext}\n\n{attribution}\n\n[Authorization / 授权记录](../AUTHORIZATION.md)\n\n<!-- book-body:start -->\n{body.rstrip()}\n<!-- book-body:end -->\n\n---\n\n{navtext}\n')
    for language, key in [('en', 'english_file'), ('zh-CN', 'translation_file')]:
        zh = language == 'zh-CN'
        count = sum(bool(c.get(key)) for c in manifest['chapters'])
        reviewed = sum(c['translation_status'] in ['reviewed', 'ready'] for c in manifest['chapters'])
        intro = (f'# pstack：AI Agent 开发环境实践\n\n作者：kaito。中文翻译整理：Oh My Stack（AI 辅助）。\n\n已收录 {count}/48 篇中文译稿；尚未完成人工终审。' if zh else
                 f'# The pstack book by kaito\n\nAll {count}/48 entries of the author’s English edition, archived on 2026-10-03.')
        if zh:
            intro += f'独立 AI 对照校对已完成 {reviewed}/48 篇。\n\n[术语表](GLOSSARY.md) · [图片文字说明](../assets/README.md) · [状态含义](../TRANSLATION.md)'
        rows = []
        for c in manifest['chapters']:
            title = c['title_zh_cn' if zh else 'title_en']
            label = f'[{title}]({filename(c["order"])})' if c.get(key) else title
            state = c['translation_status' if zh else 'english_status']
            rows.append(f'| {c["order"]:02d} | {label} | {state} |')
        (BOOK / language).mkdir(exist_ok=True)
        (BOOK / language / 'README.md').write_text(intro + '\n\n[Book home / 书籍首页](../README.md) · [授权与来源](../AUTHORIZATION.md) · [Oh My Stack companion](../companion/README.md)\n\n| # | Chapter / 章节 | Status / 状态 |\n| --- | --- | --- |\n' + '\n'.join(rows) + '\n')
    (BOOK / 'source-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'english': 48, 'chinese_drafts': sum(bool(c.get('translation_file')) for c in manifest['chapters'])}))


if __name__ == '__main__':
    main()
