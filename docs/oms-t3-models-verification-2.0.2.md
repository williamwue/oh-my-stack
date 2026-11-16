# OMS 2.0.2 T3 跨模型配置验收

2026-11-16 验证。源码基于 pstack-claude 0.9.138 的
`a12b04786023e762f12f5de7bb5fafb8c23f8c36`，本次改动从 OMS
`d3cbbbf2` 开始。机器可读证据见 [验收数据](evidence/oms-2.0.2-t3-models.json)。

## 实现结果

setup-pstack 在 T3 中使用宿主 catalog 验证 provider 实例、完整模型 ID 和 effort。
配置继续使用上游角色行，T3 用户表为 `~/.t3/pstack-models.md`，
项目表为 `.agents/pstack-models.t3.md`。项目表整体替代用户表。
配置格式与优先级见 [T3 配置说明](t3.md#跨模型配置)。

角色技能的条件入口从上游 models.json 推导，直接调用 how 等技能也会读取 T3 映射。
派发时将 provider、model 和该模型支持的 effort option 分别交给宿主。
子任务简报携带生效配置的绝对路径。
没有增加调度器、角色分类、解析器、安装器或配置服务。

去掉新生成的条件读取段后，所有改动的 SKILL.md 正文与本次基线逐字一致。
上游 models.json、Codex 工具映射、hooks 和历史归档未改动。
沿用 Model the Domain 原则，数据仍是上游角色行，只给目标补充 provider 信息。

## 本地检查

| 检查 | 结果 |
| --- | --- |
| `bun tools/generate.mjs --check` | 56 个生成文件一致，链接、模型名、打包及 hooks 检查通过 |
| `bun test tests/` | 2,053 通过、160 跳过、0 失败，共 2,213 项，64 个文件 |
| `bun test tests/t3.test.mjs tests/generate.test.mjs` | 136 通过、0 失败 |
| skill-creator `quick_validate.py` | 通过，使用 uv 临时提供系统 Python 缺少的 PyYAML |
| markdownlint-cli2 0.18.1 | 通过 |
| 三个上游组件的 pinned dry-run | 全部退出 0，无未声明差异 |
| substitution rules | 99 条均命中 pinned upstream |

完整测试使用 Bun 1.4.4，PATH 上使用 Node 24.22.1。
跳过项保留各测试自身的宿主、平台及依赖限制，没有把跳过算作通过。

## 隔离原生宿主检查

使用临时 CODEX_HOME 和 CLAUDE_CONFIG_DIR，通过各自原生 CLI 从本地快照安装
`pstack@oms` 2.0.2。没有修改日常宿主配置，也没有发起模型调用。

Codex app-server 的 skills/list 发现 67 个 pstack 技能，errors 为空。
setup-pstack、poteto-mode、how 均启用，路径包含 2.0.2。
安装后的入口及 T3 参考文件与最终候选逐字一致。

Claude CLI 报告插件启用、version 和 folderVersion 均为 2.0.2。
plugin validate 通过，另有沿用上游 README 安装示例的建议。
该 CLI 检查不等于新 T3 会话自动发现技能，也没有重新验收 hook 信任。

## 真实 T3 调用

宿主版本为 `0.1.10-nightly.20261116.4761`。
候选技能通过明确的临时快照路径读取，项目文件均位于临时 Git 项目中。
各控制会话使用 `claudeAgent/claude-sonnet-5-5`，effort 为 medium。

首先，[Claude setup 验收](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3Adb865e04-4940-41b4-adbd-c7575ff9446e%3Adelegate-task%3Aoms-202-claude-setup-20261116-1)
按入口读取 T3 配置参考，查询真实 catalog，保存并回读五个现有角色的 partial sheet。
其中 how explorer 使用 `codex/gpt-6.1-sol @medium`。
没有启动子任务，也没有写原生模型表、全局指令或 hook 配置。

随后，新 Claude 会话仅收到角色名，从磁盘配置解析目标。
首次调用命中 Codex，但使用了后台状态工具。
映射改为明确遵循所选派发工具返回的 next 后，再用新会话复验。
[保存后派发复验](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3Adb865e04-4940-41b4-adbd-c7575ff9446e%3Adelegate-task%3Aoms-202-claude-dispatch-recheck-20261116-1)
按 next 结束本轮，由完成通知恢复，没有调用等待工具。
[Codex worker](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3A7ae32c94-d197-4dde-ae77-130751a30c25%3Adelegate-task%3A60d8dfda-3fb3-4141-b6c5-c5f4afb58981)
完成后，宿主执行记录的 provider 为 codex，executedModel 为 gpt-6.1-sol，
effort 为 reasoningEffort=medium。文件结果由控制会话及根会话分别复算一致。
sample.txt 共 41 字节，SHA256 为
`5c6dac794fa11f3459387a44c231a3733c27c9bdfbbcfaff515a55887ec4bd11`。

最后，[直接 how 入口验收](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3Adb865e04-4940-41b4-adbd-c7575ff9446e%3Adelegate-task%3Aoms-202-claude-direct-how-20261116-1)
从 how/SKILL.md 开始读取，按项目的 how explainer 行启动一个
[Codex explainer](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3Ac8ee8aeb-b63d-4bc9-be42-040d7a4584f2%3Adelegate-task%3A7c3b9100-e382-479c-9087-c2ba38c878ab)。
宿主执行记录确认同样的 Codex 模型，真实请求使用 reasoningEffort=medium。
该 worker 正确解释了 math.mjs 的 add。

直接 how 的控制会话曾用错误的单数 taskId 参数调用 t3_background_wait，宿主拒绝了该调用。
它随后结束本轮，由完成通知恢复并完成结果。
子任务自报的“无轮询”不等于完整轨迹没有工具错误，根会话读取轨迹后记录了此异常。
这是当前宿主的 Claude 后台状态工具，不是已退役的工具。
因此直接 how 的跨模型功能验收通过，宿主工具调用并非全程无误。
沿用 Attack the Premise 原则，停止用更多通用指令补偿模型的参数错误，保留宿主工具契约。

## 验收边界

混合 panel、auto、session、禁用 provider 和不支持的 effort 只做读取与解析检查，
没有执行 panel、swarm 或故意发出无效请求。
session 检查采用 Claude 当前 medium，区别于该模型 catalog 默认 high。

本次只验证 shared 派发，未重新执行 worktree 或完整开发工作流。
既有 worktree 验证仍见 [2.0.1 记录](oms-worktree-verification-2.0.1.md)。
基于指令的适配不能保证每个模型每次都遵守 schema，不把一次成功扩展为所有角色均已验收。

日常安装没有升级到 2.0.2，当前日常发行版仍为 2.0.1。
个人模型表、AGENTS.md、CLAUDE.md、Codex config.toml、Claude settings.json，
以及 T3 用户模型表的存在状态和内容均与验收前一致。
源码、隔离原生安装和真实候选会话的证据分别记录，不据此声称日常 2.0.2 自动加载通过。
