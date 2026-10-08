# Changelog

All notable changes to Oh My Stack are recorded here. The project uses
Semantic Versioning. The first non-prerelease is 0.2.0; pre-1.0 releases do not
promise permanent configuration or runtime API compatibility.

## Unreleased

## 0.13.0 - 2026-10-08

- Add original AIHero `writing-for-agents`, `retro`, `handoff`,
  `diagnosing-bugs`, and `code-review`, increasing original entries to sixteen
  and public entries to 95 across Codex, OMP, and Claude Code.
- Connect agent-document writing to the shared original reference, document
  complementary diagnosis and review choices, and preserve upstream resources.
- Preserve long original entries byte for byte while keeping the Codex core
  entry budget. Pin newer diagnosis and review originals separately.
- Support the pinned local release pipeline on Windows with native npm and
  Python layouts; fix executable fixture launching and Windows path assertions.

## 0.11.0 - 2026-10-07

- Add optional Codex automatic routing: describe an engineering task without
  choosing a Skill, with user/project switches and manual mode as the default.
- Respect explicit Skill selection and ordinary chat/translation; use the
  smallest appropriate existing engineering workflow without changing model setup.
- Fix native plugin hook discovery by emitting the Codex manifest with an
  explicit hook path and removing the root manifest that shadows it.
- Record installed CLI startup/resume/compact and bounded clear-source, manual,
  translation and explicit-entry acceptance; Desktop/IDE behavior remains unverified.

## 0.6.0 - 2026-10-04

- Fix the source release installer's silent no-op through file or directory
  aliases, including the macOS `/tmp` path.
- Add read-only GitHub CI diagnostics with current-head app-pinned check
  states, complete policy auditing and unchanged merge authority. Unknown
  review rules and populated review bypass restrictions stop safely.
- Record fresh installed-host activation, transcript recovery and bounded
  macOS Node/Bun evidence; retain explicit authentication and lifecycle gaps.

## 0.5.0 - 2026-10-03

- Add explicit independent OMS review for single-maintainer protected-branch
  merging while preserving default GitHub approval and actual repository rules.
- Bind review policy to scoped authority and recovery; validate current-head
  checks against their GitHub App source and preserve decisive review states.
- Record normal protected-target merge and operator-assisted recovery after
  an accepted merge followed by process interruption, with no repeated merge.
- Publish and verify three runtime packages; broad autonomous queues and
  atomic expected-base protection remain outside this release.

## 0.4.0 - 2026-10-03

- Add an official GitHub CLI provider with exact account/target verification,
  durable mutation intents and readback-based interrupted-operation recovery.
- Bundle a single-PR GitHub workflow adapter with Codex opening-a-pr,
  babysit check and root-authorized shipping, including independent review,
  revision/patch-bound authority and explicit target policy.
- Reject mutable-request races, empty verification evidence, stale journal
  writes and branch-name substitution. Strict target CAS stops explicitly.
- Record real PR creation, CI failure/repair and operator-assisted recovery
  after SIGKILL. Merge remains unverified without independent GitHub approval.
- Preserve historical evidence bytes with narrow hash-pinned hygiene checks
  and repair repository Markdown gates.

## 0.3.0 - 2026-09-30

- Add validated durable local run state, restart recovery, replay protection,
  cooperative writer locking, and malformed-history rejection.
- Add a local disposable autopilot provider with revision-bound transitions.
- Add Node/Bun runtime matrices, bounded probes, and revision-bound evidence.
- Add a read-only operations doctor and recovery/support documentation.
- These additions are source-checkout tools, not global plugin commands.
  Hosted autopilot, native POSIX workflows, and authenticated FishSpeech
  backend acceptance remain deferred; FishSpeech UI interaction is partial.

## 0.2.1 - 2026-09-28

- Fix Windows repository validation, shell-test execution, npm lifecycle tests,
  user-scope isolation, and Markdown glob quoting. Pin repository text to LF.
- Reject symbolic-link outputs in the Claude effort hook on Windows.
- Fix Windows verification of Unix-built archives while retaining byte hashes
  and POSIX mode checks; preserve shell entrypoint modes in Windows-built archives.
