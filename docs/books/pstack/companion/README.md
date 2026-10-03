# 将书中的方法用于 Oh My Stack

这份配套说明由 Oh My Stack 项目编写。kaito 的原书讨论 Cursor pstack，
本项目将其中的工作流语义与验证原则适配到 OMP、Codex 和 Claude Code。

- [工作流对应关系](workflow-mapping.md)。
- [宿主差异与证据范围](runtime-differences.md)。
- [中文译本](../zh-CN/README.md)。
- [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04)。

开始实践时，选一个范围小、可以重复验证的真实任务。
先明确完成条件，再确认 Agent 能启动应用、操作相关功能并留下证据。
例如，修复筛选列表时，应检查筛选前后的实际结果、空结果和重置行为，
并提供操作输出或截图；仅有「代码已修改」不足以说明用户路径已经正确。

需要验证能力时，可以通过项目的 `create-verification-skill` 工作流，
为具体应用建立操作和取证步骤。准备好验证能力后，再逐步扩大委派范围。
这些建议是工作方法，不是对某个宿主、账号或外部服务已可用的保证。

本次对应关系依据仓库基线
`52bec251d379799afc56a3eb538ad82e68908020` 的代码与文档核对。
项目状态以 [project-status.md](../../../project-status.md) 为入口；
书籍的参考版本、仓库中的候选版本与已发布版本分别记录。
