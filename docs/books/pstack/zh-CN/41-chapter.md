# 第 35 章：/poteto-mode，pstack 的路由器

[目录](README.md) · [上一篇](40-chapter.md) · [下一篇](42-chapter.md) · [English](../en/41-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4f8911) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/9cd5c1)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
`/poteto-mode` 是 pstack 的入口。它<strong>读取请求，从 23 个 Playbook 中选择一个，并按其步骤推进工作</strong>（[第 7 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)）。

本章介绍 `/poteto-mode` 的主体文件 [`SKILL.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md)。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="5"><code>/poteto-mode</code> 的调用方法及请求路由已在<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d" target="_blank">第 7 章</a>介绍；Playbook、Skill、Principle 的职责，以及「Non-negotiables」的主要条件，已在<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/096f3d" target="_blank">第 8 章</a>介绍。本章将说明那些章节尚未涉及的 <code>/poteto-mode</code> 主体文件 <code>SKILL.md</code> 的内容。</p>
</div></aside>

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章包含以下内容。

- `/poteto-mode` 是什么
- 「Non-negotiables」：必须做的事
- 「Principles」：原则索引
- 「Autonomy」：可自行推进与必须停下的范围
- 「Subagents」：委派规则
- 「Writing the reply」：回复写法
- 「Comments」：注释写法
- 「Playbooks」：Playbook 索引
- 调整成自己的工作方式
- 小结

<a id="%2Fpoteto-mode-%E3%81%A8%E3%81%AF"></a>


## `/poteto-mode` 是什么

本章标题中的「Router」（路由器）指 `/poteto-mode` 将请求分配给合适 Playbook 的职责。随附指南也将介绍 `/poteto-mode` 的页面（[`02-poteto-mode.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/02-poteto-mode.md)）命名为「Route work through `/poteto-mode`」（让工作经由 `/poteto-mode` 路由）。

除了将请求分配给 Playbook 的规则，`/poteto-mode` 还写有<strong>分配之后适用于整个工作过程的规则</strong>。例如：

- 编写代码前，先确定数据的形态（原则「[<strong>Model the Domain</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-model-the-domain/SKILL.md)」）
- 在不可撤销的操作前一定停下
- 用简短、明确的陈述句回复

`SKILL.md` frontmatter 中的 `description` 将 `/poteto-mode` 描述为「poteto 的 Agent 风格」（poteto's agent style），并列出这套风格追求的五点。

- 简洁而详细的回复（concise, detailed responses）
- 经过深思熟虑的子 Agent 委派（deliberate subagents）
- 去除 AI 腔调的文字（unslopped prose）
- 简单的代码（simple code）
- 已经验证的工作（verified work）

安装完 pstack 后（[第 34 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8487f0)），用户将工作<strong>请求交给 `/poteto-mode`</strong>。

