# FAQ 与故障排查

[English](../faq.md) | [简体中文](faq.md)

## 找不到 Skill

1. 用 `codex plugin list` 或 `claude plugin list --json` 检查已安装插件。
2. 检查实际版本和启用状态。更新源码仓库不等于更新该安装。
3. 在项目中新开会话。
4. Codex 使用 Skill 选择器，Claude Code 使用 `/oh-my-stack:<入口>`。

仅显式使用的入口可能不在模型自动使用的列表中，但仍可由用户选择。
安装指南：[Codex](install/codex.md)、[Claude Code](install/claude-code.md)、[OMP](install/omp.md)。

## 写了名称但没有运行 Skill

在 Codex 把 Skill 名称写成普通文本，不能证明已完成结构化选择。使用选择器选中入口。
通过 CLI 集成时，使用该集成支持的结构化 Skill 输入。

在 Claude Code，用用户输入的 slash 命令调用仅显式使用的 AIHero 入口。
请求模型主动调用其 Skill 工具会被拒绝。

## 应该选哪个入口

工程执行用 `poteto-mode`，用法问题用 `poteto-help`。
需要 AIHero 原版流程时，直接调用对应入口。[常见任务](guides/common-tasks.md)说明区别。

## 必须先配置模型吗

基础使用可以继承 agent 的模型。
需要角色模型、审阅面板或推理预算时，再配置。
setup 需要当前模型清单及能够选择子 agent 模型的调度能力。见[模型配置](model-configuration.md)。

## 是否包含所有 pstack 和 AIHero 能力

[技能目录，英文](../skill-directory.md)列出包内入口。
pstack 衍生工作流包含有记录的跨工具适配；AIHero 只引入精选原版技能。
[AIHero 指南](guides/aihero.md)列出已包含及尚未引入的入口。
发现某个入口不能证明它在所有工具上的完整行为一致。

## Skill 会修改项目吗

取决于请求和入口。`prove-it-works` 只读，`grill-me` 提问，`grill-with-docs` 可能写术语表和决策记录。
功能开发和 bug 修复请求允许相关代码修改与检查。开始前说明约束。
发布、合并和部署需要针对这些操作的授权。

## 为什么会有多次模型调用

部分工作流会使用探索、实现、独立审阅或汇总 agent，按你的提供方正常用量计费。
面板大小和模型选择影响用量。需要控制用量时，检查模型映射并缩小任务范围。

## 架构报告没有打开

使用返回的 HTML 文件路径。
0.9.0 实测已生成报告，但测试机器的操作系统打开命令失败。
样式和图表依赖上游 CDN，离线文件的显示可能不完整。

## 如何报告问题

提供插件版本、工具版本、平台、所选入口、提示词、预期与实际结果，以及脱敏证据。
提交 [GitHub issue](https://github.com/williamwue/oh-my-stack/issues)，不附凭据或账号私密日志。
安全问题按 [SECURITY.md](../../SECURITY.md)处理。

[支持范围，英文](../support-policy.md) · [更新和卸载](guides/update-and-uninstall.md)
