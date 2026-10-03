# Chapter 4: Make the codebase the agent's memory

[Contents](README.md) · [Previous](05-chapter.md) · [Next](07-chapter.md) · [简体中文](../zh-CN/06-chapter.md)

By kaito · [Japanese original](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/dc9141) · [Author’s English edition](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3cc0dd)

Source snapshot: 2026-10-03. The text below preserves the author’s English edition.

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
The memory that lets the agent carry forward earlier decisions belongs in the <strong>codebase</strong>, not in the model.

poteto presented this idea as the third theme of the [talk](https://x.com/poteto/status/2102050467505430555).

This chapter explains why knowledge belongs in the repository and how to choose the memory you keep and maintain it over time.

<a id="how-this-chapter-is-organized"></a>


## How this chapter is organized

This chapter covers the following topics.

- Why put knowledge in the repository rather than in the model
- How kept memory goes stale, and how to maintain it
- What to delete so that the next agent's examples stay clean
- How to keep up the maintenance work
- Summary: choose what memory to keep, and maintain it

<a id="why-put-knowledge-in-the-repository-rather-than-in-the-model"></a>


## Why put knowledge in the repository rather than in the model

You put knowledge in the repository because <strong>the context the agent can handle at once is limited, and you cannot pack all the knowledge it needs into every prompt</strong>.

You cannot include every past decision, known issue, reproduction step, and workaround in every request.

If the knowledge lives in the repository, <strong>the agent can read what is there and continue the work instead of thinking from zero each time</strong>.

Memory here means more than code. The following items also act as memory that passes past decisions to the next agent.

- The Feature Map, a document that records how to use and verify each feature of the app. [The section on how kept memory goes stale](#how-kept-memory-goes-stale%2C-and-how-to-maintain-it) covers it in detail.
- Reproduction steps
- Design constraints
- Tests
- Lint rules

poteto writes the same idea in [Part 1](https://x.com/poteto/status/2094457600259842065) of *The Complete Guide to pstack*.

> Personally, I think your codebase is the ultimate form of memory.

poteto explains why. Unlike Markdown notes and the other forms often used for agent memory, <strong>code reflects the decisions the team has actually made, and it is a reliable source for what actually happens and how things work</strong>.

<a id="how-kept-memory-goes-stale%2C-and-how-to-maintain-it"></a>


## How kept memory goes stale, and how to maintain it

Of the memory you keep, <strong>the kind that needs maintenance is memory like the Feature Map, which goes stale without any signal when the app changes</strong>.

When tests or lint disagree with the app, CI fails, so you notice that they are stale. A Markdown document like the Feature Map, on the other hand, triggers nothing when the app changes.

The verification page of the guide bundled with pstack ([`docs/guide/06-verify-and-ship.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md)) also opens its section on maintenance with this sentence.

> Apps change and feature maps rot.

An agent given a stale Feature Map trusts what it says, operates the app accordingly, and spends time looking for screens that no longer exist.

<a id="the-feature-map-records-how-to-use-and-verify-each-feature"></a>


### The Feature Map records how to use and verify each feature

The Feature Map is a document that records, for each feature of the app, what it does, how an end user reaches it, how to operate it with the verification skill, and what result to check.

With a Feature Map, the agent does not have to read the whole codebase, because it reads only the files for the features it needs. Part 1 of *The Complete Guide to pstack* describes the Feature Map as one form of memory that saves context tokens.

In pstack, [`/create-verification-skill`](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md) creates the Feature Map along with the verification skill ([Chapter 3](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/87177c)). [Chapter 36](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/c9901e) covers the file format and what to write.

<a id="keep-the-feature-map-current-with-%2Fmaintain-verification-skill"></a>


### Keep the Feature Map current with `/maintain-verification-skill`

[`/maintain-verification-skill`](https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md) repeatedly checks that the Feature Map matches the current app. [Chapter 36](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/c9901e) covers details such as how often to run it.

According to the bundled guide's verification page, [`06-verify-and-ship.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md), `/maintain-verification-skill` works in this order.

1. Run subagents in parallel, one per feature, that read only the source
2. Actually run every feature in the map and verify it
3. Return exactly one of these results
   - <strong>`clean`.</strong> It verified every feature in the map and found nothing to fix.
   - <strong>`changed`.</strong> It fixed the mismatches and put the verified fixes in one PR. The fixes stay inside the verification skill's directory.
   - <strong>`blocked`.</strong> It could not continue verifying, and it reports what got in the way.

The same page goes on to say this.

> It never edits product code. If the live pass catches a product regression, it reports the regression instead of papering over it in docs.

<strong>When the app and the memory disagree, `/maintain-verification-skill` does not rewrite the memory to make them agree</strong>.

A mismatch has two possible causes.

- <strong>The app changed.</strong> The memory is out of date, so fix the memory.
- <strong>The app broke.</strong> The app is wrong, so leave the memory alone and report the bug.

If you fix the memory in the second case, <strong>the broken behavior stays in memory as the correct behavior</strong>.

[Chapter 26](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/9884cb) and [Chapter 36](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/c9901e) cover how to build and maintain the Feature Map.

<a id="what-to-delete-so-that-the-next-agent's-examples-stay-clean"></a>


## What to delete so that the next agent's examples stay clean

Delete <strong>ad hoc workarounds and second ways of doing the same thing</strong>.

Both stay in the code, and the next agent reads them as examples to follow.

<a id="a-workaround-you-keep-becomes-the-next-agent's-example"></a>


### A workaround you keep becomes the next agent's example

If you keep a workaround, the next agent copies it, so delete it once you fix the cause.

You should not keep everything as memory. If you keep an ad hoc workaround, <strong>the next agent takes it for a correct implementation and copies it. The copy then produces the next copy, and an undesirable pattern spreads without anyone noticing</strong>.

Two pstack principles also mention this danger.

- "[Encode Lessons in Structure](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-encode-lessons-in-structure/SKILL.md)": as [Chapter 3](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/87177c) showed, this principle explains that the agent copies what the surrounding code does, so a weak mechanism becomes the example for the next code.
- "[Fix Root Causes](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-fix-root-causes/SKILL.md)": this principle says that fixes for symptoms pile up, and it says the following.

> If a workaround needs a paragraph-long comment to justify it, the code is wrong.

pstack also guards against leftover workarounds inside its steps. The "Bug fix" Playbook ([`playbooks/bug-fix.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md)) says the following before its steps.

> Belt-and-suspenders that "might help" is a hypothesis, not a fix. It does not ship. When evidence refutes a hypothesis, revert what it motivated.

This book reads the rule as a guard that keeps trial changes from staying in the code as workarounds.

<a id="narrow-the-recommended-implementation-to-one-and-build-a-%22paved-path%22"></a>


### Narrow the recommended implementation to one and build a "paved path"

If there are two or more ways to do the same thing, keep the one you recommend, delete the older one, and use lint to block the others.

Remove the technical debt, narrow the recommended implementation to one, and detect anti-patterns mechanically with lint or similar tools. Then <strong>the agent no longer has to choose among several methods every time</strong>.

The talk calls this standard implementation the "<strong>paved path</strong>". It means a state where the agent follows a maintained route instead of looking for its own shortcut every time.

Some pstack principles exist to pave this path. The list of principles in the [README](https://github.com/cursor/plugins/blob/main/pstack/README.md#principles) summarizes two of them as follows.

- "Subtract Before You Add" ([`principle-subtract-before-you-add`](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-subtract-before-you-add/SKILL.md)): first remove what is unneeded, duplicated checks, and references with nothing behind them, then build on the simpler base.
- "Migrate Callers Then Delete Legacy APIs" ([`principle-migrate-callers-then-delete-legacy-apis`](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md)): if you do not need to keep external compatibility, switch the code that uses the old API to the new API and delete the old API in the same change. Do not keep a compatibility layer, that is, code that you keep only so that code using the old API keeps working.

If you keep a compatibility layer, the codebase has two paths that do the same thing, and the agent treats both as examples. [Chapter 17](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/97d863) and [Chapter 18](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e529e4) cover each principle in detail.

In this book, I treat the choice of which way becomes the paved path as a human decision. The human's role is to set the direction and take final responsibility ([Chapter 5](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/aa6858)), and I read the choice of the paved path as part of setting that direction.

<a id="how-to-keep-up-the-maintenance-work"></a>


## How to keep up the maintenance work

You keep up the maintenance work with pstack's parts.

The talk compares the work of keeping this environment in shape to a <strong>gardener</strong>'s work. A garden does not stay healthy if you only add plants. You have to keep removing unneeded branches and weeds and keep maintaining it so that the plants you want can grow.

The same is true of a codebase. <strong>You have to keep removing old workarounds and bad implementation examples, in addition to adding knowledge</strong>.

pstack has parts that help with this maintenance.

<table class="code-line" data-line="137">
<thead class="code-line" data-line="137">
<tr class="code-line" data-line="137">
<th>Maintenance task</th>
<th>pstack part that helps</th>
</tr>
</thead>
<tbody class="code-line" data-line="139">
<tr class="code-line" data-line="139">
<td>When you make the same correction twice, turn it into a mechanism</td>
<td>The principle "Encode Lessons in Structure" (<a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/87177c" target="_blank">Chapter 3</a>, <a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/10f4b3" target="_blank">Chapter 21</a>)</td>
</tr>
<tr class="code-line" data-line="140">
<td>Watch for a growing number of comments that turn off lint or type checks</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/no-comments/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/no-comments</code></a>, a Skill that removes unneeded comments. Its step 2, which reviews subagent reports and the diff, asks it to look for lint and TypeScript suppressions that slipped through (<a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/347946" target="_blank">Chapter 31</a>)</td>
</tr>
<tr class="code-line" data-line="141">
<td>Replace comments that say "do not delete" or "do not change" with types, tests, or lint</td>
<td>Step 5 of <code>/no-comments</code>, which handles comments that state constraints. The step proposes that the agent replace the comment with the lightest option among a type, a runtime check, a test, and a lint rule in CI</td>
</tr>
<tr class="code-line" data-line="142">
<td>Find two or more ways to do the same thing and narrow them to one</td>
<td>The principles "Subtract Before You Add" and "Migrate Callers Then Delete Legacy APIs" (<a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/97d863" target="_blank">Chapter 17</a>, <a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e529e4" target="_blank">Chapter 18</a>)</td>
</tr>
<tr class="code-line" data-line="143">
<td>Verify that the Feature Map and reproduction steps match the current app</td>
<td>
<code>/maintain-verification-skill</code> (<a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/9884cb" target="_blank">Chapter 26</a>)</td>
</tr>
<tr class="code-line" data-line="144">
<td>Keep the steps learned in a long task for next time</td>
<td>
<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/reflect/SKILL.md" rel="nofollow noopener noreferrer" target="_blank"><code>/reflect</code></a>. The README describes it as a Skill that saves the steps of a finished long task as edits to Skills (<a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/7c5f9e" target="_blank">Chapter 33</a>)</td>
</tr>
</tbody>
</table>

So pstack has Skills that write code, and it also has <strong>parts that remove workarounds, comments that turn off checks, and old APIs, and parts that replace comments that state constraints with types or lint</strong>.

<a id="summary%3A-choose-what-memory-to-keep%2C-and-maintain-it"></a>


## Summary: choose what memory to keep, and maintain it

- <strong>Why put knowledge in the repository.</strong> Context is limited, and you cannot pack the knowledge the agent needs into every prompt. poteto calls the codebase "the ultimate form of memory".
- <strong>How memory goes stale and how to maintain it.</strong> When tests or lint go stale, CI tells you, but Markdown like the Feature Map goes stale without any signal. Check the Feature Map repeatedly with `/maintain-verification-skill`, and when the app is broken, report the bug instead of fixing the memory.
- <strong>What to delete.</strong> Delete ad hoc workarounds and second ways of doing the same thing. Both become examples for the next agent. As the "Bug fix" Playbook says, revert a trial change as soon as evidence refutes it. Narrow the recommended way to one and block the others with lint. A human decides which way to keep.
- <strong>How to keep up the maintenance.</strong> As with a garden, you keep a codebase in shape by removing things all the time, not only by adding them. pstack has parts that help, such as the principle that turns repeated corrections into mechanisms and `/no-comments`, which looks for suppressed checks.

With this chapter, the book has covered what to trust ([Chapter 2](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/950071)), how to build trust ([Chapter 3](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/87177c)), and the memory that carries trust forward (Chapter 4). [Chapter 5](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/aa6858) covers the talk's last theme, automation. It explains why automation comes last, which work you can start automating, what you can automate, and what remains for humans after automation.
<!-- book-body:end -->

---

[Contents](README.md) · [Previous](05-chapter.md) · [Next](07-chapter.md) · [简体中文](../zh-CN/06-chapter.md)
