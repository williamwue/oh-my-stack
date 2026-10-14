# Source unit handoff

The source unit pins `ce649c03ac3b75b6ae80cbd15b7e2c536caedb5a` and derives all runtime bodies from the immutable 0.15.23 snapshot. The former snapshot and receipts retain their bytes. The package version remains `0.17.1`.

## Generator integration

Add an explicit public discovery description for `in-your-own-words` in `tools/codex-skill-descriptions.mjs`. Without it, `loadModel` and `npm run check` fail with `Codex descriptions must cover exactly the core public catalog`. The new source entry is in `src/core/skill-catalog.json` and `src/core/skills/in-your-own-words/skill.json`.

Generate the new entry with explicit invocation policy on each host. Copy the new `check-plan.test.ts` alongside the exact `check-plan.mjs` from the poteto-mode helper tree. Preserve the package-aware command in both `skills/multi-phase-plan/SKILL.md` and `skills/poteto-mode/playbooks/multi-phase-plan.md`. Resolve their relative bundled-checker links after generation. No generator file was edited by this source unit.

The source links use `../poteto-mode/scripts/check-plan.mjs` from the public skill and `../scripts/check-plan.mjs` from the nested playbook. Both target `skills/poteto-mode/scripts/check-plan.mjs` under the installed package. Repository-source examples now use `src/core/skills`. This fixes the erroneous `pstack/skills/poteto-mode` helper prefix through the parity manifest.

Regenerate packages, shared documentation, conformance, and release artifacts. Then run the full repository check. Generated output was outside this unit's ownership.

## Runtime integration

The portable Match the model to the job paragraph preserves the configured role, family, alias, effort, urgency, verification exception, nearest supported setting, and original-selection fallback. Native and T3 bindings must implement supported settings and report requested versus observed settings without claiming enforcement from a request alone.

The parent chat owns the playbook and all spawns. Supply the complete absolute `poteto-mode/SKILL.md` path to each delegate. The portable delegate body resolves a missing path through the native installed package catalog rather than reading Cursor caches.

Authorize native execution only for the exact portable `skills/poteto-mode/scripts/check-plan.mjs`. Watcher, orch, and worktree helpers are complete source references. Their import does not authorize native execution.

## Evidence and review

The assigned derivation check and 19 Node tests pass. The five upstream checker tests also pass. Node tests execute source and derived checker copies with valid and invalid CommonMark examples and literal expected output.

The prior 11 parity tests retain their no-comments and presumptive-review gates. The source unit added no policy bypass to make checks pass. The source unit's new Python and Node files have no explanatory comments. Upstream comments remain immutable source content.

The coordinator owns independent How, no-comments, and review workflow rounds. This bounded delegate did not create nested agents. The installed binding names code cleanup but provides no callable code-cleanup capability in this session. A local diff and whitespace check supplies local evidence, not independent review or a claim that the unavailable cleanup skill ran.

No pushes, PRs, installs, publication, credentials, or user configuration writes occurred. Local source commit is the handoff artifact. The root should inspect the diff and preserve its own integration gates before local installation.

The staged whitespace check reports three trailing spaces in the immutable upstream `README.md` and one final blank line in upstream `skills/automate-me/SKILL.md`. The latter is also retained in its exact derived copy. Those bytes match the official source hashes. They remain intact. A scoped check excluding snapshots and allowing the inherited final blank line passes.
