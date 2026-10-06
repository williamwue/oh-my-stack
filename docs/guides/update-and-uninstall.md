# Update or remove Oh My Stack

[English](update-and-uninstall.md) | [简体中文](../zh-CN/guides/update-and-uninstall.md)

Choose the installation you actually use. Updating source files does not
update an installed plugin. Retain the previous release files for rollback.

## Codex

Follow [the Codex update steps](../install/codex.md#update-the-plugin).
An extracted local marketplace needs registration of the new extracted source.
The Git-marketplace upgrade command is not the update method for that source.

To remove the plugin and its marketplace registration, run in a terminal:

```bash
codex plugin remove oh-my-stack@oh-my-stack
codex plugin marketplace remove oh-my-stack
```

The manager may retain cached files. User-owned model configuration remains.
Start a new session after changing the installation.

## Claude Code

Update the marketplace and the user-scope plugin in a terminal:

```bash
claude plugin marketplace update oh-my-stack
claude plugin update oh-my-stack@oh-my-stack --scope user
claude plugin list --json
```

To remove that installation:

```bash
claude plugin uninstall oh-my-stack@oh-my-stack --scope user
claude plugin marketplace remove oh-my-stack
```

If your plugin is installed at another scope, use that scope. Cached files and
user-owned model configuration may remain. Start a new session after updating.

## OMP

Use [the OMP guide](../install/omp.md) and inspect the existing plugin link
before replacing it. Keep the old versioned package directory.
The [release process](../release-process.md) covers integrity verification and
owned-directory rollback. Its generic installer does not change native plugin
registration or model mappings.
