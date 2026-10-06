# 完成第一个任务

[English](../getting-started.md) | [简体中文](getting-started.md)

按本页确认 Oh My Stack 已加载，再获取带文件依据的项目解释。整个示例不修改项目文件。

## 1. 为你的工具安装插件

按 [Codex](install/codex.md) 或 [Claude Code](install/claude-code.md) 指南安装。
OMP 使用[独立 profile 安装指南](install/omp.md)。
安装后打开你的项目，新开 agent 会话。

此示例无需先配置模型。没有 Oh My Stack 模型映射时，agent 继续使用它的模型。

## 2. 确认 Skill 已加载

在 Codex 输入 `$`，选择 `oh-my-stack:prove-it-works`，再发送：

```text
检查 Skill 加载情况和当前工作区。只读检查，不修改文件。
```

在 Claude Code 对话中输入：

```text
/oh-my-stack:prove-it-works 检查 Skill 加载情况和当前工作区。只读检查，不修改文件。
```

你应看到已加载的 Skill、工作区路径、是否处于版本控制仓库，以及各项判断的依据。
无法确认的事实应标记为未知。此检查不安装依赖，也不修改配置。

如果找不到入口，按 [FAQ 中的安装排查步骤](faq.md#找不到-skill)检查。

## 3. 获取代码解释

在 Codex 选择 `oh-my-stack:poteto-mode`，再发送：

```text
解释当前项目的主要模块和请求入口。
通过实际文件追踪一条有代表性的调用路径。
只读分析，不修改文件，不安装依赖，不启动服务。
如果项目没有请求入口，直接说明。
```

在 Claude Code 对话中输入：

```text
/oh-my-stack:poteto-mode 解释当前项目的主要模块和请求入口。通过实际文件追踪一条有代表性的调用路径。只读分析，不修改文件，不安装依赖，不启动服务。如果项目没有请求入口，直接说明。
```

agent 应选择调查工作流，读取代码，并给出带文件引用的解释。
它应区分观察到的行为和推断。打开其中一个被引用的文件，核对解释。
项目文件应保持原样。如果项目使用 Git，比较任务前后的 `git status --short`。
原有未提交修改不代表此次任务修改了文件。

## 4. 开始你的真实任务

从[常见任务](guides/common-tasks.md)选择示例。
说明目标、如何检查结果，以及允许修改的文件或外部操作。

需求尚需讨论时，直接调用 `grill-with-docs`。
它会提问、记录已确认的术语和决策，不实现功能。
你审阅这些决策后，再单独请求实现。

需要用法解释或建议提示词时，使用 `poteto-help`。询问用法不会启动所描述的工作流。

## 需要更多控制时

- [AIHero 原版技能](guides/aihero.md)
- [可选模型配置](model-configuration.md)
- [完整技能目录，英文](../skill-directory.md)
- [FAQ](faq.md)
