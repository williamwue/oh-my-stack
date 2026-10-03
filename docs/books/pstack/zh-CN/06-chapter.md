# 第 4 章：让代码库成为 Agent 的记忆

[目录](README.md) · [上一篇](05-chapter.md) · [下一篇](07-chapter.md) · [English](../en/06-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3cc0dd)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
让 Agent 继承以往判断的记忆，应放在<strong>代码库</strong>中，而不是模型内部。

这是 poteto 在[演讲](https://x.com/poteto/status/2102050467505430555)的第三个主题中提出的思路。

本章讲解为什么要把知识放进仓库，以及如何筛选并持续维护留下的记忆。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章按以下顺序展开。

- 为什么把知识放在仓库里，而不是模型中
- 留下的记忆如何过时，以及如何维护
- 应删除什么，才不会污染下一位 Agent 参考的示例
- 如何持续进行维护工作
- 小结：记忆不是一味增加，而是需要筛选和维护

<a id="%E3%81%AA%E3%81%9C%E7%9F%A5%E8%AD%98%E3%82%92%E3%83%A2%E3%83%87%E3%83%AB%E3%81%A7%E3%81%AF%E3%81%AA%E3%81%8F%E3%83%AA%E3%83%9D%E3%82%B8%E3%83%88%E3%83%AA%E3%81%AB%E7%BD%AE%E3%81%8F%E3%81%AE%E3%81%8B"></a>


## 为什么把知识放在仓库里，而不是模型中

把知识放进仓库，是因为<strong>Agent 一次能处理的上下文有限，无法每次都把所需知识塞进提示词</strong>。

过去的判断、已知问题、复现步骤和规避方法，不可能每次都完整写进请求。

将知识放入仓库，<strong>Agent 就不必每次从零思考，而能边阅读其中的信息边继续工作</strong>。

这里说的记忆不只有代码。以下内容也能作为记忆，将过去的判断传递给下一位 Agent。

- Feature Map（按应用功能记录能做什么、用户怎样到达该功能、如何用验证 Skill 操作，以及可检查的结果的文档；将在[下一节](#%E6%AE%8B%E3%81%97%E3%81%9F%E8%A8%98%E6%86%B6%E3%81%AF%E3%81%A9%E3%81%86%E5%8F%A4%E3%81%8F%E3%81%AA%E3%82%8A%E3%80%81%E3%81%A9%E3%81%86%E3%83%A1%E3%83%B3%E3%83%86%E3%83%8A%E3%83%B3%E3%82%B9%E3%81%99%E3%82%8B%E3%81%AE%E3%81%8B)详述）
- 复现步骤
- 设计约束
- 测试
- lint 规则

poteto 也在《The Complete Guide to pstack》的 [Part 1](https://x.com/poteto/status/2094457600259842065) 中表达了相同的观点。

> Personally, I think your codebase is the ultimate form of memory.
>
> 就我个人而言，我认为代码库是记忆的终极形式。

她解释说，与经常被用作 Agent 记忆的 Markdown 笔记等不同，<strong>代码反映了团队实际做出的判断，是关于实际发生了什么、系统如何运行的可靠信息来源</strong>。

<a id="%E6%AE%8B%E3%81%97%E3%81%9F%E8%A8%98%E6%86%B6%E3%81%AF%E3%81%A9%E3%81%86%E5%8F%A4%E3%81%8F%E3%81%AA%E3%82%8A%E3%80%81%E3%81%A9%E3%81%86%E3%83%A1%E3%83%B3%E3%83%86%E3%83%8A%E3%83%B3%E3%82%B9%E3%81%99%E3%82%8B%E3%81%AE%E3%81%8B"></a>


## 留下的记忆如何过时，以及如何维护

留下的记忆中，<strong>需要特别维护的是 Feature Map 这样的记忆：应用变了，它会悄无声息地过时</strong>。

测试和 lint 如果与应用不一致，CI 会失败，我们便能察觉它们过时了。Feature Map 等 Markdown 文档则不同，应用改变后，它们并不会发出任何信号。

pstack 随附指南的验证页面（[`docs/guide/06-verify-and-ship.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md)）也用下面这句话引出维护工作。

> Apps change and feature maps rot.
>
> 应用会变化，Feature Map 会逐渐失效。

拿到过时 Feature Map 的 Agent 会相信其中的描述并照着操作，耗费时间寻找已经不存在的界面。

本节介绍 Feature Map 是什么，以及 pstack 如何维护它。

<a id="feature-map%E3%81%AF%E3%80%81%E6%A9%9F%E8%83%BD%E3%81%94%E3%81%A8%E3%81%AE%E4%BD%BF%E3%81%84%E6%96%B9%E3%81%A8%E7%A2%BA%E3%81%8B%E3%82%81%E6%96%B9%E3%82%92%E3%81%BE%E3%81%A8%E3%82%81%E3%81%9F%E5%9C%B0%E5%9B%B3"></a>


### Feature Map 是汇总各功能用法与验证方式的地图

Feature Map 是一份按应用功能整理的文档，记录每个功能能做什么、用户如何到达该功能、怎样通过验证 Skill 操作，以及应该检查什么结果。

有了 Feature Map，Agent 无需阅读整个代码库，只需阅读所需功能相关的文件。《The Complete Guide to pstack》Part 1 将 Feature Map 视为一种节省上下文 token 的记忆形式。

在 pstack 中，[`/create-verification-skill`](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md) 创建验证 Skill（[第 3 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5)）时，也会创建 Feature Map。文件格式和内容将在[第 36 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)讨论。

<a id="feature-map%E3%81%AF%E3%80%81%2Fmaintain-verification-skill-%E3%81%A7%E6%9C%80%E6%96%B0%E3%81%AB%E4%BF%9D%E3%81%A4"></a>


### 通过 `/maintain-verification-skill` 保持 Feature Map 更新

使用 [`/maintain-verification-skill`](https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md) 反复检查 Feature Map 是否仍与当前应用一致。执行频率等细节将在[第 36 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)讨论。

根据随附指南的验证页面 [`06-verify-and-ship.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md)，`/maintain-verification-skill` 按以下顺序工作。

1. 按功能并行启动只阅读源代码的负责人（子 Agent）
2. 实际运行并检查地图中列出的所有功能
3. 返回以下三种结果之一
   - <strong>`clean`</strong>……地图所列功能都已检查，没有需要修正的地方
   - <strong>`changed`</strong>……修复了不一致之处，并将经过验证的修正汇入一个 PR；修正范围限于验证 Skill 的目录
   - <strong>`blocked`</strong>……无法继续检查，并报告阻碍的原因

同一页面还写道：

> It never edits product code. If the live pass catches a product regression, it reports the regression instead of papering over it in docs.
>
> 它绝不编辑产品代码。如果实际运行的检查发现产品回归缺陷，就报告该缺陷，而不是通过修改文档来掩盖它。

<strong>当应用与记忆不一致时，`/maintain-verification-skill` 不会任意改写记忆来让两者表面上吻合</strong>。

不一致可能来自两种情况。

- <strong>应用发生了变化</strong>……记忆已过时，应修正记忆
- <strong>应用出了问题</strong>……错误在应用一侧，不应修正记忆，而应报告缺陷

在第二种情况下，如果改写记忆，<strong>错误的行为就会作为正确行为被记住</strong>。

Feature Map 的创建与维护步骤，将在[第 26 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca)和[第 36 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)讨论。

<a id="%E4%BD%95%E3%82%92%E6%B6%88%E3%81%9B%E3%81%B0%E3%80%81%E6%AC%A1%E3%81%AE%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AE%E6%89%8B%E6%9C%AC%E3%82%92%E6%B1%9A%E3%81%95%E3%81%9A%E3%81%AB%E6%B8%88%E3%82%80%E3%81%AE%E3%81%8B"></a>


## 应删除什么，才不会污染下一位 Agent 参考的示例

应该删除的是<strong>临时拼凑的规避方法，以及实现同一件事的第二种写法</strong>。

这两者都会作为代码留下来，成为下一位 Agent 阅读的示例。下面先看规避方法，再看第二种写法。

<a id="%E6%AE%8B%E3%81%97%E3%81%9F%E5%9B%9E%E9%81%BF%E7%AD%96%E3%81%AF%E3%80%81%E6%AC%A1%E3%81%AE%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AE%E6%89%8B%E6%9C%AC%E3%81%AB%E3%81%AA%E3%82%8B"></a>


### 留下的规避方法会成为下一位 Agent 的示例

规避方法留在代码中，就会被下一位 Agent 复制。因此，修复根本原因后应将它删除。

不能把任何东西都当作记忆保留下来。临时拼凑的规避方法如果留着，<strong>下一位 Agent 可能以为它是正确的实现示例并加以复制；复制品又生出新的复制品，令人不愿看到的模式便悄悄扩散</strong>。

pstack 的原则中也有两处提到这种风险。

- <strong>「[Encode Lessons in Structure](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-encode-lessons-in-structure/SKILL.md)」</strong>……如[第 3 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5)所述，该原则指出 Agent 会模仿周围代码，弱机制就会成为后续代码仿效的样本。
- <strong>「[Fix Root Causes](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-fix-root-causes/SKILL.md)」</strong>……该原则指出，针对症状的处理会不断累积，并写道：

> If a workaround needs a paragraph-long comment to justify it, the code is wrong.
>
> 如果某种规避方法需要一整段注释才能说明其合理性，那问题出在代码本身。

pstack 也通过工作步骤防止规避方法留存。用于修复缺陷的「<strong>Bug fix</strong>」Playbook（[`playbooks/bug-fix.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md)）在步骤开始前写道：

> Belt-and-suspenders that "might help" is a hypothesis, not a fix. It does not ship. When evidence refutes a hypothesis, revert what it motivated.
>
> 「也许有用」的额外保险措施是一个假设，不是修复方案，不能发布。如果证据否定了假设，就撤销因它而做出的变更。

本书认为，这项规则是为了防止试探性加入的变更最终作为规避方法留在代码中。

<a id="%E6%8E%A8%E5%A5%A8%E3%81%95%E3%82%8C%E3%82%8B%E5%AE%9F%E8%A3%85%E6%96%B9%E6%B3%95%E3%82%92%E4%B8%80%E3%81%A4%E3%81%AB%E7%B5%9E%E3%82%8A%E3%80%81%E3%80%8C%E8%88%97%E8%A3%85%E3%81%95%E3%82%8C%E3%81%9F%E4%B8%80%E6%9C%AC%E3%81%AE%E9%81%93%E3%80%8D%E3%82%92%E4%BD%9C%E3%82%8B"></a>


### 将推荐的实现方式收敛为一条「铺好的路」

如果同一目标有两种以上的写法，应留下推荐的一种、删除旧写法，并用 lint 阻止其他写法。

清除技术债，把推荐的实现方式收敛为一种，并用 lint 等工具机械地找出反模式。这样，<strong>Agent 就不必每次都在多种方法之间选择</strong>。

演讲将这种标准的实现方法称为「<strong>一条铺好的路</strong>」。意思是 Agent 不必每次都寻找自己的捷径，而是沿着已修整好的路径前进。

pstack 的一些原则也旨在铺好这条路。[README](https://github.com/cursor/plugins/blob/main/pstack/README.md#principles) 的原则列表将以下两项概括为：

- <strong>「Subtract Before You Add」</strong>（[`principle-subtract-before-you-add`](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-subtract-before-you-add/SKILL.md)）……先移除不必要的东西、重复的验证和没有实际内容的引用，再在简化的基础上构建
- <strong>「Migrate Callers Then Delete Legacy APIs」</strong>（[`principle-migrate-callers-then-delete-legacy-apis`](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md)）……如果无须维持外部兼容性，就将调用旧 API 的代码切换到新 API，并在同一次变更中删除旧 API。不要把支持旧 API 代码继续运行的兼容层留下来

保留兼容层，代码库中就会有两条实现同一件事的路，对 Agent 来说两条都是示例。两项原则将分别在[第 17 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b)和[第 18 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b)详细讨论。

本书认为，应由人决定哪种写法成为唯一的路。人的职责是确定方向、承担最终责任（[第 5 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b6ac2d)）；选择唯一的实现方法，正属于这里的「方向」。

<a id="%E3%83%A1%E3%83%B3%E3%83%86%E3%83%8A%E3%83%B3%E3%82%B9%E3%81%AE%E4%BB%95%E4%BA%8B%E3%82%92%E3%80%81%E3%81%A9%E3%81%86%E7%B6%9A%E3%81%91%E3%82%8B%E3%81%AE%E3%81%8B"></a>


## 如何持续进行维护工作

维护工作要借助 pstack 的组件持续进行。

演讲把维护这种环境的人比作「<strong>园丁</strong>」。花园不能只靠增添植物来维持，还必须修剪多余的枝条、清除杂草，持续维护，让想要的植物生长。

代码库也一样，<strong>不仅要增加知识，还必须持续清除过时的规避方法和糟糕的实现示例</strong>。

pstack 中有帮助完成这类维护的组件。

<table class="code-line" data-line="150">
<thead class="code-line" data-line="150">
<tr class="code-line" data-line="150">
<th>维护工作</th>
<th>提供帮助的 pstack 组件</th>
</tr>
</thead>
<tbody class="code-line" data-line="152">
<tr class="code-line" data-line="152">
<td>同一问题指出两次后，将其变成机制</td>
<td>Principle「<strong>Encode Lessons in Structure</strong>」（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5" target="_blank">第 3 章</a>、<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dd2d9f" target="_blank">第 21 章</a>）</td>
</tr>
<tr class="code-line" data-line="153">
<td>检查用于关闭 lint 或类型检查的注释是否在增加</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/no-comments/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/no-comments</code></a>（移除不必要注释的 Skill）。其「检查子 Agent 报告和差异的步骤（步骤 2）」要求检查被漏掉的 lint 和 TypeScript 检查抑制（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8960d3" target="_blank">第 31 章</a>）</td>
</tr>
<tr class="code-line" data-line="154">
<td>将写着「别删」「别改」的注释替换为类型、测试或 lint</td>
<td>
<code>/no-comments</code> 中「处理描述约束的注释的步骤（步骤 5）」。建议在类型、运行时检查、测试或 CI 中的 lint 之间，选择最省力的替代方式</td>
</tr>
<tr class="code-line" data-line="155">
<td>查找同一目标是否有两种以上写法，并收敛为一种</td>
<td>Principle「<strong>Subtract Before You Add</strong>」、Principle「<strong>Migrate Callers Then Delete Legacy APIs</strong>」（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章</a>、<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b" target="_blank">第 18 章</a>）</td>
</tr>
<tr class="code-line" data-line="156">
<td>确认 Feature Map 和复现步骤是否仍与当前应用一致</td>
<td>
<code>/maintain-verification-skill</code>（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca" target="_blank">第 26 章</a>）</td>
</tr>
<tr class="code-line" data-line="157">
<td>将长时间工作中学到的步骤留给下次使用</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/reflect/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/reflect</code></a>。README 将其定义为通过编辑 Skill，保留一次已完成的长期工作中的步骤（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f70847" target="_blank">第 33 章</a>）</td>
</tr>
</tbody>
</table>

由此可见，pstack 除了用于编写代码的 Skill，<strong>还提供了清除规避方法、关闭检查的注释和旧 API，以及将描述约束的注释替换为类型或 lint 的组件</strong>。

<a id="%E3%81%BE%E3%81%A8%E3%82%81%EF%BC%9A%E8%A8%98%E6%86%B6%E3%81%AF%E5%A2%97%E3%82%84%E3%81%99%E3%82%82%E3%81%AE%E3%81%A7%E3%81%AF%E3%81%AA%E3%81%8F%E3%80%81%E9%81%B8%E3%82%93%E3%81%A7%E3%83%A1%E3%83%B3%E3%83%86%E3%83%8A%E3%83%B3%E3%82%B9%E3%81%99%E3%82%8B%E3%82%82%E3%81%AE"></a>


## 小结：记忆不是一味增加，而是需要筛选和维护

- <strong>为什么放进仓库</strong>……上下文容量有限，无法每次都将必要知识塞进提示词。poteto 将代码库称为「终极的记忆」。
- <strong>如何过时、如何维护</strong>……测试和 lint 过时后 CI 会发出信号，Feature Map 等 Markdown 文档却会悄悄过时。通过 `/maintain-verification-skill` 反复检查；如果是应用坏了，就报告问题，而不是修改记忆。
- <strong>删除什么</strong>……删除临时拼凑的规避方法，以及实现同一件事的第二种写法。两者都会成为下一位 Agent 的示例。遵照「<strong>Bug fix</strong>」Playbook，如果证据否定了试探性变更所依据的假设，就撤销变更。推荐的写法应收敛为一种，并用 lint 阻止其他写法。具体选择由人来决定。
- <strong>如何持续</strong>……维护代码库如同维护花园，不只是增加，还要不断清除。pstack 提供将重复意见变成机制的 Principle，以及检查被关闭的检查项的 `/no-comments` 等维护组件。

至此，信任的对象（[第 2 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/27a183)）、提高信任的方法（[第 3 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5)）和传递信任的记忆（第 4 章）已经齐备。[第 5 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b6ac2d)将讨论演讲的最后一个主题：自动化。我们会讲解为什么把自动化放在最后、可以先自动化哪些工作、能够自动化什么，以及自动化之后人还需要做什么。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](05-chapter.md) · [下一篇](07-chapter.md) · [English](../en/06-chapter.md)
