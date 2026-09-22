# Changelog

All notable changes to Oh My Stack are recorded here. The project uses
Semantic Versioning prereleases while runtime compatibility is still being
established.

## 0.2.0-alpha.4 - Unreleased

- Reduced the default Codex marketplace plugin from 49 initial Skill entries
  to four primary entrypoints.
- Kept the other 45 public workflows in a packaged, non-scanned library that
  `poteto-mode` loads only after routing selects one.
- Preserved the complete 49-Skill Codex archive for direct-invocation and
  compatibility use cases.

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
