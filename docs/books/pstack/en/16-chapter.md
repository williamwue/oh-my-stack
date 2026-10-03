# Chapter 12: Rebuild features, structure, and appearance

[Contents](README.md) · [Previous](15-chapter.md) · [Next](17-chapter.md) · [简体中文](../zh-CN/16-chapter.md)

By kaito · [Japanese original](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/f1e85b) · [Author’s English edition](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/4f3e0a)

Source snapshot: 2026-10-03. The text below preserves the author’s English edition.

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
This chapter covers the following four Playbooks.

1. [Feature](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/feature.md)
2. [Refactoring](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/refactoring.md)
3. [Prototype](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/prototype.md)
4. [Visual parity](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/visual-parity.md)

All four Playbooks change code. They differ in how they treat behavior. Behavior is the result a user receives, such as a command's output or what the screen shows.

They treat behavior in these different ways.

- Add behavior or change it
- Fix only the structure, without changing behavior
- Try out behavior to decide a design, then throw the code away
- Match the appearance pixel for pixel

Whichever Playbook you use, <strong>write in the request what must not change</strong>. The bundled guide's page on implementation ([`docs/guide/05-build-and-clean.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/05-build-and-clean.md)) also recommends that a Feature request state the behavior and what must not change.

This chapter explains, in order, how the four differ, how to use each one, and how to write the request.

<a id="how-this-chapter-is-organized"></a>


## How this chapter is organized

This chapter is organized as follows.

- Choose among the four Playbooks by whether you add behavior, keep it, try it, or match appearance
- "Feature" decides the shape of the data first, then delegates the implementation and reviews it
- "Refactoring" pins down the current behavior before it moves the structure
- "Prototype" decides a design at low cost with code meant to be thrown away
- "Visual parity" treats the reference appearance, the baseline, as the spec and aims for a zero image diff
- Write "what must not change" in the request
- Summary

<a id="choose-among-the-four-playbooks-by-whether-you-add-behavior%2C-keep-it%2C-try-it%2C-or-match-appearance"></a>


## Choose among the four Playbooks by whether you add behavior, keep it, try it, or match appearance

The four Playbooks split by <strong>how they treat behavior</strong>. What must not change, what the main agent is responsible for, and how the agent verifies the work all change with that choice.

<table class="code-line" data-line="36">
<thead class="code-line" data-line="36">
<tr class="code-line" data-line="36">
<th>Item</th>
<th>"Feature"</th>
<th>"Refactoring"</th>
<th>"Prototype"</th>
<th>"Visual parity"</th>
</tr>
</thead>
<tbody class="code-line" data-line="38">
<tr class="code-line" data-line="38">
<td>Behavior</td>
<td>Add or change</td>
<td>Do not change</td>
<td>Try out, never ship to production</td>
<td>Do not change the appearance</td>
</tr>
<tr class="code-line" data-line="39">
<td>Responsible for</td>
<td>The design</td>
<td>The contract, meaning the current behavior</td>
<td>The design decision, not the code</td>
<td>Pixel-level identity</td>
</tr>
<tr class="code-line" data-line="40">
<td>Verification</td>
<td>Run it where the change shows up and verify</td>
<td>Prove with the real artifact that behavior matches what it was before the change</td>
<td>Compare the options by observation</td>
<td>A zero image diff</td>
</tr>
</tbody>
</table>

The four also hand work to each other. "Prototype" passes the design option it chose by comparison to "Feature". "Refactoring" splits missing features or real bugs it finds along the way into separate work and ships the structural change first. When a whole design needs rebuilding, "Refactoring" says so explicitly and passes the work to "Feature".

<a id="%22feature%22-decides-the-shape-of-the-data-first%2C-then-delegates-the-implementation-and-reviews-it"></a>


## "Feature" decides the shape of the data first, then delegates the implementation and reviews it

"Feature" is a Playbook that first decides the shape of the data a new feature handles, meaning its fields and types, and implements the feature from that shape. <strong>The main agent is responsible for the design</strong> and delegates the code itself to another agent.

There are two key points.

- <strong>Decide the shape of the data before you write code.</strong> The principle "[Model the Domain](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-model-the-domain/SKILL.md)" ([Chapter 18](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e529e4)) explains that structure is cheap when you choose it while you write the code. When you try to recover it later, the work looks like refactoring, and people tend to postpone it.
- <strong>Separate the agent that writes the code from the agent that reviews its diff.</strong> A subagent writes the code, and the main agent reviews that diff (step 4).

