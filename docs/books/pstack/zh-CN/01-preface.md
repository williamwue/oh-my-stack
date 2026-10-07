# 开篇

[目录](README.md) · [下一篇](02-chapter.md) · [English](../en/01-preface.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/d4d843) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3dfdf0)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="1">本书也有英文版：<a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04" target="_blank">English edition</a></p>
</div></aside>

这本书旨在<strong>扩大能够交给 Agent 处理的工作范围</strong>。

让 AI Agent 写代码本身已经不难。困难的是建立一种机制，使人能够相信它写出的结果，不再一直守在 AI 旁边监督。

即使 Agent 说「修好了」，在验证之前也无法知道是否真的修好了。因此，人必须在旁边盯着屏幕、阅读差异、实际运行应用并检查。这样一来，无论同时运行多少个 Agent，负责检查的人始终是瓶颈。

本书讲解的，是<strong>如何建立一个能摆脱这种状态的环境</strong>。

本书主要讨论 [<strong>pstack</strong>](https://github.com/cursor/plugins/tree/main/pstack)。

pstack 是 [poteto](https://x.com/poteto)，也就是 Lauren Tan，公开发布的 Cursor 插件。她是 Cursor 的工程师，也是 React 核心团队成员。

她将自己在 Meta、Netflix、Cursor 的经验，以及每天在 Cursor 开发高质量代码时使用的工作步骤与判断标准，整理成 Playbook、Principle 和 Skill。

poteto 的目标不是让 AI 大量编写代码，而是建立一种能够检验质量的工作方式，让多个 Agent 可以被信任并行工作。她在 2026 年 9 月表示，使用 pstack 在 8 月一个月内将 2,500 个 PR 发布到了生产环境。

<span class="embed-block zenn-embedded zenn-embedded-tweet"><iframe data-content="https%3A%2F%2Fx.com%2Fpoteto%2Fstatus%2F2102050467505430555" frameborder="0" id="zenn-embedded__362d93147197" scrolling="no" src="https://embed.zenn.studio/tweet#zenn-embedded__362d93147197"></iframe></span><https://x.com/poteto/status/2102050467505430555>

但本书并不提供增加 PR 数量的操作教程。  
核心问题只有一个：

<strong>在什么条件下，Agent 即使没有人类监督，也能持续完成高质量的工作？</strong>

pstack 是对这个问题的一种具体回答。其内容包括验证成果物的机制、熟练工程师的工作步骤、判断标准、保存在代码库中的知识和约束，以及以这些为基础建立的自动化。

本书会讲解 pstack 的所有项目（Playbook、Principle、Skill），并将这个答案拆解成可以应用于自己项目的形式。

<a id="%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AB%E3%80%8C%E4%BB%95%E4%BA%8B%E3%82%92%E4%BB%BB%E3%81%9B%E3%82%8B%E3%80%8D%E3%81%AE%E5%AE%9A%E7%BE%A9"></a>


## 「把工作交给 Agent」的定义

把工作交给 Agent，并不只是给它指令，然后等待结果。本书将以下三件事都已交给 Agent 的状态称为「交给它工作」。

1. <strong>做什么才算完成</strong>……完成条件能够通过执行来判断通过或失败
2. <strong>怎样推进</strong>……调查、复现、修复、检查等步骤，每次都能以相同的质量进行
3. <strong>怎样验证</strong>……Agent 自己实际运行应用或成果物，并留下证据

如果缺少第三项，即使具备前两项，人也得一直担任检查者。poteto 将「验证」称为最重要的基础，原因正在于此。本书也从验证开始。

<a id="%E6%9C%AC%E6%9B%B8%E3%81%A7%E6%89%B1%E3%81%86%E7%AF%84%E5%9B%B2"></a>


## 本书涵盖的范围

本书由六个部分、39 章组成。

<table class="code-line" data-line="45">
<thead class="code-line" data-line="45">
<tr class="code-line" data-line="45">
<th>部分</th>
<th>主题</th>
<th>章节</th>
</tr>
</thead>
<tbody class="code-line" data-line="47">
<tr class="code-line" data-line="47">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/86acbc" target="_blank">第一部分：支撑每月 2,500 个 PR 的开发基础</a></td>
<td>能够把工作交给 Agent，需要什么条件</td>
<td>第 1～5 章</td>
</tr>
<tr class="code-line" data-line="48">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a5fb04" target="_blank">第二部分：什么是 pstack</a></td>
<td>pstack 通过哪些组件实现<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/86acbc" target="_blank">第一部分</a>所述的条件</td>
<td>第 6～9 章</td>
</tr>
<tr class="code-line" data-line="49">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/72f8ee" target="_blank">第三部分：用 Playbook 推进工作</a></td>
<td>pstack 中 Playbook 的详细内容</td>
<td>第 10～16 章</td>
</tr>
<tr class="code-line" data-line="50">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4b3166" target="_blank">第四部分：Principle 支持 Agent 的判断</a></td>
<td>pstack 中 Principle 的详细内容</td>
<td>第 17～21 章</td>
</tr>
<tr class="code-line" data-line="51">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2a4af5" target="_blank">第五部分：用 Skill 扩展工作能力</a></td>
<td>pstack 中 Skill 的详细内容</td>
<td>第 22～35 章</td>
</tr>
<tr class="code-line" data-line="52">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b22889" target="_blank">第六部分：pstack 实践指南</a></td>
<td>在自己的项目中，应该从哪里开始</td>
<td>第 36～39 章</td>
</tr>
</tbody>
</table>

[第三部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/72f8ee)到[第五部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2a4af5)介绍 pstack 的具体内容，涵盖截至 2026 年 9 月 pstack 中全部 23 个 Playbook、23 个 Principle、24 个 Skill。不只是罗列名称，还会讲解每个项目为何存在、在什么场景下使用，以及它与其他项目如何关联。

[第六部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b22889)是实践篇，主要参考 poteto 在 X 发布的文章《The Complete Guide to pstack》的 [Part 1](https://x.com/poteto/status/2094457600259842065) 和 [Part 2](https://x.com/poteto/status/2097732320606507506)。  
以这篇文章为基础，讲解如何创建验证 Skill，以及如何与 Agent 一起开展调查、设计和规划。

<a id="%E8%AA%AD%E3%81%BF%E9%80%B2%E3%82%81%E6%96%B9"></a>


## 阅读方式

第一次阅读时，我建议从头按顺序读。先在[第一部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/86acbc)理解「为什么验证要放在前面」，就更容易看出每个项目是为解决什么问题而设置的。

如果目标明确，也可以按以下方式阅读。

- <strong>想安装 pstack 并立即使用</strong>……读完[第二部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a5fb04)，再阅读[第 34 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8487f0)（安装）和[第 36 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)（验证 Skill）。
- <strong>不使用 pstack，但想设计团队的开发环境</strong>……重点阅读[第一部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/86acbc)、[第四部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4b3166)和[第六部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b22889)。Principle 和实践指南的内容即使不使用 pstack 也能应用。
- <strong>想查某个 Playbook 或 Skill</strong>……从各部分导读中的章节列表，直接进入相应章节。每一章都按可以单独阅读的方式编写。

<a id="%E6%9C%AC%E6%9B%B8%E3%81%A7%E7%B9%B0%E3%82%8A%E8%BF%94%E3%81%97%E4%BD%BF%E7%94%A8%E3%81%99%E3%82%8Bpstack%E3%81%B8%E3%81%AE%E4%BE%9D%E9%A0%BC%E4%BE%8B"></a>


## 本书反复使用的 pstack 请求示例

逐个查看 pstack 的 Playbook、Principle 和 Skill，不容易看出它们如何在同一个请求中协同工作。因此，本书会在[第二部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a5fb04)和[第四部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4b3166)讨论以下提示词。

```
/poteto-mode the export writes duplicate rows when a retry lands mid-run. repro first, then fix and verify.
// 再試行が実行の途中に入ると、エクスポートが重複した行を書き出す。まず再現して、それから直して、確かめて。
```

这段请求以 pstack [随附指南](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/README.md)中列出的请求示例为基础，原书作者为其添加了日文翻译。

它用一句话说明发生了什么（症状），再用一句话说明做什么才算完成（复现、修复、验证）。[第二部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a5fb04)和[第四部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4b3166)将它作为一个好的示例加以讨论。

- 在[第二部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a5fb04)，讨论入口 `/poteto-mode` 会选择哪个 Playbook
- 在[第四部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4b3166)，讨论工作中的判断会怎样运用哪些 Principle

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="87">我自己并没有在真实项目中实际执行过这项请求。因此，本书展示的流程是沿着 pstack 文件中记载的步骤推演出来的，没有提供执行日志或输出。</p>
</div></aside>

<a id="%E5%8F%82%E7%85%A7%E6%99%82%E7%82%B9%E3%81%A8%E8%A1%A8%E8%A8%98%E3%81%AE%E3%83%AB%E3%83%BC%E3%83%AB"></a>


## 参考时点与表述规则

pstack 经常更新。本书以以下时点的 pstack 为对象。

<table class="code-line" data-line="94">
<thead class="code-line" data-line="94">
<tr class="code-line" data-line="94">
<th>项目</th>
<th>值</th>
</tr>
</thead>
<tbody class="code-line" data-line="96">
<tr class="code-line" data-line="96">
<td>确认日期</td>
<td>2026 年 9 月 24 日</td>
</tr>
<tr class="code-line" data-line="97">
<td>仓库</td>
<td>cursor/plugins 中的<a href="https://github.com/cursor/plugins/tree/main/pstack" rel="nofollow noopener noreferrer" target="_blank">pstack</a>
</td>
</tr>
<tr class="code-line" data-line="98">
<td>版本</td>
<td>0.15.5</td>
</tr>
<tr class="code-line" data-line="99">
<td>commit</td>
<td>
<a href="https://github.com/cursor/plugins/pull/422" rel="nofollow noopener noreferrer" target="_blank"><code>12d587d</code></a>（2026 年 9 月 23 日）</td>
</tr>
<tr class="code-line" data-line="100">
<td>数量</td>
<td>Playbook 23 个、Principle 23 个、Skill 24 个</td>
</tr>
</tbody>
</table>

如果使用更新的版本，请将 [README](https://github.com/cursor/plugins/blob/main/pstack/README.md) 中的列表与本书的列表比较。有些项目可能改名，也可能增加新项目。对于默认使用的模型名称等特别容易变化的值，本书会注明「0.15.5 时点的默认值」。

本书按以下方式区分所写内容的类型。

- <strong>pstack 的规格</strong>，会附上相应的文件名或链接。
- <strong>poteto 的观点</strong>，会注明出处（README、《The Complete Guide to pstack》、演讲等），并作为她本人的观点呈现，不视为适用于所有环境的事实。
- <strong>原文引用</strong>，会简短引用英文原文，注明出处，并附上日文翻译或摘要。
- <strong>作者的解读与经验</strong>，会用「本书将其理解为……」「我认为……」「在我的情况下……」等表述明确标注。

接下来，我们从[第一部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/86acbc)开始，看看「每月 2,500 个」这个数字背后的条件。
<!-- book-body:end -->

---

[目录](README.md) · [下一篇](02-chapter.md) · [English](../en/01-preface.md)
