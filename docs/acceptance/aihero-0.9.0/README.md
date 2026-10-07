# AIHero 0.9.0 candidate checklist

Base: released 0.8.0 main at `271310eda443b5750622fb6c41e2f43d569aaf56`.
Scope: five original skills and their complete dependency/resource closure.
All original source and license hashes are in `upstream/source-skills.json`.

## Required gates

- Verify every original resource and license across all three targets.
- Preserve all 401 previously generated skill files from the 0.8.0 base.
- Pass `npm run check` and the complete bilingual book audit used by CI.
- Inspect bounded Codex and Claude live traces and actual fixture artifacts.
- Review the frozen candidate independently; resolve concrete blockers.
- Require fresh remote CI for the submitted candidate and merged main.
- Run clean tagged checks and deterministic builds at `v0.9.0`.
- Publish five archives, manifest and checksums; download and compare all assets.
- Update the user's Codex marketplace through the native manager and inspect
  installed version, discovery, source bytes and original dependency loading.

The [live acceptance record](../../aihero-original-0.9.0-acceptance.md)
limits claims to observed fixtures and entry points. Claude explicit-only
skills must be started through slash commands. Desktop UI and OMP model-facing
behavior remain separate lanes; no historical run is relabeled as fresh.
