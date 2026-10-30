# OMS 1.1.0

新增 macOS 支持，Windows 继续支持 Windows PowerShell 5.1 / PowerShell 7。
macOS 使用 PowerShell 7，通过同一个 `oms.ps1` 原生流程管理 pstack、AIHero 和书籍。

## 安装

从本 Release 下载 `oms-1.1.0.zip` 和 `SHA256SUMS.txt`，校验后解压到新的长期目录。
不要覆盖既有工作目录。ZIP 同时适用于 Windows 和 macOS，不包含 PowerShell 或 Agent 宿主。

macOS：

```sh
shasum -a 256 -c SHA256SUMS.txt
unzip oms-1.1.0.zip
cd oms-1.1.0
pwsh -NoProfile -File ./oms.ps1
```

`SHA256SUMS.txt` 包含 ZIP 和四份电子书；完整检查前需将五个资产全部下载到同一目录。
只下载 ZIP 时，使用 `shasum -a 256 oms-1.1.0.zip` 与清单中的该行对照。
Windows 可用 `Get-FileHash ./oms-1.1.0.zip -Algorithm SHA256` 对照清单，再解压运行 `./oms.ps1`。
需要先安装 PowerShell、Git 和所选宿主；OMS 不自动安装 WSL 或额外宿主。

## 改动

- macOS 数据目录：`~/Library/Application Support/oh-my-stack/`。
- 检测 T3 正式版、Nightly、Customized 应用，并复用已有 Codex / Claude 后端。
- 物理目录比较修复 macOS `/var` / `/private/var` 和符号链接引起的来源误判。
- 新管理记录绑定 `CODEX_HOME` / `CLAUDE_CONFIG_DIR`，目录变化时拒绝误操作。
  `status -Json` 增加配置目录与管理来源。旧版记录保留原有来源检查，不自动迁移。
- 跨平台回归测试和 Windows/macOS 双架构 CI；保留个人模型、凭据、其他插件与个人文件。
- 四份电子书沿用历史阅读内容、独立授权和原 SHA256，随本 Release 提供。

## 验证与限制

本机 macOS arm64 通过 49 项隔离回归断言，10 份 PowerShell 文件语法与 UTF-8 BOM 检查通过。
真实 Codex 0.166.0 / Claude Code 2.1.304 在隔离配置目录注册 pstack 0.9.112、AIHero 1.3.2。
新 Codex app-server 发现 pstack 67 项、AIHero 27 项 skills，包含
`pstack:poteto-mode`、`pstack:bro`、`mattpocock-skills:ask-matt`。
两套安装缓存的 T3 映射及读取入口通过，四份书籍 SHA256 通过。

CI 四组结果以本 PR / main 对应提交为准。Claude / T3 新会话自动发现、登录后的实际
skill 调用及 T3 派发未验收；T3 保持 `restart-required`。原生注册、运行时发现与会话
调用分别记录，不能相互替代。未改动日常宿主配置；完整记录见 [macOS 验证](macos.md)。
