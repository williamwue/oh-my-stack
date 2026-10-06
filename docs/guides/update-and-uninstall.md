# Update or remove Oh My Stack

[English](update-and-uninstall.md) | [简体中文](../zh-CN/guides/update-and-uninstall.md)

Use the source and scope of your existing installation. Keep model mappings,
other plugins, project files, and the previous release files. No OMS background
updater is required. Start a new session after updating.

## Let an agent check or update

A check and an update are different requests. Copy this for a read-only check:

```text
Check whether Oh My Stack has an update for my existing Codex and/or Claude Code installation on this machine. Do not update, refresh marketplaces, install, remove, or edit configuration. Read the native plugin lists, registered sources, installation scopes, and installed cache metadata. Compare each actual installed version with the latest published stable release at https://github.com/williamwue/oh-my-stack/releases/latest. Report current and available versions, source, scope, and the update method; distinguish the installed version from the version loaded in this conversation.
```

To update Codex, copy:

```text
Update my existing Oh My Stack installation for Codex on this machine to the latest published stable release from williamwue/oh-my-stack.
Read https://github.com/williamwue/oh-my-stack/blob/main/docs/guides/update-and-uninstall.md and docs/install/codex.md first.
Inspect Codex CLI help, the registered OMS marketplace source, enabled state, actual installed version, and cache metadata. Preserve other plugins, model mappings, project files, and old release files.
For the official stable Git source, upgrade only the oh-my-stack marketplace, then run plugin add for oh-my-stack@oh-my-stack. For an extracted local source, download the new Codex plugin archive and SHA256SUMS from the same published release into a new persistent version directory, verify the archive before extraction, and replace only the OMS marketplace registration. Do not run Git marketplace upgrade on an extracted local source. Keep the current source type; do not migrate it silently.
If already current, report that and verify it without reinstalling. If the source is custom, pinned, or ambiguous, explain it before changing the source. Stop on integrity or version mismatch and retain the rollback source.
Verify the actual installed and enabled plugin and the version of its installed GENERATION.json and plugin manifest. In a fresh Codex session, select oh-my-stack:prove-it-works for a read-only loading and workspace check if you can operate it; otherwise give me that exact next action and mark session loading as pending.
Report old and new versions, source, integrity and installation results, loading result, and rollback steps. This request authorizes the normal update; do not ask again merely because an older version exists.
```

To update Claude Code, copy:

```text
Update my existing Oh My Stack installation for Claude Code on this machine to the latest published stable release from williamwue/oh-my-stack.
Read https://github.com/williamwue/oh-my-stack/blob/main/docs/guides/update-and-uninstall.md first.
Inspect CLI help, registered OMS marketplace source, installed version, scope, enabled state, and installed cache metadata. Preserve the existing scope, other plugins, model mappings, project files, and rollback files. Do not create a second installation or enable auto-update without my request.
For the registered official Git marketplace, refresh only oh-my-stack, then update oh-my-stack@oh-my-stack using its existing scope. For a local marketplace, verify the new same-release Claude plugin archive and checksum before extraction and replace only its OMS source. Keep the current source type; do not silently switch a custom or pinned source.
If already current, verify without reinstalling. Stop on integrity or version mismatch. Check the installed GENERATION.json and plugin manifest, not only a marketplace listing. In a fresh Claude Code session, run /oh-my-stack:prove-it-works with a read-only loading and workspace request if possible; otherwise supply that exact next action and mark loading as pending.
Report old and new versions, source, scope, integrity and installation results, loading result, and rollback steps. This request authorizes the normal update; do not ask again merely because an older version exists.
```

These prompts require terminal and network access to the computer where the
plugin is installed. An update in a remote container does not update your
computer. If both tools are installed, update and verify them separately.

## Codex

First inspect the registration and installation:

```bash
codex plugin marketplace list
codex plugin list --json
```

For the official Git source registered with `--ref stable`, run:

```bash
codex plugin marketplace upgrade oh-my-stack
codex plugin add oh-my-stack@oh-my-stack
codex plugin list --json
```

