# 第 8 章：Playbook、Skill 与 Principle 各自负责什么

[目录](README.md) · [上一篇](10-chapter.md) · [下一篇](12-chapter.md) · [English](../en/11-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/096f3d) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/cd0205)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
pstack 的内容由<strong>Playbook、Skill、Principle 三类组件</strong>组成。

Playbook 决定工作的顺序。Skill 提供步骤中使用的能力。Principle 则是在特定情境下指导工作判断的规则，例如让变更更小、修复根本原因、报告完成之前检查实物。

本章先讲解三种组件的区别和职责，再依次介绍连接它们的 `Non-negotiables`、两种子 Agent，以及这些组件在实际请求中发挥作用的位置。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章按以下顺序展开。

- 三种组件分别负责「顺序」「能力」「判断」
- Playbook 决定不同类型工作的步骤和顺序
- Skill 是在步骤中调用的能力
- Principle 是工作途中的判断标准，而非步骤或能力
- Non-negotiables 将三种组件连接起来
- 两种子 Agent 是分担工作的对象
- 追踪 Skill 和 Principle 发挥作用的位置
- 小结

<a id="3%E3%81%A4%E3%81%AE%E9%83%A8%E5%93%81%E3%81%AF%E3%80%81%E3%80%8C%E9%A0%86%E5%BA%8F%E3%80%8D%E3%80%8C%E8%83%BD%E5%8A%9B%E3%80%8D%E3%80%8C%E5%88%A4%E6%96%AD%E3%80%8D%E3%82%92%E5%88%86%E6%8B%85%E3%81%97%E3%81%A6%E3%81%84%E3%82%8B"></a>


## 三种组件分别负责「顺序」「能力」「判断」

如开篇所述，三种组件各有分工。<strong>Playbook 负责「做什么、按什么顺序做」这一工作模式；Skill 提供「这一步怎样做」的能力；Principle 则指导「要不要采取这一步、是否尚未完成」等判断</strong>。

三种组件在 `/poteto-mode` 中按以下方式连接。

