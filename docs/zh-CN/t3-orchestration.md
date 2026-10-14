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
新面板按合同的 `defaultCount` 建立独立席位，四个默认面板各有两个。
继承父模型的席位有效，准备请求时各有独立标识；缺少配置文件也使用这些默认席位。
同一 preset 中保存的空面板仍为空。Arena 裁判池每次只选择一个席位。

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
`cursor-grok-` 与 `composer-` 也识别为 Grok 家族。
自定义不透明 ID 可通过 `modelFamilies` 显式声明家族，但不能覆盖已知前缀。
provider 名称不决定家族；这些声明和报告的模型名均不构成后端引擎证明。

禁用 provider 会关闭该渠道，不是模型标识被拒绝。工具不会启用 provider 或改写其设置。
其他明确配置的同家族渠道仍可作为候选。面板中的 `inheritParent` 不计入自定义的家族下限。

### 保留原版的模型拒绝回退

`selectionPolicy.modelFallbacks` 为路由保存 `strategy`、`familyDefaults` 和 `unknownFamilyDefault`。
`interrogate` 策略只用于 `interrogate.reviewers`；`arena` 策略只用于 `arena.runners` 或 `architect.runners`。
默认目标必须使用当前观察到的完整 provider/model/options；使用时必须与被拒绝席位属于同一 provider。

没有 `selectionPolicy` 时，准备请求为显式面板席位从当前可运行目录生成默认策略。
配置不保存隐式默认策略，provider 覆盖和目录变化后使用当前默认目标；继承席位无需回退策略。
用户显式策略整体优先，不自动补齐。已有策略在同一 preset 刷新时完整保留。
同一 preset 刷新也保留配置没有策略的状态。旧版本已保存策略的来源无法推断，因此仍视为显式策略。
选择限于原 provider。家族内优先其他已观察模型，Claude 优先 Opus，随后比较模型 ID 距离与顺序。
兼容选项保留或翻译，不猜模型标识，也不启用禁用 provider。

多个 provider 的面板生成按准确实例 ID 区分的 `providerDefaults`。
各值包含 `familyDefaults`、`unknownFamilyDefault` 及可选的 `hostFallback`。
原 provider 不提供指定家族时，默认策略使用该 provider 目录中的继承模型或已观察近似模型。
审计标为 `model-original-host-default` 并记录实际家族变化，不把 GPT 标为 Claude 或 Grok。
未知家族默认优先原 provider 的 Claude，否则使用原宿主模型。
Arena 与 Architect 后续替代仍限于所选默认模型的真实家族。

宿主实际拒绝模型后，向 `prepare` 传入 `modelRejections`：每条包含被拒绝的 `target`、
`code: "model-rejected"`、非空的 `rawError` 及错误列出的 `validModelIds`。
工具不能独立认证传入的错误文本。provider 不可用、选项错误、超时都不能伪装成模型拒绝证据。

先尝试映射的家族默认模型；已知家族既无映射也无 `hostFallback` 时报告配置错误，只有真正未知的家族才使用 Reviewer A 默认模型。
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

## 传入本次工作的类型

工作流调用者在准备阶段传入 `jobProfile`，例如 `{"kind":"routine","urgent":false}`。
`kind` 仅接受 `routine`、`judgment`、`hardest`、`verification`，`urgent` 是可选布尔值。
旧调用者省略该字段时保持原配置。Routine 降低两档，judgment 降低一档，hardest 提高一档，最高为 `max`。
推理调整按目录支持的档位依次移动，排序为 `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra`。
Hardest 的上限为 `max` 或目录中低于它的最高档；已保存且高于 `max` 的档位保持不变。
例如目录支持 `low`、`high`、`max` 时，hardest 将 `high` 提高为 `max`。
类型化选项需要已配置的值或目录声明的 `defaultValue`，缺少依据时保持未固定并披露。
多个 effort 键使用共同支持的档位；已保存值或默认值矛盾时明确报错，不生成冲突选项。

