# FAQ and troubleshooting

[English](faq.md) | [简体中文](zh-CN/faq.md)

## The Skill is missing

1. Inspect the installed plugin using `codex plugin list` or `claude plugin list --json`.
2. Check the actual version and enabled state. Updating the source checkout does not update that installation.
3. Start a new session in your project.
4. In Codex, use the Skill picker. In Claude Code, use `/oh-my-stack:<entry>`.

Explicit-only entries may be absent from the model's automatic-use list while
remaining available to the user. Installation guides:
[Codex](install/codex.md), [Claude Code](install/claude-code.md), [OMP](install/omp.md).

## I typed the name but the Skill did not run

In Codex, ordinary text mentioning a Skill name is not proof of structured
Skill selection. Select the entry from the picker. For CLI integrations,
use structured Skill input supported by that integration.

In Claude Code, invoke explicit-only AIHero entries through their user slash
commands. Asking the model to call their Skill tool is rejected.

## Which entry should I choose?

Use `poteto-mode` for engineering execution, or `poteto-help` for a usage
question. Start AIHero originals directly when you want their process.
[Task examples](guides/common-tasks.md) explain the differences.

## Do I need model setup first?

Basic use can inherit the agent's model. Configure models when you want
per-role choices, review panels, or a reasoning budget. Setup needs a current
inventory and a supported way to select child models. See
[model configuration](model-configuration.md).

## Does this include every pstack or AIHero capability?

The [Skill directory](skill-directory.md) lists the entries in the package.
pstack-derived workflows have documented cross-tool adaptations.
Only the selected AIHero original skills are included. Their
[usage guide](aihero-original-skills.md) lists included and deferred entries.
A discovered entry does not establish full behavior parity across tools.

## Will a Skill modify my project?

It depends on your request and the entry. `prove-it-works` is read-only.
`grill-me` asks questions. `grill-with-docs` may write the glossary and decisions.
Feature and bug-fix requests authorize relevant code changes and checks.
Specify your constraints before starting. Publishing, merging, and deploying
require authorization for those actions.

## Why are there several model calls?

Some workflows use exploration, implementation, independent review, or
synthesis agents. Your provider's normal usage charges apply.
Panel size and model choice affect usage. Review the configured mapping and
scope the task if you need to control that usage.

## The architecture report did not open

Use the returned HTML file path. The 0.9.0 fixture generated a report, but
its OS opening command failed on the test machine. Styling and diagrams use
upstream CDNs. An offline file may have incomplete rendering.

## How do I report a problem?

Include the plugin version, tool version, platform, selected entry, prompt,
expected result, actual result, and redacted evidence. File a
[GitHub issue](https://github.com/williamwue/oh-my-stack/issues).
Keep credentials and private account logs out of the report.
Security reports follow [SECURITY.md](../SECURITY.md).

[Support policy](support-policy.md) · [Updates and removal](guides/update-and-uninstall.md)
