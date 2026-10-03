# Chapter 14: Open PRs and merge verified changes

[Contents](README.md) · [Previous](17-chapter.md) · [Next](19-chapter.md) · [简体中文](../zh-CN/18-chapter.md)

By kaito · [Japanese original](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/45a56e) · [Author’s English edition](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/8f6c25)

Source snapshot: 2026-10-03. The text below preserves the author’s English edition.

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
This chapter covers three Playbooks:

1. [Opening a PR](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md)
2. [Babysit](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/babysit.md)
3. [Shipping](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/shipping.md)

All three handle the path of a change into trunk, the main branch that PRs merge into. Each one owns one of these three stages:

- <strong>Create the PR</strong>
- <strong>Bring the PR to merge-ready</strong>
- <strong>Bring only verified PRs into trunk</strong>

Which Playbook to use depends on the stage the PR is at now. Choose by whether there is no PR yet, whether the PR exists but is not ready to merge, or whether you want to bring a merge-ready PR into trunk.

This chapter explains how the three Playbooks connect, then the steps and key point of each in turn.

<a id="how-this-chapter-is-organized"></a>


## How this chapter is organized

The chapter has these sections:

- The three Playbooks connect in the order "create the PR, make it mergeable, and bring it into trunk"
- "Opening a PR" creates PRs that are small, readable, and ready to review
- "Babysit" clears problems from the unmerged frontmost PR first and makes it merge-ready
- "Shipping" brings into trunk only the range of PRs that passed another agent's verification
- Summary

<a id="the-three-playbooks-connect-in-the-order-%22create-the-pr%2C-make-it-mergeable%2C-and-bring-it-into-trunk%22"></a>


## The three Playbooks connect in the order "create the PR, make it mergeable, and bring it into trunk"

The stages named at the start line up in the order "create the PR", "make it green", and "bring it into trunk", and <strong>each one has a fixed end point</strong>. "Green" means that all CI checks pass.

<table class="code-line" data-line="30">
<thead class="code-line" data-line="30">
<tr class="code-line" data-line="30">
<th>Stage</th>
<th>Playbook</th>
<th>End point</th>
</tr>
</thead>
<tbody class="code-line" data-line="32">
<tr class="code-line" data-line="32">
<td>Create</td>
<td>"Opening a PR"</td>
<td>Returns the PR's URL</td>
</tr>
<tr class="code-line" data-line="33">
<td>Make green</td>
<td>"Babysit"</td>
<td>merge-ready</td>
</tr>
<tr class="code-line" data-line="34">
<td>Bring in</td>
<td>"Shipping"</td>
<td>Merges the verified PRs that continue from the root</td>
</tr>
</tbody>
</table>

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="37">
<li class="code-line" data-line="37">
<strong>Forge.</strong> In this chapter, "forge" means the service that manages PRs together with the CLI that drives it. The default is the GitHub CLI (<code>gh</code>).</li>
<li class="code-line" data-line="38">
<strong>trunk.</strong> The main branch that PRs merge into. In many repositories it is <code>main</code>.</li>
<li class="code-line" data-line="39">
<strong>Stack.</strong> A chain of PRs linked as parent and child. Only the frontmost PR, the root, targets trunk. The next section shows the shape.</li>
<li class="code-line" data-line="40">
<strong>Merge frontier.</strong> Among the unmerged PRs in a stack, the PR to merge next.</li>
<li class="code-line" data-line="41">
<strong>merge-ready.</strong> The state in which the forge judges that all CI checks pass, no review is unresolved, and there are no conflicts.</li>
</ul>
</div></aside>

