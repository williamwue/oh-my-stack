#!/usr/bin/env python3
"""Build the complete pstack reading editions from reviewed local sources."""
from pathlib import Path
import re,json,hashlib,html,zipfile,uuid,datetime,logging,sys,copy,subprocess,argparse
from epub_layout import EPUB_CSS, reflow_tables
from urllib.parse import urlsplit,unquote
import mistune
from bs4 import BeautifulSoup,Comment
from lxml import etree
from fontTools import subset
from fontTools.ttLib import TTFont
import pymupdf
from PIL import Image
from weasyprint import HTML,CSS
from weasyprint.text.fonts import FontConfiguration

ROOT=Path(__file__).resolve().parents[2]; BOOK=ROOT/'docs/books/pstack'; BUILD=ROOT/'.tmp/ebook-build'; ASSETS=ROOT/'.tmp/ebook-assets'
MAN=json.loads((BOOK/'source-manifest.json').read_text()); CHAPTERS=MAN['chapters']; SOURCE_REV=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
RENDER=mistune.create_markdown(escape=False,plugins=['table','strikethrough'])
FONT=FontConfiguration()
logging.getLogger('weasyprint').setLevel(logging.ERROR)
TITLE={'zh-CN':'pstack：AI Agent 开发环境实践','en':'The pstack Book'}
SUB={'zh-CN':'构建可验证、可委托的开发环境','en':'Building an environment for development with AI agents'}
EDITION={'zh-CN':'简体中文 · AI 校对版','en':"Author's English edition"}
FONT_CSS='''@font-face{font-family:Book;src:url("fonts/regular.otf")}@font-face{font-family:Book;src:url("fonts/bold.otf");font-weight:700}@font-face{font-family:BookMono;src:url("fonts/mono.otf")}'''
COMMON='''*{box-sizing:border-box}html{font-family:Book,sans-serif;color:#21313a}body{margin:0}p,li{line-height:1.72}p{margin:0 0 .8em}a{color:#17666a;text-decoration:none;overflow-wrap:anywhere}h1,h2,h3,h4{font-weight:700;line-height:1.35;color:#163e48}h1{font-size:25pt;margin:0 0 14pt}h2{font-size:16pt;margin:22pt 0 10pt}h3{font-size:12pt;margin:16pt 0 8pt}h4{font-size:11pt}h1,h2,h3,h4{break-after:avoid}strong{font-weight:700}ul,ol{padding-left:1.5em;margin:.6em 0 1em}li{margin:.25em 0}blockquote,aside{margin:12pt 0;padding:10pt 13pt;border-left:3pt solid #398382;background:#f0f5f4}blockquote p:last-child,aside p:last-child{margin-bottom:0}.msg-symbol{display:none}code{font-family:BookMono,Book,monospace;font-size:.87em;overflow-wrap:anywhere}pre{font-family:BookMono,Book,monospace;font-size:8.1pt;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-all;background:#f3f5f6;padding:10pt;border-left:2pt solid #cedbdd;margin:12pt 0;tab-size:2}pre code{font-size:inherit;white-space:inherit;line-height:inherit}table{width:100%;border-collapse:collapse;margin:12pt 0;table-layout:fixed;font-size:8.3pt;line-height:1.55}th,td{border:0.5pt solid #ccd8da;padding:6pt;vertical-align:top;overflow-wrap:anywhere}th{background:#eaf1f1;font-weight:700}thead{display:table-header-group}tr{break-inside:avoid}td p{margin:0 0 5pt}figure{margin:16pt 0;break-inside:avoid;text-align:center}figure img{max-width:100%;height:auto}figcaption{font-size:8pt;color:#5b6d75;margin-top:7pt;line-height:1.5}.disclosure-title{font-weight:700;color:#396b71;font-size:9pt;margin:12pt 0 6pt}.source-line{font-size:8pt;color:#657880;border-bottom:1pt solid #dce7e7;padding-bottom:12pt;margin-bottom:20pt}.chapter{break-before:page}.running{font-size:8pt;letter-spacing:.7pt;color:#55767c;margin-bottom:12pt;string-set:chapter attr(data-running)}.toc a{color:#21313a}.toc ol{list-style:none;padding:0}.toc li{font-size:10pt;margin:0;padding:5pt 0;border-bottom:.4pt solid #e3eaea}.cover{background:#142e3b;color:#fff;padding:27mm 23mm;border-left:8mm solid #2d8384;height:260mm}.cover .eyebrow{letter-spacing:2pt;font-size:10pt;color:#b2d8d2;margin:0 0 40mm}.cover .brand{font-weight:700;font-size:58pt;line-height:1;color:#fff;margin-bottom:16mm}.cover h1{color:#fff;font-size:27pt;line-height:1.5}.cover .subtitle{color:#c9dcdf;font-size:15pt;line-height:1.7}.cover .author{margin-top:30mm;font-size:17pt}.cover .edition{font-size:10pt;color:#bdd4d9;margin-top:8mm}.cover .bottom{font-size:8pt;color:#91b7bd;margin-top:14mm}.edition-page{break-before:page}.edition-page h1{font-size:24pt}.small{font-size:9pt;color:#5a6e78}.cover h1{bookmark-level:none}'''
PDF_CSS=FONT_CSS+COMMON+'''@page{size:190mm 260mm;margin:19mm 19mm 19mm;@top-left{content:string(chapter);font-family:Book;font-size:7pt;color:#637a80}@bottom-left{content:"pstack / kaito";font-family:Book;font-size:7pt;color:#637a80}@bottom-right{content:counter(page);font-family:Book;font-size:8pt;color:#264f59}}@page cover{margin:0;@top-left{content:none}@bottom-left{content:none}@bottom-right{content:none}}@page wide{size:A4 landscape;margin:18mm;@top-left{content:string(chapter)} }body{font-size:10.4pt}.cover{page:cover}.toc{break-before:page}.toc a::after{content:leader('.') target-counter(attr(href),page);font-size:9pt}.chapter>h1{bookmark-level:1}h2{bookmark-level:2}h3,h4{bookmark-level:none}.wide{page:wide;break-before:page;break-after:page}.wide img{max-height:148mm}.part-figure{break-before:page;break-after:page}.part-figure img{max-height:195mm}.section-label{font-size:9pt;color:#55767c;margin-bottom:8pt}'''
# EPUB styles are intentionally separate from the fixed PDF page styles.

