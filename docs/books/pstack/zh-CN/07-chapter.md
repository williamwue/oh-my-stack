# 第 5 章：在信任的基础上建立自动化

[目录](README.md) · [上一篇](06-chapter.md) · [下一篇](08-chapter.md) · [English](../en/07-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b6ac2d) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/aa6858)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
自动化<strong>只有在成果物能够验证、工作步骤已经确定、过去的判断保存在代码库中时，才能发挥作用</strong>。

因此，poteto 在[演讲](https://x.com/poteto/status/2102050467505430555)中把自动化放在四个主题的最后。

本章依次讲解为什么要把自动化放在最后、哪些工作可以先自动化、基础齐备时能自动化什么，以及自动化之后人还要做什么。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章按以下顺序展开。

- 为什么把自动化放在最后
- 哪些工作可以开始自动化
- 基础齐备时能自动化什么
- 自动化之后，人还要做什么
- 小结：自动化是建立在信任和记忆之上的最后一步

<a id="%E3%81%AA%E3%81%9C%E8%87%AA%E5%8B%95%E5%8C%96%E3%82%92%E6%9C%80%E5%BE%8C%E3%81%AB%E7%BD%AE%E3%81%8F%E3%81%AE%E3%81%8B"></a>


## 为什么把自动化放在最后

原因有以下两个。

1. <strong>没有基础就自动化，增加的不是成果，而是无法检查的成果物和反复出现的失败</strong>
2. <strong>仅凭 Agent 的能力无法维持稳定的质量，必须先有能让它发挥能力的环境</strong>

<a id="%E5%9C%9F%E5%8F%B0%E3%81%AE%E3%81%AA%E3%81%84%E8%87%AA%E5%8B%95%E5%8C%96%E3%81%AF%E3%80%81%E7%A2%BA%E8%AA%8D%E3%81%A7%E3%81%8D%E3%81%AA%E3%81%84%E6%88%90%E6%9E%9C%E7%89%A9%E3%82%92%E5%A2%97%E3%82%84%E3%81%99"></a>


### 没有基础的自动化会增加无法检查的成果物

先看第一个原因。演讲按缺失的基础分别说明，在基础欠缺时自动化会发生什么。

<table class="code-line" data-line="27">
<thead class="code-line" data-line="27">
<tr class="code-line" data-line="27">
<th>缺失的基础</th>
<th>自动化后的结果</th>
</tr>
</thead>
<tbody class="code-line" data-line="29">
<tr class="code-line" data-line="29">
<td>无法信任工作成果（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/27a183" target="_blank">第 2 章</a>、<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5" target="_blank">第 3 章</a>）</td>
<td>无法确认正确性的成果物增加</td>
</tr>
<tr class="code-line" data-line="30">
<td>没有留下过去的判断（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141" target="_blank">第 4 章</a>）</td>
<td>一再重复同样的失败</td>
</tr>
<tr class="code-line" data-line="31">
<td>多种实现方式毫无秩序地保留下来（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141" target="_blank">第 4 章</a>）</td>
<td>大量产生不理想的模式</td>
</tr>
</tbody>
</table>

这些情况的共同点是：<strong>自动化会把基础本身已有的问题原样大量复制</strong>。因此，<strong>自动化要放在三项基础齐备后的最后阶段</strong>。

<a id="%E3%83%9F%E3%82%B7%E3%83%A5%E3%83%A9%E3%83%B3%E3%81%AE%E5%8E%A8%E6%88%BF%E3%81%AB%E3%81%AF%E3%80%81%E6%96%99%E7%90%86%E4%BA%BA%E3%81%AE%E8%85%95%E3%81%A0%E3%81%91%E3%81%A7%E3%81%AA%E3%81%8F%E6%89%8B%E9%A0%86%E3%81%A8%E9%81%93%E5%85%B7%E3%81%8C%E5%BF%85%E8%A6%81"></a>


### 米其林餐厅的厨房不仅需要厨师的本领，还需要步骤和工具

第二个原因通过米其林餐厅的厨房这个比喻来说明。

演讲将 Agent、开发工具、验证与自动化结合起来，持续制作软件变更的机制称为「软件工厂」，也把同样的机制比作「米其林餐厅的厨房」。

一家能够稳定提供高品质料理的厨房，只有优秀的厨师还不够，还需要以下机制。

- 烹饪步骤
- 工具
- 食材管理
- 卫生标准
- 职责分工
- 质量检查机制

Agent 开发同样如此：<strong>不能只期待 Agent 自身的能力，而必须设计一个使它安全发挥能力的环境</strong>。

第 2 至第 4 章讨论的验证工具、工作步骤，以及作为记忆的代码库，正是这个环境的组成部分。

<a id="%E3%81%A9%E3%81%AE%E4%BB%95%E4%BA%8B%E3%81%8B%E3%82%89%E8%87%AA%E5%8B%95%E5%8C%96%E3%81%97%E3%81%A6%E3%82%88%E3%81%84%E3%81%AE%E3%81%8B"></a>


## 哪些工作可以开始自动化

可以自动化的是<strong>同时满足以下五个条件的工作</strong>。  
每个条件都已在前面的章节讨论过。

<table class="code-line" data-line="59">
<thead class="code-line" data-line="59">
<tr class="code-line" data-line="59">
<th>自动化前需要具备的条件</th>
<th>本书相关章节</th>
</tr>
</thead>
<tbody class="code-line" data-line="61">
<tr class="code-line" data-line="61">
<td>能够直接验证成果物</td>
<td>
<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/27a183" target="_blank">第 2 章</a>、<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5" target="_blank">第 3 章</a>（方法 1）</td>
</tr>
<tr class="code-line" data-line="62">
<td>已经定义了高质量的工作步骤</td>
<td>
<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5" target="_blank">第 3 章</a>（方法 2）</td>
</tr>
<tr class="code-line" data-line="63">
<td>过去的判断保存在代码库中</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141" target="_blank">第 4 章</a></td>
</tr>
<tr class="code-line" data-line="64">
<td>推荐的实现方式已经明确</td>
<td>
<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141" target="_blank">第 4 章</a>（一条铺好的路）</td>
</tr>
<tr class="code-line" data-line="65">
<td>能够自动阻止不理想的实现</td>
<td>
<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5" target="_blank">第 3 章</a>（将教训留在机制中）、<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141" target="_blank">第 4 章</a>
</td>
</tr>
</tbody>
</table>

<a id="%E5%9C%9F%E5%8F%B0%E3%81%8C%E3%81%9D%E3%82%8D%E3%81%A3%E3%81%9F%E3%81%A8%E3%81%8D%E3%80%81%E4%BD%95%E3%82%92%E8%87%AA%E5%8B%95%E5%8C%96%E3%81%A7%E3%81%8D%E3%82%8B%E3%81%AE%E3%81%8B"></a>


## 基础齐备时能自动化什么

基础齐备后，<strong>可以自动化处理用户提交的缺陷报告，让 Agent 自动尝试复现。若验证 Skill 和 Feature Map 足够完善，还有自动推进到修复的设想</strong>。

演讲描述的最终形态是：具备[上一节](#%E3%81%A9%E3%81%AE%E4%BB%95%E4%BA%8B%E3%81%8B%E3%82%89%E8%87%AA%E5%8B%95%E5%8C%96%E3%81%97%E3%81%A6%E3%82%88%E3%81%84%E3%81%AE%E3%81%8B)的条件后，组合多个 Agent 和工具，持续实现、验证软件变更并将其发布到生产环境。下面先看组成这一机制的要素，再看自动复现报告的例子。

<a id="%E6%A7%8B%E6%88%90%E8%A6%81%E7%B4%A0%E3%81%AF%E3%80%81%E6%9D%A1%E4%BB%B6%E3%82%92%E6%95%B4%E3%81%88%E3%81%9F%E3%81%86%E3%81%88%E3%81%A7%E7%B5%84%E3%81%BF%E5%90%88%E3%82%8F%E3%81%9B%E3%82%8B"></a>


### 先具备条件，再组合各项组件

演讲列出以下四个组成该机制的要素。它们都要在上一节的条件具备之后组合使用。

- <strong>Grok Bot</strong>……一款 AI Bot 应用，可以将 pstack 作为插件安装使用
- <strong>Cloud Agents</strong>……运行在 Cursor 云端基础设施（虚拟环境）上的 Agent
- <strong>automations</strong>……在预定时间或事件发生时运行处理的机制
- <strong>Agent SDK</strong>……通过程序调用 Agent 的开发套件

《The Complete Guide to pstack》的 [Part 1](https://x.com/poteto/status/2094457600259842065) 如下说明其中三项的使用方式。

- <strong>Cloud Agents</strong>……每个 Agent 都在专属的真实计算机上运行，可以安装依赖、运行应用，并录制视频或拍摄截图
- <strong>Grok Bot</strong>……不让 Bot 自己执行具体工作，而让它启动 Cloud Agents。这样 Bot 可以腾出手，也不会因阅读代码、运行命令等琐碎交互而耗尽自己的上下文窗口；<strong>Bot 作为管理和监督 Cloud Agents 的协调者</strong>
- <strong>Grok Bot 的 routines、Cursor Automations</strong>……对验证 Skill 满意之后，将其接入这些机制，让它在预定时间或事件触发时执行

<a id="%E5%A0%B1%E5%91%8A%E3%81%AE%E8%87%AA%E5%8B%95%E5%86%8D%E7%8F%BE%E3%81%AF%E3%80%81%E5%9C%9F%E5%8F%B0%E3%81%AE%E5%87%BA%E6%9D%A5%E3%81%8C%E3%81%9D%E3%81%AE%E3%81%BE%E3%81%BE%E7%B5%90%E6%9E%9C%E3%81%AB%E5%87%BA%E3%82%8B"></a>


### 自动复现报告的结果直接取决于基础的质量

自动复现报告，是一个能清楚显示自动化成效取决于基础质量的例子。

《The Complete Guide to pstack》Part 1 提出以下自动化用法。

1. 让 Bot 监听接收用户反馈的 Slack 频道或内部反馈频道
2. 每当报告到来时，自动让 Cloud Agents 尝试复现
3. 如果验证 Skill 和 Feature Map 足够好，还可考虑自动推进到修复

第三项附带「如果验证 Skill 和 Feature Map 足够好」这一条件。由此可以看出，<strong>自动化能推进到什么程度，取决于用于操作并检查应用的工具（[第 3 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5)），以及按功能记录用法和验证方式的记忆（Feature Map，[第 4 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141)）的质量</strong>。

<a id="%E8%87%AA%E5%8B%95%E5%8C%96%E3%81%97%E3%81%9F%E3%81%82%E3%81%A8%E3%80%81%E4%BA%BA%E9%96%93%E3%81%AB%E3%81%AF%E4%BD%95%E3%81%8C%E6%AE%8B%E3%82%8B%E3%81%AE%E3%81%8B"></a>


## 自动化之后，人还要做什么

人仍要<strong>决定方向，并承担最终责任</strong>。

Agent 在步骤与约束明确的环境中工作。如果这个环境足够完善，人不必时时在旁监督；即使人离开座位，Agent 也能保持一定的工作质量。

pstack 入口 [`/poteto-mode`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md) 的「[Autonomy](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#autonomy)」一节具体界定了人和 Agent 的边界：<strong>可撤销的工作可以不经人的确认继续进行；在向共享分支 force-push、部署、删除数据、向客户发送消息等不可撤销的写入之前，则必须等待人的决定</strong>（[第 35 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4f8911)）。

这条边界背后的思路也体现在 Principle「[<strong>Never Block on the Human</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-never-block-on-the-human/SKILL.md)」中，将在[第 20 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/c155cc)讨论。

同一条边界也写在各个 Playbook 中。负责将 PR 推进至可合并状态的「<strong>Babysit</strong>」Playbook（[`playbooks/babysit.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md)）不会自行合并。如果人明确要求合并，它会交给负责合并的「[<strong>Shipping</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/shipping.md)」Playbook。即使所有检查都通过，[随附指南](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md)也说明不自行合并的原因：合并是一项独立的决定。

演讲还谈到更远的前景：如果代码库能够向形式化验证代码正确性的方向发展，对 Agent 成果物的信任就会增强。或许终有一天，人工代码审查本身会成为例外，而非常规工作。

<a id="%E3%81%BE%E3%81%A8%E3%82%81%EF%BC%9A%E8%87%AA%E5%8B%95%E5%8C%96%E3%81%AF%E3%80%81%E4%BF%A1%E9%A0%BC%E3%81%A8%E8%A8%98%E6%86%B6%E3%81%AE%E4%B8%8A%E3%81%AB%E6%9C%80%E5%BE%8C%E3%81%AB%E7%A9%8D%E3%82%80"></a>


## 小结：自动化是建立在信任和记忆之上的最后一步

- <strong>为什么把自动化放在最后</strong>……没有基础就自动化，会增加无法检查的成果物、反复出现的失败和不理想的模式。正如演讲用米其林餐厅的厨房作比喻，除了 Agent 的能力，还需要能让能力发挥出来的环境。
- <strong>哪些工作可以开始自动化</strong>……从满足本书整理出的全部五个条件的工作开始：能够直接验证、步骤明确、判断得到保存、推荐的实现方式明确、能自动阻止不理想的实现。
- <strong>能自动化什么</strong>……可以自动化复现用户缺陷报告；若验证 Skill 与 Feature Map 足够完善，还有自动推进到修复的设想。Grok Bot、Cloud Agents、automations 和 Agent SDK 应在条件具备后组合使用。
- <strong>人还要做什么</strong>……决定方向并承担最终责任。`/poteto-mode` 规定，在不可撤销的操作前必须停下来等待。

[第一部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/86acbc)没有过多讨论 pstack 的具体组件，而是沿着演讲的四个主题（信任、提高信任的方法、作为记忆的代码库、自动化）探讨委派工作的条件。[第二部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a5fb04)将讨论 pstack 如何通过 Skill、Playbook 和 Principle 这些组件实现这些条件。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](06-chapter.md) · [下一篇](08-chapter.md) · [English](../en/07-chapter.md)
