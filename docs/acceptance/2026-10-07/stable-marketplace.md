# Stable marketplace and update acceptance

Date: 2026-10-07 (Asia/Taipei). Source work: isolated
`feature/aihero-spec-research-20261007`; source candidate 0.10.0 remains unreleased.
Channel payload: published 0.9.1, source commit
`30d6764e6d3fb7431df1b4b1bd52a0dd8fd49c42`.

## Scope and structure

This change adds bilingual update prompts and native update, migration,
rollback, and optional auto-update guidance. A generated `stable` Git source
serves distinct released Codex and Claude Code packages. Original Skill bodies
and resources are copied from published archives without edits. No project
files, personal plugin registrations, or model mappings are changed by these
tests; plugin management uses disposable configuration directories.

One root writer owns publishing code, release instructions, and bilingual
user documentation. Published-asset validation and independent review block
activation; the two host update checks run independently. The direct asset
composition avoids rebuilding or redesigning upstream workflow behavior.

## Executable checks

Six focused tests in `tests/stable-marketplace.test.mjs` cover preserved host
payload bytes, distinct catalogs, formal-release identity, all-asset checksums,
dirty/tag/inventory rejection, successful exact-commit main CI, append-only
Git updates, idempotence, version downgrade rejection, and stale-head rejection.
The initial failing test established the absent stable-source module before
implementation. The full `npm run check` passed: 254 tests, generation/documentation/conformance
checks, deterministic release checks, validation, book checks, and Markdown lint.

A real publication preparation using the native `gh` account `williamwue`
verified write access to `williamwue/oh-my-stack`, formal release v0.9.1,
GitHub digests for all seven assets, same-release checksums, clean-tag manifest,
source CI run `37540700330`, and a fresh clean-tag rebuild. Every rebuilt output
matched the corresponding published download. Preparation itself did not push.

## Public channel activation

The generated GitHub `stable` branch was published from v0.9.1 at commit
`9c256126d271741630586731dbde32c24b62afcc`. The native publisher verified the
remote head after its scoped push; a separate GitHub ref read returned the same
commit. `STABLE_RELEASE.json` retains the published asset hashes and source tag.
No main/feature branch, tag, or release was published by this activation.

Fresh isolated profiles installed directly from the public GitHub source using
`codex plugin marketplace add williamwue/oh-my-stack --ref stable` and
`claude plugin marketplace add https://github.com/williamwue/oh-my-stack.git#stable`.
Both installed and enabled 0.9.1; both complete cache inventories matched the
published target archives. A fresh Codex app-server discovered all 84 public
Skills from that public-source 0.9.1 cache.

## Native manager observations

| Surface | Observed path | Result |
| --- | --- | --- |
| Codex CLI 0.160.1, isolated `CODEX_HOME` | Git stable snapshot containing published 0.9.0 → snapshot containing published 0.9.1; marketplace upgrade, then plugin add | Installed and enabled 0.9.1; the complete cache inventory equals the published Codex artifact. |
| Claude Code CLI 2.1.287, isolated `CLAUDE_CONFIG_DIR`, user scope | Git stable snapshot 0.9.0 → 0.9.1; marketplace update, then scope-specific plugin update | Native result explicitly reports oldVersion 0.9.0 and newVersion 0.9.1; complete cache inventory equals the published Claude artifact. |
| Codex, second isolated profile | Published 0.9.0 extracted local source → stable Git 0.9.1 | OMS source registration changes; unrelated companion plugin and model/effort settings remain. |
| Codex, second isolated profile | Stable Git 0.9.1 → retained local 0.9.0 source | Actual installed version returns to 0.9.0; retained source files and companion plugin remain. |
| Fresh Codex app-server process after Git update and migration | `skills/list` with `forceReload: true` | All 84 published 0.9.1 public Skills are discovered from the 0.9.1 installed cache, including `oh-my-stack:prove-it-works`. |

Codex's plugin listing reflected the new marketplace version immediately after
refresh. The separate `plugin add` result established the 0.9.1 cache path;
file-inventory verification established the bytes. The update guide therefore
requires both commands and actual installed metadata.

The local Git fixture served real Git data over loopback HTTP. Claude required
smart HTTP because its shallow clone rejects dumb HTTP; the passing fixture
used `git http-backend` and the same `#stable` ref syntax as the public source.
The temporary Git transport is not installed or shipped to users.

## Independent frozen review

The configured ordered reviewer panel ran three fresh read-only sessions.
All returned `No findings`; a separate fresh synthesis agreed. Root inspected
actual code and checks before publication. Frozen code hashes and full results
are retained in the private verification directory. Native parent/child
records verified the panel's gpt-6-astra, gpt-6-sol, and gpt-6-luna models at
high effort, and the gpt-6-astra synthesizer at high effort. Spawn task text is
encrypted in the parent record, so its exact persisted bytes cannot be audited.
Review agreement does not prove the absence of defects or an Actions execution.

## Evidence limits

Fresh Codex discovery is verified; a model turn executing `prove-it-works`
and desktop/IDE interaction are not claimed. Claude's new-session slash
execution, project/local/managed scopes, and automatic-update UI behavior are
not exercised here. Guidance supplies an explicit fresh-session user action
when an installer cannot operate it. CLI install/update success is distinct
from session execution and end-to-end workflow acceptance.

The automation file is locally implemented and checked. It will become
available after landing on `main`; GitHub Actions execution has not been
observed. This bootstrap does not publish 0.10.0, create a release, merge the
feature branch, or update the maintainer's personal 0.9.0 installation.

## Retained evidence

Full native command receipts, all downloaded assets, tagged-rebuild comparison,
promotion receipt, frozen review packet and runtime attribution checks are kept
under the maintainer's private verification directory:
`~/.local/share/oh-my-stack/candidates/0.10.0/verification/stable-marketplace-20261007/`.
This directory's candidate name identifies implementation work, not the public
channel version. Public payload provenance names only v0.9.1.
