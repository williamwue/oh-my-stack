# OMS 五模型日常配置与验收

2026-11-16，用户授权按新的五模型分工更新日常环境，并完成真实模型调用。
本次保留 OMS 2.0.2 安装与工作流，只调整用户 T3 模型表及 Code 项目的新会话默认模型。
此前安装状态与旧分工的验收保留在[日常升级记录](oms-daily-install-2.0.2.md)。

## 已保存配置

生效用户表为 `~/.t3/pstack-models.md`，包含 19 个角色和 23 个目标条目。
项目表 `.agents/pstack-models.t3.md` 如存在，继续整体覆盖用户表。
角色表只影响子任务的模型选择，不会自动增加或排列工作步骤。
上游任务难度调整与宿主派发规则继续适用。

```markdown
# pstack T3 model configuration

Astra coordinates engineering work and handles difficult diagnosis and review.
Sol handles routine implementation, exploration, judgment and prose.
Opus joins architectural design; Sonnet is the first arena cross-judge candidate.
Terra is reserved for explicitly requested specialist tasks, not a default role.

feature, refactoring: codex/gpt-6.1-sol @medium
bug-fix: codex/gpt-6-astra @high
perf-issue: codex/gpt-6-astra @high
hillclimb: codex/gpt-6-astra @high
judgment and prose: codex/gpt-6.1-sol @high
strongest judgment: codex/gpt-6-astra @xhigh
how explorer: codex/gpt-6.1-sol @medium
how explainer: codex/gpt-6.1-sol @medium
why investigators: codex/gpt-6.1-sol @medium
why synthesizer: codex/gpt-6-astra @high
reflect tooling: codex/gpt-6.1-sol @medium
reflect judgment, divergent, synthesizer: codex/gpt-6-astra @high
arena runners: codex/gpt-6.1-sol @high, codex/gpt-6-astra @high
arena cross-judge pool: claudeAgent/claude-sonnet-5-5 @high, codex/gpt-6-astra @high
swarm workers: codex/gpt-6.1-sol @medium
architect runners: claudeAgent/claude-opus-5-5 @high, codex/gpt-6-astra @high
interrogate reviewers: codex/gpt-6-astra @high, codex/gpt-6.1-sol @high
thermos reviewers: codex/gpt-6-astra @high
no-comments reviewer: codex/gpt-6.1-sol @medium

default effort: medium
```

Code 项目新会话默认使用 `codex/gpt-6-astra`，`reasoningEffort=high`。
这个默认值不切换已经运行的对话，也不修改其他项目。

Opus 留在架构方案候选中，Sonnet 位于 arena 裁判池首位。
裁判的最终选择仍受父会话模型过滤规则约束，不保证每次都使用 Sonnet。
Terra 只用于显式指定的专项任务，没有新增常驻角色或调度机制。
该配置控制模型分工，不是订阅额度上限，也不证明实际调用的账单归属。

## 备份与保留检查

变更前备份位于
`/Users/williamwue/Library/Application Support/oh-my-stack/backups/five-model-profile-20261116-155415`。
原生 Codex 模型表、全局 AGENTS、Codex 设置、Claude 指令与设置、Claude 插件注册记录均与备份哈希一致。
Code 项目除默认模型选择和更新时间外，其余字段保持一致。
已删除的 `Code/AGENTS.md` 未重新创建。

## 安装内容与仓库检查

Codex 日常缓存中的 596 个发行版技能文件与固定 2.0.2 快照逐字一致。
缓存还包含 15 个 `poteto-mode/scripts/node_modules/` 运行依赖文件。
初次严格目录比较因此失败；逐项比较确认没有缺少或改动任何发行版文件。
这些额外依赖未被删除。

生成器检查确认 56 个生成文件一致，现有布局、模型和 hook 检查通过。
配置说明的 Markdown lint 通过。
完整仓库回归为 2,054 通过、160 跳过、0 失败，共 2,214 项、64 个文件，退出码为 0。
测试使用 Bun 1.4.4，PATH 上为 Node 24.22.1。跳过项没有计为通过。

## 真实验收

[Astra 主控验收](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3Adb865e04-4940-41b4-adbd-c7575ff9446e%3Adelegate-task%3Aoms-five-model-astra-controller-20261116-1)
从初始技能目录读取了日常 poteto-mode、T3 映射、architect 和 arena。
主控报告初始上下文存在启动路由提示；本次没有独立追溯 hook 进程来源。
生效表哈希在调用前后保持一致，值见[机器可读证据](evidence/oms-five-model-profile-2026-11-16.json)。

