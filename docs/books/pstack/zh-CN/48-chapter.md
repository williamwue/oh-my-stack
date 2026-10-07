# 后记

[目录](README.md) · [上一篇](47-chapter.md) · [English](../en/48-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f903e4) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/a465a5)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
<a id="%E6%9C%AC%E6%9B%B8%E3%81%AE%E7%B5%90%E8%AB%96%EF%BC%9A%E4%BB%BB%E3%81%9B%E3%82%89%E3%82%8C%E3%82%8B%E7%AF%84%E5%9B%B2%E3%81%AF%E3%80%81%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%89%E3%82%8C%E3%82%8B%E7%92%B0%E5%A2%83%E3%81%AE%E5%BA%83%E3%81%95%E3%81%A7%E6%B1%BA%E3%81%BE%E3%82%8B"></a>


## 本书的结论：能委托多少工作，取决于可验证环境有多完善

pstack 之旅终于来到终点。

一路走来，本书以 poteto 的演讲和文章为线索，逐一解读了 pstack 的 Playbook、Principle 和 Skill。我们由此得出的结论是：

「<strong>能委托给 Agent 的工作范围，取决于它能在多大范围内自行验证成果，而非它有多聪明</strong>。」

也就是说，<strong>Agent 越能自行启动、操作应用并留下结果证据，使用者就越能把工作交给它，而不必每次亲自运行检查</strong>。

