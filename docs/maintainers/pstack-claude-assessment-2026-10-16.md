# pstack-claude 借鉴评估：2026-10-16

本文保留实施前的研究快照。第一批修复的结果另见
[Pi 与文档事实检查验收](../acceptance/2026-10-16-pi-doc-hardening/README.md)。

研究基线为 OMS `233519ea0f26b84f83f5c9a4adeed5ae9dfbce8f`（0.19.0 源码候选），
以及 pstack-claude `1dba27e50e8f18f146bb80f137f0690f8d773c2e`（0.9.86）。
双方的官方 pstack 均固定在 `99743e9` / 0.15.25，因此官方已有内容不计作对方独有优势。
本轮只新增研究报告和索引，不修改运行时代码、Skill、来源清单、生成器或配置。

## 结论与优先级

最值得借鉴的是把宿主差异做成可验证的实现，以及围绕真实故障编写测试。
OMS 已有严格来源派生、模型核验、配置保留、操作日志和 T3 委派，增强应接在这些实现上。
官方 pstack 保持唯一工作流语义来源；pstack-claude 保持参考用途。

1. **先修原生 Pi 的异常 RPC 隔离与退出等待。** 已用假进程确认输入 `null` 会令父进程异常退出；
   后代继承管道时，直接子进程虽已退出，停止等待仍可能不结束。前者是确认的异常输入处理缺陷；
   后者尚未证明真实 Pi 的 bash 路径可达。详见后文的逐函数比较和可执行复现。
2. **补适配现行派生清单的官方更新规划器。** 最新更新依赖专用迁移脚本，旧同步工具主动拒绝现行格式。
   借鉴预览、所有权差异、冲突诊断和路径检查，降低今后跟随官方的成本。
3. **将工作树审计做成受支持的工具。** 统一报告锁、脏文件、未跟踪文件、活动任务、合并证据和未知项，
   为现有清理流程提供证据。审计结果不自动触发删除。
4. **完善原生 GitHub 观察的完整性与总时间预算。** 借鉴分页、游标循环检查和共享截止时间，
   保留 OMS 完整性不足就停止的保护。T3 内继续使用宿主 watcher。
5. **增加当前文档事实检查与按平台执行的故障测试。** 已发现当前 Pi 安装资料仍写旧候选版本；
   对方将此类事实与源码联动的做法值得借鉴。
6. **之后再评估原生 Pi 完成通知和持久化记录。** 属于可选能力扩展，优先级低于上述修复；
   通用会话恢复、本地循环调度、更多宿主和形式化模型都需要独立需求。

## 官方更新：借鉴可预览的同步规划

对方的同步工具将新增、删除、模式变化、已声明改动、未声明改动、冲突和路径碰撞分别报告；
`--dry-run` 返回规划而不写入目标。测试覆盖符号链接、大小写/Unicode 碰撞、二进制冲突、
未知参数和过时登记项。[实现][ref-sync-tool]、[故障场景][ref-sync-tests]。

OMS 已有 [精确派生检查](../../tools/derive-pstack.mjs)、
[旧同步规划器](../../tools/sync-upstream.mjs)和
[历史同步测试](../../tests/sync-upstream.test.mjs)，不能将同步能力整体记为缺失。
但旧规划器只接受 imports schema 1（`planSync` 第244–246行），
[当前清单](../../upstream/imports.json)是 schema 2。
其接受命令也明确阻止旧工具推进严格派生来源（第489–491行）。
最近的更新通过 [专用迁移脚本](../acceptance/2026-10-16-pstack-sync/source/migrate.py)完成。
这是现行维护自动化的缺口，不是旧工具应绕过的校验错误。

本轮无写入探针调用 `planSync({sourceCheckout:process.cwd()})`，得到：

```text
Active-manifest sync probe: upstream/imports.json: unsupported schemaVersion
```

该拒绝发生在读取候选 checkout 前；探针不验证该目录是官方来源，也未推进任何 pin。

建议为现行 [parity manifest](../../upstream/parity-derivations.json)增加专用规划入口，输出：
官方旧/新提交、快照文件差异、失效 literal anchor、出现次数变化、元数据和目录新增项、
生成目标和必要检查。应用仍由既有精确派生与生成流程完成。

验收应使用两个小型官方格式 Git fixture：预览前后工作区字节一致；一次失配导致零写入、pin 不前进；
新增 Skill 自动进入待审元数据清单；删除文件与本地适配冲突可见；旧快照仍逐字节保留。
只允许官方 pstack 来源，pstack-claude 的 policy fork 不进入规划输入。
对方允许带冲突标记的同步推进 pin，OMS 应保持自己的严格接受条件，不复制这一选择。

## 工作树清理：借鉴保守的证据分类

