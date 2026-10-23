---
name: poteto-help
description: "Answer setup and workflow questions with a usable prompt and verified source."
---

## Installed catalog

Read [the generated Skill catalog](../../SKILL_CATALOG.json) for this package.
Use the host's actual Skill picker or supported invocation syntax. Do not
assume typing a Skill name as plain text selected its structured input.
For setup and installation, read this package's setup Skill and the verified
operations documentation for the current host before giving exact commands.

Host adaptation. Read the installed package's [runtime binding](../../docs/runtime-binding.md) for delegation, tools, paths, transcript access, and control surfaces, and [model selection](../../docs/model-selection.md) for the named routes and ordered panels below. These bindings translate host calls; they add no workflow stages. Continue already authorized implementation through its checks. Advice-only requests end with advice. Publication, merge, deployment, billable requests, credential access, and user-scope configuration retain the host and project authorization gates. A workflow step naming one of these actions does not grant that authority. Source-host helpers under `scripts/` are reference-only unless the generated binding identifies supported execution for that exact helper; use the documented native helper only for the capability it supports. Report unavailable capabilities and verification separately.

# Poteto help

Answer the user's question about pstack, hand them a prompt they can send, and link the file the answer came from. For a help question, don't start the work. The user asked how, and a pstack run spends real tokens, so let them send the prompt.

A message that asks for work, such as "use pstack to fix this bug", is not a help question. Read [`poteto-mode`](../poteto-mode/SKILL.md), do the work under it, and mention the available host mode mechanism once when the generated runtime binding supports it.

Read the installed package README, SKILL_CATALOG.json, selected Skill invocation metadata from skill.json or the generated catalog, runtime binding, model-selection guide, and effective routing manifest before answering host questions. Those installed contracts take precedence over this map and upstream guide prose. Read the owning installed workflow before recommending it. Fixed official links below identify source provenance and do not establish current host behavior. The links here point into the installed plugin, which the user may not be able to open, so give the user the file's public copy: `https://github.com/cursor/plugins/blob/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/` followed by its path.

For a compact entry map, use **Skill navigation** in the installed runtime binding: start/setup, plan/design, build/fix, review/prove, deliver and resume. Principle leaves remain available in the principles group and full catalog. Read only the selected instructions needed for the task. This grouping organizes help; the host controls its native picker and invocation behavior.

## Find out what they need

Infer the need from the message and the conversation. A named situation, such as "which skill reviews a PR?", goes straight to its section. If the need is still unclear, ask one multiple-choice question with these options, then answer only the section they pick:

- Get set up
- Start a task with `/poteto-mode`
- Pick a skill for a situation
- Fix a run that went wrong
- Make pstack my own

Check the state that changes the answer, and mention it only when it does:

- For model and routing questions, identify the current runtime and package first. Read its model-selection guide and effective project or user manifest before deciding whether defaults, inherited choices, or overrides apply. Missing configuration does not prove Setup never ran.
- No `verify-*` skill or other app harness in the project means agents have no scripted way to drive the app. Mention `/create-verification-skill` when the question is about proving a change works.
- No formal verification skill in the project means no property is checked past what tests reach. Mention `/create-formal-verification-skill` when the question is about a race, an invariant, or another case tests rarely hit. When one exists and the code it covers changed after the commit it records as last in sync, mention `/maintain-formal-verification-skill` if the question touches that code.

When the effective configuration is missing and it changes the answer, explain the host's observed defaults and offer `/setup-oh-my-stack` within its existing scope. It matters when the user is new, the question is about setup or cost, or the answer depends on which models run. Ask at most once per chat. If the need is also unclear, ask both questions together. Offer two choices:

- Now: give them `/setup-oh-my-stack` to type, and answer their question too.
- Later: answer with the observed effective model resolution and label any unknown configuration. Do not infer defaults from a missing file alone.

## Get set up

