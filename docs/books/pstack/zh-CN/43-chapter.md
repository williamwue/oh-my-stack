# 第 36 章：指南一，从验证 Skill 开始，运行并检查自己的应用

[目录](README.md) · [上一篇](42-chapter.md) · [下一篇](44-chapter.md) · [English](../en/43-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/c9901e)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
poteto 在《The Complete Guide to pstack》[Part 1](https://x.com/poteto/status/2094457600259842065)（本章称「文章」）中，把<strong>验证 Skill 列为 pstack 新用户首先应制作的东西</strong>。

<strong>验证 Skill</strong>（verification skill）是项目专用的 Skill，让 Agent 启动并操作用户开发的应用，确认改动确实有效并留下证据（见[第 26 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca)）。

例如，改动设置页面后，Agent 应亲自点击齿轮按钮打开设置页面，留下改动位置的截图作为证据。

本章结合 `/create-verification-skill` 的 `SKILL.md` 等 pstack 原文，介绍文章推荐的验证 Skill 制作与使用方法。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="9"><code>/create-verification-skill</code> 和 <code>/maintain-verification-skill</code> 的 <code>SKILL.md</code> 所规定的步骤，已在<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca" target="_blank">第 26 章</a>介绍。</p>
<p class="code-line" data-line="11">本章省略以下内容，重点介绍文章提出的建议。</p>
<ul class="code-line" data-line="13">
<li class="code-line" data-line="13">
<strong>制作前调查</strong>……询问用户之前，Agent 先从仓库调查用户操作的对象、启动和操作方式、可保留的证据，以及能否并排运行两个应用实例。</li>
<li class="code-line" data-line="14">
<strong><code>SKILL.md</code> 的内容</strong>……Agent 根据调查所得事实，编写启动、诊断、操作、证据、清理和辅助脚本六个小节。证据应来自实际操作用户路径，并验证写入文件等副作用，而不只看界面。</li>
<li class="code-line" data-line="15">
<strong>交付前运行</strong>……Agent 应将生成的验证 Skill 从启动到清理完整运行一次，确认能用后再交给用户。一次都未运行的视为草稿。</li>
<li class="code-line" data-line="16">
<strong>检查所有入口</strong>……如果 <strong>Feature Map</strong> 为一项功能列出按钮、快捷键、命令等多个入口，Agent 必须验证所有入口后才能宣称该功能已验证。</li>
<li class="code-line" data-line="17">
<strong>维护规则</strong>……运行 <code>/maintain-verification-skill</code> 后，Agent 应以 clean（无需修改）、changed（将修改汇总到一个 PR）或 blocked（未能完成检查）之一报告结果。维护期间不编辑产品代码。</li>
</ul>
</div></aside>

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章结构如下。

- 为什么应首先制作验证 Skill
- 验证 Skill 由什么组成
- 如何制作和维护验证 Skill
- 如何在请求中使用并扩展制作好的验证 Skill
- 第一步应从哪里着手
- 总结

<a id="%E3%81%AA%E3%81%9C%E6%A4%9C%E8%A8%BC%E3%82%B9%E3%82%AD%E3%83%AB%E3%82%92%E6%9C%80%E5%88%9D%E3%81%AB%E4%BD%9C%E3%82%8B%E3%81%AE%E3%81%8B"></a>


## 为什么应首先制作验证 Skill

首先制作验证 Skill 有两个原因。

第一，验证 Skill 是<strong>提升整个团队成果的重要基础设施</strong>。  
第二，许多 pstack Playbook 的步骤，若没有<strong>实际操作应用的手段</strong>，就无法执行。

<a id="%E8%A8%98%E4%BA%8B%E3%81%AE%E4%BD%8D%E7%BD%AE%E3%81%A5%E3%81%91%EF%BC%9A%E9%87%8D%E8%A6%81%E3%81%AA%E3%82%A4%E3%83%B3%E3%83%95%E3%83%A9"></a>


### 文章的定位：重要基础设施

文章的「Verification is all you need」一节以以下一句话开头。

> The most critical skill to have in your toolbox is a high quality verification skill.
>
> 工具箱中最关键的是高质量的验证 Skill。

文章所说的验证（verification），是指<strong>Agent 能亲自检查自己的工作</strong>。

也就是说，<strong>验证并非「写了代码」或「构建通过」，而是像真实用户一样操作实际应用，并保留结果证据</strong>。

能验证自身工作的 Agent，在失败后可以修复并重试，直到成功。人无须逐项确认，也就不会成为工作流程的瓶颈。

文章认为，准备并持续维护高质量验证 Skill 很重要，应把它看作重要基础设施，而非「普通 Skill」；本书也采用这一看法。

文章接着指出，<strong>高质量的验证 Skill 能提升包括非工程师在内的整个团队的成果</strong>。

<strong>如果 Agent 能亲自验证改动是否有效，组织里的所有人，包括非工程师，都能修改应用并确认改动实际可用</strong>。文章称，制作得当的验证 Skill 可使团队成果提高 100～1,000 倍；因此可以说每个应用都应配备一个。

<a id="playbook%E3%81%AE%E5%89%8D%E6%8F%90%EF%BC%9A%E3%82%A2%E3%83%97%E3%83%AA%E3%82%92%E6%93%8D%E4%BD%9C%E3%81%99%E3%82%8B%E6%89%8B%E6%AE%B5"></a>


### Playbook 的前提：操作应用的手段

许多 Playbook 要求 Agent <strong>实际操作用户接触的界面、CLI 或 API</strong>。

此时可使用 control 类 Skill：例如 `cursor-team-kit` 插件的 `control-ui`、`control-cli`，它们是操作应用的 Skill（见[第 8 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/096f3d)）。通过 [`/create-verification-skill`](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md) 创建的验证 Skill 也属于 control 类 Skill。

下表概括主要 Playbook 要求 Agent 对应用执行哪些操作。

<table class="code-line" data-line="66">
<thead class="code-line" data-line="66">
<tr class="code-line" data-line="66">
<th>Playbook</th>
<th>要求 Agent 执行的应用操作</th>
</tr>
</thead>
<tbody class="code-line" data-line="68">
<tr class="code-line" data-line="68">
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Bug fix</strong></a>」（缺陷修复）</td>
<td>Agent 亲自复现缺陷</td>
</tr>
<tr class="code-line" data-line="69">
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/perf-issue.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Perf issue</strong></a>」（性能问题修复）</td>
<td>取得修复前的基准 trace</td>
</tr>
<tr class="code-line" data-line="70">
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/runtime-forensics.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Runtime forensics</strong></a>」（运行中进程的诊断）</td>
<td>从运行中的进程实际取得 profile 或 trace，而非靠推测</td>
</tr>
<tr class="code-line" data-line="71">
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/prototype.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Prototype</strong></a>」（用一次性原型决定设计）</td>
<td>决定视觉设计时，分别截图并操作各方案，进行比较</td>
</tr>
<tr class="code-line" data-line="72">
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/visual-parity.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Visual parity</strong></a>」（使两种实现或迁移前后的外观逐像素一致）</td>
<td>逐组件比较与迁移前基准画面的图片差异；差异不为零即失败</td>
</tr>
<tr class="code-line" data-line="73">
<td>「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/shipping.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Shipping</strong></a>」（验证并合并 PR）</td>
<td>对每个 PR，由未编写代码的另一 Agent 实际操作改动前后的界面或 CLI，给出 <code>PASS</code>、<code>PASS+NOTES</code> 或 <code>FAIL</code> 三档判定</td>
</tr>
</tbody>
</table>

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="76">
<li class="code-line" data-line="76">
<strong>trace</strong>……按时间记录各项处理的耗时等信息。</li>
<li class="code-line" data-line="77">
<strong>profile</strong>……按函数等维度汇总 CPU 时间或内存用量的记录。</li>
</ul>
</div></aside>

没有验证 Skill 或 control 类 Skill 等操作应用的手段，Agent 就无法执行表中的步骤。

Agent 开始工作时，会制作一份照 Playbook 步骤编写的 TODO 列表；跳过某一步时，应在该行记下 `skip: <理由>`（见[第 7 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)）。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="85"><strong>TODO 列表</strong>……Agent 开始工作时制作的任务清单（计划），在 Cursor 的聊天界面显示。用户可查看清单，确认 Agent 完成了哪些步骤、跳过了哪些步骤（<code>skip: &lt;理由&gt;</code>）（随附指南 <a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md" rel="nofollow noopener noreferrer" target="_blank"><code>01-setup.md</code></a>）。</p>
</div></aside>

例如在「<strong>Bug fix</strong>」中，如果没有操作手段，或手段无法到达需要复现的位置，本书认为 Agent 只有以下两种选择。

- 在 TODO 列表留下 `skip: <理由>` 并跳过该步骤
- 根据「<strong>Bug fix</strong>」允许的例外，请用户复现

只有同时满足以下两个条件，才能请用户复现。

- 具体说明为什么现有操作手段无法到达需复现的位置（例如，该页面仅特定订阅账户可登录）
- Agent 已亲自操作所有现有手段能够到达的部分

无论跳过步骤还是请用户复现，都会留下 Agent 无法亲自验证的部分；这些部分须由人验证。

<a id="%E6%A4%9C%E8%A8%BC%E3%82%B9%E3%82%AD%E3%83%AB%E3%81%AF%E4%BD%95%E3%81%A7%E3%81%A7%E3%81%8D%E3%81%A6%E3%81%84%E3%82%8B%E3%81%AE%E3%81%8B"></a>


## 验证 Skill 由什么组成

验证 Skill 的核心有两部分：<strong>用于操作应用的小型 CLI，以及按功能记录入口和访问方式（功能位于哪个页面或命令、用户怎样操作才能到达）的 Feature Map</strong>。

在本书所依据的 pstack `0.15.5` 版本中，Agent 按 `/create-verification-skill` 的步骤，将两者都创建在 `.cursor/skills/verify-<app>/` 下。

若以文章举例的虚构应用 Atlas 为例，完成后结构如下。

```
.cursor/skills/verify-atlas/
├─ SKILL.md（从启动到清理的步骤）
├─ control-atlas.mjs（操作应用的 CLI）
└─ features/（Feature Map）
   ├─ README.md（Feature Map 目录，链接到各功能文件）
   ├─ <功能A>.md
   └─ <功能B>.md
```

`SKILL.md` 的内容已在[第 26 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca)介绍；这里重点看文章详细讨论的 <strong>CLI</strong> 和 <strong>Feature Map</strong>。

<a id="cli"></a>


### CLI

验证 Skill 的 CLI 将应用操作和调试变成 Agent 可以<strong>重复执行的命令</strong>。

<a id="%E5%8E%9F%E5%89%87%E3%80%8Ebuild-the-lever%E3%80%8F%E3%81%AE%E5%BF%9C%E7%94%A8"></a>


#### 「Build the Lever」原则的应用

文章把<strong>将应用操作做成 CLI</strong> 视为「[<strong>Build the Lever</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-build-the-lever/SKILL.md)」（见[第 17 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b)）的应用：<strong>制作执行工作的工具，代替手工操作</strong>。

制作 Skill 时应用这条 Principle，就会同时交给 Agent 可执行的工具，而非只有 Markdown 步骤说明。

> What this means in the context of creating a skill, is that we prefer to give agents tools rather than just markdown.
>
> 在制作 Skill 时，这意味着我们倾向于提供工具，而不只是 Markdown。

例如，如果验证 Skill 的 `SKILL.md` 只写「点击设置按钮并截图」，Agent 每次都得自己编写点击脚本。

若验证 Skill 附带拥有 `click`、`screenshot` 等命令的 CLI，Agent 就只需执行命令。这里的工具，正是汇集应用操作与调试功能的小型 CLI。

文章列出把应用操作做成 CLI 的以下好处。

- <strong>减少 token 消耗</strong>……Agent 无须为单次按钮点击编写一次性脚本，只需运行一条 CLI 命令。
- <strong>易于复现和测试</strong>……验证 Skill 每次运行都得到相同结果；命令形式固定，也便于测试 Skill 本身是否正常工作。

<a id="%E4%BE%8B%EF%BC%89%E6%9E%B6%E7%A9%BA%E3%81%AE%E3%82%A2%E3%83%97%E3%83%AA-atlas-%E3%81%AE%E3%82%B3%E3%83%9E%E3%83%B3%E3%83%89"></a>


#### 示例：虚构应用 Atlas 的命令

以下是文章给虚构应用 Atlas 的部分命令示例。设定中，Atlas 是以 Electron（构建桌面应用的框架）开发的应用。

Agent 按顺序执行以下命令，完成三件事。

1. 用 `doctor` 确认应用可操作
2. 用 `new-session` 打开空白新对话（线程），再用 `send` 发送「list open tasks in this project」（列出本项目未完成的任务）
3. 用 `screenshot` 将结果画面保存到 `/tmp/atlas-proof.png` 作为证据

```
# health
node .cursor/skills/verify-atlas/control-atlas.mjs doctor

# open a blank thread and send
node .cursor/skills/verify-atlas/control-atlas.mjs new-session
node .cursor/skills/verify-atlas/control-atlas.mjs send "list open tasks in this project"

# screenshot for evidence
node .cursor/skills/verify-atlas/control-atlas.mjs screenshot /tmp/atlas-proof.png
```

<a id="%E3%82%B3%E3%83%9E%E3%83%B3%E3%83%89%E3%81%AE6%E3%81%A4%E3%81%AE%E5%88%86%E9%A1%9E"></a>


#### 六类命令

准备命令时，可参考以下六类。

- <strong>观察（Inspection）</strong>……`info`、`snapshot`、`screenshot` 等查看界面状态的命令。
- <strong>导航（Navigation）</strong>……`home`、`new-session`、`scroll` 等切换界面的命令。
- <strong>交互（Interaction）</strong>……`send`、`click`、`type`、`press` 等输入或点击命令。
- <strong>性能（Performance）</strong>……`trace`、`profile`、`perf-metrics` 等测量性能的命令。
- <strong>获取记录（Streaming）</strong>……`console`、`network-log` 等获取控制台或通信记录的命令。
- <strong>诊断与清理（Health & cleanup）</strong>……`doctor`、`cleanup` 等确认应用是否可操作或执行清理的命令。

<a id="%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%8C%E6%89%B1%E3%81%84%E3%82%84%E3%81%99%E3%81%84cli"></a>


#### 便于 Agent 使用的 CLI

文章建议，在尝试更高级的用法前，先花时间把 CLI 做到无错误运行。<strong>CLI 做好后，所有 Agent 都能用它操作和调试应用</strong>。

CLI 的使用者是 Agent 而非人，因此应便于 Agent 使用。

文章列出以下六项便于 Agent 使用的 CLI 特性。

- 命令之间易于组合使用（文章引用 John Ousterhout《[A Philosophy of Software Design](https://web.stanford.edu/~ouster/cgi-bin/book.php)》中的 deep modules 思路，即简单接口封装丰富功能）
- 可能造成破坏性副作用的命令提供 `--dry-run`（只预示会发生什么，不实际执行）
- 不一次展示所有功能，而是通过子命令逐层展开；例如总览 `--help` 只列子命令，详细用法放在各子命令的 `--help` 中
- 错误信息写明下一步应做什么；例如不止说「应用未启动」，还说明「请先运行启动命令」
- 提供充分的 `--help` 信息
- 以 JSON 等机器可读格式输出

文章建议用户亲自设计，或请 Agent 设计这样的 CLI。

<a id="feature-map"></a>


### Feature Map

<strong>Feature Map</strong> 是一组按功能划分的 Markdown 文件，记录<strong>各功能的作用、用户怎样操作才能到达，以及验证 Skill 如何操作、出现什么结果才算正常</strong>（见[第 26 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca)）。

<strong>应用越复杂，Agent 越需要指引才能找到并操作功能</strong>。poteto 为此提出 Feature Map。

`features/README.md` 是 Feature Map 的目录，链接到各功能文件。

操作应用前，Agent 先读目录，只打开与当前工作有关的功能文件。

<strong>只读取必要文件，可以节省 Agent 上下文窗口的 token</strong>。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="206">文章称 <code>/create-verification-skill</code> 会创建 <code>references/features</code> 目录，而 pstack <code>0.15.5</code> 版的 <code>SKILL.md</code> 要求创建在 <code>.cursor/skills/verify-&lt;app&gt;/features/</code>；两者位置不同。本书采用 pstack <code>0.15.5</code> 版规定的位置。形式可参考随附的 <a href="https://github.com/cursor/plugins/tree/main/pstack/skills/create-verification-skill/references/feature-map-example" rel="nofollow noopener noreferrer" target="_blank"><code>references/feature-map-example/</code></a>。</p>
</div></aside>

Agent 按 `/create-verification-skill` 步骤，用以下四个标题编写每个功能文件。

<table class="code-line" data-line="211">
<thead class="code-line" data-line="211">
<tr class="code-line" data-line="211">
<th>标题</th>
<th>要回答的问题</th>
</tr>
</thead>
<tbody class="code-line" data-line="213">
<tr class="code-line" data-line="213">
<td><code>Sub-features</code></td>
<td>用户能在该功能中执行哪些操作（逐项分配简短 ID）</td>
</tr>
<tr class="code-line" data-line="214">
<td><code>How to get to it (user POV)</code></td>
<td>用户如何操作才能到达该功能</td>
</tr>
<tr class="code-line" data-line="215">
<td><code>Driving it with &lt;harness&gt;</code></td>
<td>如何使用 harness（从外部操作应用的机制，如验证 Skill 的 CLI）执行操作</td>
</tr>
<tr class="code-line" data-line="216">
<td><code>Gotchas</code></td>
<td>哪些陷阱会让验证白费或无效</td>
</tr>
</tbody>
</table>

下面用 `/create-verification-skill` 附带的示例 [`create-note.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/references/feature-map-example/create-note.md)（笔记应用 Notes 的「创建笔记」功能），逐行说明表格内容。

<a id="sub-features"></a>


#### `Sub-features`

示例将用户创建笔记时可执行的操作分为以下四项。

- 打开编辑界面
- 保存
- 丢弃草稿
- 通过 CLI 创建

```
## Sub-features

- `create-open` opens a blank editor from each browser entry point.
- `create-save` persists a title and body.
- `create-cancel` discards an unfinished browser draft.
- `create-cli` creates the same note shape from the terminal.
```

<a id="how-to-get-to-it-(user-pov)"></a>


#### `How to get to it (user POV)`

入口指用户到达功能的方式，包括按钮、键盘操作或命令。示例列出工具栏的 `New note` 按钮、`n` 键和 `notes create` 命令三个入口。

```
## How to get to it (user POV)

- Choose the `New note` button in the browser toolbar.
- Press `n` in the browser while focus is outside an editable field.
- Run `notes create --title <title> --body <body>` in a terminal.
```

<a id="driving-it-with-%3Charness%3E"></a>


#### `Driving it with <harness>`

示例的 `README.md` 规定，各功能文件中这一标题应按以下方式编写。

> `Driving it with <harness>` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
>
> `Driving it with <harness>` 应以 `Preconditions:` 开头，并使用带标签的列表，为每项用户操作配对准确命令和可观察结果。

前提条件（`Preconditions:`）指开始步骤前必须满足的状态。例如，示例要求「Notes 正常运行于 `http://127.0.0.1:4173`」「还没有标题为 `Release checklist` 的笔记」。

前提条件之后逐项列出步骤。根据规则，每项都应写齐以下三部分。

- 用户操作
- 用 harness 复现该操作的命令
- 能证明操作成功的可观察结果

```
- **Open editor.**
  Choose `New note`.
  Run `control-notes browser click --role button --name "New note"`.
  A form named `Note editor` appears with focus in the `Title` textbox.
```

将上例拆开，得到下表。

<table class="code-line" data-line="276">
<thead class="code-line" data-line="276">
<tr class="code-line" data-line="276">
<th>要素</th>
<th>示例写法</th>
<th>含义</th>
</tr>
</thead>
<tbody class="code-line" data-line="278">
<tr class="code-line" data-line="278">
<td>用户操作</td>
<td>Choose <code>New note</code>.</td>
<td>
选择 <code>New note</code> 按钮</td>
</tr>
<tr class="code-line" data-line="279">
<td>用 harness 复现的命令</td>
<td><code>control-notes browser click --role button --name "New note"</code></td>
<td>点击角色为按钮、名称为 <code>New note</code> 的控件</td>
</tr>
<tr class="code-line" data-line="280">
<td>可观察结果</td>
<td>A form named <code>Note editor</code> appears with focus in the <code>Title</code> textbox.</td>
<td>
名为 <code>Note editor</code> 的表单打开，光标进入 <code>Title</code> 输入框</td>
</tr>
</tbody>
</table>

Agent 运行命令后，检查是否出现表中的「可观察结果」；若没有，就知道这一步失败了。

<a id="gotchas"></a>


#### `Gotchas`

示例记录了以下陷阱。

```
- Pressing `n` while a textbox has focus types the character instead of opening a new editor.
- A save status alone is insufficient proof. Reopen the note from the list.
```

第一项是：输入框获得焦点时，按 `n` 不会打开编辑器，只会输入字符 `n`。

第二项是：仅出现「已保存」状态，不足以证明数值真的保存成功；应从列表重新打开笔记验证。

文章中的 Feature Map 示例（设置页面）也在 `Gotchas` 写了以下注意。这里的 tab 指设置页面左侧的切换项，如 General、Appearance、Models、Plan & Usage。

> Some tabs are entitlement-gated. Skip with an explicit account reason.
>
> 一些 tab 受账户权限限制。跳过时必须明确说明账户原因。

Feature Map 写明这一点后，Agent 找不到 Plan & Usage 时，就不会误判为功能故障；可以说明「账户订阅状态使该 tab 不显示」，再跳过该 tab 的验证。

<a id="%E3%83%81%E3%83%BC%E3%83%A0%E3%81%A7%E5%85%B1%E6%9C%89%E3%81%99%E3%82%8B%E8%A8%98%E6%86%B6"></a>


#### 团队共享的记忆

文章称 Feature Map 为「<strong>具象化的记忆（materialized memory）</strong>」（见[第 4 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141)）。

Agent 的记忆，是把过去工作获得的知识保留下来，供后续工作使用。

<strong>这种记忆的最终形态是代码库</strong>。代码呈现团队既有的判断，是实际发生过什么、系统现在怎样运行的权威来源。

Feature Map 将代码库承载的记忆精简整理，以节省 Agent 上下文窗口的 token。

此外，<strong>Feature Map 是仓库 `.cursor/skills/` 下验证 Skill 的 Markdown 文件，因此所有参与代码库工作的人都能共享这份记忆</strong>。

<a id="%E6%A4%9C%E8%A8%BC%E3%82%B9%E3%82%AD%E3%83%AB%E3%82%92%E3%81%A9%E3%81%86%E4%BD%9C%E3%82%8A%E3%80%81%E3%81%A9%E3%81%86%E4%BF%9D%E3%81%A4%E3%81%AE%E3%81%8B"></a>


## 如何制作并维护验证 Skill

具体制作步骤已在[第 26 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca)介绍：Agent 按 `/create-verification-skill` 执行。这里讨论文章给用户的建议，即制作前的准备及制作后的维护频率。

<a id="%E4%BD%9C%E3%82%8B%E5%89%8D%E3%81%AB%E3%80%81%E5%88%A9%E7%94%A8%E8%80%85%E3%81%8C%E6%95%B4%E3%81%88%E3%82%8B%E3%81%93%E3%81%A8"></a>


### 制作前用户应做好什么准备

<a id="%E6%8A%80%E8%A1%93%E3%82%B9%E3%82%BF%E3%83%83%E3%82%AF%E3%81%AE%E9%81%B8%E3%81%B3%E6%96%B9"></a>


#### 如何选择技术栈

文章指出，若要提供从外部操作应用的方式，技术栈的选择也很重要。<strong>技术栈越难调试或操作，就越难让 Agent 高效工作</strong>。

例如，对于 Electron（桌面应用框架）或 Web 应用，Agent 可以使用 CDP（Chrome DevTools Protocol，让外部程序使用浏览器开发者工具能力的机制）；对于 iOS 应用，则可以使用模拟器操作。

如果所选技术栈没有 Agent 可用的调试工具，就只能请 Agent 自行制作工具（例如使用 lldb，或在开发环境中制作与应用一同运行的专用包），或者将就使用现有工具。

但 poteto 非常重视 Agent 验证，因此建议自行构建调试工具，甚至换用其他技术栈。

> I personally feel that agentic verification is so important that I would unironically suggest building your own rich debugging tools, or even choosing a different tech stack
>
> 我个人觉得 Agent 验证极其重要，所以会认真建议自行打造丰富的调试工具，甚至选择另一种技术栈。

我个人也认为验证极其重要且有益，因此若所选技术栈没有验证工具，我会采纳 poteto 的建议。

<a id="%E9%96%8B%E7%99%BA%E4%BD%93%E9%A8%93%E3%81%AE%E6%BA%96%E5%82%99"></a>


#### 准备开发体验

文章建议用户在准备运行应用时，先思考以下三个与开发体验相关的问题。

- 如何在开发数据库中加入种子数据（预先放入以供开发和测试的数据）
- 如何准备认证与测试用户，以及如何调用测试或预发布环境的 API
- 如何按一致的步骤安装并启动开发环境

CLI 和上述准备都是 Agent 开发应用的主要工具，因此需要维护和测试。

准备就绪后，用户运行 `/create-verification-skill`。文章还推荐一个供参考的公开示例：[poteto/verification-skill-example](https://github.com/poteto/verification-skill-example)，它是为虚构应用制作的验证 Skill。

<a id="%2Fmaintain-verification-skill-%E3%81%A7%E6%9C%80%E6%96%B0%E3%81%AB%E4%BF%9D%E3%81%A4"></a>


### 用 `/maintain-verification-skill` 保持更新

维护结果的三种类型（clean、changed、blocked），以及维护时不编辑产品代码的规则，已在[第 26 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca)介绍。这里讨论文章建议的运行频率，以及如何将其机制化。

<a id="%E5%AE%9F%E8%A1%8C%E3%81%AE%E9%A0%BB%E5%BA%A6"></a>


#### 运行频率

`/maintain-verification-skill` 的 `SKILL.md` 没有规定运行频率。执行 `/create-verification-skill` 的 Agent，也只在用户询问时才建议频率。因此，本书认为<strong>用户应根据应用变化速度决定运行频率</strong>。

文章建议<strong>至少每天运行一次</strong>。

Agent 在开发应用时也可能更新验证 Skill，但经常会遗忘一些位置。

用户每天运行一次 `/maintain-verification-skill`，就能发现并修正遗漏更新的位置，使 Agent 持续掌握应用的最新操作方式。

<a id="dr-eggbot-%E3%81%A7%E6%AF%8E%E6%97%A5%E3%81%AE%E5%AE%9F%E8%A1%8C%E3%82%92%E4%BB%95%E7%B5%84%E3%81%BF%E3%81%AB%E3%81%99%E3%82%8B"></a>


#### 用 Dr Eggbot 把每日运行机制化

文章也介绍了 Dr Eggbot，作为实现每日运行的方式。

Dr Eggbot 是 poteto（Lauren Tan）制作的 Bot，用于设计并制作 Grok Bot（AI Bot 应用，见[第 5 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b6ac2d)）。xAI 的[Bot 市场](https://x.ai/bot/marketplace/bots/dr-eggbot-v2)将 Dr Eggbot 描述如下。

> Asks a few preference questions, then creates them with CreateAgent. Coding bots get the poteto-mode bar (one job, unslopped, verified).
>
> 先问几个偏好问题，再用 CreateAgent 制作 Bot。编程 Bot 会达到 poteto-mode 的标准（只做一项工作、去除 AI 腔、验证结果）。

<strong>Dr Eggbot 随 pstack 一起提供</strong>。  
因此，<strong>Dr Eggbot 能教编程 Bot 如何使用 pstack；不编程的 Bot 也能按同样严谨的标准制作</strong>。

推荐按以下步骤使用 Dr Eggbot。

1. 请 Dr Eggbot 制作工程师角色的 Bot
2. 请制作好的 Bot 运行 `/create-verification-skill`
3. 请同一个 Bot 设置每天运行一次 `/maintain-verification-skill` 的例行任务

<a id="%E4%BD%9C%E3%81%A3%E3%81%9F%E6%A4%9C%E8%A8%BC%E3%82%B9%E3%82%AD%E3%83%AB%E3%82%92%E4%BE%9D%E9%A0%BC%E3%81%A7%E3%81%A9%E3%81%86%E4%BD%BF%E3%81%84%E3%80%81%E3%81%A9%E3%81%86%E5%BA%83%E3%81%92%E3%82%8B%E3%81%AE%E3%81%8B"></a>


## 如何在请求中使用并扩展已制作的验证 Skill

<strong>用户应在给 Agent 的请求中写明使用哪种验证 Skill，以及采用什么证据形式</strong>。

用户应在满意于验证 Skill 之后，才将它加入 Grok Bot 的例行任务或 Cursor Automations（Cursor 中由固定时间或事件触发任务的功能），见本章[「用法 3：自动复现用户报告」](#%E4%BD%BF%E3%81%84%E6%96%B93%EF%BC%9A%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%81%AE%E5%A0%B1%E5%91%8A%E3%82%92%E8%87%AA%E5%8B%95%E3%81%A7%E5%86%8D%E7%8F%BE%E3%81%99%E3%82%8B)。

<a id="%E6%A4%9C%E8%A8%BC%E3%82%B9%E3%82%AD%E3%83%AB%E3%81%AE%E4%BD%BF%E3%81%84%E6%96%B9"></a>


### 验证 Skill 的用法

文章举出三种用法。下面示例中的 `/control-app`，是文章给通过 `/create-verification-skill` 制作的验证 Skill 所用的名称。

<a id="%E4%BD%BF%E3%81%84%E6%96%B91%EF%BC%9A%E6%96%B0%E3%81%97%E3%81%84%E6%A9%9F%E8%83%BD%E3%82%92%E4%BD%9C%E3%82%8B"></a>


#### 用法 1：制作新功能

制作新功能时，poteto 将 `/poteto-mode` 与验证 Skill 一同使用，让 Agent 验证自身改动。文章的请求示例如下。

```
/poteto-mode build <description of feature, any useful context>. use /control-app to verify your changes and show me a video and screenshots as proof
// 创建<功能说明和有用的上下文>，用 /control-app 验证改动，并展示视频和截图作为证据。
```

这个请求在功能说明之外，还明确了使用哪种验证 Skill（`/control-app`），以及证据形式（视频和截图）。

<strong>如果通过 Grok Bot 发出请求，poteto 不让 Bot 自己执行工作，而是让它启动 Cloud Agents（Cursor 在云端运行 Agent 的功能）来做</strong>。以下就是示例请求。

```
spawn a cloud agent to use /poteto-mode to build <description of feature, any useful context>. use /control-app to verify your changes and show me a video and screenshots as proof
// 启动云端 Agent，让它用 /poteto-mode 创建<功能说明和有用的上下文>；用 /control-app 验证改动，并展示视频和截图作为证据。
```

<strong>poteto 不让 Bot 亲自做，是因为将工作交给云端 Agent 后，Bot 可以继续处理其他工作，其上下文窗口也不会被执行记录填满</strong>。

<a id="%E4%BD%BF%E3%81%84%E6%96%B92%EF%BC%9A%E6%80%A7%E8%83%BD%E3%82%92%E6%94%B9%E5%96%84%E3%81%99%E3%82%8B"></a>


#### 用法 2：改善性能

改善性能时，poteto <strong>要求 Agent 先通过验证 Skill 测量改动前的性能，再用同一 Skill 验证改动效果</strong>。文章的请求示例如下。

```
spawn a cloud agent to use /poteto-mode to improve the initial loading time of our app. first use /control-app to take a trace of the status quo, and identify opportunities for improvement. then do a targeted fix and use /control-app + a /swarm to confirm the win
// 启动云端 Agent，让它通过 /poteto-mode 改善应用首次加载时间。先用 /control-app 采集现状追踪并寻找改进空间，再有针对性地修复，最后用 /control-app 和 /swarm 验证改进。
```

<strong>该请求明确要求修复前用 `/control-app` 取得现状 trace</strong>。「[<strong>Perf issue</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/perf-issue.md)」Playbook 也要求第一步取得改动前的基准 trace，并在报告中写出改动前后的数值及差异。

文章认为，<strong>让大量 Worker（并行运行的多个 Agent）工作并汇总成一份报告的 `/swarm`（见[第 24 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346)），是最适合与验证 Skill 搭配的 Skill 之一</strong>。

让大量 Cloud Agents 通过 `/swarm` 执行验证 Skill，可用充分样本验证性能改善，或通过 fuzzing（大量输入随机值或意外值，检查有无异常）验证应用未被破坏。

<a id="%E4%BD%BF%E3%81%84%E6%96%B93%EF%BC%9A%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%81%AE%E5%A0%B1%E5%91%8A%E3%82%92%E8%87%AA%E5%8B%95%E3%81%A7%E5%86%8D%E7%8F%BE%E3%81%99%E3%82%8B"></a>


#### 用法 3：自动复现用户报告

满意于验证 Skill 后，用户就可以把它加入 Grok Bot 例行任务或 Cursor Automations；两者都能按固定时间或事件触发处理。

文章的例子中，Bot 逐条接收来自 Slack 等渠道的用户反馈，启动云端 Agent，自动尝试复现报告的缺陷。

如果<strong>验证 Skill 和 Feature Map 足够好，甚至可以将缺陷修复也自动化</strong>。

<a id="%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%82%92%E4%B8%A6%E5%88%97%E3%81%AB%E5%8B%95%E3%81%8B%E3%81%99"></a>


### 并行运行 Agent

借助验证 Skill 成功合并几个 PR 后，下一步是让更多 Agent 并行工作。

如果 Agent 接到请求后能将工作推进到几乎可以合并，用户就能在此期间运行其他 Agent。

<a id="worktree-%E3%81%A7%E3%81%AF%E3%81%AA%E3%81%8F-cloud-agents-%E3%82%92%E4%BD%BF%E3%81%86"></a>


#### 使用 Cloud Agents，而非 worktree

文章推荐使用 Cloud Agents 并行，而非 worktree（Git 功能，可为同一仓库增加工作目录，见[第 18 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b)）；本书也持同样建议。

文章不推荐 worktree，是因为每个 Agent 都需要额外的工作目录，消耗本地机器的存储和资源。

根据仓库大小和机器性能，估计本地 worktree 并行最多可运行约十个 Agent。

依我自己的经验，本地并行还得为各 worktree 分开目录，避免应用端口冲突；创建后的管理和清理遗留 worktree 也费事。

Cloud Agents 则可使用云端实际计算机，安装依赖、运行应用、录制视频和截图，并像用户一样操作应用。

Cursor 在首次构建后保存环境快照（某一时间点的完整状态），后续 Cloud Agents 因此可迅速启动。每个 Agent 都运行于单独机器，应用实例（每个运行中的应用）也从一开始就相互隔离。

<span class="embed-block zenn-embedded zenn-embedded-tweet"><iframe data-content="https%3A%2F%2Fx.com%2Fpoteto%2Fstatus%2F2087977008253071816" frameborder="0" id="zenn-embedded__2c69b0432876e" scrolling="no" src="https://embed.zenn.studio/tweet#zenn-embedded__2c69b0432876e"></iframe></span><https://x.com/poteto/status/2087977008253071816>

poteto 也在 X 的帖子中说明采用 Cloud Agents 的原因。

> worktrees are dead. cloud agents are the future. they've allowed me to massively orchestrate swarms of agents, all with their own computer. it's how i've been able to trust that my agents are actually doing what i want them to, because they can run their code, take videos and screenshots, and interact with UIs the same way users do.
>
> worktree 的时代结束了；未来属于 Cloud Agents。它们让各有自己计算机的大规模 Agent 群成为可能。我之所以能够信任 Agent 确实按我的意图工作，是因为它们能运行代码、拍视频与截图，并像用户一样操作界面。

不过，Cloud Agents 也有注意事项。

Cloud Agents 自动运行命令，无须等待用户许可。即使命令输错，受损的也只是云端机器，而非本地电脑。

另一方面，仓库代码会传到云端机器，仍有被带到外部的风险。  
秘密信息（如 API 密钥）也面临同样风险。

[Cursor 文档](https://cursor.com/ja/docs/cloud-agent/security-network)也指出，prompt injection（在 Agent 阅读的内容中混入恶意指令）可能导致数据外泄：

> 自动执行存在数据外泄风险。攻击者可能通过 prompt injection 欺骗 Agent，把代码上传至恶意网站。

如果开发环境已准备妥当，设置云端环境便不太费事。

在 Cursor 中，可将开发环境的创建方式定义为代码（`.cursor/environment.json`，EAC: Environment as Code）并保存在仓库中。

把为验证 Skill 整理的开发环境启动步骤写入该文件，各 Cloud Agents 就能从同样环境开始工作。Cursor 在[博客](https://cursor.com/ja/blog/cloud-agent-environment)中这样描述：

> 开发环境本身也是产品，使用它的是 Agent。

顺带一提，Cloud Agents 在云端机器运行，即使用户合上电脑，工作也不会停。我自己也是 Cloud Agents 的重度用户。

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fzenn.dev%2Fsc30gsw%2Farticles%2F953334f11df507" frameborder="0" id="zenn-embedded__239ce58c4cada" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__239ce58c4cada"></iframe></span><https://zenn.dev/sc30gsw/articles/953334f11df507>

<a id="%E6%9C%80%E5%88%9D%E3%81%AE%E4%B8%80%E6%AD%A9%E3%81%A8%E3%81%97%E3%81%A6%E4%BD%95%E3%81%8B%E3%82%89%E6%89%8B%E3%82%92%E4%BB%98%E3%81%91%E3%82%8C%E3%81%B0%E3%82%88%E3%81%84%E3%81%8B"></a>


## 第一步应从哪里着手

第一步是用户确认，<strong>Agent 是否拥有从外部操作和观察自己应用的手段</strong>。

本书按照文章脉络，将包括 `/create-verification-skill` 和 `/maintain-verification-skill` 在内的用户步骤整理如下。

1. 检查能否从外部操作和观察应用（现有 harness、CDP、模拟器或自制工具）
2. 确保开发环境可按一致步骤启动（种子数据、测试用户、测试环境和隔离）
3. 运行 `/create-verification-skill`，让 Agent 生成 CLI 与 Feature Map
4. 将生成成果从头到尾运行一次，确认留下证据；修复 CLI 使其无错误运行
5. 决定 `/maintain-verification-skill` 的运行频率
6. 在日常请求中写明验证 Skill 名称和证据形式
7. 先用验证 Skill 成功合并几个 PR，并对 Skill 感到满意，再扩展至 Cloud Agents 并行、例行任务和自动化

文章最后还建议持续改进 CLI、像投资重要基础设施一样投资验证 Skill，甚至设置轮值（oncall rotation，即轮流指定验证 Skill 损坏时的处理负责人）。

我建议让 Grok Bot 承担这项轮值。  
设想是让 Grok Bot 持续审计，再把实际工作交给 Cloud Agents。

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 总结

- <strong>为何首先制作</strong>……文章将验证 Skill 视为应用开发最重要的 Skill，pstack 的许多 Playbook 也以能够操作应用为前提。
- <strong>由什么组成</strong>……核心是可重复执行的 CLI，以及汇总各功能入口和访问路径的 Feature Map。
- <strong>如何制作和维护</strong>……用户在制作前准备技术栈与开发环境；制作后按文章建议至少每天运行一次 `/maintain-verification-skill`，也可用 Dr Eggbot 的例行任务机制化。
- <strong>如何使用和扩展</strong>……用户在请求中写明验证 Skill 名称与证据形式，满意后再扩展到并行与自动化。
- <strong>第一步</strong>……确认 Agent 能否从外部操作和观察应用。

从下一章[第 37 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b4b9a1)起，本书依据《The Complete Guide to pstack》[Part 2](https://x.com/poteto/status/2097732320606507506)，介绍如何与 Agent 一起决定做什么：解决什么问题、采用什么设计、怎样规划。[第 37 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b4b9a1)会先讲本书归纳的 Part 2 十三项要点中的前四项。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](42-chapter.md) · [下一篇](44-chapter.md) · [English](../en/43-chapter.md)
