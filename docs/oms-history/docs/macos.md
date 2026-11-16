# OMS 1.1.0 macOS 支持与验证

本次基于官方 OMS 1.0.1 的最新 main `e7a88f6d`，没有合入旧 pstack fork 历史。
Windows PowerShell 5.1 / PowerShell 7 入口保持可用；macOS 使用 PowerShell 7，
仍通过 `pwsh -NoProfile -File ./oms.ps1` 调用同一安装、更新、卸载和状态流程。
不增加 shell 安装器，不自动安装 PowerShell、Agent 宿主或 WSL。
1.1.0 提供 Windows/macOS 共用安装包和原有电子书，书籍内容及 SHA256 不变。

## 平台行为

- Windows 数据目录仍为 `%LOCALAPPDATA%/oh-my-stack/`；macOS 默认为
  `~/Library/Application Support/oh-my-stack/`。显式 `-StateRoot` 优先。
- Codex / Claude CLI 沿用进程的 PATH、`CODEX_HOME` / `CLAUDE_CONFIG_DIR`；
  未设置时分别为 `~/.codex` / `~/.claude`，不重写个人模型表或凭据。
- 新插件管理记录保存宿主配置目录；配置目录不一致时拒绝安装、更新、卸载。
  `status -Json` 显示 `ConfigRoot`、管理来源 `Source` 和 `host-config-conflict`。
  原 1.0.1 记录没有配置目录字段，继续使用原有来源校验，不自动迁移。
- macOS 将存在的本地目录解析为物理路径，避免 `/var` 与 `/private/var`、
  `/tmp` 与 `/private/tmp` 或符号链接造成错误的来源冲突。不同物理来源仍拒绝。
- T3 支持命令、进程和 `/Applications`、`~/Applications` 中的应用目录检测，
  包括正式版、Nightly、Customized。T3 使用本机已有的 Codex / Claude CLI。
  映射随 pstack 包准备，不复制另一套 skills，不修改上游模型和工作流。
- Linux 明确拒绝，未来单独验证后再扩展。`configure -Open` 的桌面打开行为
  本次没有自动启动浏览器验证。

## 自动化回归

运行：

```sh
pwsh -NoProfile -File ./tests/run.ps1
```

测试沿用当前 PowerShell 可执行文件和平台 PATH 分隔符，使用 `git`，不再写死
`powershell.exe` / `git.exe`。Unix 假宿主通过可执行 shim 启动独立 PowerShell
子进程。夹具路径特意包含空格，Codex / Claude 配置和 OMS 状态均隔离。
测试使用本地 Git 夹具和模拟下载，不联网、不调用模型、不修改个人宿主配置。

2026-10-30 在 macOS 27.0.1 / Apple Silicon、PowerShell 7.6.9 上通过 **49 项断言**，
其中 Windows 共用部分为 47 项，macOS 另有 2 项物理目录别名检查。
覆盖原有 33 项生命周期断言、平台数据路径、T3 应用检测、配置目录绑定和冲突保护。
CI 增加 Windows PowerShell 5.1、Windows PowerShell 7、macOS 15 arm64 / Intel 矩阵。
这些远端矩阵尚未运行，不能把本机结果当作 Windows 或 Intel 验收结果。

用于验证的 PowerShell 从 Microsoft 官方 GitHub Release v7.6.9 的 osx-arm64
归档取得，下载后与 Release API 的 SHA256 摘要核对：
`a1c7e98ac403da4be5ba75c1c5855af272de7787a91d478c4267466fe58fc1af`。
解压在临时验证目录，未安装全局 pwsh 或改写 PATH。

## 真实宿主隔离验证

本机 Codex CLI **0.166.0**、Claude Code **2.1.304**。先只读查询日常宿主，
两个插件均未安装，实际配置位置为 `~/.codex` 和 `~/.claude`。
真实安装测试另建且预先创建 `CODEX_HOME`、`CLAUDE_CONFIG_DIR` 与 `-StateRoot`，
不把测试结果当作个人宿主已安装。未复制登录凭据、未调用模型、未修改个人配置。

通过原生 OMS 流程安装 `pstack,aihero`，选择 `codex,claude,t3`，再单独安装
`pstack-book -DownloadBooks`。两套原生 CLI 的结果为：

| 组件 | 版本 / 来源 | 状态 |
| --- | --- | --- |
| pstack | 0.9.112，锁定上游 `22b5e137e945cb65dd29dac5fc703c13d83a00aa` | 两个原生宿主注册、来源校验和管理记录通过 |
| AIHero | mattpocock-skills 1.3.2，`https://github.com/mattpocock/skills.git` | 两个原生宿主注册、来源校验和管理记录通过 |
| T3 关联 | 共用上述 Codex / Claude 安装 | OMS 保持 `restart-required`，未宣称真实 T3 会话加载 |
| 书籍 | v1.0.1 的中英文 PDF、EPUB | 四份下载及 SHA256 通过 |

在新的 Codex app-server 进程中，仅发送 `initialize`、`initialized` 和
`skills/list`（`forceReload: true`），没有创建 thread 或启动模型 turn。
按照 [OpenAI 官方 app-server 文档](https://learn.chatgpt.com/docs/app-server) 的
只读发现接口执行，返回 pstack **67** 项、AIHero **27** 项，发现错误为空。
返回的实际名称包含 `pstack:poteto-mode`、`pstack:bro`、
`mattpocock-skills:ask-matt`。这证明新 Codex 运行时能发现 skills，未证明会话实际调用。
Claude 此次只验证原生注册和缓存，未验证新会话 skill 发现。

两个宿主安装缓存中的 `skills/poteto-mode/references/t3-tools.md` SHA256 均为
`44da618f846dc3c640056b08271d7aee76c594726e782bcc461c4777baa6d7ef`，与仓库一致。
`poteto-mode/SKILL.md` 和 `references/codex-tools.md` 的 T3 读取入口均存在。
没有将 T3 能力查询、磁盘映射存在或 Codex 发现结果当作 T3 会话实际生效。

四份书籍校验值：

```text
8bdc644fd737d0b470b1d957eaeddf8ba5f55e0be1e0ff62ef907e6f61aa4340  pstack-zh-CN.epub
0d6de4004fb00645c60f2cefff98f37d22bbe4371400cd8bb38b59fa6ef6e8bf  pstack-zh-CN.pdf
771e128883659e308cb08b9ca9e308ad5701faaf3cca8ccc781d2e9103faabcf  pstack-en.epub
fbb4c034293506d2e0b621ecd876dff31b3a75e3b7963a492380012a21da8ba8  pstack-en.pdf
```

本机临时证据目录：
`/private/var/folders/l2/dws8_3gn413gpc15_fjd2h0w0000gn/T/oms macos native-58918ba4/`。
其中 `status.json`、`books-sha256.json`、`skills-list.json`、`t3-cache.json`
分别保留状态、书籍校验、发现响应和缓存映射校验。临时证据不随仓库发布。

## 后续验收与发布边界

- 运行新增 CI，确认 Windows 两个 PowerShell 版本及 Intel macOS 回归。
- 在真实目标配置中安装后新开 Claude / T3 会话，确认 skills 自动发现和实际调用；
  原生登录与插件 / hook 信任在宿主中手动完成，不通过聊天传递密钥。
- 正式安装包从已提交的 Git 版本导出，发布流程单独核对 ZIP 和书籍 SHA256；
  CI 结果以 PR / main 对应提交的运行记录为准，发布结果见 1.1.0 Release。
