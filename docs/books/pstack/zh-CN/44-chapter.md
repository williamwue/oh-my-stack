# 第 37 章：指南二，说明目标与背景，对齐问题和历史上下文

[目录](README.md) · [上一篇](43-chapter.md) · [下一篇](45-chapter.md) · [English](../en/44-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b4b9a1) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/6a59d6)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
[第36章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)介绍了为何要先建立验证 Skill，以及如何建立、维护和使用它。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="3"><strong>验证 Skill</strong>……项目专用的 Skill，让 Agent 能启动和操作应用，并收集证据。<br/>
有了验证 Skill，Agent 就能验证自己的改动。</p>
</div></aside>

从本章到[第39章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/166acb)的三章，将讲解如何与 Agent 一起决定要做什么：解决哪个问题、采用什么设计，以及如何规划。

这三章都以《The Complete Guide to pstack》的 [Part 2](https://x.com/poteto/status/2097732320606507506) 为基础（以下三章称之为“文章”）。

Part 2 介绍了 Agent 能验证自己的工作之后，poteto 如何借助 pstack 进行调查、规划、制作原型和架构设计。

本书将文章归纳为 13 个要点。本章讨论其中的要点 1 至 4。

决定要做什么时，人首先应该做的是<strong>让 Agent 像人一样理解问题是什么，并承接过去工作的上下文</strong>。

过去工作的上下文，包括先前对话中调查过的事、做过的判断以及失败过的尝试等。

之所以要让 Agent 与人对问题有相同的理解，是因为如果双方的理解仍有偏差，<strong>即使 Agent 代码写得再好，也会解决人本来无意解决的问题</strong>。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="22">要点 3 和要点 4 使用的 <code>/how</code>、<code>/why</code>、<code>/teach</code>、<code>/recall</code> 的步骤和输出，已在<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746" target="_blank">第22章</a>介绍。</p>
<p class="code-line" data-line="24">本章略去以下内容，重点讨论文章推荐的用法。</p>
<ul class="code-line" data-line="26">
<li class="code-line" data-line="26">
<strong><code>/how</code> 的调查方式</strong>……面对复杂问题，<code>/how</code> 将收集事实和撰写说明分给不同角色，并以从 Overview 到 Gotchas 的五个标题组织说明。</li>
<li class="code-line" data-line="27">
<strong><code>/why</code> 的调查方式</strong>……<code>/why</code> 按 git、工单、聊天等证据所在位置，并行启动调查 Agent。然后将找到的每项原因按从 Direct（直接）到 Unknown（未知）的五级可信度分类。</li>
<li class="code-line" data-line="28">
<strong><code>/teach</code> 的说明方式</strong>……<code>/teach</code> 确定少数几个值得带走的要点，用一两句话回答，再等待对方回应。</li>
<li class="code-line" data-line="29">
<strong><code>/recall</code> 的输出</strong>……<code>/recall</code> 用 Capsule、Threads、Problems、Next move 四个标题总结工作状态。</li>
</ul>
</div></aside>

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章内容如下。

- 13 个要点，以及要点 1 至 4 之间的联系
- 要点 1：说明目的和背景，不过早限定解决方法
- 要点 2：实施前让 Agent 复述问题
- 要点 3：通过 /how、/why、/teach 理解机制与原因
- 要点 4：通过 /recall 将过去的工作带入新对话
- 小结

<a id="13%E3%81%AE%E8%A6%81%E7%82%B9%E3%81%A8%E3%80%81%E8%A6%81%E7%82%B91%E3%80%9C4%E3%81%AE%E3%81%A4%E3%81%AA%E3%81%8C%E3%82%8A"></a>


## 13 个要点，以及要点 1 至 4 之间的联系

<strong>这 13 个要点是本书对文章的归纳</strong>。

三章都按要点分节，每个要点有以下两个部分。

- <strong>文章的观点</strong>……文章建议什么
- <strong>pstack</strong>……pstack 的哪个 Skill 或 Playbook 实现了这一观点

如果某个要点在 pstack 中没有直接对应的内容，就省略 pstack 部分。

13 个要点如下。

<table class="code-line" data-line="56">
<thead class="code-line" data-line="56">
<tr class="code-line" data-line="56">
<th>No.</th>
<th>Part 2 中对应的章节</th>
<th>概要</th>
</tr>
</thead>
<tbody class="code-line" data-line="58">
<tr class="code-line" data-line="58">
<td>1</td>
<td>『The art of supervising someone smarter than you』『In your own words』</td>
<td>人向 Agent 充分说明目的和背景，不把具体解决方案定得过死，为 Agent 寻找人未想到的方法留下空间</td>
</tr>
<tr class="code-line" data-line="59">
<td>2</td>
<td>『In your own words』</td>
<td>人让 Agent 在实施前用自己的话说明问题，从而尽早发现 Agent 的误解，也避免用自己的假设限制 Agent 的调查方向</td>
</tr>
<tr class="code-line" data-line="60">
<td>3</td>
<td>『Building up a mental model』</td>
<td>人让 Agent 用 <code>/how</code> 调查当前机制，用 <code>/why</code> 调查设计背景，再通过 <code>/teach</code> 得到人能理解的说明。为解释而进行的调查，也有助于 Agent 自己理解</td>
</tr>
<tr class="code-line" data-line="61">
<td>4</td>
<td>『Learning from history』</td>
<td>人让 Agent 用 <code>/recall</code> 回顾过去对话中相关的工作，把先前的调查、判断和失败带入新工作，使 Agent 不只根据眼前的症状考虑解决方法</td>
</tr>
<tr class="code-line" data-line="62">
<td>5</td>
<td>『Working backwards』</td>
<td>人让 Agent 在实施前编写 README 或教程，从用户如何使用出发，思考 API 和内部设计</td>
</tr>
<tr class="code-line" data-line="63">
<td>6</td>
<td>『Working backwards』</td>
<td>Agent 用 <code>/technical-writing</code> 按教程、操作指南、参考资料和解释等用途整理文档，并通过其内部使用的 <code>/unslop</code> 去掉 AI 容易写出的不自然措辞</td>
</tr>
<tr class="code-line" data-line="64">
<td>7</td>
<td>『Measure a hundred times, cut once』</td>
<td>人不直接采纳 Agent 的第一个设计，而是让 Agent 制作多个方案的原型，比较实际操作时的截图、测得的时间或布局</td>
</tr>
<tr class="code-line" data-line="65">
<td>8</td>
<td>『Measure a hundred times, cut once』『Architecting bigger changes』</td>
<td>对于能通过做出小实验并运行来回答的疑问，人让 Agent 自己验证。通过原型和验证减少不确定性，而不是反复审查抽象计划</td>
</tr>
<tr class="code-line" data-line="66">
<td>9</td>
<td>『Architecting bigger changes』</td>
<td>面对较大的改动，人把时间用于思考数据如何存放以及系统之间如何协作。Agent 用 <code>/architect</code> 调查现有约束并设计，比较、整合多个模型独立提出的方案，然后实施</td>
</tr>
<tr class="code-line" data-line="67">
<td>10</td>
<td>『Architecting bigger changes』</td>
<td>如果实施中发现与设计不符，Agent 重新审视设计。根据实施得到的证据（例如类型需要 <code>any</code> 或强制类型转换），Agent 有时会舍弃设计、重新开始</td>
</tr>
<tr class="code-line" data-line="68">
<td>11</td>
<td>『Okay but I really want a planning doc』</td>
<td>设计具体化后，Agent 用规划 Playbook 将工作拆成可小范围验证的任务或 PR，并为每项工作规定实际运行代码得到的结果作为完成证据</td>
</tr>
<tr class="code-line" data-line="69">
<td>12</td>
<td>『Okay but I really want a planning doc』</td>
<td>规划 Playbook 生成的计划文档是临时文档，用于执行任务，并在大型工作中向其他 Agent 分享进度；poteto 通常在完成后将其删除</td>
</tr>
<tr class="code-line" data-line="70">
<td>13</td>
<td>『The workflow in practice』</td>
<td>
<code>/poteto-mode</code> 是按请求选用 Playbook 和 Skill 的入口。人向 <code>/poteto-mode</code> 说明目的、约束、要确认的结果和审查时机</td>
</tr>
</tbody>
</table>

表中“Part 2 中对应的章节”是讨论该要点的文章小节名，可在重读文章时作为线索。

<a id="%E8%A6%81%E7%82%B91%E3%80%9C4%E3%81%AF%E3%80%81%E7%9B%A3%E7%9D%A3%E3%81%AE%E5%9F%BA%E6%9C%AC%E5%8B%95%E4%BD%9C"></a>


### 要点 1 至 4 是监督工作的基本动作

逐一讨论要点 1 至 4 之前，先看这四个动作服务于什么工作。

文章的“The art of supervising someone smarter than you”一节讨论的是“人监督比自己更聪明的对象（最新模型）”这项工作。

借助 Agent，即使不熟悉代码，人也能修改系统。然而，<strong>保持代码和用户体验的高质量仍然困难</strong>；如果人不是知道该检查什么、该问什么的专家，就更难做到。

接下来的“In your own words”一节指出，这项监督工作发生在<strong>人没有亲自编写代码库，而且已经无法在脑中掌握整个代码库结构的情况下</strong>。

<strong>本书将要点 1 至 4 定位为这项工作的基本动作</strong>。

- <strong>如何表达（要点 1）</strong>……请求中应该说明什么，又不该过度说明什么
- <strong>如何确认理解（要点 2）</strong>……如何在实施前确认 Agent 的理解是否偏离人的意图
- <strong>如何加深人的理解（要点 3）</strong>……人如何理解代码现在怎样运行、当初为何这样写
- <strong>如何承接过去的工作（要点 4）</strong>……如何把先前的调查、判断和失败交给新对话中的 Agent

<a id="%E8%A6%81%E7%82%B91%EF%BC%9A%E7%9B%AE%E7%9A%84%E3%81%A8%E8%83%8C%E6%99%AF%E3%82%92%E4%BC%9D%E3%81%88%E3%80%81%E8%A7%A3%E6%B1%BA%E6%96%B9%E6%B3%95%E3%82%92%E6%B1%BA%E3%82%81%E3%81%99%E3%81%8E%E3%81%AA%E3%81%84"></a>


## 要点 1：说明目的和背景，不过早限定解决方法

人应在请求中充分说明<strong>目的、背景、约束和已知事实</strong>，但<strong>不要把具体方案写得过细（例如哪个文件的哪个函数要如何修改，或具体实施步骤）</strong>。

<a id="%E8%A8%98%E4%BA%8B%E3%81%AE%E8%80%83%E3%81%88%EF%BC%9A%E8%83%8C%E6%99%AF%E3%81%AF%E6%B8%A1%E3%81%97%E3%80%81%E8%A7%A3%E3%81%8D%E6%96%B9%E3%81%AE%E8%87%AA%E7%94%B1%E3%81%AF%E6%AE%8B%E3%81%99"></a>


### 文章的观点：提供背景，保留解法的自由

在“The art of supervising someone smarter than you”一节，poteto 指出，<strong>即使模型能力提升，仍反复出现以下两种失败</strong>。

- 请求中的指示不足或不清楚，以至 Agent 无法完全理解人的意图
- Agent 缺少正确推进工作所需的上下文

这两个问题彼此相关，归结为一点：

“<strong>能否用好 Agent，取决于人能向 Agent 的上下文窗口放入多少高质量上下文</strong>。”

上下文窗口，是 Agent 一次能读入的信息范围。

据“In your own words”一节，poteto 过去会非常具体地告诉旧模型自己想让它做什么，几乎到了事无巨细地管理的程度。

但最新模型比人更擅长写代码。因此，在说明想要达成什么的同时，<strong>也给 Agent 留下用人未曾想到的方法解决问题的自由</strong>，是“监督比自己更聪明的对象”时的重要做法。

<a id="pstack%EF%BC%9A%E6%89%8B%E9%A0%86%E3%81%AFplaybook%E3%81%8C%E6%B1%BA%E3%82%81%E3%82%8B"></a>


### pstack：步骤由 Playbook 决定

在 pstack 中，用户说明目的、约束和已知事实，步骤则写在 Playbook 中（[第7章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)）。

随附指南 [`docs/guide/02-poteto-mode.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/02-poteto-mode.md) 的“Say the goal, not the ceremony”一节，也建议用户不要在请求里写规范，而要说明：

- 问题是什么，或想要什么
- 能省去 Agent 调查时间的已知事实（如果有）

该页面给出了下面这行请求作为例子（[第7章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)也讨论过）：

```
/poteto-mode users get two notifications after a retry. repro first, then fix and verify.
// 再試行の後、ユーザーに通知が2回届く。まず再現して、それから直して、確かめて。
```

这条请求<strong>说明了现象（重试后用户收到两次通知）和要遵守的约束（先复现），没有写具体方案，例如修改哪个文件的哪个函数</strong>。

因为请求是修复缺陷，`/poteto-mode` 会选择修复缺陷的“[<strong>Bug fix</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md)”Playbook，并把其步骤（复现、缩小原因范围、规划修复、确认结果等）写入 TODO 列表。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="133"><strong>TODO 列表</strong>……Agent 在工作开始时建立的本次任务清单（计划）。用户可以查看清单，确认 Agent 推进了哪些步骤，又跳过了哪些步骤（<code>skip: &lt;理由&gt;</code>）（随附指南 <a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md" rel="nofollow noopener noreferrer" target="_blank"><code>01-setup.md</code></a>）。在 Cursor 中，这份清单显示在聊天界面。</p>
</div></aside>

`02-poteto-mode.md` 在页面末尾的 Pitfall（陷阱）中提醒用户，不要在请求中按使用顺序罗列 Skill，例如“先 `/how` 再 `/architect`”。因为 Playbook 已经决定了工作顺序。

据这一 Pitfall，<strong>如果依照用户写出的顺序，Agent 可能会调换或省略原本遵循 Playbook 时会执行的步骤</strong>。

不过，`02-poteto-mode.md` 并不禁止提到 Skill 名称。它建议只在想覆盖某项特定选择时才写出 Skill 名称（[第7章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)）。

因此，如果步骤已经写在 Playbook 中，<strong>用户只需在请求里说明问题是什么、想要什么、需要遵守哪些约束，以及已知事实，而无须写工作步骤</strong>。

<a id="%E8%A6%81%E7%82%B92%EF%BC%9A%E5%AE%9F%E8%A3%85%E5%89%8D%E3%81%AB%E3%80%81%E5%95%8F%E9%A1%8C%E3%82%92%E8%A8%80%E3%81%84%E7%9B%B4%E3%81%95%E3%81%9B%E3%82%8B"></a>


## 要点 2：实施前让 Agent 复述问题

人让 Agent 在实施前<strong>用自己的话复述问题</strong>，以确认 Agent 的理解与人的意图是否有偏差。

<a id="%E8%A8%98%E4%BA%8B%E3%81%AE%E8%80%83%E3%81%88%EF%BC%9Aindirect-prompt%E3%81%AE3%E3%81%A4%E3%81%AE%E5%8A%B9%E6%9E%9C"></a>


### 文章的观点：indirect prompt 的三个效果

“In your own words”一节将一种技法称为 <strong>indirect prompt</strong>（直译为“间接提示”）：人不直接把想让 Agent 做的事告诉它，而是引导 Agent 用自己的话说出来。

poteto 说，当有人在 Slack 报告问题时，他常常会<strong>在让 Agent 做其他事之前，先让它阅读讨论串并复述问题</strong>。示例请求如下。

```
/poteto-mode read this slack thread. restate in your own words and in plain english what you think the underlying issue is
// このSlackのスレッドを読んで。根本の問題が何だと思うかを、自分の言葉で、平易に言い直して。
```

poteto 列出这种请求的三个效果。

- <strong>梳理对话</strong>……Agent 阅读发言交错的讨论串，把问题整理成简短的说明
- <strong>尽早发现误解</strong>……如果 Agent 误解了问题，人可以在它写代码之前指出并纠正
- <strong>避免强加假设</strong>……因为人没有先说出自己的假设，Agent 可以不受其影响地理解问题。人的假设可能有误；即使没错，也可能限制 Agent 的调查和解决方案的方向

这样使用 indirect prompt，可以减少返工，让双方在共享前提和认识之后再推进工作。

另外，poteto 在 2026 年 9 月末发布了下面这条帖子，介绍 indirect prompt 的具体例子；照着复制粘贴，应该就能得到预期的结果。

<span class="embed-block zenn-embedded zenn-embedded-tweet"><iframe data-content="https%3A%2F%2Fx.com%2Fpoteto%2Fstatus%2F2104744961904394699" frameborder="0" id="zenn-embedded__20cf0ea5d4b66" scrolling="no" src="https://embed.zenn.studio/tweet#zenn-embedded__20cf0ea5d4b66"></iframe></span><https://x.com/poteto/status/2104744961904394699>

> 最近，这已经成为我最常用的提示词之一：
>
> 请用你自己的话复述，你认为我的目标是什么，以及我想解决什么问题。

<a id="%E8%A6%81%E7%82%B93%EF%BC%9A%2Fhow%E3%83%BB%2Fwhy%E3%83%BB%2Fteach%E3%81%A7%E3%80%81%E4%BB%95%E7%B5%84%E3%81%BF%E3%81%A8%E7%90%86%E7%94%B1%E3%82%92%E7%9F%A5%E3%82%8B"></a>


## 要点 3：通过 /how、/why、/teach 理解机制与原因

人让 Agent 用 `/how` 调查代码现在怎样运行，用 `/why` 调查当初为何那样写，再通过 `/teach` 得到<strong>人能理解的说明</strong>。

<a id="%E8%A8%98%E4%BA%8B%E3%81%AE%E8%80%83%E3%81%88%EF%BC%9A3%E3%81%A4%E3%81%AEskill%E3%81%A7%E7%90%86%E8%A7%A3%E3%81%99%E3%82%8B"></a>


### 文章的观点：用三个 Skill 加深理解

poteto 在“Building up a mental model”一节写道，与比自己更聪明的对象合作时，让 Agent 用人能理解的方式重新解释很重要。`/teach` 就是实现这一点的 Skill。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="184"><strong>心智模型</strong>……人根据过去的经验和环境，在无意识中形成的“理解事物和思考问题的框架（固有想法）”。</p>
</div></aside>

`/teach` 会在内部调用 `/how` 和 `/why`。

<table class="code-line" data-line="189">
<thead class="code-line" data-line="189">
<tr class="code-line" data-line="189">
<th>Skill</th>
<th>作用</th>
</tr>
</thead>
<tbody class="code-line" data-line="191">
<tr class="code-line" data-line="191">
<td><code>/how</code></td>
<td>追踪代码运行时的行为</td>
</tr>
<tr class="code-line" data-line="192">
<td><code>/why</code></td>
<td>从 Git 历史、PR 审查评论、工单、设计资料等调查代码为什么写成这样（动机和意图）</td>
</tr>
<tr class="code-line" data-line="193">
<td><code>/teach</code></td>
<td>
把 <code>/how</code> 和 <code>/why</code> 查到的内容整理成人能理解的浅显说明，使人更好地理解 Agent 的工作</td>
</tr>
</tbody>
</table>

之所以需要 `/why`，是因为阅读代码虽然能知道发生了什么，却<strong>几乎无法知道写代码的人为什么这样写</strong>。

以下是这三个 Skill 的示例请求。  
第一个例子中的“虚拟化”，指长列表只渲染屏幕上可见部分的机制。

```
/how is virtualization implemented?
// 仮想化はどう実装されている？

/why are we still stuck an old version of node.js?
// なぜ、まだ古いバージョンのNode.jsから抜け出せていないのか？

/teach me why you implemented it this way and not <other way>. what were the tradeoffs you made and why?
// なぜ<別の方法>ではなくこの方法で実装したのかを教えて。どんなトレードオフを選び、それはなぜか。
```

除了帮助人理解，`/teach` 还有一个效果：<strong>为向人解释而进行的调查，也能帮助 Agent 自己</strong>。

poteto 说：“即使最新模型也常在没有数据佐证、没有阅读理解机制所需代码的情况下，自信地断言”（他补充说，程度也取决于运行 Agent 的工具质量）。

因此，向人说明接下来要做什么以及为什么这样做，本身也能帮助 Agent。

<a id="pstack%EF%BC%9A%2Fteach-%E3%81%AF%E7%A2%BA%E3%81%8B%E3%81%95%E3%81%AE%E8%A8%80%E8%91%89%E3%82%92%E6%AE%8B%E3%81%99"></a>


### pstack：/teach 保留表达可信度的措辞

`/why` 会按“这一原因得到记录的支持程度”，为找到的每项原因标注五级可信度。`/teach` 汇总并解释 `/why` 的结果。

`/teach` 的 [`SKILL.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/teach/SKILL.md) 允许为了说明而自由调整措辞，但设了一个例外。原文如下。

> Keep `why`'s confidence language intact (its hedges are findings, not style).
>
> 保留 `why` 表达可信度的措辞（其中的保留性表述是调查结果，不是文风）。

换言之，`/teach` 不改动“似乎”“可以认为”等表达可信度的词，是因为<strong>这些词并非写作习惯，而是 `/why` 查出的结果本身：该原因究竟有多确定</strong>。

因此，如果 `/why` 将某个原因列为推测，`/teach` 的说明也会将其作为推测传达。

<a id="%E8%A6%81%E7%82%B94%EF%BC%9A%2Frecall%E3%81%A7%E3%80%81%E9%81%8E%E5%8E%BB%E3%81%AE%E4%BD%9C%E6%A5%AD%E3%82%92%E6%96%B0%E3%81%97%E3%81%84%E4%BC%9A%E8%A9%B1%E3%81%B8%E5%BC%95%E3%81%8D%E7%B6%99%E3%81%90"></a>


## 要点 4：通过 /recall 将过去的工作带入新对话

人让 Agent 用 `/recall` 回顾过去对话中相关的工作，<strong>把先前的调查、判断和失败带入新工作</strong>。

之所以连失败也要带过去，是因为<strong>如果不知道此前失败的方法，Agent 可能会再次尝试同一种方法</strong>。

<a id="%E8%A8%98%E4%BA%8B%E3%81%AE%E8%80%83%E3%81%88%EF%BC%9A%2Frecall-%E3%81%A7%E3%80%81%E3%82%B3%E3%83%B3%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%82%92%E6%9C%80%E5%88%9D%E3%81%8B%E3%82%89%E7%A9%8D%E3%81%BF%E7%9B%B4%E3%81%95%E3%81%AA%E3%81%84"></a>


### 文章的观点：用 /recall 避免从头重建上下文

poteto 在“Learning from history”一节，写了自己修复 Cursor 中报告的虚拟化缺陷和性能问题时的经历。

先前对话中的 Agent 在解决类似问题时，往往积累了丰富的上下文。但每次打开新聊天，又得几乎从头重建这些上下文。

由此可见，<strong>过去的对话记录常常保存着先前 Agent 掌握的大量上下文</strong>。

`/recall` 就是为应对这一问题而设的 Skill。

`/recall` 从聊天历史提取近期上下文，让新对话中的 Agent 也能带着所需信息继续工作。

示例请求如下。

```
/recall the work i did yesterday on virtualization and then read this bug report on slack
// 昨日やった仮想化の作業を思い出して。それから、Slackのこの不具合報告を読んで。
```

<a id="pstack%EF%BC%9A%2Frecall-%E3%81%AF%E5%A4%B1%E6%95%97%E3%81%AE%E8%A8%98%E9%8C%B2%E3%82%82%E9%9B%86%E3%82%81%E3%82%8B"></a>


### pstack：/recall 也收集失败记录

[`/recall`](https://github.com/cursor/plugins/blob/main/pstack/skills/recall/SKILL.md) 会调查用户自己的聊天历史。如果调查主题指明了某项功能、文件或缺陷，还会查看保存在以下地方的团队共享记录。

- 源代码管理
- 工单
- 聊天
- 错误监控

共享记录中保存着过去失败的记录等重要上下文，例如发布后被撤回的修复，或在生产环境中持续出现的错误。

而且，`/recall` 可以返回<strong>此前试过什么、哪些改动被撤回</strong>（[第22章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746)）。

这样，Agent 就能从上一次失败的地方开始下一次尝试。

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 小结

- <strong>要点 1 至 4 的联系</strong>……本书将要点 1 至 4 定位为监督比自己更聪明的模型所需的基本动作。
- <strong>要点 1：说明目的和背景，不过早限定解决方法</strong>……人在请求中说明目的、背景、约束和已知事实，不把具体解决方法定得过死。
- <strong>要点 2：实施前让 Agent 复述问题</strong>……人在实施前让 Agent 用自己的话复述问题。
- <strong>要点 3：通过 /how、/why、/teach 理解机制与原因</strong>……人让 Agent 用 `/how` 和 `/why` 调查，通过 `/teach` 的说明理解代码现在怎样运行，以及当初为何这样写。
- <strong>要点 4：通过 /recall 将过去的工作带入新对话</strong>……人让 Agent 用 `/recall` 回顾过去对话中相关的工作，把先前的调查、判断和失败带入新工作。

下一章[第38章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7549a7)将讨论“尝试解决方案”阶段的要点 5 至 8。

这四个要点分别是：实施前写出用户的使用方式（要点 5）；按用途区分文档（要点 6）；制作多个方案的原型并比较（要点 7）；让 Agent 通过实验验证疑问（要点 8）。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](43-chapter.md) · [下一篇](45-chapter.md) · [English](../en/44-chapter.md)
