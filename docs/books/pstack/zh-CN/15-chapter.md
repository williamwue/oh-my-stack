# 第 11 章：修复缺陷，改善性能

[目录](README.md) · [上一篇](14-chapter.md) · [下一篇](16-chapter.md) · [English](../en/15-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6fcb42) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/ff12ce)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
本章介绍以下三个 Playbook。

1. [Bug fix](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md)
2. [Perf issue](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/perf-issue.md)
3. [Hillclimb](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/hillclimb.md)

三者都是用于修改代码的 Playbook。修改时，<strong>要以实际运行程序得到的输出、日志和测量结果（运行时证据）为依据</strong>。

选择哪个 Playbook，取决于想修复什么：收到的结果本身有误、行为正确但处理缓慢，还是希望反复提高一项数值直到达到目标。

本章依次说明三者的共同规则及各自的用法。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章结构如下。

- 三个 Playbook 都依据运行时证据进行修复，并根据想修复的问题来选择
- 「Bug fix」先复现缺陷，再以证据证明有必要的最小改动来修复
- 「Perf issue」从修复前的测量开始，通过修复后的测量证明改善
- 「Hillclimb」反复执行「一次改动、一次测量、保留或撤销」，改善一项指标
- 总结

<a id="3%E3%81%A4%E3%81%AEplaybook%E3%81%AF%E5%AE%9F%E8%A1%8C%E6%99%82%E3%81%AE%E8%A8%BC%E6%8B%A0%E3%82%92%E3%82%82%E3%81%A8%E3%81%AB%E7%9B%B4%E3%81%97%E3%80%81%E4%BD%95%E3%82%92%E7%9B%B4%E3%81%97%E3%81%9F%E3%81%84%E3%81%8B%E3%81%A7%E9%81%B8%E3%81%B6"></a>


## 三个 Playbook 都依据运行时证据修复，并按要解决的问题来选择

三个 Playbook 共同遵守<strong>不保留缺少运行时证据支持的改动</strong>这一规则，选择方式如下。

- <strong>用户收到的结果本身有误</strong>……「<strong>Bug fix</strong>」
- <strong>行为正确但处理缓慢，希望通过一次修复改善性能</strong>……「<strong>Perf issue</strong>」
- <strong>希望反复提高一项数值直到达到目标</strong>……「<strong>Hillclimb</strong>」

<table class="code-line" data-line="30">
<thead class="code-line" data-line="30">
<tr class="code-line" data-line="30">
<th>项目</th>
<th>「<strong>Bug fix</strong>」</th>
<th>「<strong>Perf issue</strong>」</th>
<th>「<strong>Hillclimb</strong>」</th>
</tr>
</thead>
<tbody class="code-line" data-line="32">
<tr class="code-line" data-line="32">
<td>起点</td>
<td>自己复现缺陷</td>
<td>取得基线（修复前的标准）轨迹</td>
<td>了解影响结果的条件和目标机制，确定指标与停止条件</td>
</tr>
<tr class="code-line" data-line="33">
<td>次数</td>
<td>一次修复</td>
<td>一次修复</td>
<td>循环直到满足停止条件</td>
</tr>
<tr class="code-line" data-line="34">
<td>回答重点</td>
<td>复现结果从失败变为成功的输出</td>
<td>基线、修复后数值与差异</td>
<td>指标的初始值和最终值，以及保留与撤销的改动数量</td>
</tr>
</tbody>
</table>

若只需查明原因、不需要修复，应选择[第 10 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ea525d)的「[<strong>Runtime forensics</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/runtime-forensics.md)」或「[<strong>Trace forensics</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/trace-forensics.md)」。

三者都把实现工作交给子 Agent，<strong>主 Agent 负责规划修复和审阅差异</strong>。

<a id="%E3%80%8Ebug-fix%E3%80%8F%E3%81%AF%E3%80%81%E4%B8%8D%E5%85%B7%E5%90%88%E3%82%92%E5%86%8D%E7%8F%BE%E3%81%97%E3%81%A6%E3%81%8B%E3%82%89%E3%80%81%E8%A8%BC%E6%8B%A0%E3%81%A7%E5%BF%85%E8%A6%81%E3%81%A8%E7%A2%BA%E3%81%8B%E3%82%81%E3%81%9F%E6%9C%80%E5%B0%8F%E9%99%90%E3%81%AE%E5%A4%89%E6%9B%B4%E3%81%A7%E7%9B%B4%E3%81%99"></a>


