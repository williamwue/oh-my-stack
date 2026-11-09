# OMS 1.1.1 后续验收

验收日期为 2026-11-09，代码基线为 `0d9893d2`。本轮排除 Claude Code。
Mock 夹具中的假 Claude CLI 仍作为共享安装保护的回归用例执行，
不运行真实 Claude CLI、不修改 Claude 配置。

## 范围与复现

本机为 Apple Silicon macOS。使用 Microsoft PowerShell Release v7.6.9
的 osx-arm64 归档，SHA256 为
`a1c7e98ac403da4be5ba75c1c5855af272de7787a91d478c4267466fe58fc1af`。
归档解压到临时目录，不安装全局 PowerShell、不改写 PATH 配置。

```sh
pwsh -NoProfile -File ./tests/run.ps1
```

此命令运行本地 Git、模拟宿主和模拟下载，不调用模型，不修改个人宿主配置。
跨平台结果以本次 PR 的四项 GitHub Actions 作业为准，不能沿用 1.1.0 的成功记录。

## 证据边界

发布时未执行的验证见 [1.1.1 发布说明](release-1.1.1.md)。
2026-11-09 查询时 OMS lifecycle 已为 active，但基线提交没有 workflow run。
本次用验收文档 PR 触发当前版本矩阵，不改变仓库 Actions 设置。

真实宿主安装、skills 发现和模型实际执行分别记录。隔离配置中的安装结果
不等于个人宿主已升级；T3 的 `restart-required` 不等于真实会话成功。
本轮不修改个人模型、hook 信任、书籍授权或其他插件。

## 本机 Mock 回归

macOS 27.2 / Apple Silicon、PowerShell 7.6.9、Codex CLI 0.167.0。
`./tests/run.ps1` 退出码为 0，输出 `PASS: 49 assertions`。
这些断言使用模拟宿主，不计为 Windows、Intel macOS 或真实 Claude 验收。
10 份 PowerShell 文件通过语法解析与非 ASCII 脚本的 UTF-8 BOM 检查。
真实上游提交的适配 `-Check` 通过，Git 变更仅包含两个读取入口、T3 映射和
OMS 包记录，上游模型与工作流文件未变。Codex 缓存中的 T3 映射与仓库 SHA256 相同。

Release 的 `oms-1.1.1.zip` SHA256 为
`153cfe2c52492555e3f1382b34f0d343c6ea71899c243fd2ba64a98a4aa0cbeb`，
与下载的 `SHA256SUMS.txt` 一致；ZIP 内 35 个文件逐字节匹配发布基线 `0d9893d2`。

## Codex 原生宿主

通过独立且预先创建的 `CODEX_HOME`、`-StateRoot` 安装 pstack，选择
`codex,t3`。仅向此进程传入只包含 Codex 和系统命令的 PATH，避免 T3
自动选择本机 Claude 后端。安装成功，版本为 0.9.133，源提交为
`91ab921ab92d9ccfe503c93c3524410277f012e1`；两项目标共用一份原生安装。

确认上游 main 仍为同一提交后，使用
`oms.ps1 update -Component pstack -Environment codex -Yes` 更新日常受管理安装。
未选择 T3 更新，以免解析出 Claude 后端；原有环境关联由 OMS 保留。
更新后的 Codex 状态为 pstack 0.9.133 enabled、AIHero 1.3.2 enabled。
更新前后其他插件的完整原生列表条目相同，已有全局 `AGENTS.md` SHA256 相同。
`config.toml` 由原生 CLI 改写插件注册，因此整文件 SHA256 有变化，不能报告为整文件未变。

按 [OpenAI 官方 app-server 协议](https://learn.chatgpt.com/docs/app-server)
分别启动独立的 `codex app-server`，发送 `initialize`、`initialized`、
`skills/list`（`forceReload: true`）。隔离配置发现 pstack 67 项；日常配置发现
pstack 67 项、AIHero 27 项，全部 enabled，errors 为空。
返回的 `pstack:bro`、`pstack:poteto-mode` 路径均位于 0.9.133 缓存。
隔离配置再次安装复用现有管理记录，退出码为 0。

另启动原生 Codex app-server 的临时只读会话，使用 `thread/start`，随后在
`turn/start` 中显式传入发现的 `pstack:bro` skill 项。沿用原生 ChatGPT 登录及
当前宿主模型设置；返回模型为 `gpt-6.1-sol`、reasoning effort 为 `medium`。
回合状态为 `completed`，error 为 null，实际回答为：

> OMS 插件已注册，技能列表也正常，但还不能说明模型已在各个目标应用中实际运行过。

此结果证明原生 Codex 的代表性 skill 模型回合通过，不代表已运行全部 pstack 工作流。

## T3 / Codex 真实子会话

在当前 T3 Codex 会话通过 `spawn_agent` 启动一个继承设置的只读子代理，
不指定其他模型、不修改个人配置、不执行 Claude。子会话上下文自动提供
`pstack:bro`、`pstack:poteto-mode`，路径均为 0.9.133，读取成功。
子代理实际执行 bro 的通俗改写并返回结果：

> OMS 的插件已经注册好了，也能列出可用技能。但还要确认模型能实际完成任务，以及各个应用都能找到这些技能。

子代理另读取 T3 映射，正确指出同供应商、继承设置、无独立 checkout 的任务
使用原生代理。此次为一个真实完成的子代理调用，不是能力目录或磁盘文件存在检查。
未核实子代理的具体模型与推理强度，不推断 arena / architect 多候选或跨供应商派发通过。

## 远端 CI

首次 PR 事件没有生成检查。进一步查询发现工作流虽为 active，仓库级
`GET /repos/williamwue/oh-my-stack/actions/permissions` 返回 `enabled: false`。
本轮将仓库级 Actions 启用，保留工作流矩阵和权限配置；后续 PR 提交触发验收。
CI 仅使用模拟宿主，包含假 Claude 夹具，不运行真实 Claude。

## 证据保存

本机原始日志、skills 响应、状态 JSON、配置文件哈希和原生插件列表保存在
`/private/tmp/oms-111-verify.U7uIaG/`。该目录为临时证据，不保证长期保留。
未复制或读取登录凭据；模型调用沿用 Codex 原生 ChatGPT 登录。
Claude、本机不可用的 Windows 和 Intel 环境不做本机实测；跨平台 Mock 结果单独以 CI 为准。
