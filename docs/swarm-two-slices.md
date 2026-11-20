# 两分片 swarm 首次实机验收

2026-11-20。T3 Code 和独立 Codex CLI 均完成了一次覆盖型 swarm。执行入口分别是 OMS 分发的 t3-pstack 2.5.2 的 swarm 和独立 Codex 0.171.0 的原生 spawn_agent。本轮验证共同的工作流行为。两个入口仍复用了现有移植的技能文本。

## 共同输入与完成条件

基线为 `05281b39280a06a098dcc1bc102d09e1201d65c6`。T3 读取基线仓库，CLI 读取同一提交的独立克隆。两个父会话均使用 Astra，目标 worker 为 Codex Sol high。按覆盖分片分工，先派出两个子任务，再汇总；两个分片都必须有终态和证据。

| 分片 | worker 的输入、权限和产物 | 父任务复核 |
|---|---|---|
| inventory | 只读，用 git show 从指定提交读取 docs/pstack-workflow-inventory.md，统计带 /playbooks/ 链接的表格行 | 独立从提交对象计数，预期 22 行 |
| version | 用 git show 读取根 package.json，将顶层 version 和单个 LF 写入该宿主的专用输出文件 | 重新解析提交对象并比对文件字节，预期 32 2E 30 2E 32 0A |

简报要求返回完整 SHA、方法 `git-show`、观测值和证据。本案例以专用输出文件隔离单写者；T3 父工作目录 G:/Projects 本身不是 Git checkout。双写者、宿主创建的 worktree 和安全沙箱强制只读需另测。

## 运行结果

| 宿主 | inventory | version | 运行证据 |
|---|---|---|---|
| T3 → Codex | 22 | 2.0.2 + LF | 两个 delegate_task 均完成，选项请求 high，两条子运行记录的 executedModel 均为 gpt-6.2-sol。worker 报告用 Complete / Verified 表示完成，父任务根据证据判为 PASS。 |
| 独立 Codex CLI | 22 | 2.0.2 + LF | 父运行 `01a1f959-13d2-7650-8fc4-7436e2ac5666`。两个 spawn_agent 均先于 wait，均显式 fork_turns=none。子运行 turn_context 均为 gpt-6.2-sol / high，工作树只新增 native-version.txt。角色目标由测试明确给定。 |

T3 子线程：[inventory](t3-thread://v2/1d3f0332-60f4-46fa-bf35-59fe3034cfdb/thread:delegated-task:command%3Amcp%3A045bb15b-9140-4c2a-bc66-efc3116d6b25%3Adelegate-task%3Aoms-p2-inventory-01) · [version](t3-thread://v2/1d3f0332-60f4-46fa-bf35-59fe3034cfdb/thread:delegated-task:command%3Amcp%3A045bb15b-9140-4c2a-bc66-efc3116d6b25%3Adelegate-task%3Aoms-p2-version-01)。独立 Codex 子运行 ID 分别为 `01a1f959-c924-7b23-88e6-00af580439a2`、`01a1f959-e0ec-78c2-ab25-91a005baf913`。本机验收目录为 `G:/AIData/oms-swarm-phase2`，成功的 CLI 事件流和终态摘要为 native-events-2.jsonl、native-summary-2.txt。

首次 CLI 运行同时使用 --ignore-user-config、--ignore-rules 和 workspace-write，宿主在启动 git 和 PowerShell 前拒绝命令，两分片报告 BLOCKED。重新使用正常 CLI 配置并保留 workspace-write 后成功。两次运行对配置的改动不止一项，现有证据无法把失败归因于某条具体规则。该次宿主级重试与 swarm 的缺证据重派分别计数。

## 缺证据和复跑

两端成功运行的首轮都返回了 SHA 和方法，无需重新消耗模型调用。共享收集逻辑通过注入重派回调做离线故障验证：首次缺证据只调用一次重派；二次仍缺记 gap；重派发现的 ISSUES 必须保留；已阻塞或掉线的分片留下缺口。运行 `node --test tests/swarm-result.test.mjs`。此函数本轮未接管两个宿主的真实调度循环。

重做实机验收时，采用上表的相同提交与任务简报，给每个宿主分配新的空输出路径。保留请求参数、子运行 ID、终态摘要和文件字节；只有两个分片均取得可复核证据，才将覆盖实验判为通过。
