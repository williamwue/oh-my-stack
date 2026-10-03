# 第 14 章：创建 PR，合并已验证的变更

[目录](README.md) · [上一篇](17-chapter.md) · [下一篇](19-chapter.md) · [English](../en/18-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/8f6c25)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
本章介绍以下三个 Playbook。

1. [Opening a PR](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md)
2. [Babysit](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md)
3. [Shipping](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/shipping.md)

三者负责直到将改动并入 trunk（PR 合并目标所在的主线分支），各自负责以下一个阶段。

- <strong>创建 PR</strong>
- <strong>使 PR 达到 merge-ready（可合并）状态</strong>
- <strong>只将已验证的 PR 并入 trunk</strong>

选择哪个 Playbook，取决于 PR 当前处于哪个阶段：尚无 PR；已有 PR 但尚不能合并；或希望将可合并的 PR 并入 trunk。

本章依次说明三个 Playbook 如何衔接，以及各自的步骤和要点。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章结构如下。

- 三个 Playbook 按「创建 PR、使其可合并、并入 trunk」的顺序衔接
- 「Opening a PR」创建范围小、易阅读、可立即审阅的 PR
- 「Babysit」从尚未合并的最前沿 PR 开始处理问题，使其达到 merge-ready
- 「Shipping」只将通过另一位 Agent 验证的连续 PR 范围并入 trunk
- 总结

<a id="3%E3%81%A4%E3%81%AEplaybook%E3%81%AF%E3%80%8Cpr%E3%82%92%E4%BD%9C%E3%82%8B%E3%80%81%E3%83%9E%E3%83%BC%E3%82%B8%E5%8F%AF%E8%83%BD%E3%81%AB%E3%81%97%E3%80%81trunk-%E3%81%AB%E5%8F%96%E3%82%8A%E8%BE%BC%E3%82%80%E3%80%8D%E3%81%AE%E9%A0%86%E3%81%AB%E3%81%A4%E3%81%AA%E3%81%8C%E3%82%8B"></a>


## 三个 Playbook 按「创建 PR、使其可合并、并入 trunk」的顺序衔接

开头所述的三个阶段依次是「创建 PR」「变绿（全部 CI 检查通过）」「并入 trunk」，<strong>每个阶段都有明确的结束位置</strong>。

<table class="code-line" data-line="30">
<thead class="code-line" data-line="30">
<tr class="code-line" data-line="30">
<th>阶段</th>
<th>Playbook</th>
<th>结束位置</th>
</tr>
</thead>
<tbody class="code-line" data-line="32">
<tr class="code-line" data-line="32">
<td>创建</td>
<td>「<strong>Opening a PR</strong>」</td>
<td>返回 PR 的 URL</td>
</tr>
<tr class="code-line" data-line="33">
<td>使其变绿</td>
<td>「<strong>Babysit</strong>」</td>
<td>merge-ready</td>
</tr>
<tr class="code-line" data-line="34">
<td>并入</td>
<td>「<strong>Shipping</strong>」</td>
<td>从根部开始连续、已验证的 PR 完成合并</td>
</tr>
</tbody>
</table>

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="37">
<li class="code-line" data-line="37">
<strong>forge</strong>……本章把管理 PR 的服务及操作它的 CLI 合称为「forge」。默认使用 GitHub CLI（<code>gh</code>）。</li>
<li class="code-line" data-line="38">
<strong>trunk</strong>……PR 的合并目标所在的主线分支。许多仓库使用 <code>main</code>。</li>
<li class="code-line" data-line="39">
<strong>PR 栈</strong>……由父子关系连接的一列 PR。只有最前沿的 PR（根部）指向 trunk（结构见下一节的图）。</li>
<li class="code-line" data-line="40">
<strong>合并最前沿</strong>……PR 栈中尚未合并、下一步应合并的 PR。</li>
<li class="code-line" data-line="41">
<strong>merge-ready</strong>……forge 判断 CI 检查全部通过、无未解决的审阅意见且无冲突的状态。</li>
</ul>
</div></aside>