Each stage also has its own wording for the request. These examples come from the verification page of the bundled guide ([`docs/guide/06-verify-and-ship.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md)).

```
/poteto-mode babysit this pr. get it green.
```

```
/poteto-mode land the stack.
```

<strong>Opening a PR does not start "Babysit".</strong>

Ask "get it green" and "Babysit" runs. Ask "land the stack" and "Shipping" runs.

<a id="%22opening-a-pr%22-creates-prs-that-are-small%2C-readable%2C-and-ready-to-review"></a>


## "Opening a PR" creates PRs that are small, readable, and ready to review

"Opening a PR" is <strong>the Playbook that sets the conventions for turning a change into a PR</strong>.

Unlike the Playbooks so far, its steps are not numbered. It groups rules under headings. The main rules are these:

- <strong>Worktree.</strong> The agent works in a git worktree created from main.
- <strong>Commits.</strong> Before you open the PR, use rebase to regroup the work into small, ordered commits. Treat each commit as a "future PR" that could merge on its own.
- <strong>PRs.</strong> Run `/deslop` on the diff before you commit. `/deslop` is a Skill in [`cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit) that removes the extra code AI tends to write. Run `/no-comments`, a Skill that removes unneeded comments, before review. Write the title, description, and commit bodies with `/technical-writing`, which sets the standard for technical writing. Then run `/unslop`, which cuts the phrasing AI tends to write ([Chapter 32](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/c22a83)).
- <strong>Titles.</strong> Write titles in Conventional Commits format, such as `fix(pstack): retarget opening-a-pr babysit trigger`.
- <strong>Forge.</strong> Use the same forge from creation to merge.
- <strong>Size and stacks.</strong> Prefer five narrow PRs to one large PR, and stack the small PRs.
- <strong>Readiness.</strong> Open the PR ready for review, not as a draft.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="73">
<li class="code-line" data-line="73">
<strong>git worktree.</strong> A Git feature that adds a working directory with a different branch checked out from the same repository. For example, you can keep the main working directory and open a fix branch in a separate directory.</li>
</ul>
</div></aside>

A stack has the following shape. Each child PR targets its parent's branch as its base.

```
main  ← trunk
 └─ PR #1 (base: main) ← only the root PR targets trunk
     └─ PR #2 (base: PR #1's branch)
         └─ PR #3 (base: PR #2's branch)
```

<a id="write-the-pr-body-as-a-%22briefing%22"></a>


### Write the PR body as a "briefing"

The key point of this Playbook is the first sentence of its rules for the body.

> The PR body is a briefing, not the lab notebook.

Do not list what you tried or how the work went. <strong>Write only what a reviewer with the diff in hand needs to decide whether to approve the change.</strong> Order the body as `## Why`, `## Scope`, `## Tradeoffs`, `## Blast Radius`, and `## Verification`, and leave out any section with nothing to say.

<a id="opening-a-pr-does-not-start-babysit"></a>


### Opening a PR does not start Babysit

<strong>After the agent opens a PR, it reports the PR's URL and continues with the rest of the work.</strong>

A "Babysit" run for each PR interrupts the work every time. Also, if later work rewrites the commits, the CI checks that ran on that PR go to waste, and the checks have to run again on the new commits.

The exception is the owners, the agents that each own one PR, in "[Autopilot-full](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-full.md)" and "[Autopilot-stack](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/autopilot-stack.md)", which [Chapter 16](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3b2bef) covers. Autopilot-full is the Playbook in which agents take a queue of PRs to merge on their own. Autopilot-stack works the same way but builds one stack instead of merging. The owner's instructions include the "Babysit" loop, so after an owner opens its PR, it keeps going until the PR is merge-ready, or STACK-READY in Autopilot-stack.

<a id="how-to-phrase-the-request%3A-ask-for-small%2C-ordered-commits-and-evidence-in-the-description"></a>


### How to phrase the request: ask for small, ordered commits and evidence in the description

The example request in the bundled guide asks for small, ordered commits and for evidence in the PR description.

```
/poteto-mode open the pr. small ordered commits, evidence in the description.
```

<a id="%22babysit%22-clears-problems-from-the-unmerged-frontmost-pr-first-and-makes-it-merge-ready"></a>


## "Babysit" clears problems from the unmerged frontmost PR first and makes it merge-ready

"Babysit" is the Playbook that clears conflicts, review threads, and CI failures and <strong>brings a PR or a stack to merge-ready</strong>. It stops when it reaches a point that needs a human decision.

Cursor also has a built-in `/autopilot` Skill that watches PR status. Its former name was babysit. Similar request wording can invoke that Skill. So `/poteto-mode` states that it <strong>routes every request about PR status to this Playbook</strong>. Here are examples of such requests.

- "Watch this PR"
- "Get it green"
- "Address the Bugbot comments"
- "Check on PR X"

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="121"><a href="https://cursor.com/docs/bugbot" rel="nofollow noopener noreferrer" target="_blank"><strong>Bugbot</strong></a> is a Cursor feature that reviews PRs automatically. When someone creates or updates a PR, Bugbot reads the diff and posts suspected bugs and security problems as PR review comments.</p>
</div></aside>

<a id="steps%3A-clear-problems-from-the-frontmost-pr-first"></a>


### Steps: clear problems from the frontmost PR first

The main steps are these:

1. <strong>Declare the mode.</strong> Before you check status, choose the mode, which sets how far to go. The default is `drive`. Use `check` for a small PR or a docs-only PR (see the table below for each mode).
2. <strong>Focus only on the frontier.</strong> Fix only the unmerged frontmost PR, and leave the PRs above it alone.
3. <strong>Assign one agent per stack.</strong>
4. <strong>Do not change the stack's structure, which is the parent-child links between PRs.</strong> No rebase, no base retargeting, and no force-push. If the PR needs a rebase, report that need to the branch owner.
5. <strong>Clear conflicts, then review threads, then CI.</strong> Combine all known fixes into one push so the checks rerun only once. Conflicts are the one thing the agent does not resolve itself. It reports which branch needs a rebase and stops.
6. <strong>Trust the forge's judgment.</strong> "ready" means the forge accepts the PR as mergeable, not that all CI checks pass. On GitHub, the bundled script [`watch-pr`](https://github.com/cursor/plugins/tree/main/pstack/skills/poteto-mode/scripts/watch-pr) gets the PR's status.
7. <strong>Classify a CI failure before you rerun it.</strong> Rerun only for flakes or infrastructure problems. A flake is a test that fails now and then for reasons unrelated to the code. Fix with a commit only when the diff's own code caused the failure.
8. <strong>Triage the Bugbot comments.</strong>
9. <strong>Stop where a human decision is needed.</strong>

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="139">
<li class="code-line" data-line="139">
<strong>Triage.</strong> The sorting of items to decide whether each needs action and which action to take. Examples of actions are fix, dismiss, and ask.</li>
</ul>
</div></aside>

<table class="code-line" data-line="142">
<thead class="code-line" data-line="142">
<tr class="code-line" data-line="142">
<th>Mode</th>
<th>What it does</th>
<th>Matching requests</th>
</tr>
</thead>
<tbody class="code-line" data-line="144">
<tr class="code-line" data-line="144">
<td><code>drive</code></td>
<td>Repeats status checks and fixes until merge-ready</td>
<td>"Get it green", "Make it mergeable"</td>
</tr>
<tr class="code-line" data-line="145">
<td><code>background</code></td>
<td>Triages PR status without stopping other work</td>
<td>While a plan is still running</td>
</tr>
<tr class="code-line" data-line="146">
<td><code>threads-only</code></td>
<td>Answers only review comments</td>
<td>"Address the Bugbot comments"</td>
</tr>
<tr class="code-line" data-line="147">
<td><code>check</code></td>
<td>Checks status once and reports</td>
<td>"Check on X", "Is it green?"</td>
</tr>
</tbody>
</table>

<a id="sort-bugbot-comments-into-fix%2C-dismiss%2C-and-ask"></a>


### Sort Bugbot comments into fix, dismiss, and ask

In step 8, the agent sorts comments from Bugbot and other reviewers into three groups before acting on them. The criteria are in [`references/bugbot-triage.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/references/bugbot-triage.md).

- <strong>fix.</strong> If the comment may concern correctness, security, data loss, or similar, fix the problem in the earliest-merging PR that contains the problem code, and resolve the thread.
- <strong>dismiss.</strong> If the comment matches a recorded low-risk pattern and the code proves the concern does not apply, reply with a short reason and resolve the thread.
- <strong>ask.</strong> If the finding is of a new kind, of high severity, or ambiguous, ask the user instead of guessing.

The agent first verifies a Bugbot finding against the code. When it cannot tell whether the finding is a false positive, <strong>it asks the user instead of guessing.</strong> A real bug that the agent wrongly dismisses costs more than the time a question takes.

A review comment is a claim to verify, not an instruction to follow as is. So the agent does not change code only to make a finding go away. It fixes the code only when it has verified the problem.

<a id="even-at-merge-ready%2C-the-agent-does-not-merge"></a>


### Even at merge-ready, the agent does not merge

The merge rule in step 9 is this:

> Babysitting never authorizes merging. Only an explicit request to merge, land, ship, or merge when ready does.

Even when the PR reaches merge-ready, <strong>the agent reports and stops.</strong> When the user asks it to merge, the agent hands off to "Shipping".

When the PR reaches merge-ready, the agent reviews the comment triage from that run. If it finds a dismiss pattern that would help the team, it proposes to add the pattern to `references/bugbot-triage.md` in a separate PR. A dismiss pattern is a recorded low-risk pattern.

<a id="the-key-point-is-the-%22frontier-only%22-rule"></a>


### The key point is the "frontier only" rule

In "Babysit", <strong>the agent fixes problems in the PR that merges next first.</strong>

It also reads review comments on later PRs and collects what needs doing. But if the fixes for those comments would make the earlier-merging PR rerun its checks, the agent postpones the fixes on the later PRs.

For example, if PR #1's CI is failing and a review comment arrives on PR #3, the agent gets PR #1's CI passing first. A stack can merge only from the bottom up, so the frontier is the only place where merging can move forward right now.

If the agent fixed and pushed each comment on an upper PR as it arrived, the checks would also rerun every time. So the agent holds the comments on upper PRs and fixes them in the same single push as the frontier fix.

<a id="how-to-phrase-the-request%3A-ask-%22get-it-green%22%2C-and-keep-the-request-small-when-you-want-only-status"></a>


### How to phrase the request: ask "get it green", and keep the request small when you want only status

When you want the agent to bring the PR to merge-ready, ask it to "get it green". Here is the request from the start of the chapter again.

```
/poteto-mode babysit this pr. get it green.
```

When you want only the status, keep the request small. The agent answers the following request in `check` mode without starting the loop.

```
/poteto-mode check on pr 123. anything outstanding?
```

<a id="%22shipping%22-brings-into-trunk-only-the-range-of-prs-that-passed-another-agent's-verification"></a>


## "Shipping" brings into trunk only the range of PRs that passed another agent's verification

"Shipping" is the Playbook to use <strong>when the user asks the agent to bring a stack whose CI passed into trunk</strong>, the main branch that PRs merge into. It verifies each PR independently and merges, one at a time, only the verified range that continues from the root. `/poteto-mode` sums up this Playbook as "Green is not safe."

<a id="the-key-point-is-the-definition-of-%22safe%22"></a>


### The key point is the definition of "safe"

> Safe means a verdict from an agent that did not write the code. CI green is not a verdict, and an approving bot review is not a verdict.

This definition applies the idea from [Chapter 2](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/950071), "trust the artifact, not the agent", to the check right before merge. <strong>The definition also decides who verifies.</strong>

<a id="steps%3A-verify-each-pr%2C-find-the-continuous-range%2C-and-bring-prs-into-trunk-one-at-a-time"></a>


### Steps: verify each PR, find the continuous range, and bring PRs into trunk one at a time

There are six steps.

1. Verify every PR independently
2. Bring in only the continuous verified range that starts at the root
3. Verify that the verdict still describes the same diff
4. Prepare only the frontmost PR, and merge one at a time
5. Recompute after each merge, and watch the status until the frontmost PR merges
6. Stop at the limit

The sections below look at each step in turn.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="219">
<li class="code-line" data-line="219">
<strong><code>git patch-id</code>.</strong> A Git command that computes an identifier from the contents of a commit's diff. If the diff is the same, the value is the same even when the commit ID changes.</li>
</ul>
</div></aside>

<a id="1.-verify-every-pr-independently"></a>


#### 1. Verify every PR independently

Assign one subagent per PR and have it compare the parent branch with the PR's latest commit on the real screen or with real commands. The result is `PASS`, `PASS+NOTES`, or `FAIL`. `PASS+NOTES` is a pass with notes.

<a id="2.-bring-in-only-the-continuous-verified-range-that-starts-at-the-root"></a>


#### 2. Bring in only the continuous verified range that starts at the root

Step 2 decides the "continuous range" as follows.

```
PR #4  PASS        ← verified, but an unverified PR sits below it
PR #3  (unverified) ← the continuous range breaks here
PR #2  PASS
PR #1  PASS        ← frontier
main
```

In other words, <strong>the agent may bring in only PR #1 and #2.</strong>

To merge PR #4, an agent must first verify and merge the unverified PR #3 underneath it. If the agent skipped the verification of #3, unverified changes would get into trunk.

<a id="3.-verify-that-the-verdict-still-describes-the-same-diff"></a>


#### 3. Verify that the verdict still describes the same diff

Even if a rebase changed the commit ID, which is the SHA, use `git patch-id` to compare whether the diff's contents are the same. If the contents changed, verify again.

<a id="4.-prepare-only-the-frontmost-pr%2C-and-merge-one-at-a-time"></a>


#### 4. Prepare only the frontmost PR, and merge one at a time

To prepare the frontmost PR, rebase it onto the latest trunk if needed, and retarget its base to trunk. Prepare the next PR only after the previous PR has merged.

<a id="5.-recompute-after-each-merge%2C-and-watch-the-status-until-the-frontmost-pr-merges"></a>


#### 5. Recompute after each merge, and watch the status until the frontmost PR merges

After each merge, recheck the base, checks, and patch-id of the PR that became the new frontier. Even if auto-merge is queued, do not treat that as evidence that the stack is safe.

<a id="6.-stop-at-the-limit"></a>


#### 6. Stop at the limit

The limit is the top PR of the continuous verified range. In the diagram in step 2, the limit is PR #2. After the agent merges up to that PR, it reports which PRs it brought in and which PR is the next unverified one, then finishes.

<a id="how-to-phrase-the-request%3A-ask-the-agent-to-%22land-the-stack%22"></a>


### How to phrase the request: ask the agent to "land the stack"

Here is the request from the start of the chapter again.

```
/poteto-mode land the stack.
```

<a id="summary"></a>


## Summary

- <strong>How the three Playbooks connect.</strong> "Opening a PR" creates the PR, "Babysit" gets it to a mergeable state, and "Shipping" merges verified PRs into trunk, the main branch that PRs merge into.
- <strong>Opening a PR.</strong> It creates small, ordered commits and PRs with a narrow diff, and keeps the body short as a "briefing". Opening a PR does not start "Babysit".
- <strong>Babysit.</strong> It declares a mode, looks only at the frontier, and brings the PR to merge-ready. It sorts Bugbot comments into fix, dismiss, and ask.
- <strong>Shipping.</strong> It defines "safe" as a verdict from an agent that did not write the code, and merges, one at a time, only the continuous verified range from the root.
- <strong>The difference between Babysit and Shipping.</strong> Of the two, only "Shipping" merges, and only on an explicit request. (The Playbooks in [Chapter 16](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3b2bef), such as "Autopilot-full", have different rules.)

The next chapter, [Chapter 15](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/305f88), looks at four Playbooks that continue one long piece of work while you are away, stop it, resume it, and clean it up.
<!-- book-body:end -->

---

[Contents](README.md) · [Previous](17-chapter.md) · [Next](19-chapter.md) · [简体中文](../zh-CN/18-chapter.md)
