# OMS 2.0.2 日常升级与角色分工验收

2026-11-16，用户授权将日常 Codex 和 Claude 升级到 2.0.2，并配置
Opus 设计、Sol 执行、Astra 诊断与评审。本记录补充此前的
[源码与候选验证](oms-t3-models-verification-2.0.2.md)。

## 安装与备份

日常发行版来自提交 `b6cb7c3ed6bc07d80d90bcc243460f5b48c7bb6c` 的 Git archive，
固定目录为 `/Users/williamwue/Library/Application Support/oh-my-stack/distributions/2.0.2-b6cb7c3e`。
两个后端的原生 marketplace 均指向该快照，避免源码分支切换影响日常安装。

升级前备份位于
`/Users/williamwue/Library/Application Support/oh-my-stack/backups/daily-202-20261116-142953`。
备份包括原生设置、个人指令、模型表、Claude 插件注册信息及文件存在状态。
备份和登录凭据留在本机，不写入仓库。

Codex 使用原生 marketplace remove、add 和 plugin add 命令更换固定来源并安装 2.0.2。
原生 CLI 不允许直接用同名 marketplace 覆盖另一来源，因此先在隔离目录验证了更换流程。
Claude 使用原生 marketplace add 更新目录来源，再执行 plugin update pstack@oms。
两个后端均报告 2.0.2 已启用，Claude 的 folderVersion 同样为 2.0.2。

## 生效模型配置

用户级 T3 模型表写入 `~/.t3/pstack-models.md`，覆盖全部 19 个当前上游角色。
各 scalar 和 panel 条目共 23 个目标，均按真实宿主 catalog 验证 provider、完整模型和 effort。
默认 effort 为 medium，重要角色使用显式 high 或 xhigh。

- Opus high 用于 judgment and prose，Opus xhigh 用于 strongest judgment。
- Sol medium 用于 feature、refactoring、how、why investigators、reflect tooling、swarm 和 no-comments。
- Astra high 用于 bug-fix、perf-issue、hillclimb、why synthesizer、reflect judgment 和 thermos reviewers。
- arena、architect 和 interrogate 的常规 panel 使用 Sol 与 Astra，避免额外复制 Opus 主会话。
- arena cross-judge pool 保留 Astra 与 Opus，供不同 provider 的裁判选择。

模型表继续采用既有项目表优先规则，没有在任何项目写入额外覆盖表。
`Code` 项目新会话的默认模型设为 claudeAgent/claude-opus-5-5，effort high。
其他项目和已运行对话的模型未改动。模型表本身不改变父会话模型，也不增加固定工作步骤。

Codex 全局 AGENTS.md 的个人模型段原先无条件要求使用旧原生覆盖。
本次仅补充 T3 模型表优先这一适用范围，原生 Codex 的角色值与模型表保留原样。
Claude 的 CLAUDE.md 没有修改，没有重新创建已经删除的 Code/AGENTS.md。

## 原生加载与信任

升级前 pstack hook 在 Codex hooks/list 中已经显示 modified。
2.0.1 与 2.0.2 的 hook 脚本和清单逐字相同，升级没有修改上游 hook 行为。
通过原生 TUI 的 Review hooks，只选择 pstack SessionStart 并重新信任。
随后 hooks/list 确认其 enabled、trusted。
Basic Memory 的两个 hook 保持 enabled、untrusted，没有执行 trust all。

Codex app-server skills/list 在日常目录发现 67 个 pstack 技能，均启用且路径为 2.0.2，errors 为空。
Claude plugin validate 通过，保留上游 README 安装示例的非阻断建议。
固定快照的生成器检查通过，安装后的 T3 参考、setup 入口及 hook 与快照一致。

其他插件记录、原生模型表、Claude 指令及非 OMS 设置已与备份核对一致。
为原生 hook 信任操作打开 TUI 时，CLI 增加了一次 Sol 引导计数；已还原这个无关 UI 偏好。

## 真实会话验收

机器可读证据见 [日常验收数据](evidence/oms-2.0.2-daily.json)。