def sha(b):return hashlib.sha256(b).hexdigest()
def ident(order,raw):return f'c{order:02}-a'+sha(unquote(raw).encode())[:16]
def parse_body(c,lang):
 p=BOOK/c['translation_file' if lang=='zh-CN' else 'english_file'];text=p.read_text();body=re.search(r'<!-- book-body:start -->\n([\s\S]*?)<!-- book-body:end -->',text)[1]
 return p,BeautifulSoup(RENDER(body),'html.parser')
def make_fonts(folder,text):
 (folder/'fonts').mkdir(exist_ok=True)
 chars=set(map(ord,text));chars.update(range(32,127));chars.update(map(ord,'→←•·…0123456789'))
 for weight,name in [('regular','Regular'),('bold','Bold'),('mono','Mono')]:
  font=TTFont(ASSETS/('NotoSansMonoCJKsc-Regular.otf' if name=='Mono' else f'NotoSansCJKsc-{name}.otf'));options=subset.Options();options.retain_gids=True;options.layout_features=['*'];sub=subset.Subsetter(options);sub.populate(unicodes=chars);sub.subset(font);font.save(folder/f'fonts/{weight}.otf')
 (folder/'fonts/OFL.txt').write_bytes((ASSETS/'OFL.txt').read_bytes())

def diagram_png(source,target,folder):
 svg=BeautifulSoup(source.read_text(),'xml').svg;box=list(map(float,svg['viewBox'].split()));w,h=box[2:]
 subprocess.run(['node',str(ROOT/'tools/books/render-pstack-svg.cjs'),str(source),str(target),str(ASSETS/'NotoSansCJKsc-Regular.otf')],check=True)
 return w,h

