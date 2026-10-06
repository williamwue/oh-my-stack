# Oh My Stack

![Oh My Stack — portable, verifiable engineering workflows for Codex, Claude Code, and OMP](assets/social/oh-my-stack-social-preview-2026-10-07.png)

[English](README.md) | [简体中文](README.zh-CN.md)

Engineering workflows for Codex and Claude Code, based on pstack and including
selected original AIHero skills from Matt Pocock.

Describe a task, clarify a requirement, review a change, or inspect a module's
design. Oh My Stack gives your agent a workflow and asks it to show evidence
for the result.

[Get started](docs/getting-started.md) · [Choose a task](docs/guides/common-tasks.md) ·
[Documentation](docs/README.md)

## Install

Choose the tool you use. Each tool needs its own installation.

| Your tool | Start here |
| --- | --- |
| Codex | [Install the released Codex plugin](docs/install/codex.md) |
| Claude Code | Use the terminal commands below, then [start your first task](docs/getting-started.md). |
| OMP | [Install with the OMP profile checks](docs/install/omp.md). Live acceptance differs by workflow. |

For Claude Code, run these commands in your terminal:

```bash
claude plugin marketplace add williamwue/oh-my-stack
claude plugin install oh-my-stack@oh-my-stack --scope user
```

Start a new session after installation. The
[Claude Code installation guide](docs/install/claude-code.md) also covers
verification, updates, and removal.

The Codex guide uses the published plugin archive. You do not need to build
the project to use that archive. Check the [support policy](docs/support-policy.md)
for tested tools and current limitations.

## Quick start

First, open your project in a new agent session and select `prove-it-works`.
It checks Skill loading and workspace facts without changing project files.

Then try a read-only task through `poteto-mode`.

In Codex, type `$` and select `oh-my-stack:poteto-mode` from the Skill picker.
Send this request with that selection:

```text
Explain this project's main modules and request entry points.
Use actual file references. Read only; do not change files.
```

In Claude Code, enter this in the conversation:

```text
/oh-my-stack:poteto-mode Explain this project's main modules and request entry points. Use actual file references. Read only; do not change files.
```

Look for a code explanation with file references. The agent must report gaps
it cannot verify. Follow the [first-task walkthrough](docs/getting-started.md)
for installation checks, expected results, and troubleshooting.

## Choose an entry for your task

| What you want to do | Entry | What to expect |
| --- | --- | --- |
| Fix a bug, build a feature, or let the agent choose an engineering workflow | `poteto-mode` | A workflow matched to your request, work within your stated scope, and verification. |
| Clarify a requirement and record agreed terminology and decisions | `grill-with-docs` | Question rounds, glossary updates, and architectural decision records when needed. |
| Stress-test an idea through conversation | `grill-me` | Questions and recommendations, followed by a pause for your answers. |
| Review a change | `interrogate` | Independent reviews of a fixed change and a root-owned judgment. |
| Find modules worth improving | `improve-codebase-architecture` | An architecture report and a choice of candidates before implementation. |
| Ask how to use the tool | `poteto-help` | An explanation and a suggested prompt. It does not start that task. |

Select `oh-my-stack:<entry>` in Codex, or type `/oh-my-stack:<entry>` in
Claude Code. [Common task examples](docs/guides/common-tasks.md) give you
prompts and describe their expected file changes.

`poteto-mode` routes the pstack-derived engineering workflows. Invoke AIHero
originals directly when you want them. There is no automatic AIHero-to-pstack
pipeline. The [AIHero guide](docs/aihero-original-skills.md) explains the
selected originals and their dependencies.

Basic use inherits the agent's model when no Oh My Stack mapping is configured.
Use [optional model configuration](docs/model-configuration.md) to choose models
and reasoning budgets for roles and review panels.

## More documentation

- [First task](docs/getting-started.md)
- [Complete Skill directory](docs/skill-directory.md)
- [Updates and removal](docs/guides/update-and-uninstall.md)
- [FAQ and troubleshooting](docs/faq.md)
- [Support policy](docs/support-policy.md)
- [Latest release](https://github.com/williamwue/oh-my-stack/releases/latest)

## Development

To contribute, read [CONTRIBUTING.md](CONTRIBUTING.md). It links the build,
architecture, testing, and release documentation.
The [previous README](docs/maintainers/readme-0.9.0.md) retains the historical
implementation and acceptance narrative.

## Reading

[kaito's pstack book](docs/books/pstack/README.md) is available in English and
Simplified Chinese. Its guide and OMS companion provide additional background.

## Attribution

pstack-derived workflows include cross-tool adaptations. Selected AIHero skills
retain their pinned original content. See [third-party notices](THIRD_PARTY_NOTICES.md)
for sources, changes, and licensing. Oh My Stack uses the [MIT license](LICENSE).
