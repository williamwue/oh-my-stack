# Optional Codex routing: candidate acceptance

Date: 2026-10-07. Candidate: unreleased 0.10.0. Codex CLI: 0.160.1 on macOS.
Model tasks used `gpt-6.1-sol` with high effort in disposable local repositories.
This observation does not compare latency, cost, or quality against pstack.

## Recorded outcomes

The [sanitized observations](acceptance/codex-auto-routing-0.10.0/observations.json)
retain prompts, executed commands, exit codes, changed-file inventories,
model responses, package hashes, and native discovery results.

| Scenario | Actual observation | Boundary |
| --- | --- | --- |
| Local addition fix, no Skill name | Only `math.mjs` changed, from subtraction to addition. The unchanged existing test failed before and passed after. No child activity appeared in the event stream. | The model chose the existing implicit `bug-fix` Skill directly; it did not demonstrate the new automatic entry's gate. |
| Read-only explanation, no Skill name | Read `oms-auto`, ran routing status with `enabled=true`, then read `poteto-mode`, `investigation`, and `how`. Explained the subtraction/test mismatch. No files changed. | One bounded implicit-selection observation, not a selection success rate. |
| Translation with auto enabled | Returned the Chinese translation without tool calls or file changes. | One negative control. |
| Same explanation with project manual | Used source inspection and the existing test; loaded no OMS entry or workflow. No files changed. | Does not disable the independent implicit-invocation policies of other existing Skills. |
| Explicit `$poteto-help` text with auto enabled | Read the help entry and explained the entry points without engineering execution or changes. | Explicit text invocation, not a Desktop picker test. |
| Same-thread auto then manual recheck | Native structured selection of `oms-auto` ran status as its first command in both turns. Auto loaded the shared router; after the harness switched to manual, status returned `enabled=false` and no workflow was read. Fixture source stayed unchanged. | Tests the selected entry's gate in an already-open thread, not implicit reselection or hook lifecycle delivery. |
| Routing-only setup | Explicit `$setup-oh-my-stack` text previewed and applied the project auto switch. Only `.oh-my-stack/routing.json` changed. No inventory collector, model configuration helper, or setup probe was executed. | Configuration success; the response retained the separate native hook-verification boundary. |

An earlier fix observation read the repair workflow before checking the new
entry's switch. The entry was strengthened to require a separate status command
before workflow reads. Direct selection of an existing implicit repair Skill
remains possible, so the switch's documented scope is the new entry and hint.

## Initial native installation and hook observations

The generated plugin installed and enabled in a fresh disposable `CODEX_HOME`
from a local fixture marketplace. Native `skills/list` discovered
`oh-my-stack:oms-auto` and `oh-my-stack:poteto-mode`. The former permits implicit
invocation; the latter retains explicit invocation. No credentials were copied,
and the user's installed plugin and routing settings were not replaced.

Native `hooks/list` returned no plugin hooks in this fixture. Testing the
compatibility manifest and a complete portable OpenAI extension with an explicit
hook path also returned no plugin hooks. Those experiments changed disposable
copies only; the generated candidate retains the documented default location.
Project-hook discovery succeeded after adding a `.codex/config.toml` layer and
project trust: the hook was enabled and **untrusted**. That is discovery evidence,
not execution evidence.

Model acceptance copied the generated package into project-local `.agents`, with
an absolute project-hook command. Later hook tests wrapped the unchanged helper
with a local observer that forwarded stdin/stdout. One-invocation native hook
trust bypass was requested for these vetted fixtures; no persisted trust was
changed. No command execution was captured by the observer. At this initial stage the root cause was unresolved and lifecycle activation
was not certified. The follow-up below closes the tested native CLI boundary;
Desktop/IDE activation remains unverified.

Offline tests separately prove helper output for all four SessionStart sources,
manual mode, malformed input, and bounded failure behavior. They do not prove
native lifecycle delivery. Native hook review through `/hooks` remains a user
installation step; no fixture bypass is recommended for ordinary installation.