[Opus 主控验收](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3Adb865e04-4940-41b4-adbd-c7575ff9446e%3Adelegate-task%3Aoms-202-daily-opus-sol-astra-20261116-1)
在新会话里观察到启动路由提示和 pstack 技能目录，通过原生 Skill 调用 poteto-mode 成功。
工具轨迹确认原生 Skill 调用成功，没有通过源码仓库或候选目录补救加载。
主控读取的日常目录为固定的 2.0.2-b6cb7c3e 发行版。

主控从用户模型表解析角色，先确定非负安全整数求和函数的行为及错误契约，
再顺序派发一个实现者和一个独立评审者。

- 主控使用 claudeAgent/claude-opus-5-5，实际 effort high。
- [Sol 实现者](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3A37f0f406-143f-4727-93ee-9ac666a97622%3Adelegate-task%3A9f57b245-7a56-4b76-97d0-9db0ae8d5ae1)
  使用 feature, refactoring 行，实际模型 gpt-6.1-sol、reasoningEffort medium。
- [Astra 评审者](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3A37f0f406-143f-4727-93ee-9ac666a97622%3Adelegate-task%3A969f5880-da9e-4a74-b5cd-597cec7eec9e)
  使用 thermos reviewers 行，实际模型 gpt-6-astra、reasoningEffort high。

根会话分别读取三个线程的宿主执行记录，所有 executedModel 均与请求一致。
实际 effort 由各会话只读能力查询返回的 inheritedOptions 确认。
两个 worker 没有嵌套任务，主控没有轮询等待或调用等待工具，完成通知恢复后继续工作。
这轮真实工作流未出现工具调用失败。两个 worker 有聚合输出截断及重读记录，单独保留为警告。

根会话进一步读取两个 Codex 原生 session 记录，确认 developer 消息中分别提供了
启动路由提示和 2.0.2 技能目录，补足了 worker 自报上下文这一证据边界。
Codex 缓存与日常发行版内的全部 596 个技能文件逐字一致。
主控未追溯 Claude hook 定义；根会话随后读取 hooks/hooks.json，确认其 SessionStart 命令。

## 实际交付与评审结果

Sol 实现 sumCents 并交付 37 项测试。
Astra 独立检查实际代码与契约，发现一个低级测试缺口 R1。
原测试只检查错误的 name 和 message，未确认错误构造类型；普通 Error 改名后也能通过。
Opus 主控自行在 8 处断言补充构造类型校验，没有再派发其他代理。
修复后 37 项测试全过，Astra 提出的伪造错误变体被修复后的测试抓到。

主控另做 22 个边界探测和 8 个手写变体检查，记录于验收数据，未宣称通用 mutation score。
根会话读取最终代码和测试，再独立执行 node --test，结果为 37 通过、0 失败。
用户模型表在验收前后 SHA256 一致。

最终仓库检查中，生成器的 56 个文件一致，Markdown lint 通过；
完整回归为 2,054 通过、160 跳过、0 失败，共 2,214 项、64 个文件。
测试使用 Bun 1.4.4，PATH 上为 Node 24.22.1。跳过项没有算作通过。

这次交付说明角色配置确实驱动了设计、实施和独立评审，也验证了有证据的评审意见能够被处理。
它不代表所有 pstack playbook 或全部 19 个角色都已逐一运行。
实施者与评审者继承 full-access 模式，文件范围由任务说明约束，没有宣称宿主强制只读。

## 最终边界

两个原生后端的日常安装和用户 T3 配置已完成。
Code 项目新会话默认模型已设为 Opus/high，并通过项目 API 回读；没有创建新的顶层线程。
现有会话的模型没有自动切换，其他项目的父会话模型选择也没有修改。

本次仅验证 shared 子任务，未重新执行 worktree、架构多方案比较、arena 或完整 thermos 双评审。
这次使用 thermos reviewers 角色的单个独立评审任务，不能等同于运行完整 thermos 技能。
既有 worktree 验证仍见 [2.0.1 记录](oms-worktree-verification-2.0.1.md)。

未审计订阅账号归属、剩余额度或账单归属；catalog 可用和调用成功不等于订阅计费来源核验。
此次只变更本机配置、固定发行版及验证记录，没有生产写入、远程发布或源码工作流改造。
