# Official pstack 0.15.30 source update

The OMS 0.19.0 source candidate now pins official
[cursor/plugins commit 4ec7ffa](https://github.com/cursor/plugins/commit/4ec7ffa173eaa70d3d9467a627baf0954645a353),
the latest pstack change observed on 2026-10-23. Both official manifests report
0.15.30. The earlier 0.15.25 snapshot and acceptance records remain unchanged.

## Source and adaptations

The [source receipt](acceptance/2026-10-23-pstack-sync/source/provenance.json)
records all 184 files, their Git blob identities, SHA-256 hashes and sizes.
Compared with the previous pin, 23 files changed, 15 were added and none were
removed. The parity manifest contains 181 exact derivations.

Three explicit public Skills were added: `create-formal-verification-skill`,
`maintain-formal-verification-skill` and `statechart`. The statechart scripts,
models and upstream tests are retained without changes. Their portable helper
entry is documented in each generated runtime binding. Java, a TLA2TOOLS JAR,
and PNG rendering tools remain separate runtime prerequisites.

Frontmatter changes are recorded as exact replacements. The help adapter uses
the installed host's installation conventions and links to pinned upstream
harness documentation. It retains the new formal-verification setup offer.
No additional review stage or publication authority is introduced.

## Behavior adopted

- Formal checks identify covered code and the last commit confirmed in sync.
  Maintenance distinguishes verification drift, real bugs and blocked checks.
- Statecharts turn TLA+ models into user-visible bug paths, support agreed-chart
  comparisons, and preserve failed-run evidence and explicit exit codes.
- Ketchup lists every pending decision with evidence and risk without hiding
  items behind a word limit.
- Sharpen rewrites the prompt and leaves the user's choices open; it no longer
  executes the rewritten task.
- TypeScript branding uses a type guard rather than a cast.

The decision-log and cross-family trail-review rules are unchanged upstream.
This update does not add enforcement for missing decision logs or reviews.

## Verification scope

See [local acceptance](acceptance/2026-10-23-pstack-sync/result.md). Generated
packages and offline checks establish source consistency, not live model
execution, installation or publication. Installed plugin caches remain separate
from this source update.
