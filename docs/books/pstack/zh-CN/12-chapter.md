# 第 9 章：为什么 pstack 只加载需要的内容

[目录](README.md) · [上一篇](11-chapter.md) · [下一篇](13-chapter.md) · [English](../en/12-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6b7496) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/84aa6e)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
<strong>pstack 并不会在开始时读取所有 Playbook、Principle 和 Skill。它先读的只有 `/poteto-mode` 本体与 Principle 索引</strong>。

Playbook 只读取符合请求的那个文件；Principle 正文只在条件适用时读取相应文件；Skill 则在 Playbook 推进到需要它的步骤时读取。

[第 7 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)和[第 8 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/096f3d)介绍了各组件的调用方式。本章讲解把读取内容分为四层的设计、背后的思路，以及这种设计的优点与弱点。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章按以下顺序展开。

- pstack 将所读内容分为四层
- 这一设计与 Principle「Guard the Context Window」采用相同的划分
- 这一设计有三项优点，其弱点可通过过程中的检查弥补
- 小结

<a id="pstack%E3%81%AF%E3%80%81%E8%AA%AD%E3%82%80%E3%82%82%E3%81%AE%E3%82%924%E3%81%A4%E3%81%AE%E3%83%AC%E3%82%A4%E3%83%A4%E3%83%BC%E3%81%AB%E5%88%86%E3%81%91%E3%81%A6%E3%81%84%E3%82%8B"></a>


## pstack 将所读内容分为四层

pstack 读取的内容分成<strong>入口、步骤、判断、能力四层</strong>，其中始终需要读取的只有入口。

<table class="code-line" data-line="19">
<thead class="code-line" data-line="19">
<tr class="code-line" data-line="19">
<th>层</th>
<th>读取内容</th>
<th>读取时机</th>
</tr>
</thead>
<tbody class="code-line" data-line="21">
<tr class="code-line" data-line="21">
<td>第 1 层：入口</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/poteto-mode</code></a> 的整个 <code>SKILL.md</code></td>
<td>
调用 <code>/poteto-mode</code> 时</td>
</tr>
<tr class="code-line" data-line="22">
<td>第 2 层：步骤</td>
<td>符合请求的一个 Playbook 文件</td>
<td>将请求与 Playbook 对照时</td>
</tr>
<tr class="code-line" data-line="23">
<td>第 3 层：判断</td>
<td>符合条件的 Principle 的 <code>SKILL.md</code>
</td>
<td>当前工作符合索引中的条件时</td>
</tr>
<tr class="code-line" data-line="24">
<td>第 4 层：能力</td>
<td>Playbook 步骤或 <code>Non-negotiables</code> 所要求的 Skill 的 <code>SKILL.md</code>
</td>
<td>Playbook 推进到相应步骤时</td>
</tr>
</tbody>
</table>

第 1 层的 `SKILL.md` 不包含 Playbook 或 Principle 的正文。它包含的是适用于各种工作的共通规则，例如 `Non-negotiables` 和回复方式；还包括 Playbook 的一行说明与文件位置，以及 Principle 清单（索引）和适用条件。<strong>第 1 层由说明「有哪些内容、何时使用」的目录和共通规则组成</strong>。

四层之外，还有一份始终适用的小文件：`/setup-pstack` 写出的模型设置规则 `~/.cursor/rules/pstack-models.mdc`。这个文件每行写一个角色，内容很短，所以即使始终适用，占用的上下文也很少。详见[第 34 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8487f0)。

<a id="%E3%81%93%E3%81%AE%E8%A8%AD%E8%A8%88%E3%81%AF%E3%80%81%E5%8E%9F%E5%89%87%E3%80%8Eguard-the-context-window%E3%80%8F%E3%81%A8%E5%90%8C%E3%81%98%E7%B7%9A%E5%BC%95%E3%81%8D%E3%82%92%E3%81%97%E3%81%A6%E3%81%84%E3%82%8B"></a>


## 这一设计与 Principle「Guard the Context Window」采用相同的划分

pstack 的读取设计与 Principle「[<strong>Guard the Context Window</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-guard-the-context-window/SKILL.md)」<strong>对 Agent 的要求采用相同的划分方式</strong>。

<a id="%E6%AF%8E%E5%9B%9E%E4%BD%BF%E3%81%86%E3%82%82%E3%81%AE%E3%81%AF%E4%B8%AD%E3%81%AB%E3%80%81%E6%9D%A1%E4%BB%B6%E4%BB%98%E3%81%8D%E3%81%AE%E3%82%82%E3%81%AE%E3%81%AF%E5%A4%96%E3%81%AB%E7%BD%AE%E3%81%8F"></a>


### 每次都用的内容放在里面，按条件使用的内容放在外面

这项原则指出：<strong>上下文窗口有限，每个 token 都应该物有所值</strong>。上下文窗口被占满，会降低推理质量。

该原则还要求，把每次都用的参考内容放在 Skill 文件中。pstack 同样将每次都要用的 Principle 索引和 `Non-negotiables` 放在 `SKILL.md` 内，而仅在条件适用时使用的正文放在其他文件。即<strong>每次都用的放里面，偶尔使用的放外面</strong>。

