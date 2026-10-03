# 第 3 章：让验证成为可重复的机制

[目录](README.md) · [上一篇](04-chapter.md) · [下一篇](06-chapter.md) · [English](../en/05-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/87177c)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
要提高信任，必须<strong>把一次性的检查，以任何人无论执行多少次都能得到相同结果的形式留在仓库里</strong>。

poteto 在[演讲](https://x.com/poteto/status/2102050467505430555)的第二个主题中，提出了以下三种提高信任的方法。

1. 直接验证成果物
2. 教会 Agent 如何高质量地推进工作
3. 让代码库具有易于理解的结构

本章讲解这三种方法的区别、pstack 如何分别实现它们，以及如何把纠正错误后得到的教训保存在机制中。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章按以下顺序展开。

- 提高信任的三种方法及其区别
- 方法 1：将检查方式变成可反复执行的工具
- 方法 2：把熟练工程师的工作方式作为步骤交给 Agent
- 方法 3：让代码库结构本身成为说明书
- 把纠正错误后得到的教训留在机制中，而不是对话中
- 小结：以可再次执行的形式保留一次检查

<a id="%E4%BF%A1%E9%A0%BC%E3%82%92%E9%AB%98%E3%82%81%E3%82%8B3%E3%81%A4%E3%81%AE%E6%96%B9%E6%B3%95%E3%81%A8%E3%80%81%E3%81%9D%E3%81%AE%E9%81%95%E3%81%84"></a>


## 提高信任的三种方法及其区别

三种方法的区别在于<strong>它们有多依赖 Agent 自己保持注意</strong>。  
三种方法及其示例如下。

1. <strong>直接验证成果物</strong>……实际运行应用，利用 Chrome DevTools Protocol（CDP，一种让程序使用与浏览器开发者工具相同功能的机制）采集追踪记录（处理耗时的记录）或堆快照（某个时刻内存内容的记录）
2. <strong>教会 Agent 如何高质量地推进工作</strong>……把规定调查、复现、实现、验证步骤的 pstack Playbook 交给 Agent
3. <strong>让代码库具有易于理解的结构</strong>……只要查看目录、类型和进程的边界，就能知道「在哪里可以做什么」「哪些代码在哪里运行」「允许哪些 import」

演讲指出，信任不会因为努力或增加对话次数而增长。把验证方法、工作步骤和结构约束以可供查阅的形式留下来，才能扩大可委派工作的范围。

比较 Agent 必须做什么才能让每种方法生效，就能看出它们的区别。

- <strong>方法 1（验证）</strong>……Agent 必须运行工具才会生效。即使准备了工具，不使用就不会发生检查。
- <strong>方法 2（步骤）</strong>……Agent 必须阅读步骤并照着执行才会生效。它可能漏读或误读。
- <strong>方法 3（结构）</strong>……即使 Agent 没有注意到也会生效。若用类型或 lint 表达边界，越界的变更会在编译或 lint 阶段被拦下。

因此，从方法 1 走向方法 3，维持质量就会越来越少依赖 Agent 的注意。下面逐一来看。

<a id="%E6%96%B9%E6%B3%951%EF%BC%9A%E7%A2%BA%E3%81%8B%E3%82%81%E6%96%B9%E3%82%92%E3%80%81%E4%BD%95%E5%BA%A6%E3%81%A7%E3%82%82%E5%AE%9F%E8%A1%8C%E3%81%A7%E3%81%8D%E3%82%8B%E9%81%93%E5%85%B7%E3%81%AB%E3%81%99%E3%82%8B"></a>


## 方法 1：将检查方式变成可反复执行的工具

第一种方法是<strong>把检查方式做成工具，让任何人无论执行多少次都能得到相同的观察结果</strong>。

演讲所要求的验证，并不是把编译通过或 Agent 自称「已经修复」当作依据，而是把实际运行应用时的行为当作证据。

<a id="pstack%E3%81%A7%E3%81%AF%E3%80%81%E3%80%8Ebuild-the-lever%E3%80%8F%E3%81%A8%E6%A4%9C%E8%A8%BC%E3%82%B9%E3%82%AD%E3%83%AB%E3%81%8C%E6%8B%85%E3%81%86"></a>


### 在 pstack 中由「Build the Lever」和验证 Skill 承担

在 pstack 中，Principle「[<strong>Build the Lever</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-build-the-lever/SKILL.md)」和用于创建验证 Skill 的 Skill 承担这种方法。

这项原则规定，<strong>不要只靠手工处理，而要制作审查者能够阅读并重新执行的脚本或命令</strong>。验证 Skill 是项目专用的 Skill，供 Agent 启动自己的应用、操作应用并取得证据。

在 pstack 中，使用 [`/create-verification-skill`](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md) 创建验证 Skill，使用 [`/maintain-verification-skill`](https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md) 保持其更新。验证 Skill 的内容和命令示例见[第 26 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca)与[第 36 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)。

<a id="%E9%81%93%E5%85%B7%E3%81%AF%E3%80%81%E6%89%8B%E3%81%A71%E5%9B%9E%E7%A2%BA%E3%81%8B%E3%82%81%E3%81%A6%E3%81%8B%E3%82%89%E4%BD%9C%E3%82%8A%E3%80%81%E4%BD%9C%E3%81%A3%E3%81%9F%E3%81%82%E3%81%A8%E3%82%82%E3%83%A1%E3%83%B3%E3%83%86%E3%83%8A%E3%83%B3%E3%82%B9%E3%81%99%E3%82%8B"></a>


### 工具要在手动检查一次之后制作，做完还要维护

验证工具必须先在第一次手动检查之后制作，制作后也需要持续维护。

「<strong>Build the Lever</strong>」规定了以下制作方式：<strong>先手动处理一个目标以确认步骤，再把步骤做成工具，最后用工具处理同一个目标，检查两次的结果是否一致</strong>。应用到验证上，就是先手动检查，再把操作写成命令，最后比较该命令能否复现同一项检查。

原则文件还说，如果声称遵循了这项原则，但差异中没有 codemod（机械式批量改写代码的脚本）、脚本等内容，就不能算应用了这项原则。即使 PR 上写了「已验证」，<strong>如果没有附上可再次执行的命令或其输出，验证工具就尚未完成</strong>（[第 36 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)）。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="63">制作工具前后，有两点需要注意。</p>
<ul class="code-line" data-line="65">
<li class="code-line" data-line="65">
<strong>为难以操作的应用提供操作入口</strong>……《The Complete Guide to pstack》的 <a href="https://x.com/poteto/status/2094457600259842065" rel="nofollow noopener noreferrer" target="_blank">Part 1</a> 指出，技术栈越难调试和操作，Agent 就越难发挥作用；为了验证，文章甚至建议自己制作工具或更换技术栈。</li>
<li class="code-line" data-line="66">
<strong>验证失败时，先怀疑工具</strong>……Principle「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Prove It Works</strong></a>」写道：「验证失败时，先怀疑观察方法，再怀疑系统。」应用变化后，工具可能已经过时，返回错误结果。</li>
</ul>
</div></aside>

<a id="%E6%96%B9%E6%B3%952%EF%BC%9A%E7%86%9F%E7%B7%B4%E8%80%85%E3%81%AE%E9%80%B2%E3%82%81%E6%96%B9%E3%82%92%E3%80%81%E6%89%8B%E9%A0%86%E3%81%A8%E3%81%97%E3%81%A6%E6%B8%A1%E3%81%99"></a>


## 方法 2：把熟练工程师的工作方式作为步骤交给 Agent

第二种方法是<strong>把熟练工程师的工作模式整理成步骤，交给 Agent</strong>。演讲以 pstack 的 Playbook 为例说明这种方法。

Playbook 给出的不是答案本身，而是<strong>「熟练工程师会这样推进」的工作模式</strong>。

没有固定模式，Agent 每次可能选择不同的推进方式；如果步骤明确，其他 Agent 也更容易以相近的质量推进工作。

<a id="playbook%E3%81%AE%E5%85%B7%E4%BD%93%E4%BE%8B"></a>


### Playbook 的具体示例

例如，用于修复缺陷的「<strong>Bug fix</strong>」Playbook（[`playbooks/bug-fix.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md)）规定了固定顺序的步骤：在同一环境中复现、用证据缩小原因范围、修复、在同一环境中验证，直至创建 PR（[第 11 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6fcb42)）。

在 pstack 中，入口 `/poteto-mode` 会选择符合请求的 Playbook，并把其中的步骤原样抄到 TODO 列表的开头（[README](https://github.com/cursor/plugins/blob/main/pstack/README.md)）。全部 23 个 Playbook 将在[第三部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/72f8ee)逐一讨论。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="84"><strong>TODO 列表</strong>……Agent 在开始工作时创建的该项工作待办事项清单（计划）。在 Cursor 中，它显示在聊天界面。用户可以查看清单，确认 Agent 执行了哪些步骤、跳过了哪些步骤（<code>skip: &lt;理由&gt;</code>）（随附指南 <a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md" rel="nofollow noopener noreferrer" target="_blank"><code>01-setup.md</code></a>）。</p>
</div></aside>

<a id="%E6%96%B9%E6%B3%953%EF%BC%9A%E3%82%B3%E3%83%BC%E3%83%89%E3%83%99%E3%83%BC%E3%82%B9%E3%81%AE%E6%A7%8B%E9%80%A0%E3%81%9D%E3%81%AE%E3%82%82%E3%81%AE%E3%82%92%E8%AA%AC%E6%98%8E%E6%9B%B8%E3%81%AB%E3%81%99%E3%82%8B"></a>


## 方法 3：让代码库结构本身成为说明书

第三种方法是<strong>让人只看目录、类型和进程边界就能明白规则，使代码库结构本身成为给 Agent 的说明书</strong>。

目标是建立这样一种代码库：只需查看目录、类型和进程边界，就能知道以下三件事。

- 在哪里可以做什么
- 哪些代码在哪里运行
- 允许哪些 import

建立了这样的代码库，Agent 即使不读文字说明，也能从结构中了解约束与规则。

<a id="pstack%E3%81%A7%E3%81%AF%E3%80%81architecture%E3%82%B0%E3%83%AB%E3%83%BC%E3%83%97%E3%81%AE%E5%8E%9F%E5%89%87%E3%81%8C%E6%8B%85%E3%81%86"></a>


### 在 pstack 中由 Architecture 组的 Principle 承担

pstack 按主题对 Principle 分类（见 [README](https://github.com/cursor/plugins/blob/main/pstack/README.md#principles) 中的原则列表）。「<strong>Architecture（架构）</strong>」组的原则，旨在整理代码边界、类型和状态的处理方式，建立不容易出错的结构。

本节从中选取「[<strong>Boundary Discipline</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-boundary-discipline/SKILL.md)」和「[<strong>Type System Discipline</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-type-system-discipline/SKILL.md)」。

README 将这两项原则概括如下。

- <strong>「Boundary Discipline」</strong>（[`principle-boundary-discipline`](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-boundary-discipline/SKILL.md)）……外部传入的值（CLI 参数、配置文件、网络、外部 API）应在系统接收处接受检查并转换为内部类型。内部代码信任这个类型，不重复检查。
- <strong>「Type System Discipline」</strong>（[`principle-type-system-discipline`](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-type-system-discipline/SKILL.md)）……用类型让互相矛盾的不合法状态无法被表达。

这两项原则将在[第 18 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b)详细讨论。

<a id="%E6%A9%9F%E6%A2%B0%E7%9A%84%E3%81%AB%E5%88%A4%E5%AE%9A%E3%81%A7%E3%81%8D%E3%81%AA%E3%81%84%E6%B1%BA%E3%81%BE%E3%82%8A%E3%81%AF%E3%80%81%E6%A7%8B%E9%80%A0%E3%81%AB%E3%81%A7%E3%81%8D%E3%81%AA%E3%81%84"></a>


### 无法机械判定的规则，不能变成结构

只有能够通过类型或 lint 机械判定的规则，才能变成结构。

例如，「此目录中的代码只能在浏览器中运行」这项规则，可以用两种方式留下来。

1. 在 README 中写一句话
2. 分开目录，并用 lint 禁止其他目录 import 这里的代码

第一种方法要求 Agent 阅读后才会遵守；第二种方法即使 Agent 没读也能发挥作用。可以机械判定的规则，应采用第二种形式。

另一方面，「这个页面的措辞要克制」「这类变更应拆成较小部分」等需要结合情境判断的规则，无法写成类型或 lint。只能用文字保留。这种保留方式由[下一节](#pstack%E3%81%A7%E3%81%AF%E3%80%81%E3%80%8Eencode-lessons-in-structure%E3%80%8F%E3%81%8C%E6%8B%85%E3%81%86)将介绍的 Principle「<strong>Encode Lessons in Structure</strong>」规定。

<a id="%E8%A8%82%E6%AD%A3%E3%81%97%E3%81%9F%E6%95%99%E8%A8%93%E3%81%AF%E3%80%81%E4%BC%9A%E8%A9%B1%E3%81%A7%E3%81%AF%E3%81%AA%E3%81%8F%E4%BB%95%E7%B5%84%E3%81%BF%E3%81%AB%E6%AE%8B%E3%81%99"></a>


## 把纠正错误后得到的教训留在机制中，而不是对话中

纠正 Agent 后得到的教训，不应只留在对话里，而要<strong>尽可能以有力的形式，留在上述三种方法产生的工具、步骤或结构中</strong>。  
这也是演讲在介绍三种方法之后提出的思路。

纠正后的教训可以留在以下地方之一。

- 代码库本体
- 由 lint、编译器或 CI 执行的自动验证
- rules 或 Bugbot（Cursor 的自动代码审查）
- Skill
- 团队的风格指南

这样，下一位 Agent 即使没有在对话中收到同样的提醒，也能避开曾经指出的问题。

<a id="pstack%E3%81%A7%E3%81%AF%E3%80%81%E3%80%8Eencode-lessons-in-structure%E3%80%8F%E3%81%8C%E6%8B%85%E3%81%86"></a>


### 在 pstack 中由「Encode Lessons in Structure」承担

在 pstack 中，Principle「<strong>Encode Lessons in Structure</strong>」（[`skills/principle-encode-lessons-in-structure/SKILL.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-encode-lessons-in-structure/SKILL.md)）对此作出规定。在 README 的列表里，只有这项原则被归入「Meta」组。它讨论的不是代码本身，而是<strong>怎样把教训留在机制中</strong>这一建立机制的方式。

该原则规定，<strong>当你发现自己第二次写下同样的指示时，应询问是否可以将其变成 lint 规则或运行时检查等机制；如果可以，就建立机制并删掉文字指示</strong>。对于无法变成机制的规则，也就是[上一节](#%E6%A9%9F%E6%A2%B0%E7%9A%84%E3%81%AB%E5%88%A4%E5%AE%9A%E3%81%A7%E3%81%8D%E3%81%AA%E3%81%84%E6%B1%BA%E3%81%BE%E3%82%8A%E3%81%AF%E3%80%81%E6%A7%8B%E9%80%A0%E3%81%AB%E3%81%A7%E3%81%8D%E3%81%AA%E3%81%84)说的「需要看情境判断的规则」，应使指示醒目，并附上失败示例。

选择机制时，尽量选择类型或 lint 这样较强的方式。Agent 会模仿周围代码已有的做法，所以弱机制也会成为后续代码仿效的样本。

在对话中纠正 Agent，即使它回答「我会记住」，教训也不会因此留下来。第二次写同样指示时应采取的步骤、各种机制的强弱顺序，以及如何分配纠正内容，将在[第 21 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dd2d9f)详细讨论。

<a id="%E3%83%AC%E3%83%93%E3%83%A5%E3%83%BC%E3%81%AE%E5%88%A4%E5%AE%9A%E3%81%AE%E5%9F%BA%E6%BA%96%E3%82%82%E3%80%81%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%A8%E3%81%97%E3%81%A6%E8%82%B2%E3%81%A6%E3%82%8B"></a>


### 把审查的判定标准也作为文件持续完善

如何判定审查意见的标准，也可以作为保存教训的文件持续完善。将 PR 推进到可合并状态的「<strong>Babysit</strong>」Playbook（[`playbooks/babysit.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md)）会依据判定标准文件（[`references/bugbot-triage.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/references/bugbot-triage.md)）分类 Bugbot 的意见；若某种驳回理由可能供团队重复使用，就在另一份 PR 中提议把它加入共享的判定标准（[第 14 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e)）。

这样，某一次运行中的 Agent 所学到的内容，就进入下一次运行中的 Agent 会读取的文件。

<a id="%E3%81%BE%E3%81%A8%E3%82%81%EF%BC%9A%E4%B8%80%E5%BA%A6%E3%81%AE%E7%A2%BA%E8%AA%8D%E3%82%92%E3%80%81%E5%86%8D%E5%AE%9F%E8%A1%8C%E3%81%A7%E3%81%8D%E3%82%8B%E5%BD%A2%E3%81%A7%E6%AE%8B%E3%81%99"></a>


## 小结：以可再次执行的形式保留一次检查

- <strong>三种方法及其区别</strong>……演讲提出直接验证成果物、教会 Agent 高质量的工作方式、让代码库具有易于理解的结构三种方法。区别在于它们有多依赖 Agent 自己保持注意：工具不用就不会生效，步骤不读就不会生效，而结构即使没被注意到也会生效。
- <strong>方法 1</strong>……按照 Principle「<strong>Build the Lever</strong>」，把检查方式变成可再次执行的工具。第一次先手动检查，再将其写成命令；验证失败时，先怀疑工具是否过时。
- <strong>方法 2</strong>……交给 Agent 一种「熟练工程师会这样推进」的工作模式，例如 Playbook。在 pstack 中，`/poteto-mode` 选择符合请求的 Playbook，并将步骤抄到 TODO 列表。
- <strong>方法 3</strong>……依照 Architecture 组的原则，在边界处检查，并用类型在结构上阻止错误。需要结合情境判断的规则，无法变成结构。
- <strong>纠正后的教训</strong>……按照 Principle「<strong>Encode Lessons in Structure</strong>」，尽可能留在较强的机制中。只能用文字保留的规则，要突出显示并附上失败示例。仅说「我会记住」并不会留下任何东西。

[第 4 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141)将进一步讨论「留在仓库里」的方针，介绍演讲的第三个主题「将代码库视为记忆」。下一章会说明为什么把知识放在仓库里，以及如何选择和持续维护留下的记忆。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](04-chapter.md) · [下一篇](06-chapter.md) · [English](../en/05-chapter.md)
