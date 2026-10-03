# 第 16 章：规划大量 PR，组织多个 Agent 执行

[目录](README.md) · [上一篇](19-chapter.md) · [下一篇](21-chapter.md) · [English](../en/20-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3b2bef)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
本章介绍以下四个 Playbook。

1. [Multi-phase or multi-PR plan](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md)
2. [Orchestrate](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/orchestrate.md)
3. [Autopilot-full](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-full.md)
4. [Autopilot-stack](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-stack.md)

四者用于规划并由多个 Agent 执行跨越许多 PR 的工作。「<strong>Multi-phase or multi-PR plan</strong>」编写计划，「<strong>Orchestrate</strong>」管理持续数日的工作，而「<strong>Autopilot-full</strong>」和「<strong>Autopilot-stack</strong>」在验证的同时推进 PR 队列。

上一章[第 15 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609)介绍了持续推进、暂停和恢复一项长期工作的 Playbook。

本章先整理四者的分工，再说明各自的适用场景、步骤与要点，最后比较如何选择长期运行的工作方式。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章结构如下。

- 四个 Playbook 用于规划和执行多个 PR，居中的 Agent 不编写代码
- 「Multi-phase or multi-PR plan」不编写代码，产出清单式计划，连每个 PR 的验证方式也事先确定
- 「Orchestrate」由一位不编写代码的协调 Agent 管理持续数日、涉及许多 PR 的工作
- 「Autopilot-full」由各 PR 的负责人推进到合并，协调 Agent 只负责验证判定
- 「Autopilot-stack」按与 Autopilot-full 相同的步骤创建并验证 PR，不合并，而是作为一个 PR 栈交给操作员
- 长期运行工作的五种选择，取决于工作单元是什么、由谁合并
- 总结

<a id="4%E3%81%A4%E3%81%AEplaybook%E3%81%AF%E5%A4%9A%E6%95%B0%E3%81%AEpr%E3%82%92%E8%A8%88%E7%94%BB%E3%81%97%E3%81%A6%E9%81%8B%E7%94%A8%E3%81%97%E3%80%81%E4%B8%AD%E5%BF%83%E3%81%AE%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AF%E3%82%B3%E3%83%BC%E3%83%89%E3%82%92%E6%9B%B8%E3%81%8B%E3%81%AA%E3%81%84"></a>


## 四个 Playbook 用于规划和执行多个 PR，居中的 Agent 不编写代码

本章四个 Playbook 按下表分担职责。

<table class="code-line" data-line="29">
<thead class="code-line" data-line="29">
<tr class="code-line" data-line="29">
<th>Playbook</th>
<th>负责的内容</th>
</tr>
</thead>
<tbody class="code-line" data-line="31">
<tr class="code-line" data-line="31">
<td>「<strong>Multi-phase or multi-PR plan</strong>」</td>
<td>计划，而非代码</td>
</tr>
<tr class="code-line" data-line="32">
<td>「<strong>Orchestrate</strong>」</td>
<td>项目（持续数日的整体工作），不持有代码</td>
</tr>
<tr class="code-line" data-line="33">
<td>「<strong>Autopilot-full</strong>」</td>
<td>验证判定，不持有 PR</td>
</tr>
<tr class="code-line" data-line="34">
<td>「<strong>Autopilot-stack</strong>」</td>
<td>PR 栈，不负责合并</td>
</tr>
</tbody>
</table>

四个 Playbook 都明确写明自己「不持有的内容」（代码、PR 或合并）。

<strong>协调 Agent 自己不编写代码</strong>，专注于计划、给 Workers（并行工作的多个 Agent）的任务说明和判定。不过在「Orchestrate」中，若本地 Git 操作能迅速完成，协调 Agent 也可以将已验证的改动并入分支并 push。

协调 Agent 是与<strong>操作员</strong>（<strong>提出工作请求并作最终决定的人</strong>）交互的常驻对话。在「<strong>Orchestrate</strong>」中称为「协调者」，在「<strong>Autopilot-full</strong>」和「<strong>Autopilot-stack</strong>」中称为「根 Agent」。名称不同，本章统称「协调 Agent」。

<a id="%E7%AB%A0%E5%85%A8%E4%BD%93%E3%81%AB%E5%87%BA%E3%81%A6%E3%81%8F%E3%82%8B%E9%81%93%E5%85%B7"></a>


### 本章反复出现的工具

这些 Playbook 中会反复出现以下工具。

- <strong>`/goal`</strong>……为 Agent 设定目标的命令。设定的目标跨对话轮次持续有效，直到队列工作完成。
- <strong>`decisions.tsv`</strong>……由 `/show-me-your-work`（见[第 28 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/724887)）写入的决策记录，每行记载一项决策。
- <strong>state-then-wait</strong>……若只被要求说明方法或计划，就说明后停止；操作员明确说「开始」之前，不启动工作。

<a id="%E3%80%8Emulti-phase-or-multi-pr-plan%E3%80%8F%E3%81%AF%E3%80%81%E3%82%B3%E3%83%BC%E3%83%89%E3%82%92%E6%9B%B8%E3%81%8B%E3%81%9A%E3%81%AB%E3%80%81pr%E3%81%94%E3%81%A8%E3%81%AE%E6%A4%9C%E8%A8%BC%E6%96%B9%E6%B3%95%E3%81%BE%E3%81%A7%E6%B1%BA%E3%82%81%E3%81%9F%E3%83%81%E3%82%A7%E3%83%83%E3%82%AF%E3%83%AA%E3%82%B9%E3%83%88%E5%BD%A2%E5%BC%8F%E3%81%AE%E8%A8%88%E7%94%BB%E6%9B%B8%E3%82%92%E4%BD%9C%E3%82%8B"></a>


## 「Multi-phase or multi-PR plan」不编写代码，产出包含每个 PR 验证方法的清单式计划

「<strong>Multi-phase or multi-PR plan</strong>」用于规划跨多个阶段或堆叠 PR 的工作。

计划采用清单形式。负责人逐项执行，用证明完成的证据勾选。操作员查看证据，核实每项是否真正完成。<strong>缺少证据的项目不能勾选</strong>。