## Installed native CLI follow-up

The corrected generated package was installed through the native marketplace
commands into a separate temporary `oms-native-acceptance` marketplace. The
existing maintainer login was used without copying credentials. Only this
candidate plugin was active in the acceptance process; other plugins and MCP
servers were disabled with invocation overrides, leaving persistent settings
unchanged. No project-local copy of Skills was present.

The first discovery returned one enabled, untrusted plugin SessionStart hook.
For the vetted fixture, a second process supplied the exact native hook key and
current hash in invocation-only `hooks.state`. Native discovery reported
`trusted`; native `hook/completed` notifications then recorded completed command
execution and the routing context. Persisted personal hook trust was not changed.
Ordinary installation still requires the native hook-review step.

| Native operation | Observed result |
| --- | --- |
| `thread/start`, then ordinary read-only engineering request | Plugin hook completed with context; model read installed `oms-auto`, checked `enabled=true`, then loaded the shared router and explanation workflow. |
| `thread/resume` in a new process, then request | Plugin hook ran again; the model rechecked status before inspecting the current fixture and test. |
| `thread/compact/start`, then request | Native context-compaction item completed; the plugin hook ran again and the next turn rechecked routing status. |
| `thread/start` with `sessionStartSource=clear`, then request | Plugin hook completed; the model used the installed entry and gate. This tests the client-supplied API source, not an interactive `/clear` UI action. |
| Fresh auto session, translation request | Plugin hook added context; the model translated without tool calls. |
| Fresh manual session, engineering request | Plugin hook completed with no context entries; the model inspected the fixture without reading OMS entries or workflows. |
| Fresh auto session, structured native `poteto-help` selection | Model honored help, read the catalog and workflow documentation, and returned entry guidance without inspecting project code or executing an engineering workflow. |

All explanation fixtures retained the original source and test, confirming the
expected `-1 !== 5` failure without making changes. These observations are stored
in [the native follow-up receipt](acceptance/codex-auto-routing-0.10.0/native-followup.json).
The startup turn performed a project inventory between entry reading and status;
it still checked the switch before any workflow read. This demonstrates the
workflow gate, not perfect adherence to the stricter first-command instruction.
Resume and compact reused an existing explanation context, so they demonstrate
hook delivery and status rechecks rather than fresh workflow selection.
The temporary candidate plugin and marketplace were removed through native
commands after acceptance. Plugin and marketplace inventories exactly matched
their pre-test receipts; the formal personal OMS installation remains at 0.9.0.

The discovery failure was isolated by comparing generated copies with and
without root `plugin.json`. With that file present, native discovery returned no
hooks, even with explicit paths in both manifest formats. Removing it exposed
the native `.codex-plugin/plugin.json` hook. The inspected official Codex loader
also skips `load_plugin_hooks` for `PluginManifestFormat::AgentPlugin`:
[loader source](https://github.com/openai/codex/blob/d83bb540ec64bf6b009bca0283b0be91ea33f26a/codex-rs/core-plugins/src/loader.rs).
The source observation supports the runtime diagnosis; the cloned source is
not claimed to be the exact binary build revision.

Generation now emits only the native Codex manifest with the explicit hook
path. Package validation and release assembly reject a root manifest that would
shadow it. The lifecycle fixture verifies that updating an owned package removes
the old root file. Desktop/IDE execution remains unverified, and model routing
remains an instruction-based hint rather than a host-enforced policy.

## Local consistency

`npm run check` passed all 265 tests, including eight routing-specific tests:
preview/apply, user/project precedence, worktree boundaries, idempotence,
malformed/unowned configuration, symlinks, CLI argument validation, and generated
hook behavior. Failed lookup cannot partially write another configuration scope.
The new entry also passed the Skill creator's validator in a disposable Python
environment. Generated packages and pinned original Skill files remain covered
by the repository's consistency checks.

These are source and bounded fixture results. They do not establish a published
release, a personal installed-version upgrade, universal automatic selection,
full independent-review execution, or a host-enforced routing policy.
