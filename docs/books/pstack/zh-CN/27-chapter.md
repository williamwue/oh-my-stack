# 第五部分：用 Skill 扩展工作能力

[目录](README.md) · [上一篇](26-chapter.md) · [下一篇](28-chapter.md) · [English](../en/27-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2a4af5) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/fdce40)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
第五部分将全面介绍 pstack 的全部 24 项 Skill。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="3">这一部分可以跳读。建议只阅读自己感兴趣的章节。</p>
<p class="code-line" data-line="5">每项 Skill 的原文都可以在 <a href="https://github.com/cursor/plugins/tree/main/pstack" rel="nofollow noopener noreferrer" target="_blank">pstack</a> 仓库中随时阅读。需要时可查阅相应章节和文件。</p>
</div></aside>

<a id="%E7%AC%AC5%E9%83%A8%E3%81%A7%E5%88%86%E3%81%8B%E3%82%8B%E3%81%93%E3%81%A8"></a>


## 第五部分将介绍什么

- 每项 Skill 做什么、何时使用（例如 `/how` 会在修改代码前解释当前代码的行为）
- 输出采用什么形式（例如 `/why` 会标明找到的每个理由是有记录佐证，还是属于推测）
- 直接调用时的请求示例，以及如何区分相似的 Skill（例如查找差异内部的弱点用 `/interrogate`，查找差异以外可能受影响的地方用 `/blast-radius`）

Skill 将调查（如 `/why`）、设计（如 `/architect`）、验证（如 `/blast-radius`）、整理（如 `/unslop`）等工作的步骤封装起来，使人只要按名称调用，就能反复按相同步骤执行。

多数 Skill 会由 `/poteto-mode` 在 Playbook 步骤中自动调用。

使用者也可以按名称直接调用 Skill。如果想改变 Playbook 选择 Skill 的方式，或希望检查比默认流程更仔细，就可以直接调用。

例如，即使差异很小、`/poteto-mode` 的步骤不会调用 `/blast-radius`，使用者若仍不放心，也可以直接调用 `/blast-radius`，确认这项变更可能破坏什么。

<strong>要直接调用，使用者需要了解每项 Skill 的作用</strong>。第五部分的各章就是为此而写。

<a id="%E3%81%93%E3%81%AE%E9%83%A8%E3%81%AE%E7%AB%A0"></a>


## 本部分章节

