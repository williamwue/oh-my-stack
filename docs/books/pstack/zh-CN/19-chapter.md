# 第 15 章：把长时间任务交给 Agent

[目录](README.md) · [上一篇](18-chapter.md) · [下一篇](20-chapter.md) · [English](../en/19-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/305f88)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
本章介绍以下四个 Playbook。

1. [Autonomous run](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autonomous-run.md)
2. [Pause safely](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/pause-safely.md)
3. [Session pickup](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/session-pickup.md)
4. [Worktree and simulator cleanup](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md)

四者都用于<strong>将一项长期工作交给 Agent</strong>。其作用如下。

- 不间断地推进一项任务直到完成
- 中途暂停，让另一位 Agent 恢复
- 工作结束后清理不再需要的 worktree 等

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="14">
<li class="code-line" data-line="14">
<strong>worktree</strong>……Git 的功能，可从一个仓库建立多个工作目录，同时检出不同分支</li>
</ul>
</div></aside>

随附指南的夜间工作章节（[`docs/guide/07-overnight.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/07-overnight.md)）列出在人睡觉时委派工作的三个条件：

- <strong>可验证的完成条件</strong>
- <strong>隔离的 worktree</strong>
- <strong>早晨可审计的决策记录</strong>

例如「旧调用方数量为零」是可验证的完成条件，而「工作四小时」不是。

本章先按作用整理四个 Playbook，再依次介绍各自的适用场景、步骤与要点。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章结构如下。

- 四个 Playbook 分别负责一项长期工作的「持续推进、暂停与恢复、清理」
- 「Autonomous run」先确定完成条件，再不间断工作直到满足条件
- 「Pause safely」在毫无背景的 Agent 也能恢复的节点暂停
- 「Session pickup」信任前一位 Agent 的记录，从已完成工作的末尾继续
- 「Worktree and simulator cleanup」删除 worktree 前先证明「无人使用」
- 总结

<a id="4%E3%81%A4%E3%81%AEplaybook%E3%81%AF%E3%80%811%E3%81%A4%E3%81%AE%E9%95%B7%E3%81%84%E4%BD%9C%E6%A5%AD%E3%82%92%E3%80%8C%E7%B6%9A%E3%81%91%E3%82%8B%E3%80%81%E6%AD%A2%E3%82%81%E3%81%A6%E5%86%8D%E9%96%8B%E3%81%99%E3%82%8B%E3%80%81%E7%89%87%E4%BB%98%E3%81%91%E3%82%8B%E3%80%8D%E3%81%A7%E5%88%86%E6%8B%85%E3%81%99%E3%82%8B"></a>


## 四个 Playbook 分别负责一项长期工作的「持续推进、暂停与恢复、清理」

本章四个 Playbook 分为下表中的<strong>三种作用</strong>。

<table class="code-line" data-line="42">
<thead class="code-line" data-line="42">
<tr class="code-line" data-line="42">
<th>作用</th>
<th>Playbook</th>
<th>负责的内容</th>
</tr>
</thead>
<tbody class="code-line" data-line="44">
<tr class="code-line" data-line="44">
<td>不间断地推进一项任务直到完成</td>
<td>「<strong>Autonomous run</strong>」</td>
<td>完成条件</td>
</tr>
<tr class="code-line" data-line="45">
<td>暂停并恢复</td>
<td>「<strong>Pause safely</strong>」</td>
<td>在可恢复的状态暂停</td>
</tr>
<tr class="code-line" data-line="46">
<td>暂停并恢复</td>
<td>「<strong>Session pickup</strong>」</td>
<td>从前一项工作的哪个位置恢复</td>
</tr>
<tr class="code-line" data-line="47">
<td>清理</td>
<td>「<strong>Worktree and simulator cleanup</strong>」</td>
<td>收回磁盘空间，并在删除前确认是否可以删除</td>
</tr>
</tbody>
</table>

<a id="%E7%AB%A0%E5%85%A8%E4%BD%93%E3%81%AB%E5%87%BA%E3%81%A6%E3%81%8F%E3%82%8B%E9%81%93%E5%85%B7"></a>


### 本章反复出现的工具

这些 Playbook 中会反复出现以下工具。

- <strong>`/loop`</strong>……Cursor 内置命令，可按固定间隔或 CI 完成等事件唤醒 Agent。
- <strong>`decisions.tsv`</strong>……由 `/show-me-your-work`（见[第 28 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/724887)）写入的决策记录，每行记载一项决策。

对于长期工作或无人值守的工作，用 `/show-me-your-work` 记录决策。早晨检查时，无需重读整个夜间工作，<strong>可以根据这份记录（`decisions.tsv`）审计决策</strong>。

<a id="%E3%80%8Eautonomous-run%E3%80%8F%E3%81%AF%E3%80%81%E7%B5%82%E4%BA%86%E6%9D%A1%E4%BB%B6%E3%82%92%E5%85%88%E3%81%AB%E6%B1%BA%E3%82%81%E3%80%81%E3%81%9D%E3%82%8C%E3%81%8C%E6%BA%80%E3%81%9F%E3%81%95%E3%82%8C%E3%82%8B%E3%81%BE%E3%81%A7%E6%AD%A2%E3%81%BE%E3%82%89%E3%81%9A%E3%81%AB%E4%BD%9C%E6%A5%AD%E3%82%92%E7%B6%9A%E3%81%91%E3%82%8B"></a>


## 「Autonomous run」先确定完成条件，再不间断工作直到满足条件

「<strong>Autonomous run</strong>」适用于「一直运行到完成」「用 /loop 运行到 X」之类的请求，<strong>持续推进长期任务直到完成</strong>。

<a id="6%E3%81%A4%E3%81%AE%E6%89%8B%E9%A0%86"></a>


### 六个步骤

步骤如下。

1. 确定完成条件
2. 确定如何唤醒 Agent
3. 根据证据逐项作必要改动，并验证结果
4. 自行处理途中发现的问题
5. 每次都用 `/show-me-your-work` 记录决策
6. 满足完成条件后停止

下面逐项说明这些步骤。

<a id="1.-%E7%B5%82%E4%BA%86%E6%9D%A1%E4%BB%B6%E3%82%92%E6%B1%BA%E3%82%81%E3%82%8B"></a>


#### 1. 确定完成条件

在第一次循环前，写下「测试通过」「N 个 PR 全部合并」等形式的完成条件。

<a id="2.-%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AE%E8%B5%B7%E3%81%93%E3%81%97%E6%96%B9%E3%82%92%E6%B1%BA%E3%82%81%E3%82%8B"></a>


#### 2. 确定如何唤醒 Agent

使用 `/loop` 确定唤醒方式。若有 CI 完成、PR 合并等需要等待的事件，就安排一位监视子 Agent 监视事件并唤醒 Agent，并预设较长间隔的定时唤醒作为备用。若没有需要等待的事件，就在值得重新检查结果的时间点，以固定间隔唤醒。

<a id="3.-%E8%A8%BC%E6%8B%A0%E3%82%92%E5%85%83%E3%81%AB%E5%BF%85%E8%A6%81%E3%81%AA%E5%A4%89%E6%9B%B4%E3%82%92%E4%B8%80%E3%81%A4%E3%81%9A%E3%81%A4%E8%A1%8C%E3%81%84%E3%80%81%E7%B5%90%E6%9E%9C%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B"></a>


#### 3. 根据证据逐项作必要改动，并验证结果

根据证据作必要的最小改动。改动后检查是否更接近最初设定的完成条件；若更接近就提交，否则撤销（参见 Principle「[<strong>Sequence Work into Verifiable Units</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-sequence-verifiable-units/SKILL.md)」，[第 19 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/1fb019)）。

<a id="4.-%E9%80%94%E4%B8%AD%E3%81%A7%E8%A6%8B%E3%81%A4%E3%81%91%E3%81%9F%E3%81%93%E3%81%A8%E3%81%AF%E8%87%AA%E5%88%86%E3%81%A7%E7%89%87%E4%BB%98%E3%81%91%E3%82%8B"></a>


#### 4. 自行处理途中发现的问题

相关缺陷或不稳定的验证由 Agent 自行修复；偏离主线的修复另开 PR。只在操作不可逆、判断无法通过实验作出，或真正遇到瓶颈时请求人来判断。

<a id="5.-%E6%AF%8E%E5%9B%9E%E3%80%81%2Fshow-me-your-work-%E3%81%A7%E5%88%A4%E6%96%AD%E3%82%92%E8%A8%98%E9%8C%B2%E3%81%99%E3%82%8B"></a>


#### 5. 每次都用 `/show-me-your-work` 记录决策

每轮循环逐行记录改动内容及是否更接近完成条件。

<a id="6.-%E7%B5%82%E4%BA%86%E6%9D%A1%E4%BB%B6%E3%81%8C%E6%BA%80%E3%81%9F%E3%81%95%E3%82%8C%E3%81%9F%E3%82%89%E6%AD%A2%E3%81%BE%E3%82%8B"></a>


#### 6. 满足完成条件后停止

若条件尚未满足，就尝试其他方法。不得降低条件来宣称完成；若确实无法继续推进，应报告现状。

<a id="%E8%BF%94%E7%AD%94%E3%81%AB%E6%9B%B8%E3%81%8F%E9%A0%85%E7%9B%AE"></a>


#### 回答应包含的项目

回答应包含以下项目。

- 完成条件
- 循环次数
- 最终保留的改动，以及尝试后发现未接近条件而撤销的改动
- 最终条件的状态

<a id="%E8%A6%81%E7%82%B9%E3%81%AF%E3%80%81%E7%B5%82%E4%BA%86%E6%9D%A1%E4%BB%B6%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%89%E3%82%8C%E3%82%8B%E8%BF%B0%E8%AA%9E%E3%81%AB%E3%81%99%E3%82%8B%E3%81%93%E3%81%A8"></a>


### 要点是把完成条件写成可验证的谓词

谓词就是可判断为真或假的条件，即能判断它是否得到满足。

如开头所述，<strong>时长不能作为完成条件</strong>。「工作四小时」没有可验证的对象，早晨剩下的只是四小时的活动记录。随附指南的常见陷阱章节（[`docs/guide/10-recipes-and-pitfalls.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/10-recipes-and-pitfalls.md)）也把「再改进一些」这类模糊条件列为失败示例。因此，Agent 在步骤 1 确定条件，并在步骤 6 停止之前始终坚持同一条件。

