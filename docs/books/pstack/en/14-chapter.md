# Chapter 10: Investigate and reproduce problems

[Contents](README.md) · [Previous](13-chapter.md) · [Next](15-chapter.md) · [简体中文](../zh-CN/14-chapter.md)

By kaito · [Japanese original](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/ea525d) · [Author’s English edition](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/b77ae2)

Source snapshot: 2026-10-03. The text below preserves the author’s English edition.

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
This chapter covers the following three Playbooks.

1. [Investigation](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/investigation.md)
2. [Runtime forensics](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/runtime-forensics.md)
3. [Trace forensics](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/trace-forensics.md)

All three are Playbooks that investigate and produce an answer, and none of them changes code. <strong>The artifact is an answer or a diagnosis backed by evidence</strong>.

Which Playbook to use depends on the information and evidence available to the investigation. The choice depends on whether reading the source code and history can answer the question, whether you can measure a running process, or whether you are examining a profile or dump that someone already captured.

This chapter explains the rules the three share, then how to use each one.

<a id="how-this-chapter-is-organized"></a>


## How this chapter is organized

This chapter is organized as follows.

- The three Playbooks do not change code, and you choose one by the information and evidence available
- "Investigation" answers questions that reading the code or history can answer, with citations
- "Runtime forensics" stops guessing from the source and measures the live process
- "Trace forensics" turns the artifacts it receives into a queryable form instead of rerunning the program
- Summary

<a id="the-three-playbooks-do-not-change-code%2C-and-you-choose-one-by-the-information-and-evidence-available"></a>


## The three Playbooks do not change code, and you choose one by the information and evidence available

As the introduction said, <strong>you choose among the three Playbooks by the information and evidence available to the investigation</strong>.

Choose as follows.

- <strong>You have a question that reading the code or history can answer.</strong> Use "Investigation".
- <strong>A bug or slowdown is still happening, and you can measure the running process yourself.</strong> Use "Runtime forensics".
- <strong>All you have is a profile or dump handed to you after the fact.</strong> Use "Trace forensics".

<table class="code-line" data-line="32">
<thead class="code-line" data-line="32">
<tr class="code-line" data-line="32">
<th>Item</th>
<th>"Investigation"</th>
<th>"Runtime forensics"</th>
<th>"Trace forensics"</th>
</tr>
</thead>
<tbody class="code-line" data-line="34">
<tr class="code-line" data-line="34">
<td>Evidence</td>
<td>Source code and history</td>
<td>Measurements taken from the running process</td>
<td>Artifacts handed over after the fact, such as a cpuprofile, a spindump, or a heap snapshot</td>
</tr>
<tr class="code-line" data-line="35">
<td>Rerunning the program</td>
<td>No</td>
<td>No (it inserts instrumentation into the running process to test hypotheses)</td>
<td>No</td>
</tr>
<tr class="code-line" data-line="36">
<td>Where it goes next</td>
<td>Back to the user, then to "<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/bug-fix.md" rel="nofollow noopener noreferrer" target="_blank">Bug fix</a>" or "<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/feature.md" rel="nofollow noopener noreferrer" target="_blank">Feature</a>"</td>
<td>To "Bug fix" or "<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/perf-issue.md" rel="nofollow noopener noreferrer" target="_blank">Perf issue</a>"</td>
<td>To "Bug fix" or "Perf issue"</td>
</tr>
</tbody>
</table>

Even for the same complaint, "it's slow", the Playbook you choose depends on whether you can measure the live process or have only a file you received. What the agent may do also differs by the kind of evidence.

"Runtime forensics" allows the agent to insert logging or instrumentation code into the running process to verify what is happening. "Trace forensics", on the other hand, only reads the profile or dump it received, and <strong>forbids rerunning the program to capture it again</strong>.

<a id="%22investigation%22-answers-questions-that-reading-the-code-or-history-can-answer%2C-with-citations"></a>


## "Investigation" answers questions that reading the code or history can answer, with citations

<a id="role%3A-answer-questions-that-reading-the-code-or-history-can-settle"></a>


### Role: answer questions that reading the code or history can settle

"Investigation" is <strong>the Playbook that answers questions that reading the source code or the change history alone can settle</strong>, such as "How does X work?", "Why was Y built this way?", "Is Z really safe?", and "Should we pick X or Y?".

The artifact is an explanation or a recommendation with citations. It does not create a PR, and it does not watch a PR until the PR can merge. That work belongs to the "[Babysit](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md)" Playbook ([Chapter 14](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/8f6c25)). If it finds partway through that a code change is needed, it does not start fixing on its own. It hands the matter back to the user.

<a id="steps%3A-four-steps-that-fix-even-the-shape-of-the-output"></a>


