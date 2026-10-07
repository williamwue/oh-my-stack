# 第 13 章：编写与评估 Skill

[目录](README.md) · [上一篇](16-chapter.md) · [下一篇](18-chapter.md) · [English](../en/17-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8263c0) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3f7768)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
本章介绍以下两个 Playbook。

1. [Authoring or modifying a skill](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md)
2. [Eval](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md)

两者关注的都不是应用代码，而是<strong>决定 Agent 工作方式的 Skill</strong>。

编写或修改 Skill（`SKILL.md`）时使用「Authoring or modifying a skill」；衡量 Skill 改动是否有效时使用「Eval」。

本章依次说明两者的分工及各自的用法。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章结构如下。

- 两个 Playbook 分别负责编写 Skill 的步骤和衡量效果的步骤
- 「Authoring or modifying a skill」按规定步骤编写 Skill，只保留能改变工作中判断的指令
- 「Eval」不让候选 Agent 察觉自己正在接受评估，衡量改动对其行为的影响
- 总结

<a id="2%E3%81%A4%E3%81%AEplaybook%E3%81%AF%E3%80%81skill%E3%82%92%E6%9B%B8%E3%81%8F%E6%89%8B%E9%A0%86%E3%81%A8%E5%8A%B9%E6%9E%9C%E3%82%92%E6%B8%AC%E3%82%8B%E6%89%8B%E9%A0%86%E3%82%92%E5%88%86%E6%8B%85%E3%81%99%E3%82%8B"></a>


## 两个 Playbook 分别负责编写 Skill 与衡量效果

