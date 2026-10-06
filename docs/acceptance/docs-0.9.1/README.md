# Documentation 0.9.1 candidate checklist

Base: released 0.9.0 main at `b8a9eda1f645de4820360cd4eaca4b7cea3f271c`.
Scope: user documentation, generated Skill directory, source-only drift check,
and regenerated package version metadata. No workflow behavior change.

## Required gates

- Pass `npm run check`, including the new read-only directory regression test.
- Complete the bilingual book audit used by CI.
- Compare all packaged Skill resources and shipped script bytes with 0.9.0.
- Check changed local Markdown links and section references.
- Exercise the documented archive checksum and extraction commands.
- Independently review the exact frozen candidate and resolve blockers.
- Require fresh remote CI for the candidate and merged main.
- Run clean checks and deterministic tagged builds at `v0.9.1`.
- Publish all five archives, manifest, and checksums; download and compare every asset.
- Preserve the existing user worktree and user-owned plugin/model configuration.

The [0.9.0 native observation](../aihero-0.9.0/native-install.json) is dated
release evidence, not a new 0.9.1 live run. The patch retains the original
workflow bytes; no affected workflow behavior is newly certified. Codex
desktop interaction, OMP originals, and first-time human usability remain
separate acceptance gaps.