`/poteto-mode` 设置了 `disable-model-invocation: true`，所以只有用户按名称调用时才会启动。<strong>调用一次后，在同一对话的后续轮次中，即使不再写 `/poteto-mode`，它仍会生效，直到用户说停用</strong>（[README](https://github.com/cursor/plugins/blob/main/pstack/README.md)、[第 7 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)）。即使它处于生效状态，也只有在请求符合某个 Playbook，或需要严格流程时，才会按 Playbook 的步骤推进。

`SKILL.md` 的正文由「Non-negotiables」到「Playbooks」的七个小节构成。

<a id="%E3%80%8Enon-negotiables%E3%80%8F%EF%BC%9A%E5%BF%85%E3%81%9A%E3%81%99%E3%82%8B%E3%81%93%E3%81%A8"></a>


## 「Non-negotiables」：必须做的事

「[Non-negotiables](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#non-negotiables)」列出「遇到这种情况，必须这样做」的规则。主要规则已在[「第 8 章：Non-negotiables 串联三个组成部分」](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/096f3d#non-negotiables%E3%81%8C%E3%80%813%E3%81%A4%E3%81%AE%E9%83%A8%E5%93%81%E3%82%92%E3%81%A4%E3%81%AA%E3%81%90)中介绍。

「Non-negotiables」开头有两条适用于所有规则的要求。

- Agent 应在回复中点名影响自己判断的原则，并说明该原则改变了哪项选择
- 只有本次会话中完整读过相应原则 Skill 文件的原则，才可以被列举

例如，修复[第 8 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/096f3d)的实际案例（重试在运行中途发生时，导出文件会写出重复行）后，回复中可以加入以下内容。

```
Fix Root Causes に従い、再試行のたびに書き出し済みの行をもう一度書き込む箇所を直しました。書き出した後で重複を取り除く処理は足していません。
Make Operations Idempotent に従い、書き込みを行のキーで上書きする形に変えました。同じ実行を2回しても、行数は変わりません。
```

也就是说，以下回复不符合上述两条要求。

```
Fix Root Causes と Make Operations Idempotent に従いました
```

因为只列原则名称的回复，无法让人知道 Agent 根据原则作了什么决定。而且，如果 Agent 说不清做了什么决定，它可能根本没有实际应用该原则。

用户看到原则名称和 Agent 的判断，就能核对 Agent 根据什么标准，作出了什么选择。

<strong>除了第 8 章介绍的规则及上述共同要求，还有以下规则</strong>。

<table class="code-line" data-line="75">
<thead class="code-line" data-line="75">
<tr class="code-line" data-line="75">
<th>情形</th>
<th>必须做的事</th>
<th>详情</th>
</tr>
</thead>
<tbody class="code-line" data-line="77">
<tr class="code-line" data-line="77">
<td>Agent 准备问用户「哪种做法更好」</td>
<td>提问前，先把问题的答案分为「执行后可确定的事实」或「需由人决定的判断」</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7549a7" target="_blank">第 38 章</a></td>
</tr>
<tr class="code-line" data-line="78">
<td>编写代码</td>
<td>先弄清数据的形态，再选择结构。遵循原则「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-model-the-domain/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Model the Domain</strong></a>」</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b" target="_blank">第 18 章</a></td>
</tr>
<tr class="code-line" data-line="79">
<td>并行展开工作</td>
<td>覆盖、竞赛、关卡（验证门槛）和拆分探索使用 <code>/swarm</code>；比较设计或代码，选择一个基础方案并移植其他方案的优点，则使用 <code>/arena</code>
</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346" target="_blank">第 24 章</a></td>
</tr>
<tr class="code-line" data-line="80">
<td>存在分歧的设计</td>
<td>合并前使用 <code>/interrogate</code></td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/997880" target="_blank">第 27 章</a></td>
</tr>
<tr class="code-line" data-line="81">
<td>并非显而易见的多步骤工作</td>
<td>写出吞吐量检查点，与「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/feature.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Feature</strong></a>」的第 3 步相同</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f1e85b" target="_blank">第 12 章</a></td>
</tr>
<tr class="code-line" data-line="82">
<td>询问 PR 状态的请求</td>
<td>使用「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Babysit</strong></a>」，而非 Cursor 内置的 <code>/autopilot</code> Skill（旧名 babysit）。仅仅打开 PR 时不使用它</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e" target="_blank">第 14 章</a></td>
</tr>
<tr class="code-line" data-line="83">
<td>用户请求合并所有检查都通过的 PR 堆栈</td>
<td>执行「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/shipping.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Shipping</strong></a>」。即使所有检查都通过，也不据此认定安全；每个 PR 都要独立确认后再合并</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e" target="_blank">第 14 章</a></td>
</tr>
<tr class="code-line" data-line="84">
<td>Bugbot 或 Agent 的安全审阅评论</td>
<td>不要照单全收；逐条分为修复（fix）、驳回（dismiss）或追问（ask）。因为 Bugbot 等虽然能发现真实缺陷，也会提出并非问题或过于琐碎的意见</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e" target="_blank">第 14 章</a></td>
</tr>
<tr class="code-line" data-line="85">
<td>工作中发现 Skill 已损坏</td>
<td>不要停下工作，也不要默默绕过；用该 Skill 专属的 PR 修复</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8263c0" target="_blank">第 13 章</a></td>
</tr>
</tbody>
</table>

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="88">
<li class="code-line" data-line="88">
<strong>数据的形态</strong>……数据拥有哪些字段，以及可以处于哪些状态</li>
<li class="code-line" data-line="89">
<strong>吞吐量检查点</strong>……考虑工作「如何并行拆分」后，在待办清单中记录的四项内容：需先完成的步骤、可并行推进的工作、共同修改的状态，以及可安全拆分的最小单元</li>
<li class="code-line" data-line="90">
<strong>询问 PR 状态的请求</strong>……例如「check on PR X（看看 PR X 的情况）」「get it green（让所有检查通过）」</li>
<li class="code-line" data-line="91">
<strong>覆盖</strong>……将多个范围分配给 Worker，确保检查没有遗漏的拆分方式</li>
<li class="code-line" data-line="92">
<strong>竞赛</strong>……让多个 Worker 竞争解决同一任务的拆分方式</li>
<li class="code-line" data-line="93">
<strong>关卡</strong>……原文为 gauntlet。pstack 文件未定义，本书将其定义为：针对一项变更安排多道验证，要求全部通过的拆分方式（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346" target="_blank">第 24 章</a>）</li>
<li class="code-line" data-line="94">
<strong>拆分探索</strong>……将待搜索的地方分成多个范围，让每个 Worker 各调查一处（例如查找缺陷原因时，为每个可疑模块分配一个 Worker）</li>
<li class="code-line" data-line="95">
<strong>堆栈</strong>……具有父子关系的一列 PR（一个 PR 之上再叠另一个 PR）。从第二个开始，每个 PR 都以紧邻其下的 PR 的分支为合并目标；只有最底部的 PR 以 <code>main</code> 等主线分支（trunk）为合并目标（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e" target="_blank">第 14 章</a>）</li>
<li class="code-line" data-line="96">
<a href="https://cursor.com/ja/docs/bugbot" rel="nofollow noopener noreferrer" target="_blank"><strong>Bugbot</strong></a>……Cursor 提供的自动审阅 PR 功能</li>
</ul>
</div></aside>

<a id="%E5%B0%8B%E3%81%AD%E3%82%8B%E5%89%8D%E3%81%AB%E3%80%81%E7%AD%94%E3%81%88%E3%81%8C%E4%BA%8B%E5%AE%9F%E3%81%8B%E5%88%A4%E6%96%AD%E3%81%8B%E3%82%92%E5%88%86%E3%81%91%E3%82%8B"></a>


### 提问前，区分答案是事实还是判断

在表格的规则中，<strong>原文解释篇幅最长的是第一条「提问前先分类」</strong>。

Agent 在准备问用户「哪种做法更好」「应该怎么做」时，要先判断问题的答案属于以下哪一类。

- <strong>执行后可以确定的事实</strong>……例如行为、处理耗时、布局、输出、性能等。Agent 不询问人，而是自行查证。具体查证方式取决于请求被分配到哪个 Playbook，分为两种。
  - 「[<strong>Investigation</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/investigation.md)」以外的 Playbook……使用「[<strong>Prototype</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/prototype.md)」Playbook 尝试，并根据结果决定。
  - 「<strong>Investigation</strong>」Playbook……不制作原型，而是继续调查，根据阅读代码等取得的证据回答。
- <strong>需由人决定的判断</strong>……尝试也得不到答案的产品决策或偏好。Agent 只向人询问这类判断。

在「<strong>Investigation</strong>」中不制作原型，是因为它的任务是不修改代码地调查，再向用户给出附有依据的答案（[第 10 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ea525d)）。

<a id="%E5%88%A9%E7%94%A8%E8%80%85%E3%81%8C%E4%BD%9C%E6%A5%AD%E3%82%92%E4%B8%80%E4%BB%BB%E3%81%97%E3%81%9F%E3%81%A8%E3%81%8D"></a>


#### 用户将工作全权交付时

如果用户把工作全权交给 Agent，Agent 会在途中自行决定出现的判断，不向用户询问，继续推进；并在最终给用户的报告中说明自己作出的判断。

报告内容依判断类型分成以下两类。

- <strong>委托范围内的判断</strong>……例如测试放在哪里、如何拆分函数等工作中由 Agent 作出的选择。报告需说明采用了哪个选项。
- <strong>需由人决定的判断</strong>……尝试也得不到答案的产品决策或偏好。报告除了说明采用了哪个选项，还要写明理由，以及用户若想撤销该选择可以使用的措辞（例如「撤回」）。

不过，即使用户全权交付工作，在以下两种情况下，Agent 仍要停下，等待用户判断。

- 用户预先指定的停顿检查点（例如合并前）
- 本章[「Autonomy」一节](#%E3%80%8Eautonomy%E3%80%8F%EF%BC%9A%E5%B0%8B%E3%81%AD%E3%81%9A%E3%81%AB%E9%80%B2%E3%82%80%E7%AF%84%E5%9B%B2%E3%81%A8%E3%80%81%E6%AD%A2%E3%81%BE%E3%82%8B%E7%AF%84%E5%9B%B2)将介绍的「Always pause」清单（例如向共享分支 force-push、部署等不可撤销的操作）

<a id="%E3%80%8Eprinciples%E3%80%8F%EF%BC%9A%E5%8E%9F%E5%89%87%E3%81%AE%E7%B4%A2%E5%BC%95"></a>


## 「Principles」：原则索引

「[Principles](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#principles)」是 23 项原则的索引。<strong>每一项依次列出原则名称、适用条件和原则要点</strong>。

23 项原则分为以下五类。

<table class="code-line" data-line="132">
<thead class="code-line" data-line="132">
<tr class="code-line" data-line="132">
<th>分类</th>
<th>原则</th>
<th>本书章节</th>
</tr>
</thead>
<tbody class="code-line" data-line="134">
<tr class="code-line" data-line="134">
<td>Core</td>
<td>Laziness Protocol、Foundational Thinking、Redesign from First Principles、Attack the Premise、Subtract Before You Add、Minimize Reader Load、Outcome-Oriented Execution、Experience First、Exhaust the Design Space、Build the Lever</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章</a></td>
</tr>
<tr class="code-line" data-line="135">
<td>Architecture</td>
<td>Model the Domain、Boundary Discipline、Type System Discipline、Make Operations Idempotent、Migrate Callers Then Delete Legacy APIs、Separate Before Serializing Shared State</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b" target="_blank">第 18 章</a></td>
</tr>
<tr class="code-line" data-line="136">
<td>Verification</td>
<td>Prove It Works、Fix Root Causes、Sequence Work into Verifiable Units、Test Behavior, Not Implementation</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/1fb019" target="_blank">第 19 章</a></td>
</tr>
<tr class="code-line" data-line="137">
<td>Delegation</td>
<td>Guard the Context Window、Never Block on the Human</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/c155cc" target="_blank">第 20 章</a></td>
</tr>
<tr class="code-line" data-line="138">
<td>Meta</td>
<td>Encode Lessons in Structure</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dd2d9f" target="_blank">第 21 章</a></td>
</tr>
</tbody>
</table>

Agent 通过 `/poteto-mode` 开始工作时，会先读这份索引，选择适用于当前工作的原则。由于索引就在 `/poteto-mode` 的 `SKILL.md` 中，加载 `/poteto-mode` 时也会一并读到索引（[第 9 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6b7496)）。

例如，「Model the Domain」在索引中的条目如下。

原则名称后面依次是适用条件（例如编写具有状态的逻辑）和原则要点（通过结构表达领域）。

```
- **Model the Domain** (**principle-model-the-domain**). Writing stateful logic, or code that branches a lot or repeats a shape assumption across files. Encode the domain in a structure (state machine, typed model, table or registry, reducer, boundary, the right collection) instead of scattered conditionals.
// 状態を持つロジックを書くとき、または分岐が多いコードや、同じ形の前提をファイルをまたいで繰り返すコードを書くとき。散らばった条件分岐ではなく、構造（状態機械、型付きのモデル、表や登録簿、reducer、境界、適切なコレクション）でドメインを表す。
```

Agent 决定应用某项原则时，不会只凭索引中的要点行事，还会完整阅读该原则的 Skill 文件（`SKILL.md`）。

这条规则写在 `/poteto-mode` 的 `SKILL.md` 的「[Principles](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#principles)」小节开头。

> Read the leaf skill in full for any principle you apply.
>
> 对于要应用的原则，须完整阅读其 Skill 文件。

同一份 `SKILL.md` 的「[Non-negotiables](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#non-negotiables)」小节开头还写道：

> Cite only principles whose leaf SKILL.md you read this session.
>
> 只能引用本次会话中读过相应 `SKILL.md` 的原则。

也就是说，Agent 受到约束，不应在回复中提及自己没有读过 Skill 文件的原则名称。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="168"><strong>先只读取索引，应用原则时再读取其全文</strong>的加载方式见<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6b7496" target="_blank">第 9 章</a>；各项原则的内容见<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4b3166" target="_blank">第 4 部分</a>（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章</a>至<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dd2d9f" target="_blank">第 21 章</a>）。</p>
</div></aside>

<a id="%E3%80%8Eautonomy%E3%80%8F%EF%BC%9A%E5%B0%8B%E3%81%AD%E3%81%9A%E3%81%AB%E9%80%B2%E3%82%80%E7%AF%84%E5%9B%B2%E3%81%A8%E3%80%81%E6%AD%A2%E3%81%BE%E3%82%8B%E7%AF%84%E5%9B%B2"></a>


## 「Autonomy」：可自行推进与必须停下的范围

「[Autonomy](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#autonomy)」区分<strong>可不询问用户而推进的工作，以及必须停下的工作</strong>，还规定了用户征求意见时的回答方式。它由以下四段组成。

<table class="code-line" data-line="175">
<thead class="code-line" data-line="175">
<tr class="code-line" data-line="175">
<th>段落</th>
<th>规则</th>
</tr>
</thead>
<tbody class="code-line" data-line="177">
<tr class="code-line" data-line="177">
<td>「Just do it.」</td>
<td>可不经询问自由使用 MCP 工具。可撤销的工作与对外行动（在团队聊天中发帖、更新工单、启动评估〔「Eval」，<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8263c0" target="_blank">第 13 章</a>〕）也可不经询问直接进行</td>
</tr>
<tr class="code-line" data-line="178">
<td>「Always pause」</td>
<td>遇到不可撤销的操作（向共享分支 force-push、部署、删除数据、给客户发消息），一定要停下</td>
</tr>
<tr class="code-line" data-line="179">
<td>「Session overrides」</td>
<td>如果用户说「别停」「我要睡了」「一直运行到做完」「都交给你」，就不要停下，持续推进</td>
</tr>
<tr class="code-line" data-line="180">
<td>「No is an acceptable answer.」</td>
<td>在用户问「该不该这样做」、提议增加工作，或展示一种做法时，Agent 应诚实表达自己的意见。如果不赞同，可以拒绝或反驳（例如回答「这不值得加入」）。不因方案来自用户就表示同意，而应坦率回答</td>
</tr>
</tbody>
</table>

即使收到「Session overrides」的指示，Agent 遇到表格第二行「Always pause」所指的不可撤销操作时，仍会停下。这项例外没有写在「Session overrides」段落，而是写在「Non-negotiables」的规则中（见本章[「用户将工作全权交付时」](#%E5%88%A9%E7%94%A8%E8%80%85%E3%81%8C%E4%BD%9C%E6%A5%AD%E3%82%92%E4%B8%80%E4%BB%BB%E3%81%97%E3%81%9F%E3%81%A8%E3%81%8D)）。

<a id="%E3%80%8Esubagents%E3%80%8F%EF%BC%9A%E5%A7%94%E4%BB%BB%E3%81%AE%E6%B1%BA%E3%81%BE%E3%82%8A"></a>


## 「Subagents」：委派规则

「[Subagents](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#subagents)」规定主 Agent 将部分任务委派给子 Agent 时应遵守什么。它包含以下两方面。

- <strong>委派对象</strong>……要委派给哪个子 Agent
- <strong>默认设置</strong>……每次启动子 Agent 时使用的设置

先看委派对象。主 Agent 在 Playbook 步骤中启动子 Agent 时，默认使用 `poteto-agent`。不过，`/how`、`/why`、`/interrogate`、`/reflect`、`/swarm` 为了用多个模型审阅，自行决定要启动哪些子 Agent。主 Agent 不会把这些 Skill 选择的子 Agent 换成 `poteto-agent`。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="193"><strong><code>poteto-agent</code></strong>……pstack 随附的子 Agent（<a href="https://github.com/cursor/plugins/blob/main/pstack/agents/poteto-agent.md" rel="nofollow noopener noreferrer" target="_blank"><code>agents/poteto-agent.md</code></a>）。开始工作前，它会完整阅读 <code>/poteto-mode</code> 的 <code>SKILL.md</code>，包括 Principle 索引。因此，它按与主 Agent 相同的 <code>/poteto-mode</code> 规则工作。</p>
</div></aside>

接下来是默认设置。无论启动哪一个子 Agent，主 Agent 每次都使用相同的设置，共有以下四项。

- <strong>在后台运行</strong>……主 Agent 不必等待子 Agent 完成，可以继续自己的工作。
- <strong>以 agent mode 运行</strong>……agent mode 允许编辑文件和运行工具。如果以只读模式运行，子 Agent 将无法使用 MCP 工具。
- <strong>在请求中写文件路径，而不是文件内容</strong>……子 Agent 自行打开并阅读所给路径的文件。
- <strong>按角色指定模型</strong>……明确指定各角色的子 Agent 使用哪种模型。角色及默认模型见[「第 34 章：角色一览」](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8487f0#%E5%BD%B9%E5%89%B2%E3%81%AE%E4%B8%80%E8%A6%A7)，可通过 `/setup-pstack` 修改。

<strong>Agent 在所有委派中均遵守这些默认设置</strong>。

第四项按角色指定模型，对委派编写代码还有专门规定。主 Agent 根据变更难度决定委派给哪种模型。

- <strong>最困难的变更</strong>（跨多个位置的设计、复杂并发处理、容易漏掉细微错误的算法）……交给判断能力最强的模型（默认 `claude-opus-5-5-max`）。无论指示模糊、需要判断，还是步骤规定得很细、只需照着执行，只要属于最困难的变更，主 Agent 都会交给这个模型。
- <strong>琐碎的机械编辑</strong>（例如替换名称）……交给编写代码时响应迅速的模型（默认 `grok-4.7-xhigh-fast`）。

委派模型可通过 `/setup-pstack` 写出的规则文件修改。Agent 根据委派内容读取该文件中的以下行，决定模型。

- <strong>委派最困难的变更时</strong>……`hardest tasks` 行
- <strong>委派各 Playbook 的编码工作时</strong>……相应 Playbook 的行（`feature, refactoring`、`bug-fix`、`perf-issue`、`hillclimb`）
- <strong>委派文字和判断时</strong>……`judgment and prose` 行

规则文件中没有相应行的角色继续使用默认模型。值为 `inherit-parent` 或 `auto` 的角色，使用父对话的模型（[第 34 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8487f0)）。

「Subagents」还规定如何处理子 Agent 返回的结果。

[第 6 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/33f073)所说的第二意见（将同一请求交给另一模型）的定义，也写在「Subagents」中。「Subagents」认为，<strong>如果另一种模型给出相同答案，就是答案可信的有力线索</strong>。

主 Agent 有时会在子 Agent 工作过程中将其停止，再重新启动。反复这样做，子 Agent 可能会悄然遗漏最初收到的指令（上下文）的一部分。

因此，对于多次停止并重新启动的子 Agent，即使它报告「完成了」，主 Agent 也不会直接相信。这时，主 Agent 会将最初的指令及所有待办工作重新整合为一份请求，交给新的子 Agent。

<a id="%E3%80%8Ewriting-the-reply%E3%80%8F%EF%BC%9A%E8%BF%94%E7%AD%94%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9"></a>


## 「Writing the reply」：回复写法

「[Writing the reply](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#writing-the-reply)」要求 Agent <strong>在撰写回复时遵守写作规则，而不是写完后才遵守</strong>。

> Write the reply clean as you draft it. A cleanup pass after drafting does not remove these patterns.
>
> 在写回复的同时把它写好。写完后统一清理，并不能消除这些写作模式。

「Writing the reply」指出，如果等写完再统一检查，下表所列的违规写法仍会残留，难以全部改掉。

引文中的「这些写作模式」对应以下七条规则。

<table class="code-line" data-line="238">
<thead class="code-line" data-line="238">
<tr class="code-line" data-line="238">
<th>规则</th>
<th>内容</th>
</tr>
</thead>
<tbody class="code-line" data-line="240">
<tr class="code-line" data-line="240">
<td>简短的陈述句</td>
<td>一句话只表达一件事，以句号结束</td>
</tr>
<tr class="code-line" data-line="241">
<td>不用长破折号（em dash，<code>—</code>）</td>
<td>列表项和标题也不要用破折号拼接，而应写成句子（例如不用 <code>main.js — 保存处理</code>，而写「<code>main.js</code> 负责保存处理。」）</td>
</tr>
<tr class="code-line" data-line="242">
<td>不用句中冒号</td>
<td>同 unslop 的规则 14（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/44857b" target="_blank">第 32 章</a>）；列表前的冒号可以使用</td>
</tr>
<tr class="code-line" data-line="243">
<td>不要借口简短而删减内容</td>
<td>句子要简短，但 Playbook 要求写入回复的事项不能删除（例如详细经过、权衡、所选方案和尚未确定的事）</td>
</tr>
<tr class="code-line" data-line="244">
<td>先写对使用者及下一个代码维护者的影响</td>
<td>先于实现细节写明这项工作服务于谁（例如应用用户、使用库的同事），以及对他们有什么变化。随后写明下一个负责此代码的工程师将接手什么</td>
</tr>
<tr class="code-line" data-line="245">
<td>不编造链接或引用</td>
<td>也不编造 transcript（与 Agent 的对话记录）引用。链接仅限本次会话中创建或读过的链接。PR 链接按 <code>https://github.com/&lt;owner&gt;/&lt;repo&gt;/pull/&lt;number&gt;</code> 的格式书写</td>
</tr>
<tr class="code-line" data-line="246">
<td>为主张附上证据或标签</td>
<td>使用 measured（测量所得）、inferred（根据证据推断）、guess（猜测）。预测和未经验证的原因标为 guess。自己能执行的检查，不推给人来做</td>
</tr>
</tbody>
</table>

每个 Playbook 最终都以遵守这些规则的回复结束。

例如，[README](https://github.com/cursor/plugins/blob/main/pstack/README.md) 中有一个关于「滚动位置漂移」的请求示例。

```
/poteto-mode this pr has a subtle bug where the scroll drifts every 750ms even when idle. repro first, then fix and verify.
// このPRには気づきにくいバグがある。アイドル中でも750msごとにスクロールがずれる。まず再現して、それから直して、確かめて。
```

修复「滚动位置漂移」请求中的缺陷后，用违反规则和符合规则的方式回复，分别如下。

```
前：直りました: 原因はタイマーだったので止めておきました、たぶんもう大丈夫だと思います。

後：アイドル中にスクロールがずれる不具合は、もう起きません（measured）。
原因は、750msごとに位置を書き換えるタイマーでした（measured）。
次にこのコードを受け持つ人は、タイマーを追加するとき、アイドル中に位置を書き換えないかを確かめる必要があります（inferred）。
```

前一种回复在句中用了冒号，一句话里塞进了三件事，而且无法判断「修好了」是测量结论还是猜测。后一种先说清应用用户得到什么改变，再说明下一个维护代码的人需要注意什么，并给每项主张加上标签。

这样写出的回复，让用户能逐句看出发生了什么变化，以及 Agent 如何确认。

<a id="%E3%80%8Ecomments%E3%80%8F%EF%BC%9A%E3%82%B3%E3%83%A1%E3%83%B3%E3%83%88%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9"></a>


## 「Comments」：注释写法

「[Comments](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#comments)」要求将[上一节](#%E3%80%8Ewriting-the-reply%E3%80%8F%EF%BC%9A%E8%BF%94%E7%AD%94%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9)的回复规则用于代码注释。与回复一样，<strong>注释也要在写的时候遵守规则，而不是写完后再修改</strong>。

此外，它规定<strong>只在注释中留下无法从代码本身看出的原因</strong>。例如「为了规避库中的缺陷」就是值得保留的注释所解释的原因。

这项规则还对验证脚本和测试脚本作出规定。

脚本中不要写 `// Phase 1: add cards`（阶段 1：添加卡片）之类解释处理阶段的注释。应通过断言（检查条件是否成立、不成立则使脚本失败的语句）或日志输出的文字，说明正在验证什么。

下例脚本添加两张卡片并重启应用，然后检查卡片是否仍然存在。

```
// 前：段階を説明するコメントで手順を示す
async function checkBefore() {
  // 段階1：カードを追加する
  await addCards(2);
  // 段階2：アプリを再起動する
  await restartApp();
  assert((await countCards()) === 2, "失敗");
}

// 後：アサーションの文字列で、何を確かめたかを示す
async function checkAfter() {
  await addCards(2);
  await restartApp();
  assert((await countCards()) === 2, "再起動しても、カードが保存されている");
}
```

前一种写法里，断言失败时只会显示「失败」。要知道它在检查什么，还得阅读注释。

后一种写法在失败时，从运行结果中的文字就能看出「重启后卡片仍被保存」这一点没有得到证实。

这样一来，若把步骤说明写在断言的文字中，而非注释中，说明就会留在运行结果里。

「Comments」的规则不限于测试脚本，适用于 Agent 创建的所有文件，也包括让子 Agent 编写的代码变更。

代码中的注释是否真的必要，将由审阅前运行的 `/no-comments`（[第 31 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8960d3)）检查。

<a id="%E3%80%8Eplaybooks%E3%80%8F%EF%BC%9Aplaybook%E3%81%AE%E7%B4%A2%E5%BC%95"></a>


## 「Playbooks」：Playbook 索引

「[Playbooks](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#playbooks)」是供 Agent 选择符合请求的 Playbook 的索引。<strong>每个条目写明 Playbook 名称、适用的工作，以及文件位置</strong>。Agent 从索引中选出符合请求的 Playbook，打开文件，把步骤一字不改地抄入待办清单。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="317">
<li class="code-line" data-line="317">
<strong>待办清单</strong>……Agent 开始工作时创建的任务列表（计划）。在 Cursor 中，它显示在聊天界面。用户可以通过该清单核对 Agent 执行了哪些步骤，跳过了哪些步骤（<code>skip: &lt;理由&gt;</code>）（随附指南 <a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md" rel="nofollow noopener noreferrer" target="_blank"><code>01-setup.md</code></a>）。</li>
</ul>
</div></aside>

索引之前写有 Playbook 的使用方法及路由规则。[「第 7 章：请求按固定规则分配给 Playbook」](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d#%E4%BE%9D%E9%A0%BC%E3%81%AF%E3%80%81%E6%B1%BA%E3%81%BE%E3%81%A3%E3%81%9F%E8%A6%8F%E5%89%87%E3%81%A7playbook%E3%81%AB%E6%8C%AF%E3%82%8A%E5%88%86%E3%81%91%E3%82%89%E3%82%8C%E3%82%8B)已介绍过这些规则，但它们是 `/poteto-mode` 的核心，所以这里再列一次。

<a id="playbook%E3%81%AE%E4%BD%BF%E3%81%84%E6%96%B9"></a>


### Playbook 的使用方法

Agent 按以下顺序使用 Playbook。

1. 从索引中选择符合请求的 Playbook，并打开其文件
2. 创建待办清单，将该 Playbook 的步骤一字不改地抄在清单开头。如果请求还包含 Playbook 步骤之外的工作（例如用户要求添加 `--json` 标志），则在抄入的步骤后追加必要工作（如「确认文本输出没有变化，哪怕一个字节也没有」）
3. 决定不执行的步骤也不删除，另起一行按 `skip: <理由>` 格式说明

<a id="%E6%8C%AF%E3%82%8A%E5%88%86%E3%81%91%E3%81%AE%E8%A6%8F%E5%89%87"></a>


### 路由规则

基本上，会选择一个符合请求类型的 Playbook。不过，如果工作量很大，路由目标就取决于工作规模，而不是请求类型。

<table class="code-line" data-line="334">
<thead class="code-line" data-line="334">
<tr class="code-line" data-line="334">
<th>请求性质</th>
<th>路由目标</th>
</tr>
</thead>
<tbody class="code-line" data-line="336">
<tr class="code-line" data-line="336">
<td>符合一个 Playbook、规模普通的工作</td>
<td>该 Playbook</td>
</tr>
<tr class="code-line" data-line="337">
<td>大型或跨多个位置的工作（例如涉及大量调用位置的迁移）</td>
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/figure-it-out/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/figure-it-out</code></a></td>
</tr>
<tr class="code-line" data-line="338">
<td>用户会离开，稍后再检查结果的工作</td>
<td><code>/figure-it-out</code></td>
</tr>
<tr class="code-line" data-line="339">
<td>没有适用 Playbook 的工作</td>
<td><code>/figure-it-out</code></td>
</tr>
<tr class="code-line" data-line="340">
<td>由一个协调者统筹许多 PR 和许多子 Agent、持续多天的工作</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/orchestrate.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Orchestrate</strong></a>」</td>
</tr>
<tr class="code-line" data-line="341">
<td>希望不停顿推进到底，且一个 Agent 能在一次会话中完成的工作（例如请求「一直做完为止」）</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autonomous-run.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Autonomous run</strong></a>」</td>
</tr>
</tbody>
</table>

表格第二行和第三行的工作，即使也符合「Feature」等 Playbook，仍会交给 `/figure-it-out`。

`/figure-it-out` 是为特定工作专门设计 Playbook 的 Skill。它不会照搬固定步骤，而会针对每项工作做以下三件事。

- 决定验证需要多严格；工作规模越大、失败影响越大，要求越严
- 将工作拆成可以逐个整合的小单元，从最不确定的单元开始
- 使用 `/show-me-your-work` 记录每个阶段作出的判断

原文没有说明为什么将第二行的大型工作交给 `/figure-it-out`。本书推测，是因为需要根据工作规模决定验证严格程度和拆分方式。

第三行中，将用户暂时离开、稍后检查的工作交给 `/figure-it-out`，是为了让用户在工作结束后集中核对结果（随附指南 [`07-overnight.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/07-overnight.md)）。因此，必须能事后追溯 Agent 作了什么判断、为什么这样判断。`/figure-it-out` 在编码前设计执行方案并留下决策记录，可以满足这一需求。

它与「Orchestrate」的区别在于：`/figure-it-out` 为一次工作设计执行方式，而「Orchestrate」统筹持续多天的整个工作。

<a id="23%E4%BB%B6%E3%81%AE%E7%B4%A2%E5%BC%95"></a>


### 23 个条目的索引

若按本书所用的工作类型划分，索引中的 23 个条目如下。

<table class="code-line" data-line="362">
<thead class="code-line" data-line="362">
<tr class="code-line" data-line="362">
<th>分类</th>
<th>Playbook</th>
<th>本书章节</th>
</tr>
</thead>
<tbody class="code-line" data-line="364">
<tr class="code-line" data-line="364">
<td>调查</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/investigation.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Investigation</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/runtime-forensics.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Runtime forensics</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/trace-forensics.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Trace forensics</strong></a>」</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ea525d" target="_blank">第 10 章</a></td>
</tr>
<tr class="code-line" data-line="365">
<td>修复、改进</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Bug fix</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/perf-issue.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Perf issue</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/hillclimb.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Hillclimb</strong></a>」</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6fcb42" target="_blank">第 11 章</a></td>
</tr>
<tr class="code-line" data-line="366">
<td>创建</td>
<td>「<strong>Feature</strong>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/refactoring.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Refactoring</strong></a>」、「<strong>Prototype</strong>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/visual-parity.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Visual parity</strong></a>」</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f1e85b" target="_blank">第 12 章</a></td>
</tr>
<tr class="code-line" data-line="367">
<td>处理 Skill</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Authoring or modifying a skill</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Eval</strong></a>」</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8263c0" target="_blank">第 13 章</a></td>
</tr>
<tr class="code-line" data-line="368">
<td>交付</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Opening a PR</strong></a>」、「<strong>Babysit</strong>」、「<strong>Shipping</strong>」</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e" target="_blank">第 14 章</a></td>
</tr>
<tr class="code-line" data-line="369">
<td>长期运行</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autonomous-run.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Autonomous run</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/session-pickup.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Session pickup</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/pause-safely.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Pause safely</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Worktree and simulator cleanup</strong></a>」</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609" target="_blank">第 15 章</a></td>
</tr>
<tr class="code-line" data-line="370">
<td>运作大量 PR</td>
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Multi-phase or multi-PR plan</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/orchestrate.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Orchestrate</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-full.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Autopilot-full</strong></a>」、「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-stack.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Autopilot-stack</strong></a>」</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5" target="_blank">第 16 章</a></td>
</tr>
</tbody>
</table>

<a id="%E8%87%AA%E5%88%86%E3%81%AE%E6%B5%81%E5%84%80%E3%81%AB%E5%90%88%E3%82%8F%E3%81%9B%E3%82%8B"></a>


## 调整成自己的工作方式

`/poteto-mode` 体现 poteto 的工作方式，不一定原样适合每位用户。

<strong>如果不适合，就需要用 [`/automate-me`](https://github.com/cursor/plugins/blob/main/pstack/skills/automate-me/SKILL.md)（[第 25 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/46bd1f)）创建自己的模式（像 `/poteto-mode` 一样汇集个人工作方式的 Skill），或 fork pstack（将代码库复制到自己的账号下）</strong>。

`/automate-me` 从近期的对话记录中，找出用户在回复、委派、验证、代码和文字等方面反复表现出的工作方式，并起草一项名为 `<your-name>-mode`（例如 `tomato-mode`）的 Skill。

使用 `/automate-me`，用户可以继续以 pstack 为基础，同时在 `/poteto-mode` 之外拥有一项属于自己的请求路由 Skill。

如果想修改 Playbook 或 Principle 本身，本书建议 fork pstack，维护自己的版本。

README 开头写道「fork it. improve it. make it yours.」（fork 它，改进它，让它成为自己的版本），欢迎用户 fork 和改进。

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 小结

- <strong>`/poteto-mode` 的职责</strong>……它是 pstack 的入口（Router），将请求分配给 Playbook。`SKILL.md` 也规定了分配之后适用于整个工作的规则。
- <strong>「Non-negotiables」</strong>……按情形列出 Agent 必须执行的事项。例如，提问前先判断答案是执行后可确定的事实，还是需由人决定的判断。
- <strong>「Principles」和「Playbooks」</strong>……23 项原则和 23 个 Playbook 的索引。Agent 从索引中选择适用的条目，再打开对应文件阅读。
- <strong>「Autonomy」和「Subagents」</strong>……Agent 在不可撤销的操作前一定停下，并在每次委派时遵守默认设置（主 Agent 每次启动子 Agent 所使用的设置）。
- <strong>「Writing the reply」和「Comments」</strong>……Agent 在撰写回复和注释的过程中遵守规则，而不是等写完再修改。
- <strong>调整成自己的工作方式</strong>……使用 `/automate-me` 创建自己的模式，或 fork pstack。

至此，[第 5 部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2a4af5)结束。本书迄今已介绍了 pstack 的所有 Playbook、Principle 和 Skill。[第 6 部分](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b22889)将说明在自己的项目中，应按什么顺序开始使用这些组成部分。第一篇[第 36 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)将介绍验证 Skill，让 Agent 能运行自己的应用并确认变更。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](40-chapter.md) · [下一篇](42-chapter.md) · [English](../en/41-chapter.md)
