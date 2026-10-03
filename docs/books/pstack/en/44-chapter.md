# Chapter 37: Guide 2: share the goal, then align on problem and history

[Contents](README.md) · [Previous](43-chapter.md) · [Next](45-chapter.md) · [简体中文](../zh-CN/44-chapter.md)

By kaito · [Japanese original](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/b4b9a1) · [Author’s English edition](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/6a59d6)

Source snapshot: 2026-10-03. The text below preserves the author’s English edition.

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
[Chapter 36](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/c9901e) covered why you build the verification skill first, and how to build it, keep it current, and use it.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="3"><strong>Verification skill</strong>: a project-specific Skill that the agent uses to start and drive the app and collect evidence.<br/>
With a verification skill, the agent can verify its own changes.</p>
</div></aside>

This chapter and the next two, up to [Chapter 39](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/f87769), explain how to decide together with the agent what to build: which problem to solve, with what design, and on what plan.

All three chapters draw on [Part 2](https://x.com/poteto/status/2097732320606507506) of *The Complete Guide to pstack* (in these three chapters I call it "the guide").

Part 2 explains how poteto uses pstack for investigation, planning, prototyping, and architecture design, once the agent can verify its own work.

In this book, I sum up the guide in thirteen key points. This chapter explains key points 1 to 4.

When you decide what to build, the first thing the human should do is <strong>make the agent understand the problem the same way the human does, and hand the agent the context of past work</strong>.

The context of past work means what earlier conversations investigated, decided, and failed at.

The agent has to understand the problem the way the human does for one reason. If the two understandings stay apart, <strong>the agent solves a problem the human did not mean, however well it writes the code</strong>.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="22"><a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/031877" target="_blank">Chapter 22</a> explained the steps and output of <code>/how</code>, <code>/why</code>, <code>/teach</code>, and <code>/recall</code>, which key points 3 and 4 use.</p>
<p class="code-line" data-line="24">This chapter leaves out the following and focuses on the uses the guide recommends.</p>
<ul class="code-line" data-line="26">
<li class="code-line" data-line="26">
<strong>How <code>/how</code> investigates.</strong> For a complex question, <code>/how</code> splits the work between a role that gathers facts and a role that writes the explanation, and explains under five headings, from Overview to Gotchas.</li>
<li class="code-line" data-line="27">
<strong>How <code>/why</code> investigates.</strong> <code>/why</code> starts investigator agents in parallel, one for each place evidence lives, such as git, tickets, and chat. It then sorts each reason it finds into one of five levels of confidence, from Direct to Unknown.</li>
<li class="code-line" data-line="28">
<strong>How <code>/teach</code> runs an explanation.</strong> <code>/teach</code> decides a few points the reader should take away, answers in one or two sentences, and waits for the reader's response.</li>
<li class="code-line" data-line="29">
<strong>What <code>/recall</code> outputs.</strong> <code>/recall</code> sums up the state of the work under four headings: Capsule, Threads, Problems, and Next move.</li>
</ul>
</div></aside>

<a id="how-this-chapter-is-organized"></a>


## How this chapter is organized

This chapter covers the following topics.

- The thirteen key points, and how key points 1 to 4 connect
- Key point 1: convey the goal and background, and do not over-specify the solution
- Key point 2: have the agent restate the problem before implementation
- Key point 3: learn the mechanism and the reasons with /how, /why, and /teach
- Key point 4: carry past work into a new conversation with /recall
- Summary

<a id="the-thirteen-key-points%2C-and-how-key-points-1-to-4-connect"></a>


## The thirteen key points, and how key points 1 to 4 connect

<strong>This book prepared the thirteen key points as a summary of the guide</strong>.

In all three chapters, I write each key point in two sections.

- <strong>The guide's view.</strong> What the guide recommends.
- <strong>pstack.</strong> Which pstack Skill or Playbook implements that view.

For a key point with no direct match in pstack, I leave out the pstack section.

The thirteen key points are as follows.

<table class="code-line" data-line="56">
<thead class="code-line" data-line="56">
<tr class="code-line" data-line="56">
<th>No.</th>
<th>Matching sections of Part 2</th>
<th>Summary</th>
</tr>
</thead>
<tbody class="code-line" data-line="58">
<tr class="code-line" data-line="58">
<td>1</td>
<td>"The art of supervising someone smarter than you", "In your own words"</td>
<td>The human gives the agent enough of the goal and background, and does not over-specify the concrete solution. An open solution gives the agent room to look for solutions the human did not think of</td>
</tr>
<tr class="code-line" data-line="59">
<td>2</td>
<td>"In your own words"</td>
<td>Before implementation, the human has the agent explain the problem in its own words. The human finds the agent's misunderstandings early, and avoids narrowing the agent's investigation with the human's own hypothesis</td>
</tr>
<tr class="code-line" data-line="60">
<td>3</td>
<td>"Building up a mental model"</td>
<td>The human has the agent investigate the current mechanism with <code>/how</code> and the design background with <code>/why</code>, and turn them into an explanation the human can understand with <code>/teach</code>. The investigation that the agent does for the explanation also helps the agent's own understanding</td>
</tr>
<tr class="code-line" data-line="61">
<td>4</td>
<td>"Learning from history"</td>
<td>The human has the agent look back at related work in past conversations with <code>/recall</code>, and carry earlier investigations, decisions, and failures into the new work. With them, the agent does not devise a solution from only the symptom in front of it</td>
</tr>
<tr class="code-line" data-line="62">
<td>5</td>
<td>"Working backwards"</td>
<td>The human has the agent write a README or tutorial before implementation, and design the API and internals from how users will use them</td>
</tr>
<tr class="code-line" data-line="63">
<td>6</td>
<td>"Working backwards"</td>
<td>The agent uses <code>/technical-writing</code> to split documents by purpose into tutorial, how-to, reference, and explanation, and uses <code>/unslop</code>, which it calls internally, to remove the unnatural phrasing AI tends to write</td>
</tr>
<tr class="code-line" data-line="64">
<td>7</td>
<td>"Measure a hundred times, cut once"</td>
<td>The human does not adopt the agent's first design as is. The human has the agent build prototypes of several options and compares them by screenshots taken during use, measured times, and layouts</td>
</tr>
<tr class="code-line" data-line="65">
<td>8</td>
<td>"Measure a hundred times, cut once", "Architecting bigger changes"</td>
<td>The human has the agent itself verify the questions that a small build-and-run experiment can answer. Prototypes and verification reduce uncertainty better than rounds of review on an abstract plan</td>
</tr>
<tr class="code-line" data-line="66">
<td>9</td>
<td>"Architecting bigger changes"</td>
<td>For a large change, the human spends time to think about how the system holds data and how systems connect. The agent uses <code>/architect</code> to investigate existing constraints and design, and compares and merges independent options from several models before implementing</td>
</tr>
<tr class="code-line" data-line="67">
<td>10</td>
<td>"Architecting bigger changes"</td>
<td>If implementation finds a conflict with the design, the agent revisits the design. Depending on the evidence from implementation (for example, a type needed <code>any</code> or a forced cast), the agent throws away the design and starts over</td>
</tr>
<tr class="code-line" data-line="68">
<td>11</td>
<td>"Okay but I really want a planning doc"</td>
<td>Once the design is concrete, the agent uses a planning Playbook to split the work into tasks or PRs that it can verify in small pieces. For each task, it sets the result of running the code as the evidence of completion</td>
</tr>
<tr class="code-line" data-line="69">
<td>12</td>
<td>"Okay but I really want a planning doc"</td>
<td>The plan document from the planning Playbook is temporary. It exists to carry out the work and, for large work, to share progress with other agents. poteto usually deletes it after completion</td>
</tr>
<tr class="code-line" data-line="70">
<td>13</td>
<td>"The workflow in practice"</td>
<td>
<code>/poteto-mode</code> is the entry point that uses Playbooks and Skills according to the request. The human tells <code>/poteto-mode</code> the goal, the constraints, the results to check, and when to review</td>
</tr>
</tbody>
</table>

The "Matching sections of Part 2" column gives the names of the guide's sections that cover each key point. Use them to find your place when you reread the guide.

<a id="key-points-1-to-4-are-the-basic-moves-of-supervision"></a>


### Key points 1 to 4 are the basic moves of supervision

Key points 1 to 4 serve one job, which the guide describes in two sections.

The guide's section "The art of supervising someone smarter than you" covers the job of a human who supervises someone smarter than themselves. Here, that someone is the latest models.

With an agent, a human can change a system without knowing the code well. But <strong>it is still hard to keep the quality of the code and the user experience high</strong>. The job is harder still for someone who is not an expert and does not know what to check and what to ask.

The next section, "In your own words", describes this supervision as <strong>work done in a codebase the human did not write, in a situation where the human can no longer keep the structure of the whole codebase in their head</strong>.

<strong>In this book, I treat key points 1 to 4 as the basic moves of this job</strong>.

- <strong>How to convey (key point 1).</strong> What to say in a request, and what not to over-specify.
- <strong>How to check understanding (key point 2).</strong> How to check, before implementation, that the agent's understanding has not drifted from the human's intent.
- <strong>How to deepen the human's understanding (key point 3).</strong> How the human comes to understand how the code works now and why it was written that way.
- <strong>How to hand over past work (key point 4).</strong> How to hand earlier investigations, decisions, and failures to the agent in a new conversation.

<a id="key-point-1%3A-convey-the-goal-and-background%2C-and-do-not-over-specify-the-solution"></a>


## Key point 1: convey the goal and background, and do not over-specify the solution

The human writes enough of the <strong>goal, background, constraints, and known facts</strong> in the request, and <strong>does not go as far as the concrete solution, such as which function in which file to rewrite and how, or the implementation steps</strong>.

<a id="the-guide's-view%3A-hand-over-the-background%2C-leave-freedom-in-how-to-solve"></a>


### The guide's view: hand over the background, leave freedom in how to solve

In the section "The art of supervising someone smarter than you", poteto <strong>names two failures he keeps seeing even as models get more capable</strong>.

- The request's instructions are missing or unclear, and the agent does not fully understand the human's intent
- The agent lacks the context it needs to do the work correctly

These two problems are related, and both come down to one point.

"<strong>Whether you can use an agent well depends on how much high-quality context the human can put into the agent's context window</strong>"

The context window is the range of information an agent can read in at one time.

According to the section "In your own words", poteto used to give earlier models very specific instructions about what he wanted. He says the instructions came close to micromanagement.

But the latest models write code better than humans do. So, to "supervise someone smarter than you", it matters that you tell the agent what you want to achieve while <strong>leaving the agent free to solve the problem in a way the human did not think of</strong>.

<a id="pstack%3A-the-playbook-defines-the-steps"></a>


### pstack: the Playbook defines the steps

In pstack, the user conveys the goal, constraints, and known facts, and the Playbook defines the steps ([Chapter 7](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/55bbdb)).

The section "Say the goal, not the ceremony" of the bundled guide [`docs/guide/02-poteto-mode.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/02-poteto-mode.md) also recommends that the user leave the spec out of the request and write the following.

- What is wrong, or what you want
- Known facts that save the agent investigation time, if you have any

The same page gives the following one-line request as an example (the same example appears in [Chapter 7](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/55bbdb)).

```
/poteto-mode users get two notifications after a retry. repro first, then fix and verify.
```

This request <strong>states what is happening (two notifications arrive after a retry) and a constraint to follow (reproduce first)</strong>. It <strong>does not state a concrete solution, such as which function in which file to fix and how</strong>.

The request is a bug fix, so `/poteto-mode` picks the "[Bug fix](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md)" Playbook and copies its steps into the TODO list. The steps include reproduce, narrow down the cause, plan the fix, and confirm.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="132"><strong>TODO list</strong>: the plan that the agent makes at the start of a task, written as a list of things to do. From this list, the user can check which steps the agent worked through and which it skipped (<code>skip: &lt;reason&gt;</code>). The bundled guide <a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md" rel="nofollow noopener noreferrer" target="_blank"><code>01-setup.md</code></a> describes this list. In Cursor, the list appears in the chat view.</p>
</div></aside>

In the Pitfall at the end of the page, `02-poteto-mode.md` warns the user not to list Skills in the request in the order to use them, as in "`/how` and then `/architect`". The Playbook already sets the order of the work.

According to this Pitfall, <strong>when the agent follows the order the user wrote, it may reorder or drop steps that the Playbook would have kept</strong>.

`02-poteto-mode.md` does not forbid naming a Skill, though. It recommends naming a Skill only when you want to override a particular choice ([Chapter 7](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/55bbdb)).

So, when the Playbook defines the steps, <strong>the user leaves the steps out of the request and writes what is wrong, what they want, the constraints to follow, and the facts they already know</strong>.

<a id="key-point-2%3A-have-the-agent-restate-the-problem-before-implementation"></a>


## Key point 2: have the agent restate the problem before implementation

Before implementation starts, the human has the agent <strong>restate the problem in its own words</strong>, and checks for drift between the agent's understanding and the human's intent.

<a id="the-guide's-view%3A-three-effects-of-an-indirect-prompt"></a>


### The guide's view: three effects of an indirect prompt

The section "In your own words" describes an <strong>indirect prompt</strong>. Instead of saying directly what they want, the human has the agent restate the problem in the agent's own words, and so draws out the goal.

When someone reports a problem in Slack, poteto says he often <strong>has the agent read the thread and restate the problem before it does anything else</strong>. Here is an example of such a request.

```
/poteto-mode read this slack thread. restate in your own words and in plain english what you think the underlying issue is
```

poteto names three effects of this request.

- <strong>Sorting out the conversation.</strong> The agent can read a thread full of crossing messages and sum up what the problem is in a short, organized explanation.
- <strong>Catching misunderstandings early.</strong> If the agent has misunderstood the problem, the human can point out and correct the misunderstanding before the agent writes code.
- <strong>Not pushing a hypothesis.</strong> The human does not state their own hypothesis, so that hypothesis does not pull the agent when it frames the problem. The human's hypothesis can be wrong, and even when it is right, it can narrow the direction of the agent's investigation and solution.

An indirect prompt cuts rework and lets you work with the agent on shared assumptions and a shared understanding.

As a side note, poteto posted the following at the end of September 2026 with a concrete indirect prompt. You can copy and paste the prompt as is, and it should give the result you expect.

<span class="embed-block zenn-embedded zenn-embedded-tweet"><iframe data-content="https%3A%2F%2Fx.com%2Fpoteto%2Fstatus%2F2104744961904394699" frameborder="0" id="zenn-embedded__61cf36af9f698" scrolling="no" src="https://embed.zenn.studio/tweet#zenn-embedded__61cf36af9f698"></iframe></span><https://x.com/poteto/status/2104744961904394699>

<a id="key-point-3%3A-learn-the-mechanism-and-the-reasons-with-%2Fhow%2C-%2Fwhy%2C-and-%2Fteach"></a>


## Key point 3: learn the mechanism and the reasons with /how, /why, and /teach

The human has the agent investigate how the code works now with `/how` and why it was written that way with `/why`, and turn the results into <strong>an explanation the human can understand</strong> with `/teach`.

<a id="the-guide's-view%3A-understand-through-three-skills"></a>


### The guide's view: understand through three Skills

In the section "Building up a mental model", poteto writes that, to work with someone smarter than you, it matters to have the agent explain things again in a form the human can understand. `/teach` is the Skill for that.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="178"><strong>Mental model</strong>: the way of seeing things and the frame of thinking, or the assumptions, that a person holds without noticing, built from past experience and surroundings.</p>
</div></aside>

`/teach` calls `/how` and `/why` internally.

<table class="code-line" data-line="183">
<thead class="code-line" data-line="183">
<tr class="code-line" data-line="183">
<th>Skill</th>
<th>Role</th>
</tr>
</thead>
<tbody class="code-line" data-line="185">
<tr class="code-line" data-line="185">
<td><code>/how</code></td>
<td>Traces how the code behaves at runtime</td>
</tr>
<tr class="code-line" data-line="186">
<td><code>/why</code></td>
<td>Investigates the motive and intent behind the code's current shape from git history, PR review comments, tickets, design documents, and similar records</td>
</tr>
<tr class="code-line" data-line="187">
<td><code>/teach</code></td>
<td>Combines what <code>/how</code> and <code>/why</code> found into a plain explanation a human can follow. With that explanation, the human understands the agent's work better</td>
</tr>
</tbody>
</table>

You need `/why` because reading the code tells you what happens but <strong>almost never tells you why the author wrote it that way</strong>.

Here are example requests for the three Skills.  
"Virtualization" in the first example means rendering only the part of a long list that is visible on screen.

```
/how is virtualization implemented?

/why are we still stuck an old version of node.js?

/teach me why you implemented it this way and not <other way>. what were the tradeoffs you made and why?
```

Besides the help it gives the human, `/teach` has another effect. <strong>The investigation that the agent does to explain things to the human also helps the agent itself</strong>.

poteto says, "even the latest models still often state things confidently without checking the data or reading the code they need to understand the mechanism" (he adds that how often depends partly on the quality of the tool that runs the agent).

So when the agent explains to the human what it will do next, and why, the explanation helps the agent too.

<a id="pstack%3A-%2Fteach-keeps-the-confidence-language"></a>


### pstack: /teach keeps the confidence language

`/why` labels each reason it finds with one of five "confidence" levels. The level says how far records back that reason. `/teach` combines this output of `/why` into its explanation.

The [`SKILL.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/teach/SKILL.md) of `/teach` lets it rephrase freely for the explanation, with one exception. The sentence reads as follows.

> Keep `why`'s confidence language intact (its hedges are findings, not style).

In other words, `/teach` leaves the confidence language, such as "it seems that ..." and "it is likely that ...", unchanged because <strong>that language is not a writing habit. It is a result that `/why` found by investigation: how certain the reason is</strong>.

So a reason that `/why` presented as a guess also reaches the reader as a guess in the `/teach` explanation.

<a id="key-point-4%3A-carry-past-work-into-a-new-conversation-with-%2Frecall"></a>


## Key point 4: carry past work into a new conversation with /recall

The human has the agent look back at related work in past conversations with `/recall`, and <strong>carry earlier investigations, decisions, and failures into the new work</strong>.

The agent carries over failures too. <strong>If the agent does not know which approach failed before, it may try the same approach again</strong>.

<a id="the-guide's-view%3A-with-%2Frecall%2C-do-not-rebuild-the-context-from-scratch"></a>


### The guide's view: with /recall, do not rebuild the context from scratch

In the section "Learning from history", poteto writes about his work on virtualization bugs and performance problems that users reported in Cursor.

An earlier agent, in the separate session of a past conversation, often had rich context while it solved a similar problem. But each time you start a new chat, you have to rebuild that context almost from scratch.

From this, I read that <strong>past conversation logs often still hold much of the context the earlier agent had</strong>.

`/recall` is the Skill that deals with this problem.

`/recall` pulls recent context out of chat history, so that an agent in a new conversation can return to the work with the information it needs.

Here is an example request.

```
/recall the work i did yesterday on virtualization and then read this bug report on slack
```

<a id="pstack%3A-%2Frecall-also-gathers-the-record-of-failures"></a>


### pstack: /recall also gathers the record of failures

[`/recall`](https://github.com/cursor/plugins/blob/main/pstack/skills/recall/SKILL.md) searches the user's own chat history. When the topic names a particular feature, file, bug, or similar, it also searches records the team shares, kept in places such as the following.

- Source control
- Tickets
- Chat
- Error monitoring

Shared records hold important context, such as records of past failures. Examples are a fix that someone reverted after release, or an error that keeps occurring in production.

`/recall` can then return <strong>what was tried before and which changes were reverted</strong> ([Chapter 22](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/031877)).

So the agent can start its next attempt from where the last one failed.

<a id="summary"></a>


## Summary

- <strong>How key points 1 to 4 connect.</strong> In this book, I treated key points 1 to 4 as the basic moves for supervising a model smarter than you.
- <strong>Key point 1: convey the goal and background, and do not over-specify the solution.</strong> The human writes the goal, background, constraints, and known facts in the request, and does not over-specify the concrete solution.
- <strong>Key point 2: have the agent restate the problem before implementation.</strong> Before implementation, the human has the agent restate the problem in its own words.
- <strong>Key point 3: learn the mechanism and the reasons with /how, /why, and /teach.</strong> The human has the agent investigate with `/how` and `/why`, and through the `/teach` explanation understands how the code works now and why it was written that way.
- <strong>Key point 4: carry past work into a new conversation with /recall.</strong> The human has the agent look back at related work in past conversations with `/recall`, and carry earlier investigations, decisions, and failures into the new work.

The next chapter, [Chapter 38](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/006bc8), looks at key points 5 to 8 as the stage of trying solutions.

Key points 5 to 8 are, in order: write how users will use it before implementation (key point 5), split documents by purpose (key point 6), compare prototypes of several options (key point 7), and have the agent verify questions by experiment (key point 8).
<!-- book-body:end -->

---

[Contents](README.md) · [Previous](43-chapter.md) · [Next](45-chapter.md) · [简体中文](../zh-CN/44-chapter.md)
