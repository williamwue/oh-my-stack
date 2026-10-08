# 在 Claude Code 中安装 Oh My Stack

[English](../../install/claude-code.md) | [简体中文](claude-code.md)

通过 Claude Code 插件管理器，从本仓库的 marketplace 安装。
以下终端命令从 stable 分支安装正式发布包，安装到用户范围。

也可以[复制提示词，让 agent 完成安装](with-agent.md#为-claude-code-安装)。

## 安装插件

在终端执行：

```bash
claude plugin marketplace add https://github.com/williamwue/oh-my-stack.git#stable
claude plugin install oh-my-stack@oh-my-stack --scope user
claude plugin list --json
```

列表应包含用户范围的 `oh-my-stack@oh-my-stack`。
检查实际安装版本，与[正式发布版本](https://github.com/williamwue/oh-my-stack/releases/latest)比较。
已在其他范围安装时，先检查现有安装，再决定是否另装一份。模型配置是单独的可选步骤。

## 调用 Skill

在你的项目中新开 Claude Code 会话，在对话中输入：

```text
/oh-my-stack:prove-it-works 检查加载情况和工作区事实，不修改文件。
```

应得到只读的 Skill 加载与工作区报告，再按[首次使用指南](../getting-started.md)完成任务。
以 `claude plugin` 开头的命令用于终端安装管理；以 `/oh-my-stack:` 开头的命令用于 agent 对话。

`grill-me`、`grill-with-docs` 和 `improve-codebase-architecture` 要通过用户输入的 slash 命令调用。
Claude Code 会拒绝模型主动调用这些仅显式使用的原版技能。被拒绝不代表安装失败。
[AIHero 指南](../guides/aihero.md)说明这些入口的用法。

## 更新或卸载

按[更新和卸载指南](../guides/update-and-uninstall.md)执行。
[支持范围，英文](../../support-policy.md)说明验收边界。
0.9.0 → 0.9.1 的用户级 Git 更新见[验收记录，英文](../../acceptance/2026-10-07/stable-marketplace.md)。
未来版本、其他安装范围和自动更新界面仍需各自验证。

## 仅在一个会话中检查安装包

[发布流程，英文](../../release-process.md#install-the-claude-code-plugin)还提供 `claude --plugin-dir` 方法。
它为当前会话加载本地安装包，不创建持久的用户级安装。

## 可选自动路由

包含 Claude 自动路由适配的插件，可通过 `/oh-my-stack:setup-oh-my-stack`
选择开启并保存范围。安装本身不启用路由，也不修改模型配置。请检查插件 hook
并在新会话中验证；步骤和当前发布边界见[自动路由说明](../automatic-routing.md)。
