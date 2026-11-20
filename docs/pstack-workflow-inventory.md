# 原版工作流索引

基线为 Cursor pstack 0.15.46。下表的能力列用于定位移植的首要依赖。完整步骤、条件分支和允许的降级以每行固定提交的源文件为准。宿主之间的可用性与验证边界见[宿主能力矩阵](pstack-host-baseline.md)。

## 技能入口

原版顶层 skills 目录有 58 项，其中 34 项列于下表，另外 24 项原则技能由具体工作流按条件读取。原则属于工作流约束；它们不单独计作 24 条需实现的编排管线。[固定版本全部技能](https://github.com/cursor/plugins/tree/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills)

| 入口 | 可观察的职责或结果 | 主要依赖 |
|---|---|---|
| [architect](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/architect/SKILL.md) | 追踪影响范围、比较两种设计；大型或争议方案转 arena | 代码、条件面板 |
| [arena](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/arena/SKILL.md) | 候选分别实现同一任务；评估、选基底、移植优点、复验 | 隔离、面板、执行 |
| [automate-me](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/automate-me/SKILL.md) | 从偏好和可选历史证据生成或更新个人模式技能 | 历史、技能写入 |
| [benchmark-checklist](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/benchmark-checklist/SKILL.md) | 审查瓶颈、测量范围、误差和重复性 | 测量工具 |
| [blast-radius](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/blast-radius/SKILL.md) | 追踪变更在别处的影响，运行真实代码验证安全前提 | 代码、执行 |
| [bro](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/bro/SKILL.md) | 将上一条消息改写成普通语言 | 会话 |
| [correct](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/correct/SKILL.md) | 从历史错误找可执行约束，用真实旧错误证明约束生效 | 历史、执行 |
| [create-formal-verification-skill](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/create-formal-verification-skill/SKILL.md) | 为高代价错误选择证明或模型检查手段，生成项目技能 | 验证工具、技能写入 |
| [create-verification-skill](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/create-verification-skill/SKILL.md) | 建立可操作实际产品的项目验证入口 | 产品驱动、技能写入 |
| [figure-it-out](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/figure-it-out/SKILL.md) | 为缺少现成剧本的任务建立可审计步骤和假设循环 | 证据、执行 |
| [how](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/how/SKILL.md) | 一次只读派发完成探索和解释，父线程轻编交付 | 只读子任务 |
| [in-your-own-words](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/in-your-own-words/SKILL.md) | 复述用户目标和要解决的问题 | 会话 |
| [interrogate](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/interrogate/SKILL.md) | 独立对抗审查，父线程重跑证据，合并同根问题 | 面板、隔离、执行 |
| [ketchup](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/ketchup/SKILL.md) | 说明用户上次发言后发生的变化及待用户决定项 | 会话 |
| [ketchup-video](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/ketchup-video/SKILL.md) | 同一进展制成带字幕短视频，并附待决事项 | 历史、媒体工具 |
| [maintain-formal-verification-skill](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/maintain-formal-verification-skill/SKILL.md) | 跟踪相关提交，重跑模型并区分模型漂移与实现缺陷 | Git、验证工具 |
| [maintain-verification-skill](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/maintain-verification-skill/SKILL.md) | 并行查各功能源码，由一场真实操作复核功能清单 | 派发、产品驱动、forge |
| [make-bot-ui](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/make-bot-ui/SKILL.md) | 为 webhook routine 创建触发界面，保护发送端密钥 | routine、密钥交互 |
| [no-comments](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/no-comments/SKILL.md) | 派发专用 comment-sicko 审查，处理采纳项 | 角色派发、执行 |
| [poteto-help](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-help/SKILL.md) | 按问题指向正确的技能、剧本或原则 | 技能发现 |
| [poteto-mode](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/SKILL.md) | 匹配 playbook、装入条件原则、跟踪阶段和授权 | 路由、任务清单 |
| [recall](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/recall/SKILL.md) | 用工作区内历史与现场记录重建当前状态 | 历史、Git |
| [reflect](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/reflect/SKILL.md) | 从完整会话提炼改进，先获准再修改技能 | 历史、批准、技能写入 |
| [setup-pstack](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/setup-pstack/SKILL.md) | 发现可用模型，将已选择的角色和预算写入有效配置 | 目录、配置写入 |
| [sharpen](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/sharpen/SKILL.md) | 深化现有任务并改写需求 | 会话 |
| [show-me-your-work](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/show-me-your-work/SKILL.md) | 为需要审计的任务保留决策、证据和结果 | 文件、Git |
| [statechart](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/statechart/SKILL.md) | 运行状态模型，展示最短违规路径或状态图 | 模型检查、图形输出 |
| [swarm](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/swarm/SKILL.md) | 声明完成条件，分片或竞赛，汇总终态与缺口 | 派发、回收、隔离 |
| [tdd](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/tdd/SKILL.md) | 在满足触发条件时先证明测试失败，再修复并验证 | 执行、测试 |
| [teach](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/teach/SKILL.md) | 组合 how 的机制解释和 why 的历史证据 | 只读子任务、历史 |
| [technical-writing](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/technical-writing/SKILL.md) | 按文档用途组织与编辑文字 | 文档 |
| [typescript-best-practices](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/typescript-best-practices/SKILL.md) | 为 TS/TSX 应用项目代码约束 | 代码 |
| [unslop](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/unslop/SKILL.md) | 清理文风，保留作者的意思 | 文档 |
| [why](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/why/SKILL.md) | 查引入及改变设计的提交和讨论，区分记录、推断与未知 | Git、forge |

## poteto-mode 的 22 个 playbook

| 剧本 | 验收时关注的行为 | 主要依赖 |
|---|---|---|
| [authoring-a-skill](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md) | 按技能作者流程编写并验证可调用性 | 技能写入 |
| [autonomous-run](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/autonomous-run.md) | 先定义退出谓词，再循环到达或如实报告阻碍 | 唤醒、证据 |
| [autopilot-full](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/autopilot-full.md) | 按授权队列推进，只在授权范围内交付 | 唤醒、forge、隔离 |
| [autopilot-stack](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/autopilot-stack.md) | 每层在当前 head 验绿后交接，由操作者决定合并 | forge、唤醒 |
| [babysit](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/babysit.md) | 区分 check、threads-only、drive，跟踪至各自终点 | forge、watch |
| [bug-fix](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/bug-fix.md) | 在匹配的产品表面复现，定位并用同一表面验证 | 产品驱动、执行 |
| [eval](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/eval.md) | 预先定判据，向候选隐藏评分细则，比较结果 | 隔离、评审 |
| [feature](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/feature.md) | 追踪影响、选择设计、实现并验证实际体验 | 代码、派发、产品驱动 |
| [hillclimb](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/hillclimb.md) | 固定指标、负载和停止条件，记录每次保留或回滚 | 测量、Git、forge |
| [investigation](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/investigation.md) | 从代码与证据得出有出处的回答 | 代码、历史 |
| [multi-phase-plan](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md) | 为真正多阶段的变更定义阶段、依赖和可验证产物 | 计划、执行 |
| [opening-a-pr](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/opening-a-pr.md) | 以实际 diff 和验证证据制作可审查 PR | Git、forge |
| [pause-safely](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/pause-safely.md) | 到达安全边界、停止子任务、记录可恢复状态 | 取消、历史 |
| [perf-issue](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/perf-issue.md) | 用同一测量路径采集基线与复测 | 产品驱动、测量 |
| [prototype](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/prototype.md) | 围绕一个会影响选择的问题制作与验证原型 | 产品驱动、执行 |
| [refactoring](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/refactoring.md) | 先锁定行为契约，再改结构并重跑等价验证 | 测试、执行 |
| [runtime-forensics](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/runtime-forensics.md) | 在运行中的目标采集信号，用探针验证因果 | 实时驱动、profile |
| [session-pickup](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/session-pickup.md) | 从限定工作区的会话、云端记录或 Git 接续上下文 | 历史、授权 |
| [shipping](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/shipping.md) | 逐 PR 在对应 head 独立验证，依次处理交付条件 | 独立派发、forge、watch |
| [trace-forensics](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/trace-forensics.md) | 对已有采样文件建立可查询数据并归因 | 文件、profile 解析 |
| [visual-parity](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/visual-parity.md) | 先固定截图基线，在匹配环境逐组件比较像素差异 | 隔离、产品驱动、图像 |
| [worktree-cleanup](https://github.com/cursor/plugins/blob/0b46ec399d55f2829e88822998f53b84944837d3/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md) | 审计工作树的归属与保留理由，按清理规则处置 | Git、历史、授权 |

## 附属工作流与包边界

原版还含 `benny` 自动化：setup-benny 建立配置、triage-issue-reports 分诊、reproduce-and-fix-issues 复现和修复。验收需要触发器、持久任务状态、issue 访问和真实产品驱动。t3-pstack 的同步清单明确排除了 automations 和 make-bot-ui；这两项应单独做能力探针。原版两个 agent 定义为 poteto-agent 和 comment-sicko。thermos 和若干 cursor-team-kit 技能来自同仓其他组件，在两个移植包里出现并不等于它们属于原版 pstack 的 58 项。[Benny](https://github.com/cursor/plugins/tree/0b46ec399d55f2829e88822998f53b84944837d3/pstack/automations/benny) · [t3-pstack 同步配置](https://github.com/chhoumann/t3-pstack/blob/6584ddba12e03b5ccd8453c7940dbe1a3b5c07d3/tools/upstream.json)
