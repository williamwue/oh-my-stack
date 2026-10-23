# Runtime, model selection, routing, and delegation audit

Publication hygiene: the local checkout prefix is redacted as `<OMS_CHECKOUT>`.

Audit date: 2026-10-23. This is a bounded research report, not integration or
final acceptance. Only this report is owned by this assignment. The parent owns
implementation fixes, registry changes, generated output, and the coverage checker.

The exact checklist is the `runtime` track of
`.tmp/module-audit-20261023/inventory.json`: **24 modules, 27 files**. All are
accounted for below. The added `src/runtime-resolution/{policy,presets,host-routes}.json`
inputs were reviewed; no additional runtime-track omissions were found. Source
evidence describes the dirty working tree based on local HEAD
`00fb1ff5365ce7f9a325c9be7fe0dae715c5590a`, not just that commit. Existing
uncommitted work was preserved. This report does not claim universal optimality.

## Fixed comparison sources

- **O**, official baseline: `4ec7ffa173eaa70d3d9467a627baf0954645a353`, read
  beneath `upstream/snapshots/cursor-pstack-october-23/4ec7ffa173eaa70d3d9467a627baf0954645a353/`.
  Paths beginning `pstack/` below are receipt-relative paths within that snapshot.
- **R**, secondary baseline: `356c6e0f978df729eb16f227d795f34d221c5aad`, read
  in `/tmp/oms-pstack-claude-20261023`. `git -C /tmp/oms-pstack-claude-20261023 rev-parse HEAD`
  returned exactly this SHA. Its status output was empty when checked. Secondary
  paths below are relative to that repository, not the official snapshot.
- Read `AGENTS.md`, `docs/maintainers/dual-reference.md`, and the assigned T3
  package's complete runtime-binding and model-selection documents before review.

These comparisons use primary implementation and test assertions. Snapshot
presence, an adoption registry status, generated-tree equality, and test counts
are supporting evidence, not substitutes for semantic comparison.

## Actionable findings, still unresolved

### RUNTIME-01: Custom native homes are ignored by model setup and lookup

**Implementation correctness / convergence gap; priority medium.**
`tools/model-resolution.mjs:11-14,33-49` honors `CLAUDE_CONFIG_DIR` but selects
Codex from `userRoot/.codex` and Pi from `userRoot/.pi/agent`, ignoring
`CODEX_HOME` and `PI_CODING_AGENT_DIR`. `tools/configure-models.mjs:274-307` uses
the same fixed destinations. A relocated host can therefore miss its saved OMS
selection, inherit another selection, or receive setup files in a directory it
does not use. `tools/routing.mjs:12-14,35-39` already honors `CODEX_HOME`, so
routing and model setup disagree even inside OMS.

R explicitly honors these native roots in
`plugins/pstack/hooks/session-start.sh:6-13`,
`plugins/pstack/skills/setup-pstack/SKILL.md:20-28,105-113`, and its Pi configuration
path contract in `plugins/pstack/skills/poteto-mode/references/pi-tools.md:65-69`.
O's `pstack/skills/setup-pstack/SKILL.md:8-18` and
`pstack/docs/harness/claude-code.md:37-46` concern Cursor and Claude roots; they
do not supply a Codex/Pi root resolver to copy.

An offline probe created valid manifests only in custom native directories,
set each environment variable, and called both `resolveActiveResolution` and
`configure(..., apply:false)`. Exit **0**, with decisive output:

```text
{"probe":"native-home","runtime":"codex","customManifestFound":false,"previewUsesCustomHome":false}
{"probe":"native-home","runtime":"pi","customManifestFound":false,"previewUsesCustomHome":false}
```

Parent action: add explicit custom-root inputs/defaults for these two native
homes, use them consistently in configuration, delegation lookup, and setup
inspection, and reject relative environment roots at the boundary. Preserve
nearest project shadowing and do not change T3's separate manifest namespace.
An explicit `--output` detached configuration remains a possible manual
destination; it does not make automatic native lookup honor a relocated home.
Existing checks to extend after the fix:
`node --test tests/model-resolution.test.mjs tests/configure-models.test.mjs tests/routing.test.mjs`.

### RUNTIME-02: Claude rejected adjustments lose their original capability basis

**Implementation correctness gap in the recent native-effort work; priority medium.**
`tools/claude-delegation.mjs:44-46` recomputes the adjustment using the capability
list supplied to the retry. It accepts only `rejectedAdjustment`, without the
captured request/inventory replay supported by Codex and T3.
`tools/model-resolution.mjs:98-108` then requires the rejected effort to equal
the newly recomputed effort. A legitimate rejection can no longer restore the
saved role line after a capability refresh, even when that original line is
still supported. `docs/claude-delegation.md:47-49` promises an original-line retry.

Probe: configured `high`, routine job, original advertised ladder
`low,medium,high,xhigh,max`; first request is `low`. Retry with the same ladder
restores `high`. Remove only `low` from the refreshed capability list, leave
`high` supported, and retry the same actual rejected `low` request. Exit **0**
for assertions reproducing the failure:

```text
{"probe":"claude-stale-retry","firstEffort":"low","sameInventoryRetry":"high","refreshedInventoryError":"rejectedAdjustment must identify this adjusted model and reasoning with the host rejection reason"}
```

O `pstack/skills/poteto-mode/SKILL.md:95-97` requires returning to the role line
after an adjusted slug is rejected. R explicitly keeps the subagent type and
passes native effort in `plugins/pstack/skills/poteto-mode/SKILL.md:100-102,171-173`,
with the saved sheet at `plugins/pstack/skills/setup-pstack/SKILL.md:38-44`, but has no equivalent
prepared-request replay implementation. The applicable reusable OMS precedent
is `tools/codex-delegation.mjs:134-158` and
`tools/t3-orchestration.mjs:664-698,738-779`.

Parent action: bind Claude rejection to the original prepared request, task,
role/member, saved selection, scope, job context, and captured capabilities;
then independently check that the restored selection is currently dispatchable.
Do not accept an arbitrary reported rejection or silently choose a different
adjustment. Reusing the original captured capabilities manually works for the
probe, but the helper does not preserve or validate that provenance itself.
Extend `tests/claude-delegation.test.mjs` with refreshed/removed adjusted tiers,
scope/task changes, and altered receipt negative controls. Focused command:
`node --test tests/claude-delegation.test.mjs tests/codex-delegation.test.mjs tests/model-resolution.test.mjs`.

