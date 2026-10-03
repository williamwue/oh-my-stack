# 第一部分：支撑每月 2,500 个 PR 的开发基础

[目录](README.md) · [上一篇](01-preface.md) · [下一篇](03-chapter.md) · [English](../en/02-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/86acbc) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/367ace)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
第一部分讨论「<strong>能够把工作交给 Agent，需要什么条件</strong>」。

要满足这些条件，在提高速度之前，必须先建立能够验证成果的机制和工作步骤等环境。

具体来说，有四个条件；前一个条件是下一个条件的前提和基础。

1. Agent 自己能够运行并检查它制作的东西（成果物），也就是验证
2. 明确验证方法和工作步骤，使任何人执行都能以稳定的质量复现
3. 将过去的判断和约束保存在代码库中，供下一项工作参考
4. 在具备前三项基础后，再实行自动化

每月 2,500 个 PR，是建立这四项条件之后产生的结果。如果只把数字当成目标，跳过第 1 至第 3 项就着手第 4 项，增加的将不是成果，而是<strong>无从验证的变更</strong>。

<a id="%E7%AC%AC1%E9%83%A8%E3%81%A7%E5%88%86%E3%81%8B%E3%82%8B%E3%81%93%E3%81%A8"></a>


## 第一部分能学到什么

阅读第一部分后，你会明白以下几点。

- 2,500 这个数字不意味着什么
- 如果不信任 Agent，应该信任什么
- 如何让验证不止于一次性检查，而成为任何人都能再次执行的机制
- 为什么要把 Agent 的记忆放在代码库里，而不是放在对话或笔记里
- 为什么自动化要放在最后，以及自动化前必须具备哪些条件

第一部分很少具体讲解 pstack 的各个组件。它讨论的是无论是否使用 pstack 都适用的思路。从[第二部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a5fb04)起，本书会将 pstack 的各个组件与这些思路联系起来。

<a id="%E3%81%93%E3%81%AE%E9%83%A8%E3%81%AE%E7%AB%A0"></a>


## 本部分的章节

<table class="code-line" data-line="27">
<thead class="code-line" data-line="27">
<tr class="code-line" data-line="27">
<th>章</th>
<th>作用</th>
</tr>
</thead>
<tbody class="code-line" data-line="29">
<tr class="code-line" data-line="29">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/74ae41" target="_blank">第 1 章：2,500 个 PR 是环境成熟的结果，而不是目标</a></td>
<td>确定如何看待 2,500 这个数字，把本书的中心主题从「数量」转向「能够委派工作的条件」</td>
</tr>
<tr class="code-line" data-line="30">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/27a183" target="_blank">第 2 章：信任成果物，而不是 Agent</a></td>
<td>明确应当信任的对象，定义什么是验证</td>
</tr>
<tr class="code-line" data-line="31">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5" target="_blank">第 3 章：让验证成为可复现的机制</a></td>
<td>讨论增强信任的三种方法：直接验证、工作模式、通过结构施加约束</td>
</tr>
<tr class="code-line" data-line="32">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141" target="_blank">第 4 章：把代码库变成 Agent 的记忆</a></td>
<td>讨论如何把已经建立的信任传递给下一个 Agent</td>
</tr>
<tr class="code-line" data-line="33">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b6ac2d" target="_blank">第 5 章：在信任的基础上建立自动化</a></td>
<td>讨论具备第 2 至第 4 章的条件后，哪些工作可以自动化</td>
</tr>
</tbody>
</table>

[第 2 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/27a183)至[第 5 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b6ac2d)，分别对应 poteto 在[演讲](https://x.com/poteto/status/2102050467505430555)中提出的四个条件。后面的章节以前面的章节为前提，因此建议按顺序阅读。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](01-preface.md) · [下一篇](03-chapter.md) · [English](../en/02-chapter.md)
