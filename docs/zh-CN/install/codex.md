# 在 Codex 中安装 Oh My Stack

[English](../../install/codex.md) | [简体中文](codex.md)

新安装建议使用 stable Git marketplace，也保留正式发布的插件压缩包安装方式。
以下命令使用 Codex CLI 插件管理器；两种方式都无需构建源码或安装 Node.js。[支持范围](../../support-policy.md)说明已测试的工具和限制。

也可以[复制提示词，让 agent 完成安装](with-agent.md#为-codex-安装)。

## 从 stable Git marketplace 安装

```bash
codex plugin marketplace add williamwue/oh-my-stack --ref stable
codex plugin add oh-my-stack@oh-my-stack
codex plugin list --json
```

`stable` 分支只包含已验证的正式发布包。`STABLE_RELEASE.json` 记录发布标签、源码提交、
资产校验值和包内文件校验值。检查安装版本，与[正式发布版本](https://github.com/williamwue/oh-my-stack/releases/latest)比较。
维护者的[推进流程，英文](../../release-process.md#stable-git-marketplace)要求干净标签重建、资产校验及源码 CI 成功。
如果渠道晚于正式发布，报告差异；需要立即使用该版本时，可以走下方已校验的压缩包方式。

已有 `oh-my-stack` 注册时，先检查来源，按[更新指南](../guides/update-and-uninstall.md)处理现有安装。
迁移来源是明确的可选操作，旧版解压文件继续保留。

## 下载并校验同一版本

1. 为此次安装创建一个新目录。
2. 从同一[正式发布版本](https://github.com/williamwue/oh-my-stack/releases/latest)下载 `oh-my-stack-codex-plugin-<version>.tar.gz` 和 `SHA256SUMS`，放入该目录。
3. 在该目录打开终端。目录中只保留一个 Codex 插件压缩包。

在 macOS 校验下载文件：

```bash
shasum -a 256 --ignore-missing -c SHA256SUMS
```

应看到 Codex 插件压缩包对应的 `OK` 行。其他工具的未下载文件会跳过。
Linux 使用 `sha256sum --ignore-missing -c SHA256SUMS`。
压缩包校验失败时停止，不解压。校验文件应来自可信仓库的同一版本。

## 注册并安装压缩包

在该目录执行：

```bash
tar -xzf oh-my-stack-codex-plugin-*.tar.gz
codex plugin marketplace add "$PWD/oh-my-stack-marketplace"
codex plugin add oh-my-stack@oh-my-stack
codex plugin list
```

应看到 `oh-my-stack@oh-my-stack` 已安装并启用，版本与下载包一致。
保留解压出的 marketplace 目录，Codex 的注册记录会引用该目录。

## 选择 Skill

在你的项目中新开 Codex 会话。输入 `$`，在 Skill 选择器选择 `oh-my-stack:prove-it-works`。
请求它只检查加载情况和工作区事实，不修改文件。

随后按[首次使用指南](../getting-started.md)完成任务。
选择 Skill 和把名称写成普通文本是不同的操作。
通过 CLI 集成时，结构化 Skill 输入是已验证的显式入口。
找不到入口或调用方式不正确时，按 [FAQ](../faq.md)排查。

## 更新插件

stable Git 来源使用[原生更新命令](../guides/update-and-uninstall.md#codex)。
以下步骤用于本地解压来源。

在另一个版本专属目录下载并校验新包，解压 Codex 插件压缩包。保留旧目录供回退。

在新目录中，只替换 Oh My Stack 的 marketplace 注册：

```bash
codex plugin marketplace remove oh-my-stack
codex plugin marketplace add "$PWD/oh-my-stack-marketplace"
codex plugin add oh-my-stack@oh-my-stack
codex plugin list
```

检查实际安装版本，然后新开会话。
0.9.0 到 0.9.1 的 Git 更新及本地来源迁移见[验收记录，英文](../../acceptance/2026-10-07/stable-marketplace.md)。
未来版本和其他工具版本仍需各自检查。
Git marketplace 的升级命令不适用于这个本地解压目录。模型配置与插件安装是独立的。

回退时重新注册保留的旧 marketplace 目录，再安装 `oh-my-stack@oh-my-stack`，并检查实际版本。
新版本写入的配置，降级前可能需要单独审阅。

[卸载插件](../guides/update-and-uninstall.md) · [FAQ](../faq.md) · [支持范围，英文](../../support-policy.md)
