# OMS 2.0.1 日常安装与后续验收

日期：2026-11-16。源码提交为 `c4a03ebe`，上游基线仍为 pstack-claude 0.9.138。
用户明确授权剩余验证和日常安装。本轮包含真实 T3/Codex、T3/Claude 模型调用；未推送或发布。
本记录是 [先前代表性验证](oms-verification-t3-2.0.1.md) 的后续，不改写该记录的历史边界。

## 安装来源与保护

从已提交源码导出固定本地目录：

```text
~/Library/Application Support/oh-my-stack/distributions/2.0.1-c4a03ebe
```

导出时逐文件对照 Git archive 内容，不包含工作区的未提交文件、依赖目录或凭据。
Codex 和 Claude Code 均通过各自原生 CLI 将该目录注册为 marketplace `oms`，
安装 `pstack@oms` 2.0.1，原生列表均报告 enabled。
Claude 列表也确认 folderVersion 为 2.0.1；不是只根据目录名推断版本。

Codex 安装路径为 `~/.codex/plugins/cache/oms/pstack/2.0.1/`。
Claude 的目录读取模式使用上述固定发行目录的 `plugins/pstack/`，保留其原生缓存记录。
切换开发仓库分支不会改变这份固定安装来源。此来源是本地快照，原生更新不会自动取得
开发仓库或 GitHub 的最新提交；后续升级需要注册新的受检发行包。

检查时没有发现旧 pstack 安装，无需停用或移除其他来源。
此前的插件和模型配置已保存在：

```text
~/Library/Application Support/oh-my-stack/backups/daily-201-20261116-111540/
```

备份目录仅限当前用户访问，不备份登录凭据。安装后逐项对比确认：

- 个人 pstack-models.md、全局 AGENTS.md/CLAUDE.md 字节不变。
- 既有 Codex 插件启用配置、MCP 等原配置保留。
- 既有 Claude 配置和 Basic Memory 安装条目保留。
- 电子书、笔记、旧 OMS 数据和授权记录没有修改。

## 自动加载与真实调用

每项测试均创建新的 T3 委派子会话；提示中没有提供源码或技能绝对路径，
并要求技能缺失时直接报告，不手工搜索仓库补救。

### Claude

实际执行模型为 `claude-sonnet-5-5`，宿主记录 effort=medium。
原生 Skill 工具成功调用 `pstack:poteto-mode` 和 `pstack:bro`；
Skill 返回的 Base directory 位于固定发行包。会话报告收到 pstack SessionStart 路由提示。
读到的 T3 映射 SHA256 与候选包一致，bro 改写完成。

### Codex

首轮实际执行模型为 `gpt-6.1-sol`，宿主记录 reasoningEffort=medium。
系统提供的技能目录自动列出 pstack，实际读取和改写成功，但没有收到 SessionStart 路由提示。
原生 app-server `hooks/list` 确认 pstack hook 为 enabled、untrusted。

检查安装包中原始 hook 脚本后，通过 Codex 原生 `/hooks` 界面仅信任
`Loading pstack routing`。后续 `hooks/list` 报告该 hook 为 trusted，其他 hook 信任状态未变。
打开原生界面产生的模型引导计数变动已恢复，既有设置对比通过。

重新使用新的 `delegate_task` 复验，执行模型仍为 `gpt-6.1-sol`，reasoningEffort=medium。
新会话确认初始上下文包含 “You have pstack.” 和复杂任务路由条件；
系统目录中的 bro 可读取且改写完成。初次缺少路由提示的结果保留，不计为首次通过。

所有完成结果均在收到宿主通知后读取 T3 活动记录，核对 executedModel、
实际工具调用和模型选项；没有轮询运行中的委派。线程链接及精简结果保存在
[结构化证据](evidence/oms-2.0.1-daily.json)。

## 独立 worktree 与剩余范围

本对话所属项目是 `/Users/williamwue/Code`，不是 Git 仓库。
T3 的本地委派固定在父项目中，不能通过 target.projectId 切换到 OMS 项目。
完成独立 worktree 实测需要另开绑定 OMS 仓库的验收线程；已请求用户明确授权，尚未执行。
没有在 shell 创建工作区、修改父项目绑定或把共享目录测试计为独立隔离通过。

日常安装、两种后端的自动技能发现、代表性模型调用和启动路由提示已经验收。
PR 事件监控、取消、Windows 原生安装以及所有 pstack 工作流的穷举测试不在本次通过范围。
已经打开的旧会话仍应使用 T3 的 Restart agent session 加载新插件；新建子会话的结果
不表示当前主对话的旧上下文被自动替换。

## 回退

通过对应宿主原生机制停用或卸载 `pstack@oms`；保留发行包及备份以便检查。
个人模型表和其他插件无需恢复，因为它们没有被改写。
若需撤销本次 hook 信任，在 Codex 原生 `/hooks` 中仅处理 pstack 对应项。
不要用整份旧配置覆盖后续用户新增设置，备份应按差异合并恢复。