各阶段对应的请求措辞也不同。以下示例来自随附指南的验证章节（[`docs/guide/06-verify-and-ship.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md)）。

```
/poteto-mode babysit this pr. get it green.
// このPRを babysit して。緑にして。
```

```
/poteto-mode land the stack.
// スタックを trunk に取り込んで。
```

<strong>仅打开 PR 不会启动「Babysit」</strong>。

请求「让检查变绿」会运行「<strong>Babysit</strong>」；请求「合并整个 PR 栈」会运行「<strong>Shipping</strong>」。

<a id="%E3%80%8Eopening-a-pr%E3%80%8F%E3%81%AF%E3%80%81pr%E3%82%92%E5%B0%8F%E3%81%95%E3%81%8F%E3%80%81%E8%AA%AD%E3%81%BF%E3%82%84%E3%81%99%E3%81%8F%E3%80%81%E3%81%99%E3%81%90%E3%83%AC%E3%83%93%E3%83%A5%E3%83%BC%E3%81%A7%E3%81%8D%E3%82%8B%E5%BD%A2%E3%81%A7%E4%BD%9C%E3%82%8B"></a>


## 「Opening a PR」创建范围小、易阅读、可立即审阅的 PR

「<strong>Opening a PR</strong>」是<strong>规定如何把改动整理成 PR 的 Playbook</strong>。

与前面介绍的 Playbook 不同，它不按编号列步骤，而是按标题组织规则。主要规则如下。

- <strong>Worktree</strong>……在从 main 创建的 git worktree 中工作。
- <strong>Commits</strong>……打开 PR 前用 rebase 将提交整理为小而有序的序列。把每次提交当作可以单独合并的「未来 PR」。
- <strong>PRs</strong>……针对差异，在提交前运行 `/deslop`（[`cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit) 中用于删除 AI 常写的多余代码的 Skill），审阅前运行 `/no-comments`（删除不必要注释的 Skill）。标题、说明和提交正文用规定技术文档写法的 `/technical-writing` 编写，再运行 `/unslop` 删除 AI 常见套话（见[第 32 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/44857b)）。
- <strong>Titles</strong>……采用 Conventional Commits 格式，例如 `fix(pstack): retarget opening-a-pr babysit trigger`。
- <strong>Forge</strong>……从创建到合并，始终使用同一个 forge。
- <strong>Size and stacks</strong>……宁可创建五个范围窄的 PR，也不创建一个庞大的 PR；将小 PR 组成 PR 栈。
- <strong>Readiness</strong>……打开 PR 时应已可供审阅，而不是草稿。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="75">
<li class="code-line" data-line="75">
<strong>git worktree</strong>……Git 的功能，可从一个仓库额外创建处理不同分支的工作目录（例如保留 main 的工作目录，同时在另一目录打开修复分支）</li>
<li class="code-line" data-line="76">
<strong>rebase</strong>……将提交重新接到其他提交上、重排历史的 Git 操作</li>
<li class="code-line" data-line="77">
<strong>Conventional Commits</strong>……提交消息采用 <code>fix:</code>、<code>feat:</code> 等表示改动类型的前缀的规范</li>
</ul>
</div></aside>

PR 栈的形态如下：子 PR 以父 PR 的分支为 base。

```
main  ← trunk
 └─ PR #1 (base: main) ← ルートのPRだけが trunk を向く
     └─ PR #2 (base: PR #1 のブランチ)
         └─ PR #3 (base: PR #2 のブランチ)
```

<a id="pr%E3%81%AE%E6%9C%AC%E6%96%87%E3%81%AF%E3%80%8Cbriefing%E3%80%8D%E3%81%A8%E3%81%97%E3%81%A6%E6%9B%B8%E3%81%8F"></a>


### 把 PR 正文写成「Briefing」

这个 Playbook 的要点，是正文规则的第一句话。

> The PR body is a briefing, not the lab notebook.
>
> PR 正文是情况简报，而非实验笔记。

