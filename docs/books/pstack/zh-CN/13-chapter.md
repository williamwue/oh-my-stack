# 第三部分：用 Playbook 推进工作

[目录](README.md) · [上一篇](12-chapter.md) · [下一篇](14-chapter.md) · [English](../en/13-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/72f8ee) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/0d1535)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
第三部分全面介绍 pstack 的全部 23 个 Playbook。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="3">这一部分可以跳读。我建议只阅读自己感兴趣的章节。</p>
<p class="code-line" data-line="5">各 Playbook 的原文随时可在<a href="https://github.com/cursor/plugins/tree/main/pstack" rel="nofollow noopener noreferrer" target="_blank">pstack</a> 仓库中阅读。pstack 更新频繁；需要时再查阅相应章节和原文件，比预先读完全部内容更可靠。</p>
</div></aside>

<a id="%E7%AC%AC3%E9%83%A8%E3%81%A7%E5%88%86%E3%81%8B%E3%82%8B%E3%81%93%E3%81%A8"></a>


## 第三部分将介绍什么

- 各 Playbook 适用于什么请求（例如：「[<strong>Bug fix</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md)」适用于写着「先复现问题」的请求）
- 各 Playbook 的步骤及每一步的要求（例如：「[<strong>Hillclimb</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/hillclimb.md)」反复执行「一次改动、一次测量、保留或撤销」）
- 与相似 Playbook 的区别（例如：只想查明原因时用「[<strong>Runtime forensics</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/runtime-forensics.md)」，需要修复时用「Bug fix」）

Playbook 是将熟练工程师自然遵循的工作步骤整理成固定形式的操作说明。

例如，修复缺陷的顺序是「复现→确定原因→修复→在同一位置确认」。步骤明确后，无论由哪个 Agent 负责，都能按相同顺序推进工作。

Playbook 是 [`/poteto-mode`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md) 中的参考文件，用户不会直接调用它们。即便如此，了解其内容仍能<strong>知道该在请求中使用什么措辞</strong>。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="21">本书介绍的请求示例，仅取自 pstack 原文（<a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/README.md" rel="nofollow noopener noreferrer" target="_blank">随附指南</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/README.md" rel="nofollow noopener noreferrer" target="_blank">README</a>以及 poteto 的 X 帖文）中已有的例子。原文没有请求示例的 Playbook（Runtime forensics、Trace forensics、Hillclimb、Pause safely），本书也不提供请求示例。其中，Hillclimb 只说明随附指南中写明的「请求应提供的内容」。</p>
</div></aside>

<a id="%E3%81%93%E3%81%AE%E9%83%A8%E3%81%AE%E7%AB%A0"></a>


## 本部分的章节

