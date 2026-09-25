# Changelog

All notable changes to Oh My Stack are recorded here. The project uses
Semantic Versioning prereleases while runtime compatibility is still being
established.

## Unreleased

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
