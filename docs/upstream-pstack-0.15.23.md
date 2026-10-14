# pstack 0.15.23 semantic source migration

The semantic source now pins [cursor/plugins commit ce649c0](https://github.com/cursor/plugins/commit/ce649c03ac3b75b6ae80cbd15b7e2c536caedb5a). GitHub's commit API identifies tree `0317938cdda8aaa9535d17f720dae6323604a72b`. Its recursive tree API supplied every pstack blob used to verify the downloaded snapshot. Both plugin manifests report version `0.15.23`.

The new snapshot has 168 files. Against the preserved 0.15.17 snapshot, 61 files changed, three were added, and none were deleted. The additions are the root plugin manifest, `in-your-own-words`, and the CommonMark checker test. The [provenance receipt](acceptance/2026-10-14-pstack-sync/source/provenance.json) records each source file's Git blob and SHA-256 hash. The previous snapshots and dated receipts retain their original bytes.

The active [parity manifest](../upstream/parity-derivations.json) contains 166 derivations. It covers every runtime skill, role, reference, helper, Benny skill, and Benny template, plus the 23 public playbook copies. Every replacement has a literal anchor, an occurrence count, a category, a rationale, and an output hash. No derived runtime body was edited by hand. The [migration script](acceptance/2026-10-14-pstack-sync/source/migrate.py) transfers the baseline replacements, and the [replacement review](acceptance/2026-10-14-pstack-sync/source/replacement-review.json) records changed anchors, changed counts, retired anchors, and new host adaptations.

The receiving chat owns the playbook, todo list, and child spawns. Its `poteto-agent` delegates read the full absolute skill path supplied by the parent. The new effort policy raises effort for difficult work and lowers it for routine work. Urgency controls fast mode. Verification retains the `swarm workers` model and speed. The portable rule uses supported host options, preserves each role's family and inherited aliases, and returns to the original configured selection after rejection. Arena and Interrogate retain the source mapping of composer and cursor-grok examples to the grok family.

The new `in-your-own-words` entry is public and explicit-only. The source catalog and skill metadata include it. Its body preserves the upstream goal-restatement behavior.

Autopilot, stack, shipping, multi-phase, and orchestrate bodies retain the upstream verification and topology rules. These include one full swarm at the code-ready head, single-verifier minor follow-ups, nongating defects already present on trunk unless copied or newly reached, countersigns for every gate relaxation, leases pinned to the known pushed SHA, stopping on foreign pushes, root-store trails, checks on the merge result when callers or dependencies changed, root-owned stack topology, and the landing freeze.

Both multi-phase entries use `node "<absolute installed package>/skills/poteto-mode/scripts/check-plan.mjs" <plan.md>`. Each links to the same bundled helper through its own relative path. The malformed upstream checkout prefix is absent from these derived entries. Repository examples point to `src/core/skills`.

The checker and its upstream tests are present in the snapshot and derived tree. The watcher pagination, completed owner-approval classification, PR-base-chain frontier, and Origin-aware worktree audit changes are also present. Native execution support for the checker belongs to the runtime and generator units. Other source-host helpers remain reference-only unless an exact helper receives supported execution in the binding.

## Validation

The source unit passed these commands.

- `node tools/derive-pstack.mjs --check` verified 166 exact derivations.
- `node --test tests/parity-contract.test.mjs tests/pstack-01523.test.mjs` passed 19 tests.
- `bun test src/core/skills/poteto-mode/scripts/check-plan.test.ts` passed five tests and 18 assertions.

The Node tests verify all snapshot bytes, unchanged historical snapshot bytes, complete runtime-source coverage, explicit entry metadata, workflow contracts, relative checker paths, and executable CommonMark fence behavior against both source and derived copies. The existing presumptive-review and no-comments mutation tests remain intact.

`npm run check` stopped at `generate:check` with `Codex descriptions must cover exactly the core public catalog`. The generator owner must add `in-your-own-words` to `tools/codex-skill-descriptions.mjs`, regenerate all packages and shared catalogs, and run the full integration checks. The [source handoff](acceptance/2026-10-14-pstack-sync/source/handoff.md) records the remaining integration work.

The source package version remains `0.17.1`. This unit did not publish, push, open a PR, install packages, or change user configuration. Independent review and runtime option-enforcement evidence belong to the coordinating thread.
