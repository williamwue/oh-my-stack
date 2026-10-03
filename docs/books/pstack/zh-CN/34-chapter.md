# 第 28 章：记录决策，用证据追踪 Agent 的长时间工作

[目录](README.md) · [上一篇](33-chapter.md) · [下一篇](35-chapter.md) · [English](../en/34-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/724887) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/6638a6)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
本章介绍 [`/show-me-your-work`](https://github.com/cursor/plugins/blob/main/pstack/skills/show-me-your-work/SKILL.md)。

`/show-me-your-work` 是一项 Skill，用于把 Agent 作了什么决定（例如舍弃子 Agent 的成果）及其依据（例如截图一片空白）逐条记录在文件中。记录会交给与执行工作的模型不同系列的模型检查。Agent 最后在回复的「Attention」栏汇总检查发现的注意事项。

[第 26 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca)的验证 Skill 用证据说明应用确实能够运行。`/show-me-your-work` 则让使用者日后可以沿证据追溯，核实 Agent 为何作出某项判断。

`/show-me-your-work` 的 `SKILL.md` 设置了 `disable-model-invocation: true`（[第 25 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/46bd1f)）。Agent 不会根据对话内容自行选择并运行设有此选项的 Skill。因此，只有使用者点名调用，或 `/poteto-mode`、Playbook、其他 Skill 在步骤中明确指定调用时，它才运行。

本章从作用、使用时机、步骤和请求写法四方面介绍 `/show-me-your-work`。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章安排如下。

- 作用：只留下一份可供日后检查的判断记录
- 使用时机：长时间工作、自主工作，以及日后要核查的工作
- 步骤：记录判断，与 transcript（Agent 对话记录）核对，再交给另一模型检查
- 请求写法：要求开始记录
- 总结

<a id="%E5%BD%B9%E5%89%B2%EF%BC%9A%E5%BE%8C%E3%81%8B%E3%82%89%E7%82%B9%E6%A4%9C%E3%81%A7%E3%81%8D%E3%82%8B%E5%88%A4%E6%96%AD%E3%81%AE%E8%A8%98%E9%8C%B2%E3%82%92%E3%80%81%E4%B8%80%E3%81%A4%E3%81%A0%E3%81%91%E6%AE%8B%E3%81%99"></a>


## 作用：只留下一份可供日后检查的判断记录

对于长时间工作，或使用者离开期间持续进行的工作，`/show-me-your-work` 会把可供日后检查的判断记录集中放在一份文件中。

随附指南 [`docs/guide/07-overnight.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/07-overnight.md) 指出，交给 Agent 长时间工作后离开，不能只寄望一切顺利，还需要以下三项条件。

- 可验证的完成条件
- 不与其他工作冲突的专用 worktree（[第 18 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b)）
- 供日后检查的判断记录

这项 Skill 负责第三项「供日后检查的判断记录」。

需要记录判断，是因为<strong>代码差异只包含最终保留下来的变更</strong>。中途舍弃的方案、撤销子 Agent 成果的决定，都不会出现在差异中。

使用者离开期间，Agent 可能已工作很久；使用者回来后手头只有差异。因此，Agent 记录判断及依据，让使用者日后能检查为何形成这个结果。

<a id="%E4%BD%BF%E3%81%84%E3%81%A9%E3%81%8D%EF%BC%9A%E9%95%B7%E6%99%82%E9%96%93%E3%81%AE%E4%BD%9C%E6%A5%AD%E3%80%81%E8%87%AA%E5%BE%8B%E7%9A%84%E3%81%AA%E4%BD%9C%E6%A5%AD%E3%80%81%E5%BE%8C%E3%81%A7%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B%E4%BD%9C%E6%A5%AD"></a>


## 使用时机：长时间工作、自主工作，以及日后要核查的工作

`/poteto-mode` 的「[Non-negotiables](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#non-negotiables)」一节（[第 8 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/096f3d)）要求在长时间工作、自主工作、多阶段工作，以及使用者离开后再核查的工作中保留记录。

<a id="%2Fshow-me-your-work-%E3%81%AF%E3%80%81playbook%E3%82%84%E3%81%BB%E3%81%8B%E3%81%AEskill%E3%81%8B%E3%82%89%E3%82%82%E5%91%BC%E3%81%B0%E3%82%8C%E3%82%8B"></a>


### `/show-me-your-work` 也由 Playbook 和其他 Skill 调用

负责长时间工作的 Playbook 和 Skill 也会使用这项 Skill 留下记录。

这项 Skill 的 `SKILL.md` 规定了其他 Skill 记录判断时的规则。  
其他 Skill 不自行设计记录格式，而是点名调用这项 Skill，把格式交由它决定。

因此，不论由哪个 Playbook 或 Skill 调用，记录的格式都一致，使用者可以用同一方式检查。

以下列出几个典型调用者及其记录原因。

<a id="%E3%80%8Eautonomous-run%E3%80%8F%EF%BC%9A%E5%8F%8D%E5%BE%A9%E3%81%AE%E3%81%9F%E3%81%B3%E3%81%AB%E3%80%81%E4%BD%95%E3%82%92%E5%A4%89%E3%81%88%E3%80%81%E5%AE%8C%E4%BA%86%E6%9D%A1%E4%BB%B6%E3%81%AB%E8%BF%91%E3%81%A5%E3%81%84%E3%81%9F%E3%81%8B%E3%82%92%E6%AE%8B%E3%81%99"></a>


#### 「Autonomous run」：每次迭代都记录改了什么、是否接近完成条件

「[<strong>Autonomous run</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autonomous-run.md)」是先确定完成条件，再不中途停顿、持续工作直到完成的 Playbook（[第 15 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609)）。

它在步骤 5 规定，每次迭代都用这项 Skill 记录一行：该轮修改了什么，以及是否更接近完成条件。

<a id="%E3%80%8Eorchestrate%E3%80%8F%EF%BC%9A%E4%BD%95%E6%97%A5%E3%82%82%E7%B6%9A%E3%81%8F%E3%83%97%E3%83%AD%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%81%AE%E5%88%A4%E6%96%AD%E3%82%92%E3%80%811%E3%81%A4%E3%81%AE%E8%A8%98%E9%8C%B2%E3%81%AB%E3%81%BE%E3%81%A8%E3%82%81%E3%82%8B"></a>


#### 「Orchestrate」：把持续多日的项目判断汇入同一份记录

「[<strong>Orchestrate</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/orchestrate.md)」是由一名不编写代码的协调 Agent，管理持续多日、涉及多个 PR 的工作所用的 Playbook（[第 16 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5)）。

这份 Playbook 规定，项目记录目录中的 `decisions.tsv` 就是这项 Skill 的记录。

协调 Agent 在开始启动子 Agent 前的准备步骤（Install the runtime）开始记录，并在最后的 Close 步骤按本 Skill 的规则核对记录，再交由不同系列的模型检查。

这份 Playbook 的设计前提是使用者约每天查看两次，而非每五分钟查看一次。Close 步骤也规定，不删除含记录的目录，而要保留下来作为事后复盘资料（postmortem）。

<a id="%2Ffigure-it-out%EF%BC%9A%E8%A8%98%E9%8C%B2%E3%81%A8%E5%B7%AE%E5%88%86%E3%81%8C%E3%81%9D%E3%82%8D%E3%81%A3%E3%81%A6%E3%80%81%E5%88%A9%E7%94%A8%E8%80%85%E3%81%AF%E4%BD%9C%E6%A5%AD%E3%82%92%E4%BF%A1%E9%A0%BC%E3%81%A7%E3%81%8D%E3%82%8B"></a>


#### `/figure-it-out`：记录与差异俱全，使用者才能信任工作

`/figure-it-out` 是为使用者请求不符合现有 Playbook 的大型任务设计 Playbook 本身的 Skill（[第 23 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/3ce2b2)）。

`/figure-it-out` 在保留工作记录的阶段（Phase D）调用这项 Skill。它处理的工作通常较大，因此 Agent 会提交记录，让审查者在 PR 中阅读。因为<strong>只有记录和差异同时具备，使用者才能信任工作</strong>。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A%E5%88%A4%E6%96%AD%E3%82%92%E8%A8%98%E9%8C%B2%E3%81%97%E3%80%81%E3%83%88%E3%83%A9%E3%83%B3%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%97%E3%83%88%EF%BC%88%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%A8%E3%81%AE%E4%BC%9A%E8%A9%B1%E3%81%AE%E8%A8%98%E9%8C%B2%EF%BC%89%E3%81%A8%E7%AA%81%E3%81%8D%E5%90%88%E3%82%8F%E3%81%9B%E3%80%81%E5%88%A5%E3%81%AE%E3%83%A2%E3%83%87%E3%83%AB%E3%81%AB%E7%82%B9%E6%A4%9C%E3%81%95%E3%81%9B%E3%82%8B"></a>


## 步骤：记录判断，与 transcript（Agent 对话记录）核对，再交给另一模型检查

<a id="%E5%BD%A2%E5%BC%8F%EF%BC%9A%E5%88%A4%E6%96%AD%E3%82%921%E8%A1%8C%E3%81%AB1%E3%81%A4%E3%81%9A%E3%81%A4%E3%80%816%E5%88%97%E3%81%AEtsv%E3%81%A7%E6%9B%B8%E3%81%8F"></a>


### 格式：每行一项判断，用六列 TSV 记录

这项 Skill 用 TSV（以制表符分列的文本表格）保存判断记录，方便检查者从上到下阅读并沿证据核查。  
※ TSV 示例见下文。

<strong>每行只写一项判断；证据不写成描述性文字，而是写成指向证据位置的指针，例如提交或文件</strong>。若只用文字描述证据，检查者看不到实物，只能相信描述。指针则让人找到实物核验。

共有以下六列，依次回答何时、在哪一阶段、决定什么、为何决定、依据是什么、结果如何。

<table class="code-line" data-line="84">
<thead class="code-line" data-line="84">
<tr class="code-line" data-line="84">
<th>列</th>
<th>内容</th>
<th>示例（下方记录的第一行）</th>
</tr>
</thead>
<tbody class="code-line" data-line="86">
<tr class="code-line" data-line="86">
<td><code>ts</code></td>
<td>时间戳</td>
<td><code>2026-05-24T11:15:00Z</code></td>
</tr>
<tr class="code-line" data-line="87">
<td><code>phase</code></td>
<td>作出判断时所在的阶段，或工作流程名称</td>
<td><code>widget</code></td>
</tr>
<tr class="code-line" data-line="88">
<td><code>decision</code></td>
<td>选择了什么、做了什么</td>
<td><code>moved the widget styles over without changing how it looks</code></td>
</tr>
<tr class="code-line" data-line="89">
<td><code>why</code></td>
<td>用通俗语言说明作出判断的原因</td>
<td><code>keep the change small and the result identical</code></td>
</tr>
<tr class="code-line" data-line="90">
<td><code>evidence</code></td>
<td>提交 SHA、PR 编号、<code>file:line</code>（文件名与行号）、截图路径等</td>
<td><code>commit 7c21e0a, pixel-diff 0</code></td>
</tr>
<tr class="code-line" data-line="91">
<td><code>result</code></td>
<td>
<code>tests green</code>、<code>reverted</code>、<code>open</code> 等结果</td>
<td><code>looks identical, tests pass</code></td>
</tr>
</tbody>
</table>

从 `SKILL.md` 的示例中摘出表头和两行记录，TSV 如下（列之间是制表符）。

```
ts	phase	decision	why	evidence	result
2026-05-24T11:15:00Z	widget	moved the widget styles over without changing how it looks	keep the change small and the result identical	commit 7c21e0a, pixel-diff 0	looks identical, tests pass
2026-05-24T12:30:00Z	widget	threw out a helper's work because its screenshots were blank	checked the real files instead of trusting its summary	worktree reset	reverted, tightened the instructions for next time
```

第一行记录了「在不改变外观的前提下迁移 widget 样式」的判断。证据是提交 `7c21e0a` 和像素差为零（`pixel-diff 0`）。检查者可以打开该提交核对实物。

第二行记录了「舍弃子 Agent 的成果，因为截图一片空白」。Agent 没有相信子 Agent「已经完成」的摘要，而是在检查实际文件后将成果舍弃。

Agent 记录的是关键决策点，而非每一个动作。理所当然的事或琐碎动作不必记。

例如，以下时机可以各记一行。

- 从两种方法中作出选择时
- 完成一个工作阶段并得到检查结果时
- 改变方针或撤销变更时
- 遇到无法继续推进的问题时

Agent 用通俗语言写每一行。去除 AI 风格措辞的 `/unslop`（[第 32 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/44857b)）规则也适用于日志。

<a id="%E8%BF%BD%E8%A8%98%E3%81%A8%E7%BD%AE%E3%81%8D%E5%A0%B4%E6%89%80%EF%BC%9Alog.sh-%E3%81%A7%E5%88%A4%E6%96%AD%E3%81%AE%E8%A1%8C%E3%82%92%E8%BF%BD%E8%A8%98%E3%81%99%E3%82%8B"></a>


### 追加与存放位置：使用 log.sh 追加判断记录

<a id="%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AF%E3%80%81log.sh-%E3%81%A71%E8%A1%8C%E3%81%9A%E3%81%A4%E8%BF%BD%E8%A8%98%E3%81%99%E3%82%8B"></a>


#### Agent 使用 log.sh 逐行追加

Agent 使用 [`scripts/log.sh`](https://github.com/cursor/plugins/blob/main/pstack/skills/show-me-your-work/scripts/log.sh) 添加记录行。

```
scripts/log.sh <logfile> <phase> <decision> <why> <evidence> <result>
```

脚本会自动填写时间戳，将单元格里的制表符和换行替换为空格，整理成 TSV 格式。

<a id="%E3%83%AD%E3%82%B0%E3%81%AF%E4%BD%9C%E6%A5%AD%E3%83%87%E3%82%A3%E3%83%AC%E3%82%AF%E3%83%88%E3%83%AA%E3%81%AB%E7%BD%AE%E3%81%8D%E3%80%81%E5%A4%A7%E3%81%8D%E3%81%AA%E4%BD%9C%E6%A5%AD%E3%81%AE%E3%81%A8%E3%81%8D%E3%81%A0%E3%81%91%E3%82%B3%E3%83%9F%E3%83%83%E3%83%88%E3%81%99%E3%82%8B"></a>


#### 日志放在工作目录中，仅在大型任务中提交

Agent 将日志放在工作目录的 `decisions.tsv`，默认不提交。只有工作规模大到检查者需要判断记录才能相信结果时，Agent 才提交日志。

例如「在不改变外观的前提下迁移约 100 个组件的样式」就是这种情况。

阅读代码可以知道改了什么，却无法得知 Agent 如何确认外观确实没变，以及中途舍弃了哪些方法；这些不会留在代码里。

因此，任务越大，这类判断越多。检查者便可沿提交的日志追踪判断和证据，核验报告的成果。

<a id="%E9%96%93%E9%81%95%E3%81%A3%E3%81%9F%E5%88%A4%E6%96%AD%E3%81%AF%E3%80%81%E8%A1%8C%E3%82%92%E6%9B%B8%E3%81%8D%E6%8F%9B%E3%81%88%E3%81%9A%E3%81%AB%E3%80%81%E8%A8%82%E6%AD%A3%E3%81%99%E3%82%8B%E8%A1%8C%E3%82%92%E8%BF%BD%E5%8A%A0%E3%81%97%E3%81%A6%E7%9B%B4%E3%81%99"></a>


#### 判断有误时追加更正行，不改写原行

<strong>日志只能追加；判断有误时，追加一行更正，而不改写或删除旧行</strong>。否则，中途改变判断的经过会从记录中消失。

<a id="%E6%96%B0%E3%81%97%E3%81%84%E5%AE%9F%E8%A1%8C%E3%81%AF%E3%80%81%E6%9C%80%E5%88%9D%E3%81%AB-start-%E3%81%AE%E8%A1%8C%E3%82%92%E6%9B%B8%E3%81%8D%E3%80%81%E5%89%8D%E3%81%AE%E5%AE%9F%E8%A1%8C%E3%81%AE%E8%A1%8C%E3%81%A8%E5%8C%BA%E5%88%87%E3%82%8B"></a>


#### 新一轮运行先写 start 行，与上一轮记录分开

这项 Skill 将与一名 Agent 的一场对话视为一轮<strong>运行</strong>（run）。使用者在同一对话中随后追加请求，Agent 接着完成的工作，仍属于同一轮。对话太长而被摘要后继续进行的工作也一样。

另一方面，另一名 Agent 接手工作或开始新的聊天，就属于新一轮运行。

长时间工作未必能在一轮运行中结束。中途可能由另一名 Agent 接手，也可能由使用者在新聊天中要求继续。这项 Skill 规定，一项工作的记录要汇入一份日志（工作目录的 `decisions.tsv`），因此新一轮也会继续追加到上一轮写的日志中。

于是，一份日志里会有多个运行写入的记录。若无法辨别哪些行由哪一轮写成，检查者就无法单独阅读新一轮的判断。

所以，向已有记录的日志追加时，Agent 要先写一行 `phase` 列为 `start` 的记录。

这行 `start` 用于标记其下方由新一轮运行写入。该行要写明上方并非自己写入的记录所涵盖的时间戳范围，以及标识本轮运行的信息（如 Agent ID）。

例如，新的聊天接着上一场聊天写的日志追加，结果如下。

```
ts	phase	decision	why	evidence	result
2026-05-24T11:15:00Z	widget	moved the widget styles over without changing how it looks	keep the change small and the result identical	commit 7c21e0a, pixel-diff 0	looks identical, tests pass
2026-05-24T12:30:00Z	widget	threw out a helper's work because its screenshots were blank	checked the real files instead of trusting its summary	worktree reset	reverted, tightened the instructions for next time
2026-05-25T09:00:00Z	start	rows 2026-05-24T11:15:00Z to 12:30:00Z were written by another run	picking up yesterday's log	agent a1b2c3	open
2026-05-25T09:40:00Z	widget	moved the button styles over	same approach as the widget	commit 9d4e2f1, pixel-diff 0	looks identical, tests pass
```

时间戳为 `2026-05-25T09:00:00Z` 的行，是当天运行最先写下的 `start` 行。检查者只需阅读这一行以下的内容，就能核查当天运行的判断。

下文的[「核对：交付使用者前，将日志与 transcript（Agent 对话记录）比对」](#%E7%AA%81%E3%81%8D%E5%90%88%E3%82%8F%E3%81%9B%EF%BC%9A%E5%88%A9%E7%94%A8%E8%80%85%E3%81%AB%E6%89%8B%E6%B8%A1%E3%81%99%E5%89%8D%E3%81%AB%E3%80%81%E3%83%AD%E3%82%B0%E3%82%92%E3%83%88%E3%83%A9%E3%83%B3%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%97%E3%83%88%EF%BC%88%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%A8%E3%81%AE%E4%BC%9A%E8%A9%B1%E3%81%AE%E8%A8%98%E9%8C%B2%EF%BC%89%E3%81%A8%E7%85%A7%E5%90%88%E3%81%99%E3%82%8B)中，Agent 也只将本轮写的行与本轮 transcript 对照。`start` 行标明本轮所写内容从哪里开始。

<a id="%E7%AA%81%E3%81%8D%E5%90%88%E3%82%8F%E3%81%9B%EF%BC%9A%E5%88%A9%E7%94%A8%E8%80%85%E3%81%AB%E6%89%8B%E6%B8%A1%E3%81%99%E5%89%8D%E3%81%AB%E3%80%81%E3%83%AD%E3%82%B0%E3%82%92%E3%83%88%E3%83%A9%E3%83%B3%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%97%E3%83%88%EF%BC%88%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%A8%E3%81%AE%E4%BC%9A%E8%A9%B1%E3%81%AE%E8%A8%98%E9%8C%B2%EF%BC%89%E3%81%A8%E7%85%A7%E5%90%88%E3%81%99%E3%82%8B"></a>


### 核对：交付使用者前，将日志与 transcript（Agent 对话记录）比对

完成工作的 Agent 在返回结果前，会核查记录是否符合事实。具体来说，将本轮写的行与本轮 transcript 核对以下几点。

- 每行是否对应实际作出的判断
- 证据是否真实存在，并支持该行所述内容
- 决定工作方向的重要分歧点是否漏记

> Correct the log, not the story. The audit never edits or removes a row, even an invented one.
>
> 要更正的是日志里的错误，不是改写事情的经过。核对时即使发现某行记载了并未发生的事，也不编辑或删除该行。

即使核对时发现记录不实，Agent 也不删除或改写原行，而是追加说明真实经过的更正行。这与本章前文[「判断有误时追加更正行，不改写原行」](#%E9%96%93%E9%81%95%E3%81%A3%E3%81%9F%E5%88%A4%E6%96%AD%E3%81%AF%E3%80%81%E8%A1%8C%E3%82%92%E6%9B%B8%E3%81%8D%E6%8F%9B%E3%81%88%E3%81%9A%E3%81%AB%E3%80%81%E8%A8%82%E6%AD%A3%E3%81%99%E3%82%8B%E8%A1%8C%E3%82%92%E8%BF%BD%E5%8A%A0%E3%81%97%E3%81%A6%E7%9B%B4%E3%81%99)的规则相同。

以核对时发现某行列出一个不存在的提交作为证据为例。下面第一行与事实不符，第二行是 Agent 追加的更正。

```
ts	phase	decision	why	evidence	result
2026-05-24T13:00:00Z	widget	ボタンの色を直した	見た目の崩れを直すため	commit 9d4e2b1	tests green
2026-05-24T15:20:00Z	widget	13:00の行を訂正する。ボタンの色は直しておらず、commit 9d4e2b1 は存在しない	トランスクリプトと突き合わせて、行が事実と違うと分かった	agent-transcripts/ の、この実行の記録	open
```

第一行保留不删，检查者就能追踪记录何时偏离事实、又何时得到更正。

<a id="%E7%82%B9%E6%A4%9C%EF%BC%9A%E5%88%A5%E7%B3%BB%E7%B5%B1%E3%81%AE%E3%83%A2%E3%83%87%E3%83%AB%E3%81%8C%E8%A8%98%E9%8C%B2%E3%82%92%E8%AA%AD%E3%82%80"></a>


### 检查：不同系列的模型阅读记录

执行工作的 Agent 会用<strong>与执行工作所用模型不同系列的模型</strong>启动一名子 Agent，交给它阅读日志和 transcript。这名负责<strong>检查</strong>的子 Agent 不重做工作，而是寻找使用者需要注意的事项，例如：

- 依据薄弱或没有依据的判断
- 跳过的验证，或 transcript 没有证据却声称已完成的验证
- 回头看存在风险的选择，例如：
  - 过早下结论
  - 工作范围扩张过度
  - 只让症状（错误或画面错位等表面故障）消失、根因却仍在的修正
- 使用者略读日志时难以发现的问题

仅让执行工作的模型重新检查自己的记录，不能替代这种检查。因为<strong>执行工作的模型，即使重新审阅，也容易再次忽略工作时遗漏的事项</strong>。

随附指南 [`docs/guide/04-design.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/04-design.md) 对让多个模型检查差异弱点的 `/interrogate`（[第 27 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/997880)）也提出相同的理由。

Agent 在报告所记录工作的回复末尾，必须加上「Attention」栏，列出检查者发现的使用者应留意的事项。例如，检查者核查本章示例中的以下两行。

迁移 widget 样式的判断行<sup class="footnote-ref"><a href="#fn-e542-1" id="fnref-e542-1">[1]</a></sup>如下。

```
2026-05-24T11:15:00Z	widget	moved the widget styles over without changing how it looks	keep the change small and the result identical	commit 7c21e0a, pixel-diff 0	looks identical, tests pass
```

把不存在的提交写作证据的行<sup class="footnote-ref"><a href="#fn-e542-2" id="fnref-e542-2">[2]</a></sup>如下。

```
2026-05-24T13:00:00Z	widget	ボタンの色を直した	見た目の崩れを直すため	commit 9d4e2b1	tests green
```

此时，「Attention」栏可能如下所示（此例并非原文所载）。

```
Attention
reviewed by grok-4.7-xhigh-fast

- decisions.tsv の 11:15 の行：pixel-diff 0 の根拠は、トップページのスクリーンショット1枚だけ。ウィジェットを使うほかの画面は確かめていない。
- decisions.tsv の 13:00 の行：存在しない commit 9d4e2b1 を証拠にしていた。15:20 の行で訂正済みだが、ボタンの色はまだ直っていない。
```

第一行 `reviewed by grok-4.7-xhigh-fast` 标明由哪个模型检查。其下逐项列出检查者的意见，每项都指出涉及 `decisions.tsv` 的哪一行（或 transcript 的哪个片段）。使用者可以沿意见找到对应记录，核对证据。

如果没有意见，以「No flags」（无须注意事项）代替列表。不能只写 `reviewed by` 而既不列意见、也不写「No flags」。即使写「No flags」，也不可省略 `reviewed by` 行。

```
Attention
reviewed by grok-4.7-xhigh-fast

No flags
```

因为<strong>缺少 `reviewed by` 行，使用者就无法确认检查是否真的由不同系列的模型完成，而非由执行工作的模型自行复查</strong>。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E8%A8%98%E9%8C%B2%E3%82%92%E5%A7%8B%E3%82%81%E3%81%95%E3%81%9B%E3%82%8B"></a>


## 请求写法：要求开始记录

在 [README](https://github.com/cursor/plugins/blob/main/pstack/README.md) 中，有开始记录的请求示例。

```
/show-me-your-work keep a decision trail i can review when i'm back.
// 戻ったときに見直せるよう、判断の記録を残して。
```

使用者回来后，可以按 `docs/guide/07-overnight.md` 中的以下请求，收到前一晚工作的报告。报告末尾会附上「Attention」栏。

```
/show-me-your-work catch me up on what you did last night
// 昨夜やったことを教えて。
```

使用者先阅读回复中的「Attention」栏，再查看该栏指向的日志行。由于栏中只列检查者找到的注意事项，使用者不必重新阅读整个长时间任务的记录。

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 总结

- <strong>作用</strong>……对于长时间工作或使用者离开期间进行的工作，将可供日后检查的判断集中保存在一份文件中；代码差异只显示最终保留下来的变更。
- <strong>记录格式</strong>……用六列 TSV 每行记一项判断，只能追加。错误的行不删除，而是追加更正行。
- <strong>核对</strong>……在向使用者返回结果前，将日志与 transcript（Agent 对话记录）比对；不实记录用新行更正。
- <strong>检查与「Attention」栏</strong>……不同系列的模型阅读日志和 transcript，Agent 以「Attention」栏结束回复，列出检查模型的名称和意见。即使没有意见，也不能省略模型名称。

接下来的[第 29 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4f9a46)至[第 31 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8960d3)，每章分别介绍一项维护代码质量的 Skill。[第 29 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4f9a46)介绍汇总 TypeScript 规则的 [`/typescript-best-practices`](https://github.com/cursor/plugins/blob/main/pstack/skills/typescript-best-practices/SKILL.md)。

<section class="footnotes">
<span class="footnotes-title">脚注</span>
<ol class="footnotes-list">
<li class="footnote-item" id="fn-e542-1">
<p class="code-line" data-line="276">引用自本章<a href="#%E5%BD%A2%E5%BC%8F%EF%BC%9A%E5%88%A4%E6%96%AD%E3%82%921%E8%A1%8C%E3%81%AB1%E3%81%A4%E3%81%9A%E3%81%A4%E3%80%816%E5%88%97%E3%81%AEtsv%E3%81%A7%E6%9B%B8%E3%81%8F">「格式：每行一项判断，用六列 TSV 记录」</a>的示例。 <a class="footnote-backref" href="#fnref-e542-1">↩︎</a></p>
</li>
<li class="footnote-item" id="fn-e542-2">
<p class="code-line" data-line="277">引用自本章<a href="#%E7%AA%81%E3%81%8D%E5%90%88%E3%82%8F%E3%81%9B%EF%BC%9A%E5%88%A9%E7%94%A8%E8%80%85%E3%81%AB%E6%89%8B%E6%B8%A1%E3%81%99%E5%89%8D%E3%81%AB%E3%80%81%E3%83%AD%E3%82%B0%E3%82%92%E3%83%88%E3%83%A9%E3%83%B3%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%97%E3%83%88%EF%BC%88%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%A8%E3%81%AE%E4%BC%9A%E8%A9%B1%E3%81%AE%E8%A8%98%E9%8C%B2%EF%BC%89%E3%81%A8%E7%85%A7%E5%90%88%E3%81%99%E3%82%8B">「核对：交付使用者前，将日志与 transcript（Agent 对话记录）比对」</a>的示例。 <a class="footnote-backref" href="#fnref-e542-2">↩︎</a></p>
</li>
</ol>
</section>
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](33-chapter.md) · [下一篇](35-chapter.md) · [English](../en/34-chapter.md)
