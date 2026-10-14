# 在 T3 Code 中使用 OMS 工作流

[English](../t3-orchestration.md) | [简体中文](t3-orchestration.md)

当你希望 T3 管理委派任务时，生成显式选择 T3 的包。
Codex 与 Claude Code 保留各自的插件安装格式。T3 负责模型目录、子任务、结果返回和事件工具。

## 生成独立候选包

在源码仓库执行：

```bash
node tools/generate.mjs --orchestration t3 --output-root .tmp/t3
```

Codex 与 Claude Code 候选包位于 `.tmp/t3/packages/` 下。
OMP、Pi 和默认生成操作保留原生绑定。T3 生成需要独立输出目录，避免覆盖默认发行输入。
这一步不会安装插件、发布版本或修改个人模型配置。

通过对应宿主已有的本地包方式选择候选包，在提供 `orchestrator_capabilities`
和 `delegate_task` 的 T3 会话中使用它。普通终端缺少这些工具时应报告能力不可用。
候选绑定不增加审查阶段，不改变固定的 pstack 流程。

## 配置实际可用的模型

从当前会话读取 `orchestrator_capabilities`，保存结构化结果。
核对供应商实例、模型 ID、选项类型与执行限制。目录中有模型，不代表该实例可运行子任务。

`scripts/t3-orchestration.mjs` 只处理本地 JSON 和准备请求。
实际 T3 工具仍由会话中的 agent 调用。各命令使用共同形式：

```bash
node scripts/t3-orchestration.mjs COMMAND --input input.json --output output.json
```

T3 配置独立保存在项目或用户目录的 `.oh-my-stack/t3/resolution.json`。
最近的项目配置整体覆盖 T3 用户配置，不与原生 Codex、Claude 配置混用。
同一 preset 的刷新保留目标、面板成员、顺序、长度和选项，包括暂不可运行的保存目标。
新覆盖必须通过当前目录校验；准备具体任务时再检查其可运行性。保留配置不等于执行成功。
未配置的面板需要明确的有序成员，不能用重复父模型填充。

选项值保持真实 JSON 类型。布尔值 `false` 不能变成字符串 `"false"`。
未指定的选项保持未固定状态，记录中不能声称已经验证其推理等级。

## 固定跨家族选择与降级顺序

配置可增加 `selectionPolicy`。`roleCandidates` 按角色保存有序候选，
`fallbackTargets` 保存明确允许的同家族渠道替代。
`minimumPanelFamilies` 是用户自定义约束，不是 pstack 的默认要求；未设置时，同家族的多个独立席位有效。
自定义家族下限存在时，单席位的跨家族替代无法证明整个面板仍达标，因此会阻塞。
应先审查并配置完整的有效面板；工具不会从其他席位的旧配置推断它们之前的替代。
同一 preset 刷新会保留策略；显式覆盖替换整个策略。

轨迹审计角色 `trail-reviewer` 必须与 `reviewedModel` 属于不同的已知模型家族。
`reviewedModel` 默认使用当前线程模型；代码实际由其他模型执行时传入执行者模型。
先检查角色配置的目标，再按候选顺序检查。同家族、家族未知或目标不可运行都会记录跳过原因。
没有合规 reviewer 时返回 `BLOCKED: independent review`，不能把其他检查当成审计完成。

工具识别模型 ID 最后一个斜杠片段中的 `gpt`、`claude`、`gemini`、`grok` 前缀。
自定义不透明 ID 可通过 `modelFamilies` 显式声明家族，但不能覆盖已知前缀。
provider 名称不决定家族；这些声明和报告的模型名均不构成后端引擎证明。

禁用 provider 会关闭该渠道，不是模型标识被拒绝。工具不会启用 provider 或改写其设置。
其他明确配置的同家族渠道仍可作为候选。面板中的 `inheritParent` 不计入自定义的家族下限。

### 保留原版的模型拒绝回退

`selectionPolicy.modelFallbacks` 为路由保存 `strategy`、`familyDefaults` 和 `unknownFamilyDefault`。
`interrogate` 策略只用于 `interrogate.reviewers`；`arena` 策略只用于 `arena.runners` 或 `architect.runners`。
默认目标必须使用当前观察到的完整 provider/model/options；使用时必须与被拒绝席位属于同一 provider。

