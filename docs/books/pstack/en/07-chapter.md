# Chapter 5: Build automation on a foundation of trust

[Contents](README.md) · [Previous](06-chapter.md) · [Next](08-chapter.md) · [简体中文](../zh-CN/07-chapter.md)

By kaito · [Japanese original](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b6ac2d) · [Author’s English edition](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/aa6858)

Source snapshot: 2026-10-03. The text below preserves the author’s English edition.

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
Automation <strong>works only once the agent can verify artifacts, you have defined the work procedures, and the codebase keeps past decisions</strong>.

For this reason, poteto put automation last of the four themes in the [talk](https://x.com/poteto/status/2102050467505430555).

This chapter explains, in order, why automation comes last, which work you can automate first, what you can automate once the foundation is in place, and what is left for humans after automation.

<a id="how-this-chapter-is-organized"></a>


## How this chapter is organized

This chapter is organized as follows.

- Why automation comes last
- Which work you can automate first
- What you can automate once the foundation is in place
- What is left for humans after automation
- Summary: automation goes last, on top of trust and memory

<a id="why-automation-comes-last"></a>


## Why automation comes last

Automation comes last for two reasons.

1. <strong>If you automate without a foundation, what grows is not results but artifacts nobody can check and repeated failures</strong>
2. <strong>The agent's ability alone does not make quality stable. You first need an environment where that ability can work</strong>

<a id="automation-without-a-foundation-multiplies-artifacts-nobody-can-check"></a>


### Automation without a foundation multiplies artifacts nobody can check

The talk takes each missing foundation in turn and explains what happens when you automate without it.

<table class="code-line" data-line="27">
<thead class="code-line" data-line="27">
<tr class="code-line" data-line="27">
<th>Missing foundation</th>
<th>What happens when you automate</th>
</tr>
</thead>
<tbody class="code-line" data-line="29">
<tr class="code-line" data-line="29">
<td>You cannot trust the work (<a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/950071" target="_blank">Chapter 2</a>, <a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/87177c" target="_blank">Chapter 3</a>)</td>
<td>Artifacts whose correctness nobody can check pile up</td>
</tr>
<tr class="code-line" data-line="30">
<td>The codebase does not keep past decisions (<a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3cc0dd" target="_blank">Chapter 4</a>)</td>
<td>The same failures repeat again and again</td>
</tr>
<tr class="code-line" data-line="31">
<td>Several ways of implementing the same thing remain, with no order (<a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3cc0dd" target="_blank">Chapter 4</a>)</td>
<td>Automation produces undesirable patterns in bulk</td>
</tr>
</tbody>
</table>

In every case, <strong>automation takes a problem the missing foundation already had and multiplies it as is</strong>. So <strong>automation goes in the last stage, after the three foundations are in place</strong>.

<a id="a-michelin-kitchen-needs-procedures-and-tools-as-well-as-skilled-cooks"></a>


### A Michelin kitchen needs procedures and tools as well as skilled cooks

The talk explains the second reason with the image of a Michelin kitchen.

The talk describes a system that combines agents, development tools, verification, and automation to keep producing software changes, and calls this system a "software factory." It also compares the same system to a "Michelin kitchen."

A kitchen that serves high-quality food consistently needs more than excellent cooks. It also needs the following systems.

- Cooking procedures
- Tools
- Ingredient management
- Hygiene standards
- Division of roles
- A system for checking quality

Development with agents is the same. <strong>Instead of relying on the agent's ability alone, you have to design an environment where the agent can use that ability safely.</strong>

The verification tools, the work procedures, and the codebase as memory that Chapters 2 to 4 covered make up this environment.

<a id="which-work-you-can-automate-first"></a>


## Which work you can automate first

You can automate <strong>work that meets all five of the following conditions</strong>.  
Earlier chapters of this book cover each condition.

<table class="code-line" data-line="59">
<thead class="code-line" data-line="59">
<tr class="code-line" data-line="59">
<th>Condition to set up before automating</th>
<th>Chapter that covers it</th>
</tr>
</thead>
<tbody class="code-line" data-line="61">
<tr class="code-line" data-line="61">
<td>The agent can verify artifacts directly</td>
<td>
<a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/950071" target="_blank">Chapter 2</a>, <a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/87177c" target="_blank">Chapter 3</a> (way 1)</td>
</tr>
<tr class="code-line" data-line="62">
<td>You have defined high-quality work procedures</td>
<td>
<a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/87177c" target="_blank">Chapter 3</a> (way 2)</td>
</tr>
<tr class="code-line" data-line="63">
<td>The codebase keeps past decisions</td>
<td><a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3cc0dd" target="_blank">Chapter 4</a></td>
</tr>
<tr class="code-line" data-line="64">
<td>The recommended way to implement things is clear</td>
<td>
<a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3cc0dd" target="_blank">Chapter 4</a> (the paved path)</td>
</tr>
<tr class="code-line" data-line="65">
<td>Automated checks can stop undesirable implementations</td>
<td>
<a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/87177c" target="_blank">Chapter 3</a> (encoding lessons in structure), <a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3cc0dd" target="_blank">Chapter 4</a>
</td>
</tr>
</tbody>
</table>

<a id="what-you-can-automate-once-the-foundation-is-in-place"></a>


## What you can automate once the foundation is in place

Once the foundation is in place, <strong>you can automate the work up to the point where the agent receives a bug report from a user and tries to reproduce it. There is also a plan to go as far as the fix once the verification skill and the Feature Map are good enough.</strong>

The talk describes an end state. Once the conditions from "[Which work you can automate first](#which-work-you-can-automate-first)" are in place, a system combines several agents and tools to keep implementing changes, verifying them, and shipping them to production.

<a id="combine-the-components-once-the-conditions-are-in-place"></a>


### Combine the components once the conditions are in place

The talk names the following four components for building this system. Each one is something you combine only after the conditions from the previous section are in place.

- <strong>Grok Bot.</strong> An AI bot app. You can install pstack in it as a plugin.
- <strong>Cloud Agents.</strong> Agents that run in virtual environments on Cursor's cloud infrastructure.
- <strong>automations.</strong> A mechanism that runs a process at a scheduled time or when an event happens.
- <strong>Agent SDK.</strong> A development kit for calling agents from a program.

*The Complete Guide to pstack* [Part 1](https://x.com/poteto/status/2094457600259842065) explains how to use three of these as follows.

- <strong>Cloud Agents.</strong> Each agent runs on its own real computer, where it can install dependencies, run the app, and record videos and screenshots.
- <strong>Grok Bot.</strong> Instead of doing the work itself, the bot starts Cloud Agents. This division of work keeps the bot free. It also keeps the small back-and-forth of the work, such as reading code and running commands, out of the bot's context window. So <strong>you use the bot as a coordinator that manages and supervises Cloud Agents</strong>.
- <strong>Grok Bot routines and Cursor Automations.</strong> Once you are satisfied with a verification skill, you add it here and have it run on a schedule or when an event happens.

<a id="in-automatic-reproduction-of-reports%2C-the-quality-of-the-foundation-shows-directly-in-the-result"></a>


### In automatic reproduction of reports, the quality of the foundation shows directly in the result

Automatic reproduction of reports is a clear example of how the quality of the foundation decides how well automation works.

*The Complete Guide to pstack* Part 1 gives the following use as an example of automation.

1. Have the bot listen to the Slack channel that carries user feedback, or to an internal feedback channel
2. Each time a report arrives, have Cloud Agents try to reproduce it automatically
3. If the verification skill and the Feature Map are good enough, even have the agents go on to the fix automatically

The third step comes with a condition: "if the verification skill and the Feature Map are good enough." From this condition, you can read that <strong>how far automation can go depends on the quality of the tools that operate the app to verify it ([Chapter 3](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/87177c)) and of the memory that records how to use and verify each feature, the Feature Map ([Chapter 4](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3cc0dd))</strong>.

<a id="what-is-left-for-humans-after-automation"></a>


## What is left for humans after automation

What is left for humans is <strong>setting the direction and holding final responsibility</strong>.

The agent works inside an environment that provides clear procedures and constraints. If that environment is good enough, a human does not need to watch beside the agent all the time, and the agent keeps working at a steady quality even while the human is away.

The "[Autonomy](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#autonomy)" section of pstack's entry point, [`/poteto-mode`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md), draws the line between the human and the agent in concrete terms. The section says that <strong>the agent goes ahead with reversible work without asking the human, and always waits for the human before an irreversible write, such as a force-push to a shared branch, a deploy, a data deletion, or a message to a customer</strong> ([Chapter 35](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/9cd5c1)).

[Chapter 20](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/0ec4d6) covers the thinking behind this line as the principle "[Never Block on the Human](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-never-block-on-the-human/SKILL.md)."

Individual Playbooks state the same line. The "Babysit" Playbook ([`playbooks/babysit.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md)), which carries a PR to a mergeable state, does not merge on its own. When a human explicitly asks for a merge, the Playbook hands off to the "[Shipping](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/shipping.md)" Playbook, which handles merging. The [bundled guide](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md) explains that the agent does not merge on its own even when every check passes, because merging is a separate decision.

The talk also looks further ahead. It says that trust in the agent's artifacts grows as a codebase gets closer to one whose correctness can be formally verified. Someday, human code review itself may become an exceptional task instead of routine work.

<a id="summary%3A-automation-goes-last%2C-on-top-of-trust-and-memory"></a>


## Summary: automation goes last, on top of trust and memory

- <strong>Why automation comes last.</strong> If you automate without a foundation, you multiply artifacts nobody can check, repeated failures, and undesirable patterns. Also, as the talk's Michelin kitchen comparison shows, the agent's ability is not enough, and you need an environment where that ability can work.
- <strong>Which work you can automate first.</strong> Start with work that meets all five conditions this book laid out: the agent can verify it directly, it has procedures, the codebase keeps past decisions, the recommended implementation is clear, and automated checks can stop undesirable implementations.
- <strong>What you can automate.</strong> You can automate the work up to the reproduction of a bug report from a user. There is also a plan to go as far as the fix once the verification skill and the Feature Map are good enough. You combine Grok Bot, Cloud Agents, automations, and the Agent SDK only after the conditions are in place.
- <strong>What is left for humans.</strong> Humans set the direction and hold final responsibility. `/poteto-mode` requires the agent to always stop before an irreversible operation.

[Part I](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/367ace) followed the talk's four themes to look at the conditions for delegating work, with little mention of pstack's concrete components. The four themes are trust, ways to raise trust, the codebase as memory, and automation. [Part II](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/8c629d) looks at how pstack meets these conditions with components called Skills, Playbooks, and Principles.
<!-- book-body:end -->

---

[Contents](README.md) · [Previous](06-chapter.md) · [Next](08-chapter.md) · [简体中文](../zh-CN/07-chapter.md)
