# Release process

Oh My Stack builds all runtime packages from one versioned source tree. Release
archives are deterministic, contain one target package under the
`oh-my-stack/` archive root, and are accompanied by a complete file inventory,
SHA-256 checksums, and explicit verification maturity.

The Codex plugin bundle is a fourth archive rooted at
`oh-my-stack-marketplace/`. It contains the complete generated Codex
package at `plugins/oh-my-stack/` and a repository marketplace at
`.agents/plugins/marketplace.json`. All 74 current public Skills remain discoverable
and directly invocable. Codex descriptions are concise; full instructions and
resources load on demand. Catalog categories distinguish 51 workflows and
23 principles without moving either group outside the discovery directory.

The Claude Code marketplace bundle is a fifth archive rooted at
`oh-my-stack-claude-marketplace/`. It contains the generated Claude plugin at
`plugins/oh-my-stack/` and `.claude-plugin/marketplace.json`. The repository
root also has a Claude marketplace pointing at `packages/claude-code/`.

## Local release candidate

```bash
npm run check
npm run release:build
(cd dist && shasum -a 256 -c SHA256SUMS)
```

`npm run release:check` builds the complete output twice in separate temporary
directories and requires every output byte to match. `dist/` is disposable and
is not committed. A development build from a dirty tree records `WORKTREE` and
`worktreeDirty: true`; it cannot be confused with tag-bound release evidence.

## Install and update

Choose a dedicated package directory owned by Oh My Stack. Do not select a
runtime's whole plugin directory or a directory containing unrelated files.

```bash
node tools/install-release.mjs install \
  --manifest dist/release-manifest.json \
  --target codex \
  --destination /path/to/plugins/oh-my-stack

node tools/install-release.mjs update \
  --manifest dist/release-manifest.json \
  --target codex \
  --destination /path/to/plugins/oh-my-stack
```

Valid targets are `omp`, `codex`, and `claude-code`. Installation verifies the
archive checksum, rejects unsafe archive paths and links, extracts into a
staging directory, verifies every installed file against the release manifest,
and only then renames the directory into place. An update first verifies the
existing target's `GENERATION.json` ownership marker. If replacement fails,
the previous directory is restored.

Target-native registration remains separate. For example, a Codex repository
marketplace may point at the installed directory, while OMP may install its npm
package directly. The generic installer deliberately does not rewrite a
runtime's global configuration.

Before changing an owned package, inspect its installed version and preview
the exact package-file additions, changes, and removals:

```bash
node tools/install-release.mjs inspect \
  --target codex --destination /path/to/plugins/oh-my-stack
node tools/install-release.mjs plan \
  --manifest /path/to/new/release-manifest.json \
  --target codex --destination /path/to/plugins/oh-my-stack
```

`plan` is read-only and does not register a plugin or update model settings.
Use the [setup receipt](../README.md) to inspect the configuration selected by
the current project; package version and model configuration are distinct.
Retain the previous trusted release manifest and archives. To roll back an
owned directory, run `plan` with that previous manifest, then:

```bash
node tools/install-release.mjs rollback \
  --manifest /path/to/previous/release-manifest.json \
  --target codex --destination /path/to/plugins/oh-my-stack
node tools/install-release.mjs verify \
  --manifest /path/to/previous/release-manifest.json \
  --target codex --destination /path/to/plugins/oh-my-stack
```

The rollback command uses the same staged replacement and failure restoration
as update. Restart the host session after a native plugin upgrade or rollback.
The generic installer does not alter Codex marketplace registration or OMP
plugin links; check and update those separately.

### OMP preflight and isolated native acceptance

Do not use `omp plugin link --dry-run` as a read-only preview: OMP 18.3.0 was
observed creating a symlink and lock entry. For an OMP candidate, first verify
the release checksums and install its archive into a new dedicated directory
with the generic installer. Then run the native gate:

```bash
(cd dist && shasum -a 256 -c SHA256SUMS)
node tools/install-release.mjs install \
  --manifest dist/release-manifest.json \
  --target omp \
  --destination /absolute/owned/path/oh-my-stack
node tools/check-omp-install.mjs \
  --manifest dist/release-manifest.json \
  --package /absolute/owned/path/oh-my-stack
```

The gate verifies archive and installed-tree bytes **before** calling OMP. It
then performs a real local-path install in a randomly named isolated OMP
profile, checks the listed version, package target, `plugin doctor`, and
`skill://prove-it-works`, and uninstalls from that profile. The profile's
directory may remain for inspection. In a fresh link-only profile, OMP may
report `package_manifest: warning (Not created yet)`; that exact warning is
allowed only when `plugin:oh-my-stack` is healthy. Other warnings fail. A
failed probe reports its profile name; inspect any failed cleanup before
reuse. This is a controlled write to the probe profile, not a zero-write
dry-run or a repair to OMP's plugin manager.

Only after that gate passes should an operator deliberately install the
verified package into their own profile:

