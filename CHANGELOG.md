# Changelog

All notable changes to Oh My Stack are recorded here. The project uses
Semantic Versioning prereleases while runtime compatibility is still being
established.

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
