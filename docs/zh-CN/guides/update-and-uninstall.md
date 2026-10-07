# 更新或卸载 Oh My Stack

[English](../../guides/update-and-uninstall.md) | [简体中文](update-and-uninstall.md)

按现有安装来源和范围更新，保留模型映射、其他插件、项目文件及旧版发布文件。
OMS 不需要后台更新进程。更新后新开会话。

## 让 agent 检查或更新

“检查更新”和“执行更新”是两种请求。只检查时复制：

```text
检查本机现有 Codex 和/或 Claude Code 的 Oh My Stack 是否有新版本。只读，不更新、刷新 marketplace、安装、卸载或修改配置。读取原生插件列表、注册来源、安装范围和实际缓存的版本信息，与 https://github.com/williamwue/oh-my-stack/releases/latest 的最新正式版本比较。分别报告当前版本、可用版本、来源、范围和更新方式；区分已安装版本与当前对话加载的版本。
```

更新 Codex 时复制：

```text
将本机现有 Codex 的 Oh My Stack 更新到 williamwue/oh-my-stack 最新正式稳定版本。
先阅读 https://github.com/williamwue/oh-my-stack/blob/main/docs/guides/update-and-uninstall.md 和 https://github.com/williamwue/oh-my-stack/blob/main/docs/install/codex.md。
检查 Codex CLI 帮助、OMS marketplace 注册来源、启用状态、实际安装版本和缓存信息。保留其他插件、模型映射、项目文件和旧版发布文件。
官方 stable Git 来源：只升级 oh-my-stack marketplace，然后对 oh-my-stack@oh-my-stack 执行 plugin add。本地解压来源：从同一正式版本下载 Codex 插件压缩包及 SHA256SUMS，放入新的持久版本目录，先校验再解压，只替换 OMS 的注册来源；不要对本地解压来源执行 Git marketplace upgrade。保持现有来源类型，不静默迁移。
已是最新版时只验证，不重复安装。自定义、固定提交或来源不明确时，先说明，再决定如何处理。校验或版本不匹配时停止，保留回退来源。
检查实际安装并启用的插件，以及安装缓存 GENERATION.json 和插件清单中的版本。能操作新 Codex 会话时，选择 oh-my-stack:prove-it-works，只检查加载与工作区；否则给出这个准确的下一步，并标注会话加载待验证。
报告旧/新版本、来源、校验和安装结果、加载结果及回退步骤。本请求已授权常规更新，不要仅因发现旧版本而再次确认。
```

更新 Claude Code 时复制：

```text
将本机现有 Claude Code 的 Oh My Stack 更新到 williamwue/oh-my-stack 最新正式稳定版本。
先阅读 https://github.com/williamwue/oh-my-stack/blob/main/docs/guides/update-and-uninstall.md。
检查 CLI 帮助、OMS marketplace 来源、实际安装版本、范围、启用状态和缓存信息。保留当前安装范围、其他插件、模型映射、项目文件及回退文件；不要另装一份，也不要自行开启自动更新。
已注册的官方 Git marketplace：只刷新 oh-my-stack，再按原范围更新 oh-my-stack@oh-my-stack。本地 marketplace：先校验同一正式版本的 Claude 插件压缩包和校验文件，再解压并只替换 OMS 来源。保持现有来源类型，不静默切换自定义或固定来源。
已是最新版时只验证，不重复安装。完整性或版本不匹配时停止。检查安装缓存 GENERATION.json 和插件清单，不能只看 marketplace 列表。能操作新 Claude Code 会话时，调用 /oh-my-stack:prove-it-works，只检查加载与工作区；否则给出这个准确的下一步，并标注加载待验证。
报告旧/新版本、来源、范围、校验和安装结果、加载结果及回退步骤。本请求已授权常规更新，不要仅因发现旧版本而再次确认。
```

agent 需要访问你实际使用工具的电脑，并有终端和网络权限。
远程容器中的更新不会更新本机。两个工具都安装时，分别更新和验证。

## Codex

先查看注册来源和插件：

```bash
codex plugin marketplace list
codex plugin list --json
```

对于以 `--ref stable` 注册的官方 Git 来源：