```bash
omp plugin install /absolute/owned/path/oh-my-stack
omp plugin list --json
omp plugin doctor --json
omp read skill://prove-it-works
```

Inspect existing OMP plugins before the final install; a name collision may
replace the existing Oh My Stack link. Retain the prior versioned package
directory for rollback. Never manually edit OMP's `node_modules` symlink or
lockfile to work around its dry-run defect. The setup model resolution is a
separate opt-in step and is not changed by this gate.

OMP 18.3.0 was also observed ignoring `--scope=project` for a local-path
`plugin install` and linking that path into the user plugin directory. Do not
use that flag to isolate local candidate testing. Use `--profile` as above,
then check the actual installed path before running a model session. An
isolated profile may need its own model login; package discovery alone does
not establish model-facing acceptance.

## Verify an installed package

Using the source checkout, compare an installed target directory with the
trusted manifest from the same release:

```bash
node tools/install-release.mjs verify \
  --manifest /path/to/release-manifest.json \
  --target codex \
  --destination /path/to/plugins/oh-my-stack
```

This read-only command exits successfully only when file paths, sizes,
normalized executable modes, and SHA-256 hashes match the manifest inventory.
Modified, missing, or additional files cause a nonzero exit. It does not repair
files, create a missing destination, register plugins, or require the release
archive. For a marketplace installation, select the actual plugin directory,
not the enclosing marketplace root. Targets are `omp`, `codex`, and `claude-code`.

Use a manifest from a trusted release: this is an integrity comparison, not
signature verification or proof that a runtime has loaded the Skills. Concurrent
file changes are outside the snapshot guarantee.

## Install the Codex plugin bundle

Extract `oh-my-stack-codex-plugin-<version>.tar.gz`, then register the extracted
marketplace root and install the plugin:

```bash
codex plugin marketplace add /absolute/path/to/oh-my-stack-marketplace
codex plugin add oh-my-stack@oh-my-stack
```

Use `codex plugin marketplace list` and `codex plugin list` to inspect the
resolved source and installed plugin. Start a new task after install or upgrade
so Codex loads the new Skill set. To remove it:

```bash
codex plugin remove oh-my-stack@oh-my-stack
codex plugin marketplace remove oh-my-stack
```

These commands update Codex's plugin configuration and cache. The release
builder itself only creates the dormant marketplace bundle and never performs
registration or installation.

## Install the Claude Code plugin

From a published repository, register its native marketplace and install at
user scope:

```bash
claude plugin marketplace add williamwue/oh-my-stack
claude plugin install oh-my-stack@oh-my-stack --scope user
claude plugin list --json
```

Alternatively, extract the checksummed
`oh-my-stack-claude-plugin-<version>.tar.gz` into a dedicated directory and
register that directory with `claude plugin marketplace add`. Start a fresh
Claude Code session and invoke `/oh-my-stack:prove-it-works`. `--plugin-dir`
remains a session-only development path, not a persistent install. Update or
remove the native plugin with:

```bash
claude plugin marketplace update oh-my-stack
claude plugin update oh-my-stack@oh-my-stack
claude plugin uninstall oh-my-stack@oh-my-stack --scope user
claude plugin marketplace remove oh-my-stack
```

The native manager may keep cached plugin data after removal; these commands
do not remove Oh My Stack model setup files. An isolated `CLAUDE_CONFIG_DIR`
native install/list/same-version update/uninstall test verifies manager
lifecycle without changing a personal Claude profile. Authenticated user-scope
setup, live workers, and a future-version update remain separate acceptance.

## Uninstall

```bash
node tools/install-release.mjs uninstall \
  --target codex \
  --destination /path/to/plugins/oh-my-stack
```

Uninstall refuses a directory unless its generated ownership marker matches
the selected target. Files outside that dedicated directory, including model
inventories, generated role overrides, runtime configuration, and unrelated
plugins, remain user-owned.

## Tagged release gate

The release tag is exactly `v<version>`, where `version` comes from
`src/core/project.json`. From a clean checkout at that tag, run:

```bash
npm ci --ignore-scripts
npm run check
node tools/build-release.mjs --check --tag v0.2.0-beta.5
node tools/build-release.mjs --tag v0.2.0-beta.5
```

The tagged build rejects a version-mismatched tag, a tag that does not resolve
to `HEAD`, or any tracked or untracked worktree change. The manifest records
the exact tag and commit. Publishing the tag or archives is a separate external
operation; a successful local build does not claim publication.

## Verification labels

Release metadata keeps four claims separate:

- `static`: generated package and repository validation;
- `discovery`: runtime discovery and explicit invocation observations;
- `lifecycle`: offline archive install, update, rollback, and uninstall;
- `endToEnd`: live workflow conformance fixtures.

`lifecycle: verified` in the release manifest describes the generic owned-dir
installer. It does not override a surface-specific runtime plugin-manager
result. Likewise, one CLI result cannot be attributed to desktop or IDE.
