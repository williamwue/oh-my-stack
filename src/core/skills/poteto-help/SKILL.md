---
name: poteto-help
description: Answer Oh My Stack setup and workflow questions with verified sources and one usable prompt; route explicit work requests through poteto-mode.
---

# Poteto help

Answer questions about Oh My Stack without starting the workflow they ask
about. Read the owning Skill before recommending it. Return the answer, at most
one usable prompt, and the actual source. A help turn never authorizes setup,
model probes, delegation, installation, or edits. An explicit request to do the
work routes to [poteto-mode](../poteto-mode/SKILL.md) within its stated scope.

## Read the current map

Use the package's generated Skill catalog as the single list of admitted
entries. Read relevant Skill frontmatter and then its full procedure. If the
catalog cannot be read, inspect installed entries and disclose incomplete
coverage. Never invent an entry, slash command, model entitlement, or capability.
The owning file wins over this help text. Workflow and principle entries are
both directly invocable, but their native invocation syntax comes from the host.

Infer the need from the question and context. Ask one concise question only
when the need remains ambiguous: setup, starting a task, picking a workflow,
fixing a run, or personalizing it. A named situation goes straight to its source.

## Help the user act

- Setup: read [setup-oh-my-stack](../setup-oh-my-stack/SKILL.md). Check the
  selected project or user resolution when it matters. Missing configuration
  means routing is unconfigured, not that account entitlement is known. Explain
  token costs and panel size from verified configuration, without probing models.
- Start a task: read [poteto-mode](../poteto-mode/SKILL.md). A goal, a done check,
  relevant evidence, and constraints are enough. Read
  [prompting](references/prompting.md) before writing the prompt.
- Pick a workflow: use the current catalog and the owning procedure. Explain
  only distinctions needed by the question, such as help versus execution,
  [correct](../correct/SKILL.md) versus [reflect](../reflect/SKILL.md), or a
  [benchmark check](../benchmark-checklist/SKILL.md) versus a
  [performance fix](../perf-issue/SKILL.md).
- Fix a run: check the actual installation, selected configuration, task scope,
  writer isolation, and available control harness. A green build alone does not
  prove the user path. Do not promise persistent modes, scheduled wakes, or
  writable child sessions when the host has not verified them.
- Personalize: read [automate-me](../automate-me/SKILL.md),
  [reflect](../reflect/SKILL.md), or
  [authoring-a-skill](../authoring-a-skill/SKILL.md). Their authority boundaries
  still apply.

## Give a source the user can check

Prefer the owning installed file with a usable local path. For public links,
use the package's recorded source repository and immutable revision when known.
Link a public copy only when the file exists there. An unpublished candidate
may have no public copy: link its local file and say that instead of fabricating
an upstream link. Do not link a source-host implementation as though it were
the installed portable workflow.

Lead with the answer and one next prompt adapted from
[recipes](references/recipes.md). Respect the user's question and do not run
that prompt on their behalf during a help turn.
