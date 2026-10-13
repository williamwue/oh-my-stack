# EPUB 阅读版实施与验收记录

2026-10-13 已完成本地中英文 EPUB 与中文排版样书。目标是恢复 kaito 日文原书的
内容层级、短表对照和图文关系，同时适配可调字号与分页。正文仍以 2026-10-03
冻结快照为准，共 48 个目录项；没有并入日文网站后来增加的章节。

## 文件与实际变化

- [中文完整 EPUB](../../../../output/epub/pstack-zh-CN.epub)
- [作者英文版 EPUB](../../../../output/epub/pstack-en.epub)
- [中文排版样书](../../../../output/epub/pstack-zh-CN-sample.epub)
- [文件校验值](../../../../output/SHA256SUMS.txt)

102 张正文表格逐一配置：25 张保留语义表格，5 张宽表按原行顺序拆分并重复主列，
72 张长表转为无外框的标题和带列名条目。中文附加术语表也使用条目排版。
列名是实际文字，不依赖 CSS 生成内容；表格策略绑定源内容哈希，源表改变后必须重审。

正文采用相对字号、约 1.8 倍行距、清晰的标题间距和浅色表头。表头尽量与首行保持在
同页，短表行避免中途断开；长条目允许正常分页。长英文词、链接和代码可折行。
代码保留全部原始字符，只在代码块外标注已有的语言信息。本轮未引入额外语法高亮。

原书封面保持下载字节，后接独立本地化书名页和译编说明。封面来自 2026-10-13 观察到的
日文书页面，来源与哈希见 [cover-source.json](cover-source.json)。章节仍来自冻结快照。
目录按分部、章节、二级小节组织；附加资料单列，原注册界面图片与文字说明可往返跳转。

31 幅 Mermaid 图与一张原始截图全部保留。中文 11 幅、英文 13 幅宽长图增加可随字号
放大的节点、关系或时序文字说明，紧接完整图示，不裁断节点或用图片替代表格文字。

## 已取得的证据

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 源文件与 PDF | 制作验收时 345 个既有来源文件无变化；发布准备仅更新其中的下载索引，两份 PDF 字节一致 | [保留校验](source-preservation.json)、[发布复验](publication-checks.json) |
| 既有正文图片 | 两种语言各 32 个图片资源与旧 EPUB 字节一致 | [保留校验](source-preservation.json) |
| 中文内容 | 222 代码块、103 表、592 数据行，包括 18 行术语表 | [中文校验](validation-zh-CN.json) |
| 英文内容 | 222 代码块、102 表、574 数据行 | [英文校验](validation-en.json) |
| 源锚点、链接、标题、目录、图示说明 | 独立校验通过 | [检查命令](checks.json) |
| EPUBCheck 5.4.0 | 两份完整本和样书均 0 错误、0 警告 | [中文](epubcheck-zh-CN.log)、[英文](epubcheck-en.log)、[样书](epubcheck-sample.log) |
| Python 专项测试 | 52 个测试通过，包括丢单元格、错标签、错顺序、失效哈希、删除图示说明、删改目录等破坏性案例 | [检查记录](checks.json) |
| 实际 EPUB 分页引擎 | epub.js 0.3.93；中文 50 文档、英文 48 章节，分别在 390px、100% 和 200% 下扫描，196 个组合未见可见文字越界 | [中文](reader-zh-CN.json)、[英文](reader-en.json) |

实际截图另外覆盖 1100px 双栏、深色模式、短表、宽表、长目录、完整图示和放大说明。
几何扫描不等于逐页人工审美验收，截图是抽检证据。它们也不代表微信读书原生引擎。

- [中文短表](screenshots/zh-compact-390-100.png)
- [中文宽表拆分](screenshots/zh-split-390-100.png)
- [中文长目录，双栏深色](screenshots/zh-catalog-spread-dark.png)
- [完整长图](screenshots/zh-tall-diagram-390.png)与[可放大文字说明](screenshots/zh-diagram-reading-aid.png)
- [英文标题，200% 字号](screenshots/en-ch24-heading-fixed-390-200.png)
- [英文宽图，双栏深色](screenshots/en-ch28-wide-overview-1100-dark-100.png)

## 审查与修正

[实现契约](CONTRACT.md)冻结源哈希、表格坐标、阅读顺序及独立校验边界。
设计候选经过三路比较后采用显式逐表策略，加入逐行拆分宽表的规则。

样书实际分页发现表头单独留在页末，随后调整表头与短行的分页规则。全书大字号扫描
发现英文长词和标题越界，随后为正文增加继承式折行，并把代码制表宽度设为 2。
再次扫描最终文件后未再出现可见文字越界。

独立代码审查指出两处验收缺口：删掉图示文字说明或目录章节仍可能通过校验。
补齐独立 Mermaid 来源解析和完整目录层级检查后，审查者重新实施两种删除测试，
确认都会失败，原完整文件仍通过。见 [审查记录](review.md)与[决策记录](decisions.tsv)。

## 验收边界

- 用户已明确要求先完成制作，微信读书实际验收稍后进行。本轮未声称已通过微信读书。
- epub.js 跨页显示短表时不重复表头；宽表拆分会显式重复列名。其他阅读器的表头、字体、
  主题处理仍需在目标阅读器检查。
- 标准 `npm run check` 在当前 Homebrew Node 环境的可执行文件复制测试中失败，基线也复现。
  复制后的 Node 找不到 `libnode.127.dylib`，与 EPUB 改动无关。其余检查阶段通过；
  直接为 Node 测试进程补充动态库搜索路径后，完整 Node 套件 404 通过、2 跳过、0 失败。
  没有修改该测试或相关产品代码，详见 [仓库检查记录](repo-checks.json)。
- 发布准备改用仓库固定的官方 Node 22.23.3，完整 `npm run check` 通过，Node 测试
  406 通过、0 失败、0 跳过。验收记录中的本机路径已规范化为相对路径。
  见 [发布检查](publication-checks.json)与[完整日志](publication-npm-check.log)。
- 本轮对应独立书籍发布 `pstack-book-2026-10-13`。下载入口见
  [电子书发布页](https://github.com/williamwue/oh-my-stack/releases/tag/pstack-book-2026-10-13)。
  插件版本与插件 Latest 发布不随本轮电子书更新。

## 重建与复验

使用 [书籍工具说明](../../../../tools/books/README.md)准备字体和 Python 依赖。

```sh
DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib .tmp/ebook-venv/bin/python tools/books/build-pstack-ebooks.py --language zh-CN en --format epub
DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib .tmp/ebook-venv/bin/python tools/books/build-pstack-ebooks.py --language zh-CN --format epub --sample
.tmp/ebook-venv/bin/python tools/books/validate-pstack-ebooks.py --language zh-CN
.tmp/ebook-venv/bin/python tools/books/validate-pstack-ebooks.py --language en
npm install --prefix .tmp/epub-reading-20261013/reader-deps epubjs@0.3.93 jszip@3.10.1
python3 tools/books/preview-pstack-epub.py
```

最后一条命令仅在 `127.0.0.1:8974` 提供本地分页验收页面；页面加载实际 EPUB。
阅读器脚本只用于本地验收，不会打包进电子书。