### RUNTIME-03: Legacy OMP/Codex inventory collection lacks a bounded shutdown

**Existing implementation robustness gap; priority medium.**
The OMP subprocess runner in `tools/collect-model-inventory.mjs:105-123` sends
one default termination signal after 60 seconds and waits for `close`; a
signal-resistant CLI can leave the promise pending indefinitely. Codex's
collector at `:161-237` rejects after 30 seconds but likewise sends one signal
without escalation or awaiting confirmed termination, leaving the child alive.
Both accumulate uncapped output (`:110-116,165-179`); Codex pagination has no
page/model/cursor-cycle bound (`:198-206`). These historical implementations
remain active. Pi's newer bounded RPC transport does not repair these paths.

A real subprocess fixture ignored SIGTERM. Only the collectors' 30/60-second
timers were shortened in the isolated probe process; no production source was
edited. Final decisive observations:

```text
OMP: deadline=250ms, observedAfter=700ms, signalSent=true, settled=false, childAlive=true
Codex: deadline=2000ms, observedAfter=2500ms, signalSent=true, settled=true, childAlive=true
Codex error: codex app-server model/list timed out
```

The first combined probe reproduced the OMP case but exited **1** because a
250ms Codex fixture deadline killed that fixture before its PID file existed.
A second 250ms Codex attempt also exited **1** for that startup race. The corrected
2-second Codex probe exited **0**, confirmed the surviving child, and explicitly
killed it with SIGKILL. These initial fixture failures are not separate product
defects. OMP's observed child was also explicitly killed.

O supplies availability policy, not an executable inventory collector
(`pstack/skills/setup-pstack/SKILL.md:12-14`). R's corresponding setup also asks
the native host for models; its Pi transport has bounded close/termination
behavior (`plugins/pstack/pi/child.ts:101-142,186-198`). Prefer the existing OMS
Pi lifecycle patterns (`tools/pi-delegation.mjs:82-119,159-168`) where applicable,
without pretending that either reference supplies a drop-in Codex app-server
client. Parent action: cap outputs, models/pages, and cursor repetition, bound
initialization/requests, escalate termination, await exit, and preserve the
primary diagnostic when cleanup fails. Extend
`node --test tests/collect-model-inventory.test.mjs` with subprocess fixtures;
the present suite tests normalization/Claude probe policy, not these collectors'
timeout lifecycles.

### RUNTIME-04: Pi terminal failures are returned as successful native tool results

**Useful reference interface improvement; priority low.**
`src/runtime/pi/extension.ts:21-26` returns only `content` and `details`, even when
`collect` returns a terminal task with `status:failed`. The text contains the
failure, but the native tool envelope has no `isError`. R's foreground agent
result explicitly sets `isError: record.status !== "completed"`
(`plugins/pstack/pi/agent-tools.ts:89-96`). This is a result-envelope convergence
opportunity, not evidence that the bridge labels its task status `completed`.

An in-memory extension harness evaluated the current extension body with its
imports/type annotation removed and stubbed Type builders/manager. For a manager
result `{status:'failed',error:'offline provider failure'}`, it obtained:

```text
{"probe":"pi-failed-tool-result","status":"failed","isErrorPresent":false}
```

That harness exited **0**; it is an extension fixture, not native Pi execution.
Parent action: surface failed terminal results through Pi's native error flag
while preserving the full bounded task record. Decide cancellation semantics
explicitly; a running start and an empty successful list must remain successful.
Extend `tests/pi-adapter.test.mjs` and the native simulated-provider acceptance
to inspect the actual failed collect tool event, rather than only manager status.

### RUNTIME-05: T3 guide claims implicit defaults are saved, while code intentionally rederives them

**Documentation convergence gap; priority low.**
`tools/t3-binding.mjs:187-190` says configuration saves observed fallback defaults
for explicit panels. `tools/t3-orchestration.mjs:231-266` does not add such a
policy; prepare derives it at `:715-716`. This is intentional and explicitly
asserted in `tests/t3-job-selection.test.mjs:245-271`, including rederivation after
provider/catalog changes. Parent action: correct the generated guide's source
wording and regenerate through the owner. Retain the implementation's current
distinction between implicit observed defaults and a whole explicit user policy.
The test already passed in the focused run. Neither O nor R has a T3 manifest
counterpart, so this should not be presented as an upstream adoption.

## Per-file review and decisions

`retain` means the current behavior has a reason to remain. `adapt` means retain
the existing host translation, with unresolved findings listed above; it does
not claim those fixes have been applied. `local-only` means a genuine host/tool
capability without an equivalent implementation in the fixed references.