<a id="%E3%80%8Epause-safely%E3%80%8F%E3%81%AF%E3%80%81%E4%BD%95%E3%82%82%E7%9F%A5%E3%82%89%E3%81%AA%E3%81%84%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%8C%E5%86%8D%E9%96%8B%E3%81%A7%E3%81%8D%E3%82%8B%E5%8C%BA%E5%88%87%E3%82%8A%E3%81%A7%E4%BD%9C%E6%A5%AD%E3%82%92%E6%AD%A2%E3%82%81%E3%82%8B"></a>


## 「Pause safely」在毫无背景的 Agent 也能恢复的节点暂停

「<strong>Pause safely</strong>」用于接到暂停指令、重启 Cursor 或对话即将压缩（将装不下的对话概括整理）时。<strong>它让毫无背景的 Agent 也能恢复工作</strong>。只有明确指示时才运行；如果被要求「继续」或「不要停止」，就不会暂停。

<a id="4%E3%81%A4%E3%81%AE%E6%89%8B%E9%A0%86"></a>


### 四个步骤

1. <strong>在安全的节点暂停</strong>……完成或撤销当前最小单元的步骤，不开始新工作
2. <strong>不为暂停而执行不可逆操作</strong>……除非 PR 已经提交，否则不创建 PR，也不 push
3. <strong>将工作保存为不会消失的形式</strong>……把未提交的编辑汇总成一个以 `wip:` 开头的提交
4. <strong>在上下文之外写恢复备忘</strong>……写明意图、进展、下一步及注意事项；若已有 `/show-me-your-work` 的记录，就引用该记录而不重复内容

