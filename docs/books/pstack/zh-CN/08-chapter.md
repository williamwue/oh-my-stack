# 第二部分：什么是 pstack

[目录](README.md) · [上一篇](07-chapter.md) · [下一篇](09-chapter.md) · [English](../en/08-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a5fb04) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/8c629d)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
第二部分通过 pstack 的设计，讲解「<strong>pstack 用哪些组件实现[第一部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/86acbc)提出的条件</strong>」。

先说结论：pstack 通过<strong>统一入口、只在需要时读取所需内容的设计</strong>来实现这些条件。

用户基本上只需记住一个入口：[`/poteto-mode`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md)。

`/poteto-mode` 根据请求的类型选择一个 Playbook；Playbook 决定工作的顺序，并在各步骤调用所需 Skill。在此过程中，Principle 作为「是否要采取这一步」「工作是否尚未完成」等判断的标准。

pstack 不会一开始就读取全部内容。它只打开符合请求的那个 Playbook；对于 Principle，则先只读清单，在条件适用时才读正文。这种设计使<strong>严格遵循步骤与节省 token</strong>得以兼顾。

<a id="%E7%AC%AC2%E9%83%A8%E3%81%A7%E5%88%86%E3%81%8B%E3%82%8B%E3%81%93%E3%81%A8"></a>


## 第二部分能学到什么

阅读第二部分后，你会明白以下几点。

- pstack 想解决什么问题，以及它为何而建
- 把请求交给 `/poteto-mode` 后会发生什么，以及如何写好请求
- Playbook、Skill、Principle 各自负责什么，有什么区别
- 「在需要时调用步骤与判断标准」的机制及其好处

[第三部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/72f8ee)到[第五部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2a4af5)会详细讨论 pstack 的所有项目。第二部分是阅读这些细节的地图。掌握组件之间的分工后，就能清楚理解每个项目「属于哪个组件、承担什么作用」。

<a id="%E3%81%93%E3%81%AE%E9%83%A8%E3%81%AE%E7%AB%A0"></a>


## 本部分的章节

<table class="code-line" data-line="23">
<thead class="code-line" data-line="23">
<tr class="code-line" data-line="23">
<th>章</th>
<th>作用</th>
</tr>
</thead>
<tbody class="code-line" data-line="25">
<tr class="code-line" data-line="25">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/33f073" target="_blank">第 6 章：pstack 解决什么问题</a></td>
<td>pstack 的整体面貌与目的：它把什么视为问题，追求什么目标</td>
</tr>
<tr class="code-line" data-line="26">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d" target="_blank">第 7 章：/poteto-mode——将请求接入适当工作方式的入口</a></td>
<td>入口的用法：请求如何分配给 Playbook，以及如何写请求</td>
</tr>
<tr class="code-line" data-line="27">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/096f3d" target="_blank">第 8 章：Playbook、Skill、Principle 分别负责什么</a></td>
<td>三种组件的作用和区别，以及子 Agent 的定位</td>
</tr>
<tr class="code-line" data-line="28">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6b7496" target="_blank">第 9 章：为什么 pstack 只读取所需内容</a></td>
<td>内容读取的设计：为什么不让 Agent 始终读取所有内容</td>
</tr>
</tbody>
</table>

[第 6 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/33f073)讨论「为什么需要」，[第 7 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)讨论「如何使用」，[第 8 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/096f3d)和[第 9 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6b7496)讨论「内部如何运作」。[开篇](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/d4d843)介绍的重复行请求，将在[第 8 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/096f3d)再次出现：该请求被分配给「[<strong>Bug fix</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md)」Playbook，作为追踪 Skill 和 Principle 在哪些环节发挥作用的示例。建议按顺序阅读各章。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](07-chapter.md) · [下一篇](09-chapter.md) · [English](../en/08-chapter.md)
