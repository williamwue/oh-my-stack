# Let an agent install Oh My Stack

[English](with-agent.md) | [简体中文](../zh-CN/install/with-agent.md)

Copy one prompt below into an agent conversation with terminal and network
access to the machine where you use the target tool. You can ask Codex to
install for Claude Code, or another agent to install for Codex; the prompt
names the target explicitly. A remote container installation does not establish
an installation on your computer.

## Install for Codex

```text
Install Oh My Stack for Codex on this machine using the latest published release from williamwue/oh-my-stack.

First read the repository's installation and update instructions:
https://github.com/williamwue/oh-my-stack/blob/main/docs/install/codex.md

1. Check this machine's OS, Codex version, plugin-manager commands, and existing Oh My Stack installation and marketplace source. Preserve other plugins, my model mappings, and project files.
2. Resolve the latest published release. For a new installation, prefer the stable Git marketplace documented in the guide and check its provenance and installed cache version. If stable lags, report the gap and use the verified same-release archive route. For archives, download the Codex plugin archive and SHA256SUMS into a persistent version-specific directory outside my project; verify before extraction and stop on checksum failure. Update an existing installation using its current source type; do not migrate silently.
3. Follow the documented native marketplace registration and plugin installation. For the archive route, keep the extracted marketplace directory, since registration refers to it. If already current, reuse it; if an update is needed, retain the old source for rollback and follow the guide for its actual installation type.
4. Check the native plugin list for the installed and enabled plugin and actual version. Compare it with the chosen release; report any mismatch rather than calling installation complete.
5. In a fresh Codex session in my project, explicitly select oh-my-stack:prove-it-works and request a read-only loading and workspace check if your tools support that. If you cannot start or operate that session, provide the exact picker selection and prompt for me, and mark the loading check as pending.
6. Report the release tag, installed version, persistent source path, integrity and installation results, loading-check result, and my next action.

If a required CLI, login, machine access, or supported command is missing, explain the specific blocker and minimum manual step. Keep existing model configuration; optional model setup comes after installation and a reviewed preview.
```

The guide provides the stable Git route and the released-archive fallback.
Codex supports Git and local marketplace registration through its CLI; the official
[plugin packaging documentation](https://developers.openai.com/plugins/build/plugins)
describes marketplace sources. The repository guide records the observed
native install route and tool limits. Use the installed CLI's help to check
commands before acting.

## Install for Claude Code

```text
Install Oh My Stack for Claude Code on this machine at user scope, using the latest published release from williamwue/oh-my-stack.

First read the repository's installation and update instructions:
https://github.com/williamwue/oh-my-stack/blob/main/docs/install/claude-code.md
https://github.com/williamwue/oh-my-stack/blob/main/docs/guides/update-and-uninstall.md

1. Check this machine's Claude Code version, plugin-manager commands, and existing Oh My Stack marketplace, plugin version, scope, and enabled state. Preserve other plugins, my model mappings, and project files. If an existing installation uses another scope, explain it and ask which scope to keep before creating a duplicate or changing scope.
2. Resolve the latest published release. Follow the documented marketplace and user-scope installation commands. If already current, reuse the installation; otherwise follow the update steps for the existing scope.
3. Check the native plugin list for the actual installed version and enabled state. Compare with the chosen published release. If the marketplace serves a different version, report the mismatch rather than treating it as a published-release installation.
4. In a fresh Claude Code session in my project, invoke /oh-my-stack:prove-it-works with a read-only loading and workspace request if your tools support it. If you cannot start or operate that session, give me the exact conversation command and mark this check as pending.
5. Report the release tag, installed version, installation scope, installation and loading-check results, and my next action.

If a required CLI, login, machine access, or supported command is missing, explain the specific blocker and minimum manual step. Keep existing model configuration; optional model setup comes after installation and a reviewed preview.
```

Claude Code's official [plugin installation documentation](https://code.claude.com/docs/en/discover-plugins)
explains marketplaces, installation scopes, and session loading. The
[OMS guide](claude-code.md) supplies this project's marketplace and commands.

## What happens after installation

Expect a short receipt naming the actual version, native installation status,
and loading-check result. Downloading files, registering a marketplace, and
loading a Skill are separate observations. If session loading is pending,
complete the supplied fresh-session action, then follow
[the first-task walkthrough](../getting-started.md).

Basic use needs no custom model mapping. For different worker or reviewer
models, use [optional model configuration](../model-configuration.md) after
installation; preview the available models and scope before applying changes.
AIHero project tracker setup is another separate, project-writing workflow;
see [the AIHero guide](../aihero-original-skills.md).

For OMP, use [its profile-gated guide](omp.md). These two prompts do not cover
OMP's isolated native installation gate.

Already installed? [Copy a check or update prompt](../guides/update-and-uninstall.md#let-an-agent-check-or-update).
