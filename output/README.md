# pstack 中英文电子书

作者：kaito。电子书整理：Oh My Stack。源内容快照：2026-10-03，仓库提交 `8fa4f6531d3af142467e322f17e7806a5ecf515b`。

| 版本 | PDF | EPUB |
| --- | --- | --- |
| 简体中文 | [538 页](pdf/pstack-zh-CN.pdf) | [可重排版](epub/pstack-zh-CN.epub) |
| 作者英文版 | [622 页](pdf/pstack-en.pdf) | [可重排版](epub/pstack-en.epub) |

每种语言包含完整 48 个目录项、222 个展开的代码块、31 幅图表及原始图片。PDF 含书签、页码和可点击目录；EPUB 内嵌字体与图片。中文另附术语表、图片文字说明。长代码在 PDF 中折行，宽图横排，长图分段。中文正文已完成 AI 对照校对，尚未完成人工终审。

维护者已报告获得作者私聊口头许可，可推出中英文版本。书籍正文与译文不因收录进仓库而自动采用项目的 MIT 许可；详见[授权记录](../docs/books/pstack/AUTHORIZATION.md)。字体许可在 EPUB 的 `OEBPS/fonts/OFL.txt` 中。

## 验证

- EPUBCheck 5.4.0：两种语言均为 0 错误、0 警告。
- 逐篇检查正文文字与代码保留，48 个章节目标和全部 EPUB 内部资源链接存在。
- PDF 全页文字边界扫描未发现页面外文字或替换字符；抽检封面、目录、正文、表格、代码、长宽图和末页。
- 使用 Poppler 与 MuPDF 交叉渲染。字体子集保留原始 glyph IDs，避免 CFF 字体在部分渲染器中漏字。
- 未进行 Apple Books、Kindle 等阅读器实机验收；协作浏览器未能连接本地预览服务。

完整记录见 [ebooks-validation.json](ebooks-validation.json)，校验值见 [SHA256SUMS.txt](SHA256SUMS.txt)。这些文件尚未作为 GitHub Release 附件发布。
