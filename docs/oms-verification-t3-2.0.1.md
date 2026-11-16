# OMS 2.0.1 T3 代表性真实验证

验证日期：2026-11-16。T3 Code 服务版本为 `0.1.10-nightly.20261116.4761`，
后端为 Codex。本轮验证由用户明确要求，包含真实模型调用。
未切换个人插件、模型配置、hook 信任或原生登录；未推送或发布。

## 精简内容

`t3-tools.md` 从 52 行精简到 21 行，只保留五类 pstack 操作到 T3 的对应：
子代理、角色模型与 effort、独立 checkout、委派生命周期和 PR 等待。
调度规则、禁止轮询、取消流程、顶层线程、链接、浏览器、设备和秘密输入等
通用规则交给当前宿主，不在插件里复制。
上游工作流、模型表、hooks 和两处生成入口均未改动。

候选包中 T3 映射的 SHA256 为：

```text
c446723199bba788bf0e7ac767aa711ac34c36037b7f3895e5890d3db89e284c
```

## 隔离安装与技能发现

在新的临时 CODEX_HOME 中通过原生 CLI 从本地仓库安装 `pstack@oms` 2.0.1。
同一目录的 Codex app-server `skills/list` 发现 67 个启用技能，errors 为空。
这一步未发起模型回合，不代表 T3 的日常会话自动加载通过。
临时配置和插件包不作为项目依赖提交，后续可能被系统清理。

## 原生子代理

通过当前 T3/Codex 会话的原生 `spawn_agent` 创建只读子代理，继承当前设置。
给出的技能入口和 bro 路径来自隔离包，要求它跟随入口中的条件映射。
子代理实际读取入口、T3 映射和 bro，返回与候选一致的映射 SHA256，并完成改写：

> OMS 的安装包检查通过了，宿主也提供了所需工具。但这些还不能证明模型实际运行正常、能把任务做对。

这是显式载入技能后的真实完成结果。没有单独测量该原生子代理的执行模型与 effort，
不将继承设置的契约当作独立执行遥测。

## T3 共享目录委派

[真实委派记录](t3-thread://v2/9e1444f8-a7d4-49b5-9008-4610d2b851a8/thread:delegated-task:command%3Amcp%3Adb865e04-4940-41b4-adbd-c7575ff9446e%3Adelegate-task%3Aoms-201-live-codex-shared-20261116-1)
通过 `delegate_task` 创建，指定 Codex、gpt-6.1-sol、reasoningEffort=medium 和 shared 隔离模式。
调用在 45 秒时返回 running，随后由宿主完成通知唤醒本线程；没有轮询任务状态或另建等待线程。

完成通知后读取 T3 活动记录，确认：

- run 状态为 completed，`executedModel` 为 `gpt-6.1-sol`，执行区间为 02:41:19–02:42:17 UTC。
- 子线程实际调用 `t3_thread_configure({})`，返回 reasoningEffort=medium、serviceTier=default。
  这是宿主记录的选项，不是对模型内部推理强度的独立测量。
- 命令记录显示按顺序读取隔离包的 poteto-mode、T3 映射、Codex 映射、bro。
- 子线程实测 cwd 为 `/Users/williamwue/Code`，映射 SHA256 与候选包一致。
- 返回改写保留原意：这一轮模型结束不能替代整个工作流程验收。

精简后的 [结构化证据](evidence/oms-2.0.1-t3.json)保存运行标识、模型记录、配置工具结果及读取顺序。
证据仅包含本次只读测试的信息，不含凭据或其他会话内容。

## 独立 worktree 尝试

先前使用同一目标模型请求 `isolation: "worktree"`，T3 在创建子任务前返回：

```text
invalid_request: Unable to resolve the parent checkout commit.
```

本对话绑定的 `/Users/williamwue/Code` 不是 Git 仓库，无法从该父工作区解析提交。
没有在 shell 创建 worktree、修改项目绑定或另建顶层线程绕过错误。
后续只读共享目录委派是独立测试，不计为 worktree 测试通过。

## 回归与边界

- 生成器检查通过，56 个生成文件一致。
- Bun 1.4.4、临时 Node 24.22.1：2052 pass、160 skip、0 fail，64 个测试文件。
- Markdown 校验和 Claude 本地插件校验通过；后者不等于 T3/Claude 实测。

本轮完成了原生子代理和 T3 委派的代表性真实验证，覆盖显式技能读取、模型选项和结果回传。
worktree、日常 T3 会话的自动插件加载、跨供应商、Claude 后端、取消及 PR 监控未验收。
没有执行全部 pstack 工作流，也没有把 bro 的一次改写扩大为这些能力已通过的结论。