宿主实际拒绝模型后，向 `prepare` 传入 `modelRejections`：每条包含被拒绝的 `target`、
`code: "model-rejected"`、非空的 `rawError` 及错误列出的 `validModelIds`。
工具不能独立认证传入的错误文本。provider 不可用、选项错误、超时都不能伪装成模型拒绝证据。

先尝试映射的家族默认模型；已知家族缺少映射时报告配置错误，只有真正未知的家族才使用 Reviewer A 默认模型。
默认模型也被拒绝后，Interrogate 从错误列出的有效 ID 与当前原 provider 目录的交集中选择近似模型，
优先同家族和兼容的推理等级；Arena 与 Architect 的替代必须留在默认模型的家族内。
不能用其他 provider 的错误或目录授权替代，也不能猜模型 ID。
替代选项使用新模型实际支持的键和值，审计中列出改变或未固定的选项。

别名 `auto`／`inheritParent` 不进入模型拒绝回退。保留席位、原配置目标和错误证据，
替代必须使用新的 `stepId`，之后重试复用已保存请求。没有有效替代时仍报告不可用。

### 保留候选与裁判规则

Arena 的候选没有产出时，可按 N-1 继续，记录退出及实际原因。
provider 不可用要如实报告，不能声称模型被拒绝。
Architect 仍需至少两个结构不同的设计产物才能综合，候选退出不能免除该要求。
Arena 从配置池中选择一个可运行裁判，优先不同家族；这是偏好，不是硬门槛。
决策记录的跨家族审查仍是必需条件。

运行时先解析保存配置的结构，再检查当前任务目标，避免无关旧目标阻止当前任务。

`audit.selection` 保存配置目标、实际目标、家族、配置作用域、跳过原因及替代类型。
必须原样调用准备好的目标；更换选择需要新的步骤标识，不能在同一次重试中静默改模型。
向 `observe` 传入保存的 `prepared` 和任务回执，可对比请求与报告的 provider/model。
交还结果时列明替代原因及 taskId，不把代理的选择标成“T3 自动指定”。
报告的模型名称不能证明推理参数实际执行。

## 准备委派与验收结果

从生成包的 `config/t3-role-contracts.json` 读取角色和路由。
按从 1 开始的面板成员编号准备任务，传入完整要求、工作目录、允许写入路径和稳定的运行标识。
子任务只收到自己的简报，因此必须包含完整角色合同与已安装 Skill 的路径。

选中的工作流任务属于 T3，使用准备好的参数调用 `delegate_task`，保存返回的 `taskId`。
异步任务只剩等待时结束回合，由 T3 通知唤醒。需要在当前回合取结果时读取 `task_status`。
重试复用原请求和 `clientRequestId`。新一轮审查重新委派，并传入原要求、已有发现、回应与未解决异议。

等待超时不等于任务失败或取消。原任务结果与后续子线程活动分别记录。
调用 `task_cancel` 后核对实际状态，不能把取消请求的确认当成已取消。
子任务完成后，父会话仍需检查真实产物。

## 使用宿主事件和验证工具

获授权创建 PR 后立即关联全部 stack 层。监听使用 `watch_pull_request` 并结束回合，
交还工作前取消监听。已 settled 的线程需先通过实际可用接口恢复。
子任务请求不会自动授权创建顶层会话。

持久调度需要用户请求。当前项目默认绑定当前线程，其他项目不能绑定到这里。
新线程调度需要明确的用户意图。时间与 webhook trigger 保持结构化对象。
本地准备的请求不代表已经创建调度。

网页验证先读取 `preview_status`，尊重用户持有的标签页。
设备验证先读取 `device_list`，再调用 `device_open`，使用工具返回的准确 launcher 和参数。
本地测试、真实子任务、插件安装、PR 监听、调度和 UI 验证分别报告。

完整参数和边界见[英文指南](../t3-orchestration.md)。
源码仓库的 `docs/acceptance/2026-10-13-t3/plan.md` 记录实施步骤和验收目标。
