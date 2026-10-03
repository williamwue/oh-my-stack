# Chapter 16: Plan many PRs and run them with multiple agents

[Contents](README.md) · [Previous](19-chapter.md) · [Next](21-chapter.md) · [简体中文](../zh-CN/20-chapter.md)

By kaito · [Japanese original](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/8a8dd5) · [Author’s English edition](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3b2bef)

Source snapshot: 2026-10-03. The text below preserves the author’s English edition.

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
This chapter covers four Playbooks:

1. [Multi-phase or multi-PR plan](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md)
2. [Orchestrate](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/orchestrate.md)
3. [Autopilot-full](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-full.md)
4. [Autopilot-stack](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-stack.md)

All four plan and run work that spans many PRs with multiple agents. "Multi-phase or multi-PR plan" writes the plan document. "Orchestrate" manages work that lasts for days. "Autopilot-full" and "Autopilot-stack" move a queue of PRs forward and verify each one.

The previous chapter, [Chapter 15](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/305f88), covered the Playbooks that continue, stop, and resume one long piece of work.

This chapter first sorts out how the four Playbooks divide the work. It then explains when to use each one, its steps, and its key point. It ends by comparing the options for long-running work.

<a id="how-this-chapter-is-organized"></a>


## How this chapter is organized

The chapter has these sections:

- The four Playbooks plan and run many PRs, and the central agent writes no code
- "Multi-phase or multi-PR plan" writes no code and produces a checklist plan document that fixes how each PR is verified
- In "Orchestrate", one coordinator agent that writes no code manages many PRs of work that lasts for days
- In "Autopilot-full", an owner per PR takes it to merge, and the coordinator agent only issues verification verdicts
- "Autopilot-stack" builds and verifies PRs the same way as Autopilot-full, but does not merge them and hands them to the operator as one stack
- Pick among the five options for long-running work by who merges and what the unit of work is
- Summary

<a id="the-four-playbooks-plan-and-run-many-prs%2C-and-the-central-agent-writes-no-code"></a>


## The four Playbooks plan and run many PRs, and the central agent writes no code

The four Playbooks in this chapter divide responsibility as the following table shows.

<table class="code-line" data-line="29">
<thead class="code-line" data-line="29">
<tr class="code-line" data-line="29">
<th>Playbook</th>
<th>What it owns</th>
</tr>
</thead>
<tbody class="code-line" data-line="31">
<tr class="code-line" data-line="31">
<td>"Multi-phase or multi-PR plan"</td>
<td>The plan. It does not own the code</td>
</tr>
<tr class="code-line" data-line="32">
<td>"Orchestrate"</td>
<td>The program, meaning the whole of work that lasts for days. It does not own code</td>
</tr>
<tr class="code-line" data-line="33">
<td>"Autopilot-full"</td>
<td>The verification verdict. It does not own the PRs</td>
</tr>
<tr class="code-line" data-line="34">
<td>"Autopilot-stack"</td>
<td>The stack. It does not own the merge</td>
</tr>
</tbody>
</table>

Each of the four Playbooks states what it does not own: code, PRs, or the merge.

<strong>The coordinator agent writes no code itself.</strong> It spends its time on the plan, on briefs for the Workers, and on verdicts. Workers are the agents that run in parallel. "Orchestrate" has one exception. When the local Git operation is fast, the coordinator agent may pull verified changes into a branch and push it.

The coordinator agent is a long-lived chat that talks with the <strong>operator</strong>, <strong>the human who requests the work and makes the final call</strong>. "Orchestrate" calls it the "coordinator", and "Autopilot-full" and "Autopilot-stack" call it the "root". This chapter uses the name "coordinator agent" for both.

<a id="tools-that-appear-throughout-the-chapter"></a>


### Tools that appear throughout the chapter

The Playbooks in this chapter use these tools again and again:

- <strong>`/goal`.</strong> A command that sets a goal for the agent. The goal persists across conversation turns until the queued work is done.
- <strong>`decisions.tsv`.</strong> The decision record that `/show-me-your-work` ([Chapter 28](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/6638a6)) writes, with one decision per line.
- <strong>state-then-wait.</strong> A rule with two parts. When the operator asks the agent to explain the approach or the plan, the agent gives the explanation and stops. It also starts no work until the operator explicitly says "start".

<a id="%22multi-phase-or-multi-pr-plan%22-writes-no-code-and-produces-a-checklist-plan-document-that-fixes-how-each-pr-is-verified"></a>


## "Multi-phase or multi-PR plan" writes no code and produces a checklist plan document that fixes how each PR is verified