<a id="procedure%3A-decide-the-design%2C-delegate-the-implementation%2C-and-verify-before-you-create-the-pr"></a>


### Procedure: decide the design, delegate the implementation, and verify before you create the PR

There are eight steps.

1. Run `/how`, the Skill that explains how code works ([Chapter 22](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/031877)), on the affected subsystems
2. Explore options for types and module structure in parallel with `/architect`, the Skill that draws the design before the code ([Chapter 24](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/2df1db))
3. Write the throughput checkpoint (see the table below)
4. Delegate the implementation to a subagent
5. Verify in the environment where the change shows up: a browser for UI, the CLI for a command
6. Rebase into small, ordered commits, as the principle "[Sequence Work into Verifiable Units](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-sequence-verifiable-units/SKILL.md)" asks ([Chapter 19](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/d3f914))
7. If there is disagreement about the design, run `/interrogate`, where reviewers on several models question the change ([Chapter 27](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e23752)), before you go on
8. Run "[Opening a PR](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/opening-a-pr.md)", which sets the procedure for creating a PR ([Chapter 14](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/8f6c25))

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="67"><strong>rebase</strong> is a Git operation that replays commits on top of a different base.</p>
</div></aside>

The throughput checkpoint in step 3 is <strong>four items in the TODO list</strong>. The items record what you found when you considered how to split the work so that parts of it run in parallel.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="73">The <strong>TODO list</strong> is the plan, a list of things to do that the agent makes at the start of the work. In Cursor, the TODO list appears in the chat panel. From this list, the user can check which steps the agent carried out and which steps it skipped. The agent marks a skipped step with <code>skip: &lt;reason&gt;</code><br/>
(the bundled guide <a href="https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md" rel="nofollow noopener noreferrer" target="_blank"><code>01-setup.md</code></a>).</p>
</div></aside>

Playbooks other than "Feature" also ask for this step in non-obvious work with several steps.

<table class="code-line" data-line="79">
<thead class="code-line" data-line="79">
<tr class="code-line" data-line="79">
<th>Item</th>
<th>What to write</th>
</tr>
</thead>
<tbody class="code-line" data-line="81">
<tr class="code-line" data-line="81">
<td>Steps to finish first</td>
<td>The gates that must pass before work goes parallel</td>
</tr>
<tr class="code-line" data-line="82">
<td>Independent streams of work</td>
<td>Work that causes no conflicts, meaning work whose files and layers do not overlap, can run in parallel</td>
</tr>
<tr class="code-line" data-line="83">
<td>Shared mutable state</td>
<td>The default is to remove the sharing. Split what each stream changes, so that no two streams rewrite the same thing at the same time. The principle "<a href="https://github.com/cursor/plugins/blob/main/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md" rel="nofollow noopener noreferrer" target="_blank">Separate Before Serializing Shared State</a>" sets this default</td>
</tr>
<tr class="code-line" data-line="84">
<td>Smallest safe split</td>
<td>Write the units of work that can be split safely. If one agent alone is the better choice, write why</td>
</tr>
</tbody>
</table>

Even when one of the four items does not apply to the current work, you keep it and write `n/a: <reason>`. The `n/a` line shows whether you considered the item and found it unnecessary, or overlooked it.

For the implementation in step 4, the main agent specifies the file paths, the shape of the data, and the success criteria. It then delegates the work to a subagent on the model configured for feature work. You can change that model with `/setup-pstack`, which [Chapter 6](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3a7791) mentions. If the implementation could take several reasonable forms, the agent sends the work through `/arena` ([Chapter 24](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/2df1db)). `/arena` builds several candidates in parallel for the same task and combines their good parts.

<strong>This delegation is mandatory.</strong> You cannot drop it with `skip: <reason>`, and the principle "[Laziness Protocol](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-laziness-protocol/SKILL.md)", which asks for the smallest change, cannot override it. The goal is not to save lines. The goal is to separate the review.

If the subagent that received the implementation cannot start another subagent, that implementation subagent writes the code. The agent that delegated the work reviews the diff, so implementation and review stay with different agents.

<a id="writing-the-request%3A-state-the-behavior-and-what-must-not-change"></a>


### Writing the request: state the behavior and what must not change