| Inventory module / file | Current boundary, evidence, and decision |
| --- | --- |
| `host:claude-code` — `src/adapters/claude-code/adapter.json:1-20` | **adapt**. Native `.claude-plugin/plugin.json`, package identity and Claude profiles; compare O `pstack/plugin.json:1-20` and R `plugins/pstack/.claude-plugin/plugin.json:1-30`. Keep OMS identity, not the port's name/version. This descriptor alone does not prove native discovery or effort enforcement. |
| `host:codex` — `src/adapters/codex/adapter.json:1-43` | **adapt**. Native `.codex-plugin`, skill root, four declared profiles, empty claimed capabilities. R `plugins/pstack/.codex-plugin/plugin.json:30-50` supplies a concrete native manifest comparison; its capability labels, defaults and assets are not requirements to copy. O is a Cursor manifest, not a Codex schema implementation. |
| `host:omp` — `src/adapters/omp/adapter.json:1-26` | **local-only**. Native `package.json`/`omp.skills` and separate profiles. Searched O plugin/harness/setup and R package/native-tool references: no OMP package or adapter counterpart. Do not relabel Pi as OMP or claim Pi tests verify OMP. |
| `host:pi` — `src/adapters/pi/adapter.json:1-37` | **adapt**. Separate `pi.skills`, `pi.extensions`, Pi/typebox peers. R root `package.json` has both native Pi entries and peers; the installation layout differs. Wildcard peers mean future host compatibility is not established by the current local run. |
| `host:pi` — `src/runtime/pi/extension.ts:7-29` | **adapt**. One start/list/collect/cancel tool, explicit session persistence, forwarding of abort/update/model/thinking context, shutdown cleanup. R `plugins/pstack/pi/index.ts:12-37` and `agent-tools.ts:73-144` provide lifecycle/result-envelope comparisons. Keep bounded one-unit coordination; RUNTIME-04 remains open. |
| `model-policy` — `src/runtime-resolution/policy.json:3-88` | **adapt**. Three workload preferences, canonical code/judgment/hardest/how/why/reflect/swarm routes, four two-entry panels. O setup `:49-65` and poteto-mode `:95-97` supply role/panel/job semantics. R `models.json:2-34` instead chooses four Claude aliases and three Codex panel models. Retain OMS's available-host choices; do not claim same-model seats establish diversity. |
| `model-policy` — `src/runtime-resolution/presets.json:3-102` | **adapt**. OMP Cursor, OMP OpenAI-Codex alternative, and Codex presets; no static Pi preset; Claude's preset is built from observations. Exact model IDs and default tiers differ from R `models.json:30-58`. They are policy alternatives, not measured performance improvements. Budgets can raise raw preset effort, so the raw `@low` is not the final effective effort. |
| `model-policy` — `src/runtime-resolution/host-routes.json:3-9` | **adapt**. Four code playbook slots and separate reflect divergent/synthesizer slots. O setup `:49-60` names these behavior slots. Native Codex/OMP and T3 consume them through their effective route contracts; portable source routes remain separate. Do not collapse the individual slots back into a generic implementer. |
| `tool:check-omp-install` — `tools/check-omp-install.mjs:42-107` | **local-only**. Verify archive/tree/version and expected skill before any native install; require an empty randomly named profile; inspect installed path/version, doctor and actual skill bytes; uninstall after success or partial failure, aggregating cleanup failures. Neither reference has an OMP installation runner. The focused test supplies a fake command runner; real installation was not run. Native command timeout/output limits are not set here, so a hung installer can also stall this gate; bound that lifecycle when addressing RUNTIME-03 rather than claim archive hashes prove installation safety. |
| `tool:claude-delegation` — `tools/claude-delegation.mjs:22-92` | **adapt**. Captured native selector and advertised agent checks, current packaged route-role mapping, version gate, explicit per-call effort, environment precedence prediction, fingerprinted dispatch/child effort observation. O harness `:30-45`, R `plugins/pstack/skills/poteto-mode/SKILL.md:100-102,171-173` and R setup `:34-44` support direct native model/effort. `none` omits effort and speed is not invented. RUNTIME-02 remains open. |
| `tool:claude-effort-hook` — `tools/claude-effort-hook.mjs:7-45` | **local-only**. Explicit output-path hook records bounded child/type/tool/effort fields, caps input, rejects direct symlinks and changed output identity, omits chat/tool arguments. O and R native effort instructions do not supply a correlated PreToolUse evidence recorder. Keep opt-in observation separate from hook installation and backend proof. |
| `tool:claude-routing-hook` — `tools/claude-routing-hook.mjs:3-11` | **adapt**. Thin CLI binding to shared routing with explicit `claude-code`. Compare R `hooks/hooks.json:3-10` and runtime-switch dispatch in `hooks/session-start.sh:6-13`; preserve OMS runtime identity rather than use a generic plugin-root inference. |
| `tool:claude-transcript-location` — `tools/claude-transcript-location.mjs:24-81` | **adapt**. Host path/session ID, bounded metadata scan, ambiguity/symlink failure, no chat-body reads. R `plugins/pstack/skills/reflect/scripts/claude-project-dir.mjs:47-72` supplies session-name lookup but returns the first match and may fall back to cwd-derived names. Retain OMS's stricter refusal of ambiguity/identity substitution; reject the official newest-file heuristic at O harness `:56`. |
| `tool:codex-delegation` — `tools/codex-delegation.mjs:45-158,170-207` | **adapt**. Explicit model/effort with `fork_turns:none`, complete packaged role/task/context, canonical route-role migration, captured inventory retry provenance, linked parent/child/turn-context verification. R `references/codex-tools.md:34-55` is a native action/effort contract, not this verifier. Retain `roleSelectionClaim:false`; encrypted parent prompts leave exact message verification false. |
| `tool:codex-routing-hook` — `tools/codex-routing-hook.mjs:3-11` | **adapt**. Explicit Codex wrapper; R `hooks/codex-hooks.json:3-12` covers the same four lifecycle sources with a different shell/Windows implementation. Keep the shared OMS gate instead of importing the secondary default-on mandate. Live Windows hook execution was not run. |
| `tool:collect-model-inventory` — `tools/collect-model-inventory.mjs:58-102,126-260` | **adapt**. Native OMP/Codex inventory normalization, duplicate rejection, Pi RPC dispatch, explicitly consented bounded Claude prompts, reviewed model-family effort policy and refusal of fallback/Fable probing. O setup `:12-14` and R setup `:34,105-113` supply the availability contract. Claude effort support is a reviewed table, not independently observed enforcement. RUNTIME-03 remains open. |
| `tool:configure-models` — `tools/configure-models.mjs:95-211,274-510` | **adapt**. Observed inventory only; whole target-native role files plus owner/hash manifest, preview before apply, preserved same-preset effective identities/order, explicit budget targets, uniform reset bases, safe obsolete-file removal. O setup `:20-39` is the target-effort baseline. R's default session effort and model-sheet inclusion are explicit alternatives. Do not replace user settings with the secondary sheet or assume file hashes prove activation. RUNTIME-01 remains open. |
| `tool:model-resolution` — `tools/model-resolution.mjs:25-50,56-112` | **adapt**. Nearest complete project manifest shadows user configuration; malformed nearer files fail; observed supported effort order, aliases untouched, verification unchanged, exact rejected adjustment restores the saved line. O poteto-mode `:95-97` supplies the job policy; speed is disclosed as unavailable in this native helper. RUNTIME-01 and the Claude caller's RUNTIME-02 remain open. |
| `tool:pi-delegation` — `tools/pi-delegation.mjs:12-47,66-187,225-405` | **adapt**. Independent no-extension RPC child, strict relevant envelopes, UTF-8 decoder, request/output/task/retained/active limits, confirmed direct-child exit, retry/compaction failure, native model/thinking checks, bounded owned activity and copied results. Writers require distinct verified Git roots and one active writer per child root; readonly children omit bash/edit/write. R `pi/child.ts`, `agents.ts`, `agent-tools.ts` supplies comparison, not a safe whole-file replacement. |
| `tool:pi-inventory` — `tools/pi-inventory.mjs:4-30` | **adapt**. Advertise models, select each physical model, observe selection, query its levels, normalize off→none, refuse virtual/duplicate routes, stop child without prompt. R setup/Pi tools say list native models, but have no per-model RPC inventory counterpart. Current local native acceptance verifies settings bytes unchanged. The comment names Pi 1.1.0; this run used 1.2.0, not all future hosts. |
| `tool:pi-native-acceptance` — `tools/pi-native-acceptance.mjs:11-44,91-179` | **local-only**. Disposable agent dir and localhost provider, native package extension discovery, actual start/collect/list/read activity/persistence/cancel/shutdown/retry interception. Distinguishes default synthetic host resolver from `--package` real generated helpers. R `tests/pi/live-harness.mjs` and `docs/pi-equivalence.md` are comparison evidence, not permission to call live accounts. No O Pi runner exists. |
| `tool:routing` — `tools/routing.mjs:12-112` | **adapt**. Manual by default, explicit runtime scopes, nearest project gate within the Git worktree, strict small owner JSON, symlink rejection and atomic replacement. R session hook is on with a missing/invalid sheet (`hooks/session-start.sh:29-38`); reject that policy for OMS. A broken nearest OMS override never activates a global auto setting. |
| `tool:routing-hook` — `tools/routing-hook.mjs:8-49` | **adapt**. Only the four recognized SessionStart sources, enabled gate before context injection, explicit skip for bounded child/selected-skill/chat, bounded stdin, failure emits `{}`. R `hooks/session-start-context.md` supplies the comparable routing mandate; do not copy its default-on or broad coordination assumptions. Hook output is an instruction, not delegation/write authorization. |
| `tool:setup-acceptance` — `tools/setup-acceptance.mjs:25-49,52-199,202-245` | **local-only**. Read-only owned-file checks, active-vs-audited scope, distinct OMP/Claude/Codex linkage evidence, Claude effort stays unverified without correlated hooks, Pi runtime evidence sent to its own runner, comprehensive receipt. O setup confirmation and R setup confirmation are instructions, not an equivalent verifier. An already supplied runtime record remains evidence for that recorded execution, not a fresh workflow run. |
| `tool:t3-binding` — `tools/t3-binding.mjs:1-39,42-175,178-214` | **local-only**. T3 artifact/contract generation and authoritative host instructions preserve native manifests, exact rounds/options, PR/watch, schedules/browser/device boundaries. O/R have Cursor/native equivalents to some actions but no T3 API, manifest, or binding. Keep host adaptation, correct RUNTIME-05, do not import source-host automation permissions. |
| `tool:t3-orchestration` — `tools/t3-orchestration.mjs:70-266,297-500,529-947` | **local-only**. Typed catalog/targets, whole configuration shadowing, supported job effort/speed, evidenced fallback with actual-channel retention, distinct rounds, owned paths, stable IDs, observation/cancellation/scheduler drafts. O poteto-mode `:95-97`, Arena `:17-28`, Interrogate `:27-36` inform policy but are not T3 implementations. Unknown required trail families block; optional panel family minimums are not universal upstream defaults. |
| `tool:t3-receipts` — `tools/t3-receipts.mjs:8-105` | **local-only**. Compact hash-linked rejection graph, duplicate/cycle/missing/unreferenced checks, reconstruction memoization, captured transition verification by orchestration. Neither O nor R has the T3 request/receipt protocol. A receipt proves reproducible preparation and integrity constraints, not authenticity of a host error or actual option enforcement. |

