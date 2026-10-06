# Install Oh My Stack in Codex

[English](codex.md) | [简体中文](../zh-CN/install/codex.md)

Use the published Codex plugin archive. The commands below use a macOS shell
and the Codex CLI plugin manager. No source build or Node.js installation is
required for this method. See [tested tools and limits](../support-policy.md).

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

## Register and install

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
The native manager update from 0.8.0 to 0.9.0 was observed separately from
archive checks. Future versions and other tool versions need their own checks.
A Git-marketplace upgrade command does not update this extracted local source.
Model configuration remains separate from the installed plugin.

To restore the previous version, register the retained old marketplace folder
and install `oh-my-stack@oh-my-stack` again. Check the actual installed version.
Configuration written by a newer version may need separate review before a downgrade.

[Remove the installation](../guides/update-and-uninstall.md) ·
[FAQ](../faq.md) · [Support policy](../support-policy.md)
