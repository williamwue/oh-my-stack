# 工作流对应关系

下表描述名称和用途的对应关系。每个链接指向 Oh My Stack 的实际 Skill 源文件，
不表示各宿主的工具、权限、模型和执行结果完全相同。

| 原书入口或能力 | Oh My Stack 对应入口 | 使用说明 |
| --- | --- | --- |
| `/poteto-mode` | [poteto-mode](../../../../src/core/skills/poteto-mode/SKILL.md) | 根据用户意图选择一个主要工作流 |
| `/setup-pstack` | [setup-oh-my-stack](../../../../src/core/skills/setup-oh-my-stack/SKILL.md) | 按实际可用的宿主模型清单配置角色与路由 |
| `/how` | [how](../../../../src/core/skills/how/SKILL.md) | 解释代码机制与职责边界 |
| `/why` | [why](../../../../src/core/skills/why/SKILL.md) | 调查设计原因与历史依据 |
| `/architect` | [architect](../../../../src/core/skills/architect/SKILL.md) | 从调用方需求设计接口与模块边界 |
| `/arena` | [arena](../../../../src/core/skills/arena/SKILL.md) | 比较候选成果并形成综合结果 |
| `/swarm` | [swarm](../../../../src/core/skills/swarm/SKILL.md) | 组织有边界的并行工作 |
| `/interrogate` | [interrogate](../../../../src/core/skills/interrogate/SKILL.md) | 对冻结范围做独立审查 |
| `/create-verification-skill` | [create-verification-skill](../../../../src/core/skills/create-verification-skill/SKILL.md) | 建立项目本地的真实用户路径验证能力 |
| `/maintain-verification-skill` | [maintain-verification-skill](../../../../src/core/skills/maintain-verification-skill/SKILL.md) | 维护验证步骤与功能地图 |
| `/show-me-your-work` | [show-me-your-work](../../../../src/core/skills/show-me-your-work/SKILL.md) | 保留可以追踪的决策与证据记录 |
| `/tdd` | [tdd](../../../../src/core/skills/tdd/SKILL.md) | 通过修复前失败、修复后通过的行为检查建立证据 |
| `/babysit` | [babysit](../../../../src/core/skills/babysit/SKILL.md) | 推进已有 PR 的准备状态；合并属于单独的 shipping 意图 |
| `/control-app` | 项目自行创建的验证 Skill | 原书中的示例名称；需要针对自己的应用建立 |

## 如何调用

不同宿主使用各自的 Skill 选择或命名空间。
Codex 中可从 Skill 选择器选择 Oh My Stack 的对应条目；
Claude Code 的安装示例使用 `/oh-my-stack:prove-it-works` 等插件命名空间。
OMP 的安装和加载方法见项目 README 与发布流程。

本表不将书中的 Cursor 安装命令直接改写为所有宿主通用的命令。
具体安装入口以 [项目 README](../../../../README.md) 和
[发布流程](../../../release-process.md) 为准。

## 浏览器、终端与外部能力

书中某些操作依赖 Cursor 内置工具或相邻插件。
在 Oh My Stack 中，对应能力需要由实际宿主及已连接的工具提供，
不能仅凭 Skill 文件存在就认为浏览器、后台任务或外部写入已经可用。
详见 [能力契约](../../../capabilities.md)。
