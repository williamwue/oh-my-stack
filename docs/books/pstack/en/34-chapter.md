# Chapter 28: Record decisions and leave evidence for long agent runs

[Contents](README.md) · [Previous](33-chapter.md) · [Next](35-chapter.md) · [简体中文](../zh-CN/34-chapter.md)

By kaito · [Japanese original](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/724887) · [Author’s English edition](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/6638a6)

Source snapshot: 2026-10-03. The text below preserves the author’s English edition.

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
This chapter covers [`/show-me-your-work`](https://github.com/cursor/plugins/blob/main/pstack/skills/show-me-your-work/SKILL.md).

`/show-me-your-work` is a Skill that records what the agent decided (for example, it threw out a subagent's work) and the grounds for each decision (for example, the screenshots were blank). It writes one decision per line in a file. A model from a different family than the one that did the work reviews the record. The agent collects the points the review flags in an "Attention" section at the end of its reply.

The verification skill from [Chapter 26](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/9884cb) shows with evidence that the app works. `/show-me-your-work`, on the other hand, lets the user later follow the evidence and verify why the agent made the decisions it made.

The `SKILL.md` of `/show-me-your-work` sets `disable-model-invocation: true` ([Chapter 25](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e5f103)). The agent never picks and runs a Skill with this setting on its own from the content of the conversation. So this Skill runs only when the user calls it by name, or when `/poteto-mode`, a Playbook, or another Skill calls it by name as one of its steps.

This chapter explains `/show-me-your-work` from four angles: its role, when to use it, its steps, and how to write the request.

<a id="how-this-chapter-is-organized"></a>


## How this chapter is organized

This chapter is organized as follows.

- Role: leave one record of decisions that the user can review later
- When to use it: long tasks, autonomous tasks, and tasks the user checks later
- Steps: record decisions, check them against the transcript, and have a different model review them
- How to write the request: have the agent start the record
- Summary

<a id="role%3A-leave-one-record-of-decisions-that-the-user-can-review-later"></a>


## Role: leave one record of decisions that the user can review later

`/show-me-your-work` is a Skill that keeps a record of decisions in one file so that the user can review the decisions later. It is for long tasks and for tasks that proceed while the user is away.

The bundled guide [`docs/guide/07-overnight.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/07-overnight.md) says that if you hand a long task to the agent and step away, hope alone is not enough. You need the following three things.

- A finish condition that the agent can verify
- A dedicated worktree that does not collide with other work ([Chapter 18](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e529e4))
- A record of decisions to review later

This Skill handles the third one, "a record of decisions to review later".

You need a record of decisions because <strong>a code diff shows only the changes that survived to the end</strong>. An approach abandoned along the way, or a decision to undo a subagent's work, does not appear in the diff.

After a long task that ran while the user was away, the user who returns has only the diff. So the agent records its decisions and their grounds, and the user can later review why things turned out as they did.

<a id="when-to-use-it%3A-long-tasks%2C-autonomous-tasks%2C-and-tasks-the-user-checks-later"></a>


## When to use it: long tasks, autonomous tasks, and tasks the user checks later

The "[Non-negotiables](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md#non-negotiables)" section of `/poteto-mode` ([Chapter 8](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/cd0205)) requires this record for long tasks, autonomous tasks, multi-phase tasks, and tasks that the user steps away from and checks later.

<a id="playbooks-and-other-skills-also-call-%2Fshow-me-your-work"></a>


### Playbooks and other Skills also call `/show-me-your-work`

Playbooks and Skills that handle long tasks also keep their records with this Skill.

The `SKILL.md` of this Skill sets the rules other Skills follow when they record decisions.  
Other Skills do not invent their own record format. They call this Skill by name and leave the format to it.

So the record has the same format whichever Playbook or Skill calls this Skill, and the user can review every record the same way.

The main callers, and why each keeps a record, are as follows.

<a id="%22autonomous-run%22%3A-record%2C-at-each-iteration%2C-what-changed-and-whether-the-work-got-closer-to-the-finish-condition"></a>


#### "Autonomous run": record, at each iteration, what changed and whether the work got closer to the finish condition

"[Autonomous run](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autonomous-run.md)" is a Playbook that sets a finish condition and carries the work through to the end without stopping ([Chapter 15](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/305f88)).

In step 5, this Playbook says to record one line with this Skill at each iteration. The line says what the iteration changed and whether the work got closer to the finish condition.

<a id="%22orchestrate%22%3A-gather-the-decisions-of-a-project-that-runs-for-days-into-one-record"></a>


#### "Orchestrate": gather the decisions of a project that runs for days into one record

"[Orchestrate](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/orchestrate.md)" is a Playbook in which one coordinator agent manages the work of many PRs over several days ([Chapter 16](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3b2bef)). The coordinator agent writes no code.

This Playbook uses `decisions.tsv` in the directory that holds the project's records as this Skill's record.

The coordinator agent starts this record in the setup step (Install the runtime), before it starts any subagents. In the last step (Close), it checks the record as this Skill's rules require. It also has a model from a different family review the record.

This Playbook assumes the user checks in about twice a day, not every five minutes. The Close step also says to keep the directory that holds the record, instead of deleting it, and to use the directory as material for a postmortem.

<a id="%2Ffigure-it-out%3A-with-both-the-record-and-the-diff%2C-the-user-can-trust-the-work"></a>


#### `/figure-it-out`: with both the record and the diff, the user can trust the work

`/figure-it-out` is a Skill that designs the Playbook itself, for large work that no Playbook matches ([Chapter 23](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/ba4cc8)).

In the phase that keeps a record of the work, Phase D, `/figure-it-out` records the work with this Skill. The work `/figure-it-out` handles is usually large, so the agent commits the record and reviewers can read it in the PR. <strong>Only with both the record and the diff can the user trust the work</strong>.

<a id="steps%3A-record-decisions%2C-check-them-against-the-transcript%2C-and-have-a-different-model-review-them"></a>


## Steps: record decisions, check them against the transcript, and have a different model review them

<a id="format%3A-write-one-decision-per-line-in-a-six-column-tsv"></a>


### Format: write one decision per line in a six-column TSV

This Skill keeps the record of decisions as a TSV. That way, a reviewer can read the record from top to bottom and follow the evidence to verify it.  
An example TSV appears below.

<strong>Write one decision per line, and do not write the evidence as prose. Write a pointer to where the evidence is, such as a commit or a file</strong>. If the agent writes the evidence as prose, the reviewer cannot see the real thing and has to trust the prose. A pointer lets the reviewer follow it and check the real thing.

There are six columns. They run in this order: when, in which phase, what the agent decided, why, what backs the decision, and how it turned out.

<table class="code-line" data-line="84">
<thead class="code-line" data-line="84">
<tr class="code-line" data-line="84">
<th>Column</th>
<th>Contents</th>
<th>Example from the first line of the record below</th>
</tr>
</thead>
<tbody class="code-line" data-line="86">
<tr class="code-line" data-line="86">
<td><code>ts</code></td>
<td>Timestamp</td>
<td><code>2026-05-24T11:15:00Z</code></td>
</tr>
<tr class="code-line" data-line="87">
<td><code>phase</code></td>
<td>The phase in which the agent made the decision, or the name of the workstream</td>
<td><code>widget</code></td>
</tr>
<tr class="code-line" data-line="88">
<td><code>decision</code></td>
<td>What the agent chose or did</td>
<td><code>moved the widget styles over without changing how it looks</code></td>
</tr>
<tr class="code-line" data-line="89">
<td><code>why</code></td>
<td>The reason for the decision, in plain words</td>
<td><code>keep the change small and the result identical</code></td>
</tr>
<tr class="code-line" data-line="90">
<td><code>evidence</code></td>
<td>A pointer such as a commit SHA, a PR number, a <code>file:line</code> that gives a file name and line number, or a screenshot path</td>
<td><code>commit 7c21e0a, pixel-diff 0</code></td>
</tr>
<tr class="code-line" data-line="91">
<td><code>result</code></td>
<td>An outcome such as <code>tests green</code>, <code>reverted</code>, or <code>open</code>
</td>
<td><code>looks identical, tests pass</code></td>
</tr>
</tbody>
</table>

The following TSV takes the header line and two lines from the example in `SKILL.md`. Tabs separate the columns.

```
ts	phase	decision	why	evidence	result
2026-05-24T11:15:00Z	widget	moved the widget styles over without changing how it looks	keep the change small and the result identical	commit 7c21e0a, pixel-diff 0	looks identical, tests pass
2026-05-24T12:30:00Z	widget	threw out a helper's work because its screenshots were blank	checked the real files instead of trusting its summary	worktree reset	reverted, tightened the instructions for next time
```

The first line is the decision "moved the widget styles without changing how they look". The evidence is commit `7c21e0a` and a pixel difference of zero (`pixel-diff 0`). A reviewer can open that commit and check the real thing.

The second line is the decision "threw out a subagent's work because its screenshots were blank". The agent did not trust the subagent's "done" summary. It checked the actual files before throwing the work out.

The agent records the points where a decision branched, not every action. It does not record the obvious or minor actions.

Here are examples of when the agent records a line.

- When it chooses one of two approaches
- When it finishes a stage of the work and a check produces a result
- When it changes direction or undoes a change
- When it hits a problem that blocks progress

The agent writes each line in plain words. It also applies the rules of `/unslop` ([Chapter 32](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/c22a83)) to the sentences in the log. `/unslop` removes AI-style phrasing.

<a id="appending-and-location%3A-append-decision-lines-with-log.sh"></a>


### Appending and location: append decision lines with log.sh

<a id="the-agent-appends-one-line-at-a-time-with-log.sh"></a>


#### The agent appends one line at a time with log.sh

The agent uses [`scripts/log.sh`](https://github.com/cursor/plugins/blob/main/pstack/skills/show-me-your-work/scripts/log.sh) to add lines.

```
scripts/log.sh <logfile> <phase> <decision> <why> <evidence> <result>
```

The script shapes the line into TSV format. For example, it fills in the timestamp and replaces tabs and newlines inside a cell with spaces.

<a id="keep-the-log-in-the-working-directory%2C-and-commit-it-only-for-large-work"></a>


#### Keep the log in the working directory, and commit it only for large work

The agent keeps the log in `decisions.tsv` in the working directory and does not commit it by default. The agent commits the log only for work large enough that a reviewer needs the record of decisions to trust the result.

An example is work such as "moved the styles of about 100 components without changing how they look".

The code tells you what changed. But the code keeps no trace of what verified that the look really did not change, or which approaches were dropped along the way.

The larger the work, the more such decisions there are. So the reviewer follows the decisions and evidence in the committed log to verify the reported result.

<a id="fix-a-wrong-decision-by-adding-a-correcting-line%2C-not-by-rewriting-the-line"></a>


#### Fix a wrong decision by adding a correcting line, not by rewriting the line

<strong>The log is append-only. You fix a wrong decision by adding a new line that corrects it</strong>. If you rewrite or delete a line, the record no longer shows how the decision changed along the way.

<a id="a-new-run-writes-a-start-line-first%2C-to-separate-it-from-the-previous-run's-lines"></a>


#### A new run writes a start line first, to separate it from the previous run's lines

This Skill counts one conversation with one agent as one <strong>run</strong>. When the user sends further requests later in the same conversation and the agent keeps working, that work belongs to the same run. Work that continues after a long conversation is summarized also belongs to the same run.

When another agent takes over the work, or a new chat starts, a new run begins.

A long task does not always finish in one run. Another agent may take over partway, or the user may ask for the rest in a new chat. This Skill says to keep the record of one task in one log, `decisions.tsv` in the working directory. So a new run also appends to the log that the previous run wrote.

As a result, one log holds lines written by several runs. If the reviewer cannot tell which run wrote which line, they cannot pull out and read only the new run's decisions.

So when a run appends to a log that already has lines, its agent first writes one line with `start` in the `phase` column.

This `start` line marks that the new run wrote the lines below it. In the `start` line, the agent writes two things: the timestamp range of the lines above it, which another run wrote, and something that identifies its own run, such as the agent's ID.

For example, when a run in a new chat appends to a log written by a run in the previous chat, the log looks like this.

```
ts	phase	decision	why	evidence	result
2026-05-24T11:15:00Z	widget	moved the widget styles over without changing how it looks	keep the change small and the result identical	commit 7c21e0a, pixel-diff 0	looks identical, tests pass
2026-05-24T12:30:00Z	widget	threw out a helper's work because its screenshots were blank	checked the real files instead of trusting its summary	worktree reset	reverted, tightened the instructions for next time
2026-05-25T09:00:00Z	start	rows 2026-05-24T11:15:00Z to 12:30:00Z were written by another run	picking up yesterday's log	agent a1b2c3	open
2026-05-25T09:40:00Z	widget	moved the button styles over	same approach as the widget	commit 9d4e2f1, pixel-diff 0	looks identical, tests pass
```

The line with the timestamp `2026-05-25T09:00:00Z` is the `start` line that today's run wrote first. A reviewer can verify today's decisions by reading only the lines below it.

In the later step, ["Audit: before handing off to the user, check the log against the transcript"](#audit%3A-before-handing-off-to-the-user%2C-check-the-log-against-the-transcript), the agent also checks only the lines its own run wrote against its own run's transcript. The `start` line tells the agent where its own lines begin.

<a id="audit%3A-before-handing-off-to-the-user%2C-check-the-log-against-the-transcript"></a>


### Audit: before handing off to the user, check the log against the transcript

Before it returns its result, the agent that did the work verifies that the record matches the facts. The agent checks the lines that this run wrote against this run's transcript. It checks the following points.

- Every line matches a real decision
- The evidence exists and shows what the line says it shows
- No important branch that shaped the work is missing from the record

> Correct the log, not the story. The audit never edits or removes a row, even an invented one.

When the audit finds a line that does not match the facts, the agent does not delete or rewrite it. Instead, it adds a correcting line that states what actually happened. The rule is the same as ["Fix a wrong decision by adding a correcting line, not by rewriting the line"](#fix-a-wrong-decision-by-adding-a-correcting-line%2C-not-by-rewriting-the-line) earlier in this chapter.

For example, suppose the audit finds a line whose evidence is a commit that does not exist. The first line is the one that does not match the facts, and the second is the correcting line the agent added.

```
ts	phase	decision	why	evidence	result
2026-05-24T13:00:00Z	widget	fixed the button color	to fix the broken look	commit 9d4e2b1	tests green
2026-05-24T15:20:00Z	widget	correcting the 13:00 row. the button color was not fixed, and commit 9d4e2b1 does not exist	checked against the transcript and found the row did not match the facts	this run's record in agent-transcripts/	open
```

The first line stays in place, so a reviewer can trace where the record drifted from the facts and when the agent corrected it.

<a id="review%3A-a-model-from-a-different-family-reads-the-record"></a>


### Review: a model from a different family reads the record

The agent that did the work starts a subagent on <strong>a model from a different family than the one that did the work</strong>, and has that subagent read the record and the transcript. This <strong>reviewer</strong> subagent does not redo the work. It looks for points the user should pay attention to and picks up items such as the following.

- Decisions with weak grounds or no grounds
- Skipped verification, or verification the record says the agent did but that has no evidence in the transcript
- Choices that look risky in hindsight, such as the following.
  - Decisions made too early
  - Scope changes that widened the work too far
  - A fix that only hides the symptom and leaves the root cause in place. The symptom is the failure that shows on the surface, such as an error or a broken screen.
- Problems the user would not notice from a quick read of the record

A self-review by the model that did the work does not replace this review. <strong>A model that missed something during the work tends to miss it the same way when it looks again</strong>.

The bundled guide [`docs/guide/04-design.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/04-design.md) gives the same reason for `/interrogate` ([Chapter 27](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e23752)), which has several models look for weak points in a diff.

When the agent keeps a record for the work, it always adds an "Attention" section at the end of its reply. The "Attention" section lists the points the reviewer found that the user should pay attention to. For example, consider a reviewer that reviews the following two lines from this chapter's examples.

The line for the decision to move the widget styles<sup class="footnote-ref"><a href="#fn-3dc3-1" id="fnref-3dc3-1">[1]</a></sup> is as follows.

```
2026-05-24T11:15:00Z	widget	moved the widget styles over without changing how it looks	keep the change small and the result identical	commit 7c21e0a, pixel-diff 0	looks identical, tests pass
```

The line that cites a commit that does not exist as its evidence<sup class="footnote-ref"><a href="#fn-3dc3-2" id="fnref-3dc3-2">[2]</a></sup> is as follows.

```
2026-05-24T13:00:00Z	widget	fixed the button color	to fix the broken look	commit 9d4e2b1	tests green
```

In this case, the "Attention" section looks like this (this example is not in the source).

```
Attention
reviewed by grok-4.7-xhigh-fast

- decisions.tsv row 11:15: the only basis for pixel-diff 0 is one screenshot of the top page. The other screens that use the widget were not checked.
- decisions.tsv row 13:00: cited commit 9d4e2b1, which does not exist, as evidence. Row 15:20 corrects it, but the button color is still not fixed.
```

The first line, `reviewed by grok-4.7-xhigh-fast`, shows which model did the review. Below it, the agent lists the reviewer's findings one at a time. Each finding states which line of `decisions.tsv` or which part of the transcript it is about. From a finding, the user can trace the line and check the evidence.

If there are no findings, the agent writes "No flags" in place of the list. It never writes only the `reviewed by` line with neither findings nor "No flags". It also cannot leave out the `reviewed by` line when the answer is "No flags".

```
Attention
reviewed by grok-4.7-xhigh-fast

No flags
```

<strong>Without the `reviewed by` line, the user cannot verify that a model from a different family really did the review, rather than the model that did the work</strong>.

<a id="how-to-write-the-request%3A-have-the-agent-start-the-record"></a>


## How to write the request: have the agent start the record

The [README](https://github.com/cursor/plugins/blob/main/pstack/README.md) has an example of a request that starts the record.

```
/show-me-your-work keep a decision trail i can review when i'm back.
```

When the user returns, they can get a report on last night's work with the following request from `docs/guide/07-overnight.md`. The report ends with an "Attention" section.

```
/show-me-your-work catch me up on what you did last night
```

The user reads the "Attention" section of the reply first, and then the log lines that the section points to. The "Attention" section lists only the decisions the reviewer flagged, so the user does not have to reread all of a long task they handed off.

<a id="summary"></a>


## Summary

- <strong>Role.</strong> The Skill keeps a record of decisions in one file so that the user can review the decisions later. It is for long tasks and for tasks that proceed while the user is away. It keeps the record because a code diff shows only the changes that survived to the end.
- <strong>Record format.</strong> The agent keeps one decision per line in a six-column TSV, append-only. It does not delete a wrong line. It adds a correcting line instead.
- <strong>Audit.</strong> Before it returns the result to the user, the agent checks the log against the transcript and adds a correcting line for any line that does not match the facts.
- <strong>Review and the "Attention" section.</strong> A model from a different family reads the record and the transcript. The agent ends its reply with an "Attention" section that lists the reviewing model's name and its findings. Even with no findings, the agent keeps the model name in the section.

The next three chapters, [Chapter 29](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/00dce1) to [Chapter 31](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/347946), cover three Skills that keep code quality, one at a time. [Chapter 29](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/00dce1) covers [`/typescript-best-practices`](https://github.com/cursor/plugins/blob/main/pstack/skills/typescript-best-practices/SKILL.md), which collects TypeScript rules.

<section class="footnotes">
<span class="footnotes-title">脚注</span>
<ol class="footnotes-list">
<li class="footnote-item" id="fn-3dc3-1">
<p class="code-line" data-line="272">Quoted from the example in <a href="#format%3A-write-one-decision-per-line-in-a-six-column-tsv">"Format: write one decision per line in a six-column TSV"</a> in this chapter. <a class="footnote-backref" href="#fnref-3dc3-1">↩︎</a></p>
</li>
<li class="footnote-item" id="fn-3dc3-2">
<p class="code-line" data-line="273">Quoted from the example in <a href="#audit%3A-before-handing-off-to-the-user%2C-check-the-log-against-the-transcript">"Audit: before handing off to the user, check the log against the transcript"</a> in this chapter. <a class="footnote-backref" href="#fnref-3dc3-2">↩︎</a></p>
</li>
</ol>
</section>
<!-- book-body:end -->

---

[Contents](README.md) · [Previous](33-chapter.md) · [Next](35-chapter.md) · [简体中文](../zh-CN/34-chapter.md)