def make_content(lang,folder):
 prepared=[];source_url_map={c[k]:c['order'] for c in CHAPTERS for k in ['source_ja','source_en']};idsets={};stats=[]
 for c in CHAPTERS:
  p,s=parse_body(c,lang);idsets[c['order']]={unquote(x['id']) for x in s.select('[id]')};prepared.append((c,p,s))
 outputs=[]
 for c,p,s in prepared:
  order=c['order'];original_codes=[x.get_text() for x in s.select('pre code')];original_text=re.sub(r'\s+','',s.get_text())
  for x in s.find_all(string=lambda t:isinstance(t,Comment)):x.extract()
  for x in s.select('iframe'):x.decompose()
  for x in s.select('details'):x.name='section';x.attrs={}
  for x in s.select('summary'):x.name='p';x.attrs={'class':'disclosure-title'}
  for x in s.select('a[href]'):
   href=x['href'];parts=urlsplit(href);target=None
   if href.startswith('#'):target=order
   elif parts.scheme in ['http','https'] and parts._replace(fragment='',query='').geturl() in source_url_map:target=source_url_map[parts._replace(fragment='',query='').geturl()]
   if target is not None:
    fragment=unquote(parts.fragment)
    if not fragment or fragment in idsets[target]:x['href']=f'ch{target:02}.xhtml'+('#'+ident(target,fragment) if fragment else '')
   elif not parts.scheme and not href.startswith('#'):
    local=(p.parent/unquote(parts.path)).resolve()
    x['href']='https://github.com/williamwue/oh-my-stack/blob/'+SOURCE_REV+'/'+str(local.relative_to(ROOT)).replace(' ','%20')+('#'+parts.fragment if parts.fragment else '')
  for x in s.select('[id]'):x['id']=ident(order,x['id'])
  image_count=0
  for x in s.select('img'):
   origin=(p.parent/unquote(x['src'])).resolve();assert origin.is_relative_to(BOOK)
   name=(f'diagram-{origin.parent.name}-{origin.stem}.png' if origin.suffix=='.svg' else origin.name)
   target=folder/'images'/name
   if origin.suffix=='.svg':w,h=diagram_png(origin,target,folder)
   else:target.write_bytes(origin.read_bytes());w,h=Image.open(target).size
   x.attrs={'src':'images/'+name,'alt':x.get('alt') or ('图示' if lang=='zh-CN' else 'Diagram')};x['data-original']=str(origin.relative_to(BOOK));fig=s.new_tag('figure');x.wrap(fig);image_count+=1
   if origin.suffix=='.svg':
    vb=BeautifulSoup(origin.read_text(),'xml').svg['viewBox'].split();fig['data-w']=vb[2];fig['data-h']=vb[3]
  # Strip browser-only attributes. XML output retains only HTML attributes supported in reading systems.
  for x in s.find_all():
   for attr in list(x.attrs):
    if attr.startswith('data-') and attr not in ['data-w','data-h','data-original']:del x[attr]
    elif attr in ['target','rel','loading','style','frameborder','scrolling','align','width','height']:del x[attr]
  assert [x.get_text() for x in s.select('pre code')]==original_codes,(order,'code drift')
  assert re.sub(r'\s+','',s.get_text())==original_text,(order,'text drift')
  title=c['title_zh_cn' if lang=='zh-CN' else 'title_en'];source_label='来源：' if lang=='zh-CN' else 'Sources: '
  wrapper=BeautifulSoup('<section class="chapter"></section>','html.parser');section=wrapper.section;section['id']=f'ch{order:02}';run=wrapper.new_tag('p',attrs={'class':'running','data-running':f'pstack / {order:02}'});run.string=f'{order:02} / '+('正文' if lang=='zh-CN' else 'TEXT');section.append(run);h1=wrapper.new_tag('h1');h1.string=title;section.append(h1)
  line=wrapper.new_tag('p',attrs={'class':'source-line'});line.append('kaito · '+source_label)
  for k,label in [('source_ja','日本語'),('source_en','English')]:
   a=wrapper.new_tag('a',href=c[k]);a.string=label;line.append(a);line.append(' · ')
  line.append('2026-10-03');section.append(line)
  for child in list(s.contents):section.append(child.extract())
  outputs.append((f'ch{order:02}.xhtml',title,str(wrapper)))
  stats.append({'order':order,'edition_file':str(p.relative_to(ROOT)),'edition_sha256':sha(p.read_bytes()),'code_blocks':len(original_codes),'images':image_count,'text_and_code_preserved':True})
 return outputs,stats