<table class="code-line" data-line="26">
<thead class="code-line" data-line="26">
<tr class="code-line" data-line="26">
<th>章</th>
<th>作用</th>
<th>介绍的 Skill</th>
</tr>
</thead>
<tbody class="code-line" data-line="28">
<tr class="code-line" data-line="28">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746" target="_blank">第 22 章 理解代码库和以往工作</a></td>
<td>调查当前代码的行为和代码形成现状的原因，从上次中断处继续工作</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/how/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/how</code></a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/why/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/why</code></a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/teach/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/teach</code></a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/recall/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/recall</code></a>
</td>
</tr>
<tr class="code-line" data-line="29">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/3ce2b2" target="_blank">第 23 章 为没有合适 Playbook 的任务设计 Playbook</a></td>
<td>为没有现成 Playbook 的任务设计步骤，事先确定完成条件和验证机制</td>
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/figure-it-out/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/figure-it-out</code></a></td>
</tr>
<tr class="code-line" data-line="30">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346" target="_blank">第 24 章 并行运行多个 Agent，比较设计与成果物</a></td>
<td>实现前先确定类型和模块边界，让多个 Agent 解决同一问题并比较方案，再将工作分给多个 Agent</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/architect/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/architect</code></a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/arena/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/arena</code></a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/swarm/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/swarm</code></a>
</td>
</tr>
<tr class="code-line" data-line="31">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/46bd1f" target="_blank">第 25 章 将 pstack 扩展到个人工作方式与 Grok Bot</a></td>
<td>根据使用者的聊天记录创建专属的 mode Skill，并制作可用按钮启动 Grok Bot 的页面</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/automate-me/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/automate-me</code></a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/make-bot-ui/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/make-bot-ui</code></a>
</td>
</tr>
<tr class="code-line" data-line="32">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca" target="_blank">第 26 章 建立验证机制并持续适配应用</a></td>
<td>创建项目专用的验证 Skill，沿着用户实际使用路径运行应用并检查，再随应用变化而维护</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/create-verification-skill</code></a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/maintain-verification-skill</code></a>
</td>
</tr>
<tr class="code-line" data-line="33">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/997880" target="_blank">第 27 章 检查变更可能破坏的地方与差异的弱点</a></td>
<td>查找修改文件之外可能被破坏的地方，并让多个模型查找差异中的弱点</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/blast-radius/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/blast-radius</code></a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/interrogate/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/interrogate</code></a>
</td>
</tr>
<tr class="code-line" data-line="34">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/724887" target="_blank">第 28 章 记录判断，使 Agent 的长时间工作有据可查</a></td>
<td>记录判断及其依据，并请另一系列模型检查</td>
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/show-me-your-work/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/show-me-your-work</code></a></td>
</tr>
<tr class="code-line" data-line="35">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4f9a46" target="_blank">第 29 章 用 16 条 TypeScript 规则保持代码质量</a></td>
<td>通过类型让无效状态无法表示，并在外部数据进入时只验证一次</td>
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/typescript-best-practices/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/typescript-best-practices</code></a></td>
</tr>
<tr class="code-line" data-line="36">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ad5727" target="_blank">第 30 章 【TDD】用修复前失败的测试确认问题</a></td>
<td>修复缺陷前，先编写会在修复前失败的测试</td>
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/tdd/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/tdd</code></a></td>
</tr>
<tr class="code-line" data-line="37">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8960d3" target="_blank">第 31 章 删除注释，整理代码库</a></td>
<td>让没有编写这些注释的 Agent 审查差异中多余的注释并删除</td>
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/no-comments/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/no-comments</code></a></td>
</tr>
<tr class="code-line" data-line="38">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/44857b" target="_blank">第 32 章 保持文字质量</a></td>
<td>去除文字中明显的 AI 写作习惯，用不含术语的话重述难懂的回复，并在写作前确定文档类型</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/unslop</code></a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/bro/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/bro</code></a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/technical-writing/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/technical-writing</code></a>
</td>
</tr>
<tr class="code-line" data-line="39">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f70847" target="_blank">第 33 章 回顾并运用工作中的经验</a></td>
<td>把长期工作中学到的内容写入现有 Skill</td>
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/reflect/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/reflect</code></a></td>
</tr>
<tr class="code-line" data-line="40">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8487f0" target="_blank">第 34 章 安装 pstack 并确定各角色使用的模型</a></td>
<td>安装 pstack，并配置各角色使用的模型</td>
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/setup-pstack/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/setup-pstack</code></a></td>
</tr>
<tr class="code-line" data-line="41">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4f8911" target="_blank">第 35 章 `/poteto-mode`：pstack 的路由器</a></td>
<td>整理选择合适 Playbook 并加载所需 Skill 和 Principle 的规则</td>
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/poteto-mode</code></a></td>
</tr>
</tbody>
</table>

本书按工作流程排列章节，流程如下。

- 理解当前代码（[第 22 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746)）
- 并行运行多个 Agent，比较设计与成果物（[第 24 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346)）
- 实现并验证能否运行（[第 26 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca)）
- 检查变更可能破坏的地方（[第 27 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/997880)）
- 记录判断（[第 28 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/724887)）
- 整理代码（第 29～31 章）
- 整理文字（[第 32 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/44857b)）
- 保存经验（[第 33 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f70847)）

[第 23 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/3ce2b2)介绍为没有合适 Playbook 的任务设计工作流程的 Skill。它涉及整个任务的推进方式，而非流程中的某个具体步骤，因此单独介绍。

[第 25 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/46bd1f)汇集了两项将 pstack 扩展到使用者工作方式和 Grok Bot 的 Skill。它们不用于流程中的某个特定步骤，因此单独介绍。

[第 34 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8487f0)介绍配置模型的 `/setup-pstack`，[第 35 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4f8911)介绍最先接收请求的 `/poteto-mode`。

