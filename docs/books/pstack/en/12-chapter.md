# Chapter 9: Why pstack loads only what it needs

[Contents](README.md) · [Previous](11-chapter.md) · [Next](13-chapter.md) · [简体中文](../zh-CN/12-chapter.md)

By kaito · [Japanese original](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/6b7496) · [Author’s English edition](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/84aa6e)

Source snapshot: 2026-10-03. The text below preserves the author’s English edition.

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
<strong>pstack does not load every Playbook, Principle, and Skill up front. It reads only the body of `/poteto-mode` and the Principle index first</strong>.

It loads only the one Playbook that fits the request. When a Principle's conditions apply, it loads that Principle's body. When the Playbook's procedure reaches a step that needs a Skill, it loads that Skill.

[Chapter 7](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/55bbdb) and [Chapter 8](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/cd0205) showed how pstack calls the parts. This chapter explains the design that splits what pstack loads into four layers, the idea behind it, and the design's strengths and weakness.

<a id="how-this-chapter-is-organized"></a>


## How this chapter is organized

This chapter is organized as follows.

- pstack splits what it reads into four layers
- This design draws the same line as the principle "Guard the Context Window"
- This design has three strengths, and checks along the way make up for its weakness
- Summary

<a id="pstack-splits-what-it-reads-into-four-layers"></a>


## pstack splits what it reads into four layers

What pstack reads falls into <strong>four layers: entry point, procedure, judgment, and capability</strong>. The only layer it always reads is the entry point.

<table class="code-line" data-line="19">
<thead class="code-line" data-line="19">
<tr class="code-line" data-line="19">
<th>Layer</th>
<th>What it reads</th>
<th>When it reads it</th>
</tr>
</thead>
<tbody class="code-line" data-line="21">
<tr class="code-line" data-line="21">
<td>Layer 1: entry point</td>
<td>The whole <code>SKILL.md</code> of <a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/poteto-mode</code></a>
</td>
<td>When you call <code>/poteto-mode</code>
</td>
</tr>
<tr class="code-line" data-line="22">
<td>Layer 2: procedure</td>
<td>The file of the one Playbook that fits the request</td>
<td>When the agent matches the request against the Playbooks</td>
</tr>
<tr class="code-line" data-line="23">
<td>Layer 3: judgment</td>
<td>The <code>SKILL.md</code> of each Principle whose conditions apply</td>
<td>When the current work matches a condition in the index</td>
</tr>
<tr class="code-line" data-line="24">
<td>Layer 4: capability</td>
<td>The <code>SKILL.md</code> of each Skill that a Playbook step or <code>Non-negotiables</code> calls for</td>
<td>When the Playbook's procedure reaches that step</td>
</tr>
</tbody>
</table>

The Layer 1 `SKILL.md` holds neither Playbook bodies nor Principle bodies. It holds rules common to all work, such as `Non-negotiables` and how to write replies. It also holds a one-line description and a file location for each Playbook, and the Principle index, which lists each Principle with the conditions for applying it. <strong>Layer 1 is a table of contents that says "what exists and when to use it," plus the common rules</strong>.

Apart from the four layers, there is one small file that always applies: `~/.cursor/rules/pstack-models.mdc`, the model-settings rule that `/setup-pstack` writes. It is a short file with one role per line, so it takes up little context even though it always applies. [Chapter 34](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/c37697) covers it in detail.

<a id="this-design-draws-the-same-line-as-the-principle-%22guard-the-context-window%22"></a>


## This design draws the same line as the principle "Guard the Context Window"

pstack's loading design draws <strong>the same line that the principle "[Guard the Context Window](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-guard-the-context-window/SKILL.md)" asks the agent to draw</strong>.

<a id="keep-what-you-use-every-time-inside%2C-and-what-you-use-conditionally-outside"></a>


### Keep what you use every time inside, and what you use conditionally outside

This principle states that <strong>the context window is finite, and every token should be worth its cost</strong>. When the context window fills up, the quality of reasoning drops.

The same principle has an item that says to keep references you use every time inside the Skill's file. pstack does the same. It keeps the Principle index and `Non-negotiables`, which it uses every time, inside `SKILL.md`. It puts the bodies it uses only when conditions apply in separate files. The line it draws is <strong>what you use every time goes inside, and what you use sometimes goes outside</strong>.