<a id="%E3%82%B5%E3%83%96%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%B8%E3%81%AE%E6%B8%A1%E3%81%97%E6%96%B9%E3%82%82%E3%80%81%E3%82%B3%E3%83%B3%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%82%92%E7%AF%80%E7%B4%84%E3%81%99%E3%82%8B"></a>


### 向子 Agent 交接的方式也节省上下文

`SKILL.md` 的「Subagents」一节规定，向子 Agent 交接时，<strong>默认传递文件位置，而非抄写上下文</strong>（[第 35 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4f8911)）。子 Agent 会自己打开所需文件，主 Agent 无需累积并转交大量上下文。

<a id="%E3%81%93%E3%81%AE%E8%A8%AD%E8%A8%88%E3%81%AB%E3%81%AF3%E3%81%A4%E3%81%AE%E5%88%A9%E7%82%B9%E3%81%8C%E3%81%82%E3%82%8A%E3%80%81%E5%BC%B1%E7%82%B9%E3%81%AF%E9%80%94%E4%B8%AD%E3%81%AE%E7%82%B9%E6%A4%9C%E3%81%A7%E8%A3%9C%E3%81%86"></a>


## 这一设计有三项优点，其弱点可通过过程中的检查弥补

这一设计有以下三项优点。

1. <strong>节省 token 与成本</strong>……不使用的步骤和判断标准不会占用上下文，上下文窗口在填满之前便保有更多余量。poteto 也在《The Complete Guide to pstack》的 [Part 2](https://x.com/poteto/status/2097732320606507506) 中解释说，一次只读取一个 Playbook 是为了提高 token 效率。
2. <strong>工作的一致性</strong>……每个组件都在需要时读取完整正文，不必依赖 Agent 的记忆或转述。
3. <strong>用户需要记住的东西更少</strong>……用户无需记住 70 个项目的名称和用法，只需记住 `/poteto-mode`。

<a id="%E5%BC%B1%E7%82%B9%EF%BC%9A%E6%9D%A1%E4%BB%B6%E3%81%AE%E5%88%A4%E5%AE%9A%E3%81%8C%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E4%BB%BB%E3%81%9B%E3%81%AB%E3%81%AA%E3%82%8B"></a>


### 弱点：条件是否适用由 Agent 判断

这种设计的弱点是：<strong>由 Agent 决定适用哪个 Principle 或 Playbook</strong>。如果判断错误，本应读取的正文就可能没有被读取。

本书认为，pstack 用以下机制在工作途中检查并弥补这个弱点。

<table class="code-line" data-line="58">
<thead class="code-line" data-line="58">
<tr class="code-line" data-line="58">
<th>机制</th>
<th>用户能检查什么</th>
</tr>
</thead>
<tbody class="code-line" data-line="60">
<tr class="code-line" data-line="60">
<td>跳过的步骤会以 <code>skip: &lt;理由&gt;</code> 形式保留在 TODO 列表中</td>
<td>哪些步骤没有执行，以及原因</td>
</tr>
<tr class="code-line" data-line="61">
<td>在回复中点名改变了判断的 Principle（只能点名已读过正文的 Principle）</td>
<td>读了哪些标准，它们影响了哪些选择</td>
</tr>
<tr class="code-line" data-line="62">
<td>只回复 Principle 名称就能使工作方向改变</td>
<td>可以当场纠正偏离的判断</td>
</tr>
</tbody>
</table>

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="65"><strong>TODO 列表</strong>……Agent 开始工作时创建的待办事项清单（计划），显示在 Cursor 的聊天界面。用户可查看清单，确认 Agent 执行了哪些步骤、跳过了哪些步骤（<code>skip: &lt;理由&gt;</code>）<br/>
（随附指南 <a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md" rel="nofollow noopener noreferrer" target="_blank"><code>01-setup.md</code></a>）。</p>
</div></aside>

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 小结

- <strong>四层</strong>……pstack 在需要时分别读取入口、步骤、判断、能力四层。始终读取的只有入口 `SKILL.md`，其中包含目录、索引和共通规则。
- <strong>设计背后的思路</strong>……与 Principle「<strong>Guard the Context Window</strong>」一样，将每次使用的索引放在内部，将按条件使用的正文放在外部。
- <strong>优点与弱点</strong>……优点是节省 token、保持一致性、易于记忆。对条件的判断由 Agent 负责，而用户可通过 TODO 列表和回复检查。

[第二部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a5fb04)介绍了 pstack 解决什么问题、入口 `/poteto-mode` 如何分配请求、三种组件如何分工，以及如何读取各个组件。从接下来的[第三部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/72f8ee)开始，我们将逐一介绍 23 个 Playbook。首先是[第 10 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ea525d)，讨论不修改代码、只调查并诊断问题的 Playbook。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](11-chapter.md) · [下一篇](13-chapter.md) · [English](../en/12-chapter.md)