pstack 的 [README](https://github.com/cursor/plugins/blob/main/pstack/README.md) 将入门步骤概括为「用 `/setup-pstack` 选择模型，在需要严谨处理的工作中使用 `/poteto-mode`，仅此而已」；其他 Skill 会由 `/poteto-mode` 按需调用。

开始使用 pstack 时，首先要用 `/setup-pstack`；每次开始工作时，首先要用 `/poteto-mode`。两者都不属于流程中的特定步骤，所以本书将其放在独立章节介绍。

<a id="%E5%85%A8skill%E3%81%AE%E6%97%A9%E8%A6%8B%E8%A1%A8"></a>


## 全部 Skill 速查表

<table class="code-line" data-line="66">
<thead class="code-line" data-line="66">
<tr class="code-line" data-line="66">
<th>Skill</th>
<th>概述</th>
<th>使用场景</th>
<th>使用方式（由谁调用）</th>
<th>详解</th>
</tr>
</thead>
<tbody class="code-line" data-line="68">
<tr class="code-line" data-line="68">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/how/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/how</code></a></td>
<td>说明当前代码的行为（触发条件、经过的函数、数据流）</td>
<td>使用者或 Agent 想在修改代码前了解子系统行为，或询问代码应该放在哪里时</td>
<td>
<code>/poteto-mode</code>（依据「Non-negotiables」规则及「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/investigation.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Investigation</strong></a>」「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Bug fix</strong></a>」「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/feature.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Feature</strong></a>」「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/refactoring.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Refactoring</strong></a>」等 Playbook 的步骤）、<code>/teach</code>、<code>/architect</code>、<code>/no-comments</code>、使用者</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746" target="_blank">第 22 章</a></td>
</tr>
<tr class="code-line" data-line="69">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/why/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/why</code></a></td>
<td>根据提交、PR、工单等记录调查代码为何形成现状，区分有记录佐证的理由和推测后作答</td>
<td>使用者或 Agent 询问设计理由、回归问题的来龙去脉或阈值的来源时</td>
<td>
<code>/poteto-mode</code>（依据「Investigation」「Bug fix」Playbook 的步骤）、<code>/teach</code>、<code>/recall</code>、<code>/architect</code>、<code>/no-comments</code>、使用者</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746" target="_blank">第 22 章</a></td>
</tr>
<tr class="code-line" data-line="70">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/teach/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/teach</code></a></td>
<td>
调用 <code>/how</code> 和 <code>/why</code>，将代码或变更是什么、如何运行、为何这样设计，汇总为一段通俗的解释</td>
<td>使用者觉得摘要不足以说明问题，希望真正理解变更或子系统时</td>
<td>仅在使用者按名称调用时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746" target="_blank">第 22 章</a></td>
</tr>
<tr class="code-line" data-line="71">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/recall/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/recall</code></a></td>
<td>从个人聊天记录和共享记录中收集近期工作的经过，简要回答已推进到哪一步、接下来该做什么</td>
<td>使用者在开始或恢复工作前，想知道上次推进到哪里时</td>
<td>仅在使用者按名称调用时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746" target="_blank">第 22 章</a></td>
</tr>
<tr class="code-line" data-line="72">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/blast-radius/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/blast-radius</code></a></td>
<td>查找修改文件之外可能被破坏的地方，并通过运行代码验证变更安全的依据</td>
<td>使用者面对看似很小却不能完全放心的差异，想知道它还可能破坏什么时</td>
<td>仅在使用者按名称调用时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/997880" target="_blank">第 27 章</a></td>
</tr>
<tr class="code-line" data-line="73">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/interrogate/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/interrogate</code></a></td>
<td>让不同模型的审查者查找同一差异的弱点，由主 Agent 将意见归为四类</td>
<td>使用者或 Agent 希望多个模型从严格的代码质量等角度查找差异可能在哪里出错时</td>
<td>
<code>/poteto-mode</code>（依据在合并有争议的设计前使用的「Non-negotiables」规则，以及「Feature」「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Opening a PR</strong></a>」Playbook 的步骤）、<code>/architect</code>、使用者</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/997880" target="_blank">第 27 章</a></td>
</tr>
<tr class="code-line" data-line="74">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/figure-it-out/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/figure-it-out</code></a></td>
<td>为没有合适 Playbook 的任务设计步骤，事先确定完成条件和验证机制，并在推进中留下判断记录</td>
<td>使用者委托涉及多个调用方的迁移、希望离开期间继续推进任务，或请求没有合适的 Playbook 时</td>
<td>
<code>/poteto-mode</code>（依据「Playbooks」一节的规则，将大型任务、使用者离开期间的工作及没有合适 Playbook 的任务交给此 Skill）、使用者</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/3ce2b2" target="_blank">第 23 章</a></td>
</tr>
<tr class="code-line" data-line="75">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/architect/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/architect</code></a></td>
<td>编写跨函数边界的代码前，先用不包含函数实现的骨架确定类型、函数签名和模块边界</td>
<td>Agent 准备编写跨函数边界的代码时</td>
<td>
<code>/poteto-mode</code>（依据「Non-negotiables」规则及「Feature」「Bug fix」「Refactoring」「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/perf-issue.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Perf issue</strong></a>」Playbook 的步骤）、<code>/figure-it-out</code>、<code>/no-comments</code>、使用者</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346" target="_blank">第 24 章</a></td>
</tr>
<tr class="code-line" data-line="76">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/arena/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/arena</code></a></td>
<td>让 N 个候选方案并行解决同一问题，选出最佳方案作为基础，再吸收其他方案的优点</td>
<td>使用者或 Agent 制作后续修改成本很高的成果物（如缓存键格式）时</td>
<td>
<code>/poteto-mode</code>（依据「Non-negotiables」规则及「Feature」「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Eval</strong></a>」「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/orchestrate.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Orchestrate</strong></a>」Playbook 的步骤）、<code>/architect</code>、<code>/blast-radius</code>、使用者</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346" target="_blank">第 24 章</a></td>
</tr>
<tr class="code-line" data-line="77">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/swarm/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/swarm</code></a></td>
<td>以分工或竞争方式并行运行 N 个 Worker，并将结果汇总成一份报告</td>
<td>Agent 为了全面覆盖、竞争、设置关卡或划分调查范围而并行拆分工作时</td>
<td>
<code>/poteto-mode</code>（依据「Non-negotiables」规则及「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Multi-phase or multi-PR plan</strong></a>」「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-full.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Autopilot-full</strong></a>」Playbook 的步骤）、使用者</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346" target="_blank">第 24 章</a></td>
</tr>
<tr class="code-line" data-line="78">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/automate-me/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/automate-me</code></a></td>
<td>根据使用者的聊天记录和问答，创建专属于该使用者的 <code>-mode</code> Skill</td>
<td>使用者希望 Agent 遵循符合自己偏好和工作方式的 mode Skill 时</td>
<td>仅在使用者按名称调用时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/46bd1f" target="_blank">第 25 章</a></td>
</tr>
<tr class="code-line" data-line="79">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/make-bot-ui/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/make-bot-ui</code></a></td>
<td>制作可通过按钮和 webhook 启动 Grok Bot 的页面，同时不让 Agent 看到发送密钥</td>
<td>使用者希望制作通过 webhook 启动 Grok Bot 的页面、提供发送密钥并通过 Tailscale 发布页面时</td>
<td>仅在使用者按名称调用时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/46bd1f" target="_blank">第 25 章</a></td>
</tr>
<tr class="code-line" data-line="80">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/create-verification-skill</code></a></td>
<td>在项目专用的验证 Skill 中启动并操作应用、保留证据，并将 Skill 生成于 <code>.cursor/skills/verify-&lt;app&gt;/</code> 目录</td>
<td>使用者的项目缺少用脚本反复证明应用行为的手段时</td>
<td>使用者、<code>/setup-pstack</code>（在最后一步提议生成，使用者接受时调用）</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca" target="_blank">第 26 章</a></td>
</tr>
<tr class="code-line" data-line="81">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/maintain-verification-skill</code></a></td>
<td>检查验证 Skill 和 Feature Map 是否与当前应用一致，并修正差异</td>
<td>使用者修改应用后，想修正 Feature Map 描述与当前应用之间的偏差时</td>
<td>仅在使用者按名称调用时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca" target="_blank">第 26 章</a></td>
</tr>
<tr class="code-line" data-line="82">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/show-me-your-work/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/show-me-your-work</code></a></td>
<td>把长期工作中的判断和依据记录在 <code>decisions.tsv</code> 中，并让另一系列模型检查记录</td>
<td>Agent 执行长期任务、自主任务，或使用者离开并打算事后检查的任务时</td>
<td>
<code>/poteto-mode</code>（依据「Non-negotiables」规则及「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autonomous-run.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Autonomous run</strong></a>」「Orchestrate」「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/hillclimb.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Hillclimb</strong></a>」「Autopilot-full」等 Playbook 的步骤）、<code>/figure-it-out</code>、使用者</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/724887" target="_blank">第 28 章</a></td>
</tr>
<tr class="code-line" data-line="83">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/typescript-best-practices/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/typescript-best-practices</code></a></td>
<td>用 16 条 TypeScript 规则说明如何让无效状态无法通过类型表示</td>
<td>Agent 读取或编辑 <code>.ts</code> 或 <code>.tsx</code> 文件时</td>
<td>Agent 读取或编辑 <code>.ts</code> 或 <code>.tsx</code> 文件时会自动加载。使用者无需按名称调用</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4f9a46" target="_blank">第 29 章</a></td>
</tr>
<tr class="code-line" data-line="84">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/tdd/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/tdd</code></a></td>
<td>修复缺陷前先编写一个回归测试，确认它在修复前失败、修复后通过</td>
<td>使用者要求 TDD 或失败测试，或缺陷可以通过本地立即运行的测试确认时</td>
<td>
<code>/poteto-mode</code>（依据「Bug fix」Playbook 的步骤 5）、使用者</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ad5727" target="_blank">第 30 章</a></td>
</tr>
<tr class="code-line" data-line="85">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/no-comments/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/no-comments</code></a></td>
<td>让未编写注释的子 Agent Comment Sicko 审查差异中的注释，并修正接受的意见</td>
<td>Agent 要在审查前清理差异中的注释时</td>
<td>
<code>/poteto-mode</code>（依据「Non-negotiables」规则及「Opening a PR」「Autopilot-full」「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-stack.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Autopilot-stack</strong></a>」「Multi-phase or multi-PR plan」Playbook 的步骤）、使用者</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8960d3" target="_blank">第 31 章</a></td>
</tr>
<tr class="code-line" data-line="86">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/unslop</code></a></td>
<td>用编号规则去除任何文字中明显的 AI 写作习惯</td>
<td>Agent 撰写包括回复在内的任何文字时</td>
<td>
<code>/poteto-mode</code>（依据「Non-negotiables」规则及「Investigation」「Opening a PR」「Multi-phase or multi-PR plan」Playbook 的步骤）、<code>/technical-writing</code>、<code>/show-me-your-work</code>、<code>/recall</code>、<code>/teach</code>、<code>/blast-radius</code>、<code>/automate-me</code>、使用者</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/44857b" target="_blank">第 32 章</a></td>
</tr>
<tr class="code-line" data-line="87">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/bro/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/bro</code></a></td>
<td>不用专业术语重述 Agent 刚刚给出的回复</td>
<td>使用者觉得 Agent 的回复虽详细却难以理解时</td>
<td>仅在使用者按名称调用时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/44857b" target="_blank">第 32 章</a></td>
</tr>
<tr class="code-line" data-line="88">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/technical-writing/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/technical-writing</code></a></td>
<td>从文档类型到单句写法，按四个层次说明编写技术文档应遵循的规范</td>
<td>Agent 撰写或审查文档、RFC、README、PR 描述及提交信息时</td>
<td>
<code>/poteto-mode</code>（依据「Non-negotiables」规则及「Opening a PR」「Multi-phase or multi-PR plan」Playbook 的步骤）、使用者</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/44857b" target="_blank">第 32 章</a></td>
</tr>
<tr class="code-line" data-line="89">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/reflect/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/reflect</code></a></td>
<td>从工作会话中提取可用于后续任务的经验，把使用者批准的内容写入现有 Skill</td>
<td>完成有所收获的工作后，使用者立即说「reflect」时</td>
<td>仅在使用者按名称调用时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f70847" target="_blank">第 33 章</a></td>
</tr>
<tr class="code-line" data-line="90">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/setup-pstack/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/setup-pstack</code></a></td>
<td>询问推理预算及各角色使用的模型，将回答写入始终生效的规则 <code>~/.cursor/rules/pstack-models.mdc</code> 中</td>
<td>使用者初次使用 pstack，或想修改各角色使用的模型时</td>
<td>使用者。<code>SKILL.md</code> 中没有 <code>disable-model-invocation: true</code>，所以 Agent 也可以根据请求内容（如「configure pstack models」）选择并运行它</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8487f0" target="_blank">第 34 章</a></td>
</tr>
<tr class="code-line" data-line="91">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/poteto-mode</code></a></td>
<td>整理选择合适 Playbook 并让 Agent 加载所需 Skill 和 Principle 的规则</td>
<td>使用者委托需要严谨处理的任务（如先复现缺陷，再修复并验证）时</td>
<td>仅在使用者按名称调用时。调用一次后，在同一会话的后续轮次中持续有效，直到使用者明确停用</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4f8911" target="_blank">第 35 章</a></td>
</tr>
</tbody>
</table>
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](26-chapter.md) · [下一篇](28-chapter.md) · [English](../en/27-chapter.md)
