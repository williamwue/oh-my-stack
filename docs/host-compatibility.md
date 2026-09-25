# Host compatibility evidence

Updated 2026-09-25. These are observed combinations, not minimum supported
versions or a guarantee for every model/provider account.

| Host | Observed version and platform | Evidence | Boundary |
| --- | --- | --- | --- |
| OMP | 18.3.0 on macOS | Native Skill loading, isolated-profile install gate, user setup receipt, `how.explorer` child, ordered `architect.runners` panel, bounded swarm drain/retry, `proc://` deadline cancellation, and one isolated concurrent-writer case | `plugin link --dry-run` and local-path `--scope=project` are not safe isolation mechanisms; cancelled workers were not reattached after parent process exit, and natural late-result rejection remains unverified |
| Codex CLI | 0.155.1 on macOS | Installed candidate Skill loading and complete setup receipt, explicit `how.explorer` child, ordered `architect.runners` panel, read-only swarm drain/retry, active cancellation, controlled stale replay, and cross-host checkpoint pickup | Custom role files are not claimed as natively activated; Desktop picker acceptance is user-reported separately; cancelled child model/effort was not observable after interruption; natural late-result delivery remains unverified |
| Codex Desktop | User-confirmed selection on 2026-09-25 | User completed the desktop UI acceptance task | No agent-controlled screenshot or exhaustive picker traversal |
| Claude Code | Not authenticated locally | Generated package and static validation only | Native model/worker behavior remains unverified |
| Windows/Linux | Not recorded for live host acceptance | CI offline checks run on Ubuntu | No interactive host certification |

The observed OMP/Codex inventories used account-specific model IDs. Setup
rejects missing model IDs and unsupported requested efforts before writing
configuration. Its runtime acceptance rejects OMP model fallback, wrong
model/effort, and missing child evidence; Codex acceptance rejects a missing
child turn context or a different model/effort. These checks establish worker
activation, not successful task completion or every delegation API variant.

On a new host or after a host update, collect a fresh native model inventory,
preview setup, verify the selected manifest and owned files, then run a bounded
read-only child. Recheck any changed delegation API before claiming support.