不要逐项列举工作中试过什么或经历了什么，只写持有差异的审阅者<strong>作出是否批准改动的判断所需的信息</strong>。正文依次为 `## Why`、`## Scope`、`## Tradeoffs`、`## Blast Radius`（影响范围）、`## Verification`；没有内容的章节就省略。

<a id="pr%E3%82%92%E9%96%8B%E3%81%84%E3%81%A6%E3%82%82%E3%80%81babysit%E3%81%AF%E5%A7%8B%E3%82%81%E3%81%AA%E3%81%84"></a>


### 打开 PR 后也不启动 Babysit

<strong>Agent 打开 PR 后，应报告 PR 的 URL，并继续剩余工作</strong>。

若对每个 PR 都运行「<strong>Babysit</strong>」，工作每次都会中断。若后续工作又改写提交，该 PR 已运行的 CI 检查就会作废，必须针对新提交重新运行。

例外是[第 16 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5)介绍的「[<strong>Autopilot-full</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-full.md)」（由 Agent 自主将 PR 队列推进至合并的 Playbook）和「[<strong>Autopilot-stack</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-stack.md)」（采用相同步骤，但不合并，只制作一个 PR 栈的 Playbook）中，分别负责单个 PR 的 Agent（负责人）。负责人收到的指令包含「<strong>Babysit</strong>」循环，因此打开所负责的 PR 后，仍会继续推进至 merge-ready（Autopilot-stack 则推进至 STACK-READY）。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E5%B0%8F%E3%81%95%E3%81%8F%E9%A0%86%E5%BA%8F%E7%AB%8B%E3%81%A6%E3%81%9F%E3%82%B3%E3%83%9F%E3%83%83%E3%83%88%E3%81%A8%E3%80%81%E8%AA%AC%E6%98%8E%E3%81%AB%E6%9B%B8%E3%81%8F%E8%A8%BC%E6%8B%A0%E3%82%92%E6%B1%82%E3%82%81%E3%82%8B"></a>


### 请求写法：要求小而有序的提交，以及在说明中给出证据

随附指南中的请求示例要求将提交整理得小而有序，并把证据写入 PR 说明。

```
/poteto-mode open the pr. small ordered commits, evidence in the description.
// PRを開いて。コミットは小さく順序立てて、証拠はPRの説明に書いて。
```

<a id="%E3%80%8Ebabysit%E3%80%8F%E3%81%AF%E3%80%81%E6%9C%AA%E3%83%9E%E3%83%BC%E3%82%B8%E3%81%AE%E6%9C%80%E5%89%8D%E7%B7%9A%E3%81%AEpr%E3%81%8B%E3%82%89%E9%A0%86%E3%81%AB%E5%95%8F%E9%A1%8C%E3%82%92%E7%89%87%E4%BB%98%E3%81%91%E3%80%81merge-ready-%E3%81%AB%E3%81%99%E3%82%8B"></a>


## 「Babysit」从尚未合并的最前沿 PR 开始处理问题，使其达到 merge-ready

「<strong>Babysit</strong>」处理冲突、审阅讨论和 CI 失败，<strong>使 PR 或 PR 栈达到 merge-ready 状态</strong>。需要人来判断时就停止。

Cursor 也有监视 PR 状态的内置 `/autopilot` Skill（旧名 babysit），可能由类似请求触发。因此 `/poteto-mode` 明确规定，<strong>所有关于 PR 状态的请求都交给这个 Playbook</strong>。例如：

- 「关注这个 PR」
- 「让检查变绿」
- 「处理 Bugbot 评论」
- 「关注 PR X 的进展」

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="128"><a href="https://cursor.com/ja/docs/bugbot" rel="nofollow noopener noreferrer" target="_blank"><strong>Bugbot</strong></a>……Cursor 提供的 PR 自动审阅功能。PR 创建或更新时，它读取差异，并以 PR 审阅评论的形式指出可能存在的缺陷或安全问题</p>
</div></aside>

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A%E6%9C%80%E5%89%8D%E7%B7%9A%E3%81%AEpr%E3%81%8B%E3%82%89%E9%A0%86%E3%81%AB%E5%95%8F%E9%A1%8C%E3%82%92%E7%89%87%E4%BB%98%E3%81%91%E3%82%8B"></a>


