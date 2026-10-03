# 第 10 章：调查并复现问题

[目录](README.md) · [上一篇](13-chapter.md) · [下一篇](15-chapter.md) · [English](../en/14-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ea525d) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/b77ae2)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
本章介绍以下三个 Playbook。

1. [Investigation](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/investigation.md)
2. [Runtime forensics](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/runtime-forensics.md)
3. [Trace forensics](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/trace-forensics.md)

这三个 Playbook 都用于调查并得出答案，不修改代码。<strong>成果物是有依据的回答或诊断，而非修复</strong>。

应选择哪个 Playbook，取决于调查可用的信息和证据：是阅读源代码与历史就能回答，还是能测量正在运行的进程，或只能分析已取得的性能分析文件和转储（记录运行状态的文件）。

本章依次说明三者的共同规则及各自的用法。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章结构如下。

- 三个 Playbook 都不修改代码，依据调查可用的信息或证据来选择
- 「Investigation」对可通过阅读代码或历史回答的问题给出带引用的答案
- 「Runtime forensics」停止从源代码猜测，转而测量正在运行的进程
- 「Trace forensics」不重新运行程序，将收到的成果物转成可查询的形式后读取
- 总结

<a id="3%E3%81%A4%E3%81%AEplaybook%E3%81%AF%E3%82%B3%E3%83%BC%E3%83%89%E3%82%92%E5%A4%89%E3%81%88%E3%81%9A%E3%80%81%E8%AA%BF%E6%9F%BB%E3%81%AB%E4%BD%BF%E3%81%88%E3%82%8B%E6%83%85%E5%A0%B1%E3%82%84%E8%A8%BC%E6%8B%A0%E3%81%A7%E9%81%B8%E3%81%B6"></a>


## 三个 Playbook 都不修改代码，依据可用信息和证据来选择

如前所述，三个 Playbook <strong>依据调查可用的信息或证据来区分</strong>。

选择方式如下。

- <strong>问题可通过阅读代码或历史来回答</strong>……「<strong>Investigation</strong>」
- <strong>缺陷或延迟等症状仍在发生，且自己能够测量运行中的进程</strong>……「<strong>Runtime forensics</strong>」
- <strong>只有事后提供的性能分析文件或转储（记录运行状态的文件）</strong>……「<strong>Trace forensics</strong>」

<table class="code-line" data-line="32">
<thead class="code-line" data-line="32">
<tr class="code-line" data-line="32">
<th>项目</th>
<th>「<strong>Investigation</strong>」</th>
<th>「<strong>Runtime forensics</strong>」</th>
<th>「<strong>Trace forensics</strong>」</th>
</tr>
</thead>
<tbody class="code-line" data-line="34">
<tr class="code-line" data-line="34">
<td>证据</td>
<td>源代码与历史</td>
<td>从运行中的进程取得的测量数据</td>
<td>事后提供的成果物（cpuprofile、spindump、heap snapshot 等）</td>
</tr>
<tr class="code-line" data-line="35">
<td>重新运行程序</td>
<td>不运行</td>
<td>不运行（向运行中的进程加入测量代码，以验证假设）</td>
<td>不运行</td>
</tr>
<tr class="code-line" data-line="36">
<td>下一步</td>
<td>交还用户，再转向「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Bug fix</strong></a>」或「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/feature.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Feature</strong></a>」</td>
<td>转向「<strong>Bug fix</strong>」或「<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/perf-issue.md" rel="nofollow noopener noreferrer" target="_blank"><strong>Perf issue</strong></a>」</td>
<td>转向「<strong>Bug fix</strong>」或「<strong>Perf issue</strong>」</td>
</tr>
</tbody>
</table>

即便同样是「很慢」的反馈，能否测量正在运行的进程，或是否只有收到的文件可供分析，也会改变所选的 Playbook。不同类型的证据还决定了允许采取哪些操作。