The bundled guide's example is the following.

```
/poteto-mode add a --json flag. text output stays byte-identical. verify both forms.
```

<a id="%22refactoring%22-pins-down-the-current-behavior-before-it-moves-the-structure"></a>


## "Refactoring" pins down the current behavior before it moves the structure

"Refactoring" is a <strong>Playbook that changes only structure and keeps behavior</strong>, through renames, extractions, removal of duplication, and code moves.

The main agent is responsible for the "contract", meaning the current behavior. The structure may change, but the current behavior does not.

The Playbook also allows a rebuild of the whole design, not only of the structure. In that case, the agent says explicitly that it is a rebuild and passes the work to "Feature".

<a id="procedure%3A-pin-down-behavior%2C-delete-unneeded-code-before-you-move-things%2C-and-verify-equivalence"></a>


### Procedure: pin down behavior, delete unneeded code before you move things, and verify equivalence

There are eight steps.

1. Pin down the behavior contract
2. Name the missing structure
3. Name the target shape
4. Delete before you add
5. Move in small steps
6. Prove with the real artifact that behavior has not changed
7. Check that the change is worth keeping
8. Rebase into small, ordered commits

The sections below look at each step in turn.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="126">
<li class="code-line" data-line="126">
<strong>Snapshot test.</strong> A test that saves the output to a file once and compares later runs against it to detect changes</li>
</ul>
</div></aside>

<a id="1.-pin-down-the-behavior-contract"></a>


#### 1. Pin down the behavior contract

Before you move the structure, write what guarantees the current behavior. Examples are characterization tests, snapshot tests, and a mechanism that compares old and new output. A characterization test records the current output as the correct answer. Type checks and lint that pass do not by themselves pin down behavior.

<a id="2.-name-the-missing-structure"></a>


#### 2. Name the missing structure

This step applies the principle "Model the Domain" ([Chapter 18](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e529e4)).

<a id="3.-name-the-target-shape"></a>


#### 3. Name the target shape

Decide how the modules split, what the data types are, and which functions call which. If the target shape crosses function boundaries, explore it with `/architect`.

<a id="4.-delete-before-you-add"></a>


#### 4. Delete before you add

Remove unneeded code before you bring in the new structure. For example, fold dead code and functions with only one caller, such as wrappers, into the caller. The principle "[Subtract Before You Add](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-subtract-before-you-add/SKILL.md)" sets this order.

<a id="5.-move-in-small-steps"></a>


#### 5. Move in small steps

Make one move at a time, and keep the tests and comparisons from step 1 passing. If you change the shape of an API, move every caller of the API to the new API and delete the old API in the same series of changes. The principle "[Migrate Callers Then Delete Legacy APIs](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md)" asks for this migration ([Chapter 18](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e529e4)).

<a id="6.-prove-with-the-real-artifact-that-behavior-has-not-changed"></a>


#### 6. Prove with the real artifact that behavior has not changed

A compile or build that passes does not by itself prove that behavior has not changed. The principle "[Prove It Works](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md)" sets this standard.

<a id="7.-check-that-the-change-is-worth-keeping"></a>


#### 7. Check that the change is worth keeping

If the diff does not lower the reader's load, revert it, as the principle "[Minimize Reader Load](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-minimize-reader-load/SKILL.md)" asks ([Chapter 17](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/97d863)).

<a id="8.-rebase-into-small%2C-ordered-commits"></a>


#### 8. Rebase into small, ordered commits

Commit in this order: the subtractive change that deletes code, the structural rebuild, then the follow-up cleanup. Then run "Opening a PR".

<a id="writing-the-request%3A-have-the-agent-record-the-current-output-before-it-moves-the-structure"></a>


### Writing the request: have the agent record the current output before it moves the structure

The bundled guide's example is the following.

```
/poteto-mode move parsing into one module, zero behavior change. record the current output first and prove it's unchanged after.
```

"record the current output first" maps to step 1, and "prove it's unchanged after" maps to step 6.

<a id="%22prototype%22-decides-a-design-at-low-cost-with-code-meant-to-be-thrown-away"></a>


## "Prototype" decides a design at low cost with code meant to be thrown away

"Prototype" is a Playbook that builds a throwaway prototype and <strong>makes design decisions from what it observes</strong>.

The main agent is responsible for the design decision, not the code. The production implementation happens in "Feature".