def xhtml(title,content,lang,stylesheet='book.css'):
 raw=f'<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="{lang}" xml:lang="{lang}"><head><meta charset="utf-8"/><title>{html.escape(title)}</title><link rel="stylesheet" type="text/css" href="{stylesheet}"/></head><body>{content}</body></html>'
 # HTML parser first repairs void elements and entities, then XML serialization.
 soup=BeautifulSoup(raw,'html.parser')
 for fig in soup.select('p > figure'):fig.parent.name='div'
 for x in soup.select('[data-original]'):del x['data-original']
 for x in soup.select('[data-w]'):del x['data-w'];del x['data-h']
 return str(soup).replace('<!DOCTYPE html>','<!DOCTYPE html>')

def about(lang):
 if lang=='zh-CN':
  return '''<section class="edition-page" id="edition"><h1>关于本版</h1><p>作者：kaito<br/>中文翻译整理：Oh My Stack（AI 辅助）</p><p>本版收录完整的 48 个目录项，包括 39 个编号章节、开篇、分部导言、附录与后记。中文译文以日文为基准，参考作者英文版校对；已完成逐篇 AI 对照校对，尚未完成人工终审。正文中的第一人称仍指原作者。</p><h2>来源与授权</h2><p>书籍正文采用 2026-10-03 的冻结快照。维护者报告已获得作者私聊口头许可，可推出中英文版本。本书与译文不因收录进 Oh My Stack 而自动采用该项目的 MIT 许可。原书第三方引用、代码与图片仍保留各自出处。</p><h2>电子书阅读说明</h2><p>网页折叠代码在本版中全部展开。可执行语法、命令、标识符和影响行为的示例值保持原文；说明性注释和提示词模板已翻译为中文。长行在 PDF 中按页面宽度折行。EPUB 表格按行展开，每个值附有列名，以适应阅读器的字号和换行。图表和原图随书附带；外部文章、视频和社交媒体内容保留链接，访问时仍需联网。图片中的原文可参考书末的中文说明。</p><p>本书讨论的 pstack 参考版本为 0.15.5。Oh My Stack 的运行时行为以项目文档为准。</p><p><a href="https://github.com/williamwue/oh-my-stack/blob/main/docs/books/pstack/AUTHORIZATION.md">完整授权与来源记录</a> · <a href="https://github.com/williamwue/oh-my-stack/tree/main/docs/books/pstack">在线阅读与校对记录</a></p><p class="small">电子书排版：Oh My Stack。内嵌 Noto Sans CJK 字体采用 SIL Open Font License 1.1。字体许可不适用于书籍正文。</p></section>'''
 return '''<section class="edition-page" id="edition"><h1>About this edition</h1><p>Author: kaito<br/>Ebook preparation: Oh My Stack</p><p>This edition contains all 48 contents entries, including 39 numbered chapters, the preface, part introductions, appendix and afterword. It reproduces the author's English edition from the frozen October 3, 2026 snapshot. First-person statements in the book refer to the author.</p><h2>Sources and permission</h2><p>The maintainer reports the author's private verbal permission to publish English and Chinese editions. Inclusion in Oh My Stack does not place the book under the project's MIT license. Third-party quotations, code and images retain their respective attribution.</p><h2>Reading this ebook</h2><p>Collapsed code examples are expanded. Original code is unchanged; long lines wrap in the PDF. EPUB tables appear as labelled rows to accommodate reader font sizes and wrapping. Diagrams and original images are included. External articles, videos and social posts retain their links and require an internet connection. The associated Simplified Chinese translation has AI review records and awaits human editorial review.</p><p>The book discusses pstack 0.15.5. Consult the project's documentation for Oh My Stack runtime behavior.</p><p><a href="https://github.com/williamwue/oh-my-stack/blob/main/docs/books/pstack/AUTHORIZATION.md">Authorization and sources</a> · <a href="https://github.com/williamwue/oh-my-stack/tree/main/docs/books/pstack">Online editions and review records</a></p><p class="small">Typeset by Oh My Stack. Embedded Noto Sans CJK fonts use the SIL Open Font License 1.1. This font license does not apply to the book.</p></section>'''