### Steps: four steps that fix even the shape of the output

The Playbook has the following four steps.

1. Pass the question through `/how`, the Skill that explains how code works and where it lives. If the question asks "why", also pass it through `/why`, which investigates the reasons and history behind a design with citations. [Chapter 22](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/031877) covers both Skills
2. Write the throughput checkpoint as the single line "not applicable"
3. Write under the same five headings as `/how`: overview, key concepts, how it works, where it lives, and caveats. For a comparison of options, write a recommendation with a table of trade-offs
4. Run `/unslop`, the Skill that cuts phrasing AI tends to write, on the reply ([Chapter 32](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/c22a83))

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="60">
<li class="code-line" data-line="60">
<p class="code-line" data-line="60"><strong>TODO list.</strong> The plan, a list of things to do that the agent makes at the start of the work. In Cursor, the TODO list appears in the chat panel. From this list, the user can check which steps the agent carried out and which steps it skipped. The agent marks a skipped step with <code>skip: &lt;reason&gt;</code> (the bundled guide <a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md" rel="nofollow noopener noreferrer" target="_blank"><code>01-setup.md</code></a>).</p>
</li>
<li class="code-line" data-line="61">
<p class="code-line" data-line="61"><strong>Throughput checkpoint.</strong> The four items the agent records in the TODO list after it considers how to split the work so that parts of it run in parallel. The four items are the following.</p>
<ul class="code-line" data-line="62">
<li class="code-line" data-line="62">Steps to finish first</li>
<li class="code-line" data-line="63">Independent work that can run in parallel</li>
<li class="code-line" data-line="64">Shared state</li>
<li class="code-line" data-line="65">The smallest safe split</li>
</ul>
<p class="code-line" data-line="67">Every Playbook asks for this checkpoint in non-trivial work with several steps (see <a href="https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/4f3e0a" target="_blank">Chapter 12</a> for details).</p>
<p class="code-line" data-line="69">"Investigation" only investigates and does not change code, so it has no work to divide. It skips the four items and writes the single line "not applicable".</p>
</li>
</ul>
</div></aside>

When the user asks "Is it really safe?", the agent <strong>does not adopt the asker's assessment as its own. It writes its own judgment with reasons</strong>. If a premise is wrong, the agent points out the wrong premise too.

<a id="how-to-write-the-request%3A-write-%22new-task%22-and-%22don't-change-any-code-yet%22"></a>


### How to write the request: write "new task" and "don't change any code yet"

If you write "new task" and "don't change any code yet" in the request, `/poteto-mode` picks a Playbook again and adds the constraint not to change code. The example in the bundled guide ([docs/guide/02-poteto-mode.md](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/02-poteto-mode.md)) is the following.

```
/poteto-mode new task. figure out why the cache entry survives logout. don't change any code yet.
```

You can also specify the shape of the reply in the request. [Part 2](https://x.com/poteto/status/2097732320606507506) of *The Complete Guide to pstack* gives the following example.

```
/poteto-mode investigate why background workers periodically fail with timeout errors. give me a breakdown of what we know, what data you used, and your best hypotheses.
```

This request asks for the same distinction as the rule in the section "[Writing the reply](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#writing-the-reply)" of `/poteto-mode`. That rule says to <strong>attach either evidence or a label to every claim, in the same sentence</strong>. The label is measured, inferred, or guessed. If the request asks for this distinction too, you can tell which sentences of the reply are confirmed facts and which are guesses.

<a id="%22runtime-forensics%22-stops-guessing-from-the-source-and-measures-the-live-process"></a>


## "Runtime forensics" stops guessing from the source and measures the live process

<a id="role%3A-diagnose-runtime-symptoms-by-measuring-the-live-process"></a>


### Role: diagnose runtime symptoms by measuring the live process

"Runtime forensics" is the Playbook that diagnoses runtime symptoms such as memory leaks, a CPU that spins while idle, and rendering glitches <strong>by measuring the running process</strong>, not by guessing from the source.

Reading the source shows the paths that could be the cause. With runtime symptoms, though, the question is which path actually runs. The agent finds that path by measuring the running process.

<a id="steps%3A-capture-signals%2C-narrow-down-to-evidence%2C-prove-the-mechanism%2C-map-it-to-the-source"></a>


### Steps: capture signals, narrow down to evidence, prove the mechanism, map it to the source

The Playbook has the following four steps.

1. <strong>Capture live signals</strong>
   - Use the control Skill that fits the symptom to capture a CPU profile, a heap snapshot, or a CDP (Chrome DevTools Protocol) trace
   - The control Skills do not ship with pstack. They are `control-ui` and `control-cli` in [`cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit)
2. <strong>Narrow down to decisive evidence</strong>
   - Look for functions on the hot path, the retention chains of leaked objects, and loops that keep spinning with no input
   - Have subagents analyze large artifacts. The principle "[Guard the Context Window](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-guard-the-context-window/SKILL.md)" asks for that division of work ([Chapter 20](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/0ec4d6))
3. <strong>Prove the mechanism before believing it</strong>
   - Confirm the mechanism that the hypothesis says causes the symptom
   - To confirm it, insert instrumentation code into the running process, or rewrite the running code directly without a restart, which is called a hotfix
4. <strong>Map it to the source</strong>
   - Trace the cause to the source file, the symbol, and the line

Unless the user asks for a fix, the agent makes none. Once it knows the cause, it hands off to "Bug fix" or "Perf issue".

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="117">
<li class="code-line" data-line="117">
<strong>CDP trace.</strong> A log of the work inside the browser, recorded through the Chrome DevTools Protocol. You can use it to examine JavaScript execution, page layout, painting, and similar work.</li>
</ul>
</div></aside>

<a id="%22trace-forensics%22-turns-the-artifacts-it-receives-into-a-queryable-form-instead-of-rerunning-the-program"></a>


## "Trace forensics" turns the artifacts it receives into a queryable form instead of rerunning the program

<a id="role%3A-stick-to-reading-artifacts-that-were-already-captured"></a>


### Role: stick to reading artifacts that were already captured

"Trace forensics" is the Playbook that diagnoses the cause <strong>by reading artifacts handed over after the fact, without rerunning anything</strong>. Examples are a CPU profile, a spindump, and a heap snapshot that someone captured in the user's environment.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="127">
<li class="code-line" data-line="127">
<strong>spindump.</strong> A macOS diagnostic report that records what an app that stopped responding was doing.</li>
</ul>
</div></aside>

The difference from "Runtime forensics" is that the capture is already done. The artifact is fixed data, so the agent sticks to reading it. So that the Playbook works in any environment, the Playbook also limits the agent to general-purpose tools such as DevTools and trace parsers.

<a id="steps%3A-load-the-artifact%2C-reshape-it%2C-narrow-down-to-the-cause%2C-locate-the-source-code"></a>


### Steps: load the artifact, reshape it, narrow down to the cause, locate the source code

The Playbook has the following six steps.

1. <strong>Identify the format and load it</strong>
   - Analyze large artifacts with subagents
2. <strong>Convert it to a queryable form</strong>
   - Load the trace or heap snapshot into sqlite so that the agent can query the data before it reads through the data
3. <strong>Narrow down to the cause</strong>
   - Look for the frames that use the most time, the retention chains of leaks, and stalled threads
4. <strong>Locate the source code</strong>
   - Use the symbol information in the artifact to identify which file, which function, and which line of the source code the most expensive frame corresponds to
   - Until the agent knows this location, it cannot say which code is the cause. It treats the diagnosis as unfinished until then
   - If the location is unknown, resolve the symbol information or state that the artifact contains no symbol information
5. <strong>If there is a paired capture, compare them</strong>
   - If there are two comparable artifacts, such as before and after a fix, take the diff
   - Without a comparison, write the finding as "the strongest hypothesis the artifact supports", not as a confirmed cause
6. <strong>Return a diagnosis with citations</strong>
   - Unless the user asks for a fix, make no fix, and hand off to "Bug fix" or "Perf issue"

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="153">
<li class="code-line" data-line="153">
<strong>Retention chain.</strong> The chain of references that keeps data from being released from memory.</li>
</ul>
</div></aside>

<a id="summary"></a>


## Summary

- <strong>What they share and how to choose.</strong> All three Playbooks return an answer or a diagnosis without changing code. You choose by one of three questions: can reading the code or history answer it, can you measure a process that is still running, or do you have only captured artifacts?
- <strong>Investigation</strong> answers with `/how` and `/why`, and replies under the five headings or with a recommendation that includes a comparison table. If a code change is needed, it hands the matter back to the user.
- <strong>Runtime forensics</strong> stops guessing from the source, measures the live process, proves the mechanism, and then points to the location in the source.
- <strong>Trace forensics</strong> does not rerun the program. It turns the artifacts it receives into a queryable form and identifies the location of the cause in the source code. If it has no comparable artifact, it writes "the strongest hypothesis".

The next chapter, [Chapter 11](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/ff12ce), looks at the three Playbooks that take a diagnosis and fix the problem: "Bug fix", "Perf issue", and "[Hillclimb](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/hillclimb.md)". It compares them by what you want to fix.
<!-- book-body:end -->

---

[Contents](README.md) · [Previous](13-chapter.md) · [Next](15-chapter.md) · [简体中文](../zh-CN/14-chapter.md)
