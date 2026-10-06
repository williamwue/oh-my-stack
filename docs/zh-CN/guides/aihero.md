# 使用 AIHero 原版能力

[English](../../aihero-original-skills.md) | [简体中文](aihero.md)

OMS 收录了 Matt Pocock 的十一个原版 Skill。直接选择对应入口即可使用，
无需先进入 `poteto-mode`。

新增的调研、问卷、项目配置、规格和工单能力属于 **0.10.0 未发布源码候选版**。
当前已发布版本仍为 0.9.1，更新已发布插件暂时不会获得这五项。

## 按任务选择

| 你想做什么 | 入口 | 预期结果及文件影响 |
| --- | --- | --- |
| 把一个想法或方案问清楚 | `grill-me` | 分轮提问，每题给出建议，等待你的回答。 |
| 问清需求并记录已确认的领域语言 | `grill-with-docs` | 提问，同时更新术语表；必要时记录重要架构决策。 |
| 找到值得改善的模块 | `improve-codebase-architecture` | 生成 HTML 报告，等待你挑选候选模块，不直接实现重构。 |
| 比较模块接口方案 | `codebase-design` | 使用原版设计原则与参考文档，讨论接口和依赖。 |
| 统一领域术语 | `domain-modeling` | 按原版格式维护术语表和架构决策记录。 |
| 按设计决策的依赖关系展开访谈 | `grilling` | 每轮只问前置条件已明确的问题，等待回答与共识。 |
| 查证一个技术问题 | `research` | 后台代理读取第一手来源，在项目里保存带引用的 Markdown 调研记录。 |
| 向同事或客户收集缺失信息 | `to-questionnaire` | 先确认收件人和需要的答案，再生成可自行发送的问卷文件。 |
| 为项目配置原版工程技能 | `setup-matt-pocock-skills` | 提供任务存放位置和领域文档配置草案，确认后才写入。 |
| 把已讨论的需求整理为规格 | `to-spec` | 整理已有共识，确认测试边界，再写入配置的任务系统。 |
| 将规格拆成可执行工单 | `to-tickets` | 提议纵向切片及阻塞关系，等你确认后逐项创建工单。 |

`codebase-design`、`domain-modeling`、`grilling` 和 `research` 也可由代理调用。
其余七个需要用户明确调用；十一个都能单独选择。

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

## 调研与问卷

在 Codex 选择 `oh-my-stack:research`；Claude Code 示例：

```text
/oh-my-stack:research 查证我们使用的 API 对取消操作有哪些保证。只用第一手来源，每项结论附引用，将 Markdown 记录保存到项目的调研目录。
```

原版会委派后台代理，需能访问相应来源并写入调研记录。完成后检查它给出的
文件路径与引用。需要向别人收集信息时，选择 `to-questionnaire`：

```text
/oh-my-stack:to-questionnaire 为客户运营负责人准备一份上线需求调研问卷。
```

先回答收件人的角色、知识背景和与你的关系，再回答你需要获得哪些事实或
决定。结果保存为当前目录的 `to-questionnaire-<slug>.md`；由你自行发送。

## 从共识到规格与工单

先在目标项目运行一次 `setup-matt-pocock-skills`。本地体验示例：

```text
/oh-my-stack:setup-matt-pocock-skills 将本项目配置为使用本地 Markdown 工单。先展示草案，等我确认后再写入。
```

它优先编辑已有 `CLAUDE.md`，否则编辑已有 `AGENTS.md`；两者都不存在时
询问创建哪个。确认后保留原有其他章节，写入 `docs/agents/issue-tracker.md`
和 `docs/agents/domain.md`。当前未收录原版 `triage`，因此跳过它的可选标签
配置步骤；规格与工单仍使用 `ready-for-agent` 状态。

已有共识后，选择 `to-spec`：

```text
/oh-my-stack:to-spec 把已确认的部分取消设计整理为规格。写入本地任务系统前，先与我确认测试边界。
```

它整理现有讨论，不重新访谈需求；会确认测试边界。本地规格位于
`.scratch/<feature-slug>/spec.md`。若配置远程任务系统，则创建实际 issue。
缺少任务系统或标签上下文时，它会提示先运行配置技能。

再将实际规格路径传给 `to-tickets`：

```text
/oh-my-stack:to-tickets .scratch/partial-cancellation/spec.md
```

先得到各工单的交付行为、颗粒度和阻塞关系，等你确认后才写入。
本地每项分别保存为 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，
包含验收条件、阻塞关系和状态；远程任务系统则创建实际工单及支持的阻塞关系。
这些原版入口不会自动进入 OMS 的实现或发布流程。

## 原版范围

十一个 Skill 的正文、引用资源和 UI 元数据保持原版字节，固定来源版本为
`6fd947921b935b7e1e69293a200400f0fdd5c15f`，遵循 MIT 许可。
OMS 没有为其插入模型路由，也没有自动串接 pstack 工作流。

当前未收录原版 `wayfinder` 和 `triage`。完整清单见[技能目录](../../skill-directory.md)。
测试工具与限制见[支持范围](../../support-policy.md)，来源与更新流程见
[维护者记录](../../maintainers/aihero-imports-0.10.0.md)。这两份参考文档为英文。