这一结论源自 poteto 的[演讲](https://x.com/poteto/status/2102050467505430555)（[第 1 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/74ae41)）和《The Complete Guide to pstack》[Part 1](https://x.com/poteto/status/2094457600259842065)。<strong>两者都一贯把验证作为基础</strong>。

演讲指出，<strong>值得信任的对象是成果物，而非 Agent；能验证成果物，才有信任的前提</strong>。Part 1 的「Verification is all you need」一节则将<strong>高质量的验证 Skill 视为最重要的 Skill</strong>。

<a id="%E6%9C%80%E5%88%9D%E3%81%AE%E4%B8%80%E6%AD%A9%E3%81%AF%E3%80%81%E5%B0%8F%E3%81%95%E3%81%AA%E4%BB%95%E4%BA%8B%E3%81%A7%E6%A4%9C%E8%A8%BC%E3%81%AE%E3%83%AB%E3%83%BC%E3%83%97%E3%82%92%E4%B8%80%E5%91%A8%E3%81%95%E3%81%9B%E3%82%8B%E3%81%93%E3%81%A8"></a>


## 第一步：让一个小任务完整走过验证循环

pstack 有 23 份 Playbook、23 项 Principle、24 项 Skill，<strong>但无须从明天起就全部用熟</strong>。

起步时，<strong>用一个小任务完整走过一次验证循环就足够</strong>。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="21">
<li class="code-line" data-line="21">
<strong>验证 Skill</strong>……项目专属的 Skill，供 Agent 启动和操作应用、获取证据。</li>
<li class="code-line" data-line="22">
<strong>验证循环</strong>……使用者设定可判定通过或失败的完成条件并委托工作；Agent 在真实应用中检查、修正直至满足条件，再返回证据的完整循环。</li>
</ul>
</div></aside>

接下来提出读完本书后一周内可完成的四个步骤，以及此后扩大委托范围的顺序。

「一周」与「四个步骤」的安排是本书的建议。

但[步骤 1](#1.-%E5%A4%B1%E6%95%97%E3%81%97%E3%81%A6%E3%82%82%E5%9B%B0%E3%82%89%E3%81%AA%E3%81%84%E3%80%81%E6%9C%AC%E7%89%A9%E3%81%AE%E4%BB%95%E4%BA%8B%E3%82%921%E3%81%A4%E9%81%B8%E3%81%B6)（选择真实任务）和[步骤 2](#2.-%E5%AE%8C%E4%BA%86%E3%81%AE%E6%9D%A1%E4%BB%B6%E3%82%92%E3%80%81%E5%90%88%E5%90%A6%E3%81%8C%E5%87%BA%E3%82%8B%E5%BD%A2%E3%81%A7%E6%9B%B8%E3%81%8F)（写出可判定成败的完成条件）的内容，也见于 pstack 随附指南（[`01-setup.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md)、[`06-verify-and-ship.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md)）。

<a id="1%E9%80%B1%E9%96%93%E3%81%A7%E3%81%A7%E3%81%8D%E3%82%8B4%E3%81%A4%E3%81%AE%E3%82%B9%E3%83%86%E3%83%83%E3%83%97"></a>


## 一周内可完成的四个步骤

<a id="1.-%E5%A4%B1%E6%95%97%E3%81%97%E3%81%A6%E3%82%82%E5%9B%B0%E3%82%89%E3%81%AA%E3%81%84%E3%80%81%E6%9C%AC%E7%89%A9%E3%81%AE%E4%BB%95%E4%BA%8B%E3%82%921%E3%81%A4%E9%81%B8%E3%81%B6"></a>


### 1. 选择一项失败也无碍的真实任务

起步时应选择「规模小、即使失败也无碍，但确实需要完成的任务」。

例如修复轻微的显示故障、增加一项 CLI 选项、修正配置值读取方式。这些改动都不大，运行后也能迅速核对结果。

<strong>避免练习题，选择真实任务</strong>。因为这一周的目的，是确认验证循环能否在真实应用中走通。

<a id="2.-%E5%AE%8C%E4%BA%86%E3%81%AE%E6%9D%A1%E4%BB%B6%E3%82%92%E3%80%81%E5%90%88%E5%90%A6%E3%81%8C%E5%87%BA%E3%82%8B%E5%BD%A2%E3%81%A7%E6%9B%B8%E3%81%8F"></a>


### 2. 写出可以判定成败的完成条件

使用者在编写请求前，先决定「确认什么之后才算完成」。

<strong>完成条件不能是「做得好一点」，而要能够通过执行来判定成败</strong>。

随附指南 [`06-verify-and-ship.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md) 的「State the finish condition up front」一节，以为 CLI 增加 JSON 输出为例，示范如何在请求中写出完成条件。

```
/poteto-mode add json output to this command. text output stays byte-identical, the json parses, both run against the sample project. show me the evidence.
// 给这个命令增加 JSON 输出。文本输出必须逐字节保持不变。JSON 必须能够解析。两种输出都要在示例项目中运行。请展示证据。
```

请求中的三个条件都可通过执行来判定成败。

如果使用 pstack，就直接将这些条件放进对 pstack 入口 [`/poteto-mode`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md)（[第 7 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4fda7d)）的请求。

即使不使用 pstack，也可以对任何 Agent 采用同样的写法。

<a id="3.-%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E8%87%AA%E8%BA%AB%E3%81%8C%E6%9C%AC%E7%89%A9%E3%81%AE%E3%82%A2%E3%83%97%E3%83%AA%E3%81%A7%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B%E3%82%88%E3%81%86%E3%80%81%E4%BE%9D%E9%A0%BC%E3%81%99%E3%82%8B"></a>


### 3. 要求 Agent 自行在真实应用中验证

这是最重要的一步。

使用者应要求 Agent 实际启动应用、操作修改过的功能，并<strong>展示结果证据</strong>，而不只是报告测试是否通过。测试通过，并不保证真实界面或输出正确。

例如，《The Complete Guide to pstack》[Part 1](https://x.com/poteto/status/2094457600259842065) 在委托新功能时使用以下写法（[第 36 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)）。

```
/poteto-mode build <description of feature, any useful context>. use /control-app to verify your changes and show me a video and screenshots as proof
// 创建<功能说明和有用的上下文>，用 /control-app 验证改动，并展示视频和截图作为证据。
```

`/control-app` 是文章中为通过 [`/create-verification-skill`](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md) 创建的验证 Skill 使用的名称。

这份请求在功能说明之外，还指定了用哪项验证 Skill 核验（`/control-app`），以及证据格式（视频和截图）。

证据可以是：

- 命令输出
- 界面截图
- 读取已保存数值的结果

如果 Agent 无法自行验证，使用者应<strong>优先消除阻碍它验证的原因</strong>。否则使用者仍得亲自检查结果，委托范围便无法扩大。

本书认为，<strong>Agent 无法验证而停下，通常有以下三个原因</strong>。

- 不知道如何启动应用
- 没有操作应用的手段
- 缺少测试用户或测试数据

<strong>使用者记下 Agent 因哪一种原因受阻，便能明确下一步需要补齐什么</strong>。

其中，启动应用，以及测试用户和数据，也出现在 Part 1 的「Make it Reproducible」一节。

Part 1 在这一节建议，从应用的开发体验（原文称 dev experience）出发，考虑以下三件事。

> seeding a dev database  
> how to handle auth, test users, API calls against a test/staging environment  
> installing and bringing up your dev environment in a consistent way
>
> 为开发数据库填充种子数据（开发或测试时预先放入的数据）  
> 如何处理认证、测试用户，以及对测试或预发布环境的 API 调用  
> 如何始终按一致的步骤安装并启动开发环境

验证 Skill（[第 26 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/03ebca)、[第 36 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/7d7081)）旨在消除 Agent 无法自行验证的状况。第 26 章这样说明了先准备验证 Skill 的理由。

> 使用者先准备验证 Skill，是因为<strong>如果 Agent 无法自行验证工作，不论交给它多少任务，最后仍要人逐项检查，人就会成为阻碍工作推进的瓶颈</strong>。

若使用 pstack，可以尝试运行一次创建验证 Skill 的 [`/create-verification-skill`](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md)。

<a id="4.-%E5%90%8C%E3%81%98%E6%B3%A8%E6%84%8F%E3%82%922%E5%9B%9E%E3%81%97%E3%81%9F%E3%82%89%E3%80%81%E3%81%9D%E3%81%AE%E6%B3%A8%E6%84%8F%E3%82%92%E6%96%87%E7%AB%A0%E3%81%A7%E3%81%AF%E3%81%AA%E3%81%8F%E4%BB%95%E7%B5%84%E3%81%BF%E3%81%AB%E6%AE%8B%E3%81%99"></a>


### 4. 同样的提醒说了两次，就将其写成机制而非文字

<strong>如果使用者在一周内对同一种错误提醒两次，就应考虑能否自动检测它；若能，就把提醒转化为机制</strong>。

这一思路借自 pstack 的 Principle。

「[<strong>Encode Lessons in Structure</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-encode-lessons-in-structure/SKILL.md)」（[第 21 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dd2d9f)）规定了 Agent 发现自己重复写下同一指示时应如何处理。

Agent 会考虑将该指示改为以下任一形式；若可行，就改成机制并删除原文字指示。

- lint 规则（自动检查代码写法的工具规则）
- 元数据 flag（写在文件配置字段中的值）
- 运行时检查（程序运行时核对值或状态是否满足条件）
- 脚本

该 Principle 之所以这样规定，是因为<strong>文字指示只有在读者注意到、记住并遵守时才会生效</strong>。

其原文这样写道。

> Textual instructions are easy to miss. They require the reader to notice, remember, and comply.
>
> 文字指示容易被忽略，需要读者注意、记住并遵守。

对使用者而言，lint 规则、CI 检查和脚本等都可替代文字指示。

例如，若已经提醒两次不要使用 `any`，就加入禁止 `any` 的 lint 规则。

eslint.config.js

```
// 编写 any 时 lint 应报错（假设已引入 typescript-eslint）。
import tseslint from "typescript-eslint";

export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];
```

一旦把提醒变成 lint 或 CI 检查，<strong>从下一周开始，不用使用者再次提醒，也不用依赖 Agent 记住，同类错误就会被自动拦截</strong>。

<a id="%E4%BB%BB%E3%81%9B%E3%82%8B%E7%AF%84%E5%9B%B2%E3%81%AF%E3%80%81%E6%AE%B5%E9%9A%8E%E7%9A%84%E3%81%AB%E5%BA%83%E3%81%92%E3%82%8B"></a>


## 逐步扩大委托范围

使用者走完[一周内可完成的四个步骤](#1%E9%80%B1%E9%96%93%E3%81%A7%E3%81%A7%E3%81%8D%E3%82%8B4%E3%81%A4%E3%81%AE%E3%82%B9%E3%83%86%E3%83%83%E3%83%97)后，就会找到至少一类任务：对于这类任务，无须每次亲自检查差异和运行行为，阅读 Agent 提交的证据即可。

<strong>随后按任务种类逐一扩大这一范围</strong>。

即使在同一类任务内，也要分阶段扩大委托范围。

本书将其分为以下四个阶段。

<table class="code-line" data-line="166">
<thead class="code-line" data-line="166">
<tr class="code-line" data-line="166">
<th>委托阶段</th>
<th>使用者负责</th>
<th>交给 Agent</th>
</tr>
</thead>
<tbody class="code-line" data-line="168">
<tr class="code-line" data-line="168">
<td>1</td>
<td>每次亲自检查差异和运行行为</td>
<td>编写代码</td>
</tr>
<tr class="code-line" data-line="169">
<td>2</td>
<td>阅读 Agent 提交的证据</td>
<td>编写代码，自行运行验证并提交证据</td>
</tr>
<tr class="code-line" data-line="170">
<td>3</td>
<td>设定完成条件并委托任务，只查看完成的 PR 和证据</td>
<td>按任务类型既定的流程（在 pstack 中为 Playbook）调查、修正、验证，并创建 PR</td>
</tr>
<tr class="code-line" data-line="171">
<td>4</td>
<td>确定方针，批准不可撤销的操作（如部署、删除数据）</td>
<td>并行推进多项工作，合并已验证的变更</td>
</tr>
</tbody>
</table>

完成[四个步骤](#1%E9%80%B1%E9%96%93%E3%81%A7%E3%81%A7%E3%81%8D%E3%82%8B4%E3%81%A4%E3%81%AE%E3%82%B9%E3%83%86%E3%83%83%E3%83%97)的任务类型，便到达表中的阶段 2：阅读 Agent 提交的证据。

<strong>不要跳级，应从阶段 1 依次上升</strong>。

如果阶段 2 的证据尚不可信就进入阶段 4，只会并行增加一批无从核实的变更。

演讲中「每月 2,500 份 PR」的数字，也是按顺序完善成果验证环境后才达到的。[第 1 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/74ae41)这样写道。

> 也就是说，必须先让成果物能够被验证，再将由此得到的知识留在代码库中，并在此基础上推进自动化，遵循这一顺序。
>
> 每月 2,500 份 PR 是依次完善这四项之后的结果。

这段引文也概括了演讲的四个主题：信任、提高信任的方法、把代码库当作记忆，以及自动化。

<a id="%E6%9C%80%E5%BE%8C%E3%81%AB"></a>


## 最后

pstack 至今仍在持续更新。

本书以 2026 年 9 月的 pstack version `0.15.5` 为对象。

Playbook、Principle 和 Skill 的名称、数量，以及默认模型（使用者未指定时使用的模型），今后都会继续变化。

即便如此，本书认为，<strong>「先建立让 Agent 自行验证工作成果的环境」这一方针，不会因模型更聪明而失去价值</strong>。因为<strong>模型越聪明，能够承担的任务越大，也就越需要验证机制</strong>。

此外，即使聪明的模型也可能未经验证就自信地断言。

《The Complete Guide to pstack》[Part 2](https://x.com/poteto/status/2097732320606507506) 在「Building up a mental model」一节，这样描述最新的模型。

> Even with the latest frontier models, (this also depends on the quality of the harness), in general I find that they still often state things confidently without backing it up with data or actually reading the code needed to build up a mental model of how it works.
>
> 即使是最新的前沿模型（也取决于 harness 的质量），我仍常看到它们不以数据支持结论，也不实际阅读理解机制所需的代码，却自信地下断言。

不妨先选一项小任务，让验证循环完整走上一轮。

从这里开始，能够委托的范围会逐渐扩大。

感谢您阅读到最后。  
希望本书能为读者提供一些参考，让开发生活有所改善。

祝您享受愉快的 pstack life！

<a id="%E5%8F%82%E8%80%83%E6%96%87%E7%8C%AE"></a>


## 参考文献

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fx.com%2Fpoteto" frameborder="0" id="zenn-embedded__20661f00bf82b" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__20661f00bf82b"></iframe></span><https://x.com/poteto>

<span class="embed-block zenn-embedded zenn-embedded-tweet"><iframe data-content="https%3A%2F%2Fx.com%2Fpoteto%2Fstatus%2F2102050467505430555" frameborder="0" id="zenn-embedded__8ba1ce84f15ef" scrolling="no" src="https://embed.zenn.studio/tweet#zenn-embedded__8ba1ce84f15ef"></iframe></span><https://x.com/poteto/status/2102050467505430555>

<span class="embed-block zenn-embedded zenn-embedded-tweet"><iframe data-content="https%3A%2F%2Fx.com%2Fpoteto%2Fstatus%2F2094457600259842065" frameborder="0" id="zenn-embedded__df0602e9830d5" scrolling="no" src="https://embed.zenn.studio/tweet#zenn-embedded__df0602e9830d5"></iframe></span><https://x.com/poteto/status/2094457600259842065>

<span class="embed-block zenn-embedded zenn-embedded-tweet"><iframe data-content="https%3A%2F%2Fx.com%2Fpoteto%2Fstatus%2F2097732320606507506" frameborder="0" id="zenn-embedded__be81cdd44c57b" scrolling="no" src="https://embed.zenn.studio/tweet#zenn-embedded__be81cdd44c57b"></iframe></span><https://x.com/poteto/status/2097732320606507506>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Ftree%2Fmain%2Fpstack" frameborder="0" id="zenn-embedded__d87bc532a78e2" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__d87bc532a78e2"></iframe></span><https://github.com/cursor/plugins/tree/main/pstack>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2FREADME.md" frameborder="0" id="zenn-embedded__bba85b2ec1f6d" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__bba85b2ec1f6d"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/README.md>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins" frameborder="0" id="zenn-embedded__68e4ae166e039" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__68e4ae166e039"></iframe></span><https://github.com/cursor/plugins>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fdocs%2Fguide%2FREADME.md" frameborder="0" id="zenn-embedded__ba6692d2541ca" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__ba6692d2541ca"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/docs/guide/README.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fdocs%2Fguide%2F06-verify-and-ship.md" frameborder="0" id="zenn-embedded__9692e288216e4" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__9692e288216e4"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fdocs%2Fguide%2F02-poteto-mode.md" frameborder="0" id="zenn-embedded__004c42597048b" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__004c42597048b"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/docs/guide/02-poteto-mode.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fdocs%2Fguide%2F01-setup.md" frameborder="0" id="zenn-embedded__15325f07d9697" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__15325f07d9697"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fdocs%2Fguide%2F07-overnight.md" frameborder="0" id="zenn-embedded__f80235daf8447" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__f80235daf8447"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/docs/guide/07-overnight.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fdocs%2Fguide%2F10-recipes-and-pitfalls.md" frameborder="0" id="zenn-embedded__ab07928c6f1de" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__ab07928c6f1de"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/docs/guide/10-recipes-and-pitfalls.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fdocs%2Fguide%2F05-build-and-clean.md" frameborder="0" id="zenn-embedded__b218afc23a427" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__b218afc23a427"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/docs/guide/05-build-and-clean.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fdocs%2Fguide%2F09-make-it-yours.md" frameborder="0" id="zenn-embedded__5f1cb08c0702c" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__5f1cb08c0702c"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/docs/guide/09-make-it-yours.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fdocs%2Fguide%2F08-principles.md" frameborder="0" id="zenn-embedded__5f00e96409017" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__5f00e96409017"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/docs/guide/08-principles.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fdocs%2Fguide%2F03-understand.md" frameborder="0" id="zenn-embedded__bdb0397b58c11" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__bdb0397b58c11"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/docs/guide/03-understand.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fdocs%2Fguide%2F04-design.md" frameborder="0" id="zenn-embedded__d6221c69257a" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__d6221c69257a"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/docs/guide/04-design.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fbug-fix.md" frameborder="0" id="zenn-embedded__c02eb557794b7" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__c02eb557794b7"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fbabysit.md" frameborder="0" id="zenn-embedded__1bcd6e1b83982" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__1bcd6e1b83982"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fprototype.md" frameborder="0" id="zenn-embedded__c8e8dc2616d53" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__c8e8dc2616d53"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/prototype.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fmulti-phase-plan.md" frameborder="0" id="zenn-embedded__3093c1c76c34b" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__3093c1c76c34b"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fautonomous-run.md" frameborder="0" id="zenn-embedded__72509d1457f98" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__72509d1457f98"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autonomous-run.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Forchestrate.md" frameborder="0" id="zenn-embedded__c9e2e316433d7" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__c9e2e316433d7"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/orchestrate.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Ffeature.md" frameborder="0" id="zenn-embedded__6fac67a83c888" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__6fac67a83c888"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/feature.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Frefactoring.md" frameborder="0" id="zenn-embedded__3ed6a13130ed6" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__3ed6a13130ed6"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/refactoring.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Finvestigation.md" frameborder="0" id="zenn-embedded__5712c20cd0584" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__5712c20cd0584"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/investigation.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fruntime-forensics.md" frameborder="0" id="zenn-embedded__a79a279cbce0a" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__a79a279cbce0a"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/runtime-forensics.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Ftrace-forensics.md" frameborder="0" id="zenn-embedded__f7ee3a0ecd4fe" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__f7ee3a0ecd4fe"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/trace-forensics.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fperf-issue.md" frameborder="0" id="zenn-embedded__5a908015c96b" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__5a908015c96b"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/perf-issue.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fhillclimb.md" frameborder="0" id="zenn-embedded__962ac276a85d8" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__962ac276a85d8"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/hillclimb.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fvisual-parity.md" frameborder="0" id="zenn-embedded__3b0ee1ef698be" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__3b0ee1ef698be"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/visual-parity.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fauthoring-a-skill.md" frameborder="0" id="zenn-embedded__0e24034600ec8" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__0e24034600ec8"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Feval.md" frameborder="0" id="zenn-embedded__36dfc407ea787" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__36dfc407ea787"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fopening-a-pr.md" frameborder="0" id="zenn-embedded__ebe5a5a63cfd2" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__ebe5a5a63cfd2"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fshipping.md" frameborder="0" id="zenn-embedded__96bd38970e6f2" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__96bd38970e6f2"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/shipping.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fsession-pickup.md" frameborder="0" id="zenn-embedded__b29b639f87804" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__b29b639f87804"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/session-pickup.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fpause-safely.md" frameborder="0" id="zenn-embedded__bc189f307dac" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__bc189f307dac"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/pause-safely.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fautopilot-full.md" frameborder="0" id="zenn-embedded__2d274e47496b" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__2d274e47496b"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-full.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fautopilot-stack.md" frameborder="0" id="zenn-embedded__32302b461f654" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__32302b461f654"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-stack.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fplaybooks%2Fworktree-cleanup.md" frameborder="0" id="zenn-embedded__b45ac9569b47a" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__b45ac9569b47a"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-prove-it-works%2FSKILL.md" frameborder="0" id="zenn-embedded__358deb67ce94d" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__358deb67ce94d"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-test-behavior-not-implementation%2FSKILL.md" frameborder="0" id="zenn-embedded__736c43e576426" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__736c43e576426"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-test-behavior-not-implementation/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-build-the-lever%2FSKILL.md" frameborder="0" id="zenn-embedded__f5dd536679b11" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__f5dd536679b11"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-build-the-lever/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-type-system-discipline%2FSKILL.md" frameborder="0" id="zenn-embedded__4483f9846554c" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__4483f9846554c"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-type-system-discipline/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-encode-lessons-in-structure%2FSKILL.md" frameborder="0" id="zenn-embedded__faa96897ef359" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__faa96897ef359"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-encode-lessons-in-structure/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-fix-root-causes%2FSKILL.md" frameborder="0" id="zenn-embedded__771c5d926d275" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__771c5d926d275"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-fix-root-causes/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-subtract-before-you-add%2FSKILL.md" frameborder="0" id="zenn-embedded__5ab141ae0864d" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__5ab141ae0864d"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-subtract-before-you-add/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-migrate-callers-then-delete-legacy-apis%2FSKILL.md" frameborder="0" id="zenn-embedded__23897c1c48edc" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__23897c1c48edc"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-never-block-on-the-human%2FSKILL.md" frameborder="0" id="zenn-embedded__b99d23814a454" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__b99d23814a454"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-never-block-on-the-human/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-laziness-protocol%2FSKILL.md" frameborder="0" id="zenn-embedded__f0d70cd5863cd" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__f0d70cd5863cd"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-laziness-protocol/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-guard-the-context-window%2FSKILL.md" frameborder="0" id="zenn-embedded__b8e6a5e3595c5" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__b8e6a5e3595c5"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-guard-the-context-window/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-make-operations-idempotent%2FSKILL.md" frameborder="0" id="zenn-embedded__b33ae9f616c9e" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__b33ae9f616c9e"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-make-operations-idempotent/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-sequence-verifiable-units%2FSKILL.md" frameborder="0" id="zenn-embedded__e79eabd885c41" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__e79eabd885c41"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-sequence-verifiable-units/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-separate-before-serializing-shared-state%2FSKILL.md" frameborder="0" id="zenn-embedded__1f17aa976785a" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__1f17aa976785a"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-model-the-domain%2FSKILL.md" frameborder="0" id="zenn-embedded__2a15aba539ad5" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__2a15aba539ad5"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-model-the-domain/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-minimize-reader-load%2FSKILL.md" frameborder="0" id="zenn-embedded__54aad4c3519ef" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__54aad4c3519ef"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-minimize-reader-load/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-exhaust-the-design-space%2FSKILL.md" frameborder="0" id="zenn-embedded__513ac85f0b10e" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__513ac85f0b10e"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-exhaust-the-design-space/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-foundational-thinking%2FSKILL.md" frameborder="0" id="zenn-embedded__27b9d044539c" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__27b9d044539c"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-foundational-thinking/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-redesign-from-first-principles%2FSKILL.md" frameborder="0" id="zenn-embedded__846f0be5d8516" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__846f0be5d8516"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-redesign-from-first-principles/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-attack-the-premise%2FSKILL.md" frameborder="0" id="zenn-embedded__0b9d1750973a7" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__0b9d1750973a7"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-attack-the-premise/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-outcome-oriented-execution%2FSKILL.md" frameborder="0" id="zenn-embedded__4bd65f8848098" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__4bd65f8848098"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-outcome-oriented-execution/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-experience-first%2FSKILL.md" frameborder="0" id="zenn-embedded__c21d0104acd3d" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__c21d0104acd3d"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-experience-first/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fprinciple-boundary-discipline%2FSKILL.md" frameborder="0" id="zenn-embedded__1e5f812f2936e" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__1e5f812f2936e"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/principle-boundary-discipline/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2FSKILL.md" frameborder="0" id="zenn-embedded__2a586fec3503c" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__2a586fec3503c"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fcreate-verification-skill%2FSKILL.md" frameborder="0" id="zenn-embedded__aa3e113c73cbe" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__aa3e113c73cbe"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fmaintain-verification-skill%2FSKILL.md" frameborder="0" id="zenn-embedded__c626ea8c81a88" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__c626ea8c81a88"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Freferences%2Fbugbot-triage.md" frameborder="0" id="zenn-embedded__785782289e9f4" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__785782289e9f4"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/references/bugbot-triage.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fno-comments%2FSKILL.md" frameborder="0" id="zenn-embedded__caa2a866653d1" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__caa2a866653d1"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/no-comments/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Freflect%2FSKILL.md" frameborder="0" id="zenn-embedded__19a9c2065728c" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__19a9c2065728c"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/reflect/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fagents%2Fpoteto-agent.md" frameborder="0" id="zenn-embedded__0dd3c9bdb194b" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__0dd3c9bdb194b"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/agents/poteto-agent.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fagents%2Fcomment-sicko.md" frameborder="0" id="zenn-embedded__e2e587ed3f0cd" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__e2e587ed3f0cd"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/agents/comment-sicko.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Farchitect%2FSKILL.md" frameborder="0" id="zenn-embedded__1672b9f289" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__1672b9f289"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/architect/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Ffigure-it-out%2FSKILL.md" frameborder="0" id="zenn-embedded__46ed0164f48a6" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__46ed0164f48a6"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/figure-it-out/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Farena%2FSKILL.md" frameborder="0" id="zenn-embedded__b96d47d3e5ae3" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__b96d47d3e5ae3"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/arena/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Ftree%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fscripts%2Fwatch-pr" frameborder="0" id="zenn-embedded__138595d80b59" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__138595d80b59"></iframe></span><https://github.com/cursor/plugins/tree/main/pstack/skills/poteto-mode/scripts/watch-pr>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Frecall%2FSKILL.md" frameborder="0" id="zenn-embedded__ee109089f02fe" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__ee109089f02fe"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/recall/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fscripts%2Fcheck-plan.mjs" frameborder="0" id="zenn-embedded__84cbbaf2bd82a" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__84cbbaf2bd82a"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/scripts/check-plan.mjs>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fscripts%2Forch%2Forch.ts" frameborder="0" id="zenn-embedded__f07233355258" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__f07233355258"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/scripts/orch/orch.ts>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fpoteto-mode%2Fscripts%2Fworktree-audit.sh" frameborder="0" id="zenn-embedded__d947b15bfc05f" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__d947b15bfc05f"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/scripts/worktree-audit.sh>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fhow%2FSKILL.md" frameborder="0" id="zenn-embedded__64303e9a0b50b" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__64303e9a0b50b"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/how/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fwhy%2FSKILL.md" frameborder="0" id="zenn-embedded__d55764d0416b6" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__d55764d0416b6"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/why/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fteach%2FSKILL.md" frameborder="0" id="zenn-embedded__fc4a409a5a84a" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__fc4a409a5a84a"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/teach/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fblast-radius%2FSKILL.md" frameborder="0" id="zenn-embedded__dd9b31e90c022" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__dd9b31e90c022"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/blast-radius/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Finterrogate%2FSKILL.md" frameborder="0" id="zenn-embedded__db3eeff5df1cb" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__db3eeff5df1cb"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/interrogate/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fswarm%2FSKILL.md" frameborder="0" id="zenn-embedded__fe2351f10d191" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__fe2351f10d191"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/swarm/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fautomate-me%2FSKILL.md" frameborder="0" id="zenn-embedded__b90a29382f0b1" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__b90a29382f0b1"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/automate-me/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fmake-bot-ui%2FSKILL.md" frameborder="0" id="zenn-embedded__96c74ba3dc21a" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__96c74ba3dc21a"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/make-bot-ui/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fbro%2FSKILL.md" frameborder="0" id="zenn-embedded__885f5f4f24542" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__885f5f4f24542"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/bro/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Ftdd%2FSKILL.md" frameborder="0" id="zenn-embedded__14b1aa1453632" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__14b1aa1453632"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/tdd/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fshow-me-your-work%2FSKILL.md" frameborder="0" id="zenn-embedded__49475fab53c9" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__49475fab53c9"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/show-me-your-work/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Ftypescript-best-practices%2FSKILL.md" frameborder="0" id="zenn-embedded__41b570388756d" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__41b570388756d"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/typescript-best-practices/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Funslop%2FSKILL.md" frameborder="0" id="zenn-embedded__55dcf4ba5dbe8" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__55dcf4ba5dbe8"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Ftechnical-writing%2FSKILL.md" frameborder="0" id="zenn-embedded__740c8cc0ca04c" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__740c8cc0ca04c"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/technical-writing/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fsetup-pstack%2FSKILL.md" frameborder="0" id="zenn-embedded__cfbfc7dcdf5ea" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__cfbfc7dcdf5ea"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/setup-pstack/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fshow-me-your-work%2Fscripts%2Flog.sh" frameborder="0" id="zenn-embedded__eb13bea14150a" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__eb13bea14150a"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/show-me-your-work/scripts/log.sh>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Ftypescript-best-practices%2Freferences%2Fpatterns.md" frameborder="0" id="zenn-embedded__e9c55f9ad2691" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__e9c55f9ad2691"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/typescript-best-practices/references/patterns.md>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Ftree%2Fmain%2Fpstack%2Fskills%2Fcreate-verification-skill%2Freferences%2Ffeature-map-example" frameborder="0" id="zenn-embedded__f23f4de1d35b1" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__f23f4de1d35b1"></iframe></span><https://github.com/cursor/plugins/tree/main/pstack/skills/create-verification-skill/references/feature-map-example>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fpull%2F422" frameborder="0" id="zenn-embedded__c8fe01a6083c3" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__c8fe01a6083c3"></iframe></span><https://github.com/cursor/plugins/pull/422>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Ftree%2Fmain%2Fcursor-team-kit" frameborder="0" id="zenn-embedded__c86e67e55e6de" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__c86e67e55e6de"></iframe></span><https://github.com/cursor/plugins/tree/main/cursor-team-kit>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Ftree%2Fmain%2Fthermos" frameborder="0" id="zenn-embedded__3bedcc76fb549" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__3bedcc76fb549"></iframe></span><https://github.com/cursor/plugins/tree/main/thermos>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fcursor.com%2Fja%2Fchangelog%2F0-48-x" frameborder="0" id="zenn-embedded__d390a04026e43" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__d390a04026e43"></iframe></span><https://cursor.com/ja/changelog/0-48-x>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fgithub.com%2Fpoteto%2Fverification-skill-example" frameborder="0" id="zenn-embedded__4d1f5b4ac486e" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__4d1f5b4ac486e"></iframe></span><https://github.com/poteto/verification-skill-example>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fdiataxis.fr%2F" frameborder="0" id="zenn-embedded__7f9f39c2211b3" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__7f9f39c2211b3"></iframe></span><https://diataxis.fr/>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fgithub.com%2Fmattpocock%2Fskills" frameborder="0" id="zenn-embedded__d7dd67caba383" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__d7dd67caba383"></iframe></span><https://github.com/mattpocock/skills>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fcursor.com%2Fja%2Fdocs%2Fbugbot" frameborder="0" id="zenn-embedded__971e307eb874c" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__971e307eb874c"></iframe></span><https://cursor.com/ja/docs/bugbot>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Ftailscale.com%2F" frameborder="0" id="zenn-embedded__8f7aab9f73b8d" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__8f7aab9f73b8d"></iframe></span><https://tailscale.com/>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fstylexjs.com%2F" frameborder="0" id="zenn-embedded__54815899cb9ed" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__54815899cb9ed"></iframe></span><https://stylexjs.com/>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fx.ai%2Fbot%2Fmarketplace%2Fbots%2Fdr-eggbot-v2" frameborder="0" id="zenn-embedded__6ce01d6e3707" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__6ce01d6e3707"></iframe></span><https://x.ai/bot/marketplace/bots/dr-eggbot-v2>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fmattpocock%2Fskills%2Fblob%2Fmain%2Fskills%2Fengineering%2Fgrill-with-docs%2FSKILL.md" frameborder="0" id="zenn-embedded__f942a18247f0b" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__f942a18247f0b"></iframe></span><https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fmattpocock%2Fskills%2Fblob%2Fmain%2Fskills%2Fproductivity%2Fgrilling%2FSKILL.md" frameborder="0" id="zenn-embedded__0867193b8bde7" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__0867193b8bde7"></iframe></span><https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fmattpocock%2Fskills%2Fblob%2Fmain%2Fskills%2Fengineering%2Fdomain-modeling%2FSKILL.md" frameborder="0" id="zenn-embedded__e3c7be25c4fc1" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__e3c7be25c4fc1"></iframe></span><https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fmattpocock%2Fskills%2Fblob%2Fmain%2Fskills%2Fengineering%2Fdomain-modeling%2FADR-FORMAT.md" frameborder="0" id="zenn-embedded__327149b3a3368" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__327149b3a3368"></iframe></span><https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/ADR-FORMAT.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fmattpocock%2Fskills%2Fblob%2Fmain%2Fskills%2Fengineering%2Fdomain-modeling%2FGLOSSARY-FORMAT.md" frameborder="0" id="zenn-embedded__781343534bb82" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__781343534bb82"></iframe></span><https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/GLOSSARY-FORMAT.md>

<span class="embed-block zenn-embedded zenn-embedded-tweet"><iframe data-content="https%3A%2F%2Fx.com%2Fpoteto%2Fstatus%2F2087977008253071816" frameborder="0" id="zenn-embedded__cc19f30cf7b98" scrolling="no" src="https://embed.zenn.studio/tweet#zenn-embedded__cc19f30cf7b98"></iframe></span><https://x.com/poteto/status/2087977008253071816>

<span class="embed-block zenn-embedded zenn-embedded-tweet"><iframe data-content="https%3A%2F%2Fx.com%2Fpoteto%2Fstatus%2F2104744961904394699" frameborder="0" id="zenn-embedded__e132ceaa70498" scrolling="no" src="https://embed.zenn.studio/tweet#zenn-embedded__e132ceaa70498"></iframe></span><https://x.com/poteto/status/2104744961904394699>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Farchitect%2Freferences%2Fdesign-red-flags.md" frameborder="0" id="zenn-embedded__29a208091246" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__29a208091246"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/architect/references/design-red-flags.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fcreate-verification-skill%2Freferences%2Ffeature-map-example%2Fcreate-note.md" frameborder="0" id="zenn-embedded__f32a1c77757d2" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__f32a1c77757d2"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/references/feature-map-example/create-note.md>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fcursor%2Fplugins%2Fblob%2Fmain%2Fpstack%2Fskills%2Fcreate-verification-skill%2Freferences%2Ffeature-map-example%2Fsearch.md" frameborder="0" id="zenn-embedded__86a166b8523f7" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__86a166b8523f7"></iframe></span><https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/references/feature-map-example/search.md>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fcursor.com%2Fja%2Fblog%2Fcloud-agent-environment" frameborder="0" id="zenn-embedded__fa0ec71f0b0e6" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__fa0ec71f0b0e6"></iframe></span><https://cursor.com/ja/blog/cloud-agent-environment>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fcursor.com%2Fja%2Fdocs%2Fcloud-agent%2Fsecurity-network" frameborder="0" id="zenn-embedded__6d8aec224ae7d" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__6d8aec224ae7d"></iframe></span><https://cursor.com/ja/docs/cloud-agent/security-network>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fgithub.com%2Fanthropics%2Fskills" frameborder="0" id="zenn-embedded__c9f0b0bce9a0b" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__c9f0b0bce9a0b"></iframe></span><https://github.com/anthropics/skills>

<span class="embed-block zenn-embedded zenn-embedded-github"><iframe data-content="https%3A%2F%2Fgithub.com%2Fanthropics%2Fskills%2Fblob%2Fmain%2Fskills%2Fskill-creator%2Fscripts%2Fquick_validate.py" frameborder="0" id="zenn-embedded__060e5f44e8a3a" loading="lazy" scrolling="no" src="https://embed.zenn.studio/github#zenn-embedded__060e5f44e8a3a"></iframe></span><https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/quick_validate.py>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fgithub.com%2Fagentskills%2Fagentskills%2Ftree%2Fmain%2Fskills-ref" frameborder="0" id="zenn-embedded__26e483d23417a" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__26e483d23417a"></iframe></span><https://github.com/agentskills/agentskills/tree/main/skills-ref>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fdevelopers.google.com%2Fstyle" frameborder="0" id="zenn-embedded__28557c117f61f" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__28557c117f61f"></iframe></span><https://developers.google.com/style>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fwww.asd-ste100.org%2F" frameborder="0" id="zenn-embedded__24fc08549be18" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__24fc08549be18"></iframe></span><https://www.asd-ste100.org/>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fweb.stanford.edu%2F~ouster%2Fcgi-bin%2Fbook.php" frameborder="0" id="zenn-embedded__96a2f534170e5" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__96a2f534170e5"></iframe></span><https://web.stanford.edu/~ouster/cgi-bin/book.php>

<span class="embed-block zenn-embedded zenn-embedded-card"><iframe data-content="https%3A%2F%2Fzenn.dev%2Fsc30gsw%2Farticles%2F953334f11df507" frameborder="0" id="zenn-embedded__6e4e17b82167a" loading="lazy" scrolling="no" src="https://embed.zenn.studio/card#zenn-embedded__6e4e17b82167a"></iframe></span><https://zenn.dev/sc30gsw/articles/953334f11df507>
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](47-chapter.md) · [English](../en/48-chapter.md)