<table class="code-line" data-line="26">
<thead class="code-line" data-line="26">
<tr class="code-line" data-line="26">
<th>章</th>
<th>作用</th>
<th>涵盖的 Playbook</th>
</tr>
</thead>
<tbody class="code-line" data-line="28">
<tr class="code-line" data-line="28">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ea525d" target="_blank">第 10 章 调查和复现问题</a></td>
<td>调查并给出答案或诊断；不修改代码</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/investigation.md" rel="nofollow noopener noreferrer" target="_blank">Investigation</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/runtime-forensics.md" rel="nofollow noopener noreferrer" target="_blank">Runtime forensics</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/trace-forensics.md" rel="nofollow noopener noreferrer" target="_blank">Trace forensics</a>
</td>
</tr>
<tr class="code-line" data-line="29">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6fcb42" target="_blank">第 11 章 修复缺陷并改善性能</a></td>
<td>依据运行时证据修复缺陷和性能问题</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md" rel="nofollow noopener noreferrer" target="_blank">Bug fix</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/perf-issue.md" rel="nofollow noopener noreferrer" target="_blank">Perf issue</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/hillclimb.md" rel="nofollow noopener noreferrer" target="_blank">Hillclimb</a>
</td>
</tr>
<tr class="code-line" data-line="30">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f1e85b" target="_blank">第 12 章 重做功能、结构与外观</a></td>
<td>添加功能、保持行为并调整结构、通过尝试作决定，以及统一外观</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/feature.md" rel="nofollow noopener noreferrer" target="_blank">Feature</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/refactoring.md" rel="nofollow noopener noreferrer" target="_blank">Refactoring</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/prototype.md" rel="nofollow noopener noreferrer" target="_blank">Prototype</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/visual-parity.md" rel="nofollow noopener noreferrer" target="_blank">Visual parity</a>
</td>
</tr>
<tr class="code-line" data-line="31">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8263c0" target="_blank">第 13 章 编写并评估 Skill</a></td>
<td>编写决定 Agent 工作方式的 Skill，并衡量其效果</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md" rel="nofollow noopener noreferrer" target="_blank">Authoring or modifying a skill</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md" rel="nofollow noopener noreferrer" target="_blank">Eval</a>
</td>
</tr>
<tr class="code-line" data-line="32">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e" target="_blank">第 14 章 创建 PR 并将变更交付生产环境</a></td>
<td>创建 PR，使其达到 merge-ready 状态，并将已验证的部分并入生产环境</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md" rel="nofollow noopener noreferrer" target="_blank">Opening a PR</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md" rel="nofollow noopener noreferrer" target="_blank">Babysit</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/shipping.md" rel="nofollow noopener noreferrer" target="_blank">Shipping</a>
</td>
</tr>
<tr class="code-line" data-line="33">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609" target="_blank">第 15 章 将长期工作交给 Agent</a></td>
<td>持续推进一项长期工作，在暂停后恢复，并进行清理</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autonomous-run.md" rel="nofollow noopener noreferrer" target="_blank">Autonomous run</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/pause-safely.md" rel="nofollow noopener noreferrer" target="_blank">Pause safely</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/session-pickup.md" rel="nofollow noopener noreferrer" target="_blank">Session pickup</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md" rel="nofollow noopener noreferrer" target="_blank">Worktree and simulator cleanup</a>
</td>
</tr>
<tr class="code-line" data-line="34">
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5" target="_blank">第 16 章 规划多个 PR 并由多个 Agent 执行</a></td>
<td>规划跨越多个 PR 的工作，并由多个 Agent 执行</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md" rel="nofollow noopener noreferrer" target="_blank">Multi-phase or multi-PR plan</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/orchestrate.md" rel="nofollow noopener noreferrer" target="_blank">Orchestrate</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-full.md" rel="nofollow noopener noreferrer" target="_blank">Autopilot-full</a>、<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-stack.md" rel="nofollow noopener noreferrer" target="_blank">Autopilot-stack</a>
</td>
</tr>
</tbody>
</table>

[第 10 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ea525d)至[第 12 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f1e85b)，依次对应调查、修复、构建这一项变更的流程。[第 13 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8263c0)介绍改进 Agent 工作方式的 Playbook；[第 14 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e)介绍将变更交付生产环境的 Playbook；[第 15 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609)与[第 16 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5)介绍长期工作和多个 Agent 协作时使用的 Playbook。

<a id="%E5%85%A8playbook%E3%81%AE%E6%97%A9%E8%A6%8B%E8%A1%A8"></a>


## 全部 Playbook 速查表

