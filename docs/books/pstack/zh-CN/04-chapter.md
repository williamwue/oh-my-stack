# 第 2 章：信任成果物，而不是 Agent

[目录](README.md) · [上一篇](03-chapter.md) · [下一篇](05-chapter.md) · [English](../en/04-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/27a183) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/950071)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
把工作交给 Agent 时，应当信任的不是 Agent 的报告，而是<strong>Agent 制作的成果物</strong>。

这是 poteto 在[演讲](https://x.com/poteto/status/2102050467505430555)的第一个主题「信任」中提出的思路。

本章讲解信任成果物意味着什么，以及 pstack 如何将这一思路付诸实践。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章按以下顺序展开。

- 为什么信任成果物，而不是报告
- 验证成果物时，验证什么、怎样验证
- 看回复中的什么，才能判断是否可以放心委派
- 如何逐步达到可以放心委派的状态
- 小结：将信任的对象从报告转移到成果物

<a id="%E3%81%AA%E3%81%9C%E5%A0%B1%E5%91%8A%E3%81%A7%E3%81%AF%E3%81%AA%E3%81%8F%E6%88%90%E6%9E%9C%E7%89%A9%E3%82%92%E4%BF%A1%E9%A0%BC%E3%81%99%E3%82%8B%E3%81%AE%E3%81%8B"></a>


## 为什么信任成果物，而不是报告

之所以信任成果物，是因为<strong>报告不能证明正确性</strong>。

Agent 说「修好了」「应该能运行」，只说明 Agent 自己做出了这样的判断。仅凭报告，无法知道它的判断依据是测试通过、阅读代码后的印象，还是实际运行的结果。  
人若要确认正确性，到头来仍只能自己阅读差异、操作应用。

如果在这种状态下增加工作量，增加的只会是未经验证的变更。演讲也指出，若无法验证却只增加处理量，<strong>增加的不是成果，而是缺陷</strong>。如果质量只能靠人在旁边监督来维持，就谈不上把工作交出去了。

反过来，如果成果物处于可验证的状态，人就无需相信报告，也无需自己把一切重新检查一遍。

pstack 通过验证机制提供这种能力。poteto 在《The Complete Guide to pstack》的 [Part 1](https://x.com/poteto/status/2094457600259842065) 中，将验证（verification）定义为「<strong>Agent 能够检查自己的工作</strong>」。

<a id="%E6%88%90%E6%9E%9C%E7%89%A9%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B%E3%81%A8%E3%81%AF%E3%80%81%E4%BD%95%E3%82%92%E3%81%A9%E3%81%86%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B%E3%81%93%E3%81%A8%E3%81%AA%E3%81%AE%E3%81%8B"></a>


## 验证成果物：验证什么、怎样验证

验证成果物，就是<strong>由 Agent 自己直接检查实物，并以能够留下证据的方式进行检查</strong>。  
具体来说，需要满足以下三个条件。

1. <strong>针对实物</strong>……不只看构建是否成功或通过了多少测试，而要检查运行中的应用、实际写入的值、实际输出的文件
2. <strong>由 Agent 自己执行</strong>……不是由人手动操作应用，而是由 Agent 操作并观察
3. <strong>留下证据</strong>……留下截图、视频、追踪记录、命令输出等材料，供人日后查看并作出判断

下面逐项看看 pstack 的文件如何支持这些条件。

<a id="%E5%AE%9F%E7%89%A9%E3%82%92%E7%9B%B8%E6%89%8B%E3%81%AB%E3%81%99%E3%82%8B"></a>


### 针对实物

第一个条件由 Principle「[<strong>Prove It Works</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md)」规定。开头的一句话是：

> Verify every task output by checking the real thing directly. Do not infer from proxies, self-reports, or "it compiles."
>
> 通过直接检查实物来验证每项工作的输出。不要根据替代指标、自我报告或「编译通过了」进行推断。

这句话并不禁止构建或测试。它禁止的是把「编译通过了」当成应用实际能运行的证据。除了构建与测试，还必须运行并检查实物。

`SKILL.md` 的 `description` 列出三种检查方式作为示例。

1. 实际运行功能
2. 读取实际的值
3. 查看差异

此外，这项原则将缓存的截图列为应避免的间接检查示例。截图看起来像成果物，但如果不知道它是否反映了这次变更，其作为验证依据的说服力就很弱。由此可以看出，查看成果物时，最好还要确认<strong>该成果物是否在这次变更之后生成</strong>。

同样的思路也适用于 Agent 把工作交给子 Agent 的场景。在 [`/poteto-mode`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md) 中，主 Agent 不会原样转交子 Agent 的报告，而是先查看差异再回复。因此，<strong>人收到的回复，在那一刻已经通过成果物接受过一次检查</strong>（[第 8 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/096f3d)）。

<a id="%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E8%87%AA%E8%BA%AB%E3%81%8C%E5%AE%9F%E8%A1%8C%E3%81%99%E3%82%8B"></a>


### 由 Agent 自己执行

第二个条件由用于修复缺陷的「<strong>Bug fix</strong>」Playbook（[`playbooks/bug-fix.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md)）支持。在这个 Playbook 中，负责的 Agent 使用能够操作应用的工具（Playbook 称之为 control 类 Skill），自己在缺陷发生的同一环境中复现问题，也在同一环境中验证修复（[第 11 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6fcb42)）。

操作应用的工具并不包含在 pstack 本体中。用于浏览器和 Electron（构建桌面应用的框架）的 `control-ui`，以及用于 CLI 和 TUI 的 `control-cli`，位于另一个插件 [`cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit) 中。如何为自己的应用制作专用工具，将在[第 3 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5)和[第 36 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)讨论。

只有说明操作手段为何无法触及目标，并且已经用这些手段操作到能够到达的最远处，Agent 才能请求用户代为复现。

例如，登录过程中需要在实体设备上完成双重验证，工具无法继续操作时，Agent 应当说明自己已经操作到哪一步、为何停下，再请用户复现。

我认为这个限制很重要。它保留了向人求助的途径，但要求给出理由，因此 Agent 很难仅仅因为麻烦就把检查工作交还给人。

<a id="%E8%A8%BC%E6%8B%A0%E3%81%8C%E6%AE%8B%E3%82%8B"></a>


### 留下证据

第三个条件由「<strong>Prove It Works</strong>」中的「[Script the check when you can](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md#script-the-check-when-you-can)」一节支持。

> The strongest proof is a deterministic script that re-runs the same comparison, not a one-time eyeball.
>
> 最有力的证据，是可以再次运行相同比较的确定性脚本，而不是一次性的目测。

这一节建议编写能够重复相同比较的脚本，并将执行结果保留在人能够查看的地方。可以重复执行的是脚本，人阅读的是执行结果。

只有在大型移植或迁移等日后需要审计历史的情况下，才需要把证据提交到仓库。如何把检查过程写成脚本，将在[第 3 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5)讨论。

在我看来，最容易被忽略的是第三个条件。即使满足了前两个条件，如果没有留下证据，人最终收到的仍只有一句「我检查过了」，又回到了本章的起点。

实际建立验证机制时，我认为除了确定 Agent 能否检查，还应决定<strong>检查结果是否会留在人能够查看的地方</strong>。

<a id="%E8%BF%94%E7%AD%94%E3%81%AE%E4%BD%95%E3%82%92%E8%A6%8B%E3%82%8C%E3%81%B0%E3%80%81%E4%BB%BB%E3%81%9B%E3%81%A6%E3%82%88%E3%81%84%E3%81%A8%E5%88%A4%E6%96%AD%E3%81%A7%E3%81%8D%E3%82%8B%E3%81%AE%E3%81%8B"></a>


## 看回复中的什么，才能判断是否可以委派

查看回复时，可以根据<strong>每一项「已经做了……」的主张是否附有验证证据</strong>来判断。

例如，只写「缺陷修好了」的回复，无法让人判断其正误。如果附上修复前出现缺陷的输出，以及修复后缺陷不再出现的输出，读者就能自行判断。

<a id="pstack%E3%81%AF%E3%80%81%E4%B8%BB%E5%BC%B5%E3%81%94%E3%81%A8%E3%81%AB%E8%A8%BC%E6%8B%A0%E3%81%8B%E3%80%8C%E6%8E%A8%E6%B8%AC%E3%80%8D%E3%81%AE%E3%83%A9%E3%83%99%E3%83%AB%E3%82%92%E6%B1%82%E3%82%81%E3%82%8B"></a>


### pstack 要求每项主张附有证据，或标为「推测」

在 pstack 中，开始工作时使用的 `/poteto-mode`（[`skills/poteto-mode/SKILL.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md)）对回复的写法规定了以下规则。

> Every claim carries its evidence or its label in the same sentence. Measured, inferred, or guess.
>
> 每项主张都要在同一句话中附上证据或类型标签：经过测量、根据证据推断，还是猜测。

Agent 有证据时就附上证据；没有证据时，就如实写明「这是推断」或「这是猜测」。pstack 随附指南的验证页面（[`docs/guide/06-verify-and-ship.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md)）也用同样的思路区分回复的好坏。

> If a check couldn't run, a good reply says "inconclusive", and you should treat a confident reply without evidence as a red flag.
>
> 如果无法运行检查，好的回复会说「无法得出结论」；没有证据却充满信心的回复应被视为危险信号。

例如，没有运行测试的环境，却回复「已经修复，没有问题」，就是一个危险信号。

<a id="%E8%A8%BC%E6%8B%A0%E3%81%8C%E4%BB%98%E3%81%84%E3%81%9F%E8%BF%94%E7%AD%94%E3%81%AA%E3%82%89%E3%80%81%E8%AA%AD%E3%82%80%E4%BA%BA%E3%81%8C%E8%87%AA%E5%88%86%E3%81%A7%E6%AD%A3%E3%81%97%E3%81%95%E3%82%92%E5%88%A4%E5%AE%9A%E3%81%A7%E3%81%8D%E3%82%8B"></a>


### 有证据的回复让读者能够自行判断正误

该页面列出了适合不同变更类型的检查方式。据此将只有报告的回复与附有证据的回复并列，可以得到下表。中间一列是我为了比较而编写的示例。

<table class="code-line" data-line="114">
<thead class="code-line" data-line="114">
<tr class="code-line" data-line="114">
<th>变更类型</th>
<th>只有报告的回复</th>
<th>附有证据的回复</th>
</tr>
</thead>
<tbody class="code-line" data-line="116">
<tr class="code-line" data-line="116">
<td>CLI 变更</td>
<td>「添加了参数」</td>
<td>实际运行命令的输出</td>
</tr>
<tr class="code-line" data-line="117">
<td>UI 变更</td>
<td>「修正了显示」</td>
<td>在运行中的应用里操作变更后的界面流程所留下的记录</td>
</tr>
<tr class="code-line" data-line="118">
<td>解析器或迁移处理</td>
<td>「修正了转换处理」</td>
<td>再次输入预先保存的数据所得到的结果</td>
</tr>
<tr class="code-line" data-line="119">
<td>性能改进</td>
<td>「应该变快了」</td>
<td>变更前后性能分析结果的比较</td>
</tr>
<tr class="code-line" data-line="120">
<td>写入处理变更</td>
<td>「已经改为写入」</td>
<td>读回写入值的结果</td>
</tr>
</tbody>
</table>

中间一列所说的未必是假话，但没有可供判断是否正确的材料。右边一列则允许读者自行判断。

<a id="%E3%80%8C%E3%83%86%E3%82%B9%E3%83%88%E3%81%8C%E9%80%9A%E3%82%8A%E3%81%BE%E3%81%97%E3%81%9F%E3%80%8D%E3%81%A0%E3%81%91%E3%81%A7%E3%81%AF%E3%80%81%E4%B8%8D%E5%85%B7%E5%90%88%E3%81%8C%E7%9B%B4%E3%81%A3%E3%81%9F%E3%81%A8%E3%81%AF%E5%88%A4%E6%96%AD%E3%81%A7%E3%81%8D%E3%81%AA%E3%81%84"></a>


### 仅凭「测试通过了」无法判断缺陷已经修复

容易犯的错误，是把「测试通过了」放进右边一列。  
「<strong>Bug fix</strong>」Playbook 的「验证修复的步骤（步骤 4）」也指出，仅凭单元测试通过，无法判断缺陷已经修复。即使代码在测试预设的条件下能运行，仍必须再次执行引发用户所报缺陷的同一操作，才能确定该操作中的问题是否修好。

<a id="%E3%83%86%E3%82%B9%E3%83%88%E3%81%8C%E6%8C%AF%E3%82%8B%E8%88%9E%E3%81%84%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%81%A6%E3%81%84%E3%82%8B%E3%81%8B%E3%81%AF%E3%80%81%E9%96%A2%E6%95%B0%E3%81%8C-undefined-%E3%82%92%E8%BF%94%E3%81%97%E3%81%A6%E3%82%82%E9%80%9A%E3%82%8B%E3%81%8B%E3%81%A7%E7%82%B9%E6%A4%9C%E3%81%99%E3%82%8B"></a>


### 用函数返回 `undefined` 时测试是否仍能通过，检查测试是否验证了行为

测试是否检查了<strong>代码的行为</strong>，也就是代码使用者实际获得的结果，可以根据 Principle「[<strong>Test Behavior, Not Implementation</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-test-behavior-not-implementation/SKILL.md)」来判断。

这项原则认为，<strong>测试应该像代码使用者一样调用代码，并将该使用者得到的结果与具体的预期值比较</strong>。测试是否真的观察到了结果，可以用以下问题检查。

> The check: before you keep a test, ask whether it would still pass if every function it imports returned `undefined`. If yes, it observes no behavior and cannot fail for a defect.
>
> 检查方法：保留一项测试之前，先问自己：如果它导入的每个函数都返回 `undefined`，这项测试仍会通过吗？如果会，它就没有观察任何行为，也不会因缺陷而失败。

例如，只检查函数是否被调用的测试，在函数返回 `undefined` 时也能通过。这项原则要求改写或删除这样的测试。

不过，即使通过了这个检查，也只能说明「这项测试检查了代码返回的结果」，不能证明不存在缺陷。

<a id="%E3%80%8Ebug-fix%E3%80%8Fplaybook%E3%81%AF%E3%80%81%E5%A4%B1%E6%95%97%E6%99%82%E3%81%A8%E6%88%90%E5%8A%9F%E6%99%82%E3%81%AE%E5%87%BA%E5%8A%9B%E3%82%92%E8%BF%94%E7%AD%94%E3%81%AB%E4%B8%A6%E3%81%B9%E3%81%95%E3%81%9B%E3%82%8B"></a>


### 「<strong>Bug fix</strong>」Playbook 要求在回复中并列展示失败与成功时的输出

最后，我们通过用于修复缺陷的「<strong>Bug fix</strong>」Playbook，确认回复中应当留下什么。

该 Playbook 对回复内容作出如下规定。这里的「复现」，如[前一节](#%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E8%87%AA%E8%BA%AB%E3%81%8C%E5%AE%9F%E8%A1%8C%E3%81%99%E3%82%8B)所述，是实际执行触发缺陷的操作，并确认同一缺陷出现的工作。

> <strong>Reply:</strong> what was broken, root cause, fix, how you verified. Paste failing-then-passing repro output verbatim.
>
> 回复：说明哪里坏了、根本原因、修复内容，以及如何验证。将复现先失败、后通过时的输出原样贴出。

<strong>发生缺陷时的输出与缺陷消失后的输出，会并列出现在回复中</strong>。

<a id="%E5%AE%89%E5%BF%83%E3%81%97%E3%81%A6%E4%BB%BB%E3%81%9B%E3%82%89%E3%82%8C%E3%82%8B%E7%8A%B6%E6%85%8B%E3%81%AB%E3%80%81%E3%81%A9%E3%81%86%E8%BF%91%E3%81%A5%E3%81%91%E3%81%B0%E3%82%88%E3%81%84%E3%81%AE%E3%81%8B"></a>


## 如何逐步达到可以放心委派的状态

我认为，要逐步达到可以放心委派的状态，应该<strong>找出缺少的检查，再逐一把它们变成机制</strong>。

首先，用以下五项查找缺口。这五项是我将本章讨论的内容整理成的检查问题。

<table class="code-line" data-line="161">
<thead class="code-line" data-line="161">
<tr class="code-line" data-line="161">
<th>要检查的事</th>
<th>如果答案是「否」</th>
</tr>
</thead>
<tbody class="code-line" data-line="163">
<tr class="code-line" data-line="163">
<td>完成条件是否写成可以通过执行判定通过或失败的形式？</td>
<td>在请求中补上「做到什么才算完成」</td>
</tr>
<tr class="code-line" data-line="164">
<td>Agent 能否亲自运行实际应用或成果物？</td>
<td>提供操作应用的手段（<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5" target="_blank">第 3 章</a>）</td>
</tr>
<tr class="code-line" data-line="165">
<td>运行结果是否会作为证据留下？</td>
<td>确定保存截图、输出与追踪记录的步骤</td>
</tr>
<tr class="code-line" data-line="166">
<td>无法检查时，回复是否会如实说明？</td>
<td>允许回答「无法得出结论」，不接受没有证据的成功报告</td>
</tr>
<tr class="code-line" data-line="167">
<td>即使人离开座位，上述四项仍能运转吗？</td>
<td>将无法运转的部分替换成机制（第 3～5 章）</td>
</tr>
</tbody>
</table>

第一项「完成条件」见随附指南的验证页面（[`docs/guide/06-verify-and-ship.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md)）中的「State the finish condition up front」。

> Put what done means in the first prompt, in whatever words fit:
>
> 在最初的提示词中，用合适的话写清楚什么才算完成。

指南给出以下请求作为示例。

```
/poteto-mode add json output to this command. text output stays byte-identical, the json parses, both run against the sample project. show me the evidence.
// このコマンドにJSON出力を加えて。テキスト出力は1バイトも変えない。JSONはパースできる。どちらもサンプルプロジェクトで実行する。証拠を見せて。
```

指南解释说，这样写，<strong>Agent 得到的就是三个能够执行并检查的条件，而不是只能凭感觉判断是否达到的目标</strong>。

写出完成条件，也会同时确定第二项之后的检查问题。写明「文本输出一个字节都不能变」，就需要有比较变更前后输出的步骤。写明「在示例项目中运行」，就意味着 Agent 必须能够运行该项目。

如果无法将完成条件写成可以通过执行判定通过或失败的形式，就该重新考虑规格是否确定、是否有判定通过或失败的手段。

表格右侧一列中的许多机制，仅靠请求文本无法提供。还需要操作应用的工具、保存证据的步骤，以及人离开后也能运转的机制。这些是[第 3 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5)之后的主题。

<a id="%E3%81%BE%E3%81%A8%E3%82%81%EF%BC%9A%E4%BF%A1%E9%A0%BC%E3%81%AE%E7%BD%AE%E3%81%8D%E5%A0%B4%E6%89%80%E3%82%92%E3%80%81%E5%A0%B1%E5%91%8A%E3%81%8B%E3%82%89%E6%88%90%E6%9E%9C%E7%89%A9%E3%81%B8%E7%A7%BB%E3%81%99"></a>


## 小结：将信任的对象从报告转移到成果物

- <strong>为什么信任成果物，而不是报告</strong>……报告无法证明正确性。如果只有人在旁边监督时才能维持质量，就谈不上委派。
- <strong>验证成果物意味着什么</strong>……由 Agent 自己检查实物，并留下证据。pstack 的 Principle「<strong>Prove It Works</strong>」、`/poteto-mode` 和「<strong>Bug fix</strong>」Playbook 支持这些条件。其中容易被忽略的是留下证据。
- <strong>看回复中的什么</strong>……看每项「已经做了……」的主张是否有验证证据。测试通过只能在测试确实检查代码行为时作为判断材料之一，不能证明不存在缺陷。
- <strong>怎样接近目标</strong>……用五项检查找出缺口，再逐一将其变成机制。

以「<strong>Prove It Works</strong>」为代表的 Verification 组 Principle，将在[第 19 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/1fb019)详细讨论。

明确了信任的对象，下一步就是提高信任的方法。如果只验证一次成果物，而下次变更时无法重复同一检查，信任就无法积累。[第 3 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/a88ea5)将讲解提高信任的三种方法，以及如何把经修正的教训留在机制中。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](03-chapter.md) · [下一篇](05-chapter.md) · [English](../en/04-chapter.md)
