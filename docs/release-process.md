# Release process

Oh My Stack builds all runtime packages from one versioned source tree. Release
archives are deterministic, contain one target package under the
`oh-my-stack/` archive root, and are accompanied by a complete file inventory,
SHA-256 checksums, and explicit verification maturity.

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
node tools/build-release.mjs --check --tag v0.1.0-alpha.0
node tools/build-release.mjs --tag v0.1.0-alpha.0
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
