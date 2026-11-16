# OMS 2.0.2

OMS 2.0.2 将 1.x 的 PowerShell 管理工具替换为 pstack-claude 的轻量派生版。
Codex 和 Claude Code 通过原生 marketplace 安装 `pstack@oms`，T3 复用对应后端。
完整迁移方式见[另一台电脑安装指南](oms-install-another-computer.md)。

## 本版变更

- 基于 pstack-claude 0.9.138，提交 `a12b04786023e762f12f5de7bb5fafb8c23f8c36`，保留上游历史和作者声明。
- 保留上游技能、工作流、模型默认值、hooks 和其他宿主支持，仅增加 T3 条件入口与工具映射。
- `setup-pstack` 在 T3 中发现 provider、完整模型 ID 和 effort，保存原有角色的跨 provider 配置。
- 用户表为 `~/.t3/pstack-models.md`，项目表 `.agents/pstack-models.t3.md` 整体优先。
- 删除旧 OMS 安装器、组件目录和安装状态管理，旧文档及书籍授权保留在 `docs/oms-history/`。

升级不会自动迁移旧插件、改写个人指令或模型表，也不会删除已下载的书籍、AIHero、其他插件或登录凭据。
从 1.x 升级前须按[迁移说明](oms-migration.md)核对旧插件来源，避免同时加载两套 pstack。

## 安装与下载

GitHub Release 标签为 `v2.0.2`，源码包为 `oms-2.0.2.zip`，校验清单为 `SHA256SUMS.txt`。
下载入口为 [OMS 2.0.2 Release](https://github.com/williamwue/oh-my-stack/releases/tag/v2.0.2)。
macOS、Linux 和 Windows 使用同一份源码包，宿主 CLI 与所需工具由用户自行安装并登录。

macOS 或 Linux 在下载目录运行：

```sh
shasum -a 256 -c SHA256SUMS.txt
unzip oms-2.0.2.zip
```

Windows 使用 `Get-FileHash ./oms-2.0.2.zip -Algorithm SHA256` 对照清单，再解压。
保留解压目录，通过宿主注册该目录作为 marketplace；不要再运行旧 `oms.ps1`。
固定标签和原生安装命令见[安装指南](oms-install-another-computer.md)。

## 可选个人分工

[五模型示例](examples/pstack-models-t3.md)使用 Astra 主控、Opus 与 Astra 架构候选、Sol 常规执行、Sonnet 裁判池首选。
Terra 保留为显式专项调用，没有新增常驻角色。
该示例不属于插件默认值，不随安装自动写入。

另一台电脑的 provider 实例 ID、可用模型和 effort 可能不同，须由 T3 catalog 验证后再保存。
角色表不会切换父会话模型，也不会自动增加或排列工作步骤。
Code 项目新会话的 Astra/high 默认设置只存在原电脑的 T3 项目中，不随插件或示例同步。

## 已有验证及边界

- [跨模型配置验收](oms-t3-models-verification-2.0.2.md)记录了原生打包、Claude 到 Codex 派发及直接调用 how 技能。
- [日常升级验收](oms-daily-install-2.0.2.md)记录了两个原生后端的安装、技能发现，以及 Opus、Sol、Astra 的真实执行。
- [五模型验收](oms-five-model-profile-2026-11-16.md)记录了 Astra 主控与 Opus、Astra、Sonnet、Sol、Terra 的真实调用。
  根会话核对了实际执行型号和宿主 effort 设置，并复跑交付的 9 项 Node 测试，全部通过。
- 发布准备前的完整仓库回归为 2,054 通过、160 跳过、0 失败；跳过项未计为通过。

这些记录证明对应本机和有限任务的行为，不代表每种宿主、操作系统或全部工作流都完成真实验收。
本次没有审计订阅归属、剩余额度或账单来源。
最终发布检查以对应 PR、Release 资产和发布后的下载核对记录为准。