The model-policy module's three files share a model/route input boundary, but
each file's different role is explicitly listed above. The Pi host module's
manifest and runtime extension are likewise listed separately. No inventory
module is hidden behind a blanket package/hash decision.

## Reference policies deliberately not copied

- **Retain official setup target semantics:** O's budgets set max/xhigh/high/medium
  and use supported lower tiers when needed, rather than act as money caps.
  OMS's legacy preserve-effort migration is explicit compatibility behavior.
  R's `default effort:session` and four-alias panel are policy alternatives;
  they do not establish that OMS's observed two-seat defaults are incorrect.
- **Retain manual routing:** R injects its mandate with no sheet and on decoding
  failure. OMS's explicit auto opt-in, separate host switches, child-scope
  exemption, and fail-closed configuration are intentional local policy.
- **Adapt Pi observation, reject broad automatic behavior:** R children load
  packages/settings and can steer/resume, recursively delegate, create/settle
  worktrees, retain automatic transcripts, inject prompt sections, hold one-shot
  parents, and schedule wakes (`pi/agents.ts:134-142,295-315,452-459`,
  `pi/prompt.ts:29-38`, `references/pi-tools.md:31-46`). OMS deliberately starts
  isolated children, keeps parent coordination explicit, defaults persistence
  off, and performs no automatic cleanup. These are policy/capability differences,
  not missing implementation equivalents that justify wholesale import.
- **Preserve stronger identity evidence:** O's newest-file transcript suggestion
  and R's first-match/cwd fallback are weaker than OMS's session-ID ambiguity
  refusal. Retain the stricter locator without claiming a metadata match proves
  transcript contents or host authenticity.
- **No manufactured host parity:** T3 PR watching, browser/device controls and
  scheduling have concrete app-owned tools; O Cursor automations and R Pi
  scheduler are different hosts. OMP install/discovery also has no O/R OMP
  implementation. Missing counterparts are recorded rather than called rejected
  implementations of the same API.

## Executed checks and limits

### Existing focused baseline

Executed from `<OMS_CHECKOUT>`:

```sh
node --test tests/claude-delegation.test.mjs tests/claude-effort-hook.test.mjs tests/claude-transcript-location.test.mjs tests/codex-delegation.test.mjs tests/collect-model-inventory.test.mjs tests/configure-models.test.mjs tests/model-resolution.test.mjs tests/pi-adapter.test.mjs tests/pi-rpc-robustness.test.mjs tests/routing.test.mjs tests/t3-generation.test.mjs tests/t3-orchestration.test.mjs tests/t3-candidate-coherence.test.mjs tests/t3-job-selection.test.mjs tests/t3-receipts.test.mjs tests/omp-install-gate.test.mjs tests/setup-acceptance.test.mjs tests/runtime-matrix.test.mjs
```

Exit **0**: **408 tests, 408 passed, 0 failed, 0 skipped**, duration 13,116ms.
The OMP gate test injects a fake native command runner; it did not install OMP.
Runtime-matrix tests are supporting probe infrastructure, not an extra runtime
module assigned to this report. Meaningful assertions reviewed include:

