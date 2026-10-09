# 第 29 章：用十六条 TypeScript 规则维护代码质量

[目录](README.md) · [上一篇](34-chapter.md) · [下一篇](36-chapter.md) · [English](../en/35-chapter.md)

作者：kaito · [日文原文](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4f9a46) · [作者英文版](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/00dce1)

来源快照：2026-10-03。中文为 AI 辅助译稿，尚未完成人工终审；正文中的“我”指原作者。

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
本章介绍 [`/typescript-best-practices`](https://github.com/cursor/plugins/blob/main/pstack/skills/typescript-best-practices/SKILL.md)。

`/typescript-best-practices` 用于指导 Agent 编写 TypeScript：通过类型排除不可能的状态（例如正在加载却同时有错误值），并在外部数据进入系统的地方只验证一次。

从本章到[第 31 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8960d3)的三章，分别介绍以下三项维护 Agent 所写代码质量的 Skill。

1. `/typescript-best-practices`（本章）
2. [`/tdd`](https://github.com/cursor/plugins/blob/main/pstack/skills/tdd/SKILL.md)（[第 30 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ad5727)）
3. [`/no-comments`](https://github.com/cursor/plugins/blob/main/pstack/skills/no-comments/SKILL.md)（[第 31 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8960d3)）

本书将三者归为<strong>不只依赖编写代码的 Agent 自己留心，而让其他机制核验其成果的 Skill</strong>。对于 `/typescript-best-practices`，代替编写者检查的是编译器。

本章从作用、使用时机、规则和请求写法四方面介绍 `/typescript-best-practices`。

<a id="%E3%81%93%E3%81%AE%E7%AB%A0%E3%81%AE%E6%A7%8B%E6%88%90"></a>


## 本章结构

本章安排如下。

- 作用：将「Type System Discipline」落实为具体的 TypeScript 写法
- 使用时机：读取或编辑 TypeScript 文件时自动加载
- 规则：TypeScript 写法的 16 条规则
- 请求写法：即使不提 Skill 名称，Agent 也会遵守规则
- 总结

<a id="%E5%BD%B9%E5%89%B2%EF%BC%9A%E3%80%8Etype-system-discipline%E3%80%8F%E3%82%92-typescript-%E3%81%AE%E5%85%B7%E4%BD%93%E7%9A%84%E3%81%AA%E6%9B%B8%E3%81%8D%E6%96%B9%E3%81%AB%E3%81%99%E3%82%8B"></a>


## 作用：将「Type System Discipline」落实为具体的 TypeScript 写法

`/typescript-best-practices` 是一套 TypeScript 规则。

[第 18 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b)的 Principle「[<strong>Type System Discipline</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-type-system-discipline/SKILL.md)」解释了为何要让类型无法表示无效状态。本 Skill 则用具体的 TypeScript 写法展示如何实现。

其 `SKILL.md` 在开头要求 Agent 先应用这一 Principle，再使用 Skill 中的规则。

<a id="%E4%BD%BF%E3%81%84%E3%81%A9%E3%81%8D%EF%BC%9Atypescript%E3%81%AE%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%82%92%E8%AA%AD%E3%81%BF%E6%9B%B8%E3%81%8D%E3%81%99%E3%82%8B%E3%81%A8%E3%80%81%E8%87%AA%E5%8B%95%E3%81%A7%E8%AA%AD%E3%81%BF%E8%BE%BC%E3%81%BE%E3%82%8C%E3%82%8B"></a>


## 使用时机：读取或编辑 TypeScript 文件时自动加载

<strong>Agent 读取或编辑 TypeScript 文件时，这项 Skill 会自动加载</strong>，因为 `SKILL.md` 的 `paths` 设置指定了 TypeScript 文件。

该 Skill 设置了 `disable-model-invocation: true`（[第 25 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/46bd1f)），因此 Agent 不会根据对话内容自行选择并运行它。

由于自动加载，Agent 不会忘记调用，使用者也无需点名。

<a id="%E8%A6%8F%E5%89%87%EF%BC%9Atypescript-%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%E3%81%AE16%E3%81%AE%E8%A6%8F%E5%89%87"></a>


## 规则：TypeScript 写法的 16 条规则

Skill 包含 16 条规则，以及 [`references/patterns.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/typescript-best-practices/references/patterns.md) 中的代码示例。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="45"><strong><code>references/patterns.md</code></strong>……汇总 <code>SKILL.md</code> 中各条规则对应的代码示例的文件</p>
<p class="code-line" data-line="47">16 条规则中，除「真实测试」和「结构化日志（Structured telemetry）」外，其余 14 条都有代码示例</p>
</div></aside>

随附指南 [`docs/guide/05-build-and-clean.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/05-build-and-clean.md) 称，这项 Skill <strong>把类型系统的原则转化为具体的 TypeScript 规则</strong>。

依次概括 16 条规则如下。

<table class="code-line" data-line="54">
<thead class="code-line" data-line="54">
<tr class="code-line" data-line="54">
<th>规则</th>
<th>概述</th>
</tr>
</thead>
<tbody class="code-line" data-line="56">
<tr class="code-line" data-line="56">
<td><a href="#1.-discriminated-union-%E3%81%A7%E3%80%81%E3%81%82%E3%82%8A%E3%81%88%E3%81%AA%E3%81%84%E7%8A%B6%E6%85%8B%E3%82%92%E6%9B%B8%E3%81%91%E3%81%AA%E3%81%8F%E3%81%99%E3%82%8B">discriminated union</a></td>
<td>按状态用类型限定可有字段，使「加载中却同时有错误」之类的矛盾值无法写出</td>
</tr>
<tr class="code-line" data-line="57">
<td><a href="#2.-%E3%83%96%E3%83%A9%E3%83%B3%E3%83%89%E5%9E%8B%E3%81%A7%E3%80%81%E6%84%8F%E5%91%B3%E3%81%AE%E7%95%B0%E3%81%AA%E3%82%8B%E5%80%A4%E3%81%AE%E5%8F%96%E3%82%8A%E9%81%95%E3%81%88%E3%82%92%E9%98%B2%E3%81%90">品牌类型</a></td>
<td>即使底层都是字符串，也用类型区分含义不同的值（例如 ID 与普通字符串），避免混淆</td>
</tr>
<tr class="code-line" data-line="58">
<td><a href="#3.-%E4%B8%8D%E6%AD%A3%E3%81%AA%E5%80%A4%E3%82%92%E7%B5%84%E3%81%BF%E7%AB%8B%E3%81%A6%E3%82%89%E3%82%8C%E3%81%AA%E3%81%84%E5%BD%A2%E3%81%A7%E3%80%81%E5%9E%8B%E3%82%92%E4%BD%9C%E3%82%8B">构造式建模（Constructive modeling）</a></td>
<td>对于「非空数组」等有约束的值，使用无法构造不满足条件之值的类型</td>
</tr>
<tr class="code-line" data-line="59">
<td><a href="#4.-%E5%9E%8B%E3%82%92%E5%BC%B7%E3%81%8F%E3%81%99%E3%82%8B%E3%81%AE%E3%81%AF%E3%80%81%E3%82%86%E3%82%8B%E3%81%84%E5%9E%8B%E3%81%AE%E3%81%9B%E3%81%84%E3%81%A7%E7%84%A1%E7%90%86%E3%81%8C%E7%94%9F%E3%81%98%E3%82%8B%E7%AE%87%E6%89%80%E3%81%A0%E3%81%91%E3%81%AB%E3%81%99%E3%82%8B">足够简单的类型（Simplest total type）</a></td>
<td>只在现有类型迫使代码采用不自然写法之处收紧类型</td>
</tr>
<tr class="code-line" data-line="60">
<td><a href="#5.-%E5%A4%96%E3%81%8B%E3%82%89%E5%8F%97%E3%81%91%E5%8F%96%E3%82%8B%E3%83%87%E3%83%BC%E3%82%BF%E3%81%AF-unknown-%E3%81%A7%E5%8F%97%E3%81%91%E3%82%8B"><code>any</code> 不如 <code>unknown</code></a></td>
<td>用一种在检查内容前不能直接使用的类型接收外部数据</td>
</tr>
<tr class="code-line" data-line="61">
<td><a href="#6.-%E5%9E%8B%E3%82%AC%E3%83%BC%E3%83%89%E3%82%92%E6%89%8B%E3%81%A7%E6%9B%B8%E3%81%8F%E5%89%8D%E3%81%AB%E3%80%81%E3%83%AA%E3%83%9D%E3%82%B8%E3%83%88%E3%83%AA%E3%81%AE%E3%82%B9%E3%82%AD%E3%83%BC%E3%83%9E%E3%81%AE%E3%83%A9%E3%82%A4%E3%83%96%E3%83%A9%E3%83%AA%E3%82%92%E4%BD%BF%E3%81%86">schema 优先于类型守卫（Schemas before guards）</a></td>
<td>手写数据验证逻辑前，先使用项目现有的验证库</td>
</tr>
<tr class="code-line" data-line="62">
<td><a href="#7.-as-%E3%81%AF%E3%80%81%E5%80%A4%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%81%9F%E5%BE%8C%E3%81%AB%E3%81%A0%E3%81%91%E6%9B%B8%E3%81%8F"><code>as</code> 不应使用</a></td>
<td>不在未检查值的情况下断言「这个值属于此类型」</td>
</tr>
<tr class="code-line" data-line="63">
<td><a href="#8.-%E5%9E%8B%E3%81%AE%E7%B5%9E%E3%82%8A%E8%BE%BC%E3%81%BF%E3%81%AB%E3%81%AF%E3%80%81%E5%84%AA%E5%85%88%E3%81%99%E3%82%8B%E9%A0%86%E7%95%AA%E3%81%8C%E3%81%82%E3%82%8B">类型收窄的优先顺序（Narrowing hierarchy）</a></td>
<td>按安全程度依次选择确认值类型的方法</td>
</tr>
<tr class="code-line" data-line="64">
<td><a href="#9.-%E5%9E%8B%E3%82%AC%E3%83%BC%E3%83%89%E3%81%AF%E3%80%81%E5%90%8D%E5%89%8D%E3%81%AE%E3%81%A8%E3%81%8A%E3%82%8A%E3%81%AB%E5%80%A4%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B">类型守卫（Type guards）</a></td>
<td>判断「是否属于此类型」的函数应真正验证名称所声称的条件</td>
</tr>
<tr class="code-line" data-line="65">
<td><a href="#10.-%E7%B6%B2%E7%BE%85%E6%80%A7%E3%83%81%E3%82%A7%E3%83%83%E3%82%AF%E3%81%A7%E3%80%81case-%E3%81%AE%E6%9B%B8%E3%81%8D%E5%BF%98%E3%82%8C%E3%82%92%E3%82%B3%E3%83%B3%E3%83%91%E3%82%A4%E3%83%AB%E3%82%A8%E3%83%A9%E3%83%BC%E3%81%AB%E3%81%99%E3%82%8B">穷尽性检查</a></td>
<td>新增一种状态时，通过编译错误提示遗漏了对应处理</td>
</tr>
<tr class="code-line" data-line="66">
<td><a href="#11.-as-%E3%81%AE%E4%BB%A3%E3%82%8F%E3%82%8A%E3%81%AB-satisfies-%E3%81%A7%E3%80%81%E5%9E%8B%E3%81%AB%E5%90%88%E3%81%86%E3%81%8B%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B"><code>as</code> 不如 <code>satisfies</code></a></td>
<td>在不丢失值的具体类型信息的情况下，检查它是否符合某类型</td>
</tr>
<tr class="code-line" data-line="67">
<td><a href="#12.-%E3%83%87%E3%83%BC%E3%82%BF%E3%81%8C%E5%85%A5%E3%81%A3%E3%81%A6%E3%81%8F%E3%82%8B%E5%A0%B4%E6%89%80%E3%81%A7%E4%B8%80%E5%BA%A6%E3%81%A0%E3%81%91%E6%A4%9C%E8%A8%BC%E3%81%97%E3%80%81%E5%86%85%E5%81%B4%E3%81%A7%E3%81%AF%E5%9E%8B%E3%82%92%E4%BF%A1%E3%81%98%E3%82%8B">边界验证</a></td>
<td>外部数据在入口验证一次，内部不重复验证</td>
</tr>
<tr class="code-line" data-line="68">
<td><a href="#13.-%E6%96%B0%E3%81%97%E3%81%84%E5%9E%8B%E3%82%92%E6%9B%B8%E3%81%8F%E5%89%8D%E3%81%AB%E3%80%81%E6%97%A2%E5%AD%98%E3%81%AE%E5%9E%8B%E3%81%8B%E3%82%89%E5%B0%8E%E3%81%8F">从现有类型推导（Schema-derived types）</a></td>
<td>编写新类型前，先从已有类型提取需要的部分</td>
</tr>
<tr class="code-line" data-line="69">
<td><a href="#14.-%E5%BC%95%E6%95%B0%E3%81%AF%E3%80%81%E4%BD%8D%E7%BD%AE%E3%81%A7%E4%B8%A6%E3%81%B9%E3%81%9A%E3%81%AB%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%81%A7%E6%B8%A1%E3%81%99">用对象传递参数（Object args）</a></td>
<td>为参数标明名称，避免传错顺序</td>
</tr>
<tr class="code-line" data-line="70">
<td><a href="#15.-%E6%89%8B%E5%85%83%E3%81%A7%E5%8B%95%E3%81%8B%E3%81%9B%E3%82%8B%E3%82%82%E3%81%AE%E3%81%AF%E3%80%81%E3%83%A2%E3%83%83%E3%82%AF%E3%81%AB%E3%81%9B%E3%81%9A%E6%9C%AC%E7%89%A9%E3%81%A7%E3%83%86%E3%82%B9%E3%83%88%E3%81%99%E3%82%8B">真实测试</a></td>
<td>本地能运行的组件，用真实组件测试，不用替身</td>
</tr>
<tr class="code-line" data-line="71">
<td><a href="#16.-%E8%A8%BA%E6%96%AD%E3%81%AE%E6%83%85%E5%A0%B1%E3%81%AF%E3%80%81%E6%A7%8B%E9%80%A0%E5%8C%96%E3%81%97%E3%81%9F%E3%83%AD%E3%82%B0%E3%81%A7%E6%AE%8B%E3%81%99">结构化日志（Structured telemetry）</a></td>
<td>按固定结构保存可用于调查的信息，<code>console.log</code> 不留在代码中</td>
</tr>
</tbody>
</table>

下面结合 `references/patterns.md` 的代码示例逐条介绍。示例中的注释为日文。

<a id="1.-discriminated-union-%E3%81%A7%E3%80%81%E3%81%82%E3%82%8A%E3%81%88%E3%81%AA%E3%81%84%E7%8A%B6%E6%85%8B%E3%82%92%E6%9B%B8%E3%81%91%E3%81%AA%E3%81%8F%E3%81%99%E3%82%8B"></a>


### 1. 用 discriminated union 排除不可能的状态

discriminated union 是用 `kind` 等标识种类的字段，区分各形态（variant）所含字段不同的数据类型（[第 18 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b)）。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="80"><strong>variant</strong>……同一个类型可能具有的各种形态之一<br/>
例如下文的 <code>DiffState</code> 有 <code>{ kind: "loading" }</code>、<code>{ kind: "ready"; diff: GitDiff }</code>、<code>{ kind: "error"; error: string }</code> 三种 variant</p>
</div></aside>

`references/patterns.md` 把以布尔值和可省略字段（optional 字段）定义的类型列为反例。

反例允许写出同时包含 `loading: true` 和 `error` 的值，即「正在加载却同时出错」的矛盾状态。正例按 `kind` 限定每种状态可包含的字段，只能写出三种有效状态。

```
// 差异（修改过的文件清单）
type GitDiff = { files: string[] };

// 错误示例：布尔值加可选字段的组合，也能表示相互矛盾的状态
type DiffStateLoose = { loading: boolean; diff?: GitDiff; error?: string };

// 正确示例：只能表示有效状态
type DiffState =
  | { kind: "loading" }
  | { kind: "ready"; diff: GitDiff }
  | { kind: "error"; error: string };
```

因此，当不同状态拥有不同字段时，应使用 discriminated union，而不是布尔值加可选字段。

<a id="2.-%E3%83%96%E3%83%A9%E3%83%B3%E3%83%89%E5%9E%8B%E3%81%A7%E3%80%81%E6%84%8F%E5%91%B3%E3%81%AE%E7%95%B0%E3%81%AA%E3%82%8B%E5%80%A4%E3%81%AE%E5%8F%96%E3%82%8A%E9%81%95%E3%81%88%E3%82%92%E9%98%B2%E3%81%90"></a>


### 2. 用品牌类型防止混淆含义不同的值

品牌类型是在字符串等基础值上加上 `& { readonly __brand: "AgentId" }` 这样的标记（[第 18 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b)）。这样可以在编译阶段防止把未经验证的字符串传给需要 Agent ID 的函数。

下面的例子里，位于数据入口的 `parseAgentId` 先验证字符串是否符合 UUID 格式，再将其转成 `AgentId`。`as` 只在验证后的一个位置使用。

```
type AgentId = string & { readonly __brand: "AgentId" };

// 检查字符串是否符合 UUID 格式
declare function isUUID(input: string): boolean;

// 边界：验证字符串后再将其转为 AgentId
function parseAgentId(input: string): AgentId {
  if (!isUUID(input)) throw new Error(`Invalid agent id: ${input}`);
  // 已经验证，所以这里可以使用 as
  return input as AgentId;
}

// 内部：只接收 AgentId，不重复验证 ID
function focusAgent(id: AgentId): void {
  /* 视为已经验证的输入 */
}

// 可以通过
focusAgent(parseAgentId("3f2b8c1e-9a4d-4e6b-8f1a-2c5d7e9b0a13"));
// 未经验证的字符串会导致编译错误
focusAgent("3f2b8c1e-9a4d-4e6b-8f1a-2c5d7e9b0a13");
```

标记统一采用 `readonly __brand: "X"`，不另造写法。

因此，内容类型相同、含义却不同的值应使用品牌类型，并在边界验证后赋予该类型。

<a id="3.-%E4%B8%8D%E6%AD%A3%E3%81%AA%E5%80%A4%E3%82%92%E7%B5%84%E3%81%BF%E7%AB%8B%E3%81%A6%E3%82%89%E3%82%8C%E3%81%AA%E3%81%84%E5%BD%A2%E3%81%A7%E3%80%81%E5%9E%8B%E3%82%92%E4%BD%9C%E3%82%8B"></a>


### 3. 定义无法构造无效值的类型

这条规则（原文称 Constructive modeling）要求用有效的组成部分构造类型，而不是先用宽松类型，再靠运行时检查拦截无效值。

```
// 非空数组：第一个元素一定存在
type NonEmpty<T> = [T, ...T[]];

// 错误示例：接收 T[]，让各调用方重复检查数组是否为空
function pickWinnerLoose(entries: string[]): string {
  if (entries.length === 0) throw new Error("no entries");
  return entries[Math.floor(Math.random() * entries.length)];
}

// 正确示例：这种类型无法表示空数组
function pickWinner(entries: NonEmpty<string>): string {
  return entries[Math.floor(Math.random() * entries.length)];
}

// 接收 T[] 后，用类型守卫只缩小一次类型；此后类型会承载已验证的事实
const isNonEmpty = <T>(arr: T[]): arr is NonEmpty<T> => arr.length > 0;
```

因此，在运行时排除无效值之前，应先定义无法构造无效值的类型。

<a id="4.-%E5%9E%8B%E3%82%92%E5%BC%B7%E3%81%8F%E3%81%99%E3%82%8B%E3%81%AE%E3%81%AF%E3%80%81%E3%82%86%E3%82%8B%E3%81%84%E5%9E%8B%E3%81%AE%E3%81%9B%E3%81%84%E3%81%A7%E7%84%A1%E7%90%86%E3%81%8C%E7%94%9F%E3%81%98%E3%82%8B%E7%AE%87%E6%89%80%E3%81%A0%E3%81%91%E3%81%AB%E3%81%99%E3%82%8B"></a>


### 4. 只有宽松类型造成困难时才加强类型

这条规则（原文称 Simplest total type）并不要求把所有类型都收紧。只要针对数组的每项操作对包括空数组在内的所有输入都能返回结果，就继续使用 `T[]`。

只有宽松类型迫使使用位置采用不自然的写法时，才需要加强类型。其迹象包括 `!`（非空断言运算符）、`arr[0] as T`（类型断言）以及「按理说不会出现」的错误。

```
type NonEmpty<T> = [T, ...T[]];
type Session = { id: string; startedAt: Date };

// 可以继续使用 T[] 的例子：空数组也能返回 0
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// 错误示例：用 ! 向编译器隐藏数组为空时的处理问题
function newestSessionLoose(sessions: Session[]): Session {
  return sessions.at(0)!;
}

// 正确示例：强化参数类型后，不再需要 !
function newestSession(sessions: NonEmpty<Session>): Session {
  return sessions[0];
}
```

`references/patterns.md` 也把将返回值放宽为 `Session | undefined` 列为另一种正确写法。

因此，是否加强类型，要看宽松类型是否迫使代码使用 `!`（非空断言运算符）等写法。

<a id="5.-%E5%A4%96%E3%81%8B%E3%82%89%E5%8F%97%E3%81%91%E5%8F%96%E3%82%8B%E3%83%87%E3%83%BC%E3%82%BF%E3%81%AF-unknown-%E3%81%A7%E5%8F%97%E3%81%91%E3%82%8B"></a>


### 5. 用 unknown 接收外部数据

用 `any` 接收的值，无需验证也能使用；用 `unknown` 接收的值，在确认类型前不能使用，Agent 因而无法跳过验证。

```
// 错误示例：接收 any 后，无须验证就能使用
function handleLoose(input: any) {
  // 即使没有 foo，也能通过编译
  return input.foo.bar;
}

// 正确示例：接收 unknown，缩小类型后再使用
function handle(input: unknown) {
  if (typeof input === "object" && input !== null && "foo" in input) {
    // 此处编译器已经确认 input 有 foo 字段
  }
}
```

因此，如果值的结构要到运行时才知道，应先以 `unknown` 接收，收窄类型后再使用。

<a id="6.-%E5%9E%8B%E3%82%AC%E3%83%BC%E3%83%89%E3%82%92%E6%89%8B%E3%81%A7%E6%9B%B8%E3%81%8F%E5%89%8D%E3%81%AB%E3%80%81%E3%83%AA%E3%83%9D%E3%82%B8%E3%83%88%E3%83%AA%E3%81%AE%E3%82%B9%E3%82%AD%E3%83%BC%E3%83%9E%E3%81%AE%E3%83%A9%E3%82%A4%E3%83%96%E3%83%A9%E3%83%AA%E3%82%92%E4%BD%BF%E3%81%86"></a>


### 6. 手写类型守卫前，先用仓库的 schema 库

对于外部数据，Agent 在手写逐字段检查的类型守卫（判断值是否属于某类型并返回布尔值的函数）之前，应先查找仓库使用的运行时 schema 库和现有 schema。

由一份 schema 负责验证，并从中推导 TypeScript 类型。若分别维护 schema、相同结构的 interface 和类型守卫，修改时容易漏掉其中一份，造成不一致。

```
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

// 从 schema 推导类型
type User = z.infer<typeof UserSchema>;

function parseUser(input: unknown): User {
  return UserSchema.parse(input);
}
```

因此，外部数据应使用仓库已有的 schema 验证，并从同一 schema 推导类型。

<a id="7.-as-%E3%81%AF%E3%80%81%E5%80%A4%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%81%9F%E5%BE%8C%E3%81%AB%E3%81%A0%E3%81%91%E6%9B%B8%E3%81%8F"></a>


### 7. 验证值后才使用 as

`as`（类型断言）是在未验证值的情况下，向编译器断言「这个值属于此类型」的写法。即使实际类型不同，编译也可能通过，使用该值的代码则可能在运行时出错。

```
type User = { id: string; name: string };
declare const data: unknown;

// 错误示例：未经验证就断言它是 User
const user = data as User;

// 正确示例：在边界验证后使用 as
function parseUser(data: unknown): User {
  if (typeof data !== "object" || data === null) {
    throw new Error("expected object");
  }
  if (!("id" in data) || typeof data.id !== "string") {
    throw new Error("expected id");
  }
  // ……其余字段也全部验证
  // 所有字段均已验证，因此可以使用 as
  return data as User;
}
```

从现有代码中去除 `as` 时，Agent 要查明 TypeScript 无法推断类型的原因。

- 缺少标识种类的字段 → 添加字段，改用 discriminated union
- 原类型过宽（例如 `Record<string, unknown>`）→ 收窄类型
- 边界缺少类型 → 添加解析函数或 schema
- 类型确实无法表达 → 使用品牌类型或 `satisfies`

因此，使用 `as` 前必须先验证值。

<a id="8.-%E5%9E%8B%E3%81%AE%E7%B5%9E%E3%82%8A%E8%BE%BC%E3%81%BF%E3%81%AB%E3%81%AF%E3%80%81%E5%84%AA%E5%85%88%E3%81%99%E3%82%8B%E9%A0%86%E7%95%AA%E3%81%8C%E3%81%82%E3%82%8B"></a>


### 8. 收窄类型有优先顺序

`references/patterns.md` 按以下顺序优先选择收窄类型的方法。

1. 对标识种类的字段使用 `switch` 或 `if`（编译器自动收窄）
2. `in` 运算符（用 `"key" in obj` 收窄到包含该字段的 variant）
3. `typeof` 与 `instanceof`（适用于基础值和类实例）
4. 自定义类型守卫（前三种不足时使用）
5. `as`（仅在验证值后使用）

下面的代码分别示范这五种方法。

```
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

// 1. 对表示类别的字段使用 switch：检查 kind 后，编译器会自动缩小类型
function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "rect":
      return s.width * s.height;
  }
}

// 2. in 运算符：只有圆形有 radius，因此这里缩小到圆形
function areaByIn(s: Shape): number {
  if ("radius" in s) return Math.PI * s.radius ** 2;
  // 这里缩小到矩形
  return s.width * s.height;
}

// 3. typeof 与 instanceof：缩小到基本类型或类实例
function describe(value: string | number | Date): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  // 这里缩小到 number
  return value.toFixed(2);
}

// 4. 自定义类型守卫：用函数检查前三种方法无法确认的条件（是否为非空字符串）
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

// 5. as：只在值经过验证后使用
type AgentId = string & { readonly __brand: "AgentId" };
declare function isUUID(input: string): boolean;

function toAgentId(input: string): AgentId {
  if (!isUUID(input)) throw new Error(`Invalid agent id: ${input}`);
  return input as AgentId;
}
```

因此，收窄类型时应优先使用列表中靠前的方法。

<a id="9.-%E5%9E%8B%E3%82%AC%E3%83%BC%E3%83%89%E3%81%AF%E3%80%81%E5%90%8D%E5%89%8D%E3%81%AE%E3%81%A8%E3%81%8A%E3%82%8A%E3%81%AB%E5%80%A4%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B"></a>


### 9. 类型守卫必须真的检查其名称所声称的条件

类型守卫必须按名称所述实际验证值。没有真正验证的类型守卫会把故障藏在看似安全的名称后，比 `as` 更糟。名称应采用 `isX` 或 `hasX`。

```
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

// 实际检查了表示类别的字段
function isCircle(s: Shape): s is Shape & { kind: "circle" } {
  return s.kind === "circle";
}
```

因此，编写类型守卫时，必须真正检查其名称所声称的条件。

<a id="10.-%E7%B6%B2%E7%BE%85%E6%80%A7%E3%83%81%E3%82%A7%E3%83%83%E3%82%AF%E3%81%A7%E3%80%81case-%E3%81%AE%E6%9B%B8%E3%81%8D%E5%BF%98%E3%82%8C%E3%82%92%E3%82%B3%E3%83%B3%E3%83%91%E3%82%A4%E3%83%AB%E3%82%A8%E3%83%A9%E3%83%BC%E3%81%AB%E3%81%99%E3%82%8B"></a>


### 10. 用穷尽性检查让遗漏的 case 变成编译错误

在 `switch` 的 `default` 分支写入 `const _exhaustive: never = x;`。若新增一种 variant，却忘记编写对应的 `case`，编译就会报错（[第 18 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b)）。

```
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "rect":
      return s.width * s.height;
    default: {
      // 若在 Shape 中增加 variant 却忘记添加 case，这里会出现编译错误
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}
```

如果 `switch` 不返回值，就用 `void _exhaustive;` 代替 `return _exhaustive;`。

因此，按 variant 分支处理时，需要在 `default` 分支检查是否穷尽。

<a id="11.-as-%E3%81%AE%E4%BB%A3%E3%82%8F%E3%82%8A%E3%81%AB-satisfies-%E3%81%A7%E3%80%81%E5%9E%8B%E3%81%AB%E5%90%88%E3%81%86%E3%81%8B%E3%82%92%E7%A2%BA%E3%81%8B%E3%82%81%E3%82%8B"></a>


### 11. 用 satisfies 而非 as 验证是否符合类型

`satisfies` 可以检查值是否符合类型，同时不扩大字面量类型（例如只表示特定值的 `"dark"`）。

```
type Config = { theme: "dark" | "light"; cols: number };

// 错误示例：使用 as 会把 theme 的类型扩大为 "dark" | "light"，丢失它确为 "dark" 的信息
const configLoose = { theme: "dark", cols: 3 } as Config;

// 正确示例：satisfies 验证是否符合类型，同时保留字面量类型
const config = { theme: "dark", cols: 3 } satisfies Config;
// config.theme 的类型是 "dark"，不是 string
```

因此，如果只是要检查值是否符合类型，应使用 `satisfies` 而非 `as`。

<a id="12.-%E3%83%87%E3%83%BC%E3%82%BF%E3%81%8C%E5%85%A5%E3%81%A3%E3%81%A6%E3%81%8F%E3%82%8B%E5%A0%B4%E6%89%80%E3%81%A7%E4%B8%80%E5%BA%A6%E3%81%A0%E3%81%91%E6%A4%9C%E8%A8%BC%E3%81%97%E3%80%81%E5%86%85%E5%81%B4%E3%81%A7%E3%81%AF%E5%9E%8B%E3%82%92%E4%BF%A1%E3%81%98%E3%82%8B"></a>


### 12. 在数据入口验证一次，内部信任类型

在数据进入系统的位置，将其解析（按固定结构读取和转换）为领域类型。内部代码直接使用已带类型的值，不反复验证。这符合 Principle「[<strong>Boundary Discipline</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-boundary-discipline/SKILL.md)」（[第 18 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/cdc49b)）。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="396"><strong>领域类型</strong>……表示应用处理的业务概念（如用户 ID、订单）的类型<br/>
例如，下面的代码用两种类型表示从外部收到的订单数据</p>
</div></aside>

```
// 领域类型：明确订单有哪些字段，以及每个字段的类型
type Order = { id: string; userId: string; total: number };

// 不是领域类型：字段不确定，每次使用都得检查
type RawOrder = Record<string, unknown>;
```

在边界验证时，数据入口的代码对 `RawOrder` 之类的值只验证一次，将其转为 `Order`；内部代码只处理 `Order`。

因此，外部数据应在入口验证一次，内部则信任类型。

<a id="13.-%E6%96%B0%E3%81%97%E3%81%84%E5%9E%8B%E3%82%92%E6%9B%B8%E3%81%8F%E5%89%8D%E3%81%AB%E3%80%81%E6%97%A2%E5%AD%98%E3%81%AE%E5%9E%8B%E3%81%8B%E3%82%89%E5%B0%8E%E3%81%8F"></a>


### 13. 编写新类型前，先从现有类型推导

如果 OpenAPI 定义、GraphQL schema 或数据库迁移已经规定了数据结构，Agent 不应重新编写同样结构的类型，而要从据此生成的类型中推导。

```
// 生成的类型（实际应从生成的模块中 import）
type ChecksMessage = {
  totalCount: number;
  checks: { name: string; status: string }[];
  updatedAt: string;
};

// 错误示例：重复手写同样的结构，schema 改变时就会不一致
type CheckSummary = {
  totalCount: number;
  checks: { name: string; status: string }[];
};
function renderChecksLoose(s: CheckSummary) {
  /* ... */
}

// 正确示例：从生成的类型中取出所需字段
function renderChecks(s: Pick<ChecksMessage, "totalCount" | "checks">) {
  /* ... */
}
```

编写新 interface 前，先检查能否使用 `Pick`、`Omit`、`Parameters`、`ReturnType`、`Awaited` 或 `typeof`。

因此，若已有原始定义，就应从它推导类型，而非重写。

<a id="14.-%E5%BC%95%E6%95%B0%E3%81%AF%E3%80%81%E4%BD%8D%E7%BD%AE%E3%81%A7%E4%B8%A6%E3%81%B9%E3%81%9A%E3%81%AB%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%81%A7%E6%B8%A1%E3%81%99"></a>


### 14. 用对象传递参数，而非按位置排列

用对象传递参数，每个值对应什么参数都能从名称看出，也能避免弄错参数顺序。

```
type Selection = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};
declare const uri: string;
declare function openFileLoose(uri: string, selection: Selection): void;
declare function openFile(args: { uri: string; selection: Selection }): void;

// 错误示例：即使调换两个参数，只要类型相符就能通过编译
openFileLoose(uri, {
  startLineNumber: 10,
  startColumn: 1,
  endLineNumber: 10,
  endColumn: 1,
});

// 正确示例：不受顺序影响，名称能说明每个值的含义
openFile({
  uri,
  selection: {
    startLineNumber: 10,
    startColumn: 1,
    endLineNumber: 10,
    endColumn: 1,
  },
});
```

但逐帧渲染、tokenizer、parser 等反复执行的热点代码不适用这条规则。若每次调用都新建参数对象，就要不断分配内存；在高频调用处会影响性能。

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="481">
<li class="code-line" data-line="481">
<strong>逐帧渲染</strong>……像动画或游戏那样，每秒重绘画面数十次的处理</li>
<li class="code-line" data-line="482">
<strong>tokenizer</strong>……将字符串切分成单词或符号等最小有意义单位（token）的程序</li>
<li class="code-line" data-line="483">
<strong>parser</strong>……读取 token 序列等，并组装成程序可处理结构的程序</li>
</ul>
</div></aside>

概括来说，有多个参数时，除高频执行的部分外，应使用对象传参。

<a id="15.-%E6%89%8B%E5%85%83%E3%81%A7%E5%8B%95%E3%81%8B%E3%81%9B%E3%82%8B%E3%82%82%E3%81%AE%E3%81%AF%E3%80%81%E3%83%A2%E3%83%83%E3%82%AF%E3%81%AB%E3%81%9B%E3%81%9A%E6%9C%AC%E7%89%A9%E3%81%A7%E3%83%86%E3%82%B9%E3%83%88%E3%81%99%E3%82%8B"></a>


### 15. 本地能运行的组件就用真实组件测试，不用 mock

Agent 对本地能运行的组件，应运行真实组件来测试，而非用 mock（代替真实组件的假组件）。只有本地无法运行的组件（例如外部支付服务）才使用 mock。界面也应实际构建、运行后验证。

```
declare function test(name: string, fn: () => Promise<void>): void;
declare function expect<T>(actual: T): { toBe(expected: T): void };
declare function makeTempDir(): Promise<string>;
declare function saveNote(dir: string, text: string): Promise<void>;
declare function loadNote(dir: string): Promise<string>;
declare const fakeFs: { writeFile: { calledTimes: number } };

// 错误示例：连可在本机运行的文件保存都替换成 mock，只检查 mock 被调用的次数
test("メモを保存する", async () => {
  await saveNote("/notes", "買い物");
  expect(fakeFs.writeFile.calledTimes).toBe(1);
});

// 正确示例：在临时目录写入真实文件，重新读出并检查内容
test("保存したメモを読み戻せる", async () => {
  const dir = await makeTempDir();
  await saveNote(dir, "買い物");
  expect(await loadNote(dir)).toBe("買い物");
});
```

<!-- book-code-note:start -->
> **Oh My Stack 项目注（代码示例）**：测试名称分别表示「保存笔记」和「能读回已保存的笔记」；输入及预期内容「買い物」意为「购物」。它们是测试使用的原始字符串，保留以维持示例断言。
<!-- book-code-note:end -->


<a id="16.-%E8%A8%BA%E6%96%AD%E3%81%AE%E6%83%85%E5%A0%B1%E3%81%AF%E3%80%81%E6%A7%8B%E9%80%A0%E5%8C%96%E3%81%97%E3%81%9F%E3%83%AD%E3%82%B0%E3%81%A7%E6%AE%8B%E3%81%99"></a>


### 16. 用结构化日志保留诊断信息

Agent 应使用结构化日志（包含固定字段的日志）保存足以通过 ID 调查故障的信息，不在发布代码中留下 `console.log`。

```
declare const logger: {
  error(event: string, fields: Record<string, unknown>): void;
};
declare const orderId: string;
declare const userId: string;
declare const err: Error;

// 错误示例：只有字符串，事后无法查出哪个订单因何失败
console.log("payment failed");

// 正确示例：用固定字段记录事件名称、供调查使用的 ID 和原因
logger.error("payment_failed", { orderId, userId, reason: err.message });
```

使用正例中的日志，调查故障的人或 Agent 可以按 `orderId` 搜索，追踪该订单发生了什么。

因此，诊断信息应以日后可以按 ID 追踪的日志形式保存。

<a id="%E4%BE%9D%E9%A0%BC%E3%81%AE%E6%9B%B8%E3%81%8D%E6%96%B9%EF%BC%9Askill%E3%81%AE%E5%90%8D%E5%89%8D%E3%82%92%E5%87%BA%E3%81%95%E3%81%AA%E3%81%8F%E3%81%A6%E3%82%82%E3%80%81%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%81%8C%E8%A6%8F%E5%89%87%E3%81%AB%E5%BE%93%E3%81%86"></a>


## 请求写法：即使不提 Skill 名称，Agent 也会遵守规则

这项 Skill 没有请求示例。

随附指南 [`docs/guide/05-build-and-clean.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/05-build-and-clean.md) 也说明，使用者无需在任务中通过斜杠命令调用它。

<a id="%E3%81%BE%E3%81%A8%E3%82%81"></a>


## 总结

- <strong>检查者</strong>……由编译器代替编写代码的 Agent 查找类型错误。
- <strong>使用时机</strong>……Agent 读取或编辑 TypeScript 文件时自动加载。
- <strong>规则</strong>……让类型无法表示不可能的状态，并只在外部数据入口验证一次。

接下来的[第 30 章](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ad5727)介绍三项维护代码质量的 Skill 中的第二项：[`/tdd`](https://github.com/cursor/plugins/blob/main/pstack/skills/tdd/SKILL.md)，它要求修复故障前先写一项在修复前会失败的测试。
<!-- book-body:end -->

---

[目录](README.md) · [上一篇](34-chapter.md) · [下一篇](36-chapter.md) · [English](../en/35-chapter.md)
