# 更新或卸载 Oh My Stack

[English](../../guides/update-and-uninstall.md) | [简体中文](update-and-uninstall.md)

选择你实际使用的安装方式。更新源码不等于更新已安装插件。保留旧版发布文件供回退。

## Codex

按 [Codex 更新步骤](../install/codex.md#更新插件)执行。
解压到本地的 marketplace 需要注册新的解压目录；Git marketplace 的升级命令不适用于该目录。

在终端卸载插件和 marketplace 注册：

```bash
codex plugin remove oh-my-stack@oh-my-stack
codex plugin marketplace remove oh-my-stack
```

管理器可能保留缓存。用户模型配置也会保留。变更安装后新开会话。

## Claude Code

在终端更新 marketplace 和用户级插件：

```bash
claude plugin marketplace update oh-my-stack
claude plugin update oh-my-stack@oh-my-stack --scope user
claude plugin list --json
```

卸载此用户级安装：

```bash
claude plugin uninstall oh-my-stack@oh-my-stack --scope user
claude plugin marketplace remove oh-my-stack
```

如果插件安装在其他范围，使用对应范围。缓存及用户模型配置可能保留。更新后新开会话。

## OMP

按 [OMP 指南](../install/omp.md)检查现有插件链接，再替换安装。保留旧版目录。
[发布流程，英文](../../release-process.md)说明完整性校验和专属目录的回退步骤。
通用安装器不修改原生插件注册或模型映射。