回答应包含以下项目。

- 循环进行到哪里
- 已记录在文件或提交中的信息，以及仍只存在于对话上下文中的工作状态、意图和注意事项
- 创建的提交
- 恢复时的第一个行动

<a id="%E8%A6%81%E7%82%B9%E3%81%AF%E3%80%8C%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AE%E9%A0%AD%E3%81%AE%E4%B8%AD%E3%81%AB%E3%81%97%E3%81%8B%E3%81%AA%E3%81%84%E3%82%82%E3%81%AE%E3%80%8D%E3%82%92%E5%A4%96%E3%81%AB%E5%87%BA%E3%81%99%E3%81%93%E3%81%A8"></a>


### 要点是把「只存在于 Agent 脑中的内容」转存到外部

Agent 的上下文会在压缩或会话结束时消失。回答中区分「磁盘上的内容（文件或提交中记录的信息）」与「只存在于脑中的内容（工作状态、意图、注意事项）」，便能<strong>看出哪些内容未能移入文件或提交</strong>。

`wip:` 提交将编辑中的代码保存在磁盘上；恢复备忘则保存无法写入代码的意图和注意事项。可以把它理解为在单项工作中落实[第 4 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141)所说的「代码库就是记忆」。

<a id="%E3%80%8Esession-pickup%E3%80%8F%E3%81%AF%E3%80%81%E5%89%8D%E3%81%AE%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AE%E8%A8%98%E9%8C%B2%E3%82%92%E4%BF%A1%E3%81%98%E3%81%A6%E4%BD%9C%E6%A5%AD%E3%81%AE%E7%B6%9A%E3%81%8D%E3%81%8B%E3%82%89%E5%A7%8B%E3%82%81%E3%82%8B"></a>


