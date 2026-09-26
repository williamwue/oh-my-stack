# Host compatibility evidence

Updated 2026-09-26. These are observed combinations, not minimum supported
versions or a guarantee for every model/provider account.

| Host | Observed version and platform | Evidence | Boundary |
| --- | --- | --- | --- |
| OMP | 18.3.0 on macOS | Installed beta.3 `how` Skill and native `how.explorer` child, isolated-profile install gate, ordered `architect.runners` panel, bounded swarm drain/retry, `proc://` deadline cancellation, and one isolated concurrent-writer case | `plugin link --dry-run` and local-path `--scope=project` are not safe isolation mechanisms; cancelled workers were not reattached after parent process exit, and natural late-result rejection remains unverified |
| Codex CLI | 0.155.1 on macOS | Installed beta.3 `how` Skill and explicit `how.explorer` child, complete setup receipt, ordered `architect.runners` panel, read-only swarm drain/retry, active cancellation, controlled stale replay, and cross-host checkpoint pickup | Custom role files are not claimed as natively activated; Desktop picker acceptance is user-reported separately; cancelled child model/effort was not observable after interruption; natural late-result delivery remains unverified |
| Codex Desktop | User-confirmed beta.3 selection on 2026-09-25 | User selected a beta.3 Oh My Stack Skill entry in a new task | No agent-controlled screenshot or exhaustive picker traversal |
| Claude Code CLI | 2.1.282 on macOS | Published beta.3 archive passed native validation; session-only plugin loading, explicit Skill invocation, and one plugin-scoped explorer child passed | Historical beta.3 result; no route model or effort verification in that run |
| Claude Code CLI | 2.1.283 on macOS | Installed beta.4 user plugin, active user resolution, three ordered `interrogate.reviewers` children at Opus/Sonnet/Opus with hook-observed high effort, and a correct bounded review result; a second Skill run also completed a separate synthesis | Full Skill acceptance withheld: root named models from reviewer reports rather than runtime metadata; remaining panels, writes, and failure paths untested |
| Windows/Linux | Not recorded for live host acceptance | CI offline checks run on Ubuntu | No interactive host certification |

Beta.5 candidate additions on 2026-09-26:

- Claude Code 2.1.283: bounded failure plus one retry, active command and
  eight-second deadline cancellation, isolated arena writers with final tests,
  and one architect implementation cycle. A native beta.4-to-beta.5 update in
  an isolated profile preserved 29 copied role files. Subsequent beta.5 tests
  passed bounded natural late delivery, actual-crash checkpoint recovery,
  stale-HEAD rejection and two design rounds; see the
  [continuation record](claude-continuation-acceptance-2026-09-26.md).
  Live-worker reattachment and autonomous redesign remain unverified.
- Codex CLI 0.157.0: isolated beta.5 installation and installed-source decision
  regressions for both changed Skills passed. An unrelated MCP startup auth
  warning did not prevent the read-only test; no external connector was used.
- OMP 18.3.0: beta.5 isolated install, doctor, Skill loading, cleanup and a
  source-guided three-case decision regression passed. This is not full native
  execution of both changed workflows.

The observed OMP/Codex inventories used account-specific model IDs. Setup
rejects missing model IDs and unsupported requested efforts before writing
configuration. Its runtime acceptance rejects OMP model fallback, wrong
model/effort, and missing child evidence; Codex acceptance rejects a missing
child turn context or a different model/effort. These checks establish worker
activation, not successful task completion or every delegation API variant.

On a new host or after a host update, collect a fresh native model inventory,
preview setup, verify the selected manifest and owned files, then run a bounded
read-only child. Recheck any changed delegation API before claiming support.