### 步骤：从最前沿 PR 开始逐个处理问题

主要步骤如下。

1. <strong>声明模式</strong>……查看状态前，先确定要处理到什么程度。默认是 `drive`；小 PR 或纯文档 PR 使用 `check`（模式见下表）
2. <strong>只关注最前沿</strong>……只修复尚未合并的最前沿 PR，不碰上面的 PR
3. <strong>每个 PR 栈只由一位 Agent 负责</strong>
4. <strong>不改变 PR 栈结构（PR 的父子关系）</strong>……不 rebase、不改 base、不 force-push。若需要 rebase，就向分支负责人报告
5. <strong>按冲突、审阅讨论、CI 的顺序处理</strong>……已知的修复汇总在一次 push 中，令检查只需重新运行一次。冲突不能自行解决；报告哪个分支需要 rebase 后停止
6. <strong>以 forge 的判断为准</strong>……「ready」不只是所有 CI 检查通过，还要由 forge 认定可合并。在 GitHub 上，使用随附脚本 [`watch-pr`](https://github.com/cursor/plugins/tree/main/pstack/skills/poteto-mode/scripts/watch-pr) 获取 PR 状态
7. <strong>重新运行 CI 前先分类失败原因</strong>……只有测试偶发失败（与代码无关、偶尔失败的测试）或基础设施问题时才重新运行；只有失败确由改动中的代码造成时才以提交修复
8. <strong>分流 Bugbot 评论</strong>
9. <strong>需要人判断时停止</strong>

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="146">
<li class="code-line" data-line="146">
<strong>force-push</strong>……用本地历史强制覆盖远端分支历史的 push</li>
<li class="code-line" data-line="147">
<strong>分流</strong>……为决定是否需要处理、如何处理而给项目分类（如修复、驳回、提问）</li>
</ul>
</div></aside>

<table class="code-line" data-line="150">
<thead class="code-line" data-line="150">
<tr class="code-line" data-line="150">
<th>模式</th>
<th>执行内容</th>
<th>对应请求</th>
</tr>
</thead>
<tbody class="code-line" data-line="152">
<tr class="code-line" data-line="152">
<td><code>drive</code></td>
<td>反复检查状态并修复，直到达到 merge-ready</td>
<td>「让检查变绿」「使其达到可合并状态」</td>
</tr>
<tr class="code-line" data-line="153">
<td><code>background</code></td>
<td>不暂停其他工作，对 PR 状态进行分流</td>
<td>计划仍在执行时</td>
</tr>
<tr class="code-line" data-line="154">
<td><code>threads-only</code></td>
<td>只回复审阅评论</td>
<td>「处理 Bugbot 评论」</td>
</tr>
<tr class="code-line" data-line="155">
<td><code>check</code></td>
<td>检查一次状态并报告</td>
<td>「看看 X 的进展」「检查变绿了吗？」</td>
</tr>
</tbody>
</table>

<a id="bugbot%E3%81%AE%E3%82%B3%E3%83%A1%E3%83%B3%E3%83%88%E3%81%AF%E3%80%81fix%E3%80%81dismiss%E3%80%81ask%E3%81%AB%E5%88%86%E3%81%91%E3%82%8B"></a>


### 将 Bugbot 评论分为 fix、dismiss、ask

步骤 8 要求在处理 Bugbot 等评论前，先把它们分为三类。标准见 [`references/bugbot-triage.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/references/bugbot-triage.md)。

- <strong>fix</strong>……若可能涉及正确性、安全或数据丢失等问题，应在包含问题代码且最早合并的 PR 中修复，并解决讨论。
- <strong>dismiss</strong>……若属于已记录的低风险模式，且可从代码证明所指出的风险并不适用，就简短回复理由并解决讨论。
- <strong>ask</strong>……若是新类型、高严重程度或含糊的指出，就不要猜测，应询问用户。

先对照代码检查 Bugbot 的指出。如果无法判断是否误报，就<strong>不要猜测，而要向用户确认</strong>；错误驳回真实缺陷的损失大于确认所需的时间。

审阅评论是需要验证的主张，不是必须照做的指令。因此，不应只为消除评论而改代码；仅在确认问题后修复。

<a id="merge-ready-%E3%81%A7%E3%82%82%E3%80%81%E3%83%9E%E3%83%BC%E3%82%B8%E3%81%AF%E3%81%97%E3%81%AA%E3%81%84"></a>


### 即使达到 merge-ready，也不合并

步骤 9 的合并规则如下。

> Babysitting never authorizes merging. Only an explicit request to merge, land, ship, or merge when ready does.
>
> babysit 不授予合并权限；只有明确请求合并、并入（land）、发布（ship）或准备好后合并，才算授权。

即便达到 merge-ready，<strong>Agent 也应报告并停止</strong>。若用户请求合并，就转交「<strong>Shipping</strong>」。

达到 merge-ready 后，回顾这次的评论分流；若发现可供团队复用的 dismiss 模式（已记录的低风险模式），应另开 PR 提议补充到 `references/bugbot-triage.md`。

<a id="%E8%A6%81%E7%82%B9%E3%81%AF%E3%80%8C%E6%9C%80%E5%89%8D%E7%B7%9A%E3%81%A0%E3%81%91%E3%80%8D%E3%81%AE%E8%A6%8F%E5%89%87"></a>


### 要点是「只关注最前沿」的规则

在「<strong>Babysit</strong>」中，<strong>应优先解决下一个待合并 PR 的问题</strong>。

也应阅读后续 PR 的审阅评论并汇总待办事项；但若修复后续 PR 会导致更早的 PR 重跑检查，就推迟处理后续 PR。

例如，PR #1 的 CI 失败时，即使 PR #3 收到审阅评论，也先让 PR #1 的 CI 通过。PR 栈只能自下而上合并，所以当前能推动合并的只有最前沿。

另外，每次收到后续 PR 的评论就修复并 push，会使检查每次都重跑。因此，先积累后续 PR 的问题，待处理最前沿时合并到同一次 push 中修复。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E3%80%8C%E7%B7%91%E3%81%AB%E3%81%97%E3%81%A6%E3%80%8D%E3%81%A8%E9%A0%BC%E3%81%BF%E3%80%81%E7%8A%B6%E6%85%8B%E3%81%A0%E3%81%91%E3%81%AA%E3%82%89%E5%B0%8F%E3%81%95%E3%81%8F%E9%A0%BC%E3%82%80"></a>


### 请求写法：要推进就说「让检查变绿」，只查状态就缩小请求

若希望推进到 merge-ready，就说「让检查变绿」。这里再列一次本章开头的请求示例。

```
/poteto-mode babysit this pr. get it green.
// このPRを babysit して。緑にして。
```

若只想知道状态，就提出较小的请求。以下请求会使用 `check` 回答，而不启动循环。

```
/poteto-mode check on pr 123. anything outstanding?
// PR 123 の状態を確認して。残っていることはある？
```

<a id="%E3%80%8Eshipping%E3%80%8F%E3%81%AF%E3%80%81%E5%88%A5%E3%81%AE%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AE%E6%A4%9C%E8%A8%BC%E3%82%92%E9%80%9A%E3%81%A3%E3%81%9Fpr%E3%81%AE%E7%AF%84%E5%9B%B2%E3%81%A0%E3%81%91%E3%82%92-trunk-%E3%81%AB%E5%8F%96%E3%82%8A%E8%BE%BC%E3%82%80"></a>


## 「Shipping」只将通过另一位 Agent 验证的连续 PR 范围并入 trunk

用户要求把已通过 CI 的 PR 栈<strong>并入 trunk（PR 合并目标所在的主线分支）</strong>时，使用「<strong>Shipping</strong>」。它独立验证每个 PR，只从根部开始逐个合并连续且已验证的部分。`/poteto-mode` 将其概括为「Green is not safe.」（CI 通过并不表示安全）。

<a id="%E8%A6%81%E7%82%B9%E3%81%AF%E3%80%8C%E5%AE%89%E5%85%A8%E3%80%8D%E3%81%AE%E5%AE%9A%E7%BE%A9"></a>


### 要点是「安全」的定义

> Safe means a verdict from an agent that did not write the code. CI green is not a verdict, and an approving bot review is not a verdict.
>
> 安全是未编写该代码的 Agent 作出的判定。CI 通过并非判定；批准该变更的 bot 审阅也并非判定。

这一定义将[第 2 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/27a183)的「信任的是成果物，而非 Agent」应用于合并前的检查，<strong>连由谁验证也规定清楚</strong>。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A%E5%90%84pr%E3%82%92%E6%A4%9C%E8%A8%BC%E3%81%97%E3%80%81%E9%80%A3%E7%B6%9A%E3%81%97%E3%81%9F%E7%AF%84%E5%9B%B2%E3%82%92%E6%B1%BA%E3%82%81%E3%80%811%E3%81%A4%E3%81%9A%E3%81%A4-trunk-%E3%81%AB%E5%8F%96%E3%82%8A%E8%BE%BC%E3%82%80"></a>


### 步骤：验证每个 PR，确定连续范围，逐个并入 trunk

共有六步。

1. 独立验证每个 PR
2. 只并入从根部开始连续且已验证的范围
3. 确认判定仍对应当前补丁（改动差异）
4. 只准备最前沿 PR，并逐个合并
5. 每次合并后重新计算，并监视最前沿直到完成合并
6. 到上限即停止

下面逐项说明这些步骤。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="233">
<li class="code-line" data-line="233">
<strong><code>git patch-id</code></strong>……根据提交差异内容计算标识符的 Git 命令；即使提交 ID 改变，只要差异相同，计算值就相同</li>
</ul>
</div></aside>

<a id="1.-%E3%81%99%E3%81%B9%E3%81%A6%E3%81%AEpr%E3%82%92%E7%8B%AC%E7%AB%8B%E3%81%AB%E6%A4%9C%E8%A8%BC%E3%81%99%E3%82%8B"></a>


#### 1. 独立验证每个 PR

每个 PR 分配一位子 Agent，让其在实际界面或命令中比较父分支与该 PR 的最新提交。结果为 `PASS`、`PASS+NOTES`（通过但附有备注）或 `FAIL`。

<a id="2.-%E3%83%AB%E3%83%BC%E3%83%88%E3%81%8B%E3%82%89%E7%B6%9A%E3%81%8F%E3%80%81%E9%80%A3%E7%B6%9A%E3%81%97%E3%81%9F%E6%A4%9C%E8%A8%BC%E6%B8%88%E3%81%BF%E3%81%AE%E7%AF%84%E5%9B%B2%E3%81%A0%E3%81%91%E3%82%92%E5%8F%96%E3%82%8A%E8%BE%BC%E3%82%80"></a>


#### 2. 只并入从根部开始连续且已验证的范围

步骤 2 的「连续范围」确定方式如下。

```
PR #4  PASS      ← 検証済みだが、下に未検証がある
PR #3  (未検証)  ← ここで連続が切れる
PR #2  PASS
PR #1  PASS      ← 最前線
main
```

因此，<strong>可以并入的只有 PR #1 和 #2</strong>。

要合并 PR #4，必须先验证作为前提、尚未验证的 PR #3，然后才能合并。若跳过 #3 的验证，未经验证的改动也会进入 trunk。

<a id="3.-%E5%88%A4%E5%AE%9A%E3%81%8C%E4%BB%8A%E3%82%82%E3%81%9D%E3%81%AE%E3%83%91%E3%83%83%E3%83%81%EF%BC%88%E5%A4%89%E6%9B%B4%E5%B7%AE%E5%88%86%EF%BC%89%E3%82%92%E8%A1%A8%E3%81%97%E3%81%A6%E3%81%84%E3%82%8B%E3%81%8B%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B"></a>


#### 3. 确认判定仍对应当前补丁（改动差异）

即使 rebase 改变了提交 ID（SHA），也可用 `git patch-id` 比较差异内容是否相同。若内容改变，则重新验证。

<a id="4.-%E6%9C%80%E5%89%8D%E7%B7%9A%E3%81%AEpr%E3%81%A0%E3%81%91%E3%82%92%E6%BA%96%E5%82%99%E3%81%97%E3%80%811%E3%81%A4%E3%81%9A%E3%81%A4%E3%83%9E%E3%83%BC%E3%82%B8%E3%81%99%E3%82%8B"></a>


#### 4. 只准备最前沿 PR，并逐个合并

准备是指必要时将最前沿 PR rebase 到最新 trunk，并把该 PR 的 base 改指 trunk。每合并一个，再准备下一个。

<a id="5.-%E3%83%9E%E3%83%BC%E3%82%B8%E3%81%AE%E3%81%9F%E3%81%B3%E3%81%AB%E8%A8%88%E7%AE%97%E3%81%97%E7%9B%B4%E3%81%97%E3%80%81%E6%9C%80%E5%89%8D%E7%B7%9A%E3%81%8C%E3%83%9E%E3%83%BC%E3%82%B8%E3%81%95%E3%82%8C%E3%82%8B%E3%81%BE%E3%81%A7%E7%8A%B6%E6%85%8B%E3%82%92%E7%9B%A3%E8%A6%96%E3%81%99%E3%82%8B"></a>


#### 5. 每次合并后重新计算，并监视最前沿直到完成合并

每合并一个 PR，就重新检查新最前沿 PR 的 base、检查结果及 patch-id。即便已预约自动合并，也不能将其视为整个 PR 栈安全的证据。

<a id="6.-%E4%B8%8A%E9%99%90%E3%81%A7%E6%AD%A2%E3%81%BE%E3%82%8B"></a>


#### 6. 到上限即停止

上限是已验证连续范围最上方的 PR（步骤 2 的示意图中是 PR #2）。合并到该处后，报告并入了什么、下一个尚未验证的 PR 是哪个，然后结束。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E3%80%8C%E3%82%B9%E3%82%BF%E3%83%83%E3%82%AF%E3%82%92%E5%8F%96%E3%82%8A%E8%BE%BC%E3%82%93%E3%81%A7%E3%80%8D%E3%81%A8%E9%A0%BC%E3%82%80"></a>


### 请求写法：说「并入整个 PR 栈」

这里再列一次本章开头的请求示例。

```
/poteto-mode land the stack.
// スタックを trunk に取り込んで。
```

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 总结

- <strong>三个 Playbook 如何衔接</strong>……「<strong>Opening a PR</strong>」创建 PR，「<strong>Babysit</strong>」使其可合并，「<strong>Shipping</strong>」将通过验证的 PR 并入 trunk（PR 合并目标所在的主线分支）。
- <strong>Opening a PR</strong>……创建范围小、提交顺序明确的 PR，并把正文写成简短的「情况简报」。打开 PR 后不启动「<strong>Babysit</strong>」。
- <strong>Babysit</strong>……先声明模式，再只关注最前沿，推进到 merge-ready。将 Bugbot 评论分为 fix、dismiss、ask。
- <strong>Shipping</strong>……将「安全」定义为未编写代码的 Agent 作出的判定，只逐个合并从根部开始连续且已验证的范围。
- <strong>Babysit 与 Shipping 的区别</strong>……两者中只有收到明确合并请求的「<strong>Shipping</strong>」会合并 PR（「Autopilot-full」等[第 16 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5)的 Playbook 另有规则）。

下一章[第 15 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609)介绍四个 Playbook：在人离开期间继续推进一项长期工作、暂停、恢复及清理。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](17-chapter.md) · [下一篇](19-chapter.md) · [English](../en/18-chapter.md)
