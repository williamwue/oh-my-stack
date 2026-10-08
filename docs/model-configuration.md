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

The Codex `pstack` recommendation uses GPT-6 Luna, GPT-6.1 Sol, and GPT-6
Astra. OMP's `pstack-openai-codex` alternative uses the same models with its
provider-qualified IDs. Presets are reviewed recommendations; observing a newer
model does not automatically replace a configured model. If a recommended ID is
unavailable, setup stops for an explicit observed choice instead of silently
falling back. Re-running model setup previews updated preset defaults while
preserving explicit model overrides, reasoning budgets, and panel order.

Claude Code has no static version-pinned pstack preset. Setup observes the
canonical models behind `sonnet` and `opus`; Haiku remains an optional choice.
Aliases can resolve to different versions by provider or local configuration.
The collector recognizes Opus, Sonnet, and Haiku 5.5 with configurable effort;
Haiku 4.5 has no native effort override. An unreviewed version stops collection
instead of inheriting an older family's capabilities. The observations consume
account usage and still require approval. Model availability and documented
effort support do not prove the account's effective effort or child execution.
For these current Anthropic API alias versions, Claude Code requires at least
2.1.280 for Opus 5.5, 2.1.284 for Sonnet 5.5, and 2.1.293 for Haiku 5.5.
Check the installed client before choosing Haiku; OMS does not upgrade the host.

These recommendations and capability policies were checked on 2026-10-08
against [OpenAI's model catalog](https://developers.openai.com/api/docs/models)
and [Claude Code's model configuration](https://code.claude.com/docs/en/model-config).

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
