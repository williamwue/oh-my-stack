# 使用 AIHero 原版能力

[English](../../aihero-original-skills.md) | [简体中文](aihero.md)

OMS 当前源码收录了 Matt Pocock 的十六个原版 Skill。直接选择对应入口即可使用，
无需先进入 `poteto-mode`。

新增的调研、问卷、项目配置、规格和工单能力需要 **0.10.0 或更高版本**。
使用前对照[正式发布版本](https://github.com/williamwue/oh-my-stack/releases/latest)检查实际安装版本。

`writing-for-agents`、`retro`、`handoff`、`diagnosing-bugs`、`code-review`
需要 **0.13.0 或更高版本**，0.12.0 或更早版本不包含它们。
使用前核对实际技能清单；验证和发布
边界见[本次导入记录](../../maintainers/aihero-complements-2026-10-08.md)。
诊断和审查技能的较新来源见[第二批记录](../../maintainers/aihero-complements-second-batch-2026-10-08.md)。

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
| 编写代理需要阅读的文档 | `writing-for-agents` | 关于文档引用条件、信息层次、去重和可检查完成条件的共享参考。 |
| 复盘代理使用的项目环境 | `retro` | 读取指定会话，提出导航、检查、规范和工具改进候选，不直接实施建议。 |
| 把工作移交给其他会话或工具 | `handoff` | 在操作系统临时目录写入脱敏交接文件，引用已有成果，避免重复保存。 |
| 诊断难复现的缺陷或性能退化 | `diagnosing-bugs` | 建立针对症状的失败反馈循环，缩小复现、验证假设、修复原因并清理临时探针。 |
| 按规范和需求审查已提交改动 | `code-review` | 独立审查规范与需求两个维度，分别报告发现，不直接实施建议。 |

`codebase-design`、`domain-modeling`、`grilling`、`research` 和
`writing-for-agents`、`diagnosing-bugs` 和 `code-review` 也可由代理调用。
其余九个需要用户明确调用；十六个都能单独选择。

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

## 补充 pstack 工作流

整理 `AGENTS.md`、Skill 和代理通过引用读取的操作文档时，将
`writing-for-agents` 与 `technical-writing` 配合使用：前者提供代理文档的
组织参考，后者保留面向读者的表达和事实检查。`authoring-a-skill` 同样读取
该参考及配套的 `SKILL-MECHANICS.md`，用于调用方式和路由入口的选择。
应读取完整参考；工具截断时分段继续读取。

需要复盘项目环境时，明确选择 `retro`。Claude Code 示例：

```text
/oh-my-stack:retro 复盘本次会话中的导航缺口、重复指令和本可防止错误的检查。只提出改进建议，不修改技能或项目文件。
```

原版会读取 `writing-for-agents` 并列出改进候选。pstack 的 `reflect` 继续
负责有证据的技能修正；按目标选择入口，避免自动重复执行两轮复盘。
只读取已授权的会话记录，证据中应隐去秘密。

需要跨会话或跨工具移交时，明确选择 `handoff`：

```text
/oh-my-stack:handoff 为文档清理的下一次会话准备交接文件。引用现有计划和已完成改动，列出建议技能，隐去敏感信息，并报告临时文件路径。
```

在 Codex 中选择对应的 `oh-my-stack:<入口>`。`handoff` 只写交接文件，不
启动其他代理或对话。接收方可使用 `session-pickup` 核对交接锚点与当前仓库。
`show-me-your-work` 仍是正式证据记录；交接文件引用它，不替代它。

## 第二批：诊断和审查

难复现的缺陷需要反馈循环、最小复现和可证伪的假设时，选择 `diagnosing-bugs`。
它包含完整的诊断、修复和清理过程，不应自动嵌套在另一个完整工作流中。
pstack `bug-fix` 继续负责协调范围明确的修复及最终验证；性能问题仍需先测量基线。

```text
/oh-my-stack:diagnosing-bugs 在本地夹具中诊断已报告的导出失败。先建立并运行能捕获该症状的失败命令，再验证假设。保留无关改动，并隐去输出中的敏感信息。
```

可选的 `scripts/hitl-loop.template.sh` 需要 Bash；先复制并按实际复现步骤修改。
示例网址和 Export 按钮都是占位内容。脚本会输出收集到的观察结果，不能在
capture 提示中输入凭据。Windows 使用可用的 Bash；既有生产和计费操作门禁仍适用。

需要分别核对仓库规范和原始需求时，选择 `code-review`。提供可解析的比较基准，
以及任务系统说明或需求上下文；没有需求文档时会跳过需求审查并明确报告。
原版比较命令是 `git diff <fixed-point>...HEAD`，不包含未提交改动。
审查未提交文件、设计方案，或需要对抗性审查和综合裁决时，使用 pstack
`interrogate` 并冻结明确范围。

```text
/oh-my-stack:code-review 审查自 origin/main 起的已提交改动。依据 CONTRIBUTING.md 及 docs/specs/export.md 中的原始需求，分别报告规范和需求发现。不要实施建议或发布评论。
```

将示例需求路径替换为真实来源。原版需要实际并行子代理能力；能力不可用时应
报告限制，不能声称完成独立审查。两项保留上游的自动调用方式，OMS 路由仍使用
既有的 `bug-fix` 和 `interrogate`。审查不授予合并或发布权限。
Codex 使用对应的技能选择入口。

## 原版范围

前十四个 Skill 的正文、引用资源和 UI 元数据保持原版字节，固定来源版本为
`6fd947921b935b7e1e69293a200400f0fdd5c15f`。第二批的 `diagnosing-bugs`
和 `code-review` 固定为 `f3fc5632f401156837ee3872f14fe33ccf1024ea`。
两批均遵循 MIT 许可。
OMS 没有为其插入模型路由，也没有自动串接 pstack 工作流。
Codex 的 7,500 字节包装入口规则用于 pstack 核心技能；原版保持完整，包括
较长的 `writing-for-agents` 和 `diagnosing-bugs`。
原生完整加载及自动选择效果需另做实际工具验证。

当前未收录原版 `wayfinder` 和 `triage`。完整清单见[技能目录](../../skill-directory.md)。
测试工具与限制见[支持范围](../../support-policy.md)，来源与更新流程见
[第一批记录](../../maintainers/aihero-complements-2026-10-08.md)及
[第二批记录](../../maintainers/aihero-complements-second-batch-2026-10-08.md)。维护者记录为英文。