| Test source | Behavior/negative controls inspected |
| --- | --- |
| `tests/claude-delegation.test.mjs`, `tests/claude-effort-hook.test.mjs` | Exact per-call selector/effort and role mapping; lower/verification effort; environment prediction vs observation; pre-version/unsupported/forced-model failure; no-effort omission; mismatch/unlinked child/changed dispatch; generated helper CLI; hook privacy and symlink refusal. No refreshed Claude retry receipt test. |
| `tests/claude-transcript-location.test.mjs` | Changed cwd, nested transcript vs bare session directory, duplicate sessions, explicit host path mismatch, no cwd fallback, invalid selectors, symlinks and 1,025-directory bound. |
| `tests/configure-models.test.mjs`, `tests/model-resolution.test.mjs` | Updated current role bodies with retained model/order; two fresh seats; three-member reruns; sparse/legacy overrides; budget targets and no-ultra fallback; uniform reset; unowned/modified/obsolete collision; nearest invalid manifest; Claude custom root. No custom Codex/Pi native-home test. |
| `tests/codex-delegation.test.mjs`, `tests/setup-acceptance.test.mjs` | Explicit independent request fields, current route-role migration, original captured inventory across refresh/removal, altered scope/task/receipt refusals, parent-child linkage and every child turn context; native-role vs explicit-spawn claims; missing evidence stays unverified; selected-vs-audited manifest distinction. |
| `tests/collect-model-inventory.test.mjs`, `tests/routing.test.mjs` | Unique native normalized models; Claude account consent, exact pins/fallback and unsupported family refusal using fake executables; routing manual default, worktree/project boundary, native env roots, symlinks, malformed JSON, no partial setting write, four lifecycle events. No termination-resistant OMP/Codex inventory fixture. |
| `tests/pi-adapter.test.mjs`, `tests/pi-rpc-robustness.test.mjs`, `tests/fixtures/pi-rpc-{parent,child}.mjs` | Physical model/thinking mismatch, virtual/provider/error/nonzero failure, malformed RPC/assistant/response, split UTF-8, inherited-pipe drain, delayed direct-child cancellation, missing binary, task bounds, independent writer roots/admission, stale role mapping, list privacy/copies, explicit session path containment. Child processes are fixtures, not live providers. |
| `tests/t3-orchestration.test.mjs`, `tests/t3-job-selection.test.mjs`, `tests/t3-candidate-coherence.test.mjs` | Exact typed target/options, scope shadowing, job selector coherence, no invented speeds, explicit channel fallback, refusal-chain provenance, actual-channel recovery, later refused equivalent exclusion, required trail families vs custom panel minimums, review-round context, observation original-vs-later runs, cancellation/scheduler drafts. These do not dispatch T3 tasks. |
| `tests/t3-receipts.test.mjs`, `tests/t3-generation.test.mjs` | Fourteen-request compact chains including JSON round-trip; cycles, missing refs, conflicting ancestors and resealed transitions rejected; historical catalog removal; independent native/T3 manifest and full-body package binding. Fourteen receipts do not establish a global resource bound for arbitrary graph size. |
| `tests/omp-install-gate.test.mjs`, `tests/runtime-matrix.test.mjs` | Fake isolated install lifecycle/cleanup after partial failure, byte-preflight rejection before install; probe metadata, malformed output, timeout/output cap and source-bound persistence. No actual OMP install/model execution. |

R assertions were also inspected in `tests/models.test.mjs:19-160`,
`tests/session-hook.test.mjs:28-43,74-123`,
`tests/pi/agents-activity.test.mjs:16-84`, and
`tests/pi/agents-session.test.mjs:17-49,106-130`. They document alias-table shape,
default-on routing, argument/message activity summaries, reload/resume and orphan
behavior. They were **not executed** in this assignment; their harness
assumptions differ from OMS's deliberately isolated children.

### Real installed Pi, simulated provider

The executable symlink resolved to
`/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js`;
its local package metadata reports **1.2.0**. Executed:

```sh
node tools/pi-native-acceptance.mjs --cli /opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js --package packages/pi
```

Exit **0**. Decisive output: `native:true`, `liveAccount:false`,
`fixtureHostResolver:false`, `extensionDiscovery:true`,
`nativeToolStartCollect:true`, `nativeToolList:true`, `nativeActivity:true`,
`explicitSessionPersistence:true`, `childExecution:completed`,
`childCancellation:cancelled`, `nativeParentShutdown:true`, `retryRequests:1`.
Selected and observed were both `oms-local/child` at `off`; the inventory had two
local models. This tests the installed host and generated package against an
isolated localhost OpenAI-compatible provider. It does not install the package,
use a real account, establish provider billing/backend identity, or verify writing
roles against a real model.

The possible session-switch concern was checked against installed Pi source:
`dist/core/agent-session-runtime.js:102-113,128-166` emits shutdown and creates a
new runtime during switch/new-session; RPC EOF also calls shutdown
(`dist/modes/rpc/rpc-mode.js:579-595,639-642`). Thus the lack of a separate OMS
session-switch listener is **not reported as a demonstrated defect** on Pi
1.2.0. Abrupt-host and older-host behavior have not been accepted by this check.

### Reproduce the new findings offline

The inline probes used temporary directories only, with cleanup, and no real
host/model dispatch. This compact command reproduces RUNTIME-01 and RUNTIME-02:

