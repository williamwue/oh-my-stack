# 让 agent 帮你安装 Oh My Stack

[English](../../install/with-agent.md) | [简体中文](with-agent.md)

复制下方对应提示词，发给能访问目标机器终端和网络的 agent。
可以让 Codex 为 Claude Code 安装，也可以让其他 agent 为 Codex 安装；
提示词明确指定目标工具。远程容器中的安装不能证明你的电脑已安装。

## 为 Codex 安装

```text
请在本机为 Codex 安装 williamwue/oh-my-stack 最新版正式发布的 Oh My Stack。

先阅读仓库中的安装和更新说明：
https://github.com/williamwue/oh-my-stack/blob/main/docs/install/codex.md

1. 检查本机系统、Codex 版本、插件管理命令，以及已有 Oh My Stack 安装和 marketplace 来源。保留其他插件、模型映射和项目文件。
2. 确认最新正式发布版本，将该版本的 Codex 插件包和 SHA256SUMS 下载到项目外的持久、版本专属目录。解压前必须确认该插件包与同一版本的校验值匹配；失败时停止并报告。
3. 按文档使用原生插件管理器注册 marketplace 并安装。保留解压目录，注册会引用它。已有相同版本时复用；需要更新时保留旧来源供回退，并按实际安装类型执行更新步骤。
4. 从原生插件列表检查实际安装版本与启用状态，与选定发布版本比较。版本不一致时报告差异。
5. 条件允许时，在我的项目中新开 Codex 会话，显式选择 oh-my-stack:prove-it-works，执行只读的加载与工作区检查。无法操作新会话时，给出我需要选择的 Skill 和下一条提示词，并将加载验证标为待完成。
6. 最后报告发布标签、实际安装版本、持久安装来源路径、完整性和安装检查结果、加载检查结果，以及我的下一步。

如果缺少 CLI、登录、目标机器访问能力或受支持的命令，说明具体阻碍与最少的手动步骤。保持现有模型配置；可选模型搭建在安装完成、预览方案并确认后再执行。
```

该提示词沿用本项目的正式发布包安装方式。Codex 官方
[插件文档](https://developers.openai.com/plugins/build/plugins)说明本地 marketplace
注册；[OMS 安装指南](codex.md)提供本项目已观察到的安装步骤与限制。
执行前以本机 CLI 的帮助信息核对命令。

## 为 Claude Code 安装

```text
请在本机为 Claude Code 安装 williamwue/oh-my-stack 最新版正式发布的 Oh My Stack，使用用户范围。

先阅读仓库中的安装和更新说明：
https://github.com/williamwue/oh-my-stack/blob/main/docs/install/claude-code.md
https://github.com/williamwue/oh-my-stack/blob/main/docs/guides/update-and-uninstall.md

1. 检查本机 Claude Code 版本、插件管理命令，以及已有 Oh My Stack marketplace、插件版本、安装范围和启用状态。保留其他插件、模型映射和项目文件。若已安装在其他范围，说明现状并询问保留哪个范围，再决定是否另装或切换范围。
2. 确认最新正式发布版本，按文档执行 marketplace 和用户范围安装。已有相同版本时复用；需要更新时按现有范围执行对应更新步骤。
3. 从原生插件列表核对实际安装版本与启用状态，对照选定的正式发布版本。marketplace 提供的版本不同于发布版本时报告差异。
4. 条件允许时，在我的项目中新开 Claude Code 会话，通过用户对话命令 /oh-my-stack:prove-it-works 执行只读的加载与工作区检查。无法操作新会话时，给出我需要发送的完整命令，并将加载验证标为待完成。
5. 最后报告发布标签、实际安装版本、安装范围、安装与加载检查结果，以及我的下一步。

如果缺少 CLI、登录、目标机器访问能力或受支持的命令，说明具体阻碍与最少的手动步骤。保持现有模型配置；可选模型搭建在安装完成、预览方案并确认后再执行。
```

Claude Code 官方[插件安装文档](https://code.claude.com/docs/en/discover-plugins)说明
marketplace、安装范围和会话加载；[OMS 安装指南](claude-code.md)提供本项目的来源和命令。

## 安装完成后

预期得到包含实际版本、原生安装状态和加载结果的简短回执。
下载文件、注册 marketplace 和加载 Skill 是不同的检查；若加载验证待完成，
按回执新开会话并执行给出的动作，再[完成第一个任务](../getting-started.md)。

基本使用无需额外模型映射。想为工作代理或审阅者指定模型时，安装后再按
[可选模型配置](../model-configuration.md)预览可用模型和范围，确认后应用。
AIHero 的项目任务系统配置也属于单独的项目写入流程，见 [AIHero 指南](../guides/aihero.md)。

OMP 按[独立 profile 安装指南](omp.md)操作；以上两个提示词不覆盖其原生隔离验收步骤。