「<strong>Runtime forensics</strong>」允许向运行中的进程加入日志或测量代码，以验证判断。而「<strong>Trace forensics</strong>」只能读取收到的性能分析文件或转储，<strong>禁止重新运行程序重新采集</strong>。

<a id="%E3%80%8Einvestigation%E3%80%8F%E3%81%AF%E3%80%81%E3%82%B3%E3%83%BC%E3%83%89%E3%82%84%E5%B1%A5%E6%AD%B4%E3%82%92%E8%AA%AD%E3%82%93%E3%81%A7%E7%AD%94%E3%81%88%E3%82%89%E3%82%8C%E3%82%8B%E8%B3%AA%E5%95%8F%E3%81%AB%E3%80%81%E5%BC%95%E7%94%A8%E3%81%A4%E3%81%8D%E3%81%A7%E7%AD%94%E3%81%88%E3%82%8B"></a>


## 「Investigation」对可通过阅读代码或历史回答的问题给出带引用的答案

<a id="%E5%BD%B9%E5%89%B2%EF%BC%9A%E3%82%B3%E3%83%BC%E3%83%89%E3%82%84%E5%B1%A5%E6%AD%B4%E3%82%92%E8%AA%AD%E3%82%93%E3%81%A7%E7%AD%94%E3%81%88%E3%81%8C%E5%87%BA%E3%82%8B%E8%B3%AA%E5%95%8F%E3%81%AB%E7%AD%94%E3%81%88%E3%82%8B"></a>


### 作用：回答可通过阅读代码或历史解决的问题

「<strong>Investigation</strong>」用于回答<strong>只需阅读源代码或变更历史即可解决的问题</strong>，例如「X 如何运作」「Y 为什么这样设计」「Z 真的没问题吗」「X 与 Y 应选哪个」。

成果物是附有引用的解释或建议。不创建 PR，也不负责跟进 PR 直至可以合并（「[<strong>Babysit</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md)」；参见[第 14 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e)）。如果途中发现需要修改代码，就交还用户，不自行开始修复。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A%E5%87%BA%E5%8A%9B%E3%81%AE%E5%BD%A2%E3%81%BE%E3%81%A7%E6%B1%BA%E3%82%81%E3%82%8B4%E3%81%A4%E3%81%AE%E6%89%8B%E9%A0%86"></a>


### 步骤：四步确定输出形式

1. 将问题交给 `/how`（说明代码机制或所在位置的 Skill）。若问题问「为什么」，也交给 `/why`，附引用调查设计理由和来历（两者见[第 22 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/788746)）
2. 将吞吐量检查点写成一行「不适用」
3. 按 `/how` 的五个相同标题（概要、主要概念、运作方式、位置、注意事项）写作。比较选项时，给出附有取舍表的建议
4. 对回答运行 `/unslop`（去除 AI 常写的套话的 Skill；见[第 32 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/44857b)）

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="58">
<li class="code-line" data-line="58">
<p class="code-line" data-line="58"><strong>TODO 列表</strong>……Agent 在工作开始时创建的待办事项清单（计划）。Cursor 会在聊天界面显示它。用户可据此确认 Agent 完成了哪些步骤、跳过了哪些步骤（<code>skip: &lt;理由&gt;</code>；参见随附指南 <a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md" rel="nofollow noopener noreferrer" target="_blank"><code>01-setup.md</code></a>）。</p>
</li>
<li class="code-line" data-line="59">
<p class="code-line" data-line="59"><strong>吞吐量检查点</strong>……这是将「工作可以怎样并行划分」的思考结果记录到 TODO 列表时使用的四项内容，如下所示。</p>
<ul class="code-line" data-line="60">
<li class="code-line" data-line="60">需要先完成的步骤</li>
<li class="code-line" data-line="61">独立的工作流</li>
<li class="code-line" data-line="62">共享的可变状态</li>
<li class="code-line" data-line="63">最小且安全的划分方式</li>
</ul>
<p class="code-line" data-line="65">对于有多个步骤且并非显而易见的工作，每个 Playbook 都要求写出这四项（详见<a href="https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f1e85b" target="_blank">第 12 章</a>）。</p>
<p class="code-line" data-line="67">「<strong>Investigation</strong>」只调查、不修改代码，没有需要分工的工作，因此无需写四项，只写一行「不适用」。</p>
</li>
</ul>
</div></aside>

