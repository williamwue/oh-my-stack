# 使用 AIHero 原版能力

[English](../../aihero-original-skills.md) | [简体中文](aihero.md)

OMS 收录了 Matt Pocock 的六个原版 Skill。直接选择对应入口即可使用，
无需先进入 `poteto-mode`。

## 按任务选择

| 你想做什么 | 入口 | 预期结果及文件影响 |
| --- | --- | --- |
| 把一个想法或方案问清楚 | `grill-me` | 分轮提问，每题给出建议，等待你的回答。 |
| 问清需求并记录已确认的领域语言 | `grill-with-docs` | 提问，同时更新术语表；必要时记录重要架构决策。 |
| 找到值得改善的模块 | `improve-codebase-architecture` | 生成 HTML 报告，等待你挑选候选模块，不直接实现重构。 |
| 比较模块接口方案 | `codebase-design` | 使用原版设计原则与参考文档，讨论接口和依赖。 |
| 统一领域术语 | `domain-modeling` | 按原版格式维护术语表和架构决策记录。 |
| 按设计决策的依赖关系展开访谈 | `grilling` | 每轮只问前置条件已明确的问题，等待回答与共识。 |

前三个入口需要用户明确调用。后三个也可以由代理调用，作为其他原版
工作流的依赖；六个都能单独选择。

## 先体验一次访谈

在 Codex 对话中输入 `$`，选择 `oh-my-stack:grill-me`，再发送：

```text
帮我规划订单明细的部分取消能力。
先提出第一轮问题并等待我回答，不实现功能，也不修改项目文件。
```

在 Claude Code 对话中直接发送：

```text
/oh-my-stack:grill-me 帮我规划订单明细的部分取消能力。先提出第一轮问题并等待我回答，不实现功能，也不修改项目文件。
```

预期结果是带编号和建议答案的问题。回答后再继续下一轮。
代理应自行查找项目中可以查证的事实，把业务选择留给你。
确认达成共识后，再另行要求实现。

如果希望保留已确认的术语，在 Codex 选择 `oh-my-stack:grill-with-docs`；
Claude Code 示例：

```text
/oh-my-stack:grill-with-docs 澄清订单部分取消需求，只记录已经确认的领域术语和决策，不实现功能。
```

这个入口可能在项目内写入 `GLOSSARY.md`、上下文术语表和架构决策记录。
尚未明确的选择应保留为问题。

## 检查模块设计

在 Codex 选择 `oh-my-stack:improve-codebase-architecture`，或在 Claude Code 发送：

```text
/oh-my-stack:improve-codebase-architecture 检查结算模块中值得改善的设计。先生成报告并等待我选择，不修改实现文件。
```

预期得到临时目录中的 HTML 报告和候选模块。后续讨论也会使用
`grilling` 和 `domain-modeling`，可能记录已确认的术语和决策。
如果没有自动打开报告，手动打开代理给出的文件路径。
报告使用外部 CDN 的 Tailwind 和 Mermaid，完整样式和图表需要网络。
目前已验证报告生成，自动打开和浏览器视觉效果仍有验证限制。

只想讨论一个接口时，可以直接选择 `codebase-design`，要求按原版
Design It Twice 过程比较接口方案。该过程要求至少三个独立的并行设计，
可能产生多次代理调用；比较完成后再决定是否修改代码。

## 原版范围

六个 Skill 的正文、引用资源和 UI 元数据保持原版字节，固定来源版本为
`6fd947921b935b7e1e69293a200400f0fdd5c15f`，遵循 MIT 许可。
OMS 没有为其插入模型路由，也没有自动串接 pstack 工作流。

当前未收录原版 `to-spec`、`to-tickets`、`setup-matt-pocock-skills`、
`wayfinder` 和 `research`。完整清单见[技能目录](../../skill-directory.md)。
测试工具与限制见[支持范围](../../support-policy.md)，来源与更新流程见
[维护者记录](../../maintainers/aihero-imports-0.9.0.md)。这两份参考文档为英文。