```sh
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { configure } from './tools/configure-models.mjs';
import { resolveActiveResolution } from './tools/model-resolution.mjs';
import { prepareClaudeDelegation } from './tools/claude-delegation.mjs';
const root = await mkdtemp(join(tmpdir(), 'oms-runtime-audit-'));
try {
  const userRoot = join(root, 'home'), cwd = join(root, 'project');
  await mkdir(userRoot); await mkdir(cwd);
  for (const [runtime, key] of [['codex', 'CODEX_HOME'], ['pi', 'PI_CODING_AGENT_DIR']]) {
    const custom = join(root, `custom-${runtime}`); await mkdir(custom);
    process.env[key] = custom;
    await writeFile(join(custom, 'oh-my-stack.resolution.json'), JSON.stringify({
      schemaVersion: 1, owner: 'oh-my-stack', target: runtime, roles: {}, routes: {}
    }));
    const model = runtime === 'pi' ? 'fixture/model' : 'fixture-model';
    const inventoryPath = join(root, `${runtime}.json`);
    await writeFile(inventoryPath, JSON.stringify({ schemaVersion: 1, runtime,
      source: 'offline fixture', observedAt: '2026-10-23T00:00:00Z',
      models: [{ id: model, reasoningEfforts: ['high'] }] }));
    const lookup = await resolveActiveResolution({ runtime, cwd, userRoot });
    const preview = await configure({ packageRoot: resolve('packages', runtime),
      inventoryPath, userRoot, selections: { fast: `${model}@high`,
        balanced: `${model}@high`, deep: `${model}@high` }, apply: false });
    assert.equal(lookup, null);
    assert(!preview.configuration.manifestPath.startsWith(custom));
    console.log(runtime, 'custom lookup/setup ignored');
  }
  const bundleRoot = join(root, 'claude');
  await mkdir(join(bundleRoot, 'config'), { recursive: true });
  await mkdir(join(cwd, '.claude'));
  await writeFile(join(bundleRoot, 'config/role-contracts.json'), JSON.stringify({
    schemaVersion: 1, target: 'claude-code', routeRoles: { panel: 'reviewer' },
    roles: { reviewer: { description: 'Review', instructions: 'Read only' } } }));
  await writeFile(join(cwd, '.claude/oh-my-stack.resolution.json'), JSON.stringify({
    schemaVersion: 1, owner: 'oh-my-stack', target: 'claude-code', routes: {
      panel: { kind: 'panel', entries: [{ agent: 'ohmystack-panel-1',
        model: 'physical-opus', reasoning: 'high' }] } } }));
  const capabilities = { runtime: 'claude-code', version: '2.1.292',
    source: 'offline fixture', observedAt: '2026-10-23T00:00:00Z',
    agentTypes: ['ohmystack-panel-1'], models: [{ id: 'physical-opus',
      selector: 'opus', reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'] }] };
  const input = { bundleRoot, cwd, userRoot, routeName: 'panel', task: 'Inspect',
    env: {}, capabilities, jobContext: { kind: 'routine' } };
  const first = await prepareClaudeDelegation(input);
  const rejectedAdjustment = { model: 'physical-opus', reasoning: first.arguments.effort,
    reason: 'Offline rejection fixture' };
  assert.equal((await prepareClaudeDelegation({ ...input, rejectedAdjustment })).arguments.effort, 'high');
  const refreshed = { ...capabilities, models: [{ ...capabilities.models[0],
    reasoningEfforts: ['medium', 'high', 'xhigh', 'max'] }] };
  await assert.rejects(prepareClaudeDelegation({ ...input, capabilities: refreshed,
    rejectedAdjustment }), /must identify this adjusted/);
  console.log('Claude original-line retry blocked after refresh');
} finally { await rm(root, { recursive: true, force: true }); }
NODE
```

For RUNTIME-03, use a temporary Node CLI that writes its PID, registers a
SIGTERM handler without exiting, and keeps an interval alive. Call
`collectInventory({runtime:'omp',ompBin:fixture})` or
`collectInventory({runtime:'codex',codexBin:fixture})`. In the isolated caller only,
shorten `setTimeout` calls whose delay is exactly 60,000/30,000ms; allow at least
two seconds for Codex fixture startup. Observe SIGTERM and `process.kill(pid,0)`
after the deadline, then explicitly SIGKILL the owned fixture. Without the timer
scaling this exercises the same code after 60/30 seconds. RUNTIME-04 can be
reproduced with the extension harness described above; a native failing-collect
acceptance case is still needed. RUNTIME-05 is directly covered by the existing
named test and source comparison.

No new test file was added. No implementation, generated package, adoption
registry, install, personal configuration, model account, commit, push, external
publication, or delegated agent was created by this assignment. Full
`npm run check` was not run for this research-only change; the focused commands
above are the actual execution evidence. Real Claude calls and effective native
effort/model enforcement remain excluded. The parent must verify fixes and make
the final acceptance decision.

Report-only validation also completed: the JSON appendix has exactly the 24
runtime inventory IDs, all 27 files are named, and every official/secondary path
exists (inline Node assertions, exit **0**). The executable repro block above
was extracted from this report and rerun successfully (exit **0**).
`./node_modules/.bin/markdownlint-cli2 docs/maintainers/module-audit-2026-10-23/runtime.md`
returned **0**, with zero issues. A first coverage assertion caught the omitted
per-file prose row for the already reviewed OMP install gate; that row was added
before the successful coverage check. `git diff --no-index --check -- /dev/null`
against this new report returned **1**, with no whitespace diagnostics; the
no-index comparison contains a new file. No shared coverage checker was changed
or claimed accepted by these report checks.

## Integration appendix

There is exactly one entry for each current runtime-track inventory module.
`adapt` records the existing justified translation, not adoption of an unresolved
finding. Empty arrays explicitly describe the searched scope and absent
counterpart. The parent can attach this report and compute post-fix local hashes.

