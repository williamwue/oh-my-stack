# 第 32 章：保持写作质量

[目录](README.md) · [上一篇](37-chapter.md) · [下一篇](39-chapter.md) · [English](../en/38-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/44857b) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/c22a83)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
本章介绍以下三种 Skill。

1. [`/unslop`](https://github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md)
2. [`/bro`](https://github.com/cursor/plugins/blob/main/pstack/skills/bro/SKILL.md)
3. [`/technical-writing`](https://github.com/cursor/plugins/blob/main/pstack/skills/technical-writing/SKILL.md)

三者都旨在维护 Agent 所写文章的质量，分别负责以下工作。

- <strong>`/unslop`</strong>……让 Agent 从自己写的文章中，清除「I hope this helps!（希望这能帮到你）」等套话和其他 AI 式写作毛病。
- <strong>`/bro`</strong>……让 Agent 不使用术语，简短地重新表述刚才的回复。
- <strong>`/technical-writing`</strong>……让 Agent 先确定文档的类型（如教程或参考文档），再撰写技术文档。

本章先比较三种 Skill 的对象、由谁修改、因何启动，再分别从作用、使用时机、规则或步骤、请求写法四个角度介绍它们。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章按以下顺序展开。

- 三种 Skill 的对象和修改者不同
- `/unslop` 用带编号的规则清除 AI 式写作毛病
- `/bro` 用没有术语的话重述难懂的回复
- `/technical-writing` 先确定文档类型，再开始写作
- 小结

<a id="3%E3%81%A4%E3%81%AEskill%E3%81%AF%E3%80%81%E5%AF%BE%E8%B1%A1%E3%81%A8%E3%80%81%E8%AA%B0%E3%81%8C%E7%9B%B4%E3%81%99%E3%81%8B%E3%81%8C%E7%95%B0%E3%81%AA%E3%82%8B"></a>


## 三种 Skill 的对象和修改者不同

三种 Skill 的对象及修改者如下表所示。

<table class="code-line" data-line="28">
<thead class="code-line" data-line="28">
<tr class="code-line" data-line="28">
<th>Skill</th>
<th>对象</th>
<th>由谁修改</th>
</tr>
</thead>
<tbody class="code-line" data-line="30">
<tr class="code-line" data-line="30">
<td><code>/unslop</code></td>
<td>包括 Agent 回复在内的任何文章</td>
<td>撰写文章的 Agent 自己按规则修改</td>
</tr>
<tr class="code-line" data-line="31">
<td><code>/bro</code></td>
<td>Agent 刚才的回复</td>
<td>用户觉得回复难懂时调用，由 Agent 重述</td>
</tr>
<tr class="code-line" data-line="32">
<td><code>/technical-writing</code></td>
<td>文档、RFC（提出设计方案的文档）、README、PR 描述、提交说明</td>
<td>撰写文章的 Agent 自己按四层规范写作和修改</td>
</tr>
</tbody>
</table>

<a id="3%E3%81%A4%E3%81%AF%E3%80%81%E5%90%8D%E5%89%8D%E3%81%A7%E5%91%BC%E3%81%B0%E3%82%8C%E3%81%9F%E3%81%A8%E3%81%8D%E3%81%A0%E3%81%91%E5%8B%95%E3%81%8F"></a>


### 三者都只在被点名调用时运行

这三个 `SKILL.md` 都设置了 `disable-model-invocation: true`（[第 25 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/46bd1f)）。对于设置了此选项的 Skill，Agent 不会根据对话内容自行选用。因此，只有用户点名调用，或 `/poteto-mode`、Playbook、其他 Skill 在步骤中点名调用时，它们才会运行。

`/poteto-mode` 的「[Non-negotiables](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#non-negotiables)」（[第 8 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/096f3d)）规定了其中两种 Skill 的调用场景：写任何文章时使用 `/unslop`；写文档、RFC（提出设计方案的文档）、README、PR 描述或提交说明时使用 `/technical-writing`。

所以，在 `/poteto-mode` 下工作，即使用户不点名这两种 Skill，Agent 也会依照「Non-negotiables」规则调用它们。

<a id="%2Funslop-%E3%81%AF%E3%80%81ai%E3%82%89%E3%81%97%E3%81%84%E6%96%87%E7%AB%A0%E3%81%AE%E7%99%96%E3%82%92%E7%95%AA%E5%8F%B7%E4%BB%98%E3%81%8D%E3%81%AE%E8%A6%8F%E5%89%87%E3%81%A7%E5%8F%96%E3%82%8A%E9%99%A4%E3%81%8F"></a>


## `/unslop` 用带编号的规则清除 AI 式写作毛病

<a id="%E5%BD%B9%E5%89%B2%EF%BC%9Aai%E3%82%89%E3%81%97%E3%81%84%E6%96%87%E7%AB%A0%E3%81%AE%E7%99%96%E3%82%92%E8%A6%8F%E5%89%87%E3%81%A7%E5%8F%96%E3%82%8A%E9%99%A4%E3%81%8F"></a>


### 作用：依照规则清除 AI 式写作毛病

`/unslop` 是<strong>让 Agent 依照规则，从自己撰写的文章中删去 AI 式写作毛病的 Skill</strong>。

所谓 AI 式写作毛病，是 AI 文章中常见、让读者察觉到「这是机器写的」的用语或格式。

英文原文称之为 AI tells 或 AI patterns。例如回复结尾的套话，或过度使用 em dash（英文中的长破折号 `—`）。

规则和例子都针对英语文章，但大多数规则与语言无关，普遍适用于文章，因此也并非不能用于日语。

当然，它在英语中最有效。因此，仍然可以说：「The hottest programming language is English」。

<a id="%E4%BD%BF%E3%81%84%E3%81%A9%E3%81%8D%EF%BC%9A%E3%81%A9%E3%82%93%E3%81%AA%E6%96%87%E7%AB%A0%E3%81%AB%E3%82%82%E5%B8%B8%E3%81%AB%E9%81%A9%E7%94%A8%E3%81%99%E3%82%8B"></a>


### 使用时机：始终应用于任何文章

`/poteto-mode` 的「Non-negotiables」规定，<strong>所有文章，包括 Agent 的回复</strong>，都要应用这项 Skill。

`SKILL.md` 的说明（description）也写着「Must always apply（必须始终应用）」。不过，`/unslop` 设置了 `disable-model-invocation: true`，Agent 不会因为读到这段说明就自行调用它。之所以会始终应用，是因为「Non-negotiables」规则，以及下文介绍的其他 Skill 和 Playbook 步骤，会调用 `/unslop`。

<a id="%2Funslop-%E3%81%AF%E3%80%81%E6%96%87%E7%AB%A0%E3%82%92%E6%9B%B8%E3%81%8F%E3%81%BB%E3%81%8B%E3%81%AEskill%E3%82%84playbook%E3%81%8B%E3%82%89%E3%82%82%E4%BD%BF%E3%82%8F%E3%82%8C%E3%82%8B"></a>


#### 其他撰写文章的 Skill 和 Playbook 也使用 `/unslop`

其他 Skill 和 Playbook 也在各自步骤中规定，要将 `/unslop` 应用于自己写的文章。调用方及应用的文章汇总如下。

<table class="code-line" data-line="66">
<thead class="code-line" data-line="66">
<tr class="code-line" data-line="66">
<th>调用方</th>
<th>应用 <code>/unslop</code> 的文章</th>
</tr>
</thead>
<tbody class="code-line" data-line="68">
<tr class="code-line" data-line="68">
<td><code>/technical-writing</code></td>
<td>撰写或审查的所有文档</td>
</tr>
<tr class="code-line" data-line="69">
<td>「Opening a PR」「Multi-phase or multi-PR plan」Playbook</td>
<td>PR 标题、PR 描述、提交正文、计划书</td>
</tr>
<tr class="code-line" data-line="70">
<td>
<code>/teach</code>、<code>/show-me-your-work</code>
</td>
<td>解释性的回复及判断记录</td>
</tr>
<tr class="code-line" data-line="71">
<td>
<code>/recall</code>、<code>/blast-radius</code>
</td>
<td>交给用户的报告</td>
</tr>
<tr class="code-line" data-line="72">
<td><code>/automate-me</code></td>
<td>用户专用 Skill 的草稿</td>
</tr>
<tr class="code-line" data-line="73">
<td>「Investigation」Playbook</td>
<td>调查结果的回复</td>
</tr>
</tbody>
</table>

各调用方的细节如下。

##### `/technical-writing`：把 AI 式写作毛病清单交给 `/unslop`

`/technical-writing` 自己不维护 AI 式用词或空洞套话等毛病清单，而是交给 `/unslop`。因此，它会将 `/unslop` 应用于自己撰写或审查的每份文档。

##### 「Opening a PR」「Multi-phase or multi-PR plan」Playbook：经 `/technical-writing` 撰写后，再应用 `/unslop`

创建 PR 的「[<strong>Opening a PR</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md)」Playbook（[第 14 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e)）规定，先用 `/technical-writing` 撰写 PR 标题、PR 描述及提交正文，再应用 `/unslop`。

撰写跨多个阶段或 PR 的计划书的「[<strong>Multi-phase or multi-PR plan</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md)」Playbook（[第 16 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5)）也规定，先用 `/technical-writing` 写计划书，再应用 `/unslop`。

##### `/teach`、`/show-me-your-work`：像向同事说话一样写

`/teach`（[第 22 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746)）用简单的话解释工作，让人真正理解内容。它规定所有回复都应像向同事解释一样，使用浅白的口语，并将 `/unslop` 应用于回复。

`/show-me-your-work`（[第 28 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/724887)）把 Agent 的判断及依据逐行记录在文件中。它规定记录中的每一行都要像向队友讲述自己做过的事一样写，不用 AI 式说法或抽象术语；随后还要对记录文字应用 `/unslop`。

##### `/recall`、`/blast-radius`：撰写交给用户的报告

`/recall`（[第 22 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746)）从聊天历史等资料中重建用户近期工作的状态。`/blast-radius`（[第 27 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/997880)）在发布前查找变更可能导致其他地方出现的问题。

两者都通过 `/unslop` 撰写交给用户的报告。`/recall` 的报告说明工作目前的进度和下一步；`/blast-radius` 的报告说明变更可能破坏什么，以及合并前要检查什么。

##### `/automate-me`：用 `/unslop` 修改用户专用 Skill 的文字

`/automate-me`（[第 25 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/46bd1f)）从用户近期的 transcript（与 Agent 的对话记录）中找出工作偏好，起草用户专用的 Skill（`<利用者の名前>-mode`）。它将 `/unslop` 应用于草稿的每一行。

##### 「Investigation」Playbook：调查结果的回复就是成果物

「[<strong>Investigation</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/investigation.md)」（[第 10 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ea525d)）是不修改代码、只调查并回答问题的 Playbook。它返回带出处的解释或建议，而非代码变更，并<strong>把这份回复定义为调查的成果物</strong>。

这项 Playbook 在最后一步对该回复应用 `/unslop`。

<a id="%E8%A6%8F%E5%89%87%EF%BC%9Aai%E3%82%89%E3%81%97%E3%81%84%E7%99%96%E3%82%92%E3%80%817%E3%81%A4%E3%81%AE%E5%88%86%E9%A1%9E%E3%81%A8%E5%9B%BA%E5%AE%9A%E3%81%AE%E7%95%AA%E5%8F%B7%E3%81%A7%E7%A4%BA%E3%81%99"></a>


### 规则：用七个类别和固定编号列出 AI 式写作毛病

`SKILL.md` 的步骤只有两项，其余大部分篇幅是规则。

1. 找出符合规则的地方
2. 保留原意，并按照作者希望呈现的语气改写

每条规则都有编号，其他 Skill 用这些固定 ID 引用它们。例如，`/poteto-mode` 用「unslop rule 14」这样的编号，引用「不要用冒号连接句子中途的成分」这一规则。

`SKILL.md` 规定，删除一条规则后应空出该编号。在 pstack `0.15.5` 版本的 `SKILL.md` 中，编号 1、2、4、6、21 是空缺的。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="121">这些空缺可在 GitHub 的<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md?plain=1" rel="nofollow noopener noreferrer" target="_blank">源码视图</a>（未经 Markdown 格式化的显示方式）中确认。</p>
</div></aside>

共有 28 条规则，分为以下七类。

<table class="code-line" data-line="126">
<thead class="code-line" data-line="126">
<tr class="code-line" data-line="126">
<th>类别</th>
<th>修改内容</th>
<th>规则编号</th>
</tr>
</thead>
<tbody class="code-line" data-line="128">
<tr class="code-line" data-line="128">
<td><a href="#content%EF%BC%88%E5%86%85%E5%AE%B9%EF%BC%89">Content（内容）</a></td>
<td>只添加评价的短语，以及出处不明的主张</td>
<td>3、5</td>
</tr>
<tr class="code-line" data-line="129">
<td><a href="#language%EF%BC%88%E8%AA%9E%E5%BD%99%EF%BC%89">Language（词汇）</a></td>
<td>AI 常用的词语和固定句式</td>
<td>7～12</td>
</tr>
<tr class="code-line" data-line="130">
<td><a href="#style%EF%BC%88%E4%BD%93%E8%A3%81%EF%BC%89">Style（格式）</a></td>
<td>符号、粗体、标题及表情符号的用法</td>
<td>13～19</td>
</tr>
<tr class="code-line" data-line="131">
<td><a href="#communication-artifacts%EF%BC%88%E3%83%81%E3%83%A3%E3%83%83%E3%83%88%E3%81%AE%E5%90%8D%E6%AE%8B%EF%BC%89">Communication artifacts（聊天痕迹）</a></td>
<td>聊天回复中的套话和奉承语气</td>
<td>20、22</td>
</tr>
<tr class="code-line" data-line="132">
<td><a href="#filler%EF%BC%88%E5%9F%8B%E3%82%81%E8%8D%89%EF%BC%89">Filler（赘词）</a></td>
<td>无意义的词语、过度保留和空洞结尾</td>
<td>23～25</td>
</tr>
<tr class="code-line" data-line="133">
<td><a href="#jargon%EF%BC%88%E5%B0%82%E9%96%80%E7%94%A8%E8%AA%9E%E3%82%82%E3%81%A9%E3%81%8D%EF%BC%89">Jargon（貌似专业的术语）</a></td>
<td>听起来专业的比喻性名词</td>
<td>26</td>
</tr>
<tr class="code-line" data-line="134">
<td><a href="#plain-speech%EF%BC%88%E5%B9%B3%E6%98%93%E3%81%AA%E8%A8%80%E8%91%89%EF%BC%89">Plain speech（浅白用语）</a></td>
<td>只写感受或印象的句子、需要重读才能理解的句子、刻意雕琢的词语</td>
<td>27～33</td>
</tr>
</tbody>
</table>

下面按类别列出全部规则。

如前所述，原文规则和例子都以英语文章为对象。但本书认为，除了英语格式特有的四条规则（13、14、17、19），其他规则也适用于日语文章。因此，对于同样适用于日语的规则，本书改用日语示例说明；四条英语特有规则则保留原文的英语例子。

<a id="content%EF%BC%88%E5%86%85%E5%AE%B9%EF%BC%89"></a>


#### Content（内容）

<table class="code-line" data-line="142">
<thead class="code-line" data-line="142">
<tr class="code-line" data-line="142">
<th>编号</th>
<th>规则</th>
<th>修改方式</th>
</tr>
</thead>
<tbody class="code-line" data-line="144">
<tr class="code-line" data-line="144">
<td>3</td>
<td>空泛短语</td>
<td>对于「实现了……」「使……成为可能」等只增加评价的短语，删除它们，或补上实际出处和实质内容</td>
</tr>
<tr class="code-line" data-line="145">
<td>5</td>
<td>模糊的出处</td>
<td>不要写「据专家称」「一般认为」等无法知道由谁提出的说法；点名来源，或删除</td>
</tr>
</tbody>
</table>

<a id="language%EF%BC%88%E8%AA%9E%E5%BD%99%EF%BC%89"></a>


#### Language（词汇）

<table class="code-line" data-line="149">
<thead class="code-line" data-line="149">
<tr class="code-line" data-line="149">
<th>编号</th>
<th>规则</th>
<th>修改方式</th>
</tr>
</thead>
<tbody class="code-line" data-line="151">
<tr class="code-line" data-line="151">
<td>7</td>
<td>AI 式词汇</td>
<td>不要反复使用「重要的」「全面的」「此外」「利用……」等词，改用简单用语</td>
</tr>
<tr class="code-line" data-line="152">
<td>8</td>
<td>把「是」说得过于花哨</td>
<td>将「发挥……作用」「以……为傲」改成「是」「有」</td>
</tr>
<tr class="code-line" data-line="153">
<td>9</td>
<td>「不仅……还……」</td>
<td>避免「不仅……还……」的句式，直接写要点</td>
</tr>
<tr class="code-line" data-line="154">
<td>10</td>
<td>硬凑三项并列</td>
<td>不要强行把想法塞进三项组合，实际有几项就写几项</td>
</tr>
<tr class="code-line" data-line="155">
<td>11</td>
<td>反复换名指同一事物</td>
<td>不要在同一段里轮流称「主人公」「主角」「中心人物」，统一使用一个词</td>
</tr>
<tr class="code-line" data-line="156">
<td>12</td>
<td>虚假的范围</td>
<td>不要用「从文档到测试」这样的「从……到……」连接不在同一尺度上的事物；直接列出话题</td>
</tr>
</tbody>
</table>

<a id="style%EF%BC%88%E4%BD%93%E8%A3%81%EF%BC%89"></a>


#### Style（格式）

<table class="code-line" data-line="160">
<thead class="code-line" data-line="160">
<tr class="code-line" data-line="160">
<th>编号</th>
<th>规则</th>
<th>修改方式</th>
</tr>
</thead>
<tbody class="code-line" data-line="162">
<tr class="code-line" data-line="162">
<td>13</td>
<td>过度使用 em dash</td>
<td>不用 em dash，改用句号或逗号；也不用括号、en dash 或连字符代替</td>
</tr>
<tr class="code-line" data-line="163">
<td>14</td>
<td>过度使用冒号</td>
<td>只在列表或例子前使用冒号，不要用它连接句子中途的成分</td>
</tr>
<tr class="code-line" data-line="164">
<td>15</td>
<td>过度使用粗体</td>
<td>不要每次出现专有名称或缩写都加粗</td>
</tr>
<tr class="code-line" data-line="165">
<td>16</td>
<td>带小标题的列表项</td>
<td>把「<strong>性能：</strong>性能改善了」这样粗体小标题重复本行内容的列表项，改为普通句子</td>
</tr>
<tr class="code-line" data-line="166">
<td>17</td>
<td>Title Case 标题</td>
<td>标题改用 sentence case</td>
</tr>
<tr class="code-line" data-line="167">
<td>18</td>
<td>装饰性的表情符号</td>
<td>从标题和列表项中删除表情符号</td>
</tr>
<tr class="code-line" data-line="168">
<td>19</td>
<td>弯引号</td>
<td>将弯引号改为直引号</td>
</tr>
</tbody>
</table>

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="171">
<li class="code-line" data-line="171">
<strong>em dash</strong>……英文中用于插入语或句子间隔的长破折号（<code>—</code>）</li>
<li class="code-line" data-line="172">
<strong>en dash</strong>……比 em dash 短的破折号，英文中可表示「1–5」这样的范围</li>
<li class="code-line" data-line="173">
<strong>Title Case</strong>……标题中主要单词的首字母都大写，例如「Pick The Mode First」</li>
<li class="code-line" data-line="174">
<strong>sentence case</strong>……标题同一般句子一样，只将第一个单词的首字母大写，例如「Pick the mode first」</li>
<li class="code-line" data-line="175">
<strong>弯引号</strong>……左右形状不同的引号（“ ”）；直引号左右形状相同（"）</li>
</ul>
</div></aside>

<a id="communication-artifacts%EF%BC%88%E3%83%81%E3%83%A3%E3%83%83%E3%83%88%E3%81%AE%E5%90%8D%E6%AE%8B%EF%BC%89"></a>


#### Communication artifacts（聊天痕迹）

<table class="code-line" data-line="180">
<thead class="code-line" data-line="180">
<tr class="code-line" data-line="180">
<th>编号</th>
<th>规则</th>
<th>修改方式</th>
</tr>
</thead>
<tbody class="code-line" data-line="182">
<tr class="code-line" data-line="182">
<td>20</td>
<td>聊天机器人的套话</td>
<td>删除「希望这能帮到你」「如果还有问题，请告诉我」「明白了！」等句子</td>
</tr>
<tr class="code-line" data-line="183">
<td>22</td>
<td>奉承的语气</td>
<td>省去「问得真好！你说得完全正确！」等前言，直接回答</td>
</tr>
</tbody>
</table>

<a id="filler%EF%BC%88%E5%9F%8B%E3%82%81%E8%8D%89%EF%BC%89"></a>


#### Filler（赘词）

<table class="code-line" data-line="187">
<thead class="code-line" data-line="187">
<tr class="code-line" data-line="187">
<th>编号</th>
<th>规则</th>
<th>修改方式</th>
</tr>
</thead>
<tbody class="code-line" data-line="189">
<tr class="code-line" data-line="189">
<td>23</td>
<td>赘词和空洞短语</td>
<td>将「由于存在……这一事实」改为「因为……」；删除「需要注意的是，这一点很重要」</td>
</tr>
<tr class="code-line" data-line="190">
<td>24</td>
<td>过度保留</td>
<td>将「也不能排除可能存在……的可能性」改为「可能……」</td>
</tr>
<tr class="code-line" data-line="191">
<td>25</td>
<td>没有内容的结尾</td>
<td>不要用「未来值得期待」之类的句子收尾；写出具体计划或事实</td>
</tr>
</tbody>
</table>

<a id="jargon%EF%BC%88%E5%B0%82%E9%96%80%E7%94%A8%E8%AA%9E%E3%82%82%E3%81%A9%E3%81%8D%EF%BC%89"></a>


#### Jargon（貌似专业的术语）

<table class="code-line" data-line="195">
<thead class="code-line" data-line="195">
<tr class="code-line" data-line="195">
<th>编号</th>
<th>规则</th>
<th>修改方式</th>
</tr>
</thead>
<tbody class="code-line" data-line="197">
<tr class="code-line" data-line="197">
<td>26</td>
<td>抽象的比喻性名词</td>
<td>将「基石」「北极星」「飞轮」等比喻改成具体用语，例如将「北极星指标」改成「最重视的指标」</td>
</tr>
</tbody>
</table>

<a id="plain-speech%EF%BC%88%E5%B9%B3%E6%98%93%E3%81%AA%E8%A8%80%E8%91%89%EF%BC%89"></a>


#### Plain speech（浅白用语）

<table class="code-line" data-line="201">
<thead class="code-line" data-line="201">
<tr class="code-line" data-line="201">
<th>编号</th>
<th>规则</th>
<th>修改方式</th>
</tr>
</thead>
<tbody class="code-line" data-line="203">
<tr class="code-line" data-line="203">
<td>27</td>
<td>写出做了什么，而非只写感受或印象</td>
<td>不要只说「易读的 SQL」「符合 schema 的类型」等使用时的感受；改写成说明机制或数值的句子，例如「<code>.toSQL()</code> 返回发送给数据库的原始字符串」「列名改变后，构建会失败」</td>
</tr>
<tr class="code-line" data-line="204">
<td>28</td>
<td>缩短或拆开过密的句子</td>
<td>读者必须重读才能理解的句子，拆成两句，或删去部分内容</td>
</tr>
<tr class="code-line" data-line="205">
<td>29</td>
<td>使用主动语态</td>
<td>将「查询会被验证」改为「编译器会验证查询」</td>
</tr>
<tr class="code-line" data-line="206">
<td>30</td>
<td>删去副词，或使用更有力的动词</td>
<td>将「运行得很快」改为「速度快」或写出实测数值；不要只说「大幅改善」，应写测得的差异</td>
</tr>
<tr class="code-line" data-line="207">
<td>31</td>
<td>选择浅白的词语</td>
<td>将「活用」「利用」改成「使用」，将「促进」改成「帮助」</td>
</tr>
<tr class="code-line" data-line="208">
<td>32</td>
<td>放弃刻意雕琢的文风</td>
<td>把比喻或华丽说法改成字面描述，例如将「值得转动的旋钮」改成「值得试着调整的参数」</td>
</tr>
<tr class="code-line" data-line="209">
<td>33</td>
<td>避免把太多内容塞进一句话</td>
<td>将省略动词、依赖箭头和缩写的句子改成完整句，例如将「解析器拒绝无效日期 → exit 2，无写入」改为「解析器拒绝无效日期，以退出码 2 结束，且不写入任何内容」</td>
</tr>
</tbody>
</table>

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E7%9B%B4%E3%81%99%E6%96%87%E7%AB%A0%E3%81%A8%E8%BF%BD%E5%8A%A0%E3%81%AE%E8%A6%8F%E5%89%87%E3%82%92%E6%B7%BB%E3%81%88%E3%81%A6%E5%91%BC%E3%81%B6"></a>


### 请求写法：附上要修改的文字和额外规则

随附指南的 [`docs/guide/05-build-and-clean.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/05-build-and-clean.md) 给出了以下示例：调用时附上要修改的文字和额外规则。

```
/unslop the readme changes, no emdashes
// READMEの変更を unslop して。em dash は使わないで
```

其中「the readme changes」是要修改的文字，「no emdashes」是额外规则。

同一页面还指出，即使请求很短，Agent 也能理解意图，用这项 Skill 修改文字，例如：

```
unslop that, tighten it
// それを unslop して、引き締めて
```

其中「that」指刚刚写的文章。

<a id="%2Fbro-%E3%81%AF%E3%80%81%E5%88%86%E3%81%8B%E3%82%8A%E3%81%AB%E3%81%8F%E3%81%84%E8%BF%94%E7%AD%94%E3%82%92%E3%80%81%E5%B0%82%E9%96%80%E7%94%A8%E8%AA%9E%E3%81%AA%E3%81%97%E3%81%A7%E8%A8%80%E3%81%84%E7%9B%B4%E3%81%99"></a>


## `/bro` 用没有术语的话重述难懂的回复

<a id="%E5%BD%B9%E5%89%B2%EF%BC%9A%E7%9B%B4%E5%89%8D%E3%81%AE%E8%BF%94%E7%AD%94%E3%82%92%E3%80%81%E5%B0%82%E9%96%80%E7%94%A8%E8%AA%9E%E3%81%AA%E3%81%97%E3%81%A7%E8%A8%80%E3%81%84%E7%9B%B4%E3%81%99"></a>


### 作用：不使用术语，重述刚才的回复

`/bro` 是<strong>让 Agent 不用术语，重新表述刚才回复的 Skill</strong>。正文只有三句话，是 pstack 中最短的 Skill。

它与 `/unslop` 的区别在于修改的范围。`/unslop` 只修改符合规则的地方，例如套话；`/bro` 则不使用一套规则，而是用浅白的话重述整份刚才的回复。

与 `/unslop`、`/technical-writing` 不同，`/poteto-mode`、Playbook 和其他 Skill 都不会在步骤中调用 `/bro`。因此，只有用户点名调用时，`/bro` 才会运行。

<a id="%E4%BD%BF%E3%81%84%E3%81%A9%E3%81%8D%EF%BC%9A%E8%BF%94%E7%AD%94%E3%81%8C%E8%A9%B3%E3%81%97%E3%81%84%E3%81%AE%E3%81%AB%E3%80%81%E4%BD%95%E3%82%92%E8%A8%80%E3%81%A3%E3%81%A6%E3%81%84%E3%82%8B%E3%81%AE%E3%81%8B%E5%88%86%E3%81%8B%E3%82%89%E3%81%AA%E3%81%84%E3%81%A8%E3%81%8D"></a>


### 使用时机：回复写得很详细，却看不懂在说什么

当 Agent 的回复技术细节很多，却让用户看不明白究竟在说什么时，用户就可以使用这项 Skill。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A%E6%9C%AC%E6%96%87%E3%81%AE3%E6%96%87%E3%81%8C%E3%80%81%E3%81%9D%E3%81%AE%E3%81%BE%E3%81%BE%E6%8C%87%E7%A4%BA%E3%81%AB%E3%81%AA%E3%82%8B"></a>


### 步骤：正文的三句话就是指令

`/bro` 的正文只有以下三句话。

> Restate your last message. Stop using jargon and speak coherently. State it more simply and concisely, like one human talking to another.
>
> 重新表述你刚才的话。不要用术语，把意思说清楚。像人与人对话那样，说得更简单、更简短。

`SKILL.md` 没有单独的步骤小节，Agent 直接把这三句话作为指令。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E3%80%8C%2Fbro%E3%80%8D%E3%81%A0%E3%81%91%E3%81%A7%E8%B6%B3%E3%82%8A%E3%82%8B"></a>


### 请求写法：只写「/bro」就够了

随附指南 [`10-recipes-and-pitfalls.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/10-recipes-and-pitfalls.md) 将以下一个词列为完整的提示词。

```
/bro
```

正文的三句话已经是指令，用户无需再说明要怎样重述。

<a id="%2Ftechnical-writing-%E3%81%AF%E3%80%81%E6%96%87%E6%9B%B8%E3%81%AE%E7%A8%AE%E9%A1%9E%E3%82%92%E5%85%88%E3%81%AB%E6%B1%BA%E3%82%81%E3%81%A6%E3%81%8B%E3%82%89%E6%9B%B8%E3%81%8B%E3%81%9B%E3%82%8B"></a>


## `/technical-writing` 先确定文档类型，再动笔写作

<a id="%E5%BD%B9%E5%89%B2%EF%BC%9A%E6%8A%80%E8%A1%93%E6%96%87%E6%9B%B8%E3%82%92%E3%80%81%E5%B1%A4%E3%81%AB%E5%88%86%E3%81%91%E3%81%9F%E8%A6%8F%E7%AF%84%E3%81%A7%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AB%E6%9B%B8%E3%81%8B%E3%81%9B%E3%82%8B"></a>


### 作用：让 Agent 按分层规范撰写技术文档

`/technical-writing` 是一项 Skill，它把 Agent 撰写技术文档时应遵循的规范分为四层，从整篇文档的类型一直细化到单个句子的写法。<strong>目标是让疲惫的工程师读一遍就能理解。</strong>

poteto 在《The Complete Guide to pstack》的 [Part 2](https://x.com/poteto/status/2097732320606507506) 中解释了创建这项 Skill 的缘由。

起因是他曾让 Agent 在没有这项 Skill 的情况下，为 Cursor 内部的桌面应用框架 Dune 撰写 README。据他说，生成的 README 把教程、操作指南、设计说明和 API 参考混在一起，还用了带有明显 AI 腔调的花哨措辞，读起来很费劲。

<a id="%E4%BD%BF%E3%81%84%E3%81%A9%E3%81%8D%EF%BC%9A%E6%96%87%E6%9B%B8%E3%82%92%E6%9B%B8%E3%81%8F%E3%81%A8%E3%81%8D%E3%81%A8%E3%83%AC%E3%83%93%E3%83%A5%E3%83%BC%E3%81%99%E3%82%8B%E3%81%A8%E3%81%8D"></a>


### 使用时机：撰写和审阅文档时

`SKILL.md` 的说明（description）列出的使用场景包括撰写及审阅文档、RFC（提出设计方案的文档）、README、PR 描述和提交信息。

不过，`/technical-writing` 也设置了 `disable-model-invocation: true`，所以 Agent 不会读到这段说明后自行调用 `/technical-writing`。这些场景之所以会使用它，是因为「Non-negotiables」的规则要求在撰写这些文档时使用这项 Skill。

在 Playbook 中，「Opening a PR」要求用这项 Skill 撰写 PR 标题、PR 描述和提交信息正文。「Multi-phase or multi-PR plan」也要求用它来撰写计划文档。

<a id="%E8%A6%8F%E5%89%87%EF%BC%9A4%E3%81%A4%E3%81%AE%E5%B1%A4%E3%81%A8%E3%80%81%E5%B1%A4%E3%81%AE%E5%A4%96%E3%81%AE%E8%A6%8F%E5%89%87"></a>


### 规则：四个层次及层次之外的规则

除了四个层次的规范，`SKILL.md` 还规定了不属于任何一层的规则。我们先看这些规则，再依次看四个层次。

<a id="4%E3%81%A4%E3%81%AE%E5%B1%A4%E3%82%88%E3%82%8A%E5%84%AA%E5%85%88%E3%81%99%E3%82%8B3%E3%81%A4%E3%81%AE%E8%A6%8F%E5%89%87"></a>


#### 优先于四个层次的三条规则

除了四个层次，Agent 还要遵守以下三条优先级高于所有层次的规则。

- 删除所有删去后不改变句意的词。例如，将「In order to」改为「to」。
- 使用简短、日常的词。例如，写「use」而不是「utilize」。
- 如果遵守某条规则反而使句子变差，就用别的方法修改，或保留原句。这些规则服务于读者；即便全部遵守，文章读起来仍像机器写的，也算失败。

<a id="%E5%90%8D%E5%89%8D%E3%81%AF%E3%80%81%E3%82%B3%E3%83%BC%E3%83%89%E3%83%99%E3%83%BC%E3%82%B9%E3%81%AE%E5%90%8D%E5%89%8D%E3%82%92%E3%81%9D%E3%81%AE%E3%81%BE%E3%81%BE%E4%BD%BF%E3%81%84%E3%80%81%E6%96%B0%E3%81%97%E3%81%84%E5%B0%82%E9%96%80%E7%94%A8%E8%AA%9E%E3%82%92%E4%BD%9C%E3%82%89%E3%81%AA%E3%81%84"></a>


#### 沿用代码库中的名称，不创造新术语

Agent 要原样使用代码库中实际存在的符号（函数名、类型名、变量名等代码中有名字的事物）、文件、标志和命令的名称，不随意改写。

Agent 也不创造新的术语，而是使用开发者平时说的话。例如，把代码移到别处时，写「move（移动）」，而不是「evacuate（疏散）」。

另一方面，「Strangler Fig 模式」这类已有固定设计或做法、且已广泛使用的名称，Agent 也应沿用。

但 Agent 要在这个名称第一次出现在文档中时解释其含义。例如，可以写「采用 Strangler Fig 模式（逐步以新系统替换旧系统的做法）进行迁移」。

`/unslop` 的规则 26（抽象的比喻性名词）列出了像 evacuate 这样需要改写的词。如果 Agent 发现列表之外的词，就不自行修改 `/unslop`，而是在回复中附上差异，提出将「列表中缺少的词」和「改写后的词」加入列表的建议。

<a id="%E6%96%87%E3%81%AE%E9%95%B7%E3%81%95%E3%82%92%E6%B7%B7%E3%81%9C%E3%80%81%E5%85%B7%E4%BD%93%E7%9A%84%E3%81%AB%E6%9B%B8%E3%81%8F"></a>


#### 句子长短交错，内容写得具体

关于句长和具体程度，这项 Skill 提出了以下四点要求。

- <strong>有意交错使用长短句</strong>……用短句点明要点，用长句连同条件或结果写清事实。
- <strong>是否拆句取决于要表达的事情有几件，而非句子有多长</strong>……「一句话讲一件事」不等于「每句话都要短」。一句话里有两件事就拆开；只有一件事，即使句子较长也可以保留。
- <strong>在解说中写出作者的判断</strong>……写 explanation（解说）时，不能只列优缺点，还要写作者如何评价。写 reference（参考文档）时则不要加入评价，只写事实。
- <strong>具体描述，不要含糊</strong>……不要笼统地写「更改 schema 可能导致问题」，而要写明会发生什么，例如「重命名列会导致构建失败」。

因为<strong>即使四个层次的规范全部得到遵守，如果全文都是切得很短的句子，却没有写出任何具体事情，读起来依然像机器写的</strong>。

<a id="pr%E8%AA%AC%E6%98%8E%E3%81%AF%E3%80%811%E5%88%86%E4%BB%A5%E5%86%85%E3%81%AB%E8%AA%AD%E3%82%81%E3%82%8B%E9%95%B7%E3%81%95%E3%81%AB%E3%81%99%E3%82%8B"></a>


#### PR 描述应让审阅者在一分钟内读完

Agent 要把 PR 描述控制在审阅者一分钟内能读完的长度。因此，`/swarm`（[第 24 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346)）的运行日志、提交 SHA（每次提交所附、可唯一标识该提交的标识符）列表和指标表格，都应以链接指向，而不是贴进正文。

<a id="4%E3%81%A4%E3%81%AE%E5%B1%A4%E3%81%AF%E3%80%81%E6%96%87%E6%9B%B8%E5%85%A8%E4%BD%93%E3%81%8B%E3%82%89%E4%B8%80%E6%96%87%E3%81%B8%E3%81%A8%E7%B4%B0%E3%81%8B%E3%81%8F%E8%A6%8B%E3%81%A6%E3%81%84%E3%81%8F"></a>


#### 四个层次从整篇文档逐步细化到单个句子

四个层次是依次从整篇文档细化到句子内部的步骤。每一层分别回答一个问题。

<table class="code-line" data-line="327">
<thead class="code-line" data-line="327">
<tr class="code-line" data-line="327">
<th>层次</th>
<th>问题</th>
<th>要点</th>
</tr>
</thead>
<tbody class="code-line" data-line="329">
<tr class="code-line" data-line="329">
<td><a href="https://diataxis.fr/" rel="nofollow noopener noreferrer" target="_blank">Diátaxis</a></td>
<td>这是什么类型的文档</td>
<td>在 tutorial（教程）、how-to（操作指南）、reference（参考文档）和 explanation（解说）中选一种；不同类型要拆开，并互相链接</td>
</tr>
<tr class="code-line" data-line="330">
<td><a href="https://developers.google.com/style" rel="nofollow noopener noreferrer" target="_blank">Google developer style</a></td>
<td>句子如何对读者说话</td>
<td>称读者为「you」，用现在时和祈使句。标题除了说明本节主题，也要写出要点</td>
</tr>
<tr class="code-line" data-line="331">
<td><a href="https://www.asd-ste100.org/" rel="nofollow noopener noreferrer" target="_blank">STE</a></td>
<td>一句话写多少内容</td>
<td>一句话只表达一件事；在整篇文档中用同一个词表示同一种操作</td>
</tr>
<tr class="code-line" data-line="332">
<td>Global English</td>
<td>有没有可以作两种理解的句子</td>
<td>写清「it」或「this」所指的对象，让读者不必猜测；在整篇文档中用同一个名称称呼同一事物</td>
</tr>
</tbody>
</table>

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="335">
<li class="code-line" data-line="335">
<strong>Diátaxis</strong>……将技术文档分为 tutorial（教程）、how-to（操作指南）、reference（参考文档）和 explanation（解说）四种类型来撰写的思路</li>
<li class="code-line" data-line="336">
<strong>Google developer style</strong>……Google 面向开发者的文档风格指南</li>
<li class="code-line" data-line="337">
<strong>STE</strong>……Simplified Technical English，一套通过限制词汇和句型来规范技术文档英语写作的标准</li>
<li class="code-line" data-line="338">
<strong>Global English</strong>……Kohl 的《The Global English Style Guide》提出的英语写作方法，使非英语母语读者、译者和 Agent 都能对句子作出一致的理解</li>
</ul>
</div></aside>

下面用原文中的例子逐一说明表中的各个层次。

<a id="di%C3%A1taxis%EF%BC%9A%E6%96%87%E6%9B%B8%E3%81%AE%E7%A8%AE%E9%A1%9E%E3%82%92%E5%85%88%E3%81%AB%E6%B1%BA%E3%82%81%E3%82%8B"></a>


#### Diátaxis：先确定文档类型

<strong>第一层（Diátaxis）要求先确定文档类型</strong>。如果把不同类型混在一起，文档就会像本章[「作用：让 Agent 按分层规范撰写技术文档」](#%E5%BD%B9%E5%89%B2%EF%BC%9A%E6%8A%80%E8%A1%93%E6%96%87%E6%9B%B8%E3%82%92%E3%80%81%E5%B1%A4%E3%81%AB%E5%88%86%E3%81%91%E3%81%9F%E8%A6%8F%E7%AF%84%E3%81%A7%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AB%E6%9B%B8%E3%81%8B%E3%81%9B%E3%82%8B)提到的 Dune README 一样难读。

文档类型由两个问题决定：「文档是为了行动还是为了理解？」以及「文档用于学习还是用于工作？」

<table class="code-line" data-line="349">
<thead class="code-line" data-line="349">
<tr class="code-line" data-line="349">
<th></th>
<th>用于学习</th>
<th>用于工作</th>
</tr>
</thead>
<tbody class="code-line" data-line="351">
<tr class="code-line" data-line="351">
<td>为了行动</td>
<td>tutorial</td>
<td>how-to</td>
</tr>
<tr class="code-line" data-line="352">
<td>为了理解</td>
<td>explanation</td>
<td>reference</td>
</tr>
</tbody>
</table>

`SKILL.md` 对这四种类型的说明如下。

- <strong>tutorial（教程）</strong>……供初次使用的人边动手实际制作东西边学习的文档。开头先展示最终成果，并在每一步说明「屏幕或输出中应该出现什么」。
- <strong>how-to（操作指南）</strong>……供已经熟悉工具的人解决眼前问题的步骤说明。省去基础介绍，按顺序列出要做的事。
- <strong>reference（参考文档）</strong>……供人在需要时查阅、核对准确事实的文档。列出规范和配置项，不加入操作步骤或作者的意见。
- <strong>explanation（解说）</strong>……帮助读者理解机制或设计「为什么是这样」的文档。写出设计决策、过程、限制和其他方案。只有这种文档会写作者的意见。

如果一篇文档像 Dune 的 README 一样混合了四种类型，Agent 就应将其拆成四篇，并让它们互相链接。

不过，Agent 不会把这一层应用于 PR 描述和提交信息；对这两种文字只应用其余三个层次。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="366">其余三个层次（Google developer style、STE、Global English）主要讨论英语文章的写法。建议用其他语言撰写文档的读者跳过接下来的三个小节。</p>
</div></aside>

<a id="google-developer-style%EF%BC%9A%E8%AA%AD%E3%81%BF%E6%89%8B%E3%81%AB%E8%AA%9E%E3%82%8A%E3%81%8B%E3%81%91%E3%82%8B"></a>


#### Google developer style：直接对读者说话

Agent 将读者称作「you」，并用祈使句发出指示，例如「Click Submit.」。

Agent 还要把条件放在指示前面，写成「To delete the document, click Delete.」（要删除文档，请点击 Delete）。条件先出现，读者才能跳过与自己无关的指示。

此外，标题不只要写「这一节谈什么」，还要写出「这一节的要点」。

例如，不用只说明主题的「Modes（模式）」作标题，而用「Pick the mode first（先选模式）」，让读者从标题就知道「该做什么」。  
这里的模式指的是 Diátaxis 所划分的文档类型。

<a id="ste%EF%BC%9A%E4%B8%80%E6%96%87%E3%81%AB%E3%81%AF%E3%80%81%E4%BC%9D%E3%81%88%E3%81%9F%E3%81%84%E3%81%93%E3%81%A8%E3%82%92%E4%B8%80%E3%81%A4%E3%81%A0%E3%81%91%E6%9B%B8%E3%81%8F"></a>


#### STE：一句话只表达一件事

Agent 在一句话中只写一条指示。这里的指示，是指像「Install the component.（安装组件）」这样让读者执行某项操作的句子。

Agent 还要把长句拆成两句。判断标准是：指示句约 20 个词，其他句子约 25 个词。这里计算的是英语单词数。

写作时，Agent 不省略英语冠词「the」或「a」。例如，「Remove backup file」可以有两种读法，而「Remove the backup file（删除那个备份文件）」只能有一种读法。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="389">
<li class="code-line" data-line="389">
<strong>冠词</strong>……英语中放在名词前面的「the」「a」等词，日语没有冠词</li>
<li class="code-line" data-line="390">
<strong>「Remove backup file」为什么有两种读法</strong>……原文没有具体说明是哪两种读法。本书认为可以这样理解：没有冠词时，可以把「backup file」看作一个名词（备份文件），理解成「删除备份文件」；也可以把 backup（备份）和 file 分开，将 file 理解成动词（归档），把整句话读成「删除备份，并将其归档」。有了「the」，就能确定「the backup file」是一个完整的名词短语</li>
</ul>
</div></aside>

此外，Agent 在整篇文档中用同一个词表示同一种操作。如果某处写「start（开始）」，就不要在另一处改写成「initiate（启动）」。

<a id="global-english%EF%BC%9A%E4%BA%8C%E9%80%9A%E3%82%8A%E3%81%AB%E8%AA%AD%E3%82%81%E3%82%8B%E6%96%87%E3%82%92%E3%81%AA%E3%81%8F%E3%81%99"></a>


#### Global English：消除有歧义的句子

Agent 要把「only」和「not」紧挨着它们所修饰的词放。因为位置不同，意思就会改变，比如「only fails on growth（增加时只是失败）」和「fails only on growth（只有增加时才会失败）」。

Agent 还要在各处用同一个名称称呼同一事物。如果一篇文档把同一套机制分别称作「the gate」「the ratchet」「the budget check」，读者会误以为有三套机制。

<a id="%E4%BE%8B%EF%BC%891%E6%AE%B5%E8%90%BD%E3%82%92%E3%80%81%E8%A6%8F%E5%89%87%E3%81%AB%E6%B2%BF%E3%81%A3%E3%81%A6%E6%9B%B8%E3%81%8D%E7%9B%B4%E3%81%99"></a>


#### 示例：按规则重写一个段落

`SKILL.md` 给出了一例修改前后的对照。修改前的段落如下。

> Configuration of the proto import ratchet budget script parameters is performed via budget.json. Note that it's important to remember that running with --write, which updates the committed budget to reflect the current count, should only be done when lowering it. If exceeded, CI fails.
>
> proto import ratchet budget script 的参数通过 budget.json 配置。请注意务必记住，带上 --write 运行会将已提交的预算更新为当前数量，因此只应在降低预算时这样做。如果超出预算，CI 就会失败。

修改后的段落如下。

> `budget.mjs` reads the committed budget from `budget.json` and counts the files that import protos. If the count exceeds the budget, CI fails. Run `budget.mjs --write` only to lower the budget.
>
> `budget.mjs` 从 `budget.json` 读取已提交的预算，并统计导入 proto 的文件数。如果数量超过预算，CI 就会失败。只有要降低预算时才运行 `budget.mjs --write`。

对照这两个段落，可以看到以下变化。

- 不再堆叠「proto import ratchet budget script」这一串名词，而是使用实际存在的文件名 `budget.mjs` 和 `budget.json`。
- 不再用「is performed via」这样的被动表达，而是以 `budget.mjs` 为主语，说明它做什么。
- 删除「Note that it's important to remember that」之类没有实际意义的词句。
- 不再使用「ratchet」这一比喻。ratchet 指只能朝一个方向转动的棘轮，这里原本用它来比喻「只能降低的上限」。
- 把「should only be done」这样的被动提醒，改成祈使句指示：「Run `budget.mjs --write` only to lower the budget.」。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9Askill%E3%81%AE%E5%90%8D%E5%89%8D%E3%82%92%E6%B7%BB%E3%81%88%E3%81%A6%E9%A0%BC%E3%82%80"></a>


### 请求写法：带上 Skill 名称提出请求

随附指南的 [`docs/guide/09-make-it-yours.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/09-make-it-yours.md) 给出了以下请求示例。

```
/technical-writing review the readme changes
// READMEの変更をレビューして
```

同一页面还说明，用户既可以用这项 Skill 审阅自己或 Agent 已经写好的文档，也可以在请 Agent 撰写文档时，把 Skill 名称放在请求的开头。

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 小结

- <strong>三者的区别</strong>……`/unslop` 和 `/technical-writing` 让写作的 Agent 自己按规则修改；`/bro` 则是在用户调用时，让 Agent 重述刚才的话。
- <strong>`/unslop`</strong>……用编号不变的 28 条规则，去除各类文字中的 AI 腔调。
- <strong>`/bro`</strong>……不用术语，简短地重述刚才的回复。
- <strong>`/technical-writing`</strong>……先将文档类型定为一种，再写出让疲惫的工程师读一遍就能理解的文档。

下一章[第 33 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f70847)将介绍回顾工作中学到的经验，并将其反映到现有 Skill 中的 [`/reflect`](https://github.com/cursor/plugins/blob/main/pstack/skills/reflect/SKILL.md)。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](37-chapter.md) · [下一篇](39-chapter.md) · [English](../en/38-chapter.md)