Because the code is meant to be thrown away, pstack describes "Prototype" as <strong>the only Playbook that reverses two things</strong>: the "smallest change" of the principle "Laziness Protocol", and the standard for verification.

It puts speed ahead of polish, does not care about code quality, and offers options nobody asked for. <strong>The standard for verification changes from proving that "the change is correct" to "observing what you want to decide"</strong>.

<a id="procedure%3A-make-clear-what-you-are-deciding%2C-then-build-prototypes-and-compare-them"></a>


### Procedure: make clear what you are deciding, then build prototypes and compare them

There are six steps.

1. Make clear what the prototype decides
2. If the direction is not settled yet, collect reference examples
3. Build in a scratch directory away from the production source
4. Make the alternatives switchable on the same screen for comparison
5. Run each option and compare
6. Present the alternatives, trade-offs, and a recommendation as the comparison result

The sections below look at each step in turn.

<a id="1.-make-clear-what-the-prototype-decides"></a>


#### 1. Make clear what the prototype decides

There are three things to decide: which layout to use, which way of interacting to use, and how densely to pack the screen elements. For choices where a run and an observation show which option is better, decide which behavior, which timing, or which method to use. If there is nothing to decide, do not build a prototype. Pass the work to "Feature".

<a id="2.-if-the-direction-is-not-settled-yet%2C-collect-reference-examples"></a>


#### 2. If the direction is not settled yet, collect reference examples

Show the user examples of similar features or screens, and have the user choose the look and interaction before you start building the prototype. If the direction is already settled, skip this step.

<a id="3.-build-in-a-scratch-directory-away-from-the-production-source"></a>


#### 3. Build in a scratch directory away from the production source

Do not bring in the production framework, tests, or abstractions. Prepare only the minimal code that answers the question.

<a id="4.-make-the-alternatives-switchable-on-the-same-screen-for-comparison"></a>


#### 4. Make the alternatives switchable on the same screen for comparison

Label each option and switch between them with a button or a key, as the principle "[Exhaust the Design Space](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-exhaust-the-design-space/SKILL.md)" asks ([Chapter 17](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/97d863)).

<a id="5.-run-each-option-and-compare"></a>


#### 5. Run each option and compare

Record screenshots for how a screen looks and measurements for processing time. This material lets you decide the question that step 1 made clear.

<a id="6.-present-the-alternatives%2C-trade-offs%2C-and-a-recommendation-as-the-comparison-result"></a>


#### 6. Present the alternatives, trade-offs, and a recommendation as the comparison result

Explain how the options differ and the pros and cons of adopting each, and state the recommended option. Once the option to adopt is decided, hand that direction to "Feature".

<a id="writing-the-request%3A-say-%22build-two-so-we-can-compare%22"></a>


### Writing the request: say "build two so we can compare"

The example in pstack's [README](https://github.com/cursor/plugins/blob/main/pstack/README.md) is the following.

```
/poteto-mode build two prototypes of the markdown renderer so we can compare. spawn an agent for each.
```

Phrases such as "make a mock" or "try this layout" are also <strong>signals for this Playbook</strong>.

<a id="%22visual-parity%22-treats-the-reference-appearance%2C-the-baseline%2C-as-the-spec-and-aims-for-a-zero-image-diff"></a>


## "Visual parity" treats the reference appearance, the baseline, as the spec and aims for a zero image diff

"Visual parity" is a <strong>Playbook that keeps the UI's appearance identical pixel for pixel</strong> when you make two implementations match or migrate a styling system.

It never touches the baseline, and it verifies identity with an image diff.

Pass or fail depends on whether the diff is zero, not on visual inspection. If the baseline itself looks wrong, though, the agent does not fix the baseline. It stops and asks the user, as step 2 says.

<a id="procedure%3A-iterate-per-component-until-the-image-diff-is-zero"></a>


### Procedure: iterate per component until the image diff is zero

There are five steps.

1. Create the reference, the baseline, before the migration
2. Forbid shortcuts that make the diff pass
3. Move components one at a time
4. Compare each component against the baseline with an image diff
5. Run "Opening a PR" per component, or per safe group of components

The sections below look at each step in turn.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="249">
<li class="code-line" data-line="249">
<strong>worktree.</strong> A Git feature that creates several working directories from one repository, so that you can work on separate branches at the same time</li>
</ul>
</div></aside>

