# OMS 2.0.1 独立 worktree 验证

日期：2026-11-16。结果：PASS。
用户明确授权新建绑定 OMS 仓库的专用 T3 验收线程，补齐此前因父项目不是 Git 仓库而未完成的实测。
本次没有更改日常插件、模型配置或登录，也没有推送、发布、创建 PR 或启动服务器。

## 坐标与执行

验收协调线程绑定项目 `/Users/williamwue/Code/oh-my-stack`，
从本地未发布提交 `77bc11ab764b0818aaf878caf808a540fadaf59b` 发起唯一一次
`delegate_task`，使用 `isolation: "worktree"`。
工作区由 T3 准备并在子线程启动前绑定，没有通过 shell 创建 checkout。

- 根分支：`refactor/pstack-t3-only`。
- 子分支：`t3/verify-t3-worktree-isolation`。
- 子目录：`~/.t3/worktrees/oh-my-stack/t3-a4c2d12a-f5da0908d2312f48`。
- 两边 HEAD 均为上述提交，绝对 Git common-dir 均为主仓库的 `.git`。
- 子线程 `t3_worktree_status` 返回 attached=true，路径与 pwd、Git 顶层目录一致。
- 实际 executedModel 为 `gpt-6.1-sol`，子线程只读配置返回 reasoningEffort=medium、serviceTier=default。
- 执行区间为 03:28:20–03:29:23 UTC，状态 completed。

协调线程遵循完成通知恢复执行，未轮询子任务，也没有追加子代理。
原始线程链接和运行标识保存在 [结构化证据](evidence/oms-2.0.1-worktree.json)。

## 隔离与技能

子线程从自动提供的技能目录读取日常安装的 poteto-mode，跟随 T3 映射，读取 bro 并完成中文改写。
映射 SHA256 仍为：

```text
c446723199bba788bf0e7ac767aa711ac34c36037b7f3895e5890d3db89e284c
```

子线程只在其绑定目录独占创建一个临时标记：

```text
.oms-worktree-smoke-ee1e367c0bf94eb68b1ae7d95d4a2153
```

实际执行记录确认标记可读、内容一致，主工作区没有同名文件。
标记随后由创建者删除。协调线程和原主线程分别只读复核，确认两边都无残留标记，
`git status --porcelain` 均为空。没有修改跟踪文件。
验收 worktree 保留在 T3 中作为可检查的工作区，不再有运行中的测试子任务。

## 结论与历史

此次补齐了 T3 独立 worktree 创建、绑定、实际执行、文件隔离和清理验证。
[日常安装记录](oms-daily-install-2.0.1.md) 中的待授权状态及
[先前验证](oms-verification-t3-2.0.1.md) 中的失败，均保留为当时事实。
新版成功结果不将原来的 `/Code` 非 Git 项目请求改写为通过。

结合此前的 Codex/Claude 自动技能发现、启动路由和代表性模型调用，
本轮计划的安装与代表性验收已完成。
PR 事件监控、取消、Windows 原生安装及全部 pstack 工作流的穷举测试不计为本次通过。