```bash
codex plugin marketplace upgrade oh-my-stack
codex plugin add oh-my-stack@oh-my-stack
codex plugin list --json
```

第二条命令从刷新后的来源安装插件。列表显示新版不等于实际安装缓存已更新。
检查缓存 `GENERATION.json` 的 `sourceVersion` 和 `.codex-plugin/plugin.json` 的 `version`，
再新开会话检查加载。

本地解压来源按 [Codex 压缩包更新步骤](../install/codex.md#更新插件)执行。
Git 升级命令不替换该本地目录。

### 从本地来源迁移到 stable

这是可选的、明确改变来源的操作。先记录并保留旧目录，只替换 OMS 注册：

```bash
codex plugin marketplace remove oh-my-stack
codex plugin marketplace add williamwue/oh-my-stack --ref stable
codex plugin add oh-my-stack@oh-my-stack
codex plugin list --json
```

回退时只移除该 marketplace 注册，重新注册保留的旧目录，执行
`codex plugin add oh-my-stack@oh-my-stack`，并在新会话验证实际版本。
新版写入的配置可能需要单独审阅后才能降级。
也可以明确使用 `--ref <stable-commit>` 固定到已验证的提交；固定来源不会跟随移动的 stable 分支。

### 卸载

```bash
codex plugin remove oh-my-stack@oh-my-stack
codex plugin marketplace remove oh-my-stack
```

管理器可能保留缓存；用户模型配置保留。

## Claude Code

先检查来源、版本和安装范围：

```bash
claude plugin marketplace list
claude plugin list --json
```

Git 来源的用户级安装：

```bash
claude plugin marketplace update oh-my-stack
claude plugin update oh-my-stack@oh-my-stack --scope user
claude plugin list --json
```

如果现有范围是 `project` 或 `local`，使用原范围；受管理的安装走管理员的更新路径。
检查实际缓存中的 `GENERATION.json` 和 `.claude-plugin/plugin.json`，然后新开会话。
stable 来源为 `https://github.com/williamwue/oh-my-stack.git#stable`。
原来未指定该 ref 的来源跟随默认分支；更新前要比较它提供的版本与正式发布版本。
迁移来源是可选操作，须保留原范围和启用状态。

本地压缩包来源：保留旧目录，校验同一正式版本的
`oh-my-stack-claude-plugin-<version>.tar.gz` 和 `SHA256SUMS`，解压后注册
`oh-my-stack-claude-marketplace` 目录。Claude 移除 marketplace 时也会卸载其插件，
因此替换前先记录 OMS 的范围和启用状态，再按原范围重新安装。
回退使用保留的旧来源或明确固定的 stable 提交，按原范围安装并重新验证版本和加载。

### 可选：自动更新

Claude Code 的第三方 marketplace 默认关闭自动更新。
需要时，在会话中打开 `/plugin` → **Marketplaces** → **oh-my-stack** → **Enable auto-update**。
希望手动控制更新时，保持关闭。
更新改变磁盘文件，当前会话可能继续使用旧版；OMS 加载检查用新会话完成。
[官方更新说明](https://code.claude.com/docs/en/discover-plugins#keep-plugins-updated)
还介绍了 `/reload-plugins`。本项目的 CLI 验收不代表自动更新界面已实测。

### 卸载

```bash
claude plugin uninstall oh-my-stack@oh-my-stack --scope user
claude plugin marketplace remove oh-my-stack
```

使用现有安装范围。移除 marketplace 会卸载其插件；缓存和用户模型配置可能保留。

## OMP

按 [OMP 指南](../install/omp.md)检查现有插件链接，再替换安装。保留旧版目录。
[发布流程，英文](../../release-process.md)说明完整性校验和专属目录回退。
通用安装器不修改原生插件注册或模型映射。

## 怎样算更新完成

回执应记录旧/新安装版本、工具版本、来源、范围、压缩包校验或 stable 发布来源信息、
实际缓存版本、启用状态以及新会话的加载结果。无法操作新会话时，应明确写“加载待验证”。
仅下载成功、刷新 marketplace 或沿用旧对话不足以证明更新完成。

[本次验收记录，英文](../../acceptance/2026-10-07/stable-marketplace.md)列出实际更新路径和限制。