## 「Bug fix」先复现缺陷，再以证据证明有必要的最小改动来修复

<a id="%E5%BD%B9%E5%89%B2%EF%BC%9A%E4%B8%8D%E5%85%B7%E5%90%88%E3%82%92%E5%86%8D%E7%8F%BE%E3%81%97%E3%81%A6%E6%A0%B9%E6%9C%AC%E5%8E%9F%E5%9B%A0%E3%82%92%E7%AA%81%E3%81%8D%E6%AD%A2%E3%82%81%E3%82%8B"></a>


### 作用：复现缺陷并找出根本原因

「<strong>Bug fix</strong>」用于复现报告的缺陷并找出根本原因，<strong>只做经运行时证据证明有必要的最小改动</strong>。

「也许有效」的防备性措施<strong>仍是未经验证的假设，并非修复</strong>，因此不应加入改动。若运行时证据否定了假设，就撤销基于该假设所做的改动。

在[演讲](https://x.com/poteto/status/2102050467505430555)中提到，如果留下临时绕过问题的措施，后续 Agent 会把它当作正确实现来照搬（见[第 4 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141)）。本书认为，撤销基于被否定假设的改动这一规则，<strong>能够防止这类绕过措施留在代码中，供后续 Agent 模仿</strong>。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A%E5%86%8D%E7%8F%BE%E3%80%81%E4%BA%8C%E5%88%86%E6%8E%A2%E7%B4%A2%E3%80%81%E8%A8%88%E7%94%BB%E3%80%81%E6%A4%9C%E8%A8%BC%E3%80%81%E3%82%B3%E3%83%9F%E3%83%83%E3%83%88%E3%80%81pr%E3%81%AE6%E3%81%A4%E3%81%AE%E6%89%8B%E9%A0%86"></a>


### 步骤：复现、二分查找、计划、验证、提交和 PR，共六步

1. <strong>自己复现</strong>
   - 使用适合症状出现位置的 control 系 Skill（[`cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit) 中的 `control-ui` 或 `control-cli`）
   - 只有当该 Skill 因具体原因无法操作，且自己已推进到能够操作的范围边界后，才能请求用户复现
   - 若无法立即复现，就人为制造触发条件、缩小到更容易出现缺陷的条件，或加入测量代码，持续尝试直到缺陷出现
2. <strong>用二分查找定位原因</strong>
   - 列出原因假设，优先尝试能最大幅度减少剩余候选的验证方法，直到缩小到一个原因
   - 让 `/how` 解释受影响子系统的机制，让 `/why` 从历史查明原本正常的功能如何损坏，以收集假设候选（两者见[第 22 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746)）
   - 若不清楚程序状态，就增加测量或日志，不要猜测
   - 进入下一步前，先用运行时证据验证最后一个假设所指出的机制
3. <strong>规划修复</strong>
   - 若修复跨越函数边界，先使用 `/architect`（在编码前设计类型与模块结构的 Skill，见[第 24 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346)）
   - 明确限定范围后，将实现委派给子 Agent
4. <strong>在症状出现的同一界面或命令中验证</strong>
   - 确认原来的复现步骤这次能够成功
   - 如果改在其他界面或命令中检查，或检查后仍无法得出结论，都不能算通过
   - 单元测试只能说明单个处理的行为，不能证明缺陷已消失。因此，单元测试通过本身不足以判定修复完成
5. <strong>先于修复提交能够复现缺陷的测试</strong>
   - 先提交修复前会失败的测试，再叠加修复
   - 若能编写便于本地运行的测试，就遵循 `/tdd`（见[第 30 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ad5727)），先写失败测试再继续
   - 若编写测试费时、测试严重依赖多服务集成环境，或测试目标不明确，则可以省略这一步
6. <strong>执行规定创建 PR 步骤的「[Opening a PR](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md)」（见[第 14 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e)）</strong>

回答应包含以下项目。

- 哪里出了问题
- 根本原因
- 修复
- 验证方法

同时，<strong>不要概述，而要原样粘贴</strong>复现输出从失败变为成功的记录。

本书对步骤与 Principle 的对应关系作如下解读：Principle「[<strong>Fix Root Causes</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-fix-root-causes/SKILL.md)」对应步骤 1 至 3；「[<strong>Prove It Works</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md)」对应步骤 4 与回答；「[<strong>Sequence Work into Verifiable Units</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-sequence-verifiable-units/SKILL.md)」对应步骤 5（见[第 19 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/1fb019)）。其中，Playbook 原文只在步骤 5 明确提及「Sequence Work into Verifiable Units」的名称。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E3%80%8C%E3%81%BE%E3%81%9A%E5%86%8D%E7%8F%BE%E3%81%97%E3%81%A6%E3%80%8D%E3%81%A8%E6%9B%B8%E3%81%8F"></a>


### 请求写法：写明「先复现」

在请求中写明「先复现」；若要求测试，应加上「如果能轻松写出测试」这一条件。随附指南（[docs/guide/10-recipes-and-pitfalls.md](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/10-recipes-and-pitfalls.md)）中的示例如下。

```
/poteto-mode repro the duplicate write first. if there's a cheap test path, /tdd it. then fix and rerun.
// まず重複書き込みを再現して。手軽に書けるテストがあれば /tdd で進めて。それから直して、もう一度流して。
```

与其勉强使用脆弱的 mock（替代真实组件的假组件）来编写测试，<strong>运行真实命令更能准确证明问题已修复</strong>。步骤 5 允许省略编写费时的测试，原因就在这里。

<a id="%E3%80%8Eperf-issue%E3%80%8F%E3%81%AF%E3%80%81%E4%BF%AE%E6%AD%A3%E5%89%8D%E3%81%AE%E6%B8%AC%E5%AE%9A%E3%81%8B%E3%82%89%E5%A7%8B%E3%82%81%E3%80%81%E4%BF%AE%E6%AD%A3%E5%BE%8C%E3%81%AE%E6%B8%AC%E5%AE%9A%E3%81%A7%E6%94%B9%E5%96%84%E3%82%92%E7%A4%BA%E3%81%99"></a>


## 「Perf issue」从修复前测量开始，用修复后测量证明改善

<a id="%E5%BD%B9%E5%89%B2%EF%BC%9A%E9%81%85%E3%81%95%E3%82%92%E6%B8%AC%E3%81%A3%E3%81%A6%E7%9B%B4%E3%81%99"></a>


### 作用：测量并修复缓慢问题

「<strong>Perf issue</strong>」通过采集实际测得的慢速执行轨迹（记录各处理的执行时间等），并与基线比较，来改善性能。它禁止用阅读源代码替代测量，<strong>每项修复都必须关联测量结果</strong>。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A%E3%83%99%E3%83%BC%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%B3%E3%81%AE%E3%83%88%E3%83%AC%E3%83%BC%E3%82%B9%E3%81%AB%E5%A7%8B%E3%81%BE%E3%82%8B6%E3%81%A4%E3%81%AE%E6%89%8B%E9%A0%86"></a>


### 步骤：从基线轨迹开始的六步

1. <strong>取得基线轨迹</strong>……使用符合症状的 control 系 Skill
2. <strong>用 `/how` 了解代码机制，作为假设依据</strong>……在实际运行和测量前，不要断言「已经不可能更快」。从八类常见改善策略（策略类别；见下表）中提出假设
3. <strong>根据轨迹规划修复</strong>……将实现委派给子 Agent，审阅差异，再取得修复后的轨迹
4. <strong>分析并比较修复前后的轨迹</strong>……可将轨迹导入 sqlite 等，以计算差异。若使用不同界面或命令测量，或测量后仍无法得出结论，都不能算通过
5. <strong>在 PR 中引用测量结果</strong>
6. <strong>执行「Opening a PR」</strong>

回答应包含以下四项。

- 基线数值
- 修复后的数值
- 差异
- 成果物路径

这些项目都必须实际测量后才能填写，因此<strong>回答格式本身防止了跳过测量</strong>。

八类策略不是检查清单，而是产生假设的工具。<strong>只有轨迹中出现某种策略可能有效的迹象（表格右列）时，才能尝试该策略</strong>。Elimination（删除）是例外：轨迹能显示哪里慢，却不能证明能否删除，所以需要用 `/how` 确认。

<table class="code-line" data-line="122">
<thead class="code-line" data-line="122">
<tr class="code-line" data-line="122">
<th>策略类别</th>
<th>轨迹中可见的迹象</th>
</tr>
</thead>
<tbody class="code-line" data-line="124">
<tr class="code-line" data-line="124">
<td>Elimination（删除）</td>
<td>轨迹中看不到；能否删除要用 <code>/how</code> 确认</td>
</tr>
<tr class="code-line" data-line="125">
<td>Divide and conquer（分而治之）</td>
<td>主要成本随输入规模成比例增长</td>
</tr>
<tr class="code-line" data-line="126">
<td>Caching（缓存）</td>
<td>对相同输入反复进行相同计算或获取</td>
</tr>
<tr class="code-line" data-line="127">
<td>Indirection（间接化）</td>
<td>热路径（占用大部分执行时间的路径）中执行全量扫描等重操作，可由索引或队列等中间机制承担</td>
</tr>
<tr class="code-line" data-line="128">
<td>Batching（批处理）</td>
<td>每次小操作都要付出通信或查询等固定成本</td>
</tr>
<tr class="code-line" data-line="129">
<td>Redundancy（冗余）</td>
<td>总体等待时间受一台缓慢服务器或一次尝试拖累</td>
</tr>
<tr class="code-line" data-line="130">
<td>Lazy evaluation（延迟求值）</td>
<td>尚不需要的结果已产生成本</td>
</tr>
<tr class="code-line" data-line="131">
<td>Scheduling（调度）</td>
<td>工作本身必要，但无须在用户等待的时刻执行</td>
</tr>
</tbody>
</table>

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E3%80%8C%E9%81%85%E3%81%84%E6%B0%97%E3%81%8C%E3%81%99%E3%82%8B%E3%80%8D%E3%81%A7%E3%81%AF%E3%81%AA%E3%81%8F%E6%B8%AC%E3%81%A3%E3%81%9F%E6%95%B0%E5%80%A4%E3%82%92%E6%9B%B8%E3%81%8F"></a>


### 请求写法：写出实测数值，而非「感觉很慢」

请求中应写入测得的数值，而不是「感觉很慢」。随附指南（[docs/guide/05-build-and-clean.md](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/05-build-and-clean.md)）中的示例如下。

```
/poteto-mode startup takes 1.8s on this fixture. trace it, fix the measured cause, show me before and after.
// このフィクスチャ（計測に使う決まった入力）で起動に1.8秒かかる。トレースして、測った原因を直して、前後を見せて。
```

若还要确认改善确实可靠，可在请求中要求通过 `/swarm` 并行运行验证 Skill（像用户一样操作应用并检查结果的 Skill，见[第 3 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5)）。「The Complete Guide to pstack」[Part 1](https://x.com/poteto/status/2094457600259842065) 的示例如下。

```
spawn a cloud agent to use /poteto-mode to improve the initial loading time of our app. first use /control-app to take a trace of the status quo, and identify opportunities for improvement. then do a targeted fix and use /control-app + a /swarm to confirm the win
// クラウドエージェントを起動して、/poteto-mode でアプリの初回読み込み時間を改善させて。まず /control-app で現状のトレースを取り、改善の余地を見つけて。それから狙いを絞って直し、/control-app と /swarm で改善を確かめて。
```

`/control-app` 是文章中创建的验证 Skill 的名称（见[第 36 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)）。`/swarm`（见[第 24 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346)）是并行运行 Workers（多个 Agent）并汇总为一份报告的 Skill。让多个 Agent 运行验证 Skill，便能用足够的样本量确认改善，避免把单次测量的波动误判为改善。

<a id="%E3%80%8Ehillclimb%E3%80%8F%E3%81%AF%E3%80%81%E4%B8%80%E3%81%A4%E3%81%AE%E6%8C%87%E6%A8%99%E3%82%92%E3%80%8C1%E3%81%A4%E3%81%AE%E5%A4%89%E6%9B%B4%E3%80%811%E5%9B%9E%E3%81%AE%E6%B8%AC%E5%AE%9A%E3%80%81%E6%8E%A1%E7%94%A8%E3%81%8B%E5%8F%96%E3%82%8A%E6%B6%88%E3%81%97%E3%80%8D%E3%81%AE%E7%B9%B0%E3%82%8A%E8%BF%94%E3%81%97%E3%81%A7%E6%94%B9%E5%96%84%E3%81%99%E3%82%8B"></a>


## 「Hillclimb」反复执行「一次改动、一次测量、保留或撤销」，改善一项指标

<a id="%E5%BD%B9%E5%89%B2%EF%BC%9A%E4%B8%80%E3%81%A4%E3%81%AE%E6%8C%87%E6%A8%99%E3%82%92%E7%9B%AE%E6%A8%99%E3%81%BE%E3%81%A7%E3%83%AB%E3%83%BC%E3%83%97%E3%81%A7%E6%94%B9%E5%96%84%E3%81%99%E3%82%8B"></a>


### 作用：循环改善一项指标直到达到目标

「<strong>Hillclimb</strong>」用于朝目标<strong>通过循环持续改善</strong>一项指标。一次性的修复则由「<strong>Bug fix</strong>」或「<strong>Perf issue</strong>」负责。

核心纪律是「one change, one measurement, keep or revert」，即<strong>一次改动、一次测量、保留或撤销</strong>。不应堆叠未经测试的改动，也不能仅凭阅读代码就声称指标改善（参见 Principle「[<strong>Prove It Works</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md)」）。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A1%E5%9B%9E%E3%81%AB1%E3%81%A4%E3%81%AE%E4%BB%AE%E8%AA%AC%E3%81%A7%E3%83%AB%E3%83%BC%E3%83%97%E3%81%99%E3%82%8B8%E3%81%A4%E3%81%AE%E6%89%8B%E9%A0%86"></a>


### 步骤：每次只针对一个假设循环，共八步

1. <strong>选择指标前，先了解影响结果的条件和目标机制</strong>
   - 对目标使用 `/how`，列出影响指标数值的现实条件（数据量、历史、状态、并发度）
   - 选择能复现用户不满的案例
   - 确定一项指标和停止条件
   - 停止条件须同时规定目标和最少尝试次数，例如「比基线改善 50% 以上，并且至少尝试 10 次」。设定次数下限，是为了避免早期碰巧取得一次好结果就结束
2. <strong>建立测量装置，确认它能区分案例后固定下来</strong>
   - 确认目标案例能复现症状，并能通过测量值与没有症状的简单案例区分
   - 确认后固定测量方法；即在后续循环中不再改变测量案例、指标和测量命令
   - 固定后，用一条确定的命令输出指标，取多次测量的中位数，而非只测一次
   - 加入改动前，记录基线指标及所有回归关卡（必须持续通过的测试）的通过结果（参见 Principle「[<strong>Build the Lever</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-build-the-lever/SKILL.md)」，[第 17 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b)）
3. <strong>建立决策记录</strong>
   - 用记录决策的 `/show-me-your-work`（见[第 28 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/724887)）创建 `decision.tsv`
   - 每次尝试都在 `decision.tsv` 中写一行，记录假设、改动、前后数值，以及保留或撤销的决定
   - 下一次尝试前重读记录
4. <strong>依据步骤 1 中了解的机制提出假设</strong>
   - 提出关于具体机制的假设，例如「X 拖慢首次绘制，因此把它移出启动流程」
   - 不接受「试着对某些东西做记忆化」这类模糊假设
5. <strong>每次只针对一个假设循环</strong>
   - 将改动交给子 Agent（参见 Principle「[<strong>Guard the Context Window</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-guard-the-context-window/SKILL.md)」）
   - 若有多个独立假设，将它们交给各自 worktree 中并行工作的子 Agent（参见 Principle「[<strong>Separate Before Serializing Shared State</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md)」）
   - 用步骤 2 固定的测量装置，分别测量改动前后
   - 只有指标改善明显到无法归因于偶然波动，且所有回归关卡通过时，才保留改动
   - 否则完整撤销改动
   - 无论保留还是撤销，都必须写入 `decision.tsv` 的一行记录
   - 若要无人值守地运行，只从负责持续推进长期任务直到完成的「[<strong>Autonomous run</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autonomous-run.md)」（见[第 15 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609)）借用按时间或事件重新唤醒 Agent 的机制。停止条件仍按步骤 1 所定执行
6. <strong>改善停滞时也不要立即结束</strong>
   - 若连续撤销改动，先尝试切换假设类型（处理方式的种类）、组合接近成功的方案，或尝试更大胆的方案，再下结论
   - 即使指标改善，若改动破坏行为，也要撤销
   - 若在维持指标的同时简化代码，则保留改动（参见 Principle「[<strong>Laziness Protocol</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-laziness-protocol/SKILL.md)」）
7. <strong>满足停止条件，或剩余方案的预期效果不再值得投入时停止</strong>
   - 不得放宽停止条件来宣称达标
   - 只要还有低成本可尝试的假设，就不要停止
   - 遇到瓶颈时应报告，而不是空转
8. <strong>执行「Opening a PR」</strong>
   - 按加入顺序叠放已保留改动的提交

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="198"><strong>「改善明显到无法归因于偶然波动」的含义</strong></p>
<p class="code-line" data-line="200">例如，测量处理时间时，即使不改代码，结果也可能在 100 毫秒上下波动几毫秒。改动后若降至约 80 毫秒，就可判断改善超出了波动范围。若只变化几毫秒，则可能只是测量波动，尚不能断言有所改善。</p>
<p class="code-line" data-line="202">步骤 2 取多次测量的中位数而非只测一次，也是为了减小这种波动的影响。</p>
</div></aside>



<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="206">
<li class="code-line" data-line="206">
<strong>测量装置</strong>……确保每次在相同条件下运行测量或测试的机制</li>
<li class="code-line" data-line="207">
<strong>记忆化</strong>……按输入保存函数的计算结果，并在再次收到相同输入时返回保存结果的方法</li>
<li class="code-line" data-line="208">
<strong>worktree</strong>……Git 的一项功能，可从一个仓库创建多个工作目录，同时处理不同分支</li>
</ul>
</div></aside>

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E6%8C%87%E6%A8%99%E3%80%81%E7%9B%AE%E6%A8%99%E3%80%81%E8%A9%A6%E8%A1%8C%E5%9B%9E%E6%95%B0%E3%81%AE%E4%B8%8B%E9%99%90%E3%81%AE3%E7%82%B9%E3%82%92%E6%B8%A1%E3%81%99"></a>


### 请求写法：提供指标、目标和最低尝试次数三项信息

根据随附指南（[docs/guide/05-build-and-clean.md](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/05-build-and-clean.md)），<strong>只要提供指标、目标和最低尝试次数</strong>，「<strong>Hillclimb</strong>」就会使用固定测量方法的装置，反复进行每次只检验一个假设的流程。

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 总结

- <strong>共同纪律与选择方式</strong>……三个 Playbook 都要求每项保留的改动有运行时证据支持。行为有误时用「<strong>Bug fix</strong>」；希望一次修复处理慢速问题时用「<strong>Perf issue</strong>」；希望反复改善一项指标直到达标时用「<strong>Hillclimb</strong>」。
- <strong>Bug fix</strong>……先自行复现，通过二分查找将原因假设缩小到一个再修复。在回答中原样粘贴从失败变为成功的输出。
- <strong>Perf issue</strong>……从基线轨迹开始，只有当轨迹显示某一改善策略可能有效时才尝试该策略，并用修复前后的数值证明改善。
- <strong>Hillclimb</strong>……建立固定测量方法的装置，在目标与最低尝试次数共同构成的停止条件下，反复执行「一次改动、一次测量、保留或撤销」。

下一章[第 12 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f1e85b)将从「哪些方面不得改变」的角度，介绍用于「添加」「保持」「试验」行为和「统一」外观的四个 Playbook：「[<strong>Feature</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/feature.md)」、「[<strong>Refactoring</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/refactoring.md)」、「[<strong>Prototype</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/prototype.md)」和「[<strong>Visual parity</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/visual-parity.md)」。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](14-chapter.md) · [下一篇](16-chapter.md) · [English](../en/15-chapter.md)