1. `/poteto-mode` 判断请求类型，选择一个 Playbook（见 [`/poteto-mode`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md) 的「[Playbooks](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#playbooks)」一节）
2. Playbook 写明该类工作的步骤和顺序，例如修复缺陷时按「复现 → 原因 → 修复 → 验证」推进
3. Playbook 的各步骤写明何时使用哪个 Skill；`/how`（了解现状）和 `/arena`（比较多个方案）不会在启动时调用，而是在推进到相应步骤时才调用
4. Principle 是与步骤独立的判断规则；`/poteto-mode` 开始时只读清单（索引），当前工作符合条件时才阅读全文（见同一文件的「[Principles](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#principles)」一节）

三者的区别可汇总如下。

<table class="code-line" data-line="32">
<thead class="code-line" data-line="32">
<tr class="code-line" data-line="32">
<th>角度</th>
<th>Playbook</th>
<th>Skill</th>
<th>Principle</th>
</tr>
</thead>
<tbody class="code-line" data-line="34">
<tr class="code-line" data-line="34">
<td>负责的内容</td>
<td>工作顺序</td>
<td>步骤中使用的能力</td>
<td>判断标准</td>
</tr>
<tr class="code-line" data-line="35">
<td>回答的问题</td>
<td>做什么，按什么顺序做</td>
<td>这一步怎样做</td>
<td>要不要采取这一步，是否还不能算完成</td>
</tr>
<tr class="code-line" data-line="36">
<td>数量（0.15.5）</td>
<td>23</td>
<td>24</td>
<td>23</td>
</tr>
<tr class="code-line" data-line="37">
<td>位置</td>
<td><code>skills/poteto-mode/playbooks/*.md</code></td>
<td><code>skills/&lt;名前&gt;/SKILL.md</code></td>
<td><code>skills/principle-&lt;名前&gt;/SKILL.md</code></td>
</tr>
<tr class="code-line" data-line="38">
<td>文件形式</td>
<td>
<code>/poteto-mode</code> 内的参考文件，不是 Skill</td>
<td>独立的 Skill</td>
<td>每项原则各一份简短 Skill 文件</td>
</tr>
<tr class="code-line" data-line="39">
<td>调用方式</td>
<td>
<code>/poteto-mode</code> 选择并打开符合请求的一个文件</td>
<td>符合 Playbook 步骤或 Non-negotiables 条件时调用；也可像 <code>/how</code> 一样直接调用</td>
<td>开始时读清单，符合条件时读正文</td>
</tr>
<tr class="code-line" data-line="40">
<td>是否接触代码</td>
<td>通过步骤发出指示</td>
<td>执行调查、编写、验证等工作</td>
<td>不接触代码，只作判断</td>
</tr>
<tr class="code-line" data-line="41">
<td>示例</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Bug fix</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/feature.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Feature</strong></a>」</td>
<td>
<code>/how</code>、<code>/architect</code>、<code>/tdd</code>
</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Prove It Works</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-fix-root-causes/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Fix Root Causes</strong></a>」</td>
</tr>
</tbody>
</table>

[第 9 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6b7496)将说明每种组件在什么时候被读取。

<a id="playbook%E3%81%AF%E3%80%81%E4%BD%9C%E6%A5%AD%E3%81%AE%E7%A8%AE%E9%A1%9E%E3%81%94%E3%81%A8%E3%81%AE%E6%89%8B%E9%A0%86%E3%81%A8%E9%A0%86%E7%95%AA%E3%82%92%E6%B1%BA%E3%82%81%E3%82%8B"></a>


## Playbook 决定不同类型工作的步骤和顺序

Playbook 是<strong>按工作类型编写「做什么、按什么顺序做」的步骤文件</strong>。

`/poteto-mode` 会选择并打开符合请求的那个 Playbook。

<a id="%E6%8B%85%E3%81%86%E3%82%82%E3%81%AE%EF%BC%9A%E6%89%8B%E9%A0%86%E3%81%A8%E9%A0%86%E7%95%AA%E3%82%92%E3%80%81%E5%89%8D%E7%BD%AE%E3%81%8D%E3%83%BB%E6%89%8B%E9%A0%86%E3%83%BB%E5%A0%B1%E5%91%8A%E3%81%AE3%E9%83%A8%E3%81%A7%E6%9B%B8%E3%81%8F"></a>


### 职责：用前言、步骤、报告三个部分规定做什么及顺序

Playbook 文件的结构大体相同。

1. <strong>前言</strong>……写明整个 Playbook 要遵守的基本规则。
2. <strong>编号步骤</strong>……会被一字一句抄进 TODO 列表的部分。每一步写明何时使用哪个 Skill、适用哪项 Principle。
3. <strong>Reply 行</strong>……位于每个 Playbook 的末尾，指定工作后回复中应写的内容。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="60"><strong>TODO 列表</strong>……Agent 开始工作时制作的待办事项清单（计划）。在 Cursor 中显示于聊天界面。用户可以查看清单，确认 Agent 执行了哪些步骤、跳过了哪些步骤（<code>skip: &lt;理由&gt;</code>）（随附指南 <a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md" rel="nofollow noopener noreferrer" target="_blank"><code>01-setup.md</code></a>）。</p>
</div></aside>

<a id="skill%E3%81%AF%E3%80%81%E6%89%8B%E9%A0%86%E3%81%AE%E4%B8%AD%E3%81%A7%E5%91%BC%E3%81%B3%E5%87%BA%E3%81%99%E8%83%BD%E5%8A%9B"></a>


## Skill 是在步骤中调用的能力

Skill 是<strong>完成特定工作所需能力与步骤的集合</strong>。

多数 Skill 在步骤需要时由 `/poteto-mode` 调用，其余则由用户直接调用。

<a id="%E6%8B%85%E3%81%86%E3%82%82%E3%81%AE%EF%BC%9A1%E3%81%A4%E3%81%AEskill%E3%81%8C1%E7%A8%AE%E9%A1%9E%E3%81%AE%E4%BB%95%E4%BA%8B%E3%82%92%E6%8B%85%E3%81%86"></a>


### 职责：一项 Skill 负责一类工作

调查使用 `/how` 或 `/why`，设计使用 `/architect`，比较多个方案使用 `/arena`。每项 Skill 负责一类工作。

例外是 `/figure-it-out`，它为没有匹配 Playbook 的任务临时制作该任务专用的 Playbook。  
各 Skill 的详细内容将在[第五部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2a4af5)（第 22～35 章）讨论。

<a id="%E5%91%BC%E3%81%B0%E3%82%8C%E6%96%B9%EF%BC%9A%E5%A4%A7%E5%8D%8A%E3%81%AF%E3%80%81playbook%E3%81%8C%E5%BF%85%E8%A6%81%E3%81%A8%E3%81%99%E3%82%8B%E3%81%A8%E3%81%8D%E3%81%AB-%2Fpoteto-mode-%E3%81%8C%E5%91%BC%E3%81%B6"></a>


### 调用方式：多数 Skill 在 Playbook 需要时由 `/poteto-mode` 调用

<strong>多数 Skill 由 `/poteto-mode` 代为调用，调用时机由 Playbook 的步骤决定</strong>。

24 项 Skill 按调用方式划分如下。

<table class="code-line" data-line="82">
<thead class="code-line" data-line="82">
<tr class="code-line" data-line="82">
<th>调用方式</th>
<th>Skill</th>
</tr>
</thead>
<tbody class="code-line" data-line="84">
<tr class="code-line" data-line="84">
<td>由 <code>/poteto-mode</code> 按步骤或条件调用</td>
<td>
<code>/how</code>、<code>/why</code>、<code>/architect</code>、<code>/arena</code>、<code>/swarm</code>、<code>/interrogate</code>、<code>/unslop</code>、<code>/no-comments</code>、<code>/technical-writing</code>、<code>/tdd</code>、<code>/figure-it-out</code>、<code>/show-me-your-work</code>
</td>
</tr>
<tr class="code-line" data-line="85">
<td>由用户调用</td>
<td>
<code>/setup-pstack</code>、<code>/recall</code>、<code>/teach</code>、<code>/bro</code>、<code>/blast-radius</code>、<code>/reflect</code>、<code>/automate-me</code>、<code>/make-bot-ui</code>、<code>/create-verification-skill</code>、<code>/maintain-verification-skill</code>
</td>
</tr>
<tr class="code-line" data-line="86">
<td>处理 TypeScript 文件时读取</td>
<td>
<code>/typescript-best-practices</code>（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4f9a46" target="_blank">第 29 章</a>）</td>
</tr>
<tr class="code-line" data-line="87">
<td>入口</td>
<td><code>/poteto-mode</code></td>
</tr>
</tbody>
</table>

由用户调用的 Skill，主要在工作的重要节点使用，例如安装（`/setup-pstack`）、恢复工作（`/recall`）、长时间工作结束后（`/reflect`）。

<a id="%E5%88%A9%E7%94%A8%E8%80%85%E3%81%AE%E4%BD%BF%E3%81%84%E6%96%B9%EF%BC%9A%E5%90%84skill%E3%81%AF%E6%98%8E%E7%A4%BA%E3%81%97%E3%81%A6%E5%91%BC%E3%81%B3%E5%87%BA%E3%81%9B%E3%82%8B%E3%81%97%E3%80%81playbook%E3%81%8B%E3%82%89%E5%91%BC%E3%81%B0%E3%82%8C%E3%81%AA%E3%81%8410%E4%BB%B6%E3%81%AF%E5%88%A9%E7%94%A8%E8%80%85%E3%81%8C%E5%91%BC%E3%81%B6"></a>


### 用户怎样使用：任何 Skill 都可以明确调用，未纳入 Playbook 的十项由用户调用

与 Playbook 不同，Skill 可以单独调用。如果只想调查某件事，直接调用有时更快。

```
/how do we cancel runs? do we have an n+1 when we look up every run to cancel?
// 取消执行是怎么实现的？逐个查询待取消的执行时，会不会出现 N+1 查询？
```

<strong>由用户调用的十项 Skill 未被纳入 Playbook 步骤</strong>。

<a id="principle%E3%81%AF%E3%80%81%E6%89%8B%E9%A0%86%E3%82%84%E8%83%BD%E5%8A%9B%E3%81%A7%E3%81%AF%E3%81%AA%E3%81%8F%E3%80%81%E4%BD%9C%E6%A5%AD%E9%80%94%E4%B8%AD%E3%81%AE%E5%88%A4%E6%96%AD%E3%81%AE%E5%9F%BA%E6%BA%96"></a>


## Principle 是工作途中的判断标准，而非步骤或能力

Principle 既不是步骤也不是能力，而是<strong>工作途中作出判断的标准</strong>。

开始工作时只读取索引，适用时才读取正文。

<a id="%E6%8B%85%E3%81%86%E3%82%82%E3%81%AE%EF%BC%9A%E4%BD%9C%E6%A5%AD%E9%80%94%E4%B8%AD%E3%81%AE%E5%88%A4%E6%96%AD%E3%82%92%E4%B8%8B%E3%81%99%E5%9F%BA%E6%BA%96"></a>


### 职责：提供工作途中作判断的标准

Principle 提供<strong>是否采取当前这一步、是否还不能算完成</strong>等<strong>工作途中判断的标准</strong>。例如，当 Agent 想添加抽象或层次时，Principle「[<strong>Laziness Protocol</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-laziness-protocol/SKILL.md)」会使它优先考虑删除和最小变更。「<strong>Prove It Works</strong>」则会在宣布完成之前追问是否已经检查真正的成果物。

每项 Principle 是一份独立文件，Playbook 和 Skill 可通过名称引用。

全部 23 项 Principle 将在[第四部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4b3166)（第 17～21 章）详细介绍。

<a id="non-negotiables%E3%81%8C%E3%80%813%E3%81%A4%E3%81%AE%E9%83%A8%E5%93%81%E3%82%92%E3%81%A4%E3%81%AA%E3%81%90"></a>


## Non-negotiables 将三种组件连接起来

Non-negotiables 是一组<strong>「处于这种情况就使用这个 Skill」的条件；它将跨 Playbook 通用的规则连接起来</strong>。

Playbook 决定不同类型工作的流程，但还有适用于各种工作的共通规则。`/poteto-mode` 的「Non-negotiables」一节规定了这些规则。主要条件如下。

<table class="code-line" data-line="122">
<thead class="code-line" data-line="122">
<tr class="code-line" data-line="122">
<th>条件</th>
<th>调用的组件</th>
</tr>
</thead>
<tbody class="code-line" data-line="124">
<tr class="code-line" data-line="124">
<td>非简单变更、设计判断</td>
<td><code>/how</code></td>
</tr>
<tr class="code-line" data-line="125">
<td>跨函数边界的代码</td>
<td><code>/architect</code></td>
</tr>
<tr class="code-line" data-line="126">
<td>所有写作场景（包括回复）</td>
<td><code>/unslop</code></td>
</tr>
<tr class="code-line" data-line="127">
<td>文档、PR 描述、提交说明</td>
<td><code>/technical-writing</code></td>
</tr>
<tr class="code-line" data-line="128">
<td>提交之前</td>
<td>
<code>/deslop</code>（<code>cursor-team-kit</code> 插件）</td>
</tr>
<tr class="code-line" data-line="129">
<td>审查之前</td>
<td><code>/no-comments</code></td>
</tr>
<tr class="code-line" data-line="130">
<td>UI、IDE、CLI 变更</td>
<td>control 类 Skill（<code>cursor-team-kit</code> 插件）</td>
</tr>
<tr class="code-line" data-line="131">
<td>长时间工作、用户离开后再查看的工作</td>
<td><code>/show-me-your-work</code></td>
</tr>
</tbody>
</table>

Non-negotiables 并非根据「工作类型」，而是根据<strong>工作中出现的情境</strong>作出反应。

无论执行「<strong>Bug fix</strong>」还是「<strong>Feature</strong>」，只要跨函数边界就会用到 `/architect`，提交前则会用到 `/deslop`。

<a id="2%E3%81%A4%E3%81%AE%E3%82%B5%E3%83%96%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AF%E3%80%81%E4%BD%9C%E6%A5%AD%E3%82%92%E5%88%86%E6%8B%85%E3%81%99%E3%82%8B%E7%9B%B8%E6%89%8B"></a>


## 两种子 Agent 是分担工作的对象

pstack 有两种子 Agent：<strong>依照 `/poteto-mode` 方式工作的 `poteto-agent`，以及审查注释的 Comment Sicko</strong>。

<a id="poteto-agent-%E3%81%AF%E3%80%81%2Fpoteto-mode-%E3%81%AE%E6%B5%81%E5%84%80%E3%81%A7%E5%83%8D%E3%81%8F%E3%82%B5%E3%83%96%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88"></a>


### `poteto-agent` 是依照 `/poteto-mode` 方式工作的子 Agent

`poteto-agent`（[`agents/poteto-agent.md`](https://github.com/cursor/plugins/blob/main/pstack/agents/poteto-agent.md)）在开始工作前会阅读 `/poteto-mode` 的规则。在 Playbook 步骤中需要启动子 Agent 时，原则上使用它。

<a id="comment-sicko%E3%81%AF%E3%80%81%E3%82%B3%E3%83%A1%E3%83%B3%E3%83%88%E3%82%92%E6%B6%88%E3%81%97%E3%80%81%E7%9B%B4%E3%81%99%E3%81%B9%E3%81%8D%E3%82%B3%E3%83%BC%E3%83%89%E3%82%92%E5%A0%B1%E5%91%8A%E3%81%99%E3%82%8B%E5%BD%B9"></a>


### Comment Sicko 删除注释，并报告需要修改的代码

Comment Sicko（[`agents/comment-sicko.md`](https://github.com/cursor/plugins/blob/main/pstack/agents/comment-sicko.md)）是审查代码注释、亲自删除没有理由保留的注释的子 Agent。它不会改写应用代码本身。相反，它会在报告中把需要调整形式、以便没有注释也能表达清楚含义的代码（函数或变量等）标为 `MUST KILL`。收到报告后，负责修改代码的是 `/no-comments`。Comment Sicko 不直接调用，而是通过 `/no-comments` 使用。详见[第 31 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8960d3)。

<a id="%E3%82%B5%E3%83%96%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AE%E4%BB%95%E4%BA%8B%E3%81%AF%E3%80%81%E4%B8%BB%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%8C%E8%B2%AC%E4%BB%BB%E3%82%92%E6%8C%81%E3%81%A4"></a>


### 主 Agent 对子 Agent 的工作负责

<strong>即使把工作交给子 Agent，责任仍在主 Agent 身上</strong>。

`/poteto-mode` 要求主 Agent 先查看差异，再用自己的话向用户报告，而不是原样转交子 Agent 的「做完了」。

这也是将[第 2 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/27a183)提出的「信任成果物，而非 Agent」应用到子 Agent 的规则。

<a id="skill%E3%81%A8principle%E3%81%8C%E5%83%8D%E3%81%8F%E5%A0%B4%E6%89%80%E3%82%92%E3%81%9F%E3%81%A9%E3%82%8B"></a>


## 追踪 Skill 和 Principle 发挥作用的位置

<strong>Skill 出现在复现、调查、设计、提交等需要「执行工作」的环节；Principle 出现在选择复现方式、修复形式和规模、判定完成、安排提交顺序等需要作判断并「做出决定」的环节</strong>。

本书的实际示例是以下请求。

```
/poteto-mode the export writes duplicate rows when a retry lands mid-run. repro first, then fix and verify.
// 如果重试发生在执行中途，导出会写入重复的行。先复现，再修复，然后验证。
```

该请求会分配给「<strong>Bug fix</strong>」Playbook，TODO 列表以它的六个步骤开头（第六步是执行「[<strong>Opening a PR</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md)」来创建 PR，所以下表省略该步）。这里我们追踪每一步何时调用 Skill、何时运用 Principle。

下表将 `playbooks/bug-fix.md`、`/poteto-mode` 中 Non-negotiables 和 Principle 索引规定的条件，应用到这一请求。实际工作中选择哪些 Principle，取决于 Agent 当时如何判断索引中的条件是否成立。

<a id="%E6%89%8B%E9%A0%86%E3%81%94%E3%81%A8%E3%81%AB%E3%80%81%E5%91%BC%E3%81%B0%E3%82%8C%E3%82%8Bskill%E3%81%A8%E5%8A%B9%E3%81%8Fprinciple%E3%81%8C%E6%B1%BA%E3%81%BE%E3%82%8B"></a>


### 每一步都决定了调用的 Skill 和适用的 Principle

<table class="code-line" data-line="174">
<thead class="code-line" data-line="174">
<tr class="code-line" data-line="174">
<th>「Bug fix」步骤</th>
<th>调用的 Skill</th>
<th>符合条件的 Principle</th>
</tr>
</thead>
<tbody class="code-line" data-line="176">
<tr class="code-line" data-line="176">
<td>开始时</td>
<td>（由 <code>/poteto-mode</code> 读取 Principle 索引）</td>
<td>整个索引，此时不读正文</td>
</tr>
<tr class="code-line" data-line="177">
<td>1. 自己在相同操作界面复现</td>
<td>相应的 control 类 Skill 或验证 Skill</td>
<td>「<strong>Fix Root Causes</strong>」（先复现）</td>
</tr>
<tr class="code-line" data-line="178">
<td>2. 用二分法定位原因</td>
<td>
<code>/how</code>（目标子系统）、<code>/why</code>（回归的历史）</td>
<td>「<strong>Fix Root Causes</strong>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-guard-the-context-window/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Guard the Context Window</strong></a>」</td>
</tr>
<tr class="code-line" data-line="179">
<td>3. 规划修复</td>
<td>跨函数边界时用 <code>/architect</code>；实现工作交给子 Agent</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-model-the-domain/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Model the Domain</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-make-operations-idempotent/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Make Operations Idempotent</strong></a>」、「<strong>Laziness Protocol</strong>」</td>
</tr>
<tr class="code-line" data-line="180">
<td>4. 在相同操作界面验证</td>
<td>与「复现缺陷的步骤（步骤 1）」相同的 control 类 Skill，或验证 Skill</td>
<td>「<strong>Prove It Works</strong>」</td>
</tr>
<tr class="code-line" data-line="181">
<td>5. 先于修复提交失败的复现测试</td>
<td>如果有成本低的本地测试，就使用 <code>/tdd</code>
</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-sequence-verifiable-units/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Sequence Work into Verifiable Units</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-test-behavior-not-implementation/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Test Behavior, Not Implementation</strong></a>」</td>
</tr>
<tr class="code-line" data-line="182">
<td>回复</td>
<td>
<code>/unslop</code>（「Writing the reply」一节）</td>
<td>点名改变了判断的 Principle</td>
</tr>
</tbody>
</table>

各步骤的细节见[第 11 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6fcb42)，Principle 发挥作用的场景将在[第 17 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b)到[第 20 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/c155cc)讨论。

<a id="%E6%9D%A1%E4%BB%B6%E3%81%AB%E8%A9%B2%E5%BD%93%E3%81%97%E3%81%AA%E3%81%84skill%E3%81%AF%E5%91%BC%E3%81%B0%E3%82%8C%E3%81%AA%E3%81%84"></a>


### 不符合条件的 Skill 不会被调用

例如，`/show-me-your-work` 用于长时间工作或用户离开座位期间的工作，记录判断过程。本例的请求并没有说用户会离开，因此不符合这个条件。如果任务历时很长或用户会离开，则可能符合条件；但这种情况下，按[第 7 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)介绍的规则，也可能被交给 `/figure-it-out`。

即使同为「<strong>Bug fix</strong>」任务，请求的内容和途中发生的情境不同，调用的 Skill 与适用的 Principle 也会变化。只读取符合条件的内容，这一设计就是下一章[第 9 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6b7496)的主题。

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 小结

- <strong>三种组件的区别</strong>……Playbook 负责工作顺序，Skill 提供步骤中使用的能力，Principle 指导是否采取当前步骤、工作是否尚未完成等判断。
- <strong>Playbook</strong>……由前言、步骤和 Reply 行三个部分组成。
- <strong>Skill</strong>……一项 Skill 负责一类工作。多数由 `/poteto-mode` 按步骤调用；由用户调用的十项未被纳入 Playbook 步骤。
- <strong>Principle</strong>……不是步骤或能力，而是判断是否采取当前步骤、是否完成等问题的标准。详细内容见[第四部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4b3166)。
- <strong>Non-negotiables</strong>……响应工作中出现的情境，跨 Playbook 调用 Skill，起连接作用。
- <strong>子 Agent</strong>……`poteto-agent` 依照 `/poteto-mode` 的方式工作；Comment Sicko 删除注释，并报告需要修改的代码。主 Agent 仍对委派出去的工作负责。
- <strong>实际示例</strong>……在「<strong>Bug fix</strong>」的各步骤中，复现与调查会调用 control 类 Skill 及 `/how`、`/why`，修复时会用到 `/architect`，提交时可用 `/tdd`；「<strong>Fix Root Causes</strong>」「<strong>Prove It Works</strong>」等 Principle 指导相应判断。

下一章[第 9 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6b7496)将讨论这些组件何时读取、只在需要时读取所需内容的机制，以及其背后的思路、优点与弱点。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](10-chapter.md) · [下一篇](12-chapter.md) · [English](../en/11-chapter.md)