紧急任务请求实际支持的 fast，其他任务请求 standard。
布尔选项 `fast`、`fastMode` 的 fast 值为 `true`，standard 值为 `false`。
`speed` 选项使用 `fast`、`standard`；`serviceTier` 使用 `priority`、`default`。
只使用目录声明的键和值。
每个已广告的速度键分别调整，缺少对应值时按键记录限制。
Verification 保留配置的推理与速度，继承别名不变。
优先修改类型化选项；参数编码在模型 ID 中时，只选择目录中同一模型身份前缀且符合请求速度的变体。
请求速度缺少目标推理档位时，按完整推理阶梯距离选择最近的已观察档位，距离相同则优先较低档。
类型化选项和 slug 同时存在时，变体必须与两者一致；缺少匹配变体则保留原目标并记录限制。
Routine 和 judgment 不提高原配置的推理档位。
缺少对应能力时记录 `audit.selection.jobLimitations`，不猜标识。

准备阶段先选择允许使用的可运行渠道，再调整本次工作参数。
审计保留配置来源、跳过候选及原因，并将实际渠道的原目标记录为 `jobBaseTarget`。
Verification 保留实际渠道的选项；调整被拒绝时恢复该渠道的原选项。

调整后的选择被实际拒绝时，保留已准备请求和错误证据。
传入相同 profile、`modelRejections` 和新的 `stepId`，下一次请求恢复原角色行及原选项，不继续调整其他变体。
传入已保存的 `rejectedPreparedRequest` 可在目录变化后仍识别实际被拒绝的选择。
完整回执绑定捕获的准备输入，包括任务、工作目录、负责路径、配置及委派身份，并重建原请求核对调整关系。
这些检查证明输入一致性；真实拒绝证据仍由宿主认证。
实际渠道的原角色行也被拒绝时，加入该错误证据后沿同一渠道进行模型回退。
捕获目录校验被拒请求的来源，当前目录校验新执行目标；配置中的主渠道保留为审计来源。
后续目标被拒时，将它自己的已准备请求放入对应的 `modelRejections[].preparedRequest`。
保留此前的错误条目及最初的 `rejectedPreparedRequest`，并使用新的 `stepId`。
刷新目录后才出现的默认模型也按其自己的捕获目录重建校验。
`audit.selection.rejectionProvenance` 分别标明每个拒绝目标的来源；当前目录或宿主报告的拒绝与捕获请求明确区分。
审计保留原配置、实际选择、改变的选项和被拒绝目标，不能声称这些请求参数已由运行时执行。

## 准备委派与验收结果

从生成包的 `config/t3-role-contracts.json` 读取角色和路由。
按从 1 开始的面板成员编号准备任务，传入完整要求、工作目录、允许写入路径和稳定的运行标识。
子任务只收到自己的简报，因此必须包含完整角色合同与已安装 Skill 的路径。
`poteto-agent` 简报明确给出实际 `bundleRoot` 下的绝对 `SKILL.md` 路径及 `WORKFLOW.md` 包装入口回退路径。
父会话拥有 playbook 协调和独立审查，子任务只拥有指定单元及其验收。

选中的工作流任务属于 T3，使用准备好的参数调用 `delegate_task`，保存返回的 `taskId`。
异步任务只剩等待时结束回合，由 T3 通知唤醒。需要在当前回合取结果时读取 `task_status`。
重试复用原请求和 `clientRequestId`。新一轮审查重新委派，并传入原要求、已有发现、回应与未解决异议。

等待超时不等于任务失败或取消。原任务结果与后续子线程活动分别记录。
调用 `task_cancel` 后核对实际状态，不能把取消请求的确认当成已取消。
子任务完成后，父会话仍需检查真实产物。

## 使用便携检查器与本地证据

先读取生成的 runtime binding。计划检查器只支持以下按实际包根解析的调用：

```bash
node "<absolute-package-root>/skills/poteto-mode/scripts/check-plan.mjs" "<absolute-plan.md>"
```

该工具只检查计划结构，不执行计划，也不证明真实验收。
Codex 保留原生 GitHub 辅助工具及其文档范围和门槛，PR 监听仍使用 T3 事件工具。
其他来源宿主脚本在未明确支持时只作参考。

清理 worktree 时检查 Git 列表、宿主实际活动和固定线程、子任务及进程。
缺少使用证据时保留待删除项，并遵守清理确认门槛。
不要执行 Cursor 的审计脚本，也不要假定其 transcript、SQLite、snapshot 或存储路径适用于 T3。
通过支持的工具或获授权本地记录读取 transcript。
任务摘要不证明完整 transcript 可读或只读限制实际生效；缺少能力时明确报告。

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