对方的 `classify` 将已锁定、有修改、有未跟踪文件、开放 PR、近期活动及未知事实分开；
任何未知事实都不能产生 `safe`。状态命令显式使用 `--untracked-files=all` 和
`--ignore-submodules=none`，避免用户 Git 配置把工作隐藏掉。
测试包括 squash 合并、路径别名、扫描权限失败、扫描期间恢复的会话和未跟踪文件。
[分类与观察实现][ref-audit-tool]、[测试][ref-audit-tests]。

OMS 的 [生成绑定](../../tools/generate.mjs)第879–902行明确将源宿主工作树 helper 保持为 reference-only；
[现有测试](../../tests/portable-helpers.test.mjs)还验证这一边界。
当前 [T3 绑定](../../tools/t3-binding.mjs)第158–167行已经要求检查活动/固定线程、任务和进程，
证据缺失时清理候选保持未决。因此缺的是统一、可执行的观察结果，不是清理授权或保守原则。

建议由宿主观察器提供工作树、任务和活动证据，OMS 只做确定性的分类和解释。
输出应含路径/分支/HEAD、真实工作树身份、脏状态、已忽略输出的处理范围、锁、PR 对应 SHA、
活动任务及未取得的证据。清理动作继续使用现有明确授权流程，并在执行前重读关键证据。

对方的 audit 本身会执行 `git fetch`（第296–323行），读取会话目录，且含四天活动阈值；
不能直接将其称作 OMS 的纯只读审计。OMS 的观察预览应与刷新远端引用分开，
会话范围由宿主支持的接口或明确指定的本地记录提供，活动阈值也不能变成默认删除政策。

验收优先覆盖：隐藏未跟踪文件的 Git 配置、忽略子模块的配置、锁、路径替换、活动任务、
无法读取活动信息，以及 squash 合并后分支不属于主干祖先的情况。
所有这些分类测试都应证明不会删除任何工作树或分支。

## 原生 PR 观察：完整分页和共享截止时间

对方的 reader 对检查和 review threads 分页，拒绝重复/循环游标；
`WatchDeadline` 为发现、命令、轮询和重试提供同一时间预算。
`ship-pr` 还保留精确 landing revision 和取消待合并操作前后的重读。
[分页][ref-watch-reader]、[截止时间][ref-deadline]、[交付记录][ref-shipping]。

OMS 已有 [精确目标与操作日志](../../tools/github-autopilot-provider.mjs)、
[三类有边界的 PR 操作](../../tools/github-workflow.mjs)和
[保守门槛测试](../../tests/github-autopilot-provider.test.mjs)。
它会核对账号/仓库/当前 head、拒绝不完整数据、保留中断操作日志；不能因为实现较窄就判为不安全。

实际缺口是：原生 provider 的 checks/status/reviews/threads 观察保守限制在单页且少于100条，
transport 超时按每次请求计算，并非一次完整观察的共享截止时间。
本轮仅用注入的假 transport 调用 `inspectPr`，全部线程已解决、`hasNextPage:false` 时得到：

```json
{"resolvedThreadCount":99,"hasNextPage":false,"threadGate":"resolved"}
{"resolvedThreadCount":100,"hasNextPage":false,"threadGate":"unknown"}
```

这是大型 PR 覆盖能力受限的证据，输出 `unknown` 正是在避免错误通过。
可以先增强只读诊断：分页直到确认完整，同时限制总页数、总字节和总时长；
游标重复、结构错误、权限不足或预算耗尽仍保留 `unknown`。
保留 OMS 原有逐请求字节限制、账号核对和收敛日志，不整段替换 transport。

[T3 绑定](../../tools/t3-binding.mjs)第140–144行已经使用宿主的 `watch_pull_request` 与
`unwatch_pull_request`。该路径不增加另一个 watcher、轮询器或常驻后台进程。
也不直接引入对方“无 CI 等待一定时间后就绪”等门槛或自动合并政策。

验收先覆盖99/100/101条、第二页存在未解决问题、游标不前进、循环游标、部分 GraphQL 错误、
读取中 head/base 变化，以及多次慢请求共享预算。只读完整观察通过后，再单独讨论新写操作。

## 测试与维护：借鉴故障样本和文档事实检查

对方的 [文档事实测试][ref-doc-facts]将入口数、原则数和上游 pin 对回源码，
[平台 CI][ref-platform-ci]分别执行 Windows hook、Windows/macOS 工作树和 Pi 启动检查。
值得借鉴的是测量已声明的行为、命令与安装产物之间的一致性，而不是测试数量。

OMS 已有 [目录生成与校验](../../tools/generate-skill-directory.mjs)、
[安装后任意目录 helper 测试](../../tests/portable-helpers.test.mjs)、
[路由测试](../../tests/routing.test.mjs)和 [Pi 原生验收](../../tools/pi-native-acceptance.mjs)。
仍有当前资料漂移：中文 [README](../../README.zh-CN.md)第51行称 Pi 当前提供于0.16.0本地发行版本，
[Pi 安装页](../pi-install.md)第3行称本地0.15.0候选，而当前源码候选已是0.19.0。
这些是本轮观察到的文档问题，尚未修复。