<a id="1.-create-the-reference%2C-the-baseline%2C-before-the-migration"></a>


#### 1. Create the reference, the baseline, before the migration

Build a mechanism that automatically takes screenshots of each component before the migration in various states, such as normal, hover, and disabled. These screenshots are the reference that the agent compares the post-migration appearance against.

<a id="2.-forbid-shortcuts-that-make-the-diff-pass"></a>


#### 2. Forbid shortcuts that make the diff pass

Do not change the harness, the mechanism from step 1 that takes and compares the screenshots. Do not tamper with the baseline. Do not rearrange a component's structure to make the diff pass. If the baseline looks wrong, stop and ask the user.

<a id="3.-move-components-one-at-a-time"></a>


#### 3. Move components one at a time

Replace components one by one with the new implementation or styling method. Work in parallel in separate worktrees, and move the shared base components first.

<a id="4.-compare-each-component-against-the-baseline-with-an-image-diff"></a>


#### 4. Compare each component against the baseline with an image diff

Iterate with `/loop`, a built-in Cursor command that wakes the agent again and again ([Chapter 15](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/305f88)), until the diff is zero.

<a id="5.-run-%22opening-a-pr%22-per-component%2C-or-per-safe-group-of-components"></a>


#### 5. Run "Opening a PR" per component, or per safe group of components

<a id="writing-the-request%3A-name-the-baseline-with-%22the-second-image-is-correct%22"></a>


### Writing the request: name the baseline with "the second image is correct"

The README's example is the following.

```
/poteto-mode the row spacing is too tall when this flag is on. the second image is correct. repro and fix until it matches.
```

"the second image is correct" is the sentence that tells the agent <strong>which appearance is the baseline</strong>. Without it, the agent can only guess which one to match.

<a id="write-%22what-must-not-change%22-in-the-request"></a>


## Write "what must not change" in the request

Whichever of the four you ask for, <strong>write "what must not change" in the request</strong>.

<table class="code-line" data-line="284">
<thead class="code-line" data-line="284">
<tr class="code-line" data-line="284">
<th>What the request needs to say</th>
<th>Example wording</th>
<th>Routed to</th>
</tr>
</thead>
<tbody class="code-line" data-line="286">
<tr class="code-line" data-line="286">
<td>I want new behavior. Existing output must not change</td>
<td>"text output stays byte-identical"</td>
<td>"Feature"</td>
</tr>
<tr class="code-line" data-line="287">
<td>I want to tidy only the structure</td>
<td>"zero behavior change. record the current output first"</td>
<td>"Refactoring"</td>
</tr>
<tr class="code-line" data-line="288">
<td>I want to decide which design is better</td>
<td>"build two prototypes so we can compare"</td>
<td>"Prototype"</td>
</tr>
<tr class="code-line" data-line="289">
<td>I want the appearance to match exactly</td>
<td>"the second image is correct. fix until it matches"</td>
<td>"Visual parity"</td>
</tr>
</tbody>
</table>

The sentence you write in the request becomes the standard for verifying whether the work is done. For example, if you write "text output stays byte-identical", one finish condition is that the text output is byte-for-byte the same as before the change.

<a id="summary"></a>


## Summary

- <strong>How the four split.</strong> "Feature" is responsible for the design, "Refactoring" for the contract, "Prototype" for the design decision, and "Visual parity" for pixel-level identity.
- <strong>Feature.</strong> It decides the shape of the data, writes the throughput checkpoint, and always delegates the implementation to another agent.
- <strong>Refactoring.</strong> It pins down the current behavior with tests or similar means, deletes unneeded code before it moves structure, and proves with the real artifact that behavior has not changed.
- <strong>Prototype.</strong> It reverses the "smallest change" and the standard for verification. It builds options at low cost, compares them by observation, and hands the chosen direction to "Feature".
- <strong>Visual parity.</strong> It never touches the baseline and iterates per component until the image diff is zero.
- <strong>Writing the request.</strong> When you write "what must not change", that sentence becomes the check for whether the work is done.

The next chapter, [Chapter 13](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/3f7768), covers "[Authoring or modifying a skill](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md)", which writes Skills, and "[Eval](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md)", which verifies the effect of a change.
<!-- book-body:end -->

---

[Contents](README.md) · [Previous](15-chapter.md) · [Next](17-chapter.md) · [简体中文](../zh-CN/16-chapter.md)
