# 第 6 章：pstack 解决什么问题

[目录](README.md) · [上一篇](08-chapter.md) · [下一篇](10-chapter.md) · [English](../en/09-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/33f073) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3a7791)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
pstack 是为回答「AI 写了太多粗糙代码」这个问题而制作的插件。借用 [README](https://github.com/cursor/plugins/blob/main/pstack/README.md) 中的话，其理念是「<strong>想加快速度，先深入工作</strong>」；它是以较少代码开发高质量产品的工具。

本章讲解 pstack 面对的问题及其回答、它的内容与[第一部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/86acbc)四个主题的对应关系，以及适用场景。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="5"><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/86acbc" target="_blank">第一部分</a>的四个主题</p>
<ol class="code-line" data-line="7">
<li class="code-line" data-line="7">通过检查成果物建立信任（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/27a183" target="_blank">第 2 章</a>）</li>
<li class="code-line" data-line="8">通过验证工具、工作步骤和代码结构提高信任（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5" target="_blank">第 3 章</a>）</li>
<li class="code-line" data-line="9">将代码库视为继承以往判断的记忆（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141" target="_blank">第 4 章</a>）</li>
<li class="code-line" data-line="10">在这些基础上进行自动化（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b6ac2d" target="_blank">第 5 章</a>）</li>
</ol>
</div></aside>

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章按以下顺序展开。

- pstack 想解决什么问题
- pstack 如何回答这个问题
- pstack 包含什么、不包含什么
- pstack 的组件如何对应演讲的四个主题
- pstack 适合什么工作，应如何使用
- 小结：以「先深入工作」回应粗糙代码的问题

<a id="pstack%E3%81%AF%E3%81%A9%E3%82%93%E3%81%AA%E5%95%8F%E9%A1%8C%E3%82%92%E8%A7%A3%E6%B1%BA%E3%81%97%E3%82%88%E3%81%86%E3%81%A8%E3%81%97%E3%81%A6%E3%81%84%E3%82%8B%E3%81%AE%E3%81%8B"></a>


## pstack 想解决什么问题

pstack 想解决的是<strong>AI 写出太多粗糙代码（slop）</strong>的问题。

pstack 是 poteto 公开发布的 Cursor 插件，README 开篇就提出了这个问题。

> there's a growing sense that ai writes too much slop code. i agree. i don't want to ship like a team of twenty slop artists. throughput without quality is not a goal i aspire to. if you want to go fast, go deep first.
>
> 人们越来越觉得 AI 写了太多粗糙代码（slop）。我也这么认为。我不想像一支由二十个粗糙代码制造者组成的团队那样交付。没有质量的产出量不是我追求的目标。想加快速度，先深入工作。

她明确表示，pstack 是她对这个问题给出的「my answer」。

<a id="pstack%E3%81%AF%E3%81%9D%E3%81%AE%E5%95%8F%E9%A1%8C%E3%81%AB%E3%81%A9%E3%81%86%E7%AD%94%E3%81%88%E3%81%A6%E3%81%84%E3%82%8B%E3%81%AE%E3%81%8B"></a>


## pstack 如何回答这个问题

pstack 的回答包含以下三项方针。

1. <strong>写得更少</strong>
2. <strong>先与一位 Agent 深入合作；确认可以信任它写出高质量、可验证的代码后，再并行执行</strong>
3. <strong>按角色选用模型</strong>

在 README 中，提出问题之后以粗体开头的三个段落，分别对应这三项方针。

- <strong>pstack is my answer.</strong>……目标不是让代码行数最多，而是写出更少、更高质量的代码
- <strong>pstack gives you fearless parallelism.</strong>……先与一位 Agent 深入合作；若能信任它写出高质量、可验证的代码，就能有信心地并行执行
- <strong>cursor gives you the best of all worlds.</strong>……每种模型都有优缺点，而 pstack 可以使用其中任何一种；许多 Skill 结合多种模型，发挥各自的长处

<a id="%E5%B0%91%E3%81%AA%E3%81%8F%E6%9B%B8%E3%81%8F%E3%81%93%E3%81%A8%E3%81%AF%E3%80%81%E8%A8%BC%E6%8B%A0%E3%82%92%E5%89%8A%E3%82%8B%E3%81%93%E3%81%A8%E3%81%A7%E3%81%AF%E3%81%AA%E3%81%84"></a>


### 写得更少，不等于删掉证据

第一项方针认为，最大化代码行数恰恰与目标背道而驰。Principle「[<strong>Laziness Protocol</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-laziness-protocol/SKILL.md)」（选择最小的变更，优先删除；见[第 17 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b)）体现了这项方针。

然而，「写得更少」并不意味着连用于证明结果的代码也删掉。「<strong>Bug fix</strong>」Playbook（[`playbooks/bug-fix.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md)）的前言这样界定应当删除的内容。

> Every shipped line traces to runtime evidence. Belt-and-suspenders that "might help" is a hypothesis, not a fix.
>
> 每一行交付的代码都应追溯到运行时证据。「也许有用」的额外保险措施是假设，不是修复。

Agent 不加入「以防万一」的变更，只加入为修复实际运行并确认的问题所必需的变更。

另一方面，该 Playbook 的「确定提交顺序的步骤（步骤 5）」要求先于修复提交能够失败的复现测试（测试成本很高等情况可以省略）。<strong>要删掉的是没有依据的「以防万一」的措施或变更；用于确认缺陷的复现测试等证据代码，不属于应删除的东西</strong>。

<a id="%E4%B8%A6%E5%88%97%E5%8C%96%E3%81%AF%E3%80%811%E4%BD%93%E3%81%AE%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AE%E6%88%90%E6%9E%9C%E7%89%A9%E3%82%92%E4%BF%A1%E9%A0%BC%E3%81%A7%E3%81%8D%E3%81%A6%E3%81%8B%E3%82%89"></a>


### 信任一位 Agent 的成果物后，再并行执行

第二项方针是：先让一位 Agent 深入工作，确认可以信任它写出可验证的好代码，然后才有信心地并行执行。poteto 在《The Complete Guide to pstack》的 [Part 1](https://x.com/poteto/status/2094457600259842065) 中，也按「信任 → 并行执行」的顺序叙述：先借助验证 Skill 合并几个 PR，再考虑并行。

<a id="%E3%83%A2%E3%83%87%E3%83%AB%E3%81%AF%E3%80%81%E5%BD%B9%E5%89%B2%E3%81%A7%E4%BD%BF%E3%81%84%E5%88%86%E3%81%91%E3%82%8B"></a>


### 按角色选用模型

关于第三项方针，根据 README，0.15.5 时点的默认模型分配如下。

- <strong>负责写代码的委派对象</strong>（Feature、Refactoring、Bug fix、Perf、Hillclimb）……Grok（xAI 的模型）
- <strong>最困难的变更、写作和判断</strong>……Opus 5.5（Anthropic 的模型）
- <strong>评议小组（让多种模型分别回答同一问题再比较的机制）</strong>……Opus 5.5、GPT-5.6 Sol 和 Grok

这些分配可通过 `/setup-pstack` 修改。分配机制将在[第 34 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8487f0)讨论。

使用多种模型还有不止个人偏好的意义。[`/poteto-mode`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md) 的「[Subagents](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#subagents)」一节这样定义第二意见。

> A second opinion is the same prompt against a different model. Agreement is high-signal.
>
> 第二意见，就是让不同模型回答相同的提示词。答案一致，是一个可信度较高的信号。

Agent 让另一种模型回答同一个问题，检查答案是否一致。

例如，分别让 Opus 5.5 和 Grok 4.7 判断缺陷的原因；如果两者指出同一原因，这种判断就比单一模型的回答更可信。<strong>在 pstack 中，使用不同模型是验证手段之一</strong>。

<a id="pstack%E3%81%AB%E3%81%AF%E4%BD%95%E3%81%8C%E5%85%A5%E3%81%A3%E3%81%A6%E3%81%84%E3%81%A6%E3%80%81%E4%BD%95%E3%81%8C%E5%85%A5%E3%81%A3%E3%81%A6%E3%81%84%E3%81%AA%E3%81%84%E3%81%AE%E3%81%8B"></a>


## pstack 包含什么、不包含什么

0.15.5 时点的 pstack <strong>包含五类组件</strong>。另一方面，<strong>Playbook 的步骤所使用的一些 Skill 位于其他插件或 Cursor 本体中，并未包含在 pstack 内；pstack 也没有专门用于撰写计划书的 Skill</strong>。

<a id="%E5%85%A5%E3%81%A3%E3%81%A6%E3%81%84%E3%82%8B%E3%81%AE%E3%81%AF%E3%80%815%E7%A8%AE%E9%A1%9E%E3%81%AE%E9%83%A8%E5%93%81"></a>


### 包含五类组件

以下数量均为 0.15.5（[commit `12d587d`](https://github.com/cursor/plugins/pull/422)）时点的值。

<table class="code-line" data-line="96">
<thead class="code-line" data-line="96">
<tr class="code-line" data-line="96">
<th>组件</th>
<th>数量</th>
<th>位置</th>
<th>作用</th>
</tr>
</thead>
<tbody class="code-line" data-line="98">
<tr class="code-line" data-line="98">
<td>Playbook</td>
<td>23</td>
<td><code>skills/poteto-mode/playbooks/*.md</code></td>
<td>按工作类型编写的步骤文件，是 <code>/poteto-mode</code> 内部的参考文件</td>
</tr>
<tr class="code-line" data-line="99">
<td>Principle</td>
<td>23</td>
<td><code>skills/principle-*/SKILL.md</code></td>
<td>判断标准，每项原则各有一份简短的 Skill 文件</td>
</tr>
<tr class="code-line" data-line="100">
<td>Skill</td>
<td>24</td>
<td>
<code>skills/*/SKILL.md</code>（不包括 Principle）</td>
<td>可调用的能力，包括 <code>/poteto-mode</code> 和 <code>/setup-pstack</code></td>
</tr>
<tr class="code-line" data-line="101">
<td>subagent</td>
<td>2</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/agents/poteto-agent.md" rel="nofollow noopener noreferrer" target="_blank"><code>agents/poteto-agent.md</code></a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/agents/comment-sicko.md" rel="nofollow noopener noreferrer" target="_blank"><code>agents/comment-sicko.md</code></a>
</td>
<td>由主 Agent 启动的其他 Agent 的定义</td>
</tr>
<tr class="code-line" data-line="102">
<td>随附指南</td>
<td>10 页</td>
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/README.md" rel="nofollow noopener noreferrer" target="_blank"><code>docs/guide/*.md</code></a></td>
<td>pstack 随附的指南，附有请求示例，涵盖从第一项任务到夜间运行</td>
</tr>
</tbody>
</table>

有三点容易误解。

- <strong>Playbook 不是 Skill</strong>……Playbook 是 `/poteto-mode` 按请求打开的参考文件，不能单独调用。poteto 也在《The Complete Guide to pstack》的 [Part 2](https://x.com/poteto/status/2097732320606507506) 中说明，Playbook 是 `/poteto-mode` 内的参考文件，而非 Skill。[第 8 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/096f3d)将讨论这一区别。
- <strong>Principle 在文件形式上是 Skill</strong>……但 README 没有把它们放在「skills」表中，而是另设「principles」表。本书也分别统计 24 个 Skill 和 23 个 Principle。
- <strong>随附指南与 X 上的《The Complete Guide to pstack》是两种不同资料</strong>……本书将 `docs/guide/` 称为「随附指南」，将 X 上的文章分别称为《The Complete Guide to pstack》Part 1 和 Part 2。

<a id="%E6%89%8B%E9%A0%86%E3%81%8C%E5%90%8D%E5%89%8D%E3%81%A7%E9%A0%BC%E3%82%8B%E4%B8%80%E9%83%A8%E3%81%AEskill%E3%81%AF%E3%80%81%E5%90%8C%E6%A2%B1%E3%81%95%E3%82%8C%E3%81%A6%E3%81%84%E3%81%AA%E3%81%84"></a>


### 部分被步骤点名使用的 Skill 并未随附

`/poteto-mode` 也通过名称引用未随附的 Skill。如果缺少它们，部分步骤就无法执行。列表见 README 的「[not shipped here](https://github.com/cursor/plugins/blob/main/pstack/README.md#not-shipped-here)」一节。

<table class="code-line" data-line="114">
<thead class="code-line" data-line="114">
<tr class="code-line" data-line="114">
<th>引用的组件</th>
<th>实际位置</th>
<th>
在 <code>/poteto-mode</code> 中的用途</th>
</tr>
</thead>
<tbody class="code-line" data-line="116">
<tr class="code-line" data-line="116">
<td>
<code>/deslop</code>（<code>deslop</code> Skill）</td>
<td>
<a href="https://github.com/cursor/plugins/tree/main/cursor-team-kit" rel="nofollow noopener noreferrer" target="_blank"><code>cursor-team-kit</code></a> 插件</td>
<td>提交前清除带有 AI 痕迹的粗糙代码</td>
</tr>
<tr class="code-line" data-line="117">
<td><code>control-cli</code></td>
<td>
<code>cursor-team-kit</code> 插件</td>
<td>操作 CLI 和 TUI（在终端中运行、有画面的应用）进行检查</td>
</tr>
<tr class="code-line" data-line="118">
<td><code>control-ui</code></td>
<td>
<code>cursor-team-kit</code> 插件</td>
<td>操作浏览器、Electron（构建桌面应用的框架）和 Web UI 进行检查</td>
</tr>
<tr class="code-line" data-line="119">
<td><code>/create-skill</code></td>
<td>Cursor 内置</td>
<td>
编写 <code>SKILL.md</code> 时遵循的规范</td>
</tr>
<tr class="code-line" data-line="120">
<td>
<code>/autopilot</code>（原名 <code>/babysit</code>）</td>
<td>Cursor 内置</td>
<td>检查 PR 状态（pstack 使用「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Babysit</strong></a>」Playbook；见<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e" target="_blank">第 14 章</a>）</td>
</tr>
</tbody>
</table>

README 建议，如果要配齐整套工具，也安装 `cursor-team-kit`。

尤其重要的是 `control-cli` 和 `control-ui`。这两个操作应用的 Skill 用于「<strong>Bug fix</strong>」Playbook 中的「自己复现缺陷的步骤（步骤 1）」。只安装 pstack，可能没有操作应用以复现和检查问题的手段。

如果已经有自己应用专用的验证 Skill（由 `/create-verification-skill` 创建的 `verify-<app>`），它就可以充当操作手段。如果两者都没有，就按照[第 36 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)的步骤，先建立验证 Skill。

<a id="%E8%A8%88%E7%94%BB%E6%9B%B8%E3%82%92%E6%9B%B8%E3%81%8F%E3%81%9F%E3%82%81%E3%81%AEskill%E3%81%AF%E3%80%81%E3%80%8C%E6%9C%80%E8%89%AF%E3%81%AE%E4%BB%95%E6%A7%98%E3%81%AF%E3%82%B3%E3%83%BC%E3%83%89%E3%80%8D%E3%81%A8%E3%81%84%E3%81%86%E7%AB%8B%E5%A0%B4%E3%81%8B%E3%82%89%E5%85%A5%E3%81%A3%E3%81%A6%E3%81%84%E3%81%AA%E3%81%84"></a>


### 因为认为「最好的规格是代码」，pstack 没有撰写计划书的专用 Skill

pstack 没有专用的计划 Skill，是因为 poteto 认为代码比计划书更适合作为规格。README 的「[why are there no planning skills?](https://github.com/cursor/plugins/blob/main/pstack/README.md#why-are-there-no-planning-skills)」一节认为 Cursor 的计划模式与 pstack 很契合，同时写道「最好的规格是代码」（[第 38 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7549a7)）。

同一处还说，如需制订计划，可以由 `/poteto-mode` 处理，但它不是默认做法。poteto 在《The Complete Guide to pstack》Part 2 补充说，她并非不做计划，而是通过代码进行计划；她也不会对抽象计划开展对抗式审查。

在 pstack 内，通过代码规划主要由以下三个组件承担。

- <strong>「Prototype」Playbook</strong>（[`playbooks/prototype.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/prototype.md)）……用可以丢弃的原型，以低成本作出设计和行为方面的判断。`/poteto-mode` 的「[Non-negotiables](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#non-negotiables)」一节要求：<strong>如果正要问人一个运行后就能观察到答案的问题，应通过这个 Playbook 制作小原型，查看运行结果后再决定</strong>。
- <strong>[`/architect`](https://github.com/cursor/plugins/blob/main/pstack/skills/architect/SKILL.md)</strong>……在实现前，确定调用该函数的代码会传入什么、得到什么，并据此设计类型和模块边界的 Skill。
- <strong>「Multi-phase or multi-PR plan」Playbook</strong>（[`playbooks/multi-phase-plan.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md)）……需要计划书时的方案。不过，其第一步指出：如果改动只涉及一两个文件，方向也很明确，就应省略计划。下一步则要求在撰写计划书前，用原型解决未回答的问题。

第三项「[<strong>Multi-phase or multi-PR plan</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md)」Playbook 确实用于制作计划书，即便如此，它仍要求先运行原型，再撰写文字。<strong>以代码为规格的立场，不仅体现在有没有专用 Skill，也体现在 Playbook 的步骤中</strong>。[第 16 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5)和[第 39 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/166acb)会详细讨论如何处理计划。

<a id="pstack%E3%81%AE%E9%83%A8%E5%93%81%E3%81%AF%E3%80%81%E8%AC%9B%E6%BC%94%E3%81%AE4%E3%81%A4%E3%81%AE%E3%83%86%E3%83%BC%E3%83%9E%E3%81%A8%E3%81%A9%E3%81%86%E5%AF%BE%E5%BF%9C%E3%81%99%E3%82%8B%E3%81%AE%E3%81%8B"></a>


## pstack 的组件如何对应演讲的四个主题

[第一部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/86acbc)逐章讨论了[演讲](https://x.com/poteto/status/2102050467505430555)的四个主题。pstack 内部各有对应的组件。本书将它们对应如下。

<table class="code-line" data-line="146">
<thead class="code-line" data-line="146">
<tr class="code-line" data-line="146">
<th>演讲主题（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/86acbc" target="_blank">第一部分</a>的章节）</th>
<th>pstack 中承担相应任务的组件</th>
<th>示例</th>
</tr>
</thead>
<tbody class="code-line" data-line="148">
<tr class="code-line" data-line="148">
<td>信任：验证成果物（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/27a183" target="_blank">第 2 章</a>）</td>
<td>验证 Skill、Verification（验证）组的 Principle（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/1fb019" target="_blank">第 19 章</a>）</td>
<td>
<code>/create-verification-skill</code>、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Prove It Works</strong></a>」</td>
</tr>
<tr class="code-line" data-line="149">
<td>提高信任的方法：让验证与步骤可复现（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5" target="_blank">第 3 章</a>）</td>
<td>Playbook、支持步骤的 Skill</td>
<td>「<strong>Bug fix</strong>」、<code>/tdd</code>、<code>/show-me-your-work</code>
</td>
</tr>
<tr class="code-line" data-line="150">
<td>作为记忆的代码库：保留判断与约束（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141" target="_blank">第 4 章</a>）</td>
<td>Meta 与 Architecture 组的 Principle（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b" target="_blank">第 18 章</a>、<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dd2d9f" target="_blank">第 21 章</a>）以及处理记录的 Skill</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-encode-lessons-in-structure/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Encode Lessons in Structure</strong></a>」、<code>/reflect</code>、<code>/why</code>
</td>
</tr>
<tr class="code-line" data-line="151">
<td>自动化：建立在基础之上（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b6ac2d" target="_blank">第 5 章</a>）</td>
<td>用于自动化的 Playbook</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autonomous-run.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Autonomous run</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/orchestrate.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Orchestrate</strong></a>」</td>
</tr>
</tbody>
</table>

pstack 将步骤（Playbook）、判断标准（Principle）和能力（Skill）分开保存，再通过入口 `/poteto-mode` 一起调用。这个机制将在[第 7 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)至[第 9 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6b7496)讨论。

<a id="pstack%E3%81%AF%E3%80%81%E3%81%A9%E3%82%93%E3%81%AA%E4%BD%9C%E6%A5%AD%E3%81%AB%E3%80%81%E3%81%A9%E3%81%86%E4%BD%BF%E3%81%88%E3%81%B0%E3%82%88%E3%81%84%E3%81%AE%E3%81%8B"></a>


## pstack 适合什么工作，应如何使用

pstack 适用于<strong>需要严谨性的工作</strong>。开始使用时，只需记住 <strong>`/setup-pstack` 和 `/poteto-mode` 这两个命令</strong>。

<a id="%E5%90%91%E3%81%8F%E3%81%AE%E3%81%AF%E3%80%81%E5%8E%B3%E5%AF%86%E3%81%95%E3%81%8C%E5%BF%85%E8%A6%81%E3%81%AA%E4%BD%9C%E6%A5%AD"></a>


### 适合需要严谨性的工作

README 建议「每当你做任何需要严谨性的事」（whenever you're doing anything that requires rigor）时使用 `/poteto-mode`。另一方面，`/poteto-mode` 的 `SKILL.md` 要求<strong>不要将其用于闲聊等轻量交流（Casual turn）</strong>（[第 7 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)）。

据此，可以将适合与不适合的工作区分如下。

- <strong>适合的工作</strong>……需要复现和验证的缺陷修复、涉及函数或模块边界设计的功能开发、希望自己离开时交由 Agent 完成的长期工作等
- <strong>不适合的工作</strong>……改正一行错字，或只需一句话就能回答的问题等

不过，即使工作适合，如果没有运行应用进行验证的手段，pstack 的步骤仍无法执行。「<strong>Bug fix</strong>」Playbook 要求的「自己复现」与「在同一操作界面（缺陷发生的同一画面或命令）验证」，都以具备验证手段为前提。因而顺序应是<strong>先准备验证 Skill，再使用 pstack</strong>。

<a id="%E3%81%BE%E3%81%A8%E3%82%81%EF%BC%9A%E9%9B%91%E3%81%AA%E3%82%B3%E3%83%BC%E3%83%89%E3%81%AE%E5%95%8F%E9%A1%8C%E3%81%AB%E3%80%81%E3%80%8C%E3%81%BE%E3%81%9A%E6%B7%B1%E3%81%8F%E3%80%8D%E3%81%A7%E7%AD%94%E3%81%88%E3%82%8B"></a>


## 小结：以「先深入工作」回应粗糙代码的问题

- <strong>要解决的问题</strong>……pstack 是对「AI 写出的粗糙代码」的回答。README 写道：「想加快速度，先深入工作。」
- <strong>回答问题的方式</strong>……三项方针是：写得更少；先与一位 Agent 深入合作，确认可以信任它写出高质量、可验证的代码，再并行执行；按角色选用模型。
- <strong>包含和未包含的内容</strong>……0.15.5 时点包含 23 个 Playbook、23 个 Principle、24 个 Skill、2 个子 Agent、10 页随附指南。`/deslop`、`control-cli`、`control-ui` 位于 `cursor-team-kit`，`/create-skill` 内置于 Cursor；特别是缺少操作 Skill 时，就无法复现和验证。没有专用的计划 Skill，是因为其立场是「最好的规格是代码」，这一立场也体现在计划 Playbook 的步骤中。
- <strong>与演讲四个主题的对应关系</strong>……信任、提高信任的方法、作为记忆的代码库、自动化，分别有对应的组件。
- <strong>适用场景和起步方式</strong>……适用于需要严谨性的工作。开始时只需记住 `/setup-pstack` 和 `/poteto-mode`。

下一章[第 7 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)将详细介绍入口 `/poteto-mode`：如何调用、调用后会发生什么、将请求分配给 Playbook 的规则，以及怎样写好请求。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](08-chapter.md) · [下一篇](10-chapter.md) · [English](../en/09-chapter.md)