<a id="the-way-it-hands-work-to-subagents-also-saves-context"></a>


### The way it hands work to subagents also saves context

The "Subagents" section of `SKILL.md` makes it <strong>the default to pass subagents file locations instead of copying context into the handoff</strong> ([Chapter 35](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/9cd5c1)). Subagents open the files they need themselves, so the main agent does not have to build up a long context and pass it along.

<a id="this-design-has-three-strengths%2C-and-checks-along-the-way-make-up-for-its-weakness"></a>


## This design has three strengths, and checks along the way make up for its weakness

This design has the following three strengths.

1. <strong>It saves tokens and cost.</strong> Procedures and criteria that the work does not use take up no context, so there is room left before the context window overflows. In [Part 2](https://x.com/poteto/status/2097732320606507506) of *The Complete Guide to pstack*, poteto also gives token efficiency as the reason pstack loads one Playbook at a time.
2. <strong>The work stays consistent.</strong> The agent reads each part's full body at the moment it needs that part, so the work does not depend on the agent's memory or paraphrase.
3. <strong>There is little to remember.</strong> The user does not memorize 70 names and when to use each. Remembering `/poteto-mode` is enough.

<a id="weakness%3A-the-agent-decides-which-conditions-apply"></a>


### Weakness: the agent decides which conditions apply

The weakness of this design is that <strong>the agent decides which Principle or Playbook applies</strong>. If the agent decides wrong, it may not read a body it should have read.

In this book, I read the following pstack mechanisms as ways to make up for this weakness with checks along the way.

<table class="code-line" data-line="58">
<thead class="code-line" data-line="58">
<tr class="code-line" data-line="58">
<th>Mechanism</th>
<th>What the user can check</th>
</tr>
</thead>
<tbody class="code-line" data-line="60">
<tr class="code-line" data-line="60">
<td>A skipped step stays in the TODO list as <code>skip: &lt;reason&gt;</code>
</td>
<td>Which steps the agent did not do, and why</td>
</tr>
<tr class="code-line" data-line="61">
<td>The reply names each Principle that changed a decision (it may name only Principles whose bodies it read)</td>
<td>Which criteria the agent read, and which choices they shaped</td>
</tr>
<tr class="code-line" data-line="62">
<td>One word that names a Principle is enough to change direction</td>
<td>You can fix a wrong decision during the work</td>
</tr>
</tbody>
</table>

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="65">The <strong>TODO list</strong> is the plan, a list of things to do that the agent makes at the start of the work. In Cursor, the TODO list appears in the chat panel. From this list, the user can check which steps the agent carried out and which steps it skipped. The agent marks a skipped step with <code>skip: &lt;reason&gt;</code> (the bundled guide <a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md" rel="nofollow noopener noreferrer" target="_blank"><code>01-setup.md</code></a>).</p>
</div></aside>

<a id="summary"></a>


## Summary

- <strong>Four layers.</strong> pstack loads four layers, each at the moment the agent needs it. The layers are the entry point, the procedure, the judgment, and the capability. The only thing it always reads is the entry point's `SKILL.md`, which holds the table of contents, the index, and the common rules.
- <strong>The idea behind the design.</strong> Like the principle "Guard the Context Window," it keeps the index it uses every time inside, and the bodies it uses conditionally outside.
- <strong>Strengths and weakness.</strong> The strengths are token efficiency, consistency, and little to remember. The weakness is that the agent decides which conditions apply. The user checks those decisions through the TODO list and the replies.

[Part II](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/8c629d) has looked at what pstack solves, how the entry point `/poteto-mode` routes requests, how the three parts divide the work, and how pstack loads them. From the next part, [Part III](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/0d1535), the book goes through the 23 Playbooks one at a time. The first chapter, [Chapter 10](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/b77ae2), covers the Playbook for investigating and diagnosing a problem without changing code.
<!-- book-body:end -->

---

[Contents](README.md) · [Previous](11-chapter.md) · [Next](13-chapter.md) · [简体中文](../zh-CN/12-chapter.md)