def cover(lang):
 headline='AI Agent<br/>开发环境实践' if lang=='zh-CN' else 'Build an environment<br/>you can trust'
 return f'<section class="cover"><p class="eyebrow">OH MY STACK / READING EDITION</p><p class="brand">pstack</p><h1>{headline}</h1><p class="subtitle">{SUB[lang]}</p><p class="author">kaito</p><p class="edition">{EDITION[lang]}</p><p class="bottom">SOURCE EDITION / 2026-10-03<br/>48 ENTRIES · COMPLETE TEXT</p></section>'

def package_epub(lang,folder,chapters,front,cover_png):
 navitems=[('about.xhtml','关于本版' if lang=='zh-CN' else 'About this edition')]+[(n,t) for n,t,b in chapters]
 nav='<nav epub:type="toc" id="toc"><h1>'+('目录' if lang=='zh-CN' else 'Contents')+'</h1><ol>'+''.join(f'<li><a href="{n}">{html.escape(t)}</a></li>' for n,t in navitems)+'</ol></nav>'
 files={'cover.xhtml':xhtml(TITLE[lang],'<section><img class="cover-image" src="images/cover.png" alt="'+html.escape(TITLE[lang],quote=True)+'"/></section>',lang),'about.xhtml':xhtml(TITLE[lang],front,lang),'nav.xhtml':xhtml('Contents',nav,lang),'book.css':EPUB_CSS}
 for n,t,b in chapters:files[n]=xhtml(t,reflow_tables(b),lang)
 # Confirm every generated XHTML parses as XML before packaging.
 for n,t in files.items():
  if n.endswith('.xhtml'):etree.fromstring(t.encode())
 mimetypes={'.otf':'font/otf','.png':'image/png','.txt':'text/plain'}
 binaries={str(p.relative_to(folder)):p.read_bytes() for path in ['images','fonts'] for p in (folder/path).glob('*') if p.is_file() and not re.search(r'-part[0-9]+\.png$',p.name)}
 manifest=[];spine=[]
 for i,(name,data) in enumerate(files.items()):
  props=' properties="nav"' if name=='nav.xhtml' else '';media='application/xhtml+xml' if name.endswith('.xhtml') else 'text/css';manifest.append(f'<item id="f{i}" href="{name}" media-type="{media}"{props}/>')
  if name in ['cover.xhtml','about.xhtml','nav.xhtml'] or name.endswith('.xhtml') and name not in ['cover.xhtml','about.xhtml','nav.xhtml']:spine.append(f'<itemref idref="f{i}"/>')
 for i,(name,data) in enumerate(binaries.items()):
  props=' properties="cover-image"' if name=='images/cover.png' else '';manifest.append(f'<item id="b{i}" href="{name}" media-type="{mimetypes[Path(name).suffix]}"{props}/>')
 # Layout-only changes must receive a new identifier as well as text changes.
 identity=json.dumps(files,sort_keys=True,ensure_ascii=False).encode()
 uid='urn:uuid:'+str(uuid.uuid5(uuid.NAMESPACE_URL,'https://github.com/williamwue/oh-my-stack/pstack/'+lang+'/'+sha(identity)))
 modified=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
 opf=f'''<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="{lang}"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">{uid}</dc:identifier><dc:title>{html.escape(TITLE[lang])}</dc:title><dc:creator>kaito</dc:creator><dc:language>{lang}</dc:language><dc:publisher>Oh My Stack</dc:publisher><dc:source>https://github.com/williamwue/oh-my-stack/tree/{SOURCE_REV}/docs/books/pstack</dc:source><dc:rights>Author permission reported by the maintainer. Book content is not licensed under the project MIT license.</dc:rights><meta property="dcterms:modified">{modified}</meta></metadata><manifest>{''.join(manifest)}</manifest><spine>{''.join(spine)}</spine></package>'''
 target=ROOT/f'output/epub/pstack-{lang}.epub'
 with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
  z.writestr('mimetype','application/epub+zip',compress_type=zipfile.ZIP_STORED)
  z.writestr('META-INF/container.xml','<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
  z.writestr('OEBPS/content.opf',opf)
  for n,d in {**files,**binaries}.items():z.writestr('OEBPS/'+n,d)
 return target

def main(lang,formats):
 folder=BUILD/lang;folder.mkdir(parents=True,exist_ok=True);(folder/'images').mkdir(exist_ok=True)
 text=''.join((BOOK/c['translation_file' if lang=='zh-CN' else 'english_file']).read_text() for c in CHAPTERS)+about(lang)+cover(lang)+''.join(p.read_text() for p in (BOOK/'diagrams'/lang).glob('*.md'))
 text+=''.join(p.read_text() for p in [BOOK/'zh-CN/GLOSSARY.md',BOOK/'assets/README.md'])+'关于本版目录中文图片说明第部分图续'
 make_fonts(folder,text);print(lang,'fonts ready',flush=True)
 chapters,stats=make_content(lang,folder);print(lang,'48 chapters and images ready',flush=True)
 if lang=='zh-CN':
  for fn,title,path in [('glossary.xhtml','附加资料：术语表',BOOK/'zh-CN/GLOSSARY.md'),('image-notes.xhtml','附加资料：图片文字说明',BOOK/'assets/README.md')]:
   soup=BeautifulSoup(RENDER(path.read_text()),'html.parser')
   for a in soup.select('a[href]'):
    if not urlsplit(a['href']).scheme:a['href']='https://github.com/williamwue/oh-my-stack/blob/'+SOURCE_REV+'/'+str((path.parent/a['href']).resolve().relative_to(ROOT))
   for h in soup.select('h1'):h.decompose()
   chapters.append((fn,title,f'<section class="chapter" id="{Path(fn).stem}"><h1>{title}</h1>{soup}</section>'))
 front=about(lang);cover_html=cover(lang)
 toc='<section class="toc" id="contents"><h1>'+('目录' if lang=='zh-CN' else 'Contents')+'</h1><ol>'+''.join(f'<li><a href="#{Path(n).stem}">{html.escape(t)}</a></li>' for n,t,b in chapters)+'</ol></section>'
 cover_pdf=HTML(string=xhtml(TITLE[lang],cover_html,lang),base_url=str(folder)+'/').write_pdf(stylesheets=[CSS(string=PDF_CSS,base_url=str(folder)+'/',font_config=FONT)],font_config=FONT);doc=pymupdf.open(stream=cover_pdf,filetype='pdf');doc[0].get_pixmap(matrix=pymupdf.Matrix(1.5,1.5)).save(str(folder/'images/cover.png'));doc.close()
 epub=package_epub(lang,folder,chapters,front,folder/'images/cover.png');print(lang,'EPUB packaged',flush=True)
 if formats=='epub':
  report={'language':lang,'source_revision':SOURCE_REV,'chapters':stats,'epub_sha256':sha(epub.read_bytes()),'epub_table_layout':'labelled paragraphs','working_tree_sources':True}
  (folder/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
  return
 pdf_sections=[]
 for name,title,body in chapters:
  s=BeautifulSoup(body,'html.parser')
  for a in s.select('a[href]'):
   if re.match(r'(ch\d+|glossary|image-notes)\.xhtml',a['href']):
    file,_,frag=a['href'].partition('#');a['href']='#'+(frag or Path(file).stem)
  for fig in list(s.select('figure[data-w]')):
   w,h=float(fig['data-w']),float(fig['data-h']);img=fig.img
   if w/h>1.7 and w>900:fig['class']='wide';img['style']='width:100%'
   elif h>900 and h/w>2:
    image=Image.open(folder/img['src']);scale=image.width/w;logical_limit=680;start=0;part=0
    while start<image.height:
     end=min(image.height,start+int(logical_limit*scale))
     if end<image.height:
      # Choose a low-ink row near the cut to avoid splitting labels/nodes.
      gray=image.convert('L');best=[]
      for y in range(max(start+int(450*scale),end-int(130*scale)),end):
       pixels=list(gray.crop((0,y,image.width,y+1)).getdata());best.append((sum(v<250 for v in pixels),y))
      radius=max(3,int(6*scale))
      safe=[(max(score for score,yy in best if abs(yy-y)<=radius),-y) for _,y in best[radius:-radius]]
      end=-min(safe)[1]
     part+=1;piece=folder/'images'/f'{Path(img["src"]).stem}-part{part}.png';image.crop((0,start,image.width,end)).save(piece)
     new=s.new_tag('figure',attrs={'class':'part-figure'});im=s.new_tag('img',src='images/'+piece.name,alt=img['alt']);im['style']=f'width:{min(w,574)}px';new.append(im);cap=s.new_tag('figcaption');cap.string=('图示分段 ' if lang=='zh-CN' else 'Diagram segment ')+str(part);new.append(cap);fig.insert_before(new);start=end
    fig.decompose()
   else:img['style']=f'width:{min(w,574)}px'
  pdf_sections.append(str(s))
 html_doc=xhtml(TITLE[lang],cover_html+front+toc+''.join(pdf_sections),lang)
 (folder/'book.html').write_text(html_doc)
 pdf=ROOT/f'output/pdf/pstack-{lang}.pdf'
 rendered=HTML(string=html_doc,base_url=str(folder)+'/').render(stylesheets=[CSS(string=PDF_CSS,base_url=str(folder)+'/',font_config=FONT)],font_config=FONT)
 rendered.write_pdf(pdf,pdf_identifier=sha(html_doc.encode())[:32].encode())
 # Retain page anchor map for visual QA and checking internal destinations.
 anchors={}
 for i,p in enumerate(rendered.pages):
  for k in p.anchors:anchors.setdefault(k,i+1)
 report={'language':lang,'source_revision':SOURCE_REV,'chapters':stats,'pages':len(rendered.pages),'anchors':anchors,'pdf_sha256':sha(pdf.read_bytes()),'epub_sha256':sha(epub.read_bytes()),'working_tree_sources':True,'epub_table_layout':'labelled paragraphs'}
 (folder/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(lang,'PDF pages',len(rendered.pages),flush=True)

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--language',nargs='+',choices=['zh-CN','en'],default=['zh-CN','en'])
 parser.add_argument('--format',choices=['both','epub'],default='both')
 parser.add_argument('--assets',type=Path,default=ASSETS,help='Directory containing full Noto CJK fonts and OFL.txt')
 args=parser.parse_args();ASSETS=args.assets.resolve()
 for name in ['NotoSansCJKsc-Regular.otf','NotoSansCJKsc-Bold.otf','NotoSansMonoCJKsc-Regular.otf','OFL.txt']:
  if not (ASSETS/name).is_file():parser.error(f'Missing font asset: {ASSETS/name}')
 for path in ['output/pdf','output/epub']: (ROOT/path).mkdir(parents=True,exist_ok=True)
 subprocess.run(['node',str(ROOT/'tools/books/validate-pstack-book.mjs'),'--complete'],cwd=ROOT,check=True)
 for lang in args.language:main(lang,args.format)