如果被问到「真的没问题吗」，应<strong>先作出自己的判断并说明理由，而非直接附和对方的看法</strong>；若前提有误，也应指出。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9A%E3%80%8C%E6%96%B0%E3%81%97%E3%81%84%E3%82%BF%E3%82%B9%E3%82%AF%E3%80%8D%E3%80%8C%E3%81%BE%E3%81%A0%E3%82%B3%E3%83%BC%E3%83%89%E3%81%AF%E5%A4%89%E3%81%88%E3%81%AA%E3%81%84%E3%81%A7%E3%80%8D%E3%81%A8%E6%9B%B8%E3%81%8F"></a>


### 请求写法：写明「新任务」「暂时不要修改代码」

在请求中写明「新任务」和「暂时不要修改代码」，便会重新选择 Playbook，并施加不修改代码的约束。随附指南（[docs/guide/02-poteto-mode.md](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/02-poteto-mode.md)）给出的示例如下。

```
/poteto-mode new task. figure out why the cache entry survives logout. don't change any code yet.
// 新しいタスク。ログアウト後もキャッシュのエントリが残る理由を突き止めて。まだコードは変えないで。
```

也可以在请求中指定回答形式。「The Complete Guide to pstack」的 [Part 2](https://x.com/poteto/status/2097732320606507506) 给出了以下示例。

```
/poteto-mode investigate why background workers periodically fail with timeout errors. give me a breakdown of what we know, what data you used, and your best hypotheses.
// バックグラウンドのワーカーがときどきタイムアウトのエラーで失敗する理由を調べて。分かっていること、使ったデータ、有力な仮説を分けて示して。
```

这种请求方式与 `/poteto-mode` 中「[Writing the reply](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#writing-the-reply)」一节的要求相同：<strong>每项主张都要在同一句中附上证据，或标明它是测量所得、推断所得还是猜测</strong>。在请求中也要求作这种区分，便能辨认回答中的哪些句子是经确认的事实，哪些只是猜测。

<a id="%E3%80%8Eruntime-forensics%E3%80%8F%E3%81%AF%E3%80%81%E3%82%BD%E3%83%BC%E3%82%B9%E3%81%8B%E3%82%89%E3%81%AE%E6%8E%A8%E6%B8%AC%E3%82%92%E3%82%84%E3%82%81%E3%81%A6%E7%94%9F%E3%81%8D%E3%81%9F%E3%83%97%E3%83%AD%E3%82%BB%E3%82%B9%E3%82%92%E8%A8%88%E6%B8%AC%E3%81%99%E3%82%8B"></a>


## 「Runtime forensics」停止从源代码猜测，转而测量正在运行的进程

<a id="%E5%BD%B9%E5%89%B2%EF%BC%9A%E5%AE%9F%E8%A1%8C%E6%99%82%E3%81%AE%E7%97%87%E7%8A%B6%E3%82%92%E3%80%81%E7%94%9F%E3%81%8D%E3%81%9F%E3%83%97%E3%83%AD%E3%82%BB%E3%82%B9%E3%81%AE%E8%A8%88%E6%B8%AC%E3%81%8B%E3%82%89%E8%A8%BA%E6%96%AD%E3%81%99%E3%82%8B"></a>


### 作用：通过测量正在运行的进程来诊断运行时症状

「<strong>Runtime forensics</strong>」用于诊断内存泄漏、空闲时 CPU 空转、显示异常等运行时症状；它<strong>测量正在运行的进程</strong>，而不是从源代码猜测。

阅读源代码可以找到可能导致问题的路径。但对于运行时症状，关键在于实际执行了哪条路径。需要测量正在运行的进程才能确认。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A%E4%BF%A1%E5%8F%B7%E3%82%92%E5%8F%96%E3%82%8B%E3%80%81%E8%A8%BC%E6%8B%A0%E3%81%B8%E7%B5%9E%E3%82%8B%E3%80%81%E4%BB%95%E7%B5%84%E3%81%BF%E3%82%92%E8%A8%BC%E6%98%8E%E3%81%99%E3%82%8B%E3%80%81%E3%82%BD%E3%83%BC%E3%82%B9%E3%81%AB%E5%AF%BE%E5%BF%9C%E3%81%A5%E3%81%91%E3%82%8B"></a>


### 步骤：采集信号、缩小证据范围、证明机制、映射到源代码

1. <strong>采集实时信号</strong>
   - 使用符合症状的 control 系 Skill，采集 CPU 性能分析文件、堆快照或 CDP（Chrome DevTools Protocol）轨迹
   - control 系 Skill 不随 pstack 提供；此处指 [`cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit) 中的 `control-ui` 和 `control-cli`
2. <strong>缩小范围，找到决定性证据</strong>
   - 查找热路径（占用大部分执行时间的路径）上的函数、泄漏对象的引用链，或无输入却持续运行的循环
   - 让子 Agent 分析大型成果物（参见 Principle「[<strong>Guard the Context Window</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-guard-the-context-window/SKILL.md)」，[第 20 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/c155cc)）
3. <strong>相信结论前先证明机制</strong>
   - 验证假设所指出的、引发症状的机制
   - 可以向运行中的进程插入测量代码，或不重启进程而直接修改正在运行的代码（热修复）来验证
4. <strong>映射到源代码</strong>
   - 将原因追溯到源代码中的文件、符号（如函数名）和具体行

除非受到请求，否则不作修复；查明原因后交给「<strong>Bug fix</strong>」或「<strong>Perf issue</strong>」。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="115">
<li class="code-line" data-line="115">
<strong>CPU 性能分析文件</strong>……记录一段时间内哪些处理占用了 CPU</li>
<li class="code-line" data-line="116">
<strong>CDP 轨迹</strong>……使用 Chrome DevTools Protocol 记录的浏览器内部处理日志，可分析 JavaScript 执行、页面布局与绘制等</li>
<li class="code-line" data-line="117">
<strong>堆快照</strong>……记录某一时刻应用保存在内存中的数据及其引用关系，可用于调查内存泄漏等问题</li>
</ul>
</div></aside>

<a id="%E3%80%8Etrace-forensics%E3%80%8F%E3%81%AF%E3%80%81%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%A0%E3%82%92%E5%86%8D%E5%AE%9F%E8%A1%8C%E3%81%9B%E3%81%9A%E3%80%81%E6%B8%A1%E3%81%95%E3%82%8C%E3%81%9F%E6%88%90%E6%9E%9C%E7%89%A9%E3%82%92%E5%95%8F%E3%81%84%E5%90%88%E3%82%8F%E3%81%9B%E3%81%A7%E3%81%8D%E3%82%8B%E5%BD%A2%E3%81%AB%E3%81%97%E3%81%A6%E8%AA%AD%E3%82%80"></a>


## 「Trace forensics」不重新运行程序，将收到的成果物转成可查询的形式后读取

<a id="%E5%BD%B9%E5%89%B2%EF%BC%9A%E5%8F%96%E5%BE%97%E6%B8%88%E3%81%BF%E3%81%AE%E6%88%90%E6%9E%9C%E7%89%A9%E3%82%92%E8%AA%AD%E3%82%80%E3%81%93%E3%81%A8%E3%81%AB%E5%BE%B9%E3%81%99%E3%82%8B"></a>


### 作用：专注读取已经取得的成果物

「<strong>Trace forensics</strong>」用于读取用户环境中采集、事后交付的 CPU 性能分析文件、spindump、堆快照等成果物，<strong>不重新运行程序，而是读取这些材料来诊断原因</strong>。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="127">
<li class="code-line" data-line="127">
<strong>spindump</strong>……用于分析无响应应用处理状态的 macOS 诊断报告</li>
</ul>
</div></aside>

与「<strong>Runtime forensics</strong>」的区别在于，采集已经完成。成果物是固定数据，因此只需专注读取。为使 Playbook 可在任何环境中使用，工具也限定为 DevTools 或 trace 解析器等通用工具。

<a id="%E6%89%8B%E9%A0%86%EF%BC%9A%E6%88%90%E6%9E%9C%E7%89%A9%E3%82%92%E8%AA%AD%E3%81%BF%E8%BE%BC%E3%82%80%E3%80%81%E5%BD%A2%E3%82%92%E6%95%B4%E3%81%88%E3%82%8B%E3%80%81%E5%8E%9F%E5%9B%A0%E3%81%B8%E7%B5%9E%E3%82%8B%E3%80%81%E3%82%BD%E3%83%BC%E3%82%B9%E3%82%B3%E3%83%BC%E3%83%89%E3%81%AE%E4%BD%8D%E7%BD%AE%E3%82%92%E7%89%B9%E5%AE%9A%E3%81%99%E3%82%8B"></a>


### 步骤：加载成果物、整理形式、缩小原因范围、定位源代码

1. <strong>识别格式并加载</strong>
   - 让子 Agent 分析大型成果物
2. <strong>转成可查询的形式</strong>
   - 将 trace 或堆快照导入 sqlite，在阅读前转成可查询的形式
3. <strong>缩小原因范围</strong>
   - 查找耗时最多的帧、泄漏的引用链，以及停滞的线程
4. <strong>定位源代码</strong>
   - 依据成果物中的符号信息，确定最耗时的帧对应源代码中的哪个文件、哪个函数、哪一行
   - 在位置尚不明确时，无法断言是哪段代码导致问题，因此诊断尚未完成
   - 若无法定位，就解析符号信息，或明确指出成果物未包含符号信息
5. <strong>如果有成对的采集结果，就相互对照</strong>
   - 若有修复前后这样可比较的两份成果物，就计算差异
   - 若没有比较数据，应将发现写成「成果物支持的最有力假设」，不要称为已确定的原因
6. <strong>给出附有引用的诊断</strong>
   - 除非受到请求，否则不作修复，而是交给「<strong>Bug fix</strong>」或「<strong>Perf issue</strong>」

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="151">
<li class="code-line" data-line="151">
<strong>帧</strong>……处理调用历史中记录的函数位置</li>
<li class="code-line" data-line="152">
<strong>引用链</strong>……导致数据无法从内存释放而一直保留的引用关系链</li>
<li class="code-line" data-line="153">
<strong>线程</strong>……程序中推进处理的一条执行流</li>
</ul>
</div></aside>

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 总结

- <strong>共同点与选择方式</strong>……三个 Playbook 都不修改代码，只给出答案或诊断。按问题能否通过阅读代码和历史回答、能否测量仍在运行的进程、或是否只有已取得的成果物来选择。
- <strong>Investigation</strong>……通过 `/how` 和 `/why` 回答，使用五个标题或附有比较表的建议。若需要修改代码，就交还用户。
- <strong>Runtime forensics</strong>……停止从源代码猜测，测量正在运行的进程，证明机制后再指出源代码位置。
- <strong>Trace forensics</strong>……不重新运行程序，将收到的成果物转为可查询形式，定位到引发问题的源代码位置。若无可比较的成果物，则写成「最有力假设」。

下一章[第 11 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6fcb42)将从「要修复什么」的角度，介绍接收诊断并实际进行修复的三个 Playbook：「<strong>Bug fix</strong>」、「<strong>Perf issue</strong>」和「[<strong>Hillclimb</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/hillclimb.md)」。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](13-chapter.md) · [下一篇](15-chapter.md) · [English](../en/14-chapter.md)
