# Install Oh My Stack in Codex

[English](codex.md) | [简体中文](../zh-CN/install/codex.md)

Use the stable Git marketplace for new installations. The released archive
route below remains available. These commands use the Codex CLI plugin manager;
neither route requires a source build or Node.js installation. See [tested tools and limits](../support-policy.md).

[Install with an agent](with-agent.md#install-for-codex) if you prefer a copyable prompt.

## Install from the stable Git marketplace

```bash
codex plugin marketplace add williamwue/oh-my-stack --ref stable
codex plugin add oh-my-stack@oh-my-stack
codex plugin list --json
```

The `stable` branch contains verified published release payloads rather than
unreleased source. Its `STABLE_RELEASE.json` names the tag, source commit,
release asset hashes, and packaged file hashes. Check the installed version
against the [published release](https://github.com/williamwue/oh-my-stack/releases/latest).
The maintainer [promotion process](../release-process.md#stable-git-marketplace)
requires a clean tagged rebuild, asset verification, and successful source CI.
If promotion lags a release, report that gap and use the verified archive route
when the requested version is needed immediately.

Already registered `oh-my-stack`? Inspect its source first. Use
[the update guide](../guides/update-and-uninstall.md) for an existing installation;
source migration is explicit, and does not discard old extracted release files.

## Download and verify one release

1. Create a new folder for the version you are installing.
2. From one [published release](https://github.com/williamwue/oh-my-stack/releases/latest), download `oh-my-stack-codex-plugin-<version>.tar.gz` and `SHA256SUMS` into that folder.
3. Open a terminal in that folder. Keep exactly one Codex plugin archive there.

On macOS, verify the downloaded files:

```bash
shasum -a 256 --ignore-missing -c SHA256SUMS
```

Expect an `OK` line for the Codex plugin archive. Missing files for other tools
are skipped. On Linux, use `sha256sum --ignore-missing -c SHA256SUMS` instead.
If the archive checksum fails, stop before extraction. Use the checksum file
from the same release, downloaded from the trusted repository.

## Register and install the archive

From that folder, run:

```bash
tar -xzf oh-my-stack-codex-plugin-*.tar.gz
codex plugin marketplace add "$PWD/oh-my-stack-marketplace"
codex plugin add oh-my-stack@oh-my-stack
codex plugin list
```

Expect `oh-my-stack@oh-my-stack` to be installed and enabled at the version
you downloaded. Keep the extracted marketplace folder in place. Codex's
marketplace registration refers to it.

## Select a Skill

Start a new Codex session in your project. Type `$` and select
`oh-my-stack:prove-it-works` from the Skill picker. Ask it to check loading
and workspace facts without changing files.

Then follow [the first-task walkthrough](../getting-started.md).
Selecting a Skill is different from mentioning its name as ordinary text.
For CLI integrations, structured Skill input is the verified explicit entry.
The [FAQ](../faq.md) covers missing entries and unexpected invocation.

## Update the plugin

For stable Git, use [the native update commands](../guides/update-and-uninstall.md#codex).
The following steps update an extracted local archive source.

Download and verify the new release in another version-specific folder.
Extract its Codex plugin archive. Keep the old folder for rollback.

From the new folder, replace only the Oh My Stack marketplace registration:

```bash
codex plugin marketplace remove oh-my-stack
codex plugin marketplace add "$PWD/oh-my-stack-marketplace"
codex plugin add oh-my-stack@oh-my-stack
codex plugin list
```

Check the reported installed version, then start a new session.
Native 0.9.0 to 0.9.1 Git update and local-source migration are recorded in
[dated acceptance](../acceptance/2026-10-07/stable-marketplace.md). Future versions
and other tool versions need their own checks.
A Git-marketplace upgrade command does not update this extracted local source.
Model configuration remains separate from the installed plugin.

To restore the previous version, register the retained old marketplace folder
and install `oh-my-stack@oh-my-stack` again. Check the actual installed version.
Configuration written by a newer version may need separate review before a downgrade.

[Remove the installation](../guides/update-and-uninstall.md) ·
[FAQ](../faq.md) · [Support policy](../support-policy.md)