<table class="code-line" data-line="40">
<thead class="code-line" data-line="40">
<tr class="code-line" data-line="40">
<th>Playbook</th>
<th>概要</th>
<th>使用场景</th>
<th>详解</th>
</tr>
</thead>
<tbody class="code-line" data-line="42">
<tr class="code-line" data-line="42">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/investigation.md" rel="nofollow noopener noreferrer" target="_blank">Investigation</a></td>
<td>阅读源代码和变更历史来回答问题，并给出附有引用的解释或建议</td>
<td>用户提出能通过阅读代码或历史回答的问题，例如「X 如何运作」「Y 为什么这样设计」时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ea525d" target="_blank">第 10 章</a></td>
</tr>
<tr class="code-line" data-line="43">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/runtime-forensics.md" rel="nofollow noopener noreferrer" target="_blank">Runtime forensics</a></td>
<td>测量正在运行的进程，诊断运行时症状的原因，只给出诊断而不修复</td>
<td>内存泄漏、空闲时 CPU 空转等症状仍在发生，且 Agent 能测量运行中的进程时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ea525d" target="_blank">第 10 章</a></td>
</tr>
<tr class="code-line" data-line="44">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/trace-forensics.md" rel="nofollow noopener noreferrer" target="_blank">Trace forensics</a></td>
<td>读取事后提供的性能分析文件或转储，无需重新运行程序，并诊断原因</td>
<td>只有在用户环境中取得的 cpuprofile、trace、spindump、heap snapshot 等成果物时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ea525d" target="_blank">第 10 章</a></td>
</tr>
<tr class="code-line" data-line="45">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md" rel="nofollow noopener noreferrer" target="_blank">Bug fix</a></td>
<td>复现报告的缺陷，找出根本原因，并用运行时证据确认确有必要的最小改动修复</td>
<td>Agent 要修复用户收到的结果本身有误的缺陷时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6fcb42" target="_blank">第 11 章</a></td>
</tr>
<tr class="code-line" data-line="46">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/perf-issue.md" rel="nofollow noopener noreferrer" target="_blank">Perf issue</a></td>
<td>取得实际测量所得的慢速执行轨迹，与基线比较并改善性能</td>
<td>行为正确但处理缓慢，用户希望通过一次修复改善性能时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6fcb42" target="_blank">第 11 章</a></td>
</tr>
<tr class="code-line" data-line="47">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/hillclimb.md" rel="nofollow noopener noreferrer" target="_blank">Hillclimb</a></td>
<td>反复执行「一次改动、一次测量、保留或撤销」，使一项指标改善到目标值</td>
<td>用户希望反复改善一项指标，直到达到目标，而非只修复一次时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6fcb42" target="_blank">第 11 章</a></td>
</tr>
<tr class="code-line" data-line="48">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/feature.md" rel="nofollow noopener noreferrer" target="_blank">Feature</a></td>
<td>先确定所处理数据的形态，再实现新的行为或修改现有行为</td>
<td>用户请求添加功能或修改现有行为时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f1e85b" target="_blank">第 12 章</a></td>
</tr>
<tr class="code-line" data-line="49">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/refactoring.md" rel="nofollow noopener noreferrer" target="_blank">Refactoring</a></td>
<td>保持现有行为，通过重命名、提取、去重、移动等方式改变代码结构</td>
<td>用户只想改变代码结构而不改变行为时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f1e85b" target="_blank">第 12 章</a></td>
</tr>
<tr class="code-line" data-line="50">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/prototype.md" rel="nofollow noopener noreferrer" target="_blank">Prototype</a></td>
<td>制作可丢弃的原型，根据观察结果作出设计决定</td>
<td>希望通过实际制作和观察，以较低成本决定布局或行为等设计问题，而不询问他人时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f1e85b" target="_blank">第 12 章</a></td>
</tr>
<tr class="code-line" data-line="51">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/visual-parity.md" rel="nofollow noopener noreferrer" target="_blank">Visual parity</a></td>
<td>以基线外观为规格，逐像素调整 UI，直到图像差异为零</td>
<td>需要让两种实现的外观一致，或迁移样式系统时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f1e85b" target="_blank">第 12 章</a></td>
</tr>
<tr class="code-line" data-line="52">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md" rel="nofollow noopener noreferrer" target="_blank">Authoring or modifying a skill</a></td>
<td>按规定步骤编写 <code>SKILL.md</code>，只保留会改变工作中判断的指令</td>
<td>用户或 Agent 新建或修改 <code>SKILL.md</code> 时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8263c0" target="_blank">第 13 章</a></td>
</tr>
<tr class="code-line" data-line="53">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md" rel="nofollow noopener noreferrer" target="_blank">Eval</a></td>
<td>在采用之前，采用盲测衡量 Skill、结构或提示词变更对 Agent 行为的影响</td>
<td>用户或 Agent 想在采用 Skill 或提示词变更前确认其效果时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8263c0" target="_blank">第 13 章</a></td>
</tr>
<tr class="code-line" data-line="54">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md" rel="nofollow noopener noreferrer" target="_blank">Opening a PR</a></td>
<td>使用小而有序的提交、Conventional Commits 格式的标题及 Briefing 格式的正文，创建可立即审阅的 PR</td>
<td>Agent 在其他 Playbook 工作结束时将变更整理成 PR 时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e" target="_blank">第 14 章</a></td>
</tr>
<tr class="code-line" data-line="55">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md" rel="nofollow noopener noreferrer" target="_blank">Babysit</a></td>
<td>解决冲突、审阅讨论和 CI 失败，使 PR 或 PR 栈达到 merge-ready 状态</td>
<td>用户就 PR 状态提出请求，例如「让检查通过」或「关注 PR X 的情况」时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e" target="_blank">第 14 章</a></td>
</tr>
<tr class="code-line" data-line="56">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/shipping.md" rel="nofollow noopener noreferrer" target="_blank">Shipping</a></td>
<td>让未编写代码的 Agent 验证已通过 CI 的 PR 栈中的每个 PR，再从根部开始逐个合并连续且已验证的部分</td>
<td>用户请求将已通过 CI 的 PR 栈并入生产环境时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e" target="_blank">第 14 章</a></td>
</tr>
<tr class="code-line" data-line="57">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autonomous-run.md" rel="nofollow noopener noreferrer" target="_blank">Autonomous run</a></td>
<td>先确定完成条件，再持续推进长期任务，直到满足条件</td>
<td>用户要求将长期任务交给 Agent 做到完成，例如「一直运行到完成」或「用 /loop 运行到 X」时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609" target="_blank">第 15 章</a></td>
</tr>
<tr class="code-line" data-line="58">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/pause-safely.md" rel="nofollow noopener noreferrer" target="_blank">Pause safely</a></td>
<td>在安全的节点暂停工作，留下让毫无背景的 Agent 也能据此恢复的记录</td>
<td>用户明确要求停止、用户离线、Cursor 重启，或对话即将压缩时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609" target="_blank">第 15 章</a></td>
</tr>
<tr class="code-line" data-line="59">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/session-pickup.md" rel="nofollow noopener noreferrer" target="_blank">Session pickup</a></td>
<td>阅读前一位 Agent 的对话记录、Cloud Agents URL 或已推送的分支，从已完成工作的末尾恢复</td>
<td>用户要求恢复或接手前一位 Agent 尚未完成的工作时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609" target="_blank">第 15 章</a></td>
</tr>
<tr class="code-line" data-line="60">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md" rel="nofollow noopener noreferrer" target="_blank">Worktree and simulator cleanup</a></td>
<td>确认无人使用后，删除已合并或废弃的 git worktree 和旧 iOS 模拟器，释放磁盘空间</td>
<td>用户询问磁盘空间被什么占用，或要求清理 worktree 或模拟器时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609" target="_blank">第 15 章</a></td>
</tr>
<tr class="code-line" data-line="61">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md" rel="nofollow noopener noreferrer" target="_blank">Multi-phase or multi-PR plan</a></td>
<td>不编写代码，产出清单式计划文档，连每个 PR 的验证方式也事先确定</td>
<td>Agent 开始跨多个阶段或多个堆叠 PR 的工作之前，先制定计划时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5" target="_blank">第 16 章</a></td>
</tr>
<tr class="code-line" data-line="62">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/orchestrate.md" rel="nofollow noopener noreferrer" target="_blank">Orchestrate</a></td>
<td>将持续数日、涉及大量 PR 和子 Agent 的项目管理，交给一位不编写代码的协调 Agent</td>
<td>用户将一个超出单个 Agent 可运行时长的项目交给一个对话来处理时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5" target="_blank">第 16 章</a></td>
</tr>
<tr class="code-line" data-line="63">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-full.md" rel="nofollow noopener noreferrer" target="_blank">Autopilot-full</a></td>
<td>将相互独立的 PR 队列分别交给各自负责人；通过协调 Agent 验证后，无需操作员复核便逐个合并</td>
<td>操作员委派一组相互独立的 PR，并能够授予 Agent 合并权限时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5" target="_blank">第 16 章</a></td>
</tr>
<tr class="code-line" data-line="64">
<td><a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-stack.md" rel="nofollow noopener noreferrer" target="_blank">Autopilot-stack</a></td>
<td>按与 Autopilot-full 相同的步骤创建并验证 PR，但不合并，而是作为一个 PR 栈交给操作员</td>
<td>操作员想在合并前审阅、变更之间存在依赖，或无法授予 Agent 合并权限时</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5" target="_blank">第 16 章</a></td>
</tr>
</tbody>
</table>
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](12-chapter.md) · [下一篇](14-chapter.md) · [English](../en/13-chapter.md)