- Adopt upstream run-attribution and exact remote-lease requirements.
- Record 33 upstream decisions, independent architecture/review acceptance,
  local Git coordination, traversal measurements, and fishspeech visual checks.
- Preserve the release-authorized deferral of hosted autopilot, POSIX runtime
  acceptance, and fishspeech authenticated backend checks.

## 0.2.0 - 2026-09-26

- First non-beta release with 74 public Skills for Codex, OMP and Claude Code.
- Retain beta.5 workflow behavior and publish explicit core-support and
  experimental-capability boundaries.
- Add Claude Code evidence for natural late-result rejection, actual-crash
  checkpoint recovery with stale-HEAD rejection, and two-round redesign.
- Preserve runtime-specific model selection, user/project setup separation,
  safe owned-directory upgrade and rollback, and documented host limitations.

## 0.2.0-beta.5 - 2026-09-26

- Require root-observed runtime metadata for interrogate model attribution and
  complete frozen candidate artifacts for arena cross-judgment.
- Make installation checks read the source before quoting delegated file
  content, so role-policy footers cannot become claimed source text.
- Correct Claude setup acceptance for a single selected arena cross-judge;
  runner panels still require every configured entry in order.
- Add bounded Claude Code failure/retry, executing-command cancellation,
  deadline expiry, isolated candidate writing, and architecture implementation
  evidence. Record incomplete initial probes and remaining boundaries.

## 0.2.0-beta.4 - 2026-09-25

- Added native Claude Code marketplace metadata in the repository and a
  deterministic release bundle for persistent plugin installation.
- Validated Claude marketplace registration, user-scope installation,
  same-version update, and removal in an isolated Claude configuration.
- Added Sonnet/Opus Claude Code model setup, native route and ordered panel
  checks, and effective-effort audit from the local candidate. A temporary
  project panel passed; authenticated user-scope setup and complete workflows
  remain unverified.

## 0.2.0-beta.2 - 2026-09-25

- Added complete, deterministic setup receipts for Codex and OMP, including
  effective scope, all roles and named routes, and ordered panel workers.
- Fixed installed setup CLI execution through symlinked plugin directories.
- Added read-only owned-package inspection and change preview, plus an explicit
  rollback command using a retained trusted release archive.
- Added negative setup and worker-activation regression tests and an observed
  host compatibility matrix. Worker activation still does not prove task success.

- Added a deterministic, read-only Markdown setup receipt that verifies owned
  files and prints every configured workload, canonical role, named route, and
  ordered panel with counts. The setup Skill now uses it for saved manifests.
- Fixed setup CLI entrypoints when a generated package is reached through an
  OMP plugin symlink or a macOS `/tmp` alias; added installed-path regression
  coverage.
- Added explicit setup destination metadata and an optional current-project
  selection check to the setup audit. A saved user default is no longer
  implicitly presented as the configuration selected by a project override.
- Improved the setup receipt for scope, complete role/route choices, ordered
  panels, runtime evidence, and the distinction from OMP's general model roles.
- Consolidated the current backlog and recorded the user's successful
  second-computer installation report separately from recorded runtime tests.

## 0.2.0-beta.1 - 2026-09-24

- Replaced OMP `plugin link --dry-run` as a release gate with archive and
  installed-tree verification followed by a real install, health check, Skill
  load, and cleanup in a randomly named isolated OMP profile.
- Kept user-profile installation an explicit separate write step. The OMP
  dry-run defect remains documented; the new gate does not claim to fix OMP.
- Verified beta.1 installation on OMP 18.3.0 and Codex CLI 0.155.1, including
  native Skill discovery and bounded read-only execution. Existing setup
  manifests remain unchanged; prior worker records were rechecked, not rerun.

## 0.2.0-alpha.11 - 2026-09-24

- Accepted Codex CLI's padded encrypted spawn-message record in the setup
  verifier. Parent/child model and reasoning checks remain strict; encrypted
  message contents are still reported as not independently readable.
- Verified one user-level `how.explorer` child on OMP 18.3.0 and Codex CLI
  0.155.1: both completed a bounded read-only task with the configured Luna
  model at high reasoning. This does not certify every route or panel.
