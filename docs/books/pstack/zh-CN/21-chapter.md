# 第四部分：用 Principle 支持 Agent 的判断

[目录](README.md) · [上一篇](20-chapter.md) · [下一篇](22-chapter.md) · [English](../en/21-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4b3166) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/df0d7d)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
第四部分全面介绍 pstack 的全部 23 条 Principle。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="3">这一部分可以跳读。我建议只阅读自己感兴趣的章节。</p>
<p class="code-line" data-line="5">各 Principle 的原文随时可在 <a href="https://github.com/cursor/plugins/tree/main/pstack" rel="nofollow noopener noreferrer" target="_blank">pstack</a> 仓库中阅读。pstack 更新频繁；需要时再查阅相应章节和原文件，比预先读完全部内容更可靠。</p>
</div></aside>

<a id="%E7%AC%AC4%E9%83%A8%E3%81%A7%E5%88%86%E3%81%8B%E3%82%8B%E3%81%93%E3%81%A8"></a>


## 第四部分将介绍什么

- 各 Principle 要求选择什么、避免什么，以及为什么需要它（例如「[<strong>Prove It Works</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md)」要求不能只凭 build 通过就宣称完成，还要直接检查生成文件或界面）
- 各 Principle 适用与不适用的场景（例如「[<strong>Outcome-Oriented Execution</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-outcome-oriented-execution/SKILL.md)」适用于有计划的迁移，不适用于日常没有阶段边界的小修复）
- 如何在请求中使用 Principle 名称改变 Agent 的工作方向（例如写 `apply prove it works.`，要求真正执行导入并展示写入的记录）

Principle 是<strong>Agent 在工作中作判断的标准</strong>。Playbook 规定工作顺序，但 Agent 推进各步骤时仍需判断，例如「是否该增加这层抽象」「编译通过后能否说已完成」。遇到这些问题，Agent 依据 Principle 决定「是否加入这项改动」或「是否仍不能宣称完成」。

23 条 Principle 按所处理的判断类型分为以下五组。读者可根据当前犹豫的判断类型，选择该读哪章。

<table class="code-line" data-line="18">
<thead class="code-line" data-line="18">
<tr class="code-line" data-line="18">
<th>分组</th>
<th>数量</th>
<th>处理的判断</th>
</tr>
</thead>
<tbody class="code-line" data-line="20">
<tr class="code-line" data-line="20">
<td>Core（核心）</td>
<td>10</td>
<td>要做多少、何时重新审视设计</td>
</tr>
<tr class="code-line" data-line="21">
<td>Architecture（架构）</td>
<td>6</td>
<td>状态、验证和兼容性应放在哪里</td>
</tr>
<tr class="code-line" data-line="22">
<td>Verification（验证）</td>
<td>4</td>
<td>什么才算证明</td>
</tr>
<tr class="code-line" data-line="23">
<td>Delegation（委派）</td>
<td>2</td>
<td>怎样让并行工作与委派顺利推进</td>
</tr>
<tr class="code-line" data-line="24">
<td>Meta（改进机制本身）</td>
<td>1</td>
<td>如何改进机制本身</td>
</tr>
</tbody>
</table>

Principle 不是由用户明确调用的，而是<strong>由 Agent 判断工作是否符合适用场景，再按需读取</strong>。

`/poteto-mode`（启动工作时使用的 Skill；见[第 7 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)）会在多步骤工作开始时阅读 Principle 索引。

索引是 `/poteto-mode` 的 `SKILL.md` 中的清单，每条 Principle 的名称及适用场景各占一行（例如「Prove It Works」适用于「完成工作之后、宣称完成之前」）。对于符合当前场景的 Principle，Agent 先阅读全文 `SKILL.md`，再应用规则，并在回答中列出所用 Principle 的名称及其改变了哪些判断。

<strong>Agent 在工作开始时只读取 Principle 名称及适用场景的清单</strong>。只有当工作符合某个场景时才阅读相应正文，并用于判断。这样无须每次都加载全部 23 篇正文，节省上下文。

用户也可以通过<strong>在请求中写入 Principle 名称</strong>来明确调用这一机制。若 Agent 漏掉了适用场景，用户只需在请求中写下 Principle 名称，Agent 就能按该名称对应的规则调整工作方向。

写一个 Principle 名称，比写长篇指令更准确。名称指向其 `SKILL.md` 中完整的规则，用户无需重新讲述其具体内容。

