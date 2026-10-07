# Complete your first task

[English](getting-started.md) | [简体中文](zh-CN/getting-started.md)

Use this walkthrough to confirm that Oh My Stack loads, then obtain a
file-backed explanation of your project without editing it.

## 1. Install for your tool

Follow the [Codex](install/codex.md) or [Claude Code](install/claude-code.md)
guide. For OMP, use its [profile installation guide](install/omp.md).
Open your project and start a new agent session after installation.

Prefer a copyable prompt? [Let an agent install it](install/with-agent.md).

Model configuration is optional for this walkthrough. Your agent keeps its
model when no Oh My Stack mapping is configured.

## 2. Confirm that the Skill loads

In Codex, type `$` and select `oh-my-stack:prove-it-works` from the picker.
Send this request with the selection:

```text
Verify Skill loading and the current workspace. Read only; do not change files.
```

In Claude Code, send:

```text
/oh-my-stack:prove-it-works Verify Skill loading and the current workspace. Read only; do not change files.
```

Expect a report naming the loaded Skill, workspace path, whether the workspace
is in a version-control repository, and the evidence used. Unknown facts must
remain unknown. This check does not install dependencies or edit configuration.

If the entry is missing, follow [the installation troubleshooting steps](faq.md#the-skill-is-missing).

## 3. Ask for a code explanation

In Codex, select `oh-my-stack:poteto-mode` and send:

```text
Explain this project's main modules and request entry points.
Trace one representative path using actual files.
Read only; do not modify files, install dependencies, or run services.
If there is no request entry point, say so.
```

In Claude Code, enter:

```text
/oh-my-stack:poteto-mode Explain this project's main modules and request entry points. Trace one representative path using actual files. Read only; do not modify files, install dependencies, or run services. If there is no request entry point, say so.
```

Expect the agent to select an investigation workflow, inspect code, and explain
a path with file references. It must distinguish observed behavior from
inference. Check one cited file yourself. Project files should remain unchanged.
If the project is in Git, compare `git status --short` before and after the task.
Existing uncommitted changes are not evidence that this task changed them.

## 4. Start your own task

Choose an example from [common tasks](guides/common-tasks.md).
Give the agent your goal, how you will check the result, and constraints on
file changes or external actions.

For a requirement that needs discussion, invoke `grill-with-docs` directly.
It asks questions and records agreed terms and decisions. It does not
implement the feature. Keep implementation as a separate request after you
review those decisions.

Use `poteto-help` when you need an explanation or a suggested prompt.
A help request does not start the described workflow.

## Continue when you need more control

- [AIHero original skills](aihero-original-skills.md)
- [Optional model configuration](model-configuration.md)
- [Complete Skill directory](skill-directory.md)
- [FAQ](faq.md)