1. Install Oh My Stack using the current host's package installation procedure in the package README. The pinned upstream guide describes source-host installation only.
2. Read [`/setup-oh-my-stack`](../setup-oh-my-stack/SKILL.md) and its host binding before invoking it. It maps observed models and supported options to roles within the selected configuration scope. Follow the current binding for loading changes and optional project verification skills.
3. Start a real task with `/poteto-mode`, a goal, and a check that can pass or fail.

Skill invocation follows the selected catalog and host binding. Setup is explicit in the current metadata. Automatic OMS routing requires the effective routing manifest and the enabled switch read by [OMS Auto](../oms-auto/SKILL.md). Missing, invalid, or unavailable routing configuration means manual mode. The [README](https://github.com/cursor/plugins/blob/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/README.md) and [guide page 1](https://github.com/cursor/plugins/blob/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/docs/guide/01-setup.md) have the details. Offer to word their first prompt with them, per [`references/prompting.md`](references/prompting.md).

If cost is the worry, say where the tokens go and how to spend fewer. pstack spends extra tokens on subagents and review panels. Rerun `/setup-oh-my-stack` and pick a smaller budget or cheaper models. A role set to `auto` or `inherit-parent` runs on the chat's model, which saves tokens when the chat runs on Auto or a cheaper model. A shorter panel list runs fewer subagents, one for each entry. Save `/poteto-mode` for work that needs rigor.

Use the installed host package for installation and command-prefix conventions. The [official source-host harness documentation](https://github.com/cursor/plugins/blob/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/docs/harness/claude-code.md) describes its additional harness. Host bindings map source names; disclose unavailable source-only features rather than claiming they ran.

The Skills use the agent skills format. Delegation, persistence, scheduling, and model options depend on the installed runtime binding. Disclose an unavailable capability and its workflow fallback rather than inferring support from the source host.

## Start a task with `/poteto-mode`

`/poteto-mode` matches the task to a playbook, copies the playbook's steps into the todo list, and runs the other skills as the steps need them. A step it skips stays in the list as `skip: <reason>`. A good prompt states the goal and how to tell it's done. It doesn't list skills, because a hand-written sequence tends to drop or reorder steps the playbook would keep. Read [`references/prompting.md`](references/prompting.md) before you help word one. [Guide page 2](https://github.com/cursor/plugins/blob/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/docs/guide/02-poteto-mode.md) has examples.

Skill persistence depends on the current host's supported invocation and context mechanism. Use the installed binding and actual Skill picker. Reinvoke the owning workflow for a new task when needed. Do not infer the cause of context loss from a source-host keyboard shortcut. Fixed source-host documentation is provenance only. Mid-chat, "new task" requests a fresh playbook. Delegates use the role and lifecycle declared by the installed runtime binding.

## Pick a skill

The default answer is `/poteto-mode`, which runs most of the others when its steps need them. Name a skill directly when the user wants more or less of something than the playbook gives. Read the skill before you recommend it, and give one example prompt.

| The user wants to | Skill |
|---|---|
| Do any non-trivial task with rigor | [`/poteto-mode`](../poteto-mode/SKILL.md) |
| Check that the agent understood their goal and the problem before it starts | [`/in-your-own-words`](../in-your-own-words/SKILL.md) |
| Get a prompt rewritten deeper, not bigger, before sending it: what a top professional would add, their raw material and methods, and an outside check. It returns the prompt and doesn't do the task | [`/sharpen`](../sharpen/SKILL.md) |
| Know how code works now, or where new code should live | [`/how`](../how/SKILL.md) |
| Know why code is shaped this way, or where a number came from | [`/why`](../why/SKILL.md) |
| Understand a change or subsystem, explained plainly | [`/teach`](../teach/SKILL.md) |
| Catch up on their own recent work on a topic | [`/recall`](../recall/SKILL.md) |
| Catch up on what changed in this chat since their last message, in plain words and small visuals, with every item waiting on them listed and decidable from the reply alone | [`/ketchup`](../ketchup/SKILL.md) |
| Know what a small diff could break outside itself | [`/blast-radius`](../blast-radius/SKILL.md) |
| Settle types and module shape before code that crosses a function boundary | [`/architect`](../architect/SKILL.md) |
| Get several attempts at one brief, merged into the best one | [`/arena`](../arena/SKILL.md) |
| Run parallel checks over slices, or race workers, as cloud agents | [`/swarm`](../swarm/SKILL.md) |
| Have different models review a diff and try to break it | [`/interrogate`](../interrogate/SKILL.md) |
| Fix a bug test-first when a cheap local test exists | [`/tdd`](../tdd/SKILL.md) |
| Apply TypeScript rules to `.ts` or `.tsx` work | [`/typescript-best-practices`](../typescript-best-practices/SKILL.md) |
| Strip comments before review, using a reviewer that didn't write them | [`/no-comments`](../no-comments/SKILL.md) |
| Clean AI tells out of prose | [`/unslop`](../unslop/SKILL.md) |
| Write docs, an RFC, a README, a PR description, or a commit message to a standard | [`/technical-writing`](../technical-writing/SKILL.md) |
| Hear the last reply again in plain words | [`/bro`](../bro/SKILL.md) |
| Give agents a scripted way to drive the app and prove behavior | [`/create-verification-skill`](../create-verification-skill/SKILL.md) |
| Bring a verification skill and its feature map back in line with the app | [`/maintain-verification-skill`](../maintain-verification-skill/SKILL.md) |
| Formally verify a race, invariant, or other property that tests rarely reach | [`/create-formal-verification-skill`](../create-formal-verification-skill/SKILL.md) |
| Bring a formal verification back in line after the code it covers changed, and learn whether a failure is drift or a bug | [`/maintain-formal-verification-skill`](../maintain-formal-verification-skill/SKILL.md) |
| Show a PM or designer what the user sees as a chart checked by a model, with each bug drawn as a numbered path, turn an agreed chart into a TLA+ skeleton, or audit the code against its TLA+ spec | [`/statechart`](../statechart/SKILL.md) |
| Vet a performance number before reporting or acting on it | [`/benchmark-checklist`](../benchmark-checklist/SKILL.md) |
| Run a large or cross-cutting change, or one to review after stepping away | [`/figure-it-out`](../figure-it-out/SKILL.md) |
| Keep a decision log during a run, and review it afterward | [`/show-me-your-work`](../show-me-your-work/SKILL.md) |
| Pick a model for each role and a reasoning budget | [`/setup-oh-my-stack`](../setup-oh-my-stack/SKILL.md) |
| Turn their own working habits into a personal mode skill | [`/automate-me`](../automate-me/SKILL.md) |
| Turn what a finished task taught into skill edits | [`/reflect`](../reflect/SKILL.md) |
| Stop agents from repeating the same mistakes in this repo | [`/correct`](../correct/SKILL.md) |
| Build a page whose buttons wake a Grok Bot over a webhook | [`/make-bot-ui`](../make-bot-ui/SKILL.md) |
| Find their way around pstack | `/poteto-help` |

If a skill directory next to this one is missing from the table, read its frontmatter and route by its description. The `principle-*` directories are covered under principles below.

Close calls:

- `/how` explains what the code does. `/why` explains the reasons. `/teach` runs one or both and explains the result plainly.
- `/arena` gives every worker the same brief and merges the best parts. `/swarm` splits work into slices or a race and returns one report.
- `/architect` implements right after it settles the design when implementation is authorized. Advice-only requests stop at the sketch. Add "with checkpoint" to review the design before it writes code.
- `/interrogate` reviews the diff. `/blast-radius` looks for breakage outside the diff and proves the one fact that makes the change safe.
- `/recall` rebuilds context across recent chats. `/ketchup` covers only this chat since the user's last message. Resuming one specific chat or branch is the Session pickup playbook.
- `/figure-it-out` designs one rigorous run. The Orchestrate playbook runs a program that spans days and many PRs. The Autonomous run playbook drives one task to a finish condition.

Not in pstack:

- `/deslop`, `control-cli`, and `control-ui` ship in the `cursor-team-kit` plugin.
- `/loop` and `/create-skill` are the source host built-ins.
- The canonical Orchestrate workflow is a Poteto Mode playbook. The installed catalog may also promote it as an explicit Skill. Check the selected entry before attributing it to another package.

## Playbooks and principles

Canonical playbooks are step lists inside `/poteto-mode`. The installed catalog also identifies any promoted explicit Skill entries and their invocation. Inside Poteto Mode, these task phrases select the owning playbook:

- "babysit this pr" or "check on pr 123" runs Babysit. It drives the PR to merge-ready and stops there. It doesn't merge unless the user asks to merge, land, or ship.
- "land the stack" runs Shipping.
- "take over this branch" runs Session pickup.
- "pause safely" runs Pause safely.
- "full autopilot on this queue" runs Autopilot-full. "stack them, don't ship" runs Autopilot-stack.
- "run the eval playbook" runs Eval.

Without `/poteto-mode`, a phrase such as "babysit this pr" can start the source host's own skill for the same job instead. The Playbooks section of [`poteto-mode`](../poteto-mode/SKILL.md) lists every playbook and when it applies. [Guide page 6](https://github.com/cursor/plugins/blob/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/docs/guide/06-verify-and-ship.md) covers opening, babysitting, and landing a PR.

pstack has no planning skill. the source host's Plan Mode works alongside it. For work that spans phases or stacked PRs, asking `/poteto-mode` for a plan runs the [Multi-phase plan playbook](../poteto-mode/playbooks/multi-phase-plan.md), which writes the plan and doesn't implement it. For a design question, the Prototype playbook or `/architect` settles it in code first.

Principles are one-rule skills that `/poteto-mode` reads and cites in its replies. The user rarely invokes one. They steer with the names instead, as in "apply prove it works. show me the real output." Typing `/principle-<name>` still loads one on demand. [Guide page 8](https://github.com/cursor/plugins/blob/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/docs/guide/08-principles.md) lists them.

## Fix a run that went wrong

| Symptom | Fix |
|---|---|
| The mode stopped applying after a few turns | Inspect the selected Skill invocation, host context behavior, and effective routing switch. Reinvoke the installed workflow when needed. |
| A question got treated as the next step of the last task | Say "new task", or say the turn doesn't need the mode. |
| A new model choice had no effect | Read the current model-selection guide and effective project or user manifest, then apply the host's documented refresh mechanism. |
| Runs cost more than expected | See the cost paragraph under Get set up. |
| A skill didn't load on its own | Check the installed catalog invocation field, actual Skill selection, and enabled routing manifest. Explicit entries need supported invocation. OMS Auto requires its separate switch preflight. |
| Parallel agents overwrote each other | Give each agent its own worktree, or run them as cloud agents, which each get their own machine. |
| An overnight run moved but finished nothing | `/loop` needs a check that can pass or fail, not a duration. See [guide page 7](https://github.com/cursor/plugins/blob/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/docs/guide/07-overnight.md). |
| The reply claims success from a green build | Ask for the real command, flow, stored value, or profile. That's the prove-it-works principle. |

For a run that drifts, [`references/prompting.md`](references/prompting.md) has one-line steers. [Guide page 10](https://github.com/cursor/plugins/blob/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/docs/guide/10-recipes-and-pitfalls.md) has more pitfalls and the recipes worth copying.

## Make pstack my own

- [`/automate-me`](../automate-me/SKILL.md) drafts a personal mode skill from the user's own history, to use alongside `/poteto-mode`.
- [`/reflect`](../reflect/SKILL.md) after a session turns its lessons into skill edits the user approves.
- `/poteto-mode write a skill for <workflow>` runs the authoring playbook. The eval playbook tests a skill change blind.
- Fix a misbehaving skill in its own PR, not inside the feature work where it went wrong.

[Guide page 9](https://github.com/cursor/plugins/blob/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/docs/guide/09-make-it-yours.md) covers each of these.

## Reply

Lead with the answer. Give at most one example prompt in a code block, adapted from [`references/recipes.md`](references/recipes.md) when one fits, then the link to that file. Keep it short unless the user asked for the whole map.