## 「Session pickup」信任前一位 Agent 的记录，从已完成工作的末尾继续

「<strong>Session pickup</strong>」用于根据对话记录（与 Agent 对话的记录）、Cloud Agents URL 或已推送分支，接手前一位 Agent 尚未完成的工作。它与「<strong>Pause safely</strong>」成对。

若接手一项具体工作，使用「Session pickup」；<strong>若需要汇集多个对话的上下文，使用 [`/recall`](https://github.com/cursor/plugins/blob/main/pstack/skills/recall/SKILL.md)</strong>（见[第 22 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746)）。

<a id="5%E3%81%A4%E3%81%AE%E6%89%8B%E9%A0%86"></a>


### 五个步骤

1. <strong>寻找先前记录</strong>
   - 查找当前工作区的对话记录、Cloud Agents URL 或已推送分支
   - 让子 Agent 阅读较长的对话记录，只把摘要放入主线程（调用子 Agent 的原始对话；参见 Principle「[<strong>Guard the Context Window</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-guard-the-context-window/SKILL.md)」，[第 20 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/c155cc)）
2. <strong>重建工作状态</strong>
   - 查明工作分支、已完成的改动（通过 `git log` 或与 base 的 `git diff` 核实）、剩余 TODO 及已作决策
3. <strong>比较已完成与剩余工作</strong>
   - 比较计划与完成情况，确定从哪里恢复，避免重复已完成的工作
4. <strong>将剩余工作交给适合其内容的 Playbook</strong>
   - 后续工作由适合工作内容的 Playbook 接手
5. <strong>用实际成果核实接手的主张</strong>
   - 不把前一位 Agent 自称「成功」当作证明，而要实际检查接手的改动（参见 Principle「[<strong>Prove It Works</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md)」，[第 19 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/1fb019)）

回答应包含以下项目。

- 前一位 Agent 在哪里停止
- 接手的内容与重新做过的内容
- 恢复起点
- 结果

<a id="%E8%A6%81%E7%82%B9%E3%81%AF%E3%80%81%E5%89%8D%E3%81%AE%E8%A8%98%E9%8C%B2%E3%82%92%E4%BF%A1%E9%A0%BC%E3%81%A7%E3%81%8D%E3%82%8B%E5%85%A5%E5%8A%9B%E3%81%A8%E3%81%97%E3%81%A6%E6%89%B1%E3%81%86%E3%81%93%E3%81%A8"></a>


### 要点是将先前记录作为可信的输入

<strong>接手的 Agent 不必重新推导前一位 Agent 的记录，而应直接把它作为输入使用</strong>。

Playbook 要求使用先前记录区分已完成与未完成的工作，从剩余部分继续。

例如，前一位 Agent 已复现缺陷并留下操作步骤、画面与日志，接手者就不必再重复操作，而应阅读记录，从调查原因或修复开始。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E5%88%A4%E6%96%AD%E3%83%AD%E3%82%B0%E3%82%92%E8%AA%AD%E3%81%BF%E3%80%81%E6%B8%88%E3%82%93%E3%81%A0%E4%BD%9C%E6%A5%AD%E3%81%AE%E7%B6%9A%E3%81%8D%E3%81%8B%E3%82%89%E5%A7%8B%E3%82%81%E3%82%8B%E3%82%88%E3%81%86%E9%A0%BC%E3%82%80"></a>


### 请求写法：要求阅读决策日志，从已完成工作的末尾继续

随附指南中的示例请求接手一个分支，要求阅读决策日志以查明已完成的工作，且不要重做已经完成的部分。

```
/poteto-mode take over this branch. read the decision log, figure out what's done, and continue from there. don't redo finished work.
// 接手这个分支。阅读决策日志，了解已经完成的工作，然后从那里继续。不要重做已完成的工作。
```

<a id="%E3%80%8Eworktree-and-simulator-cleanup%E3%80%8F%E3%81%AF%E3%80%81worktree%E3%82%92%E6%B6%88%E3%81%99%E5%89%8D%E3%81%AB%E3%80%8C%E4%BD%BF%E3%82%8F%E3%82%8C%E3%81%A6%E3%81%84%E3%81%AA%E3%81%84%E3%80%8D%E3%82%92%E8%A8%BC%E6%98%8E%E3%81%99%E3%82%8B"></a>


## 「Worktree and simulator cleanup」删除 worktree 前先证明「无人使用」

「<strong>Worktree and simulator cleanup</strong>」用于删除已合并或废弃的 git worktree 和旧 iOS 模拟器，以释放磁盘空间。

<a id="6%E3%81%A4%E3%81%AE%E6%89%8B%E9%A0%86-1"></a>


### 六个步骤

步骤如下。

1. 记录并审计
2. 分类是建议，不是许可
3. 删除前确认使用情况
4. 在不可逆的损失前停下
5. 删除已确认的对象
6. 清理模拟器等其他可回收对象

下面逐项说明这些步骤。

<a id="1.-%E8%A8%98%E9%8C%B2%E3%81%97%E3%81%A6%E7%9B%A3%E6%9F%BB%E3%81%99%E3%82%8B"></a>


#### 1. 记录并审计

使用 `df -h /` 记录当前磁盘用量，再运行 [`worktree-audit.sh`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/scripts/worktree-audit.sh)（参见 Principle「[<strong>Build the Lever</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-build-the-lever/SKILL.md)」，[第 17 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b)）。

`worktree-audit.sh` 是不会删除内容的只读脚本。它检查以下项目。

- 每个 worktree 的大小
- 每个 worktree 的存续时间（距离最后更新的时间）
- 是否已经合并
- 未提交的编辑
- PR 状态
- 最后操作的对话

脚本依据这些信息给出分类建议。

<a id="2.-%E5%88%86%E9%A1%9E%E3%81%AF%E5%8A%A9%E8%A8%80%E3%81%A7%E3%81%82%E3%81%A3%E3%81%A6%E3%80%81%E8%A8%B1%E5%8F%AF%E3%81%A7%E3%81%AF%E3%81%AA%E3%81%84"></a>


#### 2. 分类是建议，不是许可

脚本的分类只是删除候选建议。被置顶或仍在进行的对话（侧边栏中与 Agent 的对话）正在使用的 worktree，必须排除。脚本曾把置顶对话使用的 worktree 判定为 safe，因此还要对照对话列表检查候选。

<a id="3.-%E6%B6%88%E3%81%99%E5%89%8D%E3%81%AB%E4%BD%BF%E7%94%A8%E7%8A%B6%E6%B3%81%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B"></a>


#### 3. 删除前确认使用情况

若有疑问，就让子 Agent 阅读对话记录（与 Agent 的对话记录）来确认。

<a id="4.-%E5%85%83%E3%81%AB%E6%88%BB%E3%81%9B%E3%81%AA%E3%81%84%E6%90%8D%E5%A4%B1%E3%81%AE%E5%89%8D%E3%81%A7%E6%AD%A2%E3%81%BE%E3%82%8B"></a>


#### 4. 在不可逆的损失前停下

若存在未提交的工作，就把差异展示给用户，由用户判断。

<a id="5.-%E7%A2%BA%E5%AE%9A%E3%81%97%E3%81%9F%E3%82%82%E3%81%AE%E3%82%92%E6%B6%88%E3%81%99"></a>


#### 5. 删除已确认的对象

使用 `git worktree remove` 和 `git worktree prune` 删除。分支会保留，提交不会丢失。

<a id="6.-%E3%82%B7%E3%83%9F%E3%83%A5%E3%83%AC%E3%83%BC%E3%82%BF%E3%83%BC%E3%81%AA%E3%81%A9%E3%80%81%E3%81%BB%E3%81%8B%E3%81%AE%E5%9B%9E%E5%8F%8E%E5%85%88%E3%82%82%E7%89%87%E4%BB%98%E3%81%91%E3%82%8B"></a>


#### 6. 清理模拟器等其他可回收对象

删除旧模拟器、运行时环境，必要时也清理构建缓存。

<a id="%E8%BF%94%E7%AD%94%E3%81%AB%E6%9B%B8%E3%81%8F%E9%A0%85%E7%9B%AE-1"></a>


#### 回答应包含的项目

回答应包含以下项目。

- 删除前后的可用磁盘空间以及增加的容量
- 已删除的 worktree
- 保留的对象及各自的理由

<a id="%E8%A6%81%E7%82%B9%E3%81%AF%E3%80%81%E5%89%8A%E9%99%A4%E3%81%AE%E5%89%8D%E3%81%AE%E9%96%A2%E9%96%80%E3%81%8C%E3%81%9D%E3%81%AE%E3%81%BE%E3%81%BE%E3%83%AC%E3%83%93%E3%83%A5%E3%83%BC%E3%81%AB%E3%81%AA%E3%82%8B%E3%81%93%E3%81%A8"></a>


### 要点是删除前的关卡即为审阅

删除 worktree 或模拟器可能使进行中的环境或未提交的改动丢失。因此，删除前要确认其无人使用，且没有未提交改动。这些检查就是防止误删的关卡（删除前必须通过的检查）。

其他 Playbook 可通过代码审阅发现错误；这个 Playbook 则是唯一一个不经代码审阅就删除用户本地 worktree 或模拟器的 Playbook。因此，步骤 2 至 4 对使用情况和未提交工作的<strong>检查关卡本身就是审阅</strong>。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E3%80%8C%E5%AE%89%E5%85%A8%E3%81%AB%E6%B6%88%E3%81%9B%E3%82%8Bworktree%E3%82%92%E6%B6%88%E3%81%97%E3%81%A6%E3%80%8D%E3%81%A8%E9%A0%BC%E3%82%80"></a>


### 请求写法：请求「删除可安全清理的 worktree」

随附指南的示例询问哪些内容占用磁盘空间，并要求只删除可安全清理的 worktree。

```
/poteto-mode what's eating my disk? prune the worktrees that are safe to prune.
// 什么占用了磁盘空间？删除可以安全删除的 worktree。
```

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 总结

- <strong>四个 Playbook 的作用</strong>……「<strong>Autonomous run</strong>」将一项任务推进至完成；「<strong>Pause safely</strong>」与「<strong>Session pickup</strong>」负责暂停和恢复工作；「<strong>Worktree and simulator cleanup</strong>」负责清理。
- <strong>Autonomous run</strong>……确定可验证的完成条件，持续工作直到满足条件。
- <strong>Pause safely</strong>……把只存在于 Agent 脑中的内容通过 `wip:` 提交和恢复备忘保存下来，再暂停。
- <strong>Session pickup</strong>……信任先前记录，不重复已完成的工作，并实际核实接手的主张。
- <strong>Worktree and simulator cleanup</strong>……证明无人使用后再删除。删除前的关卡即为审阅。

下一章[第 16 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5)介绍规划多个 PR、由多个 Agent 执行的四个 Playbook。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](18-chapter.md) · [下一篇](20-chapter.md) · [English](../en/19-chapter.md)