The second command installs from the refreshed snapshot. A marketplace listing
alone does not establish the bytes of the installed plugin. Check the installed
cache's `GENERATION.json` (`sourceVersion`) and `.codex-plugin/plugin.json`
(`version`) against the chosen release, then check loading in a new session.

For a local extracted source, follow [the archive update steps](../install/codex.md#update-the-plugin).
Git upgrade does not replace an extracted local directory.

### Move an existing local source to stable

This is an explicit, optional source migration. Retain the old source path and
files first. Replace only OMS registration, then install and verify:

```bash
codex plugin marketplace remove oh-my-stack
codex plugin marketplace add williamwue/oh-my-stack --ref stable
codex plugin add oh-my-stack@oh-my-stack
codex plugin list --json
```

To roll back, remove only that marketplace registration, add the retained old
marketplace directory, and run `codex plugin add oh-my-stack@oh-my-stack` again.
Verify the actual version in a fresh session. Configuration changed by a newer
release may need separate review before downgrading. A Git commit pinned with
`--ref <stable-commit>` is another deliberate way to hold a verified version;
normal upgrades of that pinned source do not follow the moving stable branch.

### Remove

```bash
codex plugin remove oh-my-stack@oh-my-stack
codex plugin marketplace remove oh-my-stack
```

The manager may retain cached files. User-owned model configuration remains.

## Claude Code

Inspect the source, version, and scope first:

```bash
claude plugin marketplace list
claude plugin list --json
```

For a Git source, refresh OMS and update its user-scope plugin:

```bash
claude plugin marketplace update oh-my-stack
claude plugin update oh-my-stack@oh-my-stack --scope user
claude plugin list --json
```

Use the existing scope if it is `project` or `local`. Managed installations need
their administrator's update path. Check the actual installed
`GENERATION.json` and `.claude-plugin/plugin.json`, then start a new session.
The stable source URL is `https://github.com/williamwue/oh-my-stack.git#stable`.
An existing source without that ref follows the repository default branch;
check its served version against the published release before updating. Source
migration is optional and must preserve the scope and enabled state.

For local archive sources, retain the old directory, verify the new
`oh-my-stack-claude-plugin-<version>.tar.gz` against its same-release `SHA256SUMS`,
extract it, and register its `oh-my-stack-claude-marketplace` directory.
Removing a Claude marketplace also uninstalls its plugins, so record the OMS
scope and enabled state before replacement, then reinstall in that same scope.
Rollback uses the retained old source (or an explicitly pinned stable commit),
followed by installation at that scope and a fresh version/loading check.

### Optional automatic updates

Claude Code leaves third-party marketplace auto-update off by default.
To opt in, open `/plugin`, choose **Marketplaces**, select **oh-my-stack**, and
choose **Enable auto-update**. Keep it off if you prefer explicit updates.
An update changes on-disk files; a running session can keep the old version.
Use a new session for the OMS loading check. The
[official update documentation](https://code.claude.com/docs/en/discover-plugins#keep-plugins-updated)
also describes `/reload-plugins`. No automatic-update UI interaction is claimed
by this repository's CLI acceptance.

### Remove

```bash
claude plugin uninstall oh-my-stack@oh-my-stack --scope user
claude plugin marketplace remove oh-my-stack
```

Use the installed scope. Removing a marketplace uninstalls its plugins.
Cached files and user-owned model configuration may remain.

## OMP

Use [the OMP guide](../install/omp.md) and inspect the existing plugin link
before replacing it. Keep the old versioned package directory.
The [release process](../release-process.md) covers integrity verification and
owned-directory rollback. Its generic installer does not change native plugin
registration or model mappings.

## What counts as a completed update

The receipt should identify old/new installed versions, tool version, source,
scope where applicable, checksum or stable release provenance, installed cache
metadata, enabled state, and the fresh-session loading result. Report loading
as pending when the agent cannot operate a new session. A successful download,
marketplace refresh, or old conversation is insufficient by itself.

See [the dated acceptance record](../acceptance/2026-10-07/stable-marketplace.md)
for observed upgrade paths and limits.
