"""EPUB-only presentation and navigation; reviewed source and PDF stay separate."""
from dataclasses import dataclass
import hashlib
import html
import json
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

from bs4 import BeautifulSoup

from epub_media import prepare_diagram_reading_aids
from epub_tables import transform_tables


@dataclass(frozen=True)
class ReadingDocument:
    filename: str
    title: str
    source_html: str
    content: str


def prepare_document(document, *, language, book_dir, policy, selected_documents, catalog):
    result = transform_tables(document.content, source_html=document.source_html,
                              document_id=PurePosixPath(document.filename).stem,
                              language=language, policy=policy)
    soup = BeautifulSoup(prepare_diagram_reading_aids(
        result.html, book_dir=book_dir, language=language), 'html.parser')
    for element in soup.select('.code-line'):
        classes = [c for c in element.get('class', []) if c != 'code-line']
        if classes:
            element['class'] = classes
        else:
            del element['class']
    for code in soup.select('pre > code'):
        language_names = [c[9:] for c in code.get('class', []) if c.startswith('language-')]
        if language_names:
            label = soup.new_tag('p', attrs={'class': 'code-language'})
            label.string = language_names[0]
            code.parent.insert_before(label)
    by_name = {f'ch{c["order"]:02}.xhtml': c for c in catalog}
    for a in soup.select('a[href]'):
        link = urlsplit(a['href'])
        if link.scheme or not link.path or link.path in selected_documents:
            continue
        if link.path in by_name:
            c = by_name[link.path]
            a['href'] = c['source_ja']
            if link.fragment:
                import mistune
                path = book_dir / c['translation_file' if language == 'zh-CN' else 'english_file']
                import re
                raw = re.search(r'<!-- book-body:start -->\n([\s\S]*?)<!-- book-body:end -->', path.read_text())[1]
                source = BeautifulSoup(mistune.create_markdown(escape=False, plugins=['table', 'strikethrough'])(raw), 'html.parser')
                for anchor in source.select('[id]'):
                    mapped = f'c{c["order"]:02}-a' + hashlib.sha256(unquote(anchor['id']).encode()).hexdigest()[:16]
                    if mapped == link.fragment:
                        a['href'] += '#' + anchor['id']
                        break
    if language == 'zh-CN' and document.filename == 'ch22.xhtml' and 'image-notes.xhtml' in selected_documents:
        figure = next((img.parent for img in soup.select('figure > img')
                       if not img.get('data-original', '').endswith('.svg')), None)
        if figure:
            figure['id'] = 'original-signup-figure'
            note = soup.new_tag('p', attrs={'class': 'edition-navigation'})
            a = soup.new_tag('a', href='image-notes.xhtml#image-notes')
            a.string = '查看图片文字说明'
            note.append(a)
            figure.insert_after(note)
    if language == 'zh-CN' and document.filename == 'image-notes.xhtml' and 'ch22.xhtml' in selected_documents:
        p = soup.new_tag('p', attrs={'class': 'edition-navigation'})
        a = soup.new_tag('a', href='ch22.xhtml#original-signup-figure')
        a.string = '返回原图所在章节'
        p.append(a)
        soup.section.append(p)
    for index, heading in enumerate(soup.select('h2, h3'), 1):
        if not heading.get('id'):
            heading['id'] = f'{PurePosixPath(document.filename).stem}-section-{index}'
    return ReadingDocument(document.filename, document.title, document.source_html, str(soup)), result.tables


def navigation(documents, *, language, catalog):
    """Part > chapter > section hierarchy, keeping the original reading order."""
    soup = BeautifulSoup('', 'html.parser')
    nav = soup.new_tag('nav', attrs={'epub:type': 'toc', 'id': 'toc'})
    title = soup.new_tag('h1'); title.string = '目录' if language == 'zh-CN' else 'Contents'; nav.append(title)
    root = soup.new_tag('ol'); nav.append(root)
    def add(parent, filename, title):
        li = soup.new_tag('li'); a = soup.new_tag('a', href=filename); a.string = title
        li.append(a); parent.append(li)
        return li
    add(root, 'titlepage.xhtml', '书名页' if language == 'zh-CN' else 'Title page')
    add(root, 'about.xhtml', '关于本版' if language == 'zh-CN' else 'About this edition')
    by_name = {d.filename: d for d in documents}
    current_parent = root
    available_names = set(by_name)
    for chapter in catalog:
        name = f'ch{chapter["order"]:02}.xhtml'
        is_part = chapter['title_en'].startswith('Part ')
        if is_part:
            current_parent = root
        if name not in available_names:
            continue
        doc = by_name[name]
        if chapter['title_en'].startswith(('Appendix', 'Afterword')):
            current_parent = root
        item = add(current_parent, name, doc.title)
        if is_part:
            current_parent = soup.new_tag('ol'); item.append(current_parent)
        else:
            sections = BeautifulSoup(doc.content, 'html.parser').select('h2')
            if sections:
                nested = soup.new_tag('ol'); item.append(nested)
                for section in sections:
                    add(nested, name + '#' + section['id'], section.get_text(' ', strip=True))
    extras = [d for d in documents if d.filename not in {f'ch{c["order"]:02}.xhtml' for c in catalog}]
    if extras:
        item = soup.new_tag('li'); label = soup.new_tag('span')
        label.string = '附加资料' if language == 'zh-CN' else 'Supplementary material'; item.append(label); root.append(item)
        nested = soup.new_tag('ol'); item.append(nested)
        for doc in extras:
            add(nested, doc.filename, doc.title)
    return str(nav)


def title_page(language, *, title, subtitle, sample=False):
    if language == 'zh-CN':
        edition = '简体中文 · AI 校对版'
        note = '以日文原书为基准 · 2026-10-03 冻结快照'
        credit = '作者 kaito · 译编与电子书排版 Oh My Stack'
        sample_note = '<p>排版验收样书 · 节选章节</p>' if sample else '<p>完整 48 个目录项</p>'
    else:
        edition = "Author’s English edition"
        note = 'Frozen source edition · 2026-10-03'
        credit = 'Author: kaito · Ebook preparation: Oh My Stack'
        sample_note = '<p>Typography sample · selected entries</p>' if sample else '<p>All 48 contents entries</p>'
    return f'<section class="title-page"><p class="edition-kicker">pstack</p><h1>{html.escape(title)}</h1><p>{html.escape(subtitle)}</p><p>{edition}</p><p>{credit}</p><p class="small">{note}<br/>Reading edition · 2026-10-13</p>{sample_note}</section>'


def reading_about(front, language):
    if language == 'zh-CN':
        return front.replace('EPUB 表格按行展开，每个值附有列名，以适应阅读器的字号和换行。', 'EPUB 保留简短表格的列间对照；宽表按主列拆分，长表改为带列名的条目。正文可随字号重排。宽长图示保留完整原图，并补充可放大的节点与关系文字。封面沿用日文原书封面，本地化书名与译编说明单独列出。')
    return front.replace('EPUB tables appear as labelled rows to accommodate reader font sizes and wrapping.', 'EPUB preserves compact comparison tables, divides wide tables around a repeated key, and presents long tables as labelled entries. Wide or tall diagrams retain their original overview with scalable text describing nodes and relationships. The original Japanese cover is followed by a localized title page.')