建议从项目版本、来源 pin、有效分发目录和明确的历史标记中验证当前文档事实；
已发布版本与本机已安装版本使用各自来源，避免用源码版本覆盖它们。
将崩溃、权限失败、半条 JSON、隐藏文件、线程分页和暂停/恢复竞态作为行为 fixture，
而非新增大量只对提示词做文本匹配的测试。

对方的 [GitHub 假服务][ref-fake-contract]只返回查询选中的字段，并检查变更请求的输入字段与类型，
能捕获假服务无条件返回“正确结果”掩盖真实协议错误的问题。
OMS 当前并没有 dequeue 写操作，因此不应宣称对方修复的字段错误也存在于 OMS；
该测试思路适合今后扩展观察查询及变更操作时采用。

对方还提供 [依赖和工作流扫描][ref-security-ci]及 [有界并发模型][ref-formal]。
OMS 已有固定依赖、动作 pin、输出限制、严格派生和锁；可按现有本地维护流程补充检查，
保留当前手动 CI 和发布门槛，不自动恢复已撤掉的独立审阅门槛或引入定时任务。
本轮未运行其安全扫描、TLA+ 或 Lean；模型存在也不证明整个工作流正确。
对方部分模型特意保留预期失败的反例，应逐项理解后再借鉴。

## 第一批建议与验收范围

先做两个范围较小的实现单元：原生 Pi 异常输入/退出等待修复，以及当前文档事实检查。
前者有可执行故障样本，后者有明确的当前文档漂移，均能在保持官方工作流不变的情况下验证。

之后分别实现严格派生更新规划器、宿主观察驱动的工作树审计、原生 PR 完整观察。
每个单元都应拥有具体文件、失败样本、通过条件和独立验收；Skill 或生成器改动继续运行
`npm run check`，原生运行成功、真实模型行为、安装和发布分别记录。
这些是建议；本轮仅有研究文档分支，尚未修改上述实现或启用任何新能力。

## 本轮父任务执行的检查

研究只在临时参考 checkout 安装依赖。Bun 为1.4.2，对方 CI 固定的1.3.14未在本轮复现。
运行环境是本机 macOS，Windows 的条件跳过不能记作该平台实测。

```sh
# 在固定版本的参考 checkout 根目录
bun install --frozen-lockfile
env -u PSTACK_PI_LIVE -u PSTACK_LIVE bun test \
  tests/worktree-audit.test.mjs tests/find-transcript.test.mjs \
  tests/shipping-git.test.mjs tests/session-hook.test.mjs \
  tests/session-hook-windows.test.mjs tests/sync.test.mjs \
  tests/generate.test.mjs tests/models.test.mjs tests/invariants.test.mjs
# 686 pass, 23 skip, 0 fail; 709 tests, 9 files

# 在参考 checkout 的 plugins/pstack/skills/poteto-mode/scripts
bun install --frozen-lockfile
env -u PSTACK_PI_LIVE -u PSTACK_LIVE bun test \
  watch-pr/github.test.ts watch-pr/cli.test.ts watch-pr/policy.test.ts \
  watch-pr/transport.test.ts watch-pr/shipping.test.ts watch-pr/shipping-cli.test.ts
# 145 pass, 0 fail; 6 files

# 在 OMS 根目录
node --test tests/github-autopilot-provider.test.mjs tests/github-workflow.test.mjs \
  tests/sync-upstream.test.mjs tests/routing.test.mjs tests/portable-helpers.test.mjs
# 68 pass, 0 fail
```

第一组的23项跳过包括 Windows 专用用例和不适用于当前文件系统的大小写改名用例。
各组测试针对不同范围，数量不能作为两项目整体质量比较。
原生 Pi 的额外测试、真实 CLI 启动范围及三项故障注入见下文。

## 附录：Pi 委派与生命周期的详细研究

可借鉴的重点是适配器实现和离线故障测试。OMS 已有原生 Pi 委派、物理模型及思考级别核验、超时/输出限制、独立写入工作树检查和 T3 异步委派能力，不应把这些记成缺失。本次确认了两类值得先处理的问题：异常 RPC 记录 `null` 会触发原生 Pi 适配器父进程未捕获异常；假 RPC 子进程退出后，继承管道的后代进程会令停止等待超过原定子进程退出时间。后者尚未用真实 Pi 的 bash 工具证明可达，不能扩大成“所有 Pi 取消均失效”。

