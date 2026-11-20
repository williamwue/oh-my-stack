# OMS 工作流基线与宿主能力

核查日期为 2026-11-20，范围是设计阶段的源码比对、官方接口核对和现有运行记录。新 OMS 尚未在任何宿主上通过完整工作流验收。[全部技能、剧本与外部依赖索引](pstack-workflow-inventory.md)

## 版本和判定依据

| 对象 | 固定基线 | 用途 |
|---|---|---|
| 原版 Cursor pstack | 0.15.46，提交 `0b46ec399d55f2829e88822998f53b84944837d3` | 定义触发条件、职责、批准点、可接受的降级及交付物。取 t3-pstack 已同步的提交，便于逐文件比较。另核对当天上游 HEAD `aaeb0ea3a0584995aa8f55ce44c6c5259414b896`，两者的 pstack 子树同为 `b47cf6d63625b48fd77893233044849935cdae3d`。[原版](https://github.com/cursor/plugins/tree/0b46ec399d55f2829e88822998f53b84944837d3/pstack) |
| pstack-claude | 0.9.138，`a12b04786023e762f12f5de7bb5fafb8c23f8c36` | 参考原生宿主的落地方式，留意它新增的角色及工作流。[上游](https://github.com/michael-denyer/pstack-claude/tree/a12b04786023e762f12f5de7bb5fafb8c23f8c36) · [OMS 已记录的基线差异](t3.md) |
| t3-pstack | 2.5.2，`6584ddba12e03b5ccd8453c7940dbe1a3b5c07d3` | 参考派发位置的生成替换、provider 选项、委派生命周期。OMS 当前发行包中该目录的 Git 树为 `44095559ba1082c65314a2cb7b473feff216dc8e`。[同步来源](https://github.com/chhoumann/t3-pstack/blob/6584ddba12e03b5ccd8453c7940dbe1a3b5c07d3/tools/upstream.json) |
| 本机可执行入口 | Claude Code 2.1.329、Codex CLI 0.171.0、OpenCode 2.2.7 | 通过各自的 `--version` 核实。CLI 存在只证明可调用，还需验证技能发现、权限和真实派发。 |

## 两种移植的行为差异

- **how / why / reflect**：固定原版的 how 派一个只读 worker，保留其解释；why 按 Git 和讨论记录给出有出处的推断；reflect 从完整会话找结论，先请求批准再编辑技能。pstack-claude 的 Codex 映射却描述了多个 explorer、investigator 或 reviewer 后再综合。移植到同一名称前，先比较步骤和产物；采用原生工具映射时不要连带引入额外席位。[原版 how](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/how/SKILL.md) · [参考移植的 Codex 映射](../plugins/pstack/skills/poteto-mode/references/codex-tools.md)
- **角色表**：原版与 t3-pstack 都列 9 个角色配置项，其中包括 arena 候选、交叉裁判池、swarm worker 和 interrogate reviewer。原生移植扩展过的 architect、why、reflect 角色不构成原版强制席位。模型选择、不可用时的回退、面板人数和厂商独立性要分开记录。[原版配置](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/setup-pstack/SKILL.md) · [T3 配置](../plugins/t3-pstack/skills/setup-pstack/SKILL.md)
- **Cursor 自身也提供 Claude Code 映射**：其中给出云端 worker 转本机 worktree、只读探索、模型和工具不可用时的处理。可作为第一方移植依据。Git worktree 可以隔离代码写入，但仍共享机器资源，不能宣称保留了云端执行环境。[原版宿主指南](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/docs/harness/claude-code.md)

## 宿主能力矩阵

表中描述的是设计可依赖的接口或参考实现。标为“待验”的行为需要在真实入口运行。T3 的子模型来自哪个 provider 与父会话在哪里编排分别记录；独立 CLI 的适配不能凭模型名称猜测自己身处 T3。

| 行为 | T3 Code | 原生 Claude Code | 原生 Codex | 原生 OpenCode 2 |
|---|---|---|---|---|
| 技能发现与角色配置 | 后端加载技能；T3 工具可用性与 provider 配置需同时确认。已有 Codex 主会话实证 | 插件命名空间、技能、subagent 定义和模型别名；新 OMS 加载待验 | 插件技能、配置目录与 hook 信任；须在终端做独立启动测试 | 参考插件注册技能；模型配置需进入当前项目或用户设置；验证实际技能名和加载路径 |
| 派发、选模与 effort | `delegate_task` 指定 provider、model 和 catalog 公布的 option；不同 provider 选项名可不同 | `Agent` / 具名 subagent，可声明模型和 effort；可选模型受宿主和策略限制 | 原生 spawn、具名 agent 与模型配置；默认继承时容易误用父模型；特定模型覆盖与是否继承完整上下文需一起测试 | 官方支持具名 agent、`provider/model#variant`；参考移植通过 `subagent` 派发，须核验当前 schema、模型列表及 variant |
| 子上下文与写入隔离 | 子任务只收 brief；传绝对路径、输入、验收条件。worktree 从基线提交开始；未提交改动需单独安排 | 独立子上下文；可指定 worktree、工具和权限；原版 Explore 保留 Bash，需验只读边界 | 区分新上下文和 fork；原生 agent 可能共享工作目录；并行写需要独立 worktree 或输出路径 | 命名 agent 的权限可约束编辑与 shell；参考移植需另外准备 worktree；仅在 brief 标“只读”不足以验收 |
| 并行、完成、取消 | 记录 taskId，按完成事件唤醒，核对终态；取消后核实工作区归属再复用 | 原生前台/后台子任务、完成通知；运行中断和后台权限的交互待验 | 使用原生等待/中断；需测试并发上限、取消后是否仍写文件和父任务恢复 | 参考移植用 background 和 sessionID 续接；完成、取消、重启后恢复待验 |
| 模型与独立性证据 | 可分别记录目标、请求选项与 executedModel；既往案例仅确认请求 high | 文档提供查询子模型的方法；验证本机日志和全局覆盖项，单一厂商可能无法提供合格交叉裁判 | 核对原生子会话运行记录；不同 GPT 型号不能自动视为不同厂商 | 模型前缀、provider、variant 均需核对；多个 provider 实例也可能服务同厂商。实际执行字段待验 |
| PR、唤醒、会话历史 | PR watch 与完成通知有宿主契约；按 thread 取活动。既往派发实证不覆盖 watch 或跨重启 | Git/forge 工具与批准、宿主计划能力分别探测；历史按会话范围读取 | forge CLI/集成和工作区会话可作依据；持久唤醒、PR 权限和恢复单独验证 | 检查 forge 工具、历史来源、schedule 和授权；禁止用周期任务模拟未经授权的一次性动作 |
| UI、性能、形式验证及外部自动化 | 仅在暴露对应设备、浏览器、分析器或服务时可执行 | 按项目驱动、已连接服务和授权核实 | 同左，文件读取或测试通过不等于 UI 实测 | 同左，具体插件可随安装变化 |

接口依据：[T3 官方编排说明](https://github.com/pingdotgg/t3code/blob/main/docs/orchestration-v2/orchestrator-mcp-server.md) · [Claude Code 官方 subagents](https://code.claude.com/docs/en/sub-agents) · [Codex 官方 subagents](https://developers.openai.com/codex/subagents/) · [OpenCode 官方 agents](https://opencode.ai/docs/agents/) · [OpenCode 参考移植](../plugins/pstack/skills/poteto-mode/references/opencode-tools.md)。在线文档随版本变化，验收以实际宿主暴露的 schema、权限和运行记录为准。

## 从接口能力到工作流验收

| 原版场景 | 四个宿主分别要证明什么 | 当前判定 |
|---|---|---|
| swarm 分片与竞赛 | 先声明覆盖范围或竞赛选择规则，给独立 brief；覆盖分片必须有终态。带 SHA / 测量方法的任务缺证据须重派一次，再缺记 gap；掉线不得计作 PASS。并行写要独立产物。 | T3 → Codex 在现有发行包上有单 worker 成功例；多 worker、竞赛、缺证据与取消路径，以及三个原生宿主均待验。 |
| arena | 至少两个候选，隔离实现并按同一 rubric 比较；裁判按原版顺序选与父模型不同厂商的候选。裁判不可用、父厂商未知各有单独披露规则。最后选基底、移植优点并运行验证。 | T3 和具备多模型的 OpenCode 有候选接口；须测实际厂商与写入隔离。Claude/Codex 原生目录受限时可测原版允许的降级；不能把跳过裁判标成完整交叉评审。 |
| interrogate | 各 reviewer 收到一致的意图、基线与未提交改动。父线程重跑每项发现、排除未复现项、合并同根问题。允许零发现，交付报告后停止。 | 四端均需验证未提交 diff 在隔离工作区可见、复验环境一致；跳过 arena 的交叉裁判、选基底和移植步骤。 |
| babysit / shipping / autopilot-stack | 区分仅检查、处理评审、持续跟进与合并授权；按当前 head 验证。stack 在验证完成处交接。持久唤醒需要宿主或服务支持。 | 四端均依赖实际 forge、账号和授权；本阶段无真实 PR 操作。 |
| 谈话、历史与外部驱动类 | 文本类可直接试跑；reflect 须先获批准再改技能。trace-forensics 能消费已有录制，runtime-forensics 必须抓运行中的信号。visual-parity 需要固定基线的像素差。 | 各宿主先检查数据、项目驱动和授权。对缺少 webhook routine 的宿主，make-bot-ui 暂无确认的完整映射；Benny 亦有独立外部依赖。 |

前三行的精确分支见[工作流索引](pstack-workflow-inventory.md)。先前的[新会话实测](t3-thread://v2/1d3f0332-60f4-46fa-bf35-59fe3034cfdb/mcp:launch:b997468d840659e077b87415e737b16db1e9711e3f19b2638b5e3daf4ccbe483)证明 T3 中 Codex 父会话能从发行包发现 swarm、使用角色表并得到 Sol 子任务终态。仓库另有[早期 T3 Claude 父会话的跨 provider 记录](oms-t3-models-verification-2.0.2.md)，使用旧适配；它不是新 OMS 在独立 Claude Code 或 T3 Claude 后端的验收。

## 下一次实现的最小验证

在 T3 和独立 Codex 各用同一小仓库、同一提交做两分片 swarm。一名 worker 只读，另一名写入独立产物；用独立夹具模拟缺少指定 SHA 的回报，检查一次重派及最终 gap。证据应含宿主版本、角色行、请求参数、可得的执行模型、基线和产物、每个 worker 的终态与汇总报告。随后在独立 Claude Code、OpenCode 2 及 T3 → Claude 重用该案例。不同宿主可有不同执行机制，必须能从结果判定哪些原版条件实际得到满足。