"Multi-phase or multi-PR plan" is the Playbook that plans work that spans several phases or stacked PRs.

The plan is a checklist. The person doing the work carries out one item at a time and checks it off with evidence that it is done. The operator looks at that evidence to confirm that each item is really done. <strong>An item without evidence does not get checked.</strong>

In [*The Complete Guide to pstack*, Part 2](https://x.com/poteto/status/2097732320606507506), poteto introduces this Playbook as the way to write an execution plan once you have a design you are satisfied with. [Chapter 39](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/f87769) covers planning in practice.

<a id="seven-steps"></a>


### Seven steps

The steps are as follows.

1. Decide whether a plan is needed
2. Settle open questions with a prototype before writing
3. Delegate research to subagents
4. Copy the plan document template and fill in every item
5. Write the plan document to technical-writing standards and cut AI phrasing
6. Check the shape of the plan document
7. Hand off the plan

The sections below look at each step in turn.

<a id="1.-decide-whether-a-plan-is-needed"></a>


#### 1. Decide whether a plan is needed

If the change fits in one or two files and the direction is clear, write no plan. Say that no plan is needed and stop.

<a id="2.-settle-open-questions-with-a-prototype-before-writing"></a>


#### 2. Settle open questions with a prototype before writing

Settle them with "[Prototype](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/prototype.md)" ([Chapter 12](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/4f3e0a)) and keep the evidence in the plan document's appendix. Ask the operator only about decisions that running something cannot settle. This step follows the principle "[Never Block on the Human](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-never-block-on-the-human/SKILL.md)" ([Chapter 20](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/0ec4d6)).

<a id="3.-delegate-research-to-subagents"></a>


#### 3. Delegate research to subagents

Subagents do the research. Each one returns the locations of the relevant files, the code conventions, the commands that run the tests, and the entry points, such as the `main` function or the function that first receives an API request.

A subagent does not paste the full contents of the files it read into its reply. Because the subagent leaves out the file contents, the research itself stays out of the main agent's context. This step follows the principle "Guard the Context Window" ([Chapter 20](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/0ec4d6)).

<a id="4.-copy-the-plan-document-template-and-fill-in-every-item"></a>


#### 4. Copy the plan document template and fill in every item

For each PR, the plan document states the change that PR makes, the files it changes, and how to verify it. One PR holds one change, sized as a unit you can verify.

<a id="5.-write-the-plan-document-to-technical-writing-standards-and-cut-ai-phrasing"></a>


#### 5. Write the plan document to technical-writing standards and cut AI phrasing

Write it with `/technical-writing`, which sets the standard for technical documents, and run it through `/unslop`, which cuts AI phrasing.

<a id="6.-check-the-shape-of-the-plan-document"></a>


#### 6. Check the shape of the plan document

Run `check-plan.mjs` and fix every error it prints: missing headings, missing verification items, and violations of the writing rules.

<a id="7.-hand-off-the-plan"></a>


#### 7. Hand off the plan

Put the plan's path and the script's output in the reply, then stop. Execution waits for the operator's explicit go-ahead, then starts with the execution Playbook named in the plan: "Autopilot-full", "Autopilot-stack", or "Orchestrate".

<a id="what-the-reply-includes"></a>


#### What the reply includes

The reply contains these items:

- The plan's path
- The dependencies between PRs
- The PRs that need review
- What the prototype proved
- The output of `check-plan.mjs`

<a id="the-plan-document-template-and-check-plan.mjs"></a>


### The plan document template and check-plan.mjs

The plan document has this structure:

- An opening summary
- How to read the plan
- A checklist for the whole program
- A section per PR
- A closing section
- Appendices for prototype evidence, options not taken, risks, and references

Each PR section has these nine subheadings:

- Dependencies
- Files touched
- Change
- Observable result
- unit verification (unit tests)
- live verification (behavior in the real app)
- perf verification (performance)
- Review gate (whether the operator must check the PR before merge, and how)
- Merge

[`check-plan.mjs`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/scripts/check-plan.mjs) checks the plan document for violations in headings, required items, writing style, and similar rules. When it finds a problem, it prints the line number and the reason. This Playbook puts the plan document's rules into a script as well as into prose, which follows the principle "[Encode Lessons in Structure](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-encode-lessons-in-structure/SKILL.md)" ([Chapter 21](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/10f4b3)).

<a id="the-key-point-is-the-verification-rule-that-%22tests-alone-are-not-verification%22"></a>


### The key point is the verification rule that "tests alone are not verification"

This Playbook puts the following sentence at the top of each of the unit, live, and perf verifications as the shared pass condition.

> Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

The plan document gives each PR a unit, a live, and a perf verification field. Each field states the concrete way to check. A PR that affects the screen or interaction also gets a "Review gate", where the operator checks it before merge.

Each field holds the following:

- <strong>Verify, unit.</strong> The test file, the cases to add, and the command to run.
- <strong>Verify, live.</strong> Required. Ten lanes, which are parallel verifiers, drive the real screen or CLI at the PR's latest commit. Lane 1 is the regression lane. It runs the same scenario on both trunk and the PR to catch anything the change broke. Trunk is the main branch that PRs merge into.
- <strong>Verify, perf.</strong> Measure the same metric on both trunk and the PR, and set the number that counts as failure.
- <strong>Review gate.</strong> For a PR that affects the screen or interaction, the operator reviews screenshots and video before merge.

To drive a screen, use `control-ui` for a browser or Electron, and `control-cli` for a CLI or TUI. Both are in [`cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit).

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="155">
<li class="code-line" data-line="155">
<strong>TUI.</strong> A text user interface, an interface drawn inside the terminal and operated with keys, such as vim or htop.</li>
</ul>
</div></aside>

<a id="how-to-phrase-the-request%3A-state-the-constraints-and-what-you-want-to-see-first"></a>


### How to phrase the request: state the constraints and what you want to see first

The example request in the [README](https://github.com/cursor/plugins/blob/main/pstack/README.md) states a constraint, a condition, and a request. The constraint is that nothing internal leaks. The condition is to work in a temporary directory, and the request is to show the dependency graph first.

```
/poteto-mode open source these skills as a plugin. nothing internal leaks, work in a temp dir, show me the dependency graph first.
```

<a id="in-%22orchestrate%22%2C-one-coordinator-agent-that-writes-no-code-manages-many-prs-of-work-that-lasts-for-days"></a>


## In "Orchestrate", one coordinator agent that writes no code manages many PRs of work that lasts for days

"Orchestrate" is the Playbook that hands one coordinator agent a project that lasts for days, with many PRs and tens to hundreds of subagents. It assumes the operator checks in only twice a day. <strong>The coordinator agent owns no code.</strong> It writes briefs for the Workers, which are the subagents, processes completion notices, and makes decisions.

<a id="seven-steps-1"></a>


### Seven steps

The steps are as follows.

1. Set the exit condition (Frame)
2. Prepare a place for state (Install the runtime)
3. Do a trial run with one unit (Pilot)
4. Add Workers (Scale)
5. Process completion notices in batches (Drain)
6. Merge verified units in order (Land)
7. Reconcile the records and close (Close)

The sections below look at each step in turn.

<a id="1.-set-the-exit-condition-(frame)"></a>


#### 1. Set the exit condition (Frame)

Write the exit condition so that the records can decide whether the work is done, for example "all 126 units are merged and each is verified in the ledger". If one agent can finish within the work-time budget you set, switch to "[Autonomous run](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autonomous-run.md)" ([Chapter 15](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/305f88)).

<a id="2.-prepare-a-place-for-state-(install-the-runtime)"></a>


#### 2. Prepare a place for state (Install the runtime)

Create the store with `orch init`. The store is the area that holds work status and decision records. Then open the decision record and write the standing instructions.

<a id="3.-do-a-trial-run-with-one-unit-(pilot)"></a>


#### 3. Do a trial run with one unit (Pilot)

First take one unit of work all the way through: write the brief, implement, verify, add the PR to the stack, record it in the ledger, and merge. Revise the brief and the verification method based on the result, then expand to the rest of the work.

The trial run (Pilot) uses one agent and one unit of work. The coordinator agent fixes problems in the brief, the verification steps, and the unit size during the trial run, before the work expands. <strong>The trial run keeps the same flaw from spreading to many agents and causing rework.</strong>

<a id="4.-add-workers-(scale)"></a>


#### 4. Add Workers (Scale)

Start Workers up to the concurrency limit, and start a new Worker for each one that finishes.

<a id="5.-process-completion-notices-in-batches-(drain)"></a>


#### 5. Process completion notices in batches (Drain)

Collect completion notices from Workers in the inbox (`inbox/`) and process them together at set points.

<a id="6.-merge-verified-units-in-order-(land)"></a>


#### 6. Merge verified units in order (Land)

Do not save merges for the end. Merge continuously, starting with the first verified unit.

<a id="7.-reconcile-the-records-and-close-(close)"></a>


#### 7. Reconcile the records and close (Close)

Check that the table records every started agent in a finished state, such as completed or abandoned. Verify against the real results that the exit condition is met. Find the instruction corrections you had to repeat and the instructions that kept being needed. Write them into `preferences.md` or the brief template so that the next agents get them too.

<a id="what-the-reply-includes-1"></a>


#### What the reply includes

The reply reports the following. Items about PRs include links to those PRs.

- Progress toward the exit condition, counted from `units.tsv` and `ledger.tsv`
- Merged PRs
- Abandoned work and the reason
- Items waiting for the operator's decision

The progress numbers come from `units.tsv`, which records the state of each unit, and `ledger.tsv`, which records verification results.

<a id="roles-come-in-three-layers"></a>


### Roles come in three layers

"Orchestrate" uses three layers of roles:

- <strong>Coordinator agent</strong> ("coordinator" in Orchestrate). The main agent. It orchestrates the tasks: the framing, the briefs, inbox processing, and reports to the operator. It writes no code.
- <strong>Sub-coordinator.</strong> A subagent that the coordinator agent adds only when the work exceeds what the coordinator agent can handle. Each track gets one sub-coordinator. A track is a kind of work, such as build or verification.
- <strong>Workers and verifiers.</strong> Workers carry out the work assigned to them, and verifiers verify a Worker's output. Both run in the cloud by default. Verification uses a model from a different family than the Worker's. Only one Worker edits a given worktree or branch.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="234">
<li class="code-line" data-line="234">
<strong>worktree.</strong> A Git feature that creates several working directories from one repository so that you can check out different branches at the same time.</li>
</ul>
</div></aside>

<a id="the-store%2C-the-briefs%2C-and-the-ledger-hold-the-state"></a>


### The store, the briefs, and the ledger hold the state

The coordinator agent creates `orchestrate/<project-slug>/` in the store. It writes state into table files with [`orch`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/scripts/orch/orch.ts), a bookkeeping CLI. The main files are these:

<table class="code-line" data-line="241">
<thead class="code-line" data-line="241">
<tr class="code-line" data-line="241">
<th>File</th>
<th>Contents</th>
</tr>
</thead>
<tbody class="code-line" data-line="243">
<tr class="code-line" data-line="243">
<td><code>preferences.md</code></td>
<td>Shared instructions every agent must follow. One rule per line. The coordinator agent passes the file to an agent every time the agent starts or resumes</td>
</tr>
<tr class="code-line" data-line="244">
<td><code>units.tsv</code></td>
<td>For each unit of work: ID, track (a line of work that runs in parallel), state, branch, PR, head SHA (the ID of the PR's latest commit), and brief location</td>
</tr>
<tr class="code-line" data-line="245">
<td><code>ledger.tsv</code></td>
<td>The ledger that records the verification result for each PR</td>
</tr>
<tr class="code-line" data-line="246">
<td><code>inbox/</code></td>
<td>The folder that records completion notices from Workers and the locations of their reports</td>
</tr>
<tr class="code-line" data-line="247">
<td><code>gates.md</code></td>
<td>Matters that need the operator's decision, recorded as the question, the options, and what happens if no answer comes</td>
</tr>
<tr class="code-line" data-line="248">
<td><code>decisions.tsv</code></td>
<td>A record of decisions made during the work and their reasons</td>
</tr>
</tbody>
</table>

<a id="the-brief-is-the-only-explanation-a-worker-gets"></a>


#### The brief is the only explanation a Worker gets

When the coordinator agent gives Workers work, it writes a brief for each unit of work. Workers cannot ask the coordinator agent questions during the work. <strong>Anything the brief leaves out, the Worker has to fill in by guessing.</strong>

Work that proceeds on guesses tends to produce the wrong result. So the brief has fixed fields to fill in. The main fields are these:

- <strong>GOAL.</strong> The purpose of the work in one sentence, written so that someone who does not know the chat history can carry it out.
- <strong>SCOPE.</strong> The files the Worker may change, the files it must not change, and the branch it uses exclusively.
- <strong>CONTEXT.</strong> The files and PRs to refer to. Workers cannot see other Workers' work, so when the work depends on an earlier result, paste the earlier Worker's full report as is.
- <strong>ACCEPTANCE.</strong> The conditions for counting the work as done, one per line, in a form that can be verified.
- <strong>VERIFY.</strong> The commands or steps to run to verify.
- <strong>TIMEBOX.</strong> A rough upper limit on work time. When the limit comes, the Worker returns its partial result and stops.
- <strong>FORBIDDEN.</strong> What the Worker must not do, for example changes outside the scope or a force-push.
- <strong>REPORT.</strong> The items to return in the report after the work.
- <strong>STANDING.</strong> The contents of `preferences.md`, pasted as is.

<strong>If the coordinator agent cannot fill even one field for a unit of work, it starts no Worker.</strong> For example, if you cannot write ACCEPTANCE, you have not decided what counts as done. A Worker started anyway has to guess the finish criteria, and the results vary. A field you cannot fill shows that the scope of the work is not yet decided. Settle the scope first, and then start the Worker.

Still, the length of the brief matches the size of the work. A long brief with every field written in detail for a few-line fix costs more to write and read than the work itself. For small work like that, write only the goal, the scope, the command to verify with, and the report format, in one paragraph.

<a id="the-ledger-records-how-far-each-pr-was-verified"></a>


#### The ledger records how far each PR was verified

The ledger (`ledger.tsv`) records whether a PR was really verified. It holds one line per PR with a verdict that says how far the PR was verified. There are five verdicts:

<table class="code-line" data-line="274">
<thead class="code-line" data-line="274">
<tr class="code-line" data-line="274">
<th>Verdict</th>
<th>Meaning</th>
</tr>
</thead>
<tbody class="code-line" data-line="276">
<tr class="code-line" data-line="276">
<td><code>live-ui-verified</code></td>
<td>A verifier drove the real screen or CLI and verified the behavior</td>
</tr>
<tr class="code-line" data-line="277">
<td><code>unit-test-verified</code></td>
<td>Unit tests verified the PR</td>
</tr>
<tr class="code-line" data-line="278">
<td><code>type-check-only</code></td>
<td>Only the type check passed</td>
</tr>
<tr class="code-line" data-line="279">
<td><code>verifier-blocked</code></td>
<td>Verification could not run, for example because of an environment problem</td>
</tr>
<tr class="code-line" data-line="280">
<td><code>verifier-failed</code></td>
<td>Verification found a problem</td>
</tr>
</tbody>
</table>

For example, work that changes the screen or behavior needs more than the type check of `type-check-only`. It needs a stronger verdict, because a type check does not verify real behavior.

`verifier-blocked` is not a pass, so the coordinator agent reruns verification once the environment is fixed. When a PR gets `verifier-failed`, the coordinator agent does not repeat the same verification. It creates a new unit of work to fix the problem.

A passing CI run is one input to a verdict. <strong>A passing CI run alone is not a verdict.</strong> CI runs only the tests that exist and does not verify real behavior.

The ledger records verdicts per pair of PR number and head SHA. Adding a commit to the PR or rebasing it changes the head SHA.

A PR whose head SHA changed may differ from what it was when the verdict was recorded. So <strong>the coordinator agent does not use a verdict recorded at an old head SHA.</strong> When the commit changes, verification runs again, and the ledger records the new verdict under the new head SHA.

<a id="only-one-stacker-restacks"></a>


#### Only one stacker restacks

A stack is a chain of PRs linked as parent and child. When a lower PR changes, someone must rebuild the PRs above it on top of the changed PR, as the diagram below shows. The Playbook calls this rebuild a restack.

```
Before the update
main
└─ PR #1 (parent: main)
   └─ PR #2 (parent: PR #1)
      └─ PR #3 (parent: PR #2)

Update order after change A is added to PR #1
PR #1 → PR #2 → PR #3

After the update
main
└─ PR #1 (change A)
   └─ PR #2 (picks up the updated parent PR #1)
      └─ PR #3 (picks up the updated parent PR #2)
```

"Orchestrate" places exactly one agent per stack to restack it. The Playbook calls this agent the stacker, the stack's manager.

The stacker restacks with the commands (`gt`) of Graphite, a tool that handles stacked PRs together.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="318">
<li class="code-line" data-line="318">
<strong>Graphite.</strong> A tool that creates and manages PRs as a stack with parent-child relationships.</li>
</ul>
</div></aside>

Workers use neither `gt` nor rebase. When several agents rebuild the same stack at once, they overwrite each other's changes and break the parent-child links between PRs. <strong>Limiting restacks to one stacker</strong> means only one agent ever rewrites the stack, so these conflicts do not happen.

<a id="do-not-resume-an-agent-only-to-check-on-it"></a>


#### Do not resume an agent only to check on it

To check on progress, the coordinator agent does not resume a waiting agent and ask it. Asking that agent makes it resume its work. Instead, the coordinator agent reads the records that agents leave behind, such as the ledger, `units.tsv`, and pushed branches. It changes nothing in them.

<a id="agents-ask-the-operator-to-decide-only-four-kinds-of-things"></a>


#### Agents ask the operator to decide only four kinds of things

This Playbook assumes agents work on their own for long periods and the operator checks in only twice a day. If the agents ask about things they could decide themselves, work stops until the answer comes. So agents ask the operator to decide only these four kinds of things:

- Operations that cannot be undone, such as a force-push to a shared branch, a deploy, or a deletion
- Product or taste decisions that trying things cannot answer
- Cases where the shared instructions in `preferences.md` conflict with the real situation
- A dead end that remains even after the plan is rebuilt

Before asking, the agent records the matter in `gates.md`, and it continues other work while it waits for the answer.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="339">
<li class="code-line" data-line="339">
<strong>force-push.</strong> A push that forcibly overwrites the history of a remote branch with the local history.</li>
</ul>
</div></aside>

<a id="the-key-point-is-three-rules-about-completion%2C-standing-instructions%2C-and-briefs"></a>


### The key point is three rules about completion, standing instructions, and briefs

This Playbook puts the following three rules at the top, and every later step assumes them.

- <strong>Do not process completion notices as each one arrives. Collect them and process them together.</strong> Dozens of Workers run at once, so if the coordinator agent stopped for every notice, its own work would not move. Notices collect in the inbox (`inbox/`), and the coordinator agent processes them together at a good break point (step 5).
- <strong>Always pass the shared instructions, both at start and at resume.</strong> An agent can drop instructions it received earlier when the coordinator agent resumes it. Each dropped instruction makes the operator repeat themselves. So the coordinator agent passes the contents of `preferences.md` as is at every start and every resume.
- <strong>The quality of the brief becomes the quality of the result.</strong> Workers cannot ask questions during the work. So nobody notices a vague brief, and the result comes out wrong.

<a id="how-to-phrase-the-request%3A-state-the-exit-condition-and-how-often-you-will-check-in"></a>


### How to phrase the request: state the exit condition and how often you will check in

The example request in the bundled guide [`07-overnight.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/07-overnight.md) states the exit condition, which is to keep going until every package is converted and merged. It also states that the operator checks in twice a day.

```
/poteto-mode orchestrate the store migration. own it until every package is converted and merged. i'll check in twice a day.
```

<a id="in-%22autopilot-full%22%2C-an-owner-per-pr-takes-it-to-merge%2C-and-the-coordinator-agent-only-issues-verification-verdicts"></a>


## In "Autopilot-full", an owner per PR takes it to merge, and the coordinator agent only issues verification verdicts

"Autopilot-full" is the Playbook that takes a queue of independent PRs all the way to merge without the operator's review. A queue is a line of work that waits to be processed.

Each PR gets one agent assigned to it. The Playbook calls this agent the <strong>owner</strong>. The owner is responsible for its PR from creation to merge.

<strong>The coordinator agent does not touch the PRs. It only issues verification verdicts.</strong> An owner cannot merge without a passing verdict from the coordinator agent. Owners verify their own work too. But the author's own check leaves gaps, so the pass condition is verification by a different agent.

A passing verdict has conditions. The PR must go through `/swarm` ([Chapter 24](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/2df1db)), which runs several verifiers in parallel. Each of those verifiers is a lane. The lanes must include a live lane, which drives the real screen or CLI to check behavior. The live lane is the minimum requirement, and a verdict without a live lane does not pass. In addition, the owner fixes every finding the lanes report, including findings given only as notes. The Playbook calls a verdict that passes this way a <strong>clean verdict</strong>.

<a id="seven-steps-2"></a>


### Seven steps

The steps are as follows.

1. Wait for the operator's go-ahead (state-then-wait)
2. Start one owner per PR
3. Run owners in parallel and do not stack PRs
4. Verify each round with `/swarm`
5. When a clean verdict comes, the owner merges the PR itself
6. The coordinator agent inspects the whole run about every 30 minutes
7. When the operator stops the run, stop every owner

The sections below look at each step in turn.

<a id="1.-wait-for-the-operator's-go-ahead-(state-then-wait)"></a>


#### 1. Wait for the operator's go-ahead (state-then-wait)

When the operator asks for the plan, explain it and stop. Start only after the operator explicitly says to start, and set the overall goal with `/goal`. For PRs the operator said they will handle themselves, the owner does not merge and leaves them to the operator.

<a id="2.-start-one-owner-per-pr"></a>


#### 2. Start one owner per PR

An owner is an agent that runs in Cursor's cloud through the Cloud Agents feature. The owner creates the PR, checks behavior on the real thing, triages Bugbot comments, and rebases onto trunk. It works until CI passes with "[Babysit](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md)" ([Chapter 14](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/8f6c25)), and then it merges.

<a id="3.-run-owners-in-parallel-and-do-not-stack-prs"></a>


#### 3. Run owners in parallel and do not stack PRs

If the PRs are independent, working on them at the same time causes no conflicts. So the owners do not stack the PRs, and each PR starts from trunk.

<a id="4.-verify-each-round-with-%2Fswarm"></a>


#### 4. Verify each round with `/swarm`

A round is one pass in which the owner settles its code and gets it verified. Each push of a fix starts a new round. The verifiers run in parallel on the commit settled at that point. The coordinator agent combines their results into one verdict. A verdict without a live lane does not count as a clean verdict.

<a id="5.-when-a-clean-verdict-comes%2C-the-owner-merges-the-pr-itself"></a>


#### 5. When a clean verdict comes, the owner merges the PR itself

Right before merging, the owner rebases onto the latest trunk again, then merges and takes the next item from the queue.

<a id="6.-the-coordinator-agent-inspects-the-whole-run-about-every-30-minutes"></a>


#### 6. The coordinator agent inspects the whole run about every 30 minutes

The coordinator agent rereads the Playbook and the `/goal`. If the run has drifted from them, the coordinator agent corrects the drift at once. It also checks for stalled owners and replaces any it finds.

<a id="7.-when-the-operator-stops-the-run%2C-stop-every-owner"></a>


#### 7. When the operator stops the run, stop every owner

The operator's stop reaches every owner at once as the instruction "write nothing from now on".

<a id="what-the-reply-includes-2"></a>


#### What the reply includes

The reply contains these items:

- Each PR's owner, state, and verdict
- Merged PRs
- Items waiting for the operator's decision
- The location of the decision record

<a id="the-key-point-is-to-count-progress-only-by-side-effects"></a>


### The key point is to count progress only by side effects

In Autopilot-full, many owners and subagents run at once. Some of them stop on an error and report nothing. If nobody acts on a stalled agent, its PR never moves.

So the coordinator agent does not go by what agents report about themselves. <strong>It counts as progress only the traces that the work left.</strong> The traces are commits, pushes, changes in PR or check state, and reports to the store. The Playbook calls these changes side effects, because they are visible from outside as results of the work.

If an owner shows no side effects after the expected time, the coordinator agent treats the owner as stalled. During the inspection in step 6, the coordinator agent replaces the owner with another agent without waiting for a reply. The replacement keeps a stalled owner from slowing the whole run. "Orchestrate" applies the same idea when it checks commits, PR state, and the ledger instead of resuming a waiting agent only to check progress.

<a id="how-to-phrase-the-request%3A-state-that-the-items-are-independent-and-when-they-must-be-merged"></a>


### How to phrase the request: state that the items are independent and when they must be merged

The example request in the bundled guide states that the items in the queue are independent of each other and that they should be merged by morning.

```
/poteto-mode full autopilot on this queue. each item is independent. i want them merged by morning.
```

<a id="%22autopilot-stack%22-builds-and-verifies-prs-the-same-way-as-autopilot-full%2C-but-does-not-merge-them-and-hands-them-to-the-operator-as-one-stack"></a>


## "Autopilot-stack" builds and verifies PRs the same way as Autopilot-full, but does not merge them and hands them to the operator as one stack

"Autopilot-stack" builds and verifies PRs the same way as "Autopilot-full", but <strong>it does not merge.</strong> It puts the PRs that passed verification into one stack and hands that stack to the operator. The operator reviews the stack and merges it themselves.

Use this Playbook when a person wants to review before merge, when the changes depend on each other and must be stacked in order, or when you cannot give the agents merge permission.

<a id="steps%3A-how-they-differ-from-autopilot-full"></a>


### Steps: how they differ from Autopilot-full

The steps are almost the same as in "Autopilot-full". The differences are these:

- After verification passes, the owner reports STACK-READY, meaning ready to go on the stack, instead of merge-ready.
- No owner merges. The coordinator agent adds only PRs with a clean verdict, in order, to the single stack. <strong>A PR that has not passed verification does not go on the stack.</strong>
- Only the coordinator agent changes the stack order, meaning which PR sits on top of which. Owners push only to their own branches.
- When trunk moves forward, the coordinator agent rebases the stack again, starting from the frontmost PR. A rebase changes the head SHA, so any PR whose contents changed goes through verification again.
- Finally, the coordinator agent hands the operator the stack, with a verification verdict on each PR. The operator reviews and merges starting from the frontmost PR.

The reply contains these items:

- Links to the frontmost PR of the stack, which targets trunk, and to the topmost PR
- A summary of each PR's verdict
- PRs removed from the stack and the reasons

<a id="the-key-point-is-the-division-of-work-in-which-only-the-coordinator-agent-rewrites-the-stack-order"></a>


### The key point is the division of work in which only the coordinator agent rewrites the stack order

The stack order is information every owner shares. If several owners rewrite the parent-child links between PRs at the same time, their changes conflict with each other and the stack breaks.

So <strong>only the coordinator agent rewrites the stack order</strong>, and owners only push to their own branches. With one agent doing the rewriting, the order cannot conflict.

This matches how "Orchestrate" gives each branch one Worker and hands restacks to one stacker. You can read both as a division of work that follows the principle "[Separate Before Serializing Shared State](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md)" ([Chapter 18](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e529e4)).

<a id="how-to-phrase-the-request%3A-write-%22stack-them%2C-don't-ship%22"></a>


### How to phrase the request: write "stack them, don't ship"

The example request in the bundled guide states that the changes go on a stack, that they are not shipped, and that the operator lands the stack themselves.

```
/poteto-mode autopilot these five changes but stack them, don't ship. i'll land the stack in the morning.
```

<a id="pick-among-the-five-options-for-long-running-work-by-who-merges-and-what-the-unit-of-work-is"></a>


## Pick among the five options for long-running work by who merges and what the unit of work is

When you hand off long-running work, choose by <strong>what the unit of work is and who merges</strong>. The choices are four Playbooks ("Autonomous run", "Orchestrate", "Autopilot-full", and "Autopilot-stack") and `/figure-it-out` ([Chapter 23](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/ba4cc8)), which designs an auditable procedure of its own when no Playbook fits.

<table class="code-line" data-line="477">
<thead class="code-line" data-line="477">
<tr class="code-line" data-line="477">
<th>Aspect</th>
<th>"Autonomous run"</th>
<th><code>/figure-it-out</code></th>
<th>"Orchestrate"</th>
<th>"Autopilot-full"</th>
<th>"Autopilot-stack"</th>
</tr>
</thead>
<tbody class="code-line" data-line="479">
<tr class="code-line" data-line="479">
<td>Unit of work</td>
<td>One task</td>
<td>One large piece of work</td>
<td>The whole of work that lasts for days</td>
<td>A queue of independent PRs</td>
<td>A queue of changes with order or dependencies</td>
</tr>
<tr class="code-line" data-line="480">
<td>Who merges</td>
<td>Not specified by the Playbook</td>
<td>Depends on the designed procedure</td>
<td>The coordinator agent or the stacker</td>
<td>Each PR's owner</td>
<td>The operator</td>
</tr>
<tr class="code-line" data-line="481">
<td>When to choose it</td>
<td>The exit condition can be written as one verifiable condition, and one agent can finish</td>
<td>The work is large, spans many places, or no Playbook fits</td>
<td>One agent cannot finish within the time it can run</td>
<td>The PRs are independent and you have merge permission</td>
<td>You want review before merge, the work is interdependent, or you lack permission</td>
</tr>
</tbody>
</table>

Of the two Autopilot Playbooks, choose "Autopilot-full" if the PRs are independent and merge permission is granted. Otherwise, choose "Autopilot-stack".

<a id="summary"></a>


## Summary

- <strong>How the four Playbooks divide the work.</strong> "Multi-phase or multi-PR plan" writes the plan document, "Orchestrate" manages work that lasts for days, "Autopilot-full" has an owner per PR take it to merge, and "Autopilot-stack" hands over one stack without merging. Each one states what the coordinator agent does not own.
- <strong>Multi-phase or multi-PR plan.</strong> It writes a checklist plan document. A PR counts as verified only when unit, live, and perf are all checked.
- <strong>Orchestrate.</strong> It manages work that lasts for days with briefs, the tables in the store, and the ledger. It starts no Worker on a unit whose brief it cannot fill completely, and it records verdicts per latest commit.
- <strong>Autopilot-full.</strong> Each owner takes its PR to merge, and the coordinator agent owns only the verdicts. Progress is counted only by side effects.
- <strong>Autopilot-stack.</strong> It hands over one stack without merging. Only the coordinator agent rewrites the stack order.
- <strong>The five options.</strong> Choose by what the unit of work is and who merges.

[Part III](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/0d1535) has now covered every Playbook pstack provides. [Part IV](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/df0d7d) looks at the Principles that guide the agent's decisions during the work, such as which option to adopt and when to finish.
<!-- book-body:end -->

---

[Contents](README.md) · [Previous](19-chapter.md) · [Next](21-chapter.md) · [简体中文](../zh-CN/20-chapter.md)