持久化记录、恢复/发消息、自动唤醒和工作树生命周期属于能力扩展。参考实现的 PID 启动身份核验、恢复所有权检查、消息与结算竞争测试，以及忽略文件/游离提交的保留测试很有价值；自动删除工作树/强删分支、全局拦截 shell sleep、未经请求引入循环调度等策略不应移植。T3 已经承担其宿主的通知、状态、取消和调度边界，无须复制原生 Pi 调度器。以下保留逐函数英文证据表及可直接执行的原始命令，方便后续逐项实现与验收。

Evidence labels used here:

| Label | Meaning |
| --- | --- |
| Source | Read the pinned implementation; establishes intended mechanics, not runtime success. |
| Fixture | Executed offline tests or fault injection using fake Pi processes/ExtensionAPI. |
| Native startup | Executed the installed Pi CLI in an isolated temporary profile, without a provider/model run. |
| Native local provider | OMS has an executable acceptance harness using real Pi with a simulated local provider; source inspected here, not executed in this investigation. |
| Live | Real provider/model/account behavior. No such evidence was collected here. |

### OMS 已有能力与真实差异

| Concern | Reference implementation and evidence | Existing OMS equivalent | Assessment |
| --- | --- | --- | --- |
| Task launch and model identity | `AgentRunner.start/launch` fixes an agent identity and launches its own RPC child, including model/thinking/system prompt/worktree ([agents.ts:191–247][ref-start]). | `createPiDelegationManager.start` resolves one configured route member, checks packaged role contracts, requires an explicit physical provider/model, verifies advertised models, native model/thinking and thinking levels, and verifies assistant-reported physical model ([pi-delegation.mjs:148–245](../../tools/pi-delegation.mjs#L148)). | OMS already has delegation and stronger explicit route-selection verification. Do not describe this as a missing subagent runtime. Reference aliases/provider fallback are not a reason to replace OMS model policy. |
| Process identity on restore | Persisted records include child PID, operating-system process start identity and launcher PID; `inspect/fateOf` distinguish a still-owned remote process, verified orphan, unknown identity and a gone/reused PID. `owned` refuses mutation by another launcher; restore never signals an unverified PID ([agents.ts:25–63][ref-identity], [139–175][ref-fate], [315–325][ref-owned], [378–422][ref-restore]). | OMS retains a process handle and task map in memory and exposes PID in snapshots. It has no record replay or session restore path ([pi-delegation.mjs:133–142](../../tools/pi-delegation.mjs#L133), [195–206](../../tools/pi-delegation.mjs#L195)). | Persistence/recovery is feature expansion, not an existing reused-PID signaling bug: OMS currently does not signal a PID loaded from persisted user records. If restore is added, PID alone is insufficient. |
| Stop and actual exit | `PiChild` starts a detached process group, sends guarded group SIGTERM/SIGKILL, and `AgentRunner.stop` returns the terminal record after its child's exit. Terminal notices follow exit, not just the abort request ([child.ts:71–110][ref-child-spawn], [146–179][ref-child-stop], [248–260][ref-group], [agents.ts:346–358][ref-stop]). | OMS's `cancel` aborts the controller and waits for `task.done`; status is finalized after `connection.stop()` resolves. Shutdown also awaits all tasks. The transport closes stdin and escalates the direct child to SIGKILL, while termination sends direct-child SIGTERM ([pi-delegation.mjs:49–59](../../tools/pi-delegation.mjs#L49), [249–258](../../tools/pi-delegation.mjs#L249), [281–293](../../tools/pi-delegation.mjs#L281)). | Direct-child exit truthfulness exists already. The fake-process probes below demonstrate a narrower descendant and inherited-pipe gap, not a blanket failure of cancellation or proof of real Pi leaving every bash child alive. |
| Scope of process cleanup | Reference deliberately promises to stop the running Pi process and its currently running bash command; it explicitly excludes a process left behind by an already-finished bash command. Group signaling stops once the child leader has exited, avoiding a reused process-group identity ([agent-tools.ts:119–120][ref-tools], [child.ts:95–105][ref-child-spawn], [172–179][ref-child-stop], [tests/pi/agents-run.test.mjs:114–139][ref-pipe-tests]). | OMS tests establish that the direct child is gone, including cancellation and shutdown; they do not inspect a child-created descendant ([pi-adapter.test.mjs:113–124](../../tests/pi-adapter.test.mjs#L113)). The native local-provider harness also checks the recorded Pi PID ([pi-native-acceptance.mjs:101–108](../../tools/pi-native-acceptance.mjs#L101), [128–145](../../tools/pi-native-acceptance.mjs#L128)). | Reuse the distinction between owned active work and deliberately detached services. Never infer a license to recursively kill all processes under a worktree. |
| Completion and shutdown outcome | `outcomeOf` requires a settled run, final text and no model error; once a valid reply has settled, shutdown's nonzero exit does not erase success. Stopping is a distinct status ([agents.ts:88–98][ref-outcome]). | OMS requires settlement, no accumulated error, and a clean process exit; cancellation is distinct. Retry/compaction events are rejected and output/model failures remain visible ([pi-delegation.mjs:210–254](../../tools/pi-delegation.mjs#L210)). Existing tests explicitly reject nonzero exit ([pi-adapter.test.mjs:101–105](../../tests/pi-adapter.test.mjs#L101)). | These are different completion contracts. The reference's “settled reply survives forced shutdown” is not automatically an OMS correctness improvement. Keep OMS's documented strict contract unless official-source semantics and native acceptance justify changing it. |
| RPC shape handling | `PiChild.onLine` validates records before dereferencing fields, including text parts, responses and settlement; irrelevant/malformed records are skipped or converted to a failed response. Tests cover non-object JSON and missing fields ([child.ts:15–30][ref-rpc-schemas], [182–207][ref-rpc-reader], [agents-run.test.mjs:151–180][ref-shape-tests]). | OMS catches JSON syntax errors, but immediately reads `message.type` and later calls `.filter` on `assistant.content` without shape validation ([pi-delegation.mjs:69–79](../../tools/pi-delegation.mjs#L69), [216–224](../../tools/pi-delegation.mjs#L216)). | A real correctness gap in the native Pi adapter's malformed-input boundary; `null` fault injection reproduced an uncaught parent exception below. This does not establish that normal Pi emits such records, or a T3 defect. |
| Messaging and resumed child sessions | `send` first tries RPC steer, checks whether it actually entered the still-running turn, then waits and resumes the same persisted session identity if the prior run settled. Concurrent sends reread state to avoid duplicate resumes; stopped/shutdown races refuse delivery ([agents.ts:328–343][ref-send], [child.ts:129–143][ref-steer], [tests/pi/agents-messages.test.mjs:10–145][ref-send-tests]). | OMS intentionally launches with `--no-session`; its tool exposes only start/collect/cancel and there is no send/resume operation ([pi-delegation.mjs:12–13](../../tools/pi-delegation.mjs#L12), [265–293](../../tools/pi-delegation.mjs#L265), [extension.ts:10–26](../../src/runtime/pi/extension.ts#L10)). | A genuine absent capability, but feature expansion. A fresh independent review must not be converted to resumed historical context merely for convenience. |
| Background completion wakeup | Reference records the completed result and uses `sendMessage(..., {triggerTurn:true, deliverAs:"steer"})` after background exit. Explicit stop adds context without starting another turn; teardown adds no notice. One-shot print/json and nested children hold settlement until background notices can be processed ([agents.ts:260–278][ref-finish], [one-shot.ts:49–72][ref-oneshot], [agents-session.test.mjs:335–386][ref-oneshot-tests]). | OMS emits `onUpdate` snapshots and offers blocking collect, but the extension never calls `sendMessage`/`sendUserMessage` or holds one-shot settlement ([pi-delegation.mjs:257–262](../../tools/pi-delegation.mjs#L257), [extension.ts:7–28](../../src/runtime/pi/extension.ts#L7)). | Pi lacks an explicit parent-turn completion wakeup. An update callback is not source-level proof of a new parent turn after the initiating tool has returned. Native acceptance should establish this separately before promising event-driven background orchestration. |
| Scheduling | Reference has one in-process pending wakeup and one loop per session; it waits for idle/manual compaction to end, clamps a wakeup to 60–3600 seconds, replaces prior timers, rejects wakeups that cannot survive a one-shot run and prevents an old loop iteration rearming after user stop/replacement ([schedule.ts:20–91][ref-scheduler], [130–175][ref-schedule-tool], [177–224][ref-loop]). Timers are unref'd and canceled on shutdown ([index.ts:29–33][ref-index]). | No native Pi timer tool exists in OMS's extension. T3 already has a distinct schedule-request preparer with explicit destination/user-intent checks; it returns a draft and does not claim creation ([t3-orchestration.mjs:911–947](../../tools/t3-orchestration.mjs#L911)). | A native Pi capability difference. The reference is session-local, not a durable scheduler; it supplies no evidence that a restarted process will fire a timer. Do not add scheduling merely to mirror the reference, and never treat a timer/tool addition as permission for recurring work. |
| Worktree creation and retention | Reference plans a known linked worktree/branch/base; validates directory, root, Git common directory and registration before use/cleanup; retains ignored files and commits found through HEAD reflog, including detached/reset-away commits. Otherwise it automatically removes the worktree and force-deletes its branch ([worktree.ts:17–72][ref-worktree], [tests/pi/worktree.test.mjs:22–126][ref-worktree-tests]). | OMS requires explicit `independentCheckout:true`, verifies parent/child Git worktree roots differ, rejects aliases and prevents concurrent writers to the same real child root. It does not create/remove worktrees ([pi-delegation.mjs:119–131](../../tools/pi-delegation.mjs#L119), [178–200](../../tools/pi-delegation.mjs#L178); [pi-adapter.test.mjs:150–225](../../tests/pi-adapter.test.mjs#L150)). | Lifecycle management is absent by design, while writer isolation admission already exists. Recording supplied worktree identity/output would help acceptance. Automatic removal and `branch -D` are dangerous policy to reject under OMS cleanup gates. |

### T3 已有的宿主委派能力

The selected T3 binding supplies full contracts and explicit context to `delegate_task`; async completion notifications, `task_status`, stable request IDs, fresh review rounds and separately created writer worktrees are documented ([T3 guide:375–404](../t3-orchestration.md#L375)). `observeT3Task` checks stable task/node/thread/provider identities, distinguishes the original published result from later terminal runs and pending children, and explicitly leaves `requestedOptionsVerified:false` ([t3-orchestration.mjs:866–901](../../tools/t3-orchestration.mjs#L866)). Cancellation preparation marks `cancellationObserved:false`; documentation requires subsequent actual status before claiming cancellation ([904–908](../../tools/t3-orchestration.mjs#L904), [T3 guide:406–423](../t3-orchestration.md#L406)). T3 schedules and PR event wakes are likewise host-owned, not provided by OMS spawning Pi processes ([T3 guide:448–470](../t3-orchestration.md#L448)). These are existing equivalents at a different host boundary, not evidence that the native Pi transport supports them.

### 已执行检查与证据边界

On 2026-10-16, the following commands completed:

```sh
# OMS: Node v22.23.3, all fake/native-transport fixture tests
node --test tests/pi-adapter.test.mjs
# 22 tests, 22 pass, 0 fail

# Reference checkout: Bun 1.4.2; no live flag/model/provider calls
env -u PSTACK_PI_LIVE bun test \
  tests/pi/agents-session.test.mjs tests/pi/agents-messages.test.mjs \
  tests/pi/agents-run.test.mjs tests/pi/agents-launch.test.mjs \
  tests/pi/child.test.mjs tests/pi/worktree.test.mjs \
  tests/pi/runtime.test.mjs tests/pi/sleep-wait.test.mjs
# 108 pass, 0 fail, 372 expect() calls, 8 files

env -u PSTACK_PI_LIVE bun test tests/pi/interaction.test.mjs
# 52 pass, 0 fail, 134 expect() calls, 1 file
```

Most reference results are fake API/process evidence. Three passing `runtime.test.mjs` cases use an installed Pi CLI with temporary profile settings, invoke `/loop` usage to prove single extension loading and intentionally never start a model run ([runtime.test.mjs:1–40][ref-runtime-tests]). The 52 interaction tests use fake timers/API; they do not establish wall-clock scheduling across real compaction/restarts. These passing tests establish reference mechanics and test patterns, not correctness or workflow performance with a real model.

OMS's [`runPiNativeAcceptance`](../../tools/pi-native-acceptance.mjs#L10) is already a substantial equivalent test asset: isolated agent directory, local dummy provider, native extension discovery/tool start/collect, observed model identity, cancellation, retry interception and parent shutdown; it asserts settings remain unchanged ([pi-native-acceptance.mjs:79–151](../../tools/pi-native-acceptance.mjs#L79)). Its source was inspected, but this investigator did not run that harness. No real profile installs, remote writes, live models, or production operations were performed.

Three additional offline probes used temporary fake RPC programs and cleaned up their children/files. They did not modify OMS source. Exact reproduction for all three, run from the OMS root:

```sh
node --input-type=module <<'NODE'
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPiRpcConnection} from './tools/pi-delegation.mjs';
const root=await mkdtemp(join(tmpdir(),'oms-pi-assessment-'));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
  const fake=join(root,'null.mjs');
  await writeFile(fake,"process.stdout.write('null\\n');setTimeout(()=>{},200)");
  const moduleUrl=new URL('./tools/pi-delegation.mjs',import.meta.url).href;
  const code=`import {createPiRpcConnection} from ${JSON.stringify(moduleUrl)};
    const c=createPiRpcConnection({binary:{command:process.execPath,
      args:[${JSON.stringify(fake)}]}});await c.closed;`;
  try { await promisify(execFile)(process.execPath,
    ['--input-type=module','-e',code],{timeout:3000}); }
  catch(error) { console.log(JSON.stringify({probe:'null',exitCode:error.code,
    error:error.stderr.match(/TypeError:.*/)?.[0]})); }
  for(const inheritedPipes of [false,true]) {
    const file=join(root,`child-${inheritedPipes}.mjs`);
    const pidFile=join(root,`desc-${inheritedPipes}.pid`);
    await writeFile(file,`import {spawn} from 'node:child_process';
      import {writeFileSync} from 'node:fs';
      const p=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],
        {stdio:${inheritedPipes?"['ignore',1,2]":"'ignore'"}});
      writeFileSync(${JSON.stringify(pidFile)},String(p.pid));
      process.stdin.resume();setInterval(()=>{},1000);`);
    const c=createPiRpcConnection({binary:{command:process.execPath,args:[file]},cwd:root});
    let pid;
    try {
      for(let i=0;i<100;i++) { try {pid=Number(await readFile(pidFile,'utf8'));break;}
        catch {await sleep(10);} }
      if(!pid) throw Error('fixture descendant did not start');
      let resolved=false;
      const stopped=c.stop().then(exit=>{resolved=true;return exit;});
      await sleep(1500);
      const alive=p=>{try{process.kill(p,0);return true;}catch{return false;}};
      console.log(JSON.stringify({probe:inheritedPipes?'inherited-pipes':'descendant',
        directAlive:alive(c.pid),descendantAlive:alive(pid),stopResolved:resolved}));
      process.kill(pid,'SIGKILL');await stopped;
    } finally { if(pid) try {process.kill(pid,'SIGKILL');} catch {} await c.stop(); }
  }
} finally { await rm(root,{recursive:true,force:true}); }
NODE
```

The combined recipe above was extracted directly from this report and executed successfully (outer command exit 0). Its exact output was:

```json
{"probe":"null","exitCode":1,"error":"TypeError: Cannot read properties of null (reading 'type')"}
{"probe":"descendant","directAlive":false,"descendantAlive":true,"stopResolved":true}
{"probe":"inherited-pipes","directAlive":false,"descendantAlive":true,"stopResolved":false}
```

The null exception occurred at `tools/pi-delegation.mjs:75` in a separate parent Node process; it was not converted to the task's bounded failure result. That is a confirmed malformed-RPC parent-crash case in the native Pi adapter. It says nothing about T3 and does not show ordinary Pi returning invalid records.

The descendant probes show that the generic transport does not own a child-created process group, and that its promise resolves on `close` only, which can remain pending after direct-child exit while an inherited pipe stays open ([pi-delegation.mjs:34–36](../../tools/pi-delegation.mjs#L34), [49–58](../../tools/pi-delegation.mjs#L49), [86–93](../../tools/pi-delegation.mjs#L86)). Neither probe ran an actual Pi bash tool. The direct child was dead after 1.5 seconds; killing the test descendant then released the pipe-bound stop. The reference handles the analogous pipe case with a two-second bound after child `exit` ([child.ts:95–110][ref-child-spawn]), while intentionally preserving processes left by completed background bash commands. This is the correct scope for an acceptance test, not grounds for an unrestricted process-tree cleanup policy.

### 四项有明确边界的候选改进

1. **Fix native Pi malformed-RPC containment first — confirmed correctness issue.** Validate the top-level object and required field shapes before transport dispatch and assistant text extraction; preserve OMS's strict failure/no-hidden-retry contract rather than copying the reference's exact skip policy. Proposed executable acceptance: extend `node --test tests/pi-adapter.test.mjs` with `null`, primitive/array JSON, malformed response fields, non-array content and invalid text parts. Run each crash candidate in an isolated parent process; require no uncaught exit, a bounded failed task/transport result, child exit and preserved parent usability. Retain the existing UTF-8, timeout, provider/model mismatch and retry assertions.

2. **Harden owned-process exit and pipe bounds — demonstrated fake-process gap; real Pi reachability remains to verify.** Distinguish the direct child's `exit` from pipe `close`; bound drain time after exit. If supporting process-group cancellation, establish ownership on spawn and guard escalation against stale leader identity; provide a platform-specific implementation instead of assuming Unix negative-PID signals work on Windows. Proposed acceptance: extend the fake transport suite with inherited stdout/stderr, a running bash-like descendant, child ignoring SIGTERM and leader exit before escalation. Require collection/shutdown to return within declared bounds and only owned active work to stop; an unrelated PID and a deliberately detached service remain untouched. Then add an isolated native-Pi/local-provider case that starts an active bash command before cancel/shutdown; inspect both PIDs. Keep the current direct-child tests as separate evidence.

3. **Consider persisted receipts and completion wakeups before general session resume — feature expansion.** If native Pi background workflows are wanted, first persist bounded immutable task/result/provenance records and deliver exactly one completion notice after exit, with print/json shutdown behavior tested. Do not silently revive a process or claim output merely from a saved `running` record. Proposed acceptance: fixture tests for reload/replay, missing/reused PID identity, unavailable process inspection, other-live-launcher ownership, one-shot parent settlement and shutdown-notice suppression; native local-provider acceptance must prove a new parent turn actually receives a completed child's result after `start` returned. Only add steering/resume later with separate explicit contracts and race tests (concurrent sends, settle-before-steer acknowledgement, rejected message, stop and shutdown winning the race). Fresh independent review rounds retain fresh task/context identity; T3 already has this host boundary.

4. **Record supplied writer worktree identity and retention reasons — additive acceptance aid, not automatic cleanup.** OMS's admission checks already enforce separate writer roots; add path/base/branch and owned output references to receipts if maintainers need cross-session artifact acceptance. Reuse the reference's test ideas for ignored output, detached/reset-away commits, symlink/replacement paths and nested worktrees. Proposed executable acceptance: extend isolated Git fixture tests and the appropriate generated-package check to ensure receipts report the actual real checkout and no lifecycle result deletes any worktree/branch. Cleanup remains an explicit existing workflow gate. A future create/cleanup helper is a separate feature with its own authorization and active-user/process evidence, not implied by delegation completion.

**Dangerous policy or scope changes to reject:** automatic `git worktree remove`/`git branch -D` on “clean” task completion; killing processes merely because a saved PID or directory matches; converting independent review rounds into resumed context; importing a global shell `sleep` blocker; treating `/loop` as authorization for unsolicited recurring work; copying model aliases/fallback, nested-agent defaults, or workflow wording as a second semantic source. The reference sleep detector deliberately over-blocks several legitimate commands and misses quoted/variable sleeps ([sleep-wait.ts:1–16][ref-sleep], [agent-tools.ts:49–58][ref-sleep-hook]); its workaround addresses reference-specific model behavior, not a demonstrated OMS correctness defect. Scheduling, general resume, three-level nesting and automatic worktree lifecycle remain optional product expansion rather than required fixes.

[ref-start]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/agents.ts#L191-L247
[ref-identity]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/agents.ts#L25-L63
[ref-fate]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/agents.ts#L139-L175
[ref-owned]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/agents.ts#L315-L325
[ref-restore]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/agents.ts#L378-L422
[ref-outcome]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/agents.ts#L88-L98
[ref-finish]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/agents.ts#L260-L278
[ref-send]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/agents.ts#L328-L343
[ref-stop]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/agents.ts#L346-L358
[ref-child-spawn]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/child.ts#L71-L110
[ref-child-stop]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/child.ts#L146-L179
[ref-group]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/child.ts#L248-L260
[ref-rpc-schemas]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/child.ts#L15-L30
[ref-rpc-reader]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/child.ts#L182-L207
[ref-steer]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/child.ts#L129-L143
[ref-tools]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/agent-tools.ts#L119-L120
[ref-pipe-tests]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/tests/pi/agents-run.test.mjs#L114-L139
[ref-shape-tests]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/tests/pi/agents-run.test.mjs#L151-L180
[ref-send-tests]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/tests/pi/agents-messages.test.mjs#L10-L145
[ref-oneshot]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/one-shot.ts#L49-L72
[ref-oneshot-tests]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/tests/pi/agents-session.test.mjs#L335-L386
[ref-scheduler]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/schedule.ts#L20-L91
[ref-schedule-tool]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/schedule.ts#L130-L175
[ref-loop]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/schedule.ts#L177-L224
[ref-index]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/index.ts#L29-L33
[ref-worktree]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/worktree.ts#L17-L72
[ref-worktree-tests]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/tests/pi/worktree.test.mjs#L22-L126
[ref-runtime-tests]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/tests/pi/runtime.test.mjs#L1-L40
[ref-sleep]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/sleep-wait.ts#L1-L16
[ref-sleep-hook]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/pi/agent-tools.ts#L49-L58
[ref-sync-tool]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/tools/sync.mjs#L314-L480
[ref-sync-tests]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/tests/sync.test.mjs#L1561-L1710
[ref-audit-tool]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/skills/poteto-mode/scripts/worktree-audit.mjs#L25-L54
[ref-audit-tests]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/tests/worktree-audit.test.mjs#L184-L339
[ref-watch-reader]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/skills/poteto-mode/scripts/watch-pr/github.ts#L742-L793
[ref-deadline]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/skills/poteto-mode/scripts/watch-pr/deadline.ts#L1-L20
[ref-shipping]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/skills/poteto-mode/scripts/watch-pr/shipping.ts#L14-L109
[ref-doc-facts]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/tests/readme-facts.test.mjs#L11-L51
[ref-platform-ci]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/.github/workflows/ci.yml#L33-L63
[ref-fake-contract]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/plugins/pstack/skills/poteto-mode/scripts/watch-pr/shipping.test-helper.ts#L1-L47
[ref-security-ci]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/.github/workflows/security.yml
[ref-formal]: https://github.com/michael-denyer/pstack-claude/blob/1dba27e50e8f18f146bb80f137f0690f8d773c2e/tla/OrchStoreLock.matrix