```json
{
  "moduleDecisions": [
    {
      "id": "host:claude-code",
      "decision": "adapt",
      "officialPaths": ["pstack/plugin.json", "pstack/docs/harness/claude-code.md"],
      "referencePaths": ["plugins/pstack/.claude-plugin/plugin.json"],
      "rationale": "Retain native Claude packaging with OMS identity and profiles; discovery is separate acceptance.",
      "officialRationale": "Official plugin identity and Claude harness are semantic references, not a native OMS manifest to copy.",
      "referenceRationale": "The secondary native Claude manifest confirms the packaging boundary; its name, version and defaults remain its own."
    },
    {
      "id": "host:codex",
      "decision": "adapt",
      "officialPaths": ["pstack/plugin.json"],
      "referencePaths": ["plugins/pstack/.codex-plugin/plugin.json", "plugins/pstack/skills/poteto-mode/references/codex-tools.md"],
      "rationale": "Retain Codex-native skill and interface metadata without importing secondary capability claims.",
      "officialRationale": "The official Cursor plugin is the identity baseline; it is not a Codex manifest implementation.",
      "referenceRationale": "The secondary supplies a concrete native Codex manifest and tool contract, with different assets and policies."
    },
    {
      "id": "host:omp",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain the separate OMP package and profiles; Pi evidence cannot establish OMP discovery.",
      "officialRationale": "Searched the complete official pstack tree, plugin, docs/harness and setup skill; no OMP adapter or package counterpart.",
      "referenceRationale": "Searched secondary package metadata, native references and Pi modules; no OMP implementation counterpart."
    },
    {
      "id": "host:pi",
      "decision": "adapt",
      "officialPaths": [],
      "referencePaths": ["package.json", "plugins/pstack/pi/index.ts", "plugins/pstack/pi/agent-tools.ts"],
      "rationale": "Retain separate Pi packaging and bounded explicit tool lifecycle; failed terminal tool envelopes remain RUNTIME-04.",
      "officialRationale": "Searched official plugin, docs/harness and whole-tree runtime paths; no Pi package or extension counterpart.",
      "referenceRationale": "Adapt native Pi extension/package and result contracts without copying recursive orchestration or automatic worktree management."
    },
    {
      "id": "model-policy",
      "decision": "adapt",
      "officialPaths": ["pstack/skills/setup-pstack/SKILL.md", "pstack/skills/poteto-mode/SKILL.md", "pstack/skills/arena/SKILL.md", "pstack/skills/interrogate/SKILL.md"],
      "referencePaths": ["plugins/pstack/models.json", "plugins/pstack/skills/setup-pstack/SKILL.md", "plugins/pstack/skills/poteto-mode/references/codex-tools.md", "plugins/pstack/skills/poteto-mode/references/pi-tools.md"],
      "rationale": "All three JSON inputs reviewed: preserve role slots, ordered two-seat defaults and observed native presets; no performance optimality claim.",
      "officialRationale": "Official roles, target budgets, alias seats and job settings provide the preferred semantics.",
      "referenceRationale": "Secondary alias tiers, session effort and larger panels are explicit policy alternatives, not mandatory convergence fixes."
    },
    {
      "id": "tool:check-omp-install",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain byte preflight, isolated profile install/doctor/skill-load and cleanup gate; only injected fixture execution was performed here.",
      "officialRationale": "Searched official setup, guide and harness paths plus executable tree; no OMP install acceptance runner.",
      "referenceRationale": "Searched secondary setup/native package tooling and tests; no OMP isolated install gate counterpart."
    },
    {
      "id": "tool:claude-delegation",
      "decision": "adapt",
      "officialPaths": ["pstack/docs/harness/claude-code.md", "pstack/skills/poteto-mode/SKILL.md"],
      "referencePaths": ["plugins/pstack/skills/setup-pstack/SKILL.md", "plugins/pstack/skills/poteto-mode/SKILL.md", "plugins/pstack/models.json"],
      "rationale": "Retain direct captured Agent model/effort preparation and separate child-correlated effort observation; RUNTIME-02 is unresolved.",
      "officialRationale": "Official harness supplies direct Agent model/effort and original-line rejection behavior through Poteto policy.",
      "referenceRationale": "Secondary uses per-call effort and native family selectors; it has no equivalent captured retry receipt implementation."
    },
    {
      "id": "tool:claude-effort-hook",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain opt-in bounded identity/effort evidence recording without chat bodies or automatic installation.",
      "officialRationale": "Searched official docs/harness, skills/setup-pstack and executable tree; no correlated PreToolUse effort recorder.",
      "referenceRationale": "Searched secondary hooks and native effort/setup paths; its routing/guard hooks are not a child effort evidence recorder."
    },
    {
      "id": "tool:claude-routing-hook",
      "decision": "adapt",
      "officialPaths": [],
      "referencePaths": ["plugins/pstack/hooks/hooks.json", "plugins/pstack/hooks/session-start.sh"],
      "rationale": "Retain thin explicit Claude runtime wrapper over the OMS opt-in gate.",
      "officialRationale": "Searched official plugin, docs/harness and hooks tree; no executable native SessionStart routing hook counterpart.",
      "referenceRationale": "Secondary supplies explicit runtime selection and four lifecycle sources; its default-on mandate is not adopted."
    },
    {
      "id": "tool:claude-transcript-location",
      "decision": "adapt",
      "officialPaths": ["pstack/docs/harness/claude-code.md"],
      "referencePaths": ["plugins/pstack/skills/reflect/scripts/claude-project-dir.mjs"],
      "rationale": "Retain metadata-only host/session identity lookup with strict ambiguity and symlink refusal.",
      "officialRationale": "Official transcript-layout guidance is relevant, but its newest-file heuristic is not adequate current-session identity evidence.",
      "referenceRationale": "Adapt session-name lookup while rejecting first-match and cwd fallback as substitutes for a missing or ambiguous identity."
    },
    {
      "id": "tool:codex-delegation",
      "decision": "adapt",
      "officialPaths": ["pstack/skills/poteto-mode/SKILL.md"],
      "referencePaths": ["plugins/pstack/skills/poteto-mode/references/codex-tools.md"],
      "rationale": "Retain explicit independent model/effort dispatch preparation, full role instructions and captured retry/runtime evidence boundaries.",
      "officialRationale": "Official per-role/job policy informs behavior; the official tree has no Codex request/session verifier implementation.",
      "referenceRationale": "Secondary maps spawn_agent and reasoning_effort, but does not implement OMS request fingerprinting and linked-record verification."
    },
    {
      "id": "tool:codex-routing-hook",
      "decision": "adapt",
      "officialPaths": [],
      "referencePaths": ["plugins/pstack/hooks/codex-hooks.json", "plugins/pstack/hooks/session-start.sh"],
      "rationale": "Retain explicit Codex wrapper and opt-in shared gate; live Windows execution remains unverified.",
      "officialRationale": "Searched official plugin/harness/setup and executable paths; no Codex-native SessionStart hook counterpart.",
      "referenceRationale": "Secondary native hooks cover startup/resume/clear/compact with a different shell/Windows dispatch and default-on policy."
    },
    {
      "id": "tool:collect-model-inventory",
      "decision": "adapt",
      "officialPaths": ["pstack/skills/setup-pstack/SKILL.md", "pstack/docs/harness/claude-code.md"],
      "referencePaths": ["plugins/pstack/skills/setup-pstack/SKILL.md", "plugins/pstack/skills/poteto-mode/references/codex-tools.md", "plugins/pstack/skills/poteto-mode/references/pi-tools.md", "plugins/pstack/pi/child.ts"],
      "rationale": "Retain observed native inventory and explicit Claude usage authorization; legacy collector bounds remain RUNTIME-03.",
      "officialRationale": "Official setup requires available native models; it supplies no executable OMP/Codex collector.",
      "referenceRationale": "Secondary supplies native listing contracts and a bounded Pi child pattern, not a drop-in OMP/Codex collector or permission for account probes."
    },
    {
      "id": "tool:configure-models",
      "decision": "adapt",
      "officialPaths": ["pstack/skills/setup-pstack/SKILL.md", "pstack/docs/harness/claude-code.md"],
      "referencePaths": ["plugins/pstack/skills/setup-pstack/SKILL.md", "plugins/pstack/models.json"],
      "rationale": "Retain previewed observed choices, owner-protected native role output, budget targets and preserved ordered reruns; RUNTIME-01 remains open.",
      "officialRationale": "Reuse official target-budget and per-role semantics through native host files instead of Cursor rules.",
      "referenceRationale": "Respect native-home handling; secondary default-session effort, alias tiers and sheet inclusion are policy alternatives."
    },
    {
      "id": "tool:model-resolution",
      "decision": "adapt",
      "officialPaths": ["pstack/skills/poteto-mode/SKILL.md", "pstack/skills/setup-pstack/SKILL.md"],
      "referencePaths": ["plugins/pstack/skills/setup-pstack/SKILL.md", "plugins/pstack/skills/poteto-mode/references/pi-tools.md"],
      "rationale": "Retain whole nearest-manifest shadowing, supported effort order and unchanged verification/aliases; RUNTIME-01 remains open.",
      "officialRationale": "Official role and job adjustments are the policy baseline, not an implementation of multi-host manifest lookup.",
      "referenceRationale": "Secondary host-root and effort contracts are useful; it does not provide the same project/user JSON resolver."
    },
    {
      "id": "tool:pi-delegation",
      "decision": "adapt",
      "officialPaths": [],
      "referencePaths": ["plugins/pstack/pi/child.ts", "plugins/pstack/pi/agents.ts", "plugins/pstack/pi/agent-tools.ts", "plugins/pstack/pi/index.ts"],
      "rationale": "Retain isolated bounded physical-model RPC tasks, explicit persistence, owned activity, checked writer roots and confirmed direct-child exit.",
      "officialRationale": "Searched the complete official pstack tree including docs/harness and setup; no standalone Pi RPC delegation implementation.",
      "referenceRationale": "Adapt activity/session/termination concepts; reject wholesale recursive resume, default transcript, scheduling and automatic cleanup policy."
    },
    {
      "id": "tool:pi-inventory",
      "decision": "adapt",
      "officialPaths": ["pstack/skills/setup-pstack/SKILL.md"],
      "referencePaths": ["plugins/pstack/skills/setup-pstack/SKILL.md", "plugins/pstack/skills/poteto-mode/references/pi-tools.md"],
      "rationale": "Retain physical model-specific native RPC thinking inventory without prompts or persisted settings changes.",
      "officialRationale": "Official availability requirement is applicable; there is no Pi executable counterpart.",
      "referenceRationale": "Secondary names native Pi listing and explicit selectors; it has no corresponding per-model set/state/thinking inventory helper."
    },
    {
      "id": "tool:pi-native-acceptance",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": ["tests/pi/live-harness.mjs", "docs/pi-equivalence.md"],
      "rationale": "Retain installed-host acceptance with a disposable localhost simulated provider and actual generated package; no live-account claim.",
      "officialRationale": "Searched official executable/test/harness paths; no Pi native acceptance runner.",
      "referenceRationale": "Secondary separates live Pi equivalence evidence, but its live harness is not OMS's no-account simulated-provider acceptance implementation."
    },
    {
      "id": "tool:routing",
      "decision": "adapt",
      "officialPaths": ["pstack/skills/poteto-mode/SKILL.md"],
      "referencePaths": ["plugins/pstack/hooks/session-start.sh", "plugins/pstack/skills/setup-pstack/SKILL.md"],
      "rationale": "Retain manual default, strict independent runtime switches, worktree-local lookup and atomic owned settings changes.",
      "officialRationale": "Official routing workflow supplies the execution policy, not this opt-in configuration resolver.",
      "referenceRationale": "Reject missing/invalid-sheet default-on injection; retain explicit native runtime roots and lifecycle behavior."
    },
    {
      "id": "tool:routing-hook",
      "decision": "adapt",
      "officialPaths": ["pstack/skills/poteto-mode/SKILL.md"],
      "referencePaths": ["plugins/pstack/hooks/session-start-context.md", "plugins/pstack/hooks/session-start.sh"],
      "rationale": "Retain bounded opt-in context injection with explicit child/chat/selected-skill and authorization boundaries.",
      "officialRationale": "Official Poteto workflow is the semantic entrypoint; there is no matching executable native hook.",
      "referenceRationale": "Secondary supplies a comparable SessionStart mandate, with intentionally different default-on routing."
    },
    {
      "id": "tool:setup-acceptance",
      "decision": "local-only",
      "officialPaths": ["pstack/skills/setup-pstack/SKILL.md"],
      "referencePaths": ["plugins/pstack/skills/setup-pstack/SKILL.md"],
      "rationale": "Retain separate file, selected-scope, activation and runtime-record claims for native hosts; no full workflow acceptance claim.",
      "officialRationale": "Official confirmation instructions are a semantic comparison, not an executable linked-record acceptance verifier.",
      "referenceRationale": "Secondary setup confirmation likewise lacks an equivalent OMS owned-file plus native parent/child verifier."
    },
    {
      "id": "tool:t3-binding",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain T3-owned artifacts, role contracts and host boundaries; correct guide wording under RUNTIME-05 before claiming convergence.",
      "officialRationale": "Searched complete official tree including harness and automations; Cursor tools are not T3 APIs or a T3 package binding counterpart.",
      "referenceRationale": "Searched secondary native tools, hooks and Pi modules; no T3 binding, manifest namespace or app-owned tool implementation."
    },
    {
      "id": "tool:t3-orchestration",
      "decision": "local-only",
      "officialPaths": ["pstack/skills/poteto-mode/SKILL.md", "pstack/skills/arena/SKILL.md", "pstack/skills/interrogate/SKILL.md", "pstack/skills/architect/SKILL.md"],
      "referencePaths": [],
      "rationale": "Retain typed observed catalog selection, captured rejection chains, stable identities and draft-only host requests without claiming dispatch or option enforcement.",
      "officialRationale": "Official job/fallback/dropout semantics inform adaptation; these paths contain no T3 request-preparation implementation.",
      "referenceRationale": "Searched secondary package, native tool references, hooks and Pi orchestration; no T3 capability catalog, request or observation counterpart."
    },
    {
      "id": "tool:t3-receipts",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain compact integrity-checked receipt graphs and captured transition reconstruction; hashes are not host authenticity evidence.",
      "officialRationale": "Searched official executable, model/setup and automation paths; no T3 rejection receipt graph implementation.",
      "referenceRationale": "Searched secondary tools, models and Pi runtime modules; agent/session persistence is not the T3 prepared-request receipt protocol."
    }
  ]
}
```