主控使用 Astra high，恰好派发五个 worker。
根会话独立读取六个线程的宿主最终执行记录，executedModel 均与请求一致。
各会话的只读能力查询确认了实际会话 effort 设置，没有用 catalog 默认值推断。
宿主没有提供独立的 executed-effort 字段。

| 任务 | 保存行的起始 effort | 本次请求与宿主设置 |
| --- | --- | --- |
| Opus 架构候选 A | high | medium |
| Astra 架构候选 B | high | medium |
| Sonnet 盲审裁判 | high | medium |
| Sol 实现 | medium | low |
| Terra 显式文字专项 | 显式指定 medium | medium |

前三项按上游规则对边界明确的判断任务降低一级 effort。
Sol 的常规实现按规则降低 effort，并受 catalog 最低 low 限制。
保存表没有被改写，所以 high 和 medium 是起始值，不是每次派发的固定值。
Terra 使用本次明确指定的专项目标，不从保存表解析常驻角色。

两个方案在独立文件中分别设计排序扫描和 BigInt 事件扫描，随后由裁判评估。
Sonnet 是裁判池中首个可用且满足父模型过滤条件的候选。
裁判任务只提供 A/B 标签、验收条件及方案文件，没有传入作者身份报告或主控偏好。
轨迹确认它未读取作者身份文件。
主控采用 A 的排序扫描，补入 B 的自有索引检查与相关测试，并独立修正了设计文字中的错误。
五个 worker 都没有继续派发；主控由完成通知恢复，没有轮询等待。

- [normalizeRanges design A](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3Aa95da7cb-7ed7-4f77-b3f3-a189049d356a%3Adelegate-task%3Aa68a3a43-1312-452b-999f-4b1ca6b47f71)。
- [normalizeRanges design B](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3Aa95da7cb-7ed7-4f77-b3f3-a189049d356a%3Adelegate-task%3A640e947b-a4a0-4219-8435-5d894e77f37e)。
- [normalizeRanges blind judge](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3Aa95da7cb-7ed7-4f77-b3f3-a189049d356a%3Adelegate-task%3A5fc3d0ef-f72b-4588-93d8-b967b353dced)。
- [normalizeRanges implementation](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3Aa95da7cb-7ed7-4f77-b3f3-a189049d356a%3Adelegate-task%3A425da885-bd33-44a8-a386-d0325b944159)。
- [normalizeRanges Terra release note](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3Aa95da7cb-7ed7-4f77-b3f3-a189049d356a%3Adelegate-task%3Aa6ac3c59-60e4-4c6b-a26b-5a30d8691e44)。

## 产物与独立复验

Sol 实现 `normalizeRanges`，合并重复、重叠和相邻整数闭区间，不修改输入。
9 项 Node 测试全过，其中包含 600 次固定种子 oracle 比较。
Astra 主控独立检查 7,232 个小域穷举案例、26 个非法端点和两个完整跨度边界案例。
根会话读取真实代码与测试，再次执行 Node 测试，结果为 9 通过、0 失败。
所有最终产物哈希与主控报告一致，没有代码修复。

Terra 根据选定契约和实际测试结果撰写 91 字符的中文说明。
主控和根会话核对其排序、合并、不修改输入、错误类型及测试数量陈述。
本次只验证文字专项调用，没有验证视觉、浏览器或设备能力。

## 错误与验收边界

Opus 的三次复合读取命令失败，后续重新读取了所需内容。
其中未加引号的 `=====` 触发 zsh 命令展开错误；首次失败输出还发生 provider 截断。
主控一次对同一路径的重复 apply_patch 操作被拒绝，随后在允许目录用结构化 JSON 写入恢复。
聚合输出的截断通过重读与独立字段核对处理，未将截断当作成功证据。

本次通过的是有限的架构比较、盲审、实现和文字交付集成。
它不代表全部 19 个角色、完整 arena 工作流、thermos 双评审或 worktree 隔离都重新验收。
shared worker 继承 full-access，文件范围由任务说明约束，没有宣称操作系统强制只读。
没有进行订阅归属、剩余额度、账单核对或模型能力对比基准测试。

当前工作流源码和 2.0.2 安装保持不变。
日常配置已生效，现有对话模型不自动切换。
