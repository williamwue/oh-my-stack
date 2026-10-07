# 第 12 章：重新设计功能、结构与外观

[目录](README.md) · [上一篇](15-chapter.md) · [下一篇](17-chapter.md) · [English](../en/16-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f1e85b) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/4f3e0a)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
本章介绍以下四个 Playbook。

1. [Feature](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/feature.md)
2. [Refactoring](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/refactoring.md)
3. [Prototype](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/prototype.md)
4. [Visual parity](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/visual-parity.md)

四者都会修改代码，区别在于如何处理行为。行为是用户实际收到的结果，例如命令输出或屏幕显示。

它们的处理方式分别如下。

- 添加或改变行为
- 保持行为，只调整结构
- 试验行为以作出设计决定，然后丢弃代码
- 逐像素匹配外观

无论使用哪个 Playbook，<strong>请求中都要写明什么不能改变</strong>。随附指南的实现章节（[`docs/guide/05-build-and-clean.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/05-build-and-clean.md)）也建议在 Feature 请求中写明所需行为及不能改变的内容。

本章依次说明四者的区别、各自的用法以及请求写法。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章结构如下。

- 根据是要添加、保持、试验行为，还是统一外观，选择四个 Playbook 之一
- 「Feature」先确定数据形态，再委派实现并审阅
- 「Refactoring」先固定现有行为，再调整结构
- 「Prototype」用可丢弃的代码低成本地作出设计决定
- 「Visual parity」以基线外观为规格，争取让图像差异为零
- 在请求中写明「什么不能改变」
- 总结

<a id="4%E3%81%A4%E3%81%AEplaybook%E3%81%AF%E3%80%81%E6%8C%AF%E3%82%8B%E8%88%9E%E3%81%84%E3%82%92%E8%BF%BD%E5%8A%A0%E3%81%99%E3%82%8B%E3%81%8B%E3%80%81%E4%BF%9D%E3%81%A4%E3%81%8B%E3%80%81%E8%A9%A6%E3%81%99%E3%81%8B%E3%80%81%E8%A6%8B%E3%81%9F%E7%9B%AE%E3%82%92%E3%81%9D%E3%82%8D%E3%81%88%E3%82%8B%E3%81%8B%E3%81%A7%E9%81%B8%E3%81%B6"></a>


## 根据是添加、保持、试验行为，还是统一外观来选择四个 Playbook

四个 Playbook 按<strong>如何处理行为</strong>区分。随之变化的还有哪些内容不能改变、对什么负责，以及如何验证。

<table class="code-line" data-line="36">
<thead class="code-line" data-line="36">
<tr class="code-line" data-line="36">
<th>项目</th>
<th>「<strong>Feature</strong>」</th>
<th>「<strong>Refactoring</strong>」</th>
<th>「<strong>Prototype</strong>」</th>
<th>「<strong>Visual parity</strong>」</th>
</tr>
</thead>
<tbody class="code-line" data-line="38">
<tr class="code-line" data-line="38">
<td>行为</td>
<td>添加或改变</td>
<td>保持不变</td>
<td>试验（不会进入生产环境）</td>
<td>外观保持不变</td>
</tr>
<tr class="code-line" data-line="39">
<td>负责的内容</td>
<td>设计</td>
<td>契约（现有行为）</td>
<td>设计决策（并非代码）</td>
<td>逐像素一致</td>
</tr>
<tr class="code-line" data-line="40">
<td>验证</td>
<td>在改动实际呈现的位置运行并检查</td>
<td>用真实成果物证明行为与修改前相同</td>
<td>通过观察比较各方案</td>
<td>图像差异为零</td>
</tr>
</tbody>
</table>

四者之间也有交接。「<strong>Prototype</strong>」将比较后选定的设计方案交给「<strong>Feature</strong>」。「<strong>Refactoring</strong>」把途中发现的缺失功能或真实缺陷拆成单独任务，先提交结构改动。如果连设计也要重做，就明确说明这是重做，并转交「<strong>Feature</strong>」。

<a id="%E3%80%8Efeature%E3%80%8F%E3%81%AF%E3%80%81%E3%83%87%E3%83%BC%E3%82%BF%E3%81%AE%E5%BD%A2%E3%82%92%E6%B1%BA%E3%82%81%E3%81%A6%E3%81%8B%E3%82%89%E3%80%81%E5%AE%9F%E8%A3%85%E3%82%92%E4%BB%BB%E3%81%9B%E3%81%A6%E3%83%AC%E3%83%93%E3%83%A5%E3%83%BC%E3%81%99%E3%82%8B"></a>


## 「Feature」先确定数据形态，再委派实现并审阅

「<strong>Feature</strong>」先确定新功能所处理数据的形态（数据字段与类型），再据此实现功能。<strong>主 Agent 对设计负责</strong>，将编写代码交给另一位 Agent。

关键有两点。

- <strong>写代码前先确定数据形态</strong>……Principle「[<strong>Model the Domain</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-model-the-domain/SKILL.md)」（见[第 18 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b)）说明：写代码时选择结构成本低；若事后补救，就容易被视为重构而一再推迟。
- <strong>将写代码的人与审阅差异的人分开</strong>……把编码工作交给子 Agent，由主 Agent 审阅差异（步骤 4）。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A%E8%A8%AD%E8%A8%88%E3%82%92%E6%B1%BA%E3%82%81%E3%80%81%E5%AE%9F%E8%A3%85%E3%82%92%E4%BB%BB%E3%81%9B%E3%80%81%E6%A4%9C%E8%A8%BC%E3%81%97%E3%81%A6%E3%81%8B%E3%82%89pr%E3%82%92%E4%BD%9C%E3%82%8B"></a>


### 步骤：确定设计、委派实现、验证，再创建 PR

共有八步。

1. 对受影响的子系统使用 `/how`（解释代码机制的 Skill，见[第 22 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746)）
2. 用 `/architect`（先于代码绘制设计的 Skill，见[第 24 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346)）并行探索类型和模块结构方案
3. 写下吞吐量检查点（见下表）
4. 将编写代码的工作交给子 Agent
5. 在改动呈现的环境中验证（界面用浏览器，命令用 CLI）
6. 将提交 rebase 成小而有序的提交（参见 Principle「[<strong>Sequence Work into Verifiable Units</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-sequence-verifiable-units/SKILL.md)」，[第 19 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/1fb019)）
7. 若对设计有异议，先运行 `/interrogate`（见[第 27 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/997880)），让多个模型的审阅者质询改动，再继续
8. 执行规定创建 PR 步骤的「[<strong>Opening a PR</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md)」（见[第 14 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e)）

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="67"><strong>rebase</strong>……一种 Git 操作，将提交重新叠放在另一基底上；也可用于调整提交顺序或将多个提交合为一个</p>
</div></aside>

步骤 3 的吞吐量检查点，是<strong>考虑「如何并行划分工作」后写入 TODO 列表的四项内容</strong>。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="73"><strong>TODO 列表</strong>……Agent 在工作开始时创建的待办事项清单（计划）。Cursor 会在聊天界面显示它。用户可据此确认 Agent 完成了哪些步骤、跳过了哪些步骤（<code>skip: &lt;理由&gt;</code>）。<br/>
（随附指南 <a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md" rel="nofollow noopener noreferrer" target="_blank"><code>01-setup.md</code></a>）。</p>
</div></aside>

对于有多个步骤且并非显而易见的工作，「<strong>Feature</strong>」之外的 Playbook 也要求写下这一检查点。

<table class="code-line" data-line="79">
<thead class="code-line" data-line="79">
<tr class="code-line" data-line="79">
<th>项目</th>
<th>填写内容</th>
</tr>
</thead>
<tbody class="code-line" data-line="81">
<tr class="code-line" data-line="81">
<td>需要先完成的步骤</td>
<td>并行执行前必须通过的关卡</td>
</tr>
<tr class="code-line" data-line="82">
<td>独立的工作流</td>
<td>互不冲突的工作（文件或层面不重叠）可以并行执行</td>
</tr>
<tr class="code-line" data-line="83">
<td>共享的可变状态</td>
<td>默认先划分修改对象，避免同时改写同一对象，以消除共享（参见 Principle「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Separate Before Serializing Shared State</strong></a>」）</td>
</tr>
<tr class="code-line" data-line="84">
<td>最小且安全的划分方式</td>
<td>写下可安全划分的工作单元。若由一人完成更合适，也要写明理由</td>
</tr>
</tbody>
</table>

四项中即使有不适用于本次工作的，也不要删除，而要写 `n/a: <理由>` 并说明原因。这样便能区分是经过考虑后认为无需填写，还是漏看了该项。

在步骤 4 中，要指定文件路径、数据形态和成功标准，将实现委派给为 Feature 配置模型的子 Agent（可通过[第 6 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/33f073)提到的 `/setup-pstack` 更改）。如果实现存在多种合理方案，则通过 `/arena`（见[第 24 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/2ad346)）让多个候选并行解决同一问题，再组合各自的优点。

<strong>这项委派是必须的</strong>，不能用 `skip: <理由>` 跳过，也不能以要求「最小改动」的 Principle「[<strong>Laziness Protocol</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-laziness-protocol/SKILL.md)」推翻。目的在于分开实现与审阅，而非节省代码行数。

如果负责实现的子 Agent 无法再启动其他子 Agent，就由该实现 Agent 自己编写代码。发出委派的 Agent 负责审阅差异，因此实现与审阅的职责仍然分开。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E6%8C%AF%E3%82%8B%E8%88%9E%E3%81%84%E3%81%A8%E3%80%81%E5%A4%89%E3%81%88%E3%81%A6%E3%81%AF%E3%81%84%E3%81%91%E3%81%AA%E3%81%84%E3%82%82%E3%81%AE%E3%82%92%E6%9B%B8%E3%81%8F"></a>


### 请求写法：写明所需行为及不能改变的内容

随附指南中的示例如下。

```
/poteto-mode add a --json flag. text output stays byte-identical. verify both forms.
// 添加 --json 标志。文本输出保持逐字节一致。验证两种输出形式。
```

<a id="%E3%80%8Erefactoring%E3%80%8F%E3%81%AF%E3%80%81%E4%BB%8A%E3%81%AE%E6%8C%AF%E3%82%8B%E8%88%9E%E3%81%84%E3%82%92%E5%9B%BA%E5%AE%9A%E3%81%97%E3%81%A6%E3%81%8B%E3%82%89%E6%A7%8B%E9%80%A0%E3%82%92%E5%8B%95%E3%81%8B%E3%81%99"></a>


## 「Refactoring」先固定现有行为，再调整结构

「<strong>Refactoring</strong>」通过重命名、提取、去重、移动等方式，<strong>保持行为，只改变结构</strong>。

主 Agent 负责的是「契约」，即现有行为。可以改变结构，但不能改变现有行为。

也允许连设计一起重做；但在这种情况下，必须明确说明是重做，并转交「<strong>Feature</strong>」。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A%E6%8C%AF%E3%82%8B%E8%88%9E%E3%81%84%E3%82%92%E5%9B%BA%E5%AE%9A%E3%81%97%E3%80%81%E4%B8%8D%E8%A6%81%E3%81%AA%E3%82%B3%E3%83%BC%E3%83%89%E3%82%92%E6%B6%88%E3%81%97%E3%81%A6%E3%81%8B%E3%82%89%E5%8B%95%E3%81%8B%E3%81%97%E3%80%81%E5%90%8C%E7%AD%89%E6%80%A7%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B"></a>


### 步骤：固定行为、删除多余代码、调整结构，再验证等价性

共有八步。

1. 固定行为契约
2. 为缺失的结构命名
3. 为目标结构命名
4. 先删后加
5. 以小步调整
6. 用真实成果物证明行为未改变
7. 确认改动值得保留
8. rebase 成小而有序的提交

下面逐项说明这些步骤。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="127">
<li class="code-line" data-line="127">
<strong>快照测试</strong>……先将输出保存为文件，再与后续运行结果比较，以检测变化的测试</li>
</ul>
</div></aside>

<a id="1.-%E6%8C%AF%E3%82%8B%E8%88%9E%E3%81%84%E3%81%AE%E5%A5%91%E7%B4%84%E3%82%92%E5%9B%BA%E5%AE%9A%E3%81%99%E3%82%8B"></a>


#### 1. 固定行为契约

调整结构前，先编写特性测试（将现有输出原样记录为正确答案的测试）、快照测试，或比较新旧输出的机制，以保证现有行为。仅通过类型检查和 lint，并不意味着行为已被固定。

<a id="2.-%E6%AC%A0%E3%81%91%E3%81%A6%E3%81%84%E3%82%8B%E6%A7%8B%E9%80%A0%E3%81%AB%E5%90%8D%E5%89%8D%E3%82%92%E3%81%A4%E3%81%91%E3%82%8B"></a>


#### 2. 为缺失的结构命名

这一步对应 Principle「<strong>Model the Domain</strong>」（见[第 18 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b)）。

<a id="3.-%E7%9B%AE%E6%A8%99%E3%81%AE%E5%BD%A2%E3%81%AB%E5%90%8D%E5%89%8D%E3%82%92%E3%81%A4%E3%81%91%E3%82%8B"></a>


#### 3. 为目标结构命名

确定模块划分、数据类型及函数之间的调用关系。若目标结构跨越函数边界，就用 `/architect` 探索。

<a id="4.-%E8%BF%BD%E5%8A%A0%E3%81%99%E3%82%8B%E5%89%8D%E3%81%AB%E6%B6%88%E3%81%99"></a>


#### 4. 先删后加

先删除无用代码：例如死代码（未使用的代码），或只有一处调用的包装函数（Wrapper），可将其处理合并到调用处。然后再引入新结构（参见 Principle「[<strong>Subtract Before You Add</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-subtract-before-you-add/SKILL.md)」）。

<a id="5.-%E5%B0%8F%E3%81%95%E3%81%AA%E6%AD%A9%E5%B9%85%E3%81%A7%E5%8B%95%E3%81%8B%E3%81%99"></a>


#### 5. 以小步调整

逐项改动，每一步都要让步骤 1 固定的测试或比较继续通过。如果改变 API 形式，就将所有调用方迁至新 API，并在同一系列改动中删除旧 API（参见 Principle「[<strong>Migrate Callers Then Delete Legacy APIs</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md)」，[第 18 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b)）。

<a id="6.-%E6%8C%AF%E3%82%8B%E8%88%9E%E3%81%84%E3%81%8C%E5%A4%89%E3%82%8F%E3%81%A3%E3%81%A6%E3%81%84%E3%81%AA%E3%81%84%E3%81%93%E3%81%A8%E3%82%92%E3%80%81%E6%9C%AC%E7%89%A9%E3%81%AE%E6%88%90%E6%9E%9C%E7%89%A9%E3%81%A7%E8%A8%BC%E6%98%8E%E3%81%99%E3%82%8B"></a>


#### 6. 用真实成果物证明行为未改变

编译或 build 通过本身不足以证明行为未改变（参见 Principle「[<strong>Prove It Works</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md)」）。

<a id="7.-%E6%AE%8B%E3%81%99%E4%BE%A1%E5%80%A4%E3%81%8C%E3%81%82%E3%82%8B%E3%81%8B%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B"></a>


#### 7. 确认改动值得保留

若差异并未减轻读者负担，就撤销改动（参见 Principle「[<strong>Minimize Reader Load</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-minimize-reader-load/SKILL.md)」，[第 17 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b)）。

<a id="8.-%E5%B0%8F%E3%81%95%E3%81%8F%E9%A0%86%E5%BA%8F%E7%AB%8B%E3%81%A3%E3%81%9F%E3%82%B3%E3%83%9F%E3%83%83%E3%83%88%E3%81%ABrebase%E3%81%99%E3%82%8B"></a>


#### 8. rebase 成小而有序的提交

按删除代码的减法实现、重建结构、后续清理的顺序提交，再执行「<strong>Opening a PR</strong>」。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E6%A7%8B%E9%80%A0%E3%82%92%E5%8B%95%E3%81%8B%E3%81%99%E5%89%8D%E3%81%AB%E4%BB%8A%E3%81%AE%E5%87%BA%E5%8A%9B%E3%82%92%E8%A8%98%E9%8C%B2%E3%81%95%E3%81%9B%E3%82%8B"></a>


### 请求写法：调整结构前先记录现有输出

随附指南中的示例如下。

```
/poteto-mode move parsing into one module, zero behavior change. record the current output first and prove it's unchanged after.
// 把解析逻辑移到一个模块，行为变化必须为零。先记录当前输出，再证明修改后没有变化。
```

「先记录现有输出」对应步骤 1，「之后证明输出未改变」对应步骤 6。

<a id="%E3%80%8Eprototype%E3%80%8F%E3%81%AF%E3%80%81%E6%8D%A8%E3%81%A6%E3%82%8B%E5%89%8D%E6%8F%90%E3%81%AE%E3%82%B3%E3%83%BC%E3%83%89%E3%81%A7%E8%A8%AD%E8%A8%88%E3%82%92%E4%BD%8E%E3%82%B3%E3%82%B9%E3%83%88%E3%81%A7%E6%B1%BA%E3%82%81%E3%82%8B"></a>


## 「Prototype」用可丢弃的代码低成本地作出设计决定

「<strong>Prototype</strong>」制作准备丢弃的原型，<strong>依据观察结果作出设计决定</strong>。

主 Agent 负责设计决策，而非代码。生产环境中的实现由「<strong>Feature</strong>」完成。

因为原型本来就会丢弃，它被认为是唯一一个<strong>反转</strong> Principle「Laziness Protocol」的「最小改动」要求与通常验证标准的 Playbook。

优先求快而非打磨，不要求代码质量，也会提出未经请求的方案。<strong>验证标准由「证明改动正确」变为「观察想作决定的问题」</strong>。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A%E4%BD%95%E3%82%92%E6%B1%BA%E3%82%81%E3%82%8B%E3%81%AE%E3%81%8B%E3%82%92%E3%81%AF%E3%81%A3%E3%81%8D%E3%82%8A%E3%81%95%E3%81%9B%E3%81%9F%E3%81%86%E3%81%88%E3%81%A7%E3%80%81%E3%83%97%E3%83%AD%E3%83%88%E3%82%BF%E3%82%A4%E3%83%97%E3%82%92%E4%BD%9C%E3%82%8A%E3%80%81%E6%AF%94%E8%BC%83%E3%81%99%E3%82%8B"></a>


### 步骤：明确要决定什么，再制作并比较原型

共有六步。

1. 明确原型要用来决定什么
2. 若方向尚未确定，收集参考案例
3. 在远离生产源代码的工作目录中制作
4. 让替代方案可以在同一界面切换比较
5. 实际运行并比较各方案
6. 展示替代方案、取舍与建议作为比较结果

下面逐项说明这些步骤。

<a id="1.-%E3%83%97%E3%83%AD%E3%83%88%E3%82%BF%E3%82%A4%E3%83%97%E3%81%A7%E4%BD%95%E3%82%92%E6%B1%BA%E3%82%81%E3%82%8B%E3%81%AE%E3%81%8B%E3%82%92%E3%81%AF%E3%81%A3%E3%81%8D%E3%82%8A%E3%81%95%E3%81%9B%E3%82%8B"></a>


#### 1. 明确原型要用来决定什么

若涉及外观和操作，需要决定的问题可能是「采用哪种布局」「采用哪种操作方式」「界面元素排得多紧凑」；若能通过运行和观察决定，也可能是「采用哪种行为」「安排在什么时机」「采用哪种方法」。若没有需要决定的问题，就不要制作原型，应转交「<strong>Feature</strong>」。

<a id="2.-%E6%96%B9%E9%87%9D%E3%81%8C%E3%81%BE%E3%81%A0%E6%B1%BA%E3%81%BE%E3%81%A3%E3%81%A6%E3%81%84%E3%81%AA%E3%81%84%E3%81%AA%E3%82%89%E5%8F%82%E8%80%83%E4%BE%8B%E3%82%92%E9%9B%86%E3%82%81%E3%82%8B"></a>


#### 2. 若方向尚未确定，收集参考案例

向用户展示相似功能或界面的案例，在开始制作原型前请其选择外观或操作方式。若已确定，则可省略。

<a id="3.-%E6%9C%AC%E7%95%AA%E3%81%AE%E3%82%BD%E3%83%BC%E3%82%B9%E3%81%8B%E3%82%89%E9%9B%A2%E3%82%8C%E3%81%9F%E4%BD%9C%E6%A5%AD%E7%94%A8%E3%83%87%E3%82%A3%E3%83%AC%E3%82%AF%E3%83%88%E3%83%AA%E3%81%A7%E4%BD%9C%E3%82%8B"></a>


#### 3. 在远离生产源代码的工作目录中制作

不要引入生产用框架、测试和抽象层，只准备足以验证问题的最少代码。

<a id="4.-%E4%BB%A3%E6%9B%BF%E6%A1%88%E3%81%AF%E5%90%8C%E3%81%98%E7%94%BB%E9%9D%A2%E3%81%A7%E5%88%87%E3%82%8A%E6%9B%BF%E3%81%88%E3%81%A6%E6%AF%94%E3%81%B9%E3%82%89%E3%82%8C%E3%82%8B%E3%82%88%E3%81%86%E3%81%AB%E3%81%99%E3%82%8B"></a>


#### 4. 让替代方案可以在同一界面切换比较

为各方案添加标签，用按钮或按键切换（参见 Principle「[<strong>Exhaust the Design Space</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-exhaust-the-design-space/SKILL.md)」，[第 17 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a8e80b)）。

<a id="5.-%E5%90%84%E6%A1%88%E3%82%92%E5%AE%9F%E9%9A%9B%E3%81%AB%E5%8B%95%E3%81%8B%E3%81%97%E3%81%A6%E6%AF%94%E3%81%B9%E3%82%8B"></a>


#### 5. 实际运行并比较各方案

界面外观记录截图，处理时间记录测量值，收集能够回答步骤 1 所确定问题的材料。

<a id="6.-%E6%AF%94%E8%BC%83%E7%B5%90%E6%9E%9C%E3%81%A8%E3%81%97%E3%81%A6%E4%BB%A3%E6%9B%BF%E6%A1%88%E3%80%81%E3%83%88%E3%83%AC%E3%83%BC%E3%83%89%E3%82%AA%E3%83%95%E3%80%81%E6%8E%A8%E5%A5%A8%E3%82%92%E7%A4%BA%E3%81%99"></a>


#### 6. 展示替代方案、取舍与建议作为比较结果

说明各方案的区别及采用后的优缺点，给出推荐方案。决定采用哪个方案后，将其交给「<strong>Feature</strong>」。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E3%80%8C%E6%AF%94%E3%81%B9%E3%81%9F%E3%81%84%E3%81%AE%E3%81%A72%E3%81%A4%E4%BD%9C%E3%81%A3%E3%81%A6%E3%80%8D%E3%81%A8%E6%9B%B8%E3%81%8F"></a>


### 请求写法：写明「想比较，请做两个方案」

pstack 的 [README](https://github.com/cursor/plugins/blob/main/pstack/README.md) 中的示例如下。

```
/poteto-mode build two prototypes of the markdown renderer so we can compare. spawn an agent for each.
// 制作两个 Markdown 渲染器原型以供比较，各安排一个 Agent。
```

「做一个 mock」「试试这种布局」之类的措辞也是<strong>选择这个 Playbook 的信号</strong>。

<a id="%E3%80%8Evisual-parity%E3%80%8F%E3%81%AF%E3%80%81%E5%9F%BA%E6%BA%96%E3%81%AE%E8%A6%8B%E3%81%9F%E7%9B%AE%EF%BC%88%E3%83%99%E3%83%BC%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%B3%EF%BC%89%E3%82%92%E4%BB%95%E6%A7%98%E3%81%A8%E3%81%97%E3%81%A6%E7%94%BB%E5%83%8F%E5%B7%AE%E5%88%86%E3%82%BC%E3%83%AD%E3%82%92%E7%9B%AE%E6%8C%87%E3%81%99"></a>


## 「Visual parity」以基线外观为规格，争取让图像差异为零

「<strong>Visual parity</strong>」用于让两种实现保持一致，或迁移样式机制时，<strong>逐像素保持 UI 外观相同</strong>。

不修改基线，用图像差异来验证是否一致。

通过与否取决于差异是否为零，而非目测。不过，如果基线本身看起来有问题，Agent 不能自行修正基线，而要暂停并询问用户（步骤 2）。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A%E9%83%A8%E5%93%81%E3%81%94%E3%81%A8%E3%81%AB%E7%94%BB%E5%83%8F%E5%B7%AE%E5%88%86%E3%82%BC%E3%83%AD%E3%81%BE%E3%81%A7%E5%9B%9E%E3%81%99"></a>


### 步骤：逐个组件循环，直到图像差异为零

共有五步。

1. 迁移前建立比较基线
2. 禁止为使差异检查通过而走捷径
3. 逐个迁移组件
4. 将每个组件与基线做图像差异比较
5. 按组件或安全的组合执行「Opening a PR」

下面逐项说明这些步骤。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="252">
<li class="code-line" data-line="252">
<strong>worktree</strong>……Git 的一项功能，可从一个仓库创建多个工作目录，同时处理不同分支</li>
</ul>
</div></aside>

<a id="1.-%E7%A7%BB%E8%A1%8C%E3%81%AE%E5%89%8D%E3%81%AB%E3%80%81%E6%AF%94%E8%BC%83%E5%9F%BA%E6%BA%96%EF%BC%88%E3%83%99%E3%83%BC%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%B3%EF%BC%89%E3%82%92%E4%BD%9C%E3%82%8B"></a>


#### 1. 迁移前建立比较基线

建立自动为迁移前组件的多种状态（正常、悬停、禁用等）截图的机制。这些截图将作为迁移后外观的比较基准。

<a id="2.-%E5%B7%AE%E5%88%86%E3%82%92%E9%80%9A%E3%81%99%E3%81%9F%E3%82%81%E3%81%AE%E8%BF%91%E9%81%93%E3%82%92%E7%A6%81%E3%81%98%E3%82%8B"></a>


#### 2. 禁止为使差异检查通过而走捷径

不更改测量装置（步骤 1 中负责截图与比较的机制）、不篡改基线，也不为了让差异检查通过而重组组件结构。若基线看起来有问题，就暂停并询问用户。

<a id="3.-%E9%83%A8%E5%93%81%E3%82%921%E3%81%A4%E3%81%9A%E3%81%A4%E7%A7%BB%E3%81%99"></a>


#### 3. 逐个迁移组件

逐个将组件替换为新实现或新样式方式。可划分 worktree 并行推进，先迁移共享的基础组件。

<a id="4.-%E5%90%84%E9%83%A8%E5%93%81%E3%82%92%E3%83%99%E3%83%BC%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%B3%E3%81%A8%E7%94%BB%E5%83%8F%E5%B7%AE%E5%88%86%E3%81%A7%E6%AF%94%E3%81%B9%E3%82%8B"></a>


#### 4. 将每个组件与基线做图像差异比较

通过 `/loop`（反复唤醒 Agent 的 Cursor 内置命令，见[第 15 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7609)）循环，直到比较差异为零。

<a id="5.-%E9%83%A8%E5%93%81%E3%81%94%E3%81%A8%E3%80%81%E3%81%BE%E3%81%9F%E3%81%AF%E5%AE%89%E5%85%A8%E3%81%AA%E3%81%BE%E3%81%A8%E3%81%BE%E3%82%8A%E3%81%94%E3%81%A8%E3%81%AB%E3%80%8Eopening-a-pr%E3%80%8F%E3%82%92%E5%AE%9F%E8%A1%8C%E3%81%99%E3%82%8B"></a>


#### 5. 按组件或安全的组合执行「Opening a PR」

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E3%80%8C2%E6%9E%9A%E7%9B%AE%E3%81%AE%E7%94%BB%E5%83%8F%E3%81%8C%E6%AD%A3%E3%81%97%E3%81%84%E3%80%8D%E3%81%A8%E3%83%99%E3%83%BC%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%B3%E3%82%92%E4%BC%9D%E3%81%88%E3%82%8B"></a>


### 请求写法：以「第二张图是正确的」指出基线

README 中的示例如下。

```
/poteto-mode the row spacing is too tall when this flag is on. the second image is correct. repro and fix until it matches.
// 启用这个标志时，行距太大。第二张图才是正确效果。先复现，再修到一致。
```

「第二张图是正确的」一句话说明<strong>应以哪种外观为基线</strong>。没有这句话，Agent 只能猜测该对齐哪一张图。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AB%E3%81%AF%E3%80%8C%E4%BD%95%E3%82%92%E5%A4%89%E3%81%88%E3%81%A6%E3%81%AF%E3%81%84%E3%81%91%E3%81%AA%E3%81%84%E3%81%8B%E3%80%8D%E3%82%92%E6%9B%B8%E3%81%8F"></a>


## 在请求中写明「什么不能改变」

无论交给四者中的哪一个，<strong>请求中都要写明「什么不能改变」</strong>。

<table class="code-line" data-line="288">
<thead class="code-line" data-line="288">
<tr class="code-line" data-line="288">
<th>希望通过请求传达的内容</th>
<th>请求措辞示例</th>
<th>分派对象</th>
</tr>
</thead>
<tbody class="code-line" data-line="290">
<tr class="code-line" data-line="290">
<td>需要新行为，但不改变现有输出</td>
<td>「文本输出在字节级保持不变」</td>
<td>「<strong>Feature</strong>」</td>
</tr>
<tr class="code-line" data-line="291">
<td>只想整理结构</td>
<td>「行为变化为零。先记录现有输出」</td>
<td>「<strong>Refactoring</strong>」</td>
</tr>
<tr class="code-line" data-line="292">
<td>想决定哪种设计更好</td>
<td>「做两个原型，以便比较」</td>
<td>「<strong>Prototype</strong>」</td>
</tr>
<tr class="code-line" data-line="293">
<td>想让外观完全一致</td>
<td>「第二张图是正确的。修改到两者一致」</td>
<td>「<strong>Visual parity</strong>」</td>
</tr>
</tbody>
</table>

请求中的那句话会成为判断工作是否完成的标准。例如，若写明「文本输出在字节级保持不变」，文本输出与修改前逐字节相同就成为完成条件之一。

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 总结

- <strong>四者的区别</strong>……「<strong>Feature</strong>」对设计负责，「<strong>Refactoring</strong>」对契约负责，「<strong>Prototype</strong>」对设计决策负责，「<strong>Visual parity</strong>」对逐像素一致负责。
- <strong>Feature</strong>……确定数据形态并写下吞吐量检查点，必须将实现工作交给另一位 Agent。
- <strong>Refactoring</strong>……用测试等方式固定现有行为，先删除多余代码再调整结构，并用真实成果物证明行为未改变。
- <strong>Prototype</strong>……「最小改动」和验证标准发生反转。低成本制作方案并通过观察比较，将选定的方向交给「<strong>Feature</strong>」。
- <strong>Visual parity</strong>……不修改基线，逐个组件循环，直到图像差异为零。
- <strong>请求写法</strong>……写明「什么不能改变」，这便成为完成检查的一部分。

下一章[第 13 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8263c0)介绍用于编写 Skill 的「[<strong>Authoring or modifying a skill</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md)」，以及验证变更效果的「[<strong>Eval</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md)」。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](15-chapter.md) · [下一篇](17-chapter.md) · [English](../en/16-chapter.md)