例如，Agent 只因 build 通过就要宣称完成时，可以按随附指南（pstack 附带的 `docs/guide/` 指南；见[第 6 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/33f073)）中 [`docs/guide/08-principles.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/08-principles.md) 的示例写请求。

```
apply prove it works. run the real import flow and show me the written records.
// 使用 prove it works。实际运行导入，并展示写入的记录。
```

<a id="%E3%81%93%E3%81%AE%E9%83%A8%E3%81%AE%E7%AB%A0"></a>


## 本部分的章节

<table class="code-line" data-line="47">
<thead class="code-line" data-line="47">
<tr class="code-line" data-line="47">
<th>章节</th>
<th>作用</th>
</tr>
</thead>
<tbody class="code-line" data-line="49">
<tr class="code-line" data-line="49">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章 Core——决定工作方式的十条原则</a></td>
<td>工作量、重新审视设计的方式、原型制作方式，以及是否要制作工具</td>
</tr>
<tr class="code-line" data-line="50">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b" target="_blank">第 18 章 Architecture——设计边界与依赖的六条原则</a></td>
<td>数据结构、在边界验证外部数据（边界如表单输入或 API 响应等数据进入的位置）、类型、幂等性（同一操作反复执行也得到相同结果的性质）、迁移旧 API、共享状态</td>
</tr>
<tr class="code-line" data-line="51">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/1fb019" target="_blank">第 19 章 Verification——用实际行为验证的四条原则</a></td>
<td>用真实输出确认完成、修复缺陷根因、分小步验证并推进、测试行为</td>
</tr>
<tr class="code-line" data-line="52">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/c155cc" target="_blank">第 20 章 Delegation——处理委派与并行执行的两条原则</a></td>
<td>保护 Agent 的上下文，不等待人的确认而推进</td>
</tr>
<tr class="code-line" data-line="53">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dd2d9f" target="_blank">第 21 章 Meta——改进机制本身的原则</a></td>
<td>将教训固化为机制，而非只留在文字中</td>
</tr>
</tbody>
</table>

本部分按 pstack 随附指南的顺序，将 Core 放在开头。

<a id="%E5%85%A8principle%E3%81%AE%E6%97%A9%E8%A6%8B%E8%A1%A8"></a>


## 全部 Principle 速查表

<table class="code-line" data-line="59">
<thead class="code-line" data-line="59">
<tr class="code-line" data-line="59">
<th>Principle</th>
<th>概要</th>
<th>触发条件</th>
<th>详解</th>
</tr>
</thead>
<tbody class="code-line" data-line="61">
<tr class="code-line" data-line="61">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-laziness-protocol/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Laziness Protocol</a></td>
<td>优先删除代码，选择解决问题所需的最小改动</td>
<td>Agent 估计重构或差异规模，或想增加抽象或层次、让新值穿过多层传递时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章</a></td>
</tr>
<tr class="code-line" data-line="62">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-subtract-before-you-add/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Subtract Before You Add</a></td>
<td>添加功能前，先删除未使用代码、重复验证等复杂内容</td>
<td>Agent 决定以什么顺序进行功能或处理的添加、重构或重写时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章</a></td>
</tr>
<tr class="code-line" data-line="63">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-minimize-reader-load/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Minimize Reader Load</a></td>
<td>减少读者须追踪的间接引用层次，以及必须记住的代码状态</td>
<td>Agent 审阅难以追踪处理流程的代码，或编写、重组这类代码时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章</a></td>
</tr>
<tr class="code-line" data-line="64">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-foundational-thinking/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Foundational Thinking</a></td>
<td>编写逻辑前，先确定数据结构和基础设施（CI、lint、测试基础设施、共享类型等）</td>
<td>Agent 在写逻辑前选择核心类型或数据结构、决定先做基础设施还是功能，或思考并发的多个主体应共享什么时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章</a></td>
</tr>
<tr class="code-line" data-line="65">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-redesign-from-first-principles/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Redesign from First Principles</a></td>
<td>不把新需求补丁式地附加到旧设计，而按新需求从一开始就存在来重新设计</td>
<td>Agent 将新需求纳入现有设计时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章</a></td>
</tr>
<tr class="code-line" data-line="66">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-attack-the-premise/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Attack the Premise</a></td>
<td>不要继续叠加基于相同前提的修复；写下一次修复前，先质疑该前提本身</td>
<td>共享同一前提的两次或更多修复，在同一 gate（必须通过的测试或检查）失败时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章</a></td>
</tr>
<tr class="code-line" data-line="67">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-outcome-oriented-execution/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Outcome-Oriented Execution</a></td>
<td>优先选择可验证的最终形式，而不是为迁移中途保持一致所加的临时代码</td>
<td>Agent 推进事先确定阶段边界的计划性重写或迁移时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章</a></td>
</tr>
<tr class="code-line" data-line="68">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-experience-first/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Experience First</a></td>
<td>优先用户体验而非实现便利，少做功能并把它做好</td>
<td>Agent 在产品、UX 或功能范围上选择一项就必须放弃另一项时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章</a></td>
</tr>
<tr class="code-line" data-line="69">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-exhaust-the-design-space/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Exhaust the Design Space</a></td>
<td>制作形态各异的两到三个原型，并排比较后再决定设计</td>
<td>Agent 创建代码库中没有先例的 UI 交互、选择有多种可行实现的架构，或判断主要凭实际感受而非理论决定的产品设计时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章</a></td>
</tr>
<tr class="code-line" data-line="70">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-build-the-lever/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Build the Lever</a></td>
<td>用工具代替手工操作：制作执行工作的工具，或证明工作正确的工具（codemod、脚本、生成器、供子 Agent 遵循的 Skill）</td>
<td>Agent 处理编辑、迁移、分析或检查等工作，工作量超过几处一眼可见的修改时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b" target="_blank">第 17 章</a></td>
</tr>
<tr class="code-line" data-line="71">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-model-the-domain/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Model the Domain</a></td>
<td>用结构（状态机、带类型的对象、查找表、reducer 等）表达领域，而非散落的条件分支</td>
<td>Agent 编写有状态逻辑、分支繁多的代码，或在多个文件反复写下「这些数据有这个字段」的相同前提时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b" target="_blank">第 18 章</a></td>
</tr>
<tr class="code-line" data-line="72">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-boundary-discipline/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Boundary Discipline</a></td>
<td>将验证与错误处理集中在外部数据进入的边界；边界内使用已带类型的值，无须反复验证，并让业务逻辑保持为纯函数</td>
<td>Agent 加入输入验证或错误处理，或编写连接框架与自身代码的适配器时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b" target="_blank">第 18 章</a></td>
</tr>
<tr class="code-line" data-line="73">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-type-system-discipline/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Type System Discipline</a></td>
<td>利用类型检查，让不可能的状态在编译阶段就无法构造</td>
<td>Agent 设计类型、审阅函数签名，或在静态类型语言中编写代码时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b" target="_blank">第 18 章</a></td>
</tr>
<tr class="code-line" data-line="74">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-make-operations-idempotent/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Make Operations Idempotent</a></td>
<td>让改变状态的操作无论执行多少次，或从中途重新执行，最终都到达同一状态</td>
<td>Agent 设计可能中途停止、重启或重试的命令、启动或关闭步骤、重复处理循环时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b" target="_blank">第 18 章</a></td>
</tr>
<tr class="code-line" data-line="75">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Migrate Callers Then Delete Legacy APIs</a></td>
<td>先将调用方迁至新 API，并在同一改动中删除旧 API</td>
<td>Agent 在旧调用方仍存在时引入新的内部 API 时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b" target="_blank">第 18 章</a></td>
</tr>
<tr class="code-line" data-line="76">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Separate Before Serializing Shared State</a></td>
<td>先划分多个主体共享的写入对象；实在无法划分时，再用锁等方式串行写入</td>
<td>并行的多个主体可能写入同一文件、分支、键或有状态对象时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b" target="_blank">第 18 章</a></td>
</tr>
<tr class="code-line" data-line="77">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Prove It Works</a></td>
<td>直接运行功能并观察实际数值，验证工作成果，而非依赖 build 成功等代理指标</td>
<td>Agent 完成工作、准备宣称完成时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/1fb019" target="_blank">第 19 章</a></td>
</tr>
<tr class="code-line" data-line="78">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-fix-root-causes/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Fix Root Causes</a></td>
<td>不增加只会掩盖缺陷症状的防护判断，而要找到并修复症状的根本原因</td>
<td>Agent 调试缺陷时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/1fb019" target="_blank">第 19 章</a></td>
</tr>
<tr class="code-line" data-line="79">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-sequence-verifiable-units/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Sequence Work into Verifiable Units</a></td>
<td>将工作分成可验证的小单元，每单元的检查（如测试）通过后再继续，并按展示正确性的顺序排列提交</td>
<td>Agent 执行多阶段工作（批量修复、迁移、连续的类似编辑），或决定提交与 PR 的排列顺序时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/1fb019" target="_blank">第 19 章</a></td>
</tr>
<tr class="code-line" data-line="80">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-test-behavior-not-implementation/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Test Behavior, Not Implementation</a></td>
<td>以代码使用方相同的方式调用代码，并把可观察结果与直接写在测试中的期望值比较</td>
<td>Agent 编写或修改测试，或决定是否保留测试时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/1fb019" target="_blank">第 19 章</a></td>
</tr>
<tr class="code-line" data-line="81">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-guard-the-context-window/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Guard the Context Window</a></td>
<td>让子 Agent 阅读大量输出或文档，主线程只保留摘要</td>
<td>大量输出、长文件或重复读取同一文件填满 Agent 上下文，或 Agent 计划将工作分给多个子 Agent 并行推进时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/c155cc" target="_blank">第 20 章</a></td>
</tr>
<tr class="code-line" data-line="82">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-never-block-on-the-human/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Never Block on the Human</a></td>
<td>可撤销的工作无需等待人确认，先完成并展示结果；只有执行不可逆操作前才向人确认</td>
<td>Agent 想就可撤销工作问人「可以做 X 吗」时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/c155cc" target="_blank">第 20 章</a></td>
</tr>
<tr class="code-line" data-line="83">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-encode-lessons-in-structure/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Encode Lessons in Structure</a></td>
<td>将反复需要的修正固化为机制（lint 规则、元数据标志、运行时检查或脚本），而非仅写成文字指令</td>
<td>Agent 发现自己第二次写同一指令，或同一纠正反复出现时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dd2d9f" target="_blank">第 21 章</a></td>
</tr>
</tbody>
</table>
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](20-chapter.md) · [下一篇](22-chapter.md) · [English](../en/21-chapter.md)