随附指南的「Make it yours」章节（[`docs/guide/09-make-it-yours.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/09-make-it-yours.md)）对 Skill 提出两项要求。

- <strong>面向 Agent 的文字应比面向人的文字采用更高标准</strong>……即使一句没有帮助的话，将来也可能成为某位 Agent 遵循的指令。
- <strong>把 Skill 编辑当作实验来测试</strong>……因为 Skill 改动会影响未来的所有会话。

负责编写的是「<strong>Authoring or modifying a skill</strong>」，负责衡量效果的是「<strong>Eval</strong>」。

Authoring or modifying a skill 的步骤没有要求使用多个 Agent。  
而 Eval 工作需要以下三项。

- <strong>候选 Agent</strong>……在加入改动的环境中工作的 Agent。
- <strong>评审 Agent</strong>……为候选的输出评分的另一位 Agent。
- <strong>去除线索的工作环境</strong>……清除会让候选察觉自己正在接受评估的线索（如目录名或文件名）的工作环境。

<a id="%E3%80%8Eauthoring-or-modifying-a-skill%E3%80%8F%E3%81%AF%E3%80%81%E6%B1%BA%E3%82%81%E3%82%89%E3%82%8C%E3%81%9F%E6%89%8B%E9%A0%86%E3%81%A7skill%E3%82%92%E6%9B%B8%E3%81%8D%E3%80%81%E4%BD%9C%E6%A5%AD%E4%B8%AD%E3%81%AE%E5%88%A4%E6%96%AD%E3%82%92%E5%A4%89%E3%81%88%E3%82%8B%E6%8C%87%E7%A4%BA%E3%81%A0%E3%81%91%E6%AE%8B%E3%81%99"></a>


## 「Authoring or modifying a skill」按规定步骤编写 Skill，只保留能改变工作中判断的指令

编写新的 <strong>`SKILL.md` 或修改现有文件</strong>时，应执行「<strong>Authoring or modifying a skill</strong>」Playbook。

随附指南把随意从头编写 `SKILL.md` 列为常见错误，并称经过这个 Playbook 会进行验证和审阅。

<a id="4%E3%81%A4%E3%81%AE%E6%89%8B%E9%A0%86"></a>


### 四个步骤

共有四步。

1. 使用 create-skill
2. 验证 Skill
3. 若改变 Skill 结构，就准备测试用例
4. 通过「[Opening a PR](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md)」创建 PR（见[第 14 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e)）

下面逐项说明这些步骤。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="54">
<li class="code-line" data-line="54">
<strong>frontmatter</strong>……Markdown 文件开头用 <code>---</code> 包围的元数据，例如名称和说明</li>
</ul>
</div></aside>

<a id="1.-create-skill-%E3%82%92%E4%BD%BF%E3%81%86"></a>


#### 1. 使用 create-skill

Cursor 内置的 Skill，用于编写 `SKILL.md`。

<a id="2.-skill%E3%82%92%E6%A4%9C%E8%A8%BC%E3%81%99%E3%82%8B"></a>


#### 2. 验证 Skill

确认 frontmatter 含有 `name` 和 `description`，引用的文件存在，指向其他 Skill 的链接能够解析。

步骤 2 只检查能够机械判定通过与否的项目。<strong>验证 Skill 改动是否改变 Agent 行为，是「Eval」的职责</strong>。

<a id="3.-skill%E3%81%AE%E6%A7%8B%E9%80%A0%E3%82%92%E5%A4%89%E3%81%88%E3%82%8B%E3%81%AA%E3%82%89%E3%83%86%E3%82%B9%E3%83%88%E3%82%B1%E3%83%BC%E3%82%B9%E3%82%92%E7%94%A8%E6%84%8F%E3%81%99%E3%82%8B"></a>


#### 3. 若改变 Skill 结构，就准备测试用例

若改动只是语气等主观事项，可以省略。

<a id="4.-%E3%80%8Eopening-a-pr%E3%80%8F%E3%81%A7pr%E3%82%92%E4%BD%9C%E6%88%90%EF%BC%88%E7%AC%AC14%E7%AB%A0%EF%BC%89"></a>


#### 4. 通过「[Opening a PR](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md)」创建 PR（见[第 14 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e)）

<a id="%E8%A6%81%E7%82%B9%E3%81%AF%E3%80%8C%E8%BF%B7%E3%81%A3%E3%81%9F%E3%82%89%E5%89%8A%E3%82%8B%E3%80%8D%E3%81%A8%E3%81%84%E3%81%86%E6%96%87%E7%AB%A0%E3%81%AE%E8%A6%8F%E5%BE%8B"></a>


### 要点是「有疑问就删除」的写作纪律

这个 Playbook 的要点是步骤之后给出的<strong>写作纪律</strong>。

> When in doubt, delete. Keep only prose that changes a decision.
>
> 有疑问就删掉。只保留会改变判断的文字。

编写 Skill 的 Agent 应逐句自问「这句话会改变 Agent 的哪项判断」，无法回答的句子就删除。

主要纪律如下。

- <strong>省略理由说明</strong>……指令应以「做什么」为主；只有缺少理由会使指令含义或适用条件不清楚时，才解释理由。
- <strong>指向信息源，而不复制内容</strong>……指明代码库中实际存在的信息源，例如类型、README 和配置文件（参见 Principle「[<strong>Encode Lessons in Structure</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-encode-lessons-in-structure/SKILL.md)」，[第 21 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dd2d9f)）。
- <strong>委托其他 Skill</strong>……不抄写其他 Skill 的内容，而是给出其路径并交给它处理。
- <strong>将重复工作做成 Skill</strong>……若反复执行同一工作，就建议创建新 Skill。

若 Agent 在工作途中发现 Skill 损坏，不应停止工作，也不能视而不见地绕过；而应<strong>只修复该 Skill，并创建 PR</strong>。

因为混在功能开发 PR 中的 Skill 改动不易在审阅时发现，也无法通过「Eval」衡量效果。

<a id="%E6%A4%9C%E8%A8%BC%E3%82%B9%E3%82%AD%E3%83%AB%E3%82%84%E8%87%AA%E5%88%86%E7%94%A8%E3%81%AEskill%E3%81%AB%E3%81%AF%E3%80%81%E5%B0%82%E7%94%A8%E3%81%AE%E5%85%A5%E5%8F%A3%E3%81%8C%E3%81%82%E3%82%8B"></a>


### 验证 Skill 和个人 Skill 有专门入口

根据目的，有时应使用专门入口，而非这个 Playbook。

<table class="code-line" data-line="98">
<thead class="code-line" data-line="98">
<tr class="code-line" data-line="98">
<th>入口</th>
<th>适用情况</th>
<th>详见章节</th>
</tr>
</thead>
<tbody class="code-line" data-line="100">
<tr class="code-line" data-line="100">
<td><code>/create-verification-skill</code></td>
<td>想新建用于验证应用行为的 Skill</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca" target="_blank">第 26 章</a></td>
</tr>
<tr class="code-line" data-line="101">
<td><code>/maintain-verification-skill</code></td>
<td>验证 Skill 中记录的步骤不再符合应用当前行为</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca" target="_blank">第 26 章</a></td>
</tr>
<tr class="code-line" data-line="102">
<td><code>/automate-me</code></td>
<td>想根据过去的会话记录，将自己的工作方式整理成 Skill</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/46bd1f" target="_blank">第 25 章</a></td>
</tr>
<tr class="code-line" data-line="103">
<td><code>/reflect</code></td>
<td>想将一次会话学到的内容保留在现有 Skill 中</td>
<td><a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f70847" target="_blank">第 33 章</a></td>
</tr>
</tbody>
</table>

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E4%BD%9C%E3%82%8A%E3%81%9F%E3%81%84skill%E3%82%92%E6%99%AE%E9%80%9A%E3%81%AE%E8%A8%80%E8%91%89%E3%81%A7%E6%9B%B8%E3%81%8F"></a>


### 请求写法：用平常的话描述要创建的 Skill

用平常的话提出请求即可。

```
/poteto-mode write a skill for verifying database migrations in this repo
// 编写一个 Skill，验证这个代码库中的数据库迁移。
```

<a id="%E3%80%8Eeval%E3%80%8F%E3%81%AF%E3%80%81%E8%A9%95%E4%BE%A1%E3%81%A0%E3%81%A8%E6%B0%97%E3%81%A5%E3%81%8B%E3%81%9B%E3%81%9A%E3%81%AB%E3%80%81%E5%A4%89%E6%9B%B4%E3%81%8C%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%AE%E8%A1%8C%E5%8B%95%E3%81%AB%E4%B8%8E%E3%81%88%E3%82%8B%E5%8A%B9%E6%9E%9C%E3%82%92%E6%B8%AC%E3%82%8B"></a>


## 「Eval」不让候选察觉评估，衡量改动对 Agent 行为的影响

「<strong>Eval</strong>」用于<strong>在采用之前测试</strong> Skill、结构或提示词的改动如何影响 Agent 行为。

执行「Eval」的 Agent 负责设计实验并汇总结果。这里的实验是让其他 Agent 在实际工作中使用修改后的 Skill，再为其工作表现评分。

实验中会启动多个负责解决任务的 Agent，称为<strong>候选 Agent</strong>。

- <strong>为每位候选 Agent 划分工作目录</strong>……每个目录放入修改后的 Skill 和项目骨架，避免候选彼此影响。
- <strong>为每位候选 Agent 使用不同模型</strong>……例如第一位用 Opus，第二位用 Grok。各模型有自己的偏向；若只用一个模型测试，其偏向就会混入结果。
- <strong>给所有候选 Agent 相同请求</strong>……否则无法区分结果差异来自改动还是请求本身。

候选工作结束后，由使用不同模型的<strong>评审 Agent</strong> 在不知道输出来自哪位候选的情况下评分。

也可以比较改动前后两个版本。此时由一位评审 Agent 不知道输出分别属于哪个版本，按相同标准一次性评审两者。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="131">
<li class="code-line" data-line="131">
<strong>盲测</strong>……不告知评估对象自己正被评估或所比较条件的试验方法</li>
</ul>
</div></aside>

<a id="7%E3%81%A4%E3%81%AE%E6%89%8B%E9%A0%86"></a>


### 七个步骤

1. <strong>确定实验框架</strong>……写明要测试的改动及成功的行为。为评审 Agent 制定 3 至 6 项评分标准（rubric），但不向候选展示
2. <strong>准备去除评估线索的环境</strong>……为每位候选准备工作目录，加入要测试的改动。也要放入真实任务会有的背景，例如项目骨架和候选通常会阅读的 Skill
3. <strong>写一条自然的提示词</strong>……使其像用户可能提出的请求，不泄露测量目标
4. <strong>并行启动 N 位候选 Agent</strong>……遵循 [`/arena`](https://github.com/cursor/plugins/blob/main/pstack/skills/arena/SKILL.md) 的步骤，为每位候选使用不同模型
5. <strong>启动一位盲测评审 Agent</strong>……使用不同于候选的模型家族，不展示模型名称
6. <strong>通过记录而非自述确认是否遵循指令</strong>……候选是否依序打开 Skill 指向的文件并遵循指令，要根据对话记录中实际打开的文件和代码形态来评分
7. <strong>设计实验的 Agent 亲自阅读所有输出</strong>……与评审 Agent 的判定比较，将分歧视为模型偏向或评分标准含糊的信号，再汇总结论

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="145">
<li class="code-line" data-line="145">
<strong>模型家族</strong>……同一开发者以同一系列发布的一组模型（如 OpenAI 的 GPT 系列、xAI 的 Grok 系列）</li>
</ul>
</div></aside>

<a id="%E8%A6%81%E7%82%B9%E3%81%AF%E3%80%81%E6%89%8B%E9%A0%86%E3%82%88%E3%82%8A%E5%85%88%E3%81%AB%E7%BD%AE%E3%81%8B%E3%82%8C%E3%81%9F%E7%9B%B2%E6%A4%9C%E5%8C%96%E3%81%AE%E3%83%AB%E3%83%BC%E3%83%AB"></a>


### 要点是先于步骤列出的盲测规则

根据随附指南，这个 Playbook 的设计着眼于「知道自己正在被评估的 Agent 会改变行为」这一失败模式，称为<strong>观察者效应</strong>。

盲测规则按信息泄漏途径分为三项。

- <strong>候选会看到的文字</strong>……目录名、文件名和提示词中不要出现 `eval`、`test`、`judge` 等词。名称应像用户会取的名称，提示词应像普通请求。
- <strong>候选回答的内容</strong>……不要让候选列举使用了哪些 Skill 或文件，也不要告诉它还有其他候选。
- <strong>评审 Agent 会看到的信息</strong>……为输出贴上无法辨别模型来源的标签，隐去模型名。比较两个版本时，由一位评审 Agent 按同一尺度一次性评审两者。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E4%B8%A1%E6%96%B9%E3%81%AE%E7%89%88%E3%81%AB%E5%90%8C%E3%81%98%E3%82%BF%E3%82%B9%E3%82%AF%E3%82%92%E4%B8%8E%E3%81%88%E3%80%81%E5%80%99%E8%A3%9C%E3%82%92%E7%9B%B2%E6%A4%9C%E3%81%AE%E3%81%BE%E3%81%BE%E3%81%AB%E3%81%99%E3%82%8B%E3%82%88%E3%81%86%E6%9B%B8%E3%81%8F"></a>


### 请求写法：给两个版本相同任务，并要求候选保持盲测状态

随附指南的请求示例比较改动前后的两个版本，要求给两者相同任务，并保持候选对评估不知情。

```
/poteto-mode run the eval playbook on this skill change. same task for both variants, candidates stay blind.
// 对这个 Skill 的修改运行 Eval Playbook。给两个版本安排相同任务，并保持候选版本盲测。
```

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 总结

- <strong>两个 Playbook 的分工</strong>……「<strong>Authoring or modifying a skill</strong>」负责创建或编辑 Skill，「<strong>Eval</strong>」负责衡量效果。
- <strong>Authoring or modifying a skill</strong>……通过 `create-skill` 编写，进行机械验证，再创建 PR。要点是「有疑问就删除，只保留能改变判断的文字」。损坏的 Skill 应通过只包含其修复的独立 PR 处理。
- <strong>Eval</strong>……在采用改动前确认其对行为的效果。候选不知道自己正在接受评估，评审 Agent 不知道模型名称。评分依据的是表明实际打开了哪些文件的对话记录，而非候选自述。

下一章[第 14 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e)介绍创建 PR 的「<strong>Opening a PR</strong>」、使 PR 达到可合并状态的「[<strong>Babysit</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md)」，以及只将已验证的部分并入主线分支（trunk）的「[<strong>Shipping</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/shipping.md)」。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](16-chapter.md) · [下一篇](18-chapter.md) · [English](../en/17-chapter.md)
