# Choose models for roles and review panels

[English](model-configuration.md) | [简体中文](zh-CN/model-configuration.md)

Use model configuration when you want different models or reasoning budgets
for implementation, exploration, or review. Installation does not create this
mapping. Without a mapping, workflows inherit the agent's model where the
workflow permits it.

## Preview a mapping

Select `oh-my-stack:setup-oh-my-stack` in Codex, or invoke
`/oh-my-stack:setup-oh-my-stack` in Claude Code, with this request:

```text
Inspect the models and delegation options available in this tool.
Preview a mapping for code work and review panels.
Explain the reasoning budget, panel size, and any usage-consuming probes.
Do not apply configuration or run paid probes until I approve those steps.
```

The Skill observes the current tool rather than guessing model names from a
menu or another account. A model inventory alone does not prove that a child
agent can select that model. If the required observation or delegation option
is unavailable, setup must report the gap before writing a mapping.

## Review and apply

Review the proposed models, reasoning efforts, number of workers, and setup
scope. Project configuration takes precedence over user defaults where
supported. Ask the Skill to apply the exact reviewed mapping when you want it.

Configuration and plugin versions are separate. An upgrade preserves your
mapping; removing the plugin does not delete user-owned setup files.
AIHero originals retain their original delegation instructions and do not
receive injected OMS model routing.

The [setup Skill](../packages/codex/skills/setup-oh-my-stack/SKILL.md) provides
the procedure. The [release process](release-process.md) and
[historical setup records](maintainers/readme-0.9.0.md#development) contain
implementation details.
