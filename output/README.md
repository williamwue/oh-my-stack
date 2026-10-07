# pstack 中英文电子书

作者：kaito。电子书整理：Oh My Stack。正文快照：2026-10-03。
本轮本地候选基于 Oh My Stack 0.10.0；排版源码提交为
`b0bebb12497fa20a67ec9449a4571bb874754428`。

| 版本 | PDF | EPUB |
| --- | --- | --- |
| 简体中文 | [542 页](pdf/pstack-zh-CN.pdf) | [可重排版](epub/pstack-zh-CN.epub) |
| 作者英文版 | [622 页，沿用原文件](pdf/pstack-en.pdf) | [可重排版](epub/pstack-en.epub) |

2026-10-07 在当前主线重新生成了中文 PDF 和双语 EPUB。每种语言包含完整
48 个目录项、222 个展开代码块及原始图片和图表。PDF 保留表格、书签、页码和
可点击目录；EPUB 将表格改为带列名的独立段落，避免跨阅读器分栏的表格或行容器。
中文说明性代码注释和提示词模板沿用已记录的翻译修正，影响行为的原始值保留必要说明。
中文正文尚未完成人工终审。

维护者已报告获得作者私聊口头许可，可推出中英文版本。书籍正文与译文不因收录进
仓库而自动采用项目的 MIT 许可；详见[授权记录](../docs/books/pstack/AUTHORIZATION.md)。
字体许可在 EPUB 的 `OEBPS/fonts/OFL.txt` 中。

## 本轮验证

- 两种新 EPUB 均通过 EPUBCheck 5.4.0，0 错误、0 警告。
- 逐章校验文字、代码、574 行表格数据的阅读顺序、XML 和内部资源链接。
- 新中文 PDF 共 542 页；全页文字边界和替换字符扫描通过，抽检封面、表格、代码、正文和末页。
- 英文 PDF 未重新生成，字节与历史文件相同。
- 微信读书实际阅读验收按维护者本轮要求留后；本地检查不代表阅读器兼容性验收。

本轮记录见 [ebook-mainline-validation-2026-10-07.json](ebook-mainline-validation-2026-10-07.json)，
独立复核见 [ebook-mainline-review-2026-10-07.json](ebook-mainline-review-2026-10-07.json)。
复核发现的 Windows EPUB 路径和历史验证文件说明问题均已修正；原生 Windows 构建尚未验收。
当前文件校验值见 [SHA256SUMS.txt](SHA256SUMS.txt)。
原 [ebooks-validation.json](ebooks-validation.json) 保留为历史验证记录。

## 下载与发布状态

以上修复文件为本地候选，尚未推送或发布。
[2026-10-03 电子书发布页](https://github.com/williamwue/oh-my-stack/releases/tag/pstack-book-2026-10-03)
提供的是历史四份电子书和校验附件；其中中文 PDF 为 538 页。电子书使用独立日期标签，
不改变 Oh My Stack 插件的版本号或 Latest 发布。
