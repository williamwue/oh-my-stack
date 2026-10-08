# Local maintainer release

Formal releases and stable promotion run on the maintainer's computer. GitHub
hosts the repository and release assets. Actions is an optional, manually started
check, and is not required for publication. The automatic stable publisher is
retired. Personal plugins, model mappings and routing settings are separate.

## Build environment

Use the official Node **22.23.3** distribution with zlib **1.3.1-e00f703** for both
packing and promotion. The local command refuses a different version before
writing evidence or changing remote state. The general development Node range
is unchanged. The local command supports macOS, Linux, and Windows maintainer
environments, selecting native npm and Python virtual-environment layouts.
A Node version alone is insufficient: the maintainer's other
22.23.3 build used zlib 1.2.12 and produced different compressed bytes for the
same uncompressed TARs. Record platform and architecture with the receipt.

Download the distribution for your platform from
[the official release directory](https://nodejs.org/dist/v22.23.3/), verify its
archive against `SHASUMS256.txt`, and extract into a dedicated directory. Do not
replace a global Node installation. On this maintainer's Mac, the verified
binary is:

```bash
OMS_RELEASE_NODE="$HOME/.local/share/oh-my-stack/toolchains/node-v22.23.3-darwin-arm64/bin/node"
"$OMS_RELEASE_NODE" -p 'JSON.stringify({node:process.version,zlib:process.versions.zlib})'
```

Changing the pin is a reviewed release-tool change. Re-run reproducibility and
publication checks after such a change; do not reuse receipts from another
build environment.

For Windows, use the official `node-v22.23.3-win-x64.zip`, verify its SHA-256,
and retain the complete extracted distribution so its bundled npm is available.
Python must be available as `python`; the pipeline creates its own virtual
environment and uses `Scripts/python.exe`. The same Node/zlib pin, clean tagged
source, independent review, and downloaded-asset gates apply.

## Prepare the source and review

Preserve unrelated work in the main checkout. Use a clean dedicated checkout,
update the canonical version in `src/core/project.json` and root package/lock
files for a new plugin release, and regenerate packages with `npm run generate`.
Complete the normal independent candidate review and resolve findings before
creating the final tag. Plugin-tooling-only changes need not republish a plugin.

Keep the review verdict outside the source checkout. Its schema is:

```json
{
  "schemaVersion": 1,
  "tree": "THE_EXACT_40_CHARACTER_REVIEWED_GIT_TREE",
  "verdict": "approved",
  "evidence": ["path or URL of frozen findings and root judgment"]
}
```

This is a maintainer judgment derived from completed review, not a template to
mark approved before review. Inspect `git rev-parse HEAD^{tree}` and bind the
actual reviewed tree; a merge commit may preserve that tree while changing the
commit ID. The producer records both commit and tree.

## One command

Run from a neutral directory without loading repository production env files.
Use a new evidence directory outside the source checkout. The source must be
clean and its tag must resolve to HEAD and match the canonical version.

For checks and a prepared tagged candidate, without remote writes:

```bash
"$OMS_RELEASE_NODE" /path/to/current/main/tools/local-release.mjs \
  --source /path/to/clean/tagged-source \
  --tag v0.11.3 --review /path/to/completed-review.json \
  --out /path/to/new/candidate-evidence
```

`v0.11.3` is an example future version, not an existing publication. Omitting
`--tag` validates a clean HEAD and produces a development receipt; that receipt
cannot authorize stable promotion or a formal release.

To publish after the release and review work is authorized:

```bash
"$OMS_RELEASE_NODE" /path/to/current/main/tools/local-release.mjs \
  --source /path/to/clean/tagged-source \
  --tag v0.11.3 --review /path/to/completed-review.json \
  --out /path/to/new/publish-evidence \
  --notes-file /path/to/release-notes.md --publish
```

The command runs dependency installation, the full repository checks, complete
book validation and the bilingual Python audit/tests. It builds twice to check
reproducibility, creates all seven assets, and writes a verification receipt
only after success. Logs and the review file are retained with hashes. Failed
checks retain evidence and never produce a success receipt.

With `--publish`, it verifies the existing native GitHub account and exact
repository, acquires a repository publication lease, pushes the unchanged release
tag, creates or resumes a draft,
downloads and verifies all seven draft assets, publishes a non-prerelease,
verifies public downloads again, and runs the gated stable publisher with the
same Node process environment. The archive byte check is unchanged. Published
assets are never overwritten. An existing identical release can resume stable
promotion; differing existing content stops the command. Remote failure may
leave a pushed tag, draft or published release; retained evidence states the
completed stage, and recovery requires another new evidence directory.

## Publication coordination and recovery

Git uses the official `gh auth git-credential` helper with the same native login
as the account check. Token overrides, global Git credential helpers and
authorization headers are excluded for these invocations; user configuration
is not modified. All stable Git reads and writes receive that environment.

The command acquires `refs/heads/oms-release-lock` with an explicit absent-ref
lease before inspecting or mutating release state. It holds ownership across
latest-version checks, publication and stable promotion, and removes only its
exact commit afterward. Competing commands stop before release mutations.
This coordinates participating publishers on different computers; manual
GitHub edits and other tools are outside this protocol.

An interrupted or ambiguous push may leave the lock in place. Inspect
`github/publication-lease/lease.json`, the remote lock commit and its
`OMS_PUBLICATION_LEASE.json` before recovery. Confirm the recorded owner is no
longer publishing, then remove only the inspected commit from a neutral directory
using the same native Git authentication and an explicit expected-head lease:

```bash
git -C /path/to/evidence/github/publication-lease/checkout \
  push --force-with-lease=refs/heads/oms-release-lock:INSPECTED_OWNER_COMMIT \
  https://github.com/williamwue/oh-my-stack.git :refs/heads/oms-release-lock
```

Never remove a different owner or automatically steal a stale lock. A recovery
command must use the native gh credential helper; configure it through the
official `gh auth setup-git --hostname github.com` command when operating
manually. The publisher itself configures the helper only for its subprocesses.

## Receipt and trust boundary

`verification.json` binds the exact repository, commit, tree, tag, clean source,
Node/zlib versions, required successful checks, hashed logs, completed review and
all seven artifact hashes/sizes. The stable publisher checks these against the
server-observed tag and downloaded release, then independently rebuilds with
the pinned environment. It still validates native write access, safe archive
inventories, previous stable ownership, monotonic version, an expected-head
lease, and the remote result. Any evidence or artifact drift stops promotion.

This is local maintainer evidence. It is not a signed third-party attestation or
remote CI result, and it does not defend against a malicious maintainer forging
both a receipt and its logs. The authorized maintainer owns review and release
judgment. Native installation and live model checks remain separate candidate
gates; the local command does not claim them from static tests.

The standalone publisher also accepts a verified local receipt:

```bash
"$OMS_RELEASE_NODE" /path/to/current/main/tools/stable-marketplace.mjs \
  --tag v0.11.3 --verification /path/to/publish-evidence/verification.json \
  --out /path/to/new/stable-evidence --publish
```

The previous 0.11.2 release and its historical promotion evidence remain
unchanged. Its old compression environment is not retroactively certified by
this new policy. Use the pinned pipeline for subsequent new releases.
