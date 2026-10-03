# 第六部分：pstack 实践指南

[目录](README.md) · [上一篇](41-chapter.md) · [下一篇](43-chapter.md) · [English](../en/42-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b22889) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/c2adb6)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
第六部分是 pstack 的实践指南，基于 pstack 作者 poteto 在 X 上发布的文章《The Complete Guide to pstack》的 [Part 1](https://x.com/poteto/status/2094457600259842065) 和 [Part 2](https://x.com/poteto/status/2097732320606507506)。

这一部分讨论：<strong>在自己的项目中使用 pstack 时，应该从哪里开始，按什么顺序推进</strong>。

第六部分按以下顺序讲解文章内容。

1. <strong>创建验证 Skill</strong>（Part 1、[第 36 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)）
2. <strong>让 Agent 理解问题，并接续过去的工作</strong>（Part 2、[第 37 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b4b9a1)）
3. <strong>从用户的使用方式出发思考设计，并用原型试验</strong>（Part 2、[第 38 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7549a7)）
4. <strong>确定设计，并转化为可执行的计划</strong>（Part 2、[第 39 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/166acb)）

Part 1 提出，使用者首先应该创建<strong>验证 Skill</strong>，并介绍其创建和使用方法。

Part 2 介绍在验证 Skill 准备好之后，如何与 Agent 一起决定要做什么。本书将 Part 2 的内容整理为 13 个要点，分为第 37～39 章讲解。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="16"><strong>验证 Skill</strong>（verification skill）…… 项目专用的 Skill，让 Agent 能够启动、操作使用者的应用，确认修改确实生效（例如：修改设置页面后，Agent 点击齿轮按钮打开设置页面，并留下修改位置的截图作为证据）。</p>
</div></aside>

之所以先创建验证 Skill，是因为<strong>如果 Agent 无法验证自己的修改，原型的好坏、计划是否完成，最终仍要由人来确认</strong>。

这样一来，在人确认完毕之前，Agent 的工作就无法继续推进，人仍然是阻碍工作流转的瓶颈，一整天都要用来盯着 Agent。

<a id="%E7%AC%AC6%E9%83%A8%E3%81%A7%E5%88%86%E3%81%8B%E3%82%8B%E3%81%93%E3%81%A8"></a>


## 第六部分将介绍什么

阅读第六部分后，你将了解以下内容。

- 如何为自己的应用创建验证 Skill，并随着应用变化保持更新
- 如何让 Agent 像人一样理解问题，并接续过去的上下文
- 如何从用户的使用方式开始设计，并从多个方案的原型中选择一个
- 如何根据实现过程中了解到的情况重新审视设计，并将其转化为拆分成小规模、可验证 PR 的计划

<a id="%E3%81%93%E3%81%AE%E9%83%A8%E3%81%AE%E7%AB%A0"></a>


## 本部分章节

各章内容如下。

<table class="code-line" data-line="36">
<thead class="code-line" data-line="36">
<tr class="code-line" data-line="36">
<th>章节</th>
<th>内容</th>
<th>对应文章</th>
</tr>
</thead>
<tbody class="code-line" data-line="38">
<tr class="code-line" data-line="38">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081" target="_blank">第 36 章 指南 1：从验证 Skill 开始——运行自己的应用进行验证</a></td>
<td>创建让 Agent 能验证自身修改的验证 Skill</td>
<td><a href="https://x.com/poteto/status/2094457600259842065" rel="nofollow noopener noreferrer" target="_blank">Part 1</a></td>
</tr>
<tr class="code-line" data-line="39">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b4b9a1" target="_blank">第 37 章 指南 2：传达目的与背景，让 Agent 理解问题并接续过去的工作</a></td>
<td>理解问题</td>
<td>
<a href="https://x.com/poteto/status/2097732320606507506" rel="nofollow noopener noreferrer" target="_blank">Part 2</a>（要点 1～4）</td>
</tr>
<tr class="code-line" data-line="40">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7549a7" target="_blank">第 38 章 指南 2：从用户的使用方式出发试验设计</a></td>
<td>试验解决方案</td>
<td>
<a href="https://x.com/poteto/status/2097732320606507506" rel="nofollow noopener noreferrer" target="_blank">Part 2</a>（要点 5～8）</td>
</tr>
<tr class="code-line" data-line="41">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/166acb" target="_blank">第 39 章 指南 2：重新审视设计，转化为可执行的计划</a></td>
<td>确定解决方案，并转化为可执行的计划</td>
<td>
<a href="https://x.com/poteto/status/2097732320606507506" rel="nofollow noopener noreferrer" target="_blank">Part 2</a>（要点 9～13）</td>
</tr>
</tbody>
</table>

后面的章节以前面的章节为基础，因此建议从第 36 章开始按顺序阅读。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](41-chapter.md) · [下一篇](43-chapter.md) · [English](../en/42-chapter.md)
