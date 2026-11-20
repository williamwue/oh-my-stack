# 缺少 SHA 的真实重派验收

2026-11-20，在 T3 Code 和独立 Codex CLI 0.171.0 分别运行项目技能 [oms-swarm](../.agents/skills/oms-swarm/SKILL.md)。本轮从源码工作树调用。两个宿主共用 [Node 收集器](../.agents/skills/oms-swarm/scripts/collect.mjs)，保留原生的任务标识、等待和派发工具。收集器返回决定，宿主内的协调代理执行决定。

## 实验

在提交 `05281b39280a06a098dcc1bc102d09e1201d65c6` 上同时派两个只读 worker。inventory 从提交对象统计剧本表格行；version 从提交对象读根 package.json。原始要求均含完整 SHA 和方法 `git-show`。只给首轮 version 注入故障：执行核对，但在末次消息中省略 sha。协调者将终态原文放入收据；第二次提交同一分片的两张收据。原始简报中的 SHA 不作为 worker 上报的证据。

| 宿主 | inventory | version 首次 | version 新 worker | 实际派发次数 |
|---|---|---|---|---|
| T3 Code | PASS，22 | retry，缺 sha；worker 也用了非标准状态 ok | PASS，2.0.2 | 2 次初始派发，1 次重派 |
| 独立 Codex | PASS，22 | retry，仅缺 sha，其余字段合法 | PASS，2.0.2 | 2 次初始派发，1 次重派 |
| 独立 Claude Code 2.1.329 | PASS，22 | retry，仅缺 sha | PASS，2.0.2 | 2 次初始派发，1 次重派 |
| 独立 OpenCode 2.2.7 | PASS，22 | retry，仅缺 sha | PASS，2.0.2 | 2 次初始派发，1 次重派 |

原生 CLI 事件流中的三个收集器决定依次为 `retry / 1 / ["sha"]`、`PASS / 1 / []`、`PASS / 2 / []`。父运行 `01a1f965-0165-7800-bc0d-519d1be94384`；inventory、version 和 version_retry 的原生线程分别为 `01a1f965-97ad-71c2-9cc5-89b738346947`、`01a1f965-ab4a-79d0-9ec9-a51e58d6b064` 和 `01a1f966-7693-71f3-be94-8c68a7b28493`。三条 turn_context 均为 Sol high。首次尝试在派发前因沙箱无法读取用户目录下的角色表而停止；成功运行在同一 workspace-write 沙箱内读取隔离工作区中的同一条角色配置。

T3 的三个 taskId 尾部分别为 `oms-collect-real-inventory-1`、`oms-collect-real-version-1` 和 `oms-collect-real-version-2`。均请求 Sol high，三条运行的 executedModel 都是 gpt-6.2-sol。首次失败保留原文，第二次使用新的 taskId。父任务独立从 Git 对象复核了 22 和 2.0.2。[inventory](t3-thread://v2/1d3f0332-60f4-46fa-bf35-59fe3034cfdb/thread:delegated-task:command%3Amcp%3A045bb15b-9140-4c2a-bc66-efc3116d6b25%3Adelegate-task%3Aoms-collect-real-inventory-1) · [version](t3-thread://v2/1d3f0332-60f4-46fa-bf35-59fe3034cfdb/thread:delegated-task:command%3Amcp%3A045bb15b-9140-4c2a-bc66-efc3116d6b25%3Adelegate-task%3Aoms-collect-real-version-1) · [version retry](t3-thread://v2/1d3f0332-60f4-46fa-bf35-59fe3034cfdb/thread:delegated-task:command%3Amcp%3A045bb15b-9140-4c2a-bc66-efc3116d6b25%3Adelegate-task%3Aoms-collect-real-version-2)

## 第三阶段的原生事件

两次运行分别使用同一提交的隔离检出。将上述项目技能连同收集器复制到各自的 `.claude/skills/oms-swarm/` 和 `.opencode/skills/oms-swarm/`，分别通过 `claude -p` 和 `opencode run --standalone` 启动。Claude 父会话请求模型别名 `sonnet`，OpenCode 父会话请求 `opencode-go/deepseek-v4.1-flash`。此次验证范围是项目技能的派发与收集，发行包安装和按角色覆盖子模型需单独验收。

| 宿主 | inventory 子任务 | version 首轮子任务 | version 重派子任务 |
|---|---|---|---|
| Claude Code | `a635f9d2c5689a361` | `a34e2e30768a8e87b` | `aab7d114a54c10911` |
| OpenCode | `ses_e068df77affeV1C96HN7I7hafO` | `ses_e068df779ffeYmjHFNRGv1Yls5` | `ses_e068d453fffeYnfuJjG6N3eiel` |

Claude 的两条 `task_started` 都早于第一条完成通知，三次回报可按 `task_id` 从 `task_notification.summary` 读取。OpenCode 的前两次 `subagent` 调用来自同一条父消息，执行时间重叠，每条完成回执都带有自己的 `sessionID`。收集器使用完成回执内的 JSON 正文。

两端的收集器都对 inventory 返回 `{"action":"PASS","attempt":1,"missing":[]}`，对首次 version 返回 `{"action":"retry","attempt":1,"missing":["sha"]}`。协调者随后新建 version 子任务，保留首次回报并提交两张收据，得到 `{"action":"PASS","attempt":2,"missing":[]}`。两份检出的 Git 对象均独立复算出 22 行和版本 `2.0.2`。本机原始事件在 `G:/AIData/oms-swarm-phase3-20261120-225056/` 下的 `claude.jsonl` 和 `opencode.jsonl`。

## 第二阶段的复核资料

本机运行目录为 `G:/AIData/oms-swarm-phase2`。T3 的三份输入为 `collect-t3-inventory.json`、`collect-t3-version-first.json`、`collect-t3-version-final.json`；各文件可以单独传给收集器复算决定。独立 CLI 的命令、真实 stdout 和摘要在 `collector-native-events-2.jsonl` 和 `collector-native-summary-2.txt`。单元与 CLI 测试命令为 `node --test tests/swarm-result.test.mjs`，覆盖第二次仍缺证据后终止、同一收据无法冒充新尝试、阻塞和掉线等路径。当前原型按每分片一个提交和一个方法验收；宿主仍负责保存已派发的任务 ID、核实实际产物与汇总覆盖结果。
