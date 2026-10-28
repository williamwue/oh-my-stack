# Release process

Follow the [local maintainer pipeline](local-release.md). Merge through a normal
reviewed PR, use a clean exact source tag and the official pinned Node 22.23.3 /
zlib 1.3.1-e00f703. Bun 1.4.4 runs fixed upstream checks. Do not reuse a tag or
overwrite published assets. The maintainer's native gh identity, exact repository,
publication lock, downloaded digests, independent tag rebuild, monotonic version
and expected stable head must all verify.

Formal generation is `npm run generate`; formal validation is `npm run check`.
Release assets are seven files: Codex, Claude Code and Pi archives, Codex and
Claude marketplace archives, release-manifest.json and SHA256SUMS. Runtime
archives have the oh-my-stack root. Marketplace roots are respectively
oh-my-stack-marketplace and oh-my-stack-claude-marketplace. Inventories include
path, mode, size and SHA256. Content inventory digests use compact JSON plus LF.

`npm run release:check` builds twice and compares every byte. The release installer
checks safe paths and ownership, stages the full verified inventory and restores
the prior directory if replacement fails. Supported targets are codex,
claude-code and pi. Native host registration and live model tests are separate.

Stable promotion consumes downloaded archives, verifies exact inventories and
checksums, verifies source/tag/build receipts, rebuilds the tag, checks previous
stable ownership and updates with an expected-head lease. It does not regenerate
workflow content from a developer worktree.
