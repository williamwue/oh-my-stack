# Install Oh My Stack in Claude Code

[English](claude-code.md) | [简体中文](../zh-CN/install/claude-code.md)

Use Claude Code's plugin manager to install from this repository's marketplace.
The terminal commands below install at user scope.

## Install the plugin

Run in a terminal:

```bash
claude plugin marketplace add williamwue/oh-my-stack
claude plugin install oh-my-stack@oh-my-stack --scope user
claude plugin list --json
```

Expect the plugin list to contain `oh-my-stack@oh-my-stack` at user scope.
Check the actual installed version against the
[published release](https://github.com/williamwue/oh-my-stack/releases/latest).
If the plugin is already installed at another scope, inspect that installation
before creating a duplicate. Model configuration is a separate optional step.

## Invoke a Skill

Start a new Claude Code session in your project. In the conversation, type:

```text
/oh-my-stack:prove-it-works Check loading and workspace facts without changing files.
```

Expect a read-only report of the loaded Skill and current workspace.
Then follow [the first-task walkthrough](../getting-started.md).
Terminal commands beginning with `claude plugin` manage installation.
Commands beginning with `/oh-my-stack:` belong in the agent conversation.

Invoke `grill-me`, `grill-with-docs`, and `improve-codebase-architecture`
through their user slash commands. Claude Code rejects model Skill calls
for these explicit-only originals. That rejection does not mean installation
failed. [The AIHero guide](../aihero-original-skills.md) explains their entries.

## Update or remove

Follow [updates and removal](../guides/update-and-uninstall.md).
Read [the support policy](../support-policy.md) for acceptance boundaries.
The 0.9.0 original-workflow fixtures used a session plugin on Claude Code CLI;
they do not establish every persistent-install or future-update combination.

## Test a package for one session

For a temporary package check, the
[release process](../release-process.md#install-the-claude-code-plugin) also
provides `claude --plugin-dir`. That option loads a local package for the
session and does not create a persistent user installation.
