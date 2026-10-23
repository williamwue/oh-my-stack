# pstack 0.15.30 local acceptance

The official pin is `4ec7ffa173eaa70d3d9467a627baf0954645a353`.
A second GitHub API read confirmed it remained the newest pstack change at
completion. The preserved preview records the old mappings' failures before
adaptation. Source blobs were checked against the official Git tree before
import; old snapshots and receipts retain their bytes.

## Checks

- `npm run check` passed: 861 tests, 821 passed, zero failed, 40 skipped.
  This includes generation, current documentation facts, 12 conformance records,
  reproducible release outputs, validation, book checks and Markdown lint.
- The official statechart suite is now included in `npm test`. Its 29 Node-only
  checks passed; 38 checks were skipped because TLC is not installed. The other
  two suite skips require the pinned release runtime. TLA+ execution and PNG
  rendering have not been accepted on this machine.
- The final update planner reports `unchanged` with no issues against the
  official candidate. All 181 derivations pass `derive-pstack.mjs --check`.
- The source migration replayed from the previous committed baseline and
  reproduced all four active manifests: parity, imports, semantic derivations
  and the Skill catalog. The replay takes the official Git checkout through
  `source/migrate.py --source-checkout /path/to/cursor-plugins`.
- Detached T3 generation and check passed with the AIHero extension, matching
  the installed package's selection. This output is under the ignored
  `.tmp/pstack-01530-t3/` directory and is not an installed-plugin receipt.
- The public catalog negative test now removes an empty final batch after
  removing its sole Skill, so the 81-entry catalog reaches the intended missing
  catalog check. Its focused test passed before the complete suite rerun.

## Boundaries

No push, release publication or installed-plugin upgrade was performed. The
source candidate retains OMS version 0.19.0; building local artifacts does not
publish a new version. Native installation and live model execution were not
verified. The upstream decision-trail rules remain unchanged.
