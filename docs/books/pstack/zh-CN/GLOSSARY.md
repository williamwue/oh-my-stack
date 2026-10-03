# 术语表

这份术语表用于统一中文译本。命令、Skill 名称、文件名及代码标识符保持原样。

| 原文术语 | 译文用法 | 说明 |
| --- | --- | --- |
| agent / エージェント | Agent；首次写作「AI Agent（智能体）」 | 本书语境中能使用工具推进开发任务的智能体 |
| Playbook | Playbook（工作流程） | 为某类任务规定步骤和完成要求；后文保留 Playbook |
| Principle | Principle（原则） | 支持 Agent 判断的工程原则；后文保留 Principle |
| Skill | Skill（技能） | 可被 Agent 加载和执行的工作能力；后文保留 Skill |
| verification / 検証 | 验证 | 通过运行应用或检查实际成果判断工作是否完成 |
| verification skill | 验证 Skill | 针对项目建立的启动、操作与取证能力 |
| artifact / 成果物 | 成果物 | 代码、输出文件、应用行为等需要检验的结果 |
| evidence / 証拠 | 证据 | 支持验证结论的输出、截图、录像或实际读取结果 |
| finish condition / 完了の条件 | 完成条件 | 可以执行并判断通过或失败的条件 |
| reproduction / 再現 | 复现 | 在可控条件下再次触发问题 |
| codebase / コードベース | 代码库 | 包括代码及项目内保留的知识、约束与文档 |
| delegation / 委任 | 委派 | 将明确范围的工作交给 Agent 或子 Agent |
| parallelism / 並列化 | 并行执行 | 同时推进多个任务；不隐含共享写入或无限权限 |
| diff / 差分 | 差异 | 代码或文件修改前后的差异 |
| pull request / PR | PR（拉取请求） | 首次解释，后文保留 PR |
| regression | 回归缺陷 | 原有正常行为因变更而失效 |
| Feature Map | Feature Map（功能地图） | 记录用户路径、操作步骤与预期结果 |
| router | 路由器 | 按请求选择并衔接合适工作流程的入口 |

译文不把「已读取源文件」「测试通过」「实际应用已验证」合并成同一种完成状态。