poteto 在[「The Complete Guide to pstack」Part 2](https://x.com/poteto/status/2097732320606507506) 中介绍：这个 Playbook 用于在满意的设计完成之后制定执行计划。关于制定计划的实际讲解见[第 39 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/166acb)。

<a id="7%E3%81%A4%E3%81%AE%E6%89%8B%E9%A0%86"></a>


### 七个步骤

步骤如下。

1. 判断是否需要计划
2. 未解决的问题先用原型决定，再开始写计划
3. 将调查交给子 Agent
4. 复制计划模板并填完所有项目
5. 按技术文档标准编写计划，去除 AI 腔
6. 检查计划的形式
7. 交付计划

下面逐项说明这些步骤。

<a id="1.-%E8%A8%88%E7%94%BB%E3%81%8C%E5%BF%85%E8%A6%81%E3%81%8B%E3%82%92%E5%88%A4%E6%96%AD%E3%81%99%E3%82%8B"></a>


#### 1. 判断是否需要计划

若改动仅涉及一到两个文件且方法明确，就不编写计划，说明无需计划并停止。

<a id="2.-%E6%9C%AA%E8%A7%A3%E6%B1%BA%E3%81%AE%E5%95%8F%E3%81%84%E3%81%AF%E3%80%81%E6%9B%B8%E3%81%8F%E5%89%8D%E3%81%AB%E3%83%97%E3%83%AD%E3%83%88%E3%82%BF%E3%82%A4%E3%83%97%E3%81%A7%E6%B1%BA%E3%82%81%E3%82%8B"></a>


#### 2. 未解决的问题先用原型决定，再开始写计划

通过「[<strong>Prototype</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/prototype.md)」（见[第 12 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f1e85b)）作决定，并把证据留在计划附录。只在实验无法解决时才询问操作员（参见 Principle「[<strong>Never Block on the Human</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-never-block-on-the-human/SKILL.md)」，[第 20 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/c155cc)）。

<a id="3.-%E8%AA%BF%E6%9F%BB%E3%81%AF%E3%82%B5%E3%83%96%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AB%E4%BB%BB%E3%81%9B%E3%82%8B"></a>


#### 3. 将调查交给子 Agent

调查由子 Agent 完成，让其返回相关文件位置、代码约定、运行测试的命令，以及入口代码（例如 `main` 函数或最先接收 API 请求的函数）。

不要让子 Agent 把读取的文件全文贴在回答中。  
这样可避免调查材料填满主 Agent 的上下文（参见 Principle「[<strong>Guard the Context Window</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-guard-the-context-window/SKILL.md)」，[第 20 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/c155cc)）。

<a id="4.-%E8%A8%88%E7%94%BB%E6%9B%B8%E3%81%AE%E3%81%B2%E3%81%AA%E5%BD%A2%E3%82%92%E5%86%99%E3%81%97%E3%80%81%E3%81%99%E3%81%B9%E3%81%A6%E3%81%AE%E9%A0%85%E7%9B%AE%E3%82%92%E5%9F%8B%E3%82%81%E3%82%8B"></a>


#### 4. 复制计划模板并填完所有项目

对计划中每个 PR，写明该 PR 的改动、涉及文件与验证方式。一个 PR 只包含一个可验证单元的改动。

<a id="5.-%E8%A8%88%E7%94%BB%E6%9B%B8%E3%81%AF%E6%8A%80%E8%A1%93%E6%96%87%E6%9B%B8%E3%81%AE%E5%9F%BA%E6%BA%96%E3%81%A7%E6%9B%B8%E3%81%8D%E3%80%81ai%E3%82%89%E3%81%97%E3%81%84%E8%A8%80%E3%81%84%E5%9B%9E%E3%81%97%E3%82%92%E5%89%8A%E3%82%8B"></a>


#### 5. 按技术文档标准编写计划，去除 AI 腔

使用规定技术文档标准的 `/technical-writing` 编写，再运行 `/unslop` 去除 AI 常见套话。

<a id="6.-%E8%A8%88%E7%94%BB%E6%9B%B8%E3%81%AE%E5%BD%A2%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B"></a>


#### 6. 检查计划的形式

运行 `check-plan.mjs`，修复输出的所有错误，包括缺少标题或验证项，以及违反写作规则。

<a id="7.-%E8%A8%88%E7%94%BB%E3%82%92%E5%BC%95%E3%81%8D%E6%B8%A1%E3%81%99"></a>


#### 7. 交付计划

在回答中给出计划路径与脚本输出，然后停止。执行须等操作员明确下令开始，再依照计划指定的执行 Playbook（「<strong>Autopilot-full</strong>」、「<strong>Autopilot-stack</strong>」或「<strong>Orchestrate</strong>」之一）启动。

<a id="%E8%BF%94%E7%AD%94%E3%81%AB%E6%9B%B8%E3%81%8F%E9%A0%85%E7%9B%AE"></a>


#### 回答应包含的项目

回答应包含以下项目。

- 计划路径
- PR 依赖关系
- 需要审阅的 PR
- 原型证明了什么
- `check-plan.mjs` 的输出

<a id="%E8%A8%88%E7%94%BB%E6%9B%B8%E3%81%AE%E3%81%B2%E3%81%AA%E5%BD%A2%E3%81%A8-check-plan.mjs"></a>


### 计划模板与 check-plan.mjs

计划结构如下。

- 开头概要
- 阅读方法
- 项目总清单
- 各 PR 章节
- 结束章节
- 附录（原型证据、未采纳方案、风险、资料）

每个 PR 章节包含以下<strong>九个小标题</strong>。

- 依赖关系
- 涉及文件
- 改动
- 可观察的结果
- unit 验证（单元测试）
- live 验证（应用实际行为）
- perf 验证（性能）
- Review gate（合并前是否需要操作员确认，以及如何确认）
- 合并

[`check-plan.mjs`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/scripts/check-plan.mjs) 检查计划的标题、必填项和写法是否违反规则。有问题时，它会显示行号和原因。这个 Playbook 不只用文字描述计划规则，还用脚本检查（参见 Principle「[<strong>Encode Lessons in Structure</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-encode-lessons-in-structure/SKILL.md)」，[第 21 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dd2d9f)）。

<a id="%E8%A6%81%E7%82%B9%E3%81%AF%E3%80%8C%E3%83%86%E3%82%B9%E3%83%88%E3%81%A0%E3%81%91%E3%81%A7%E3%81%AF%E6%A4%9C%E8%A8%BC%E3%81%AB%E3%81%AA%E3%82%89%E3%81%AA%E3%81%84%E3%80%8D%E3%81%A8%E3%81%84%E3%81%86%E6%A4%9C%E8%A8%BC%E8%A6%8F%E5%89%87"></a>


### 要点是「只有测试不等于验证」这一规则

这个 Playbook 在 unit、live 和 perf 各项验证的开头，都放了下面这句共同的通过条件。

> Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.
>
> 只有测试还不足以构成充分验证。只有 unit、live 和 perf 的方框全部勾选，PR 才算通过验证。

计划中为每个 PR 设置 unit、live、perf 验证栏，并写明各自的具体检查方法。影响界面或操作的 PR，还要设置合并前由操作员确认的「Review gate」。

各栏内容如下。

- <strong>Verify, unit</strong>……写明测试文件、新增用例及运行命令。
- <strong>Verify, live</strong>……必填项。十条 lane（并行验证职责）在 PR 的最新提交上实际操作界面或 CLI。Lane 1 是回归检查 lane：在 trunk（合并目标所在的主线分支）和 PR 上执行同一场景，检查是否因改动产生缺陷。
- <strong>Verify, perf</strong>……在 trunk 和 PR 上测量同一指标，并确定判为失败的数值。
- <strong>Review gate</strong>……影响界面或操作的 PR，合并前由操作员查看截图与视频进行审阅。

操作画面时，浏览器或 Electron（构建桌面应用的框架）使用 `control-ui`；CLI 和 TUI 使用 `control-cli`（两者均来自 [`cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit)）。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="158">
<li class="code-line" data-line="158">
<strong>TUI</strong>……在终端中绘制界面并通过按键操作的用户界面，例如 vim 或 htop</li>
</ul>
</div></aside>

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E5%AE%88%E3%82%8B%E5%88%B6%E7%B4%84%E3%81%A8%E3%80%81%E5%85%88%E3%81%AB%E8%A6%8B%E3%81%9F%E3%81%84%E3%82%82%E3%81%AE%E3%82%92%E6%9B%B8%E3%81%8F"></a>


### 请求写法：写明必须遵守的约束，以及希望先看到什么

[README](https://github.com/cursor/plugins/blob/main/pstack/README.md) 中的请求示例写明了不能泄露内部资料、要在临时目录工作，以及希望先查看依赖关系图。

```
/poteto-mode open source these skills as a plugin. nothing internal leaks, work in a temp dir, show me the dependency graph first.
// これらのSkillをプラグインとして公開して。社内のものは何も漏らさず、一時ディレクトリで作業して、先に依存関係のグラフを見せて。
```

<a id="%E3%80%8Eorchestrate%E3%80%8F%E3%81%AF%E3%80%81%E4%BD%95%E6%97%A5%E3%82%82%E7%B6%9A%E3%81%8F%E5%A4%9A%E6%95%B0%E3%81%AEpr%E3%81%AE%E4%BD%9C%E6%A5%AD%E3%82%92%E3%80%81%E3%82%B3%E3%83%BC%E3%83%89%E3%82%92%E6%9B%B8%E3%81%8B%E3%81%AA%E3%81%841%E4%BD%93%E3%81%AE%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%8D%E3%83%BC%E3%82%BF%E3%83%BC%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%8C%E7%AE%A1%E7%90%86%E3%81%99%E3%82%8B"></a>


## 「Orchestrate」由一位不编写代码的协调 Agent 管理持续数日、涉及许多 PR 的工作

「<strong>Orchestrate</strong>」将持续数日、涉及大量 PR 和数十至数百位子 Agent 的项目交给一位协调 Agent。预期操作员每天只检查两次。<strong>协调 Agent 不持有代码</strong>，而是给 Workers（多个子 Agent）编写任务说明，处理完成通知并作决定。

<a id="7%E3%81%A4%E3%81%AE%E6%89%8B%E9%A0%86-1"></a>


### 七个步骤

步骤如下。

1. 确定完成条件（Frame）
2. 准备存放状态的位置（Install the runtime）
3. 用一个工作单元试运行（Pilot）
4. 增加 Workers（Scale）
5. 批量处理完成通知（Drain）
6. 依次合并已验证的工作单元（Land）
7. 核对记录并关闭（Close）

下面逐项说明这些步骤。

<a id="1.-%E7%B5%82%E4%BA%86%E6%9D%A1%E4%BB%B6%E3%82%92%E6%B1%BA%E3%82%81%E3%82%8B%EF%BC%88frame%EF%BC%89"></a>


#### 1. 确定完成条件（Frame）

完成条件要写成能从记录判断是否完成的形式，例如「126 个工作单元全部合并，且台账中每个都有已验证记录」。若一位 Agent 能在预定工作时限内完成，就改用「[<strong>Autonomous run</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autonomous-run.md)」（见[第 15 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609)）。

<a id="2.-%E7%8A%B6%E6%85%8B%E3%82%92%E7%BD%AE%E3%81%8F%E5%A0%B4%E6%89%80%E3%82%92%E7%94%A8%E6%84%8F%E3%81%99%E3%82%8B%EF%BC%88install-the-runtime%EF%BC%89"></a>


#### 2. 准备存放状态的位置（Install the runtime）

运行 `orch init` 创建存储区（保存工作状态和决策记录的区域）、建立决策记录，并写下常驻指令。

<a id="3.-1%E3%81%A4%E3%81%AE%E5%8D%98%E4%BD%8D%E3%81%A7%E8%A9%A6%E9%81%8B%E8%BB%A2%E3%81%99%E3%82%8B%EF%BC%88pilot%EF%BC%89"></a>


#### 3. 用一个工作单元试运行（Pilot）

先完整推进一项工作：编写任务说明、实现、验证、登记到 PR 栈、记入台账并合并。根据结果调整任务说明与验证方法，再扩展到其余工作。

用一位 Agent 和一项工作进行试运行（Pilot），是为了先解决任务说明、验证步骤和工作单元规模的问题，再扩大范围，<strong>避免同一缺陷扩散到许多 Agent 并造成返工</strong>。

<a id="4.-workers%E3%82%92%E5%A2%97%E3%82%84%E3%81%99%EF%BC%88scale%EF%BC%89"></a>


#### 4. 增加 Workers（Scale）

启动 Workers，直到达到同时运行的上限；每完成一项，再启动新的 Worker 补位。

<a id="5.-%E5%AE%8C%E4%BA%86%E3%81%AE%E7%9F%A5%E3%82%89%E3%81%9B%E3%82%92%E3%81%BE%E3%81%A8%E3%82%81%E3%81%A6%E5%87%A6%E7%90%86%E3%81%99%E3%82%8B%EF%BC%88drain%EF%BC%89"></a>


#### 5. 批量处理完成通知（Drain）

先将 Workers 的完成通知积累在收件箱（`inbox/`），在固定节点集中处理。

<a id="6.-%E6%A4%9C%E8%A8%BC%E6%B8%88%E3%81%BF%E3%81%AE%E5%8D%98%E4%BD%8D%E3%81%8B%E3%82%89%E9%A0%86%E3%81%AB%E3%83%9E%E3%83%BC%E3%82%B8%E3%81%99%E3%82%8B%EF%BC%88land%EF%BC%89"></a>


#### 6. 依次合并已验证的工作单元（Land）

不要最后一次性合并，而是从第一个通过验证的合并开始持续推进。

<a id="7.-%E8%A8%98%E9%8C%B2%E3%82%92%E7%85%A7%E5%90%88%E3%81%97%E3%81%A6%E9%96%89%E3%81%98%E3%82%8B%EF%BC%88close%EF%BC%89"></a>


#### 7. 核对记录并关闭（Close）

核对所有已启动 Agent 是否都已在表中记为完成、放弃等终止状态。检查实物以确认完成条件已满足；将反复纠正的指令或经常需要的指令写入 `preferences.md` 或任务说明模板，供下一位 Agent 使用。

<a id="%E8%BF%94%E7%AD%94%E3%81%AB%E6%9B%B8%E3%81%8F%E9%A0%85%E7%9B%AE-1"></a>


#### 回答应包含的项目

回答中应报告以下内容，涉及 PR 的项目附上对应 PR 链接。

- 从 `units.tsv` 和 `ledger.tsv` 统计的、相对于完成条件的进度
- 已合并的 PR
- 已放弃的工作及原因
- 等待操作员决定的事项

进度数值来自记录每项工作状态的 `units.tsv` 和记录验证结果的 `ledger.tsv`。

<a id="%E5%BD%B9%E5%89%B2%E3%81%AF3%E3%81%A4%E3%81%AE%E3%83%AC%E3%82%A4%E3%83%A4%E3%83%BC"></a>


### 三层职责

- <strong>协调 Agent</strong>（在 Orchestrate 中称为协调者）……主 Agent，负责整体框架、任务说明、收件箱处理与向操作员报告；不编写代码。
- <strong>子协调者</strong>……仅在工作规模超出协调 Agent 处理能力时，每条称为 track 的工作系列（如构建或验证）安排一位子 Agent。
- <strong>Workers（执行者）与验证者</strong>……Workers 执行分配的工作，验证者检查 Worker 的成果。两者原则上都在云端运行；验证者使用与 Worker 不同系列的模型。每个 worktree 或分支只允许一位 Worker 编辑。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="236">
<li class="code-line" data-line="236">
<strong>worktree</strong>……Git 的功能，可从一个仓库建立多个工作目录，同时检出不同分支</li>
</ul>
</div></aside>

<a id="%E3%82%B9%E3%83%88%E3%82%A2%E3%80%81%E6%8C%87%E7%A4%BA%E6%9B%B8%E3%80%81%E5%8F%B0%E5%B8%B3%E3%81%8C%E7%8A%B6%E6%85%8B%E3%82%92%E6%8C%81%E3%81%A4"></a>


### 存储区、任务说明和台账承载状态

协调 Agent 在 Agent 存储区（保存工作状态和决策记录的区域）创建 `orchestrate/<project-slug>/`，通过记账用 CLI [`orch`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/scripts/orch/orch.ts) 将状态写入表格文件。主要文件如下。

<table class="code-line" data-line="243">
<thead class="code-line" data-line="243">
<tr class="code-line" data-line="243">
<th>文件</th>
<th>内容</th>
</tr>
</thead>
<tbody class="code-line" data-line="245">
<tr class="code-line" data-line="245">
<td><code>preferences.md</code></td>
<td>所有 Agent 都应遵守的共同指令。每行一条规则，在启动与恢复时每次都传入</td>
</tr>
<tr class="code-line" data-line="246">
<td><code>units.tsv</code></td>
<td>各工作单元的 ID、track（并行推进的工作系列）、状态、分支、PR、head SHA（PR 的最新提交 ID）、任务说明位置</td>
</tr>
<tr class="code-line" data-line="247">
<td><code>ledger.tsv</code></td>
<td>记录每个 PR 验证结果的台账</td>
</tr>
<tr class="code-line" data-line="248">
<td><code>inbox/</code></td>
<td>记录 Worker 发来的完成通知及报告存放位置</td>
</tr>
<tr class="code-line" data-line="249">
<td><code>gates.md</code></td>
<td>需要操作员决定的事项，记录问题、选项，以及无人回复时如何处理</td>
</tr>
<tr class="code-line" data-line="250">
<td><code>decisions.tsv</code></td>
<td>工作中所作决策及理由的记录</td>
</tr>
</tbody>
</table>

<a id="%E6%8C%87%E7%A4%BA%E6%9B%B8%E3%81%AF%E3%80%81workers%E3%81%8C%E5%8F%97%E3%81%91%E5%8F%96%E3%82%8B%E5%94%AF%E4%B8%80%E3%81%AE%E8%AA%AC%E6%98%8E"></a>


#### 任务说明是 Workers 接收的唯一说明

协调 Agent 向 Workers 分派工作时，为每个工作单元编写任务说明（brief）。Workers 不能在工作中向协调 Agent 提问。因此，<strong>任务说明中没写的内容，Workers 只能靠猜测补足</strong>。

靠猜测推进的工作容易偏离目标。因此，任务说明预先规定了必填栏位，主要包括：

- <strong>GOAL（目标）</strong>……用一句话写明工作目标，让不了解聊天经过的人也能执行。
- <strong>SCOPE（范围）</strong>……写明允许修改和禁止修改的文件，以及专用分支。
- <strong>CONTEXT（背景）</strong>……写明参考文件或 PR。Workers 看不到其他 Workers 的工作；若本项依赖上一项结果，就原样贴入前一位 Worker 的完整报告。
- <strong>ACCEPTANCE（完成条件）</strong>……逐行写出可验证的完成标准。
- <strong>VERIFY（验证方式）</strong>……写明验证时运行的命令或步骤。
- <strong>TIMEBOX（时间上限）</strong>……写明大致的工作时限；到达时限就返回已取得的结果并停止。
- <strong>FORBIDDEN（禁止事项）</strong>……写明不得执行的操作，例如范围外修改或 force-push。
- <strong>REPORT（报告内容）</strong>……写明工作完成后应返回的报告项目。
- <strong>STANDING（常驻指令）</strong>……原样贴入 `preferences.md` 内容。

<strong>若有任何一栏无法填写，就不启动 Workers</strong>。例如，写不出 ACCEPTANCE，表示尚未确定怎样才算完成。此时启动 Workers，只会让他们猜测完成标准，导致结果不一致。无法填写的栏位表明工作范围仍不清楚，须先解决后再启动 Workers。

但任务说明的长度要与工作规模相称。若只改几行代码，却把每一栏详尽写成长篇任务说明，写和读的成本可能超过工作本身。对于这类小工作，可在一段话中写明目标、范围、验证命令和报告格式。

<a id="%E5%8F%B0%E5%B8%B3%E3%81%AB%E3%81%AF%E3%80%81pr%E3%82%92%E3%81%A9%E3%81%93%E3%81%BE%E3%81%A7%E7%A2%BA%E3%81%8B%E3%82%81%E3%81%9F%E3%81%8B%E3%82%92%E8%A8%98%E9%8C%B2%E3%81%99%E3%82%8B"></a>


#### 台账记录 PR 验证到什么程度

PR 是否真的得到验证，记录在台账（`ledger.tsv`）中。台账为每个 PR 写一行判定，表示验证到什么程度。判定分为以下五种。

<table class="code-line" data-line="276">
<thead class="code-line" data-line="276">
<tr class="code-line" data-line="276">
<th>判定</th>
<th>含义</th>
</tr>
</thead>
<tbody class="code-line" data-line="278">
<tr class="code-line" data-line="278">
<td><code>live-ui-verified</code></td>
<td>实际操作界面或 CLI，验证行为</td>
</tr>
<tr class="code-line" data-line="279">
<td><code>unit-test-verified</code></td>
<td>通过单元测试验证</td>
</tr>
<tr class="code-line" data-line="280">
<td><code>type-check-only</code></td>
<td>仅通过类型检查</td>
</tr>
<tr class="code-line" data-line="281">
<td><code>verifier-blocked</code></td>
<td>因环境问题等原因无法执行验证</td>
</tr>
<tr class="code-line" data-line="282">
<td><code>verifier-failed</code></td>
<td>验证发现问题</td>
</tr>
</tbody>
</table>

例如，改变界面或行为的工作，只有 `type-check-only` 类型检查还不够，必须取得更有力的判定，因为类型检查不会验证实际行为。

`verifier-blocked` 并非通过，因此环境修复后，协调 Agent 要重新验证。若结果为 `verifier-failed`，则不应反复运行相同验证，而应新建工作单元修复问题。

CI 通过只是作出判定的一项材料，<strong>仅凭 CI 通过不能作出通过判定</strong>。CI 只能检查预设的测试，无法涵盖实际行为。

判定按 PR 编号与 head SHA（PR 最新提交 ID）的组合记录。若给 PR 增加提交或进行 rebase（将分支提交重新叠放在其他提交上的 Git 操作），head SHA 就会改变。

head SHA 变更后，PR 内容可能已不同于判定记录时。因此，<strong>不能使用旧 head SHA 对应的判定</strong>；提交改变就应重新验证，并将判定记在新 head SHA 下。

<a id="%E3%82%B9%E3%82%BF%E3%83%83%E3%82%AF%E3%81%AE%E4%BB%98%E3%81%91%E7%9B%B4%E3%81%97%E3%81%AF%E3%80%81stacker-1%E4%BD%93%E3%81%A0%E3%81%91%E3%81%8C%E8%A1%8C%E3%81%86"></a>


#### 只由一位 stacker 重新整理 PR 栈

在 PR 栈（由父子关系连接的一列 PR）中，下层 PR 内容改变后，上层 PR 也需要重新叠放在改变后的 PR 上（见下图）。这项操作称为 restack。

```
更新前
main
└─ PR #1（親はmain）
   └─ PR #2（親はPR #1）
      └─ PR #3（親はPR #2）

PR #1に変更Aを加えた後の更新順
PR #1 → PR #2 → PR #3

更新後
main
└─ PR #1（変更A）
   └─ PR #2（更新後の親PR #1を反映）
      └─ PR #3（更新後の親PR #2を反映）
```

在「Orchestrate」中，每个 PR 栈只安排一位负责 restack 的 Agent，称为 stacker（PR 栈管理者）。

stacker 使用 Graphite（`gt`）命令管理堆叠的 PR，执行 restack。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="320">
<li class="code-line" data-line="320">
<strong>Graphite</strong>……以父子关系创建和管理 PR 栈的工具</li>
</ul>
</div></aside>

Workers 不使用 `gt`，也不进行 rebase。多个 Agent 同时重排同一 PR 栈，会互相覆盖改动或破坏 PR 的父子关系。<strong>将重排限定给唯一一位 stacker</strong>，保证始终只有一位 Agent 写入 PR 栈，从而避免冲突。

<a id="%E6%A7%98%E5%AD%90%E3%82%92%E8%A6%8B%E3%82%8B%E3%81%9F%E3%82%81%E3%81%AB%E3%80%81%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%82%92%E5%86%8D%E9%96%8B%E3%81%97%E3%81%AA%E3%81%84"></a>


#### 不要为了查看进展而恢复 Agent

即使要查看进度，也不恢复并询问处于等待中的 Agent，因为询问会使它重新开始工作。协调 Agent 应改为只读检查其留下的记录，例如台账、`units.tsv` 或已推送分支。

<a id="%E9%81%8B%E7%94%A8%E8%80%85%E3%81%AB%E5%88%A4%E6%96%AD%E3%82%92%E6%B1%82%E3%82%81%E3%82%8B%E3%81%AE%E3%81%AF4%E7%A8%AE%E9%A1%9E%E3%81%A0%E3%81%91"></a>


#### 只有四类问题需要操作员判断

这个 Playbook 预设 Agent 长时间自主工作，操作员一天仅检查两次。若连 Agent 能决定的事项也去询问，工作会在等待回复期间停止。因此，只将以下四类事项交给操作员判断。

- 不可逆操作（如对共享分支 force-push、部署、删除）
- 无法通过试验得出答案的产品或偏好判断
- `preferences.md` 的共同指令与实际情况冲突
- 重新规划后仍未解决的瓶颈

询问前，先把事项记录在 `gates.md`；等待答复时仍继续其他工作。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="341">
<li class="code-line" data-line="341">
<strong>force-push</strong>……用本地历史强制覆盖远端分支历史的 push</li>
</ul>
</div></aside>

<a id="%E8%A6%81%E7%82%B9%E3%81%AF%E3%80%81%E5%AE%8C%E4%BA%86%E3%80%81%E5%B8%B8%E8%A8%AD%E3%81%AE%E6%8C%87%E7%A4%BA%E3%80%81%E6%8C%87%E7%A4%BA%E6%9B%B8%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6%E3%81%AE3%E3%81%A4%E3%81%AE%E8%A6%8F%E5%89%87"></a>


### 要点是关于完成通知、常驻指令和任务说明的三条规则

这个 Playbook 开头列出三条规则，后续步骤均以此为前提。

- <strong>完成通知不逐条即时处理，而要积累后集中处理</strong>……数十位 Workers 可能同时工作；每来一条通知就停下，会妨碍协调 Agent 自身推进工作。因此，通知先放入收件箱（`inbox/`），在合适的节点集中处理（步骤 5）。
- <strong>启动与恢复时都必须传入共同指令</strong>……Agent 跨恢复可能丢失先前指令。每漏一条，操作员就要重新解释一次。所以每次启动或恢复时都原样传入 `preferences.md`。
- <strong>任务说明的质量决定成果质量</strong>……Workers 工作中无法提问；即使说明含糊，也无人发现，最终会得到偏离目标的成果。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E7%B5%82%E4%BA%86%E6%9D%A1%E4%BB%B6%E3%81%A8%E3%80%81%E7%A2%BA%E8%AA%8D%E3%81%99%E3%82%8B%E9%A0%BB%E5%BA%A6%E3%82%92%E6%9B%B8%E3%81%8F"></a>


### 请求写法：写明完成条件与检查频率

随附指南 [`07-overnight.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/07-overnight.md) 中的请求示例，写明全部包转换并合并的完成条件，以及操作员每天检查两次。

```
/poteto-mode orchestrate the store migration. own it until every package is converted and merged. i'll check in twice a day.
// ストアの移行を orchestrate して。すべてのパッケージが変換されてマージされるまで持っていて。1日2回確認する。
```

<a id="%E3%80%8Eautopilot-full%E3%80%8F%E3%81%AF%E3%80%81pr%E3%81%94%E3%81%A8%E3%81%AE%E3%82%AA%E3%83%BC%E3%83%8A%E3%83%BC%E3%81%8C%E3%83%9E%E3%83%BC%E3%82%B8%E3%81%BE%E3%81%A7%E9%80%B2%E3%82%81%E3%80%81%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%8D%E3%83%BC%E3%82%BF%E3%83%BC%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AF%E6%A4%9C%E8%A8%BC%E3%81%AE%E5%88%A4%E5%AE%9A%E3%81%A0%E3%81%91%E3%82%92%E5%8F%97%E3%81%91%E6%8C%81%E3%81%A4"></a>


## 「Autopilot-full」由各 PR 的负责人推进到合并，协调 Agent 只负责验证判定

「<strong>Autopilot-full</strong>」用于将互相独立的 PR 队列（待处理工作的序列）推进到合并，无需操作员逐一确认。

每个 PR 分配一位 Agent，称为<strong>负责人</strong>。负责人从创建自己的 PR 一直负责到合并。

另一方面，<strong>协调 Agent 不直接操作 PR，只负责验证判定</strong>。没有协调 Agent 的通过判定，负责人不能合并。负责人也检查自己的工作，但作者本人容易漏看问题，所以还要求另一位 Agent 验证通过。

通过判定须满足条件：使用 `/swarm`（见[第 24 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346)）并行运行多个验证职责，其中必须包含实际操作界面或 CLI 验证行为的 live lane。lane 是一条并行运行的验证职责。live lane 是最低要求；没有 live lane 的判定不能算通过。此外，负责人须修复 lane 提出的全部问题，包括作为备注提出的意见。达到这些条件的通过判定称为 <strong>clean verdict</strong>（字面意思是「干净的判定」）。

<a id="7%E3%81%A4%E3%81%AE%E6%89%8B%E9%A0%86-2"></a>


### 七个步骤

步骤如下。

1. 等待操作员下令开始（state-then-wait）
2. 为每个 PR 启动一位负责人
3. 各负责人并行工作，不把 PR 堆叠起来
4. 每轮通过 `/swarm` 验证
5. 取得 clean verdict 后，由负责人自行合并
6. 协调 Agent 大约每三十分钟检查全局
7. 操作员叫停时，停止所有负责人

下面逐项说明这些步骤。

<a id="1.-%E9%81%8B%E7%94%A8%E8%80%85%E3%81%AE%E9%96%8B%E5%A7%8B%E3%81%AE%E6%8C%87%E7%A4%BA%E3%82%92%E5%BE%85%E3%81%A4%EF%BC%88state-then-wait%EF%BC%89"></a>


#### 1. 等待操作员下令开始（state-then-wait）

若只被要求解释计划，就解释后停止。操作员明确下令开始后，将整体目标设入 `/goal`，再启动。若操作员指定某个 PR 由自己处理，负责人不合并该 PR，交给操作员。

<a id="2.-pr%E3%81%94%E3%81%A8%E3%81%AB1%E4%BD%93%E3%81%AE%E3%82%AA%E3%83%BC%E3%83%8A%E3%83%BC%E3%82%92%E8%B5%B7%E5%8B%95%E3%81%99%E3%82%8B"></a>


#### 2. 为每个 PR 启动一位负责人

负责人是在 Cursor 云端运行的 Agent（Cloud Agents），负责创建 PR、在实际环境中验证行为、分流 Bugbot 评论、rebase 到 trunk（合并目标所在的主线分支）、通过「[<strong>Babysit</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md)」（见[第 14 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e)）推进至 CI 通过，最后合并。

<a id="3.-%E3%82%AA%E3%83%BC%E3%83%8A%E3%83%BC%E5%90%8C%E5%A3%AB%E3%81%AF%E4%B8%A6%E5%88%97%E3%81%AB%E5%8B%95%E3%81%8B%E3%81%97%E3%80%81pr%E3%82%92%E7%A9%8D%E3%81%BF%E9%87%8D%E3%81%AD%E3%81%AA%E3%81%84"></a>


#### 3. 各负责人并行工作，不把 PR 堆叠起来

若各 PR 互相独立，就能并行推进而不冲突；各自从 trunk 开始工作，不堆叠。

<a id="4.-%E3%83%A9%E3%82%A6%E3%83%B3%E3%83%89%E3%81%94%E3%81%A8%E3%81%AB-%2Fswarm-%E3%81%A7%E6%A4%9C%E8%A8%BC%E3%81%99%E3%82%8B"></a>


#### 4. 每轮通过 `/swarm` 验证

一轮是负责人确定代码并接受验证的一次流程。每次 push 修复都会开始新一轮。针对确定时的提交并行启动多个验证者，将结果汇总成一个判定；缺少 live lane 的判定不算 clean verdict。

<a id="5.-clean-verdict-%E3%81%8C%E5%87%BA%E3%81%9F%E3%82%89%E3%80%81%E3%82%AA%E3%83%BC%E3%83%8A%E3%83%BC%E3%81%8C%E8%87%AA%E5%88%86%E3%81%A7%E3%83%9E%E3%83%BC%E3%82%B8%E3%81%99%E3%82%8B"></a>


#### 5. 取得 clean verdict 后，由负责人自行合并

合并前重新 rebase 到最新 trunk，再合并并从队列领取下一项工作。

<a id="6.-%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%8D%E3%83%BC%E3%82%BF%E3%83%BC%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AF%E3%80%81%E7%B4%8430%E5%88%86%E3%81%94%E3%81%A8%E3%81%AB%E5%85%A8%E4%BD%93%E3%82%92%E7%82%B9%E6%A4%9C%E3%81%99%E3%82%8B"></a>


#### 6. 协调 Agent 大约每三十分钟检查全局

重读 Playbook 和 `/goal`；若执行偏离要求，当场纠正。同时检查是否有停滞的负责人，有则替换。

<a id="7.-%E9%81%8B%E7%94%A8%E8%80%85%E3%81%8C%E6%AD%A2%E3%82%81%E3%81%9F%E3%82%89%E3%80%81%E3%81%99%E3%81%B9%E3%81%A6%E3%81%AE%E3%82%AA%E3%83%BC%E3%83%8A%E3%83%BC%E3%82%92%E6%AD%A2%E3%82%81%E3%82%8B"></a>


#### 7. 操作员叫停时，停止所有负责人

操作员的停止指令应立即传达给所有负责人，内容为「此后不要再写入任何内容」。

<a id="%E8%BF%94%E7%AD%94%E3%81%AB%E6%9B%B8%E3%81%8F%E9%A0%85%E7%9B%AE-2"></a>


#### 回答应包含的项目

回答应包含以下项目。

- 每个 PR 的负责人、状态与判定
- 已合并的 PR
- 等待操作员决定的事项
- 决策记录位置

<a id="%E8%A6%81%E7%82%B9%E3%81%AF%E3%80%81%E9%80%B2%E6%8D%97%E3%82%92%E3%80%8C%E5%89%AF%E4%BD%9C%E7%94%A8%E3%80%8D%E3%81%A0%E3%81%91%E3%81%A7%E6%95%B0%E3%81%88%E3%82%8B%E3%81%93%E3%81%A8"></a>


### 要点是只按「副作用」计算进度

在 Autopilot-full 中，许多负责人和子 Agent 同时工作，其中有的可能因错误而停下，却没有报告。若放任停滞的 Agent，其负责的 PR 会一直停滞。

因此，协调 Agent 不依赖 Agent 自述，只把<strong>工作实际留下的痕迹算作进度</strong>。这些痕迹包括提交、push、PR 或检查状态的变化，以及写入存储区（保存工作状态和决策记录的区域）的报告。这些可从外部观察到的工作结果称为副作用。

若负责人超过预期时间仍没有留下副作用，就视为停滞，不等回复而直接换人（在步骤 6 的检查中执行）。这样避免停滞负责人拖慢整体进度。「<strong>Orchestrate</strong>」不为检查进度而唤醒等待中的 Agent，而是查看提交、PR 状态和台账记录，出于同样的理由。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E5%90%84%E9%A0%85%E7%9B%AE%E3%81%8C%E7%8B%AC%E7%AB%8B%E3%81%97%E3%81%A6%E3%81%84%E3%82%8B%E3%81%93%E3%81%A8%E3%81%A8%E3%80%81%E3%83%9E%E3%83%BC%E3%82%B8%E3%81%AE%E6%9C%9F%E9%99%90%E3%82%92%E6%9B%B8%E3%81%8F"></a>


### 请求写法：写明各项目互相独立，以及合并期限

随附指南中的请求示例说明队列中的每一项互相独立，并要求在早晨前合并。

```
/poteto-mode full autopilot on this queue. each item is independent. i want them merged by morning.
// このキューを full autopilot で進めて。各項目は独立している。朝までにマージしておいて。
```

<a id="%E3%80%8Eautopilot-stack%E3%80%8F%E3%81%AF%E3%80%81autopilot-full%E3%81%A8%E5%90%8C%E3%81%98%E6%89%8B%E9%A0%86%E3%81%A7pr%E3%82%92%E4%BD%9C%E3%81%A3%E3%81%A6%E6%A4%9C%E8%A8%BC%E3%81%97%E3%80%81%E3%83%9E%E3%83%BC%E3%82%B8%E3%81%9B%E3%81%9A%E3%81%AB1%E6%9C%AC%E3%81%AE%E3%82%B9%E3%82%BF%E3%83%83%E3%82%AF%E3%81%A8%E3%81%97%E3%81%A6%E9%81%8B%E7%94%A8%E8%80%85%E3%81%AB%E6%B8%A1%E3%81%99"></a>


## 「Autopilot-stack」按与 Autopilot-full 相同的步骤创建并验证 PR，不合并，而是作为一个 PR 栈交给操作员

「<strong>Autopilot-stack</strong>」按与「<strong>Autopilot-full</strong>」相同的方式创建并验证 PR，但<strong>不合并</strong>。它将通过验证的 PR 堆成一条 PR 栈（由父子关系连接的 PR 序列），再交给操作员。操作员审阅后自行合并。

若要人在合并前审阅、改动之间相互依赖而必须按顺序堆叠，或无法授予 Agent 合并权限，就使用这个 Playbook。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9Aautopilot-full-%E3%81%A8%E3%81%AE%E9%81%95%E3%81%84"></a>


### 步骤：与 Autopilot-full 的区别

步骤与「<strong>Autopilot-full</strong>」基本相同，区别如下。

- 验证通过后，负责人报告 STACK-READY（可加入 PR 栈），而不是 merge-ready（可合并）。
- 所有负责人都不合并。只将取得 clean verdict 的 PR 依次加入同一 PR 栈。<strong>未通过验证的 PR 不加入 PR 栈</strong>。
- 只有协调 Agent 可以改动 PR 栈的排列（哪个 PR 叠在哪个 PR 上）。负责人只 push 自己的分支。
- trunk（合并目标所在的主线分支）前进后，协调 Agent 从最前沿 PR 开始依次 rebase 整条 PR 栈（rebase 是将分支提交重新叠放到另一提交上的 Git 操作）。rebase 会改变 head SHA（PR 的最新提交 ID），所以内容变化的 PR 需重新验证。
- 最后，将附有每个 PR 验证判定的 PR 栈交给操作员。操作员从最前沿开始依次审阅并合并。

回答应包含以下项目。

- PR 栈最前沿的 PR（指向 trunk 的 PR）与最顶部 PR 的链接
- 每个 PR 的判定摘要
- 从 PR 栈中排除的 PR 及原因

<a id="%E8%A6%81%E7%82%B9%E3%81%AF%E3%80%81%E3%82%B9%E3%82%BF%E3%83%83%E3%82%AF%E3%81%AE%E4%B8%A6%E3%81%B3%E3%82%92%E6%9B%B8%E3%81%8D%E6%8F%9B%E3%81%88%E3%82%8B%E3%81%AE%E3%81%AF%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%8D%E3%83%BC%E3%82%BF%E3%83%BC%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%A0%E3%81%91%E3%81%A8%E3%81%84%E3%81%86%E5%88%86%E6%8B%85"></a>


### 要点是只有协调 Agent 能改动 PR 栈排列

PR 栈的排列是所有负责人共享的信息。若多个负责人同时改写 PR 的父子关系，各人的改动可能互相冲突，破坏 PR 栈。

因此，<strong>只有协调 Agent 能改动 PR 栈排列</strong>，负责人只能 push 自己的分支。把写入职责限定给一位 Agent，就能避免排列冲突。

这与「<strong>Orchestrate</strong>」安排每个分支只有一位 Worker 写入、每条 PR 栈只由一位 stacker restack 一样，是对 Principle「[<strong>Separate Before Serializing Shared State</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md)」（见[第 18 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b)）的一种落实。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E3%80%8C%E3%82%B9%E3%82%BF%E3%83%83%E3%82%AF%E3%81%AB%E3%81%97%E3%81%A6%E3%80%81%E6%9C%AC%E7%95%AA%E3%81%AB%E3%81%AF%E5%85%A5%E3%82%8C%E3%81%AA%E3%81%84%E3%81%A7%E3%80%8D%E3%81%A8%E6%9B%B8%E3%81%8F"></a>


### 请求写法：写明「整理成 PR 栈，但不要并入生产环境」

随附指南中的请求示例要求将改动堆成 PR 栈，不并入生产环境，而由操作员亲自并入。

```
/poteto-mode autopilot these five changes but stack them, don't ship. i'll land the stack in the morning.
// この5つの変更を autopilot で進めて。ただしスタックにして、本番には入れないで。朝に自分でスタックを入れる。
```

<a id="%E9%95%B7%E3%81%8F%E5%8B%95%E3%81%8F%E4%BD%9C%E6%A5%AD%E3%81%AE5%E3%81%A4%E3%81%AE%E9%81%B8%E6%8A%9E%E8%82%A2%E3%81%AF%E3%80%81%E8%AA%B0%E3%81%8C%E3%83%9E%E3%83%BC%E3%82%B8%E3%81%97%E3%80%81%E4%BD%95%E3%82%92%E5%8D%98%E4%BD%8D%E3%81%AB%E3%81%99%E3%82%8B%E3%81%8B%E3%81%A7%E9%81%B8%E3%81%B6"></a>


## 长期运行工作的五种选择，取决于工作单元是什么、由谁合并

委派长期运行的工作时，应根据<strong>工作单元是什么、由谁合并</strong>，从「Autonomous run」「Orchestrate」「Autopilot-full」「Autopilot-stack」四个 Playbook，以及在没有合适 Playbook 时自行设计可审计步骤的 `/figure-it-out`（见[第 23 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/3ce2b2)）中选择。

<table class="code-line" data-line="482">
<thead class="code-line" data-line="482">
<tr class="code-line" data-line="482">
<th>比较角度</th>
<th>「<strong>Autonomous run</strong>」</th>
<th><code>/figure-it-out</code></th>
<th>「<strong>Orchestrate</strong>」</th>
<th>「<strong>Autopilot-full</strong>」</th>
<th>「<strong>Autopilot-stack</strong>」</th>
</tr>
</thead>
<tbody class="code-line" data-line="484">
<tr class="code-line" data-line="484">
<td>工作单元</td>
<td>一项任务</td>
<td>一次大规模工作</td>
<td>持续数日的整体项目</td>
<td>独立 PR 队列</td>
<td>按顺序或依赖关系排列的改动队列</td>
</tr>
<tr class="code-line" data-line="485">
<td>由谁合并</td>
<td>Playbook 未规定</td>
<td>取决于设计的流程</td>
<td>协调 Agent 或 stacker</td>
<td>各 PR 负责人</td>
<td>操作员</td>
</tr>
<tr class="code-line" data-line="486">
<td>适用场景</td>
<td>能将完成条件写成一项可验证的条件，且一位 Agent 能完成</td>
<td>工作规模大、涉及多个位置，或没有适合的 Playbook</td>
<td>无法在一位 Agent 的可运行时长内完成</td>
<td>各 PR 独立，且 Agent 获得合并权限</td>
<td>希望合并前审阅、工作之间存在依赖，或无法授予合并权限</td>
</tr>
</tbody>
</table>

在两个 Autopilot Playbook 中，若 PR 互相独立且已授予合并权限，选择「<strong>Autopilot-full</strong>」；否则选择「<strong>Autopilot-stack</strong>」。

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 总结

- <strong>四个 Playbook 的分工</strong>……「<strong>Multi-phase or multi-PR plan</strong>」负责计划；「<strong>Orchestrate</strong>」管理持续数日的工作；「<strong>Autopilot-full</strong>」让各 PR 负责人推进至合并；「<strong>Autopilot-stack</strong>」不合并，而是交付一条 PR 栈。每者都明确规定协调 Agent 不持有什么。
- <strong>Multi-phase or multi-PR plan</strong>……编写清单式计划。只有 unit、live、perf 三项俱全，才算通过验证。
- <strong>Orchestrate</strong>……通过任务说明、存储区表格和台账管理持续数日的工作。说明栏位无法填写完整时不启动 Worker；判定按最新提交记录。
- <strong>Autopilot-full</strong>……各负责人推进至合并，协调 Agent 只负责判定。进度只按副作用计算。
- <strong>Autopilot-stack</strong>……不合并，交付一条 PR 栈。只有协调 Agent 可以改动 PR 栈排列。
- <strong>五种选择</strong>……依据工作单元是什么、由谁合并来选择。

[第三部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/72f8ee)已逐一介绍 pstack 的所有 Playbook。[第四部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4b3166)将讨论在工作中如何选择方案、何时结束等指导 Agent 判断的 Principle。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](19-chapter.md) · [下一篇](21-chapter.md) · [English](../en/20-chapter.md)