- Reproduced OMP 18.3.0 writing a plugin link and lock entry during
  `plugin link --dry-run` in an isolated profile. Keep OMP at Alpha preview
  rather than presenting its native plugin manager as a safe dry-run path.

## 0.2.0-alpha.10 - 2026-09-24

- Added user-level setup defaults for OMP and Codex. Workflows resolve a
  project manifest first, then the user manifest, so ordinary projects need
  no repeated setup; project setup remains a complete override. User-level
  canonical agents are namespaced to avoid changing unrelated task agents.
- Added the six source-style code and reflection slots to Codex with separate
  model overrides, while keeping `code.delegates` for compatibility.
- Preserved same-preset Codex choices on setup reruns and added two-project
  inheritance, override, collision, and invalid-manifest tests. Generated
  configuration is not proof of native role activation or worker execution.

## 0.2.0-alpha.9 - 2026-09-24

- Unified Codex and OMP setup budgets as reasoning targets: medium selects
  high where the observed model supports it, including routes whose preset
  effort was lower. Unlimited keeps the preset's per-route effort.
- Aligned the OMP OpenAI-Codex alternative's base model and effort choices with
  Codex before budget selection, and documented the effective route preview.
- Preserved runtime inventory checks, explicit override handling, and the
  distinction between generated configuration and observed worker execution.

## 0.2.0-alpha.8 - 2026-09-24

- Added read-only setup acceptance for OMP and Codex that checks owned role
  files and independently verifies a selected worker's runtime model and
  reasoning from parent and child records.
- Setup now distinguishes configuration from activation, checks child-delegation
  capability before applying, and explains OMP reasoning targets versus Codex
  ceilings without implying a monetary budget.

## 0.2.0-alpha.5 - 2026-09-23

- Added portable counterparts for the remaining 25 pinned pstack entries:
  five discovery/design workflows, 11 other main workflows, and nine playbooks.
  The public catalog now has 74 directly selectable Skills: 51 workflows and
  23 principles. The 12 internal probes remain outside public packages.
- Preserved full long-Skill instructions in the Codex plugin while keeping
  discovery descriptions concise; generated OMP, Codex, and Claude Code
  packages from one source.
- Adapted the reviewed upstream `swarm` evidence and `autopilot` round rules,
  and made decision-log initialization append without truncating existing data.
- Verified local 74-entry loading on Codex CLI and OMP, bounded read-only
  workflow decisions, and OMP failure/cancellation paths. Real hosted workflows
  and Claude Code live use remain unverified. OMP 18.2.10 still writes during
  `plugin link --dry-run`; do not treat that command as a safe preview.

## 0.2.0-alpha.4 - 2026-09-23

- Preserved all 49 direct Skill entrypoints in the default Codex plugin.
- Shortened Codex discovery descriptions while preserving full instructions
  and existing invocation policies.
- Categorized 26 workflows and 23 principles in the Skill directory, generated
  catalogs, and Codex display names without changing invocation names.

## 0.2.0-alpha.3 - 2026-09-22

- Limited all public runtime and Codex plugin packages to the 49 public Skills.
- Kept the 12 internal `check-*` probe Skills available through the explicit
  `npm run generate:probes` test-only build.
- Added regression coverage that rejects probe leakage in generated packages
  and release archives.

## 0.2.0-alpha.2 - 2026-09-22

- Prepared the repository for its first public Alpha release.
- Added a newcomer-oriented support matrix and Codex plugin quick start.
- Added contribution, security-reporting, and public-evidence policies.
- Added public repository metadata to generated package manifests.
- Kept Claude Code live verification explicitly deferred.
- Kept OMP native plugin-manager registration outside the verified release
  claim while retaining its validated package lifecycle.

## 0.2.0-alpha.1

- Added the deterministic Codex marketplace plugin archive.
- Verified isolated marketplace registration, installation, reinstall,
  removal, and deregistration on the recorded Codex CLI surface.

## 0.2.0-alpha.0

- Added the 49-Skill public catalog, target packages, runtime profiles, and
  focused live workflow evidence.

## 0.1.0-alpha.0

- Established the portable core, adapters, schemas, provenance, and initial
  deterministic release pipeline.
