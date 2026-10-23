# Workflow, role, and semantic-source audit

Publication hygiene: the local checkout prefix is redacted as `<OMS_CHECKOUT>`.

Date: 2026-10-23. This is a bounded research report, not integration or final
acceptance. Only this file was authored by this unit. Findings below are proposed
follow-ups, not claims that the corresponding fixes or policies were adopted.

## Scope and fixed evidence

The parent's `.tmp/module-audit-20261023/inventory.json` supplies the exact scope:
**109 workflow modules, 352 files**. These are 98 Skill directories, 10 role
directories, and `core-metadata` (`src/core/project.json` and
`src/core/skill-catalog.json`). The JSON appendix accounts for every module ID.
No additional workflow module was missing after expanding the initial inventory.

The original brief's 93 was stale. Current `HEAD` contains 95 Skill metadata
files; the working tree adds `create-formal-verification-skill`,
`maintain-formal-verification-skill`, and `statechart`, giving 98. It would be
incorrect to attribute all five differences from 93 to this working-tree update.
The source catalog partitions 85 public names and 12 probes; the remaining
directory is the extension-owned `oms-enhanced-delivery`. Public classification
does not by itself mean inclusion in the default distribution.

Evidence shorthand used below:

- `S/` means this repository's current working tree, rooted at
  `<OMS_CHECKOUT>`.
- `O/` means
  `upstream/snapshots/cursor-pstack-october-23/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/`.
  Its receipt is `docs/acceptance/2026-10-23-pstack-sync/upstream-files.json`.
- `R/` means `/tmp/oms-pstack-claude-20261023/` at fixed commit
  `356c6e0f978df729eb16f227d795f34d221c5aad`. `git rev-parse HEAD` matched that
  commit and `git status --short` was empty. Reference paths in the appendix are
  relative to that repository, not claims of local adoption.

OMS `HEAD` during inspection was `00fb1ff5365ce7f9a325c9be7fe0dae715c5590a`.
The subject is the dirty working tree, not that commit alone. An inventory hash
comparison found no drift in the 352 assigned files at the comparison point.
Hashes locate the inspected candidate; they are not evidence of semantic review.

Read `AGENTS.md`, `docs/maintainers/dual-reference.md`, and the supplied detached
T3 package's runtime binding/model-selection guides. The reference declares an
official pstack baseline of `7b353f78f6ec193bdbe48ed8059444eb09b6878e`
(`R/tools/upstream.json:4-18`), different from OMS's official pin. Differences
caused by that lag must not be misclassified as deliberate policy forks.

Review covered the actual instructions, role contracts, metadata requirements
and fallbacks, exact replacement declarations, attached reference contracts,
and relevant tests. It included raw official/reference diffs for every declared
workflow fork and a mechanical comparison of mapped Markdown after applying the
112 declared substitutions and suppressing frontmatter/generated model regions.
The latter is an investigative aid, not the secondary generator's acceptance
check. It found 79 equal normalized mapped Markdown sources and 33 differences.
The four differences outside declared workflow forks were the generated
Interrogate reviewer table, the newer official Sharpen body and recipe wording,
and the generated driver-resolution lead in Refactoring. These have distinct
causes; none justifies blindly importing the secondary tree.

## Actionable findings

### W1. Promoting playbooks corrupts transcript directory names

**Implementation bug; proposed adaptation, not applied.**

`S/src/core/skills/eval/SKILL.md:29` and
`S/src/core/skills/session-pickup/SKILL.md:12` contain
`agent-tran../poteto-mode/scripts/`. Their canonical playbooks still contain
`agent-transcripts/` at
`S/src/core/skills/poteto-mode/playbooks/eval.md:22` and
`S/src/core/skills/poteto-mode/playbooks/session-pickup.md:5`.

The cause is the literal, unanchored `scripts/` replacement in
`S/upstream/parity-derivations.json:1028` and `:1657`. It matches the suffix of
`agent-transcripts/`, in addition to changing the newly inserted binding header.
The occurrence count of two makes this broken output perfectly reproducible.
The same text is materialized in the native generated workflow copies.

Use replacements for complete intended helper references, not substrings of
unrelated path names. Remove no workflow stage. Repair the derivation declarations
and regenerate; do not patch generated Skill bodies. A focused acceptance probe
must compare the promoted entries with their canonical transcript token and
independently confirm actual helper references resolve.

Reproduction from the repository root, read-only:

```sh
node --input-type=module - <<'JS'
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
for (const name of ['eval', 'session-pickup']) {
  const text = readFileSync(`src/core/skills/${name}/SKILL.md`, 'utf8');
  assert.ok(!text.includes('agent-tran../poteto-mode/scripts/'),
    `${name}: promoted path corrupts agent-transcripts/`);
}
JS
```

Observed exit **1**, `AssertionError: eval: promoted path corrupts
agent-transcripts/`. Both affected files were also inspected directly. In
contrast, `node tools/derive-pstack.mjs --check` exits **0** and reports
`181 exact derivations verified`. Exact derivation proves agreement with a
declaration, including a mistaken declaration.

### W2. Interrogate metadata weakens its existing independence contract

**Semantic metadata gap; proposed adaptation, not applied.**

The workflow requires separate reviewers and attributes findings by reviewer
(`S/src/core/skills/interrogate/SKILL.md:10,32-49`). Its role forbids reviewer
collusion (`S/src/core/roles/reviewer/instructions.md:3-7`). However,
`S/src/core/skills/interrogate/skill.json:20-26` maps unavailable spawn,
result-reading, or waiting to `root_runs_two_frozen_review_passes_then_synthesizes`.
That is not independent review, and this fallback string does not even preserve
the explicit incomplete-execution label present in Feature's metadata.

`R/plugins/pstack/skills/poteto-mode/SKILL.md:108` makes the useful distinction:
exploration can degrade to a labelled sequential pass; a required independent
review cannot become an independent verdict through self-review. Adapt that
distinction to OMS metadata and the existing review contract. Preserve collected
reviews and continue work that does not depend on the missing verdict. This
keeps an existing stage honest; it adds no approval stage.

Do not import the reference's exception permitting reuse of a finished reviewer
into T3 review rounds. The supplied T3 binding requires a fresh delegated review
round with the complete brief. Shipping already has appropriate fail-closed
fallbacks (`S/src/core/skills/shipping/skill.json:18-24`); reuse that semantic
standard where independent review is required. Arena/Architect already disclose
absent independence in their fallback names, but that disclosure must not be
reported as completed independent verification.

Acceptance should load Interrogate's metadata without spawning a model, exercise
the missing-agent/result/wait capability classifications, and assert that no
independent or complete verdict is available. A fixture can verify this contract;
it cannot prove live dispatch isolation.

### W3. The supported portable checker rejects legitimate input forms

**Useful reference implementation improvement; proposed adaptation, not applied.**

`S/src/core/skills/poteto-mode/scripts/check-plan.mjs:37` splits raw UTF-8 without
removing a BOM. Its fence scanner at `:48-60` accepts at most three leading spaces
and does not understand list-relative indentation. An otherwise valid fixture
with a BOM fails with `no H1 title`; a fenced example nested under a list is
misread as prose and fails with `mid-sentence colon`.

The secondary checker removes the BOM at
`R/plugins/pstack/skills/poteto-mode/scripts/check-plan.mjs:37` and treats nested
fences differently at `:48-63`. Reuse the BOM fix and adapt fence handling with
CommonMark-aware positive/negative controls. Do not import its unrelated program
markers, fixed store, configured-worker wording, or additional checkbox policy
as if those were parser repairs.

The probe used the current `check-plan.test.ts` valid-plan fixture in memory,
feeding `/dev/stdin`, with no saved fixture or source edit. Results:

| Input | Checker exit | Decisive result |
| --- | --- | --- |
| Unchanged fixture | 0 | `1 PR sections, 0 problems` |
| BOM plus same fixture | 1 | `/dev/stdin:1: no H1 title` |
| Same fixture plus a list-nested fenced `colon: code only` example | 1 | `/dev/stdin:53: mid-sentence colon` |

The probe harness itself exited **0**, reporting all three statuses. These are
local parser results, not model execution. The checker is explicitly supported
by the supplied runtime binding; the issue is not confined to an unused source
helper. Existing fence tests cover 0-3 spaces, longer closers and invalid info
strings, and pass. Add BOM/list-nesting cases only in a separately authorized
implementation unit if tests are requested by the coordinator.

Reproduce all three cases without writing a fixture:

```sh
node --input-type=module - <<'JS'
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
const source = readFileSync('src/core/skills/poteto-mode/scripts/check-plan.test.ts', 'utf8');
const context = {};
vm.runInNewContext(source.slice(source.indexOf('const rule ='), source.indexOf('const runPlan ='))
  + 'globalThis.fixture = validPlan;', context);
const nested = '\n- Example\n    ```md\n    colon: code only\n    ```\n';
for (const [label, input] of [['plain', context.fixture], ['BOM', '\uFEFF' + context.fixture],
  ['nested-code', context.fixture + nested]]) {
  const result = spawnSync(process.execPath,
    ['src/core/skills/poteto-mode/scripts/check-plan.mjs', '/dev/stdin'],
    { input, encoding: 'utf8' });
  console.log(JSON.stringify({ label, exit: result.status, error: result.stderr.trim() }));
}
JS
```

### W4. Help text still makes source-host claims after host translation

**Host documentation defect; proposed adaptation, not applied.**

The installed binding is authoritative, but the help body still says only Setup
loads from the user's words and treats Enter/Custom Mode as the reason routing
stopped (`S/src/core/skills/poteto-help/SKILL.md:43,141,145`). Actual invocation is
owned by each `skill.json`; Setup's current metadata is `explicit`, and
`oms-auto` separately requires an enabled routing switch
(`S/src/core/skills/oms-auto/SKILL.md:10-28`). A missing host model manifest also
does not warrant unexplained source-host setup instructions.

The useful secondary delta is precedence, not its particular installation:
`R/plugins/pstack/skills/poteto-help/SKILL.md` reads current setup/platform
instructions before explaining installation, routing and model loading, and
prefers installed playbooks over upstream guide prose. Adapt that precedence to
OMS's package README, runtime binding, model-selection guide and routing entry.
Keep the official fixed links as provenance. Do not replace them with moving
secondary `main` links or copy its auto-on hook policy.

Acceptance should render/read the help workflow on each supported host and check
that invocation/routing statements agree with the selected catalog and binding.
This report did not run a live installation or claim that a hook was active.

### W5. Useful policy deltas remain unadopted and should be selected individually

These are proposals, not current defects established by a failing runtime test.
The registry currently has no adopted policy derivations; its one policy entry
rejects automatic worktree cleanup. Any selected policy needs the registry and
an exact `category: policy` replacement with `adoptionId`, per
`docs/maintainers/dual-reference.md:13-27`.

| Proposed delta | Evidence and current boundary | Recommendation |
| --- | --- | --- |
| Reconcile accepted design deviations before the next unit consumes the contract | `R/plugins/pstack/skills/architect/SKILL.md:60-64` and `references/rationale-template.md:29-32`; current Architect Phase D only surfaces deviations at `S/src/core/skills/architect/SKILL.md:57-59` | Adapt into the existing design/rationale artifact after the appropriate owner accepts the change. Keep unresolved objections visible. No additional checkpoint or parallel per-unit ledger. |
| Test code assertions before designing against them | `R/plugins/pstack/skills/blast-radius/SKILL.md:3,8`; current trigger is predominantly pre-shipping | Adapt the pre-design trigger when a brief asserts existing behavior. Reuse the existing consumer census and executable safe-because check. Do not run it indiscriminately for every task. |
| Preserve original human rulings and distinguish copied summaries | `R/plugins/pstack/skills/why/references/epistemics.md:5-12`, investigator `:11`, synthesizer `:43-45`; related Recall `:23-25` and Session pickup `:6-7` | Adapt as evidence provenance in Why and reuse it from recall/resume. It prevents both invented permanent restrictions and invented permission. It is not a new consent gate. |
| Read project-designated records before claiming an item was never recorded | `R/plugins/pstack/skills/recall/SKILL.md:23-25`; current Recall sweeps shared records but does not state this exhaustion rule | Adapt only for negative record-existence claims. Preserve the named workspace and time scope. |
| Quote the actual predicted failure, not an assertion line or arbitrary red status | `R/plugins/pstack/skills/tdd/SKILL.md:19,40`, `principle-prove-it-works/SKILL.md:17-23`, Bug fix playbook `:15` | Adapt to existing red/green evidence. Current TDD already requires the intended reason; this makes the report auditable without pasting irrelevant logs. |
| Comparison controls must expose each claimed mismatch and missing inputs | `R/plugins/pstack/skills/principle-build-the-lever/SKILL.md:14-16` | Already adapted for the concrete image comparator by registry entry `image-comparator-controls`. A general principle sentence is still absent. Consider it only for other comparison workflows; do not claim a new comparator fix is missing. |
| A documented constant can be a user-visible promise | `R/plugins/pstack/skills/principle-test-behavior-not-implementation/SKILL.md:20` | Retain as a useful clarification if editing this principle. It does not justify tests that merely restate implementation constants. |
| Factual transcript fallback and unbiased reflection prompts | `R/plugins/pstack/skills/reflect/SKILL.md:18-28,40`; current Reflect accepts a tight digest without specifying its evidence shape | Adapt a factual turn/tool/file digest if no transcript is available. Preserve the three lenses and existing synthesis. Do not import Claude-specific path discovery into other hosts. |
| Revision-bound merge/restack evidence | `R/plugins/pstack/skills/poteto-mode/playbooks/shipping.md:7-14` and `references/merge-safety.md`; current Shipping `S/.../shipping/SKILL.md:14-16` uses patch-id and lease prose | Adapt the applicable head/base/destination evidence and conditional merge semantics through the existing forge owner. Check current native provider helpers before duplicating an already implemented guard. Patch equality alone does not establish applicability to a new base. No live forge calls were made here. |
| Hold untracked, ignored, locked, reflog-only and submodule work during cleanup | `R/plugins/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md:6-8`; source body still calls `scratch:N` safe and overstates preserved commits | Host read-only audit/reflog preservation is already adapted in `head-reflog-preservation`; the binding supersedes the Cursor shell script. Align source workflow explanation if selected. Reject disposable-file exceptions and automatic cleanup. Never infer deletion permission from an advisory bucket. |

## Complete secondary fork disposition

`R/tools/forks.json` declares **47 pstack paths**: 30 workflow/reference documents
and 17 source-helper/test/package paths. The one additional Thermos declaration
has no canonical module in this assigned core scope. The following accounts for
all of them. A decision to retain OMS does not mean the reference is defective.

| Reference paths under `plugins/pstack/skills/` | Decision and reason |
| --- | --- |
| `architect/SKILL.md`; `architect/references/rationale-template.md` | Adapt the accepted-deviation reconciliation described in W5. Keep default implementation continuation and opt-in design checkpoint. |
| `blast-radius/SKILL.md` | Adapt the asserted-premise trigger in W5. |
| `bro/SKILL.md` | Retain current plain-language task. Secondary adds `/bro`/say-it-plainly trigger wording only; no substantive stage to import. |
| `create-verification-skill/SKILL.md` | Retain OMS `verify-<app>` naming. Secondary's `verify` override is a Claude built-in naming policy. See formal-skill collision substitutions below. |
| `poteto-help/SKILL.md` | Adapt installed-host precedence (W4), retain the newer official Sharpen/Statechart guidance, reject moving-reference installation advice. |
| `poteto-mode/SKILL.md` | Retain the full principles/router and host-owned model/tool binding. Adapt only relevant stop/evidence/independent-review semantics. Do not import auto-on routing, fixed model panels, mandatory project playbook infrastructure, or new approval gates. Its writing/principle summaries are not missing canonical leaf behavior. |
| `poteto-mode/playbooks/autopilot-full.md` | Retain explicitly authorized landing. Reject universal operator-click merges, a new more-than-three-owner go, and an arbitrary two-fix-forward ceiling as defaults. Preserve durable objective/tick evidence through the host. Review-lane scoping is useful within the existing requested rubric. |
| `poteto-mode/playbooks/autopilot-stack.md` | Adapt captured head/base/patch and cancellation-before-topology semantics through existing forge controls. Root topology ownership already exists. |
| `poteto-mode/playbooks/babysit.md` | Adapt first-read PR/frontier identity and `behind-base` routing where absent; preserve drive/background/check/threads-only modes and host watcher ownership. |
| `poteto-mode/playbooks/bug-fix.md` | Adapt concise decisive failure/pass output, not a new test mandate. |
| `poteto-mode/playbooks/feature.md` | Retain the existing isolation principle and bounded-write fallback. Reuse structural writer isolation where the host supports it; reject Claude-specific remote-default base behavior and commit/setup steps as cross-host instructions. |
| `poteto-mode/playbooks/multi-phase-plan.md` | Retain full plan-only checklist, unit/live/perf requirements and host scheduling. Adapt installed-package reads; reject fixed `~/.claude/orchestrate`, a substituted model string, and changes to landing authority as universal policy. |
| `poteto-mode/playbooks/opening-a-pr.md` | Adapt live-writer ownership verification when necessary before shipping a tree. Do not stop unrelated/read-only agents or equate a completed notification with an observed process exit on every host. |
| `poteto-mode/playbooks/orchestrate.md` | Retain standing-program ownership, durable units/ledger/inbox/gates, original human wording and host isolation. Reference's local-worker/store/depth limits are host adaptations, not a better universal program strategy. |
| `poteto-mode/playbooks/pause-safely.md`; `poteto-mode/playbooks/session-pickup.md` | Adapt a discoverable durable checkpoint and requested-artifact preservation where the host lacks it; do not require reference `resume.mjs` or write an extra note per unit. Repair W1 first. Preserve explicit pause-only behavior. |
| `poteto-mode/playbooks/shipping.md` | Adapt revision-bound conditional landing through the existing provider boundary (W5); retain user-granted landing and existing independent verification. No merge performed or authorized by this audit. |
| `poteto-mode/playbooks/worktree-cleanup.md` | Retain advisory host audit and no-deletion boundary; selectively align stronger preservation prose, with already adopted reflog controls distinguished from new work. |
| `principle-build-the-lever/SKILL.md` | Consider general comparison-control prose; concrete comparator controls are already adopted. |
| `principle-prove-it-works/SKILL.md` | Adapt decisive status/failure/provenance evidence; retain real-artifact verification. |
| `principle-test-behavior-not-implementation/SKILL.md` | Retain behavior-first rule; consider documented-constant clarification. |
| `recall/SKILL.md` | Adapt record exhaustion and human-ruling provenance, not broad transcript access. |
| `reflect/SKILL.md` | Adapt factual fallback and neutral evidence handoff; host transcript lookup is already separately adapted. |
| `setup-pstack/SKILL.md` | Retain OMS observed-inventory/configuration authority, explicit routing opt-in, ordered panels, and user/project scope. Reject automatic hook-on defaults and editing personal `AGENTS.md`/`CLAUDE.md` merely because the reference does. |
| `show-me-your-work/SKILL.md`; `show-me-your-work/scripts/log.sh` | Retain append-only scoped evidence and independent trail review. Source helper is reference-only; secondary adds leading-quote sanitization and longer-row write handling. Reassess those only if promoting a supported native log helper; do not claim it already ships as native execution. |
| `tdd/SKILL.md` | Adapt decisive failing output while retaining the cheap-test escape and existing scope. |
| `why/references/epistemics.md`; `why/references/investigator-prompt.md`; `why/references/synthesizer-prompt.md` | Adapt original human-ruling provenance and dependent-copy handling (W5). Retain seven-category coverage and confidence separation. |
| `poteto-mode/scripts/bootstrap.ts`; `poteto-mode/scripts/package.json` | Retain as exact official, reference-only source resources. Secondary has no-Bun clarity, production-only install/no re-exec, and wider typecheck setup. No install was attempted; do not activate these helpers by copying the fork. |
| `poteto-mode/scripts/check-plan.mjs`; `poteto-mode/scripts/check-plan.test.ts` | Adapt only demonstrated parser repairs (W3), preserving the OMS/official plan contract. Reference fixture policy differs deliberately. |
| `poteto-mode/scripts/orch/store.ts`; `poteto-mode/scripts/orch/orch.test.ts` | Retain reference-only source status. Secondary implements table-cell quoting, exact branch/repository identities, bounded forge calls, and stale-lock race guards. These are relevant source improvements, not proof that OMS native durable-state tools lack them. No Bun/native program run here. |
| `poteto-mode/scripts/watch-pr/cli.ts`; `cli.test.ts`; `fakes.test-helper.ts`; `github.ts`; `github.test.ts`; `policy.ts`; `policy.test.ts`; `render.ts`; `types.ts`; `types.compile.ts` | Retain source references, not a second native watcher. Secondary adds deadline/integrity/landing-revision/blocker/no-checks/pagination semantics and corresponding fixtures. Compare native forge behavior through its owner before reuse; never infer merge authority or a verified live verdict from those fixtures. |
| Thermos `plugins/pstack/skills/thermo-nuclear-code-quality-review/SKILL.md` | No canonical counterpart in the 109-module scope; do not import a second review framework just to match a reference bundle. Core Interrogate already owns its explicit quality rubric. |

## All generated substitution families

These are **1-based rule indices** in fixed `R/tools/substitutions.json`, not OMS
derivation IDs. Every one of its 112 rules is covered below. The 25 denylist
entries at the end are secondary-host leakage checks, not OMS policy. They must
not ban legitimate fixed-source provenance or host-only examples globally.

| Rule indices | Interpretation and OMS disposition |
| --- | --- |
| 1-2 | Source/README link rewrite. Retain fixed official provenance and real package links; reject moving secondary `main` as an authority substitution. |
| 3-6, 30 | Driver `verify` naming and formal-skill collision avoidance. Retain `verify-<app>` in OMS; adapt an explicit collision warning if naming is revisited. Do not import the generic formal `verify` name as the UI driver. |
| 7, 18, 74-75 | Transcript location rewrites. Use native bounded/session-exact access, not Claude cwd encoding outside Claude. Existing session-exact helper is an adapted implementation, not evidence of universal full-transcript access. |
| 8-10, 14-17, 19-21, 52-54, 62, 78-81 | Task/Agent/tool/role namespaces and bundled Thermos packaging. Retain OMS generated role bindings and bounded writes; do not copy Claude types or unrelated review agents. |
| 11-13, 45, 90-91 | Generalize Bugbot wording. Retain skeptical treatment of any untrusted review bot; no stage or default behavior change is needed merely to rename the bot. |
| 22 | Escapes a Claude directory-validator false positive in a string. No OMS counterpart; retain current wording unless that actual validator applies. |
| 23 | MCP discovery. Retain current host tool catalog/binding rather than `.mcp.json` or `claude mcp list` for every runtime. |
| 24-29, 50, 57-61, 63-70, 92-99 | Model sheet, table, alias, family, effort and speed rewrites. Retain observed host inventory, options and same-role aliases. Secondary four-seat defaults and session effort are policy/host choices; do not shrink or expand a configured panel or claim unsupported speed. Runtime adapter implementation is outside this unit. |
| 31-35 | Audit/cache/worktree/session UI paths. Retain native read-only audit and active/pinned evidence, not Cursor or Claude cache deletion recipes. |
| 36-37, 87 | Babysit precedence and watcher path. Retain explicit OMS entry and host event watcher; source shell watcher stays reference-only unless exactly supported. |
| 38-41, 88, 101-106, 109 | Worker cloud/local/base/nesting translation. Retain structural ownership/isolation and declared host constraints; preserve the actual base commit. Do not present a manually named directory as host-managed isolation. |
| 42-44, 85-86, 89, 107-108, 110 | Wake mechanism, installed playbook reads, persistent objective and store. Retain native scheduler/tool lifecycle and current installed package, without forcing a Claude loop/store or using a source snapshot as live instructions. |
| 46-49, 55, 100 | Cleanup, real-surface driver and PR defaults. Retain available host driver, preserve source evidence and existing draft/publication gates; do not assume an uninstalled cleanup plugin or auto-convert draft PRs. |
| 51 | Choice tool translation. Retain available host interaction contract, actual user answers and supported question shape. |
| 56, 71-73, 76-77, 82-84 | Restart, Skill/config/plugin paths and authoring guidance. Retain host-discovered authorized roots and native authoring workflow; do not install a named foreign authoring plugin or edit personal instructions without existing authority. |
| 111-112 | Visualization command translation. Retain a host-supported chart/diagram from actual data; no fabricated screen or measured value. |

Frontmatter adaptation is also semantic. Secondary removes
`disable-model-invocation` from public skills, hides principle leaves with
`user-invocable: false`, strips Cursor keys and stamps runtime leads/model
sections (`R/tools/generate.mjs:630-677`). OMS intentionally exposes its principle
leaves as explicit public Skills and owns invocation in `skill.json`.
`S/tools/generate.mjs:147-179,420-448,1039-1058` validates the partition and emits
selected invocation metadata. Retain that design rather than silently importing
the secondary's discovery/routing policy.

## Roles, resources, and historical semantics

Two role bodies derive from official agents: `comment-sicko` and `poteto-agent`.
Official pstack has only those two `agents/` files. Secondary also bundles two
Thermos review agents; they are not equivalents of all eight OMS-owned roles.
Those eight retain explicit local contracts and are individually listed in the
appendix. The two source-derived roles preserve current host discovery and
bounded authority rather than selecting a highest-version unrelated cache.

| Role boundary | Evidence and disposition |
| --- | --- |
| `evidence-reader`, `explorer`, `explainer` | Local bounded read-only source collection/explanation contracts, with independent-session markers. The How/source-investigator templates are conceptual context, not identical agent definitions. Retain. |
| `reviewer`, `synthesizer`, `trail-reviewer` | Local read-only/frozen-scope and evidence attribution contracts. Synthesizer can spot-check citations when the assigned workflow requires it; historical investigation and frozen review retain different evidence scopes (`S/src/core/roles/synthesizer/instructions.md:3-11`). Retain; fix W2 at workflow metadata, not by granting reviewers writes. |
| `implementer`, `design-runner` | Local write-capable roles confined to assigned paths and artifacts. Design-runner cannot implement application code or choose the winner. Implementer cannot decide integration/final acceptance. Retain. |
| `comment-sicko` | Comment-only deletions and exact `MUST KILL` targets; no application-code edits, with root review and exception proof (`S/src/core/skills/no-comments/SKILL.md:20-25`). Secondary agent body equals the official body. Retain. |
| `poteto-agent` | Full-mode bounded worker, parent owns playbook and lifecycle; reads the selected installed mode and applicable principle leaves (`S/src/core/roles/poteto-agent/instructions.md:6-8`). Retain host adaptation, not secondary cache search. |

Attached files are part of the module decision, not uncounted collateral:

- Architect's three design references preserve usage-first candidates, red-flag
  screening and synthesis. The rationale is the right owner for the proposed
  reconciliation delta. How's two templates preserve source/flow/boundary/open
  question evidence. Interrogate's four references retain intent, quality lens,
  rubric and lead judgment; they are not replaced by Thermos.
- Why's 12 references preserve per-source ownership, null-result coverage,
  incident history and confidence tiers. The three human-ruling deltas in W5
  belong in those existing templates/framework, not in a new global approval
  policy. Reflect's four reviewer/synthesis references retain their separate
  lenses and Accepted/Rejected/Backlog handoff.
- The 12 probe modules include their actual marker assets and the
  `check-resources` renderer/payload/reference. They test controlled capability
  boundaries and are omitted from normal public packaging. They are not
  evidence that the current host successfully spawned, cancelled, resumed or
  isolated a live model. `check-panel`'s exact four-session/frozen-results rule,
  `check-stale-replay`'s same-worker replay and `check-writer-isolation`'s
  source-checkout distinction must stay probe-specific.
- `poteto-mode`'s 47 files include its 23 canonical playbooks, Bugbot triage
  reference, Bun bootstrap/package/lock, plan checker/test, durable store/CLI
  and watcher policy/transport/render/types/tests. Retain official source bytes
  as references; exact portable plan-check execution is the documented
  exception. Do not activate Bun installation, shell cleanup or a competing
  watcher because their files are shipped. The reference's lock/deadline/
  transport tests demonstrate candidate techniques under their own assumptions,
  not native host acceptance.
- `statechart` has 13 files, including four CLI/conversion scripts plus shared
  parser/library, model/config/mapping and test fixtures. Contracts preserve
  source citation, invariant scope, real-code replay, old/fixed/against model
  distinctions and truthful summary counts (`S/src/core/skills/statechart/SKILL.md:18-37`).
  Secondary has no Statechart counterpart at this fixed revision. Retain the
  newer official implementation. Its blanket reference-only helper header versus
  direct `node .../statechart.mjs` instruction requires an explicit host support
  decision before advertising the full workflow as executable; this audit's
  test run does not make that decision. No TLC/PNG/UI acceptance was established.
- `show-me-your-work`'s TSV template and `log.sh` are exact official references.
  `tests/show-work.test.mjs:26-42` explicitly tests reference-only classification.
  A hypothetical native log helper should handle leading quotes and concurrent
  long rows, but no current native-helper regression is asserted here.
- The three Benny modules include routing/control/existing-fix/feature-map
  examples and automation prompt/config templates. They are `extras`, not
  default core automation. Reference excludes `automations/` in its upstream
  metadata. Retain immutable thread coordinates, trust-qualified triage markers,
  dedupe, compensation when posting fails, configured budgets, real UI evidence,
  and draft-only bounded fixes. No source message, ticket, automation, secret or
  PR was created. Cursor settings/routine steps remain source-host procedures,
  not an authorization to configure an OMS host.
- `oms-enhanced-delivery` and its 10 references preserve earlier OMS frozen
  delivery, independent synthesis/root checks and artifact attribution **only
  when selected**. Its own entry says so at `:8-15`; parity tests assert the
  default How/Interrogate workflows do not acquire these stages. Retain this
  separation. It is an active optional historical implementation, not a dead
  archive or a reason to expand every upstream workflow.
- `poteto-help`'s prompting/recipe resources retain prompt-shaped help and the
  plan-only/execute distinction, subject to W4. TypeScript's 328-line patterns
  reference preserves the newer official constructive modeling, total types,
  schema-derived boundaries and object-argument examples. Retain it over an
  older reference merely because the secondary is also a port.

`src/core/project.json` owns OMS identity/version. `skill-catalog.json` owns
distribution, audience and resource/role ownership. `upstream/imports.json` and
`upstream/semantic-derivations.json` now point to the exact parity manifest and
label pre-strict records historical. The active manifest has 181 outputs from
158 unique official sources, including the 23 promoted playbooks and two role
bodies. There are 307 declared replacements across frontmatter, path, tool,
model, authorization and naming categories, with no active policy replacement.
Keep historical semantic receipts as provenance; do not resurrect their old
default stages or hand-edit generated bodies. AIHero source-selected extensions
are cataloged, but their module implementations are outside the parent's 109
workflow-track checklist and are owned by its other audit track. The related
source-resource fixture suite was run only as a distribution-boundary check.

## Executed checks and limits

All commands below ran in `S/`. No source/generated files, dependencies,
installation, credentials, model accounts, Git history or external state were
changed by this unit. Existing tests use and remove temporary fixture trees.

| Command/probe | Exit | Decisive output and meaning |
| --- | --- | --- |
| `node tools/derive-pstack.mjs --check` | 0 | `181 exact derivations verified`; declaration consistency only. |
| `node --test tests/parity-contract.test.mjs tests/public-skill-matrix.test.mjs tests/pstack-01525.test.mjs tests/source-inventory.test.mjs` | 0 | 15 passed, 0 failed. The last supplied pattern matched no test file; no source-inventory test coverage is claimed. |
| `node --test tests/skill-directory.test.mjs tests/markdown-links.test.mjs` | 0 | 18 passed, 0 failed; documentation/parser fixtures, not every prose/code-block path. |
| `node --test tests/portable-helpers.test.mjs tests/show-work.test.mjs tests/pstack-01523.test.mjs tests/source-skills.test.mjs` | 0 | 17 passed, 0 failed; exact helper references, package-aware plan checker and selected-source resource preservation. |
| `node --test src/core/skills/statechart/scripts/test/statechart.test.mjs` | 0 | 67 tests: 29 passed, 38 skipped, 0 failed. TLC-dependent cases say `cannot find TLC`. |
| W1 read-only invariant probe | 1, expected defect reproduction | `AssertionError: eval: promoted path corrupts agent-transcripts/`. |
| W3 in-memory valid/BOM/nested-fence probe | 0 harness; checker 0/1/1 | Healthy fixture accepted; BOM and nested-code false rejections reproduced. |
| Direct import of secondary `tools/sync.mjs` and `tools/generate.mjs` | 1 | `ERR_MODULE_NOT_FOUND: Cannot find package 'typebox'`; no install or secondary generator acceptance run. Used a labelled read-only comparison aid instead. |
| Inventory/file comparison | 0 | 109 modules / 352 files, no observed drift at comparison point. |
| Report JSON inventory/path validation | 0 | Exactly 109 unique workflow IDs, required fields, 98 Skills, 10 roles and core metadata; every official path exists in the receipt and every reference path exists at the fixed checkout. |
| Direct `markdownlint/promise` check of this report with `.markdownlint-base.json` configuration | 0 | `{"reportsLinted":1,"issues":0}`. The CLI invocation returned 0 but reported 0 linted files; the direct string check avoids treating that as coverage. |

Full `npm run check` and parent-owned coverage-tool validation were not run by
this unit. No live workflow, model dispatch, native role sandbox, watcher, merge,
UI drive, automation or full formal model-checker acceptance is claimed. The
retention decisions are scoped judgments based on compared contracts, source
and focused fixtures; they are not a claim of universal optimality or an
exhaustive correctness proof of every imported helper. The coordinator owns any
adoption registry updates, implementation, regeneration and integrated checks.

## Per-module decision appendix

The following JSON contains exactly the parent's 109 workflow module IDs.
`retain` means retain the current scoped contract; `adapt` means the report
identifies a proposed follow-up, **not an already adopted fix**; `local-only`
identifies a local contract without an equivalent source module. Counterpart
arrays list actual fixed-revision files, including all mapped resources that
belong to a module, rather than fabricated path equivalents for `skill.json`.
Empty arrays have explicit searched-scope explanations in the corresponding
rationale. Host-only metadata remains local even when a workflow body derives
from a counterpart. The parent supplies final file hashes after any fixes.

```json
{
  "moduleDecisions": [
    {
      "id": "core-metadata",
      "decision": "retain",
      "officialPaths": [
        "pstack/.cursor-plugin/plugin.json",
        "pstack/plugin.json"
      ],
      "referencePaths": [
        "plugins/pstack/.claude-plugin/plugin.json",
        "tools/generate.mjs",
        "tools/upstream.json"
      ],
      "rationale": "Keep OMS project identity, the 85-public/12-probe source partition, explicit extension ownership and role/resource distribution; historical semantic manifests remain receipts rather than active workflow policy.",
      "officialRationale": "Compared official package identity/manifests; pstack has no src/core project/catalog schema counterpart. OMS audience, extension, reference and role ownership metadata is local.",
      "referenceRationale": "Compared fixed secondary manifest and generation/frontmatter policy; no equivalent OMS core catalog schema. Its hidden principles and auto-on routing are deliberate alternatives, not adopted defaults."
    },
    {
      "id": "role:comment-sicko",
      "decision": "retain",
      "officialPaths": [
        "pstack/agents/comment-sicko.md"
      ],
      "referencePaths": [
        "plugins/pstack/agents/comment-sicko.md"
      ],
      "rationale": "Keep comment-only deletions, exact protected exceptions and scoped MUST KILL targets; no application-code edits or independent final acceptance.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "role:design-runner",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep independent design-artifact-only writes at assigned paths, evidence/tradeoffs and no implementation or winner selection.",
      "officialRationale": "Searched all fixed pstack/agents files (only comment-sicko and poteto-agent) and workflow prompt templates. No separate canonical role definition with this contract; local bounded role metadata/instructions are intentional.",
      "referenceRationale": "Searched fixed plugins/pstack/agents and workflow references. Its two pstack agents and bundled Thermos agents are not equivalents of this local bounded role. Retain the local contract without fabricating a role mapping."
    },
    {
      "id": "role:evidence-reader",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep one bounded source, exact attributable evidence, no scope expansion and bounded-evidence-only marker.",
      "officialRationale": "Searched all fixed pstack/agents files (only comment-sicko and poteto-agent) and workflow prompt templates. No separate canonical role definition with this contract; local bounded role metadata/instructions are intentional.",
      "referenceRationale": "Searched fixed plugins/pstack/agents and workflow references. Its two pstack agents and bundled Thermos agents are not equivalents of this local bounded role. Retain the local contract without fabricating a role mapping."
    },
    {
      "id": "role:explainer",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep current-code/frozen-finding explanation, citation contradiction resolution and no file writes or explorer contact.",
      "officialRationale": "Searched all fixed pstack/agents files (only comment-sicko and poteto-agent) and workflow prompt templates. No separate canonical role definition with this contract; local bounded role metadata/instructions are intentional.",
      "referenceRationale": "Searched fixed plugins/pstack/agents and workflow references. Its two pstack agents and bundled Thermos agents are not equivalents of this local bounded role. Retain the local contract without fabricating a role mapping."
    },
    {
      "id": "role:explorer",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep one assigned question/angle, real implementation and boundary evidence, no other-explorer contact or final synthesis.",
      "officialRationale": "Searched all fixed pstack/agents files (only comment-sicko and poteto-agent) and workflow prompt templates. No separate canonical role definition with this contract; local bounded role metadata/instructions are intentional.",
      "referenceRationale": "Searched fixed plugins/pstack/agents and workflow references. Its two pstack agents and bundled Thermos agents are not equivalents of this local bounded role. Retain the local contract without fabricating a role mapping."
    },
    {
      "id": "role:implementer",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep exact file ownership, executable focused checks, preservation of others edits and no integration/publication/final acceptance.",
      "officialRationale": "Searched all fixed pstack/agents files (only comment-sicko and poteto-agent) and workflow prompt templates. No separate canonical role definition with this contract; local bounded role metadata/instructions are intentional.",
      "referenceRationale": "Searched fixed plugins/pstack/agents and workflow references. Its two pstack agents and bundled Thermos agents are not equivalents of this local bounded role. Retain the local contract without fabricating a role mapping."
    },
    {
      "id": "role:poteto-agent",
      "decision": "retain",
      "officialPaths": [
        "pstack/agents/poteto-agent.md"
      ],
      "referencePaths": [
        "plugins/pstack/agents/poteto-agent.md"
      ],
      "rationale": "Keep the full selected installed mode read and parent-owned playbook/lifecycle; use native package discovery rather than unrelated highest-version cache selection.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "role:reviewer",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep independent frozen scope/intent/rubric, untrusted reviewed content, no reviewer collusion and no write authority.",
      "officialRationale": "Searched all fixed pstack/agents files (only comment-sicko and poteto-agent) and workflow prompt templates. No separate canonical role definition with this contract; local bounded role metadata/instructions are intentional.",
      "referenceRationale": "Searched fixed plugins/pstack/agents and workflow references. Its two pstack agents and bundled Thermos agents are not equivalents of this local bounded role. Retain the local contract without fabricating a role mapping."
    },
    {
      "id": "role:synthesizer",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep frozen attribution/confidence and workflow-required citation spot-checks, distinguishing frozen review from historical evidence investigation.",
      "officialRationale": "Searched all fixed pstack/agents files (only comment-sicko and poteto-agent) and workflow prompt templates. No separate canonical role definition with this contract; local bounded role metadata/instructions are intentional.",
      "referenceRationale": "Searched fixed plugins/pstack/agents and workflow references. Its two pstack agents and bundled Thermos agents are not equivalents of this local bounded role. Retain the local contract without fabricating a role mapping."
    },
    {
      "id": "role:trail-reviewer",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep only the frozen decision trail and assigned attributable evidence, exact row flags, transcript/model limits and no implementation redo.",
      "officialRationale": "Searched all fixed pstack/agents files (only comment-sicko and poteto-agent) and workflow prompt templates. No separate canonical role definition with this contract; local bounded role metadata/instructions are intentional.",
      "referenceRationale": "Searched fixed plugins/pstack/agents and workflow references. Its two pstack agents and bundled Thermos agents are not equivalents of this local bounded role. Retain the local contract without fabricating a role mapping."
    },
    {
      "id": "skill:architect",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/architect/SKILL.md",
        "pstack/skills/architect/references/design-red-flags.md",
        "pstack/skills/architect/references/rationale-template.md",
        "pstack/skills/architect/references/runner-prompt.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/architect/SKILL.md",
        "plugins/pstack/skills/architect/references/design-red-flags.md",
        "plugins/pstack/skills/architect/references/rationale-template.md",
        "plugins/pstack/skills/architect/references/runner-prompt.md"
      ],
      "rationale": "Preserve grounding, two structurally distinct candidates, opt-in checkpoint and authorized implementation; W5 proposes reconciliation in the existing rationale, not another gate.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:arena",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/arena/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/arena/SKILL.md"
      ],
      "rationale": "Preserve identical candidate briefs, isolated outputs, independent cross-judge, rubric-based pick/graft/verify and explicit dropouts; do not import the secondary four-model default panel.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:authoring-a-skill",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/authoring-a-skill.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md"
      ],
      "rationale": "Preserve authoring voice, structural validation and subjective-test exception; resolve the host authoring tool and publication authority instead of assuming a foreign bundled tool.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:automate-me",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/automate-me/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/automate-me/SKILL.md"
      ],
      "rationale": "Preserve scoped history mining, repeat-run edits, user-specific evidence and draft feedback; keep personal Skill placement and publication under existing authority.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:autonomous-run",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/autonomous-run.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/autonomous-run.md"
      ],
      "rationale": "Preserve a checkable predicate, evidence-sized iterations, native wakes, checkpointing and explicit dead ends; no borrowed Claude loop or unrequested scope growth.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:autopilot-full",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/autopilot-full.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/autopilot-full.md"
      ],
      "rationale": "Retain explicitly authorized owner landing and root independent verification; consider scoped revision/lifecycle evidence, but reject universal operator clicks, a new owner-count approval and a fixed two-round ceiling.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:autopilot-stack",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/autopilot-stack.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/autopilot-stack.md"
      ],
      "rationale": "Retain root-only topology and operator landing; W5 proposes head/base/patch evidence and safe pending-merge handling through the existing forge boundary.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:babysit",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/babysit.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/babysit.md"
      ],
      "rationale": "Preserve mode declaration, frontier-only work and no topology changes; propose first-read target/frontier identity and explicit behind-base handoff without a second polling loop.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:benchmark-checklist",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/benchmark-checklist/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/benchmark-checklist/SKILL.md"
      ],
      "rationale": "Preserve limiter, tuning, error/work-occurrence, repeated alternating runs and end-to-end relevance; one user-requested ballpark remains labelled as one run.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:blast-radius",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/blast-radius/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/blast-radius/SKILL.md"
      ],
      "rationale": "Retain executable consumer census and load-bearing safe-because proof; W5 proposes applying it to asserted existing behavior before design.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:bro",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/bro/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/bro/SKILL.md"
      ],
      "rationale": "Keep the last-message plain-language restatement task; the secondary trigger wording adds discoverability, not a different workflow.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:bug-fix",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/bug-fix.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/bug-fix.md"
      ],
      "rationale": "Keep real-surface reproduction, mechanism proof, bounded delegation and verification; propose decisive failure/pass excerpts instead of irrelevant full log dumps.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:check-cancellation",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain stale-generation rejection and observed terminal-status evidence; this controlled probe does not establish live cancellation merely from an acknowledgement.",
      "officialRationale": "Searched fixed pstack/skills, agents and helper/test resources for this installation/capability probe contract; no canonical Skill counterpart. Local marker assets and controlled invariants intentionally remain probe-only.",
      "referenceRationale": "Searched fixed plugins/pstack/skills, agents and tests for the same probe contract. Host/helper fixtures are adjacent evidence, not equivalent four-session, stale-replay, interaction or isolation probe Skills."
    },
    {
      "id": "skill:check-custom-role",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain one actual generated role, no expected-marker injection or fallback role, attributable metadata and root reread; a policy footer alone is insufficient evidence.",
      "officialRationale": "Searched fixed pstack/skills, agents and helper/test resources for this installation/capability probe contract; no canonical Skill counterpart. Local marker assets and controlled invariants intentionally remain probe-only.",
      "referenceRationale": "Searched fixed plugins/pstack/skills, agents and tests for the same probe contract. Host/helper fixtures are adjacent evidence, not equivalent four-session, stale-replay, interaction or isolation probe Skills."
    },
    {
      "id": "skill:check-delegation",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain one bounded child, child-only asset, collected result and independent root reread; no live child was spawned in this audit.",
      "officialRationale": "Searched fixed pstack/skills, agents and helper/test resources for this installation/capability probe contract; no canonical Skill counterpart. Local marker assets and controlled invariants intentionally remain probe-only.",
      "referenceRationale": "Searched fixed plugins/pstack/skills, agents and tests for the same probe contract. Host/helper fixtures are adjacent evidence, not equivalent four-session, stale-replay, interaction or isolation probe Skills."
    },
    {
      "id": "skill:check-follow-up",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain same-worker retained state across two turns without rereading the seed; do not substitute a fresh child and call it follow-up conformance.",
      "officialRationale": "Searched fixed pstack/skills, agents and helper/test resources for this installation/capability probe contract; no canonical Skill counterpart. Local marker assets and controlled invariants intentionally remain probe-only.",
      "referenceRationale": "Searched fixed plugins/pstack/skills, agents and tests for the same probe contract. Host/helper fixtures are adjacent evidence, not equivalent four-session, stale-replay, interaction or isolation probe Skills."
    },
    {
      "id": "skill:check-interaction",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain actual user-supplied answers and explicit unavailable-mode result; a recommendation or timeout never counts as consent or a response.",
      "officialRationale": "Searched fixed pstack/skills, agents and helper/test resources for this installation/capability probe contract; no canonical Skill counterpart. Local marker assets and controlled invariants intentionally remain probe-only.",
      "referenceRationale": "Searched fixed plugins/pstack/skills, agents and tests for the same probe contract. Host/helper fixtures are adjacent evidence, not equivalent four-session, stale-replay, interaction or isolation probe Skills."
    },
    {
      "id": "skill:check-model-routing",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain observed distinct model/effort and independently reported runtime metadata; do not claim enforcement from a requested setting or child self-report.",
      "officialRationale": "Searched fixed pstack/skills, agents and helper/test resources for this installation/capability probe contract; no canonical Skill counterpart. Local marker assets and controlled invariants intentionally remain probe-only.",
      "referenceRationale": "Searched fixed plugins/pstack/skills, agents and tests for the same probe contract. Host/helper fixtures are adjacent evidence, not equivalent four-session, stale-replay, interaction or isolation probe Skills."
    },
    {
      "id": "skill:check-panel",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain exactly two candidates then fresh reviewer and synthesizer over frozen results, with no terminal retries; this is a probe-specific four-session contract.",
      "officialRationale": "Searched fixed pstack/skills, agents and helper/test resources for this installation/capability probe contract; no canonical Skill counterpart. Local marker assets and controlled invariants intentionally remain probe-only.",
      "referenceRationale": "Searched fixed plugins/pstack/skills, agents and tests for the same probe contract. Host/helper fixtures are adjacent evidence, not equivalent four-session, stale-replay, interaction or isolation probe Skills."
    },
    {
      "id": "skill:check-parallel",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain starting both workers before waiting, separate attribution and root reread; two sequential completions do not prove concurrency.",
      "officialRationale": "Searched fixed pstack/skills, agents and helper/test resources for this installation/capability probe contract; no canonical Skill counterpart. Local marker assets and controlled invariants intentionally remain probe-only.",
      "referenceRationale": "Searched fixed plugins/pstack/skills, agents and tests for the same probe contract. Host/helper fixtures are adjacent evidence, not equivalent four-session, stale-replay, interaction or isolation probe Skills."
    },
    {
      "id": "skill:check-resources",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain Skill-relative reference, payload and renderer without recreation/install fallback; the renderer reads its own asset through import.meta.url.",
      "officialRationale": "Searched fixed pstack/skills, agents and helper/test resources for this installation/capability probe contract; no canonical Skill counterpart. Local marker assets and controlled invariants intentionally remain probe-only.",
      "referenceRationale": "Searched fixed plugins/pstack/skills, agents and tests for the same probe contract. Host/helper fixtures are adjacent evidence, not equivalent four-session, stale-replay, interaction or isolation probe Skills."
    },
    {
      "id": "skill:check-stale-replay",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain generation-labelled same-worker controlled late replay and stale rejection; unsupported resume remains a limitation rather than a fabricated late delivery.",
      "officialRationale": "Searched fixed pstack/skills, agents and helper/test resources for this installation/capability probe contract; no canonical Skill counterpart. Local marker assets and controlled invariants intentionally remain probe-only.",
      "referenceRationale": "Searched fixed plugins/pstack/skills, agents and tests for the same probe contract. Host/helper fixtures are adjacent evidence, not equivalent four-session, stale-replay, interaction or isolation probe Skills."
    },
    {
      "id": "skill:check-transcript",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain separate delivered result and ordinary-message transcript evidence, assignment/read attribution and root reread; rereading a result is not transcript retrieval.",
      "officialRationale": "Searched fixed pstack/skills, agents and helper/test resources for this installation/capability probe contract; no canonical Skill counterpart. Local marker assets and controlled invariants intentionally remain probe-only.",
      "referenceRationale": "Searched fixed plugins/pstack/skills, agents and tests for the same probe contract. Host/helper fixtures are adjacent evidence, not equivalent four-session, stale-replay, interaction or isolation probe Skills."
    },
    {
      "id": "skill:check-writer-isolation",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain one controlled writer fixture, runtime isolation evidence and unchanged source checkout; a different manually named directory is not proof of runtime isolation.",
      "officialRationale": "Searched fixed pstack/skills, agents and helper/test resources for this installation/capability probe contract; no canonical Skill counterpart. Local marker assets and controlled invariants intentionally remain probe-only.",
      "referenceRationale": "Searched fixed plugins/pstack/skills, agents and tests for the same probe contract. Host/helper fixtures are adjacent evidence, not equivalent four-session, stale-replay, interaction or isolation probe Skills."
    },
    {
      "id": "skill:correct",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/correct/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/correct/SKILL.md"
      ],
      "rationale": "Retain architecture/types/lint/test before prose and a real past-mistake negative control; do not expand a correction into an unrelated redesign.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:create-formal-verification-skill",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/create-formal-verification-skill/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/create-formal-verification-skill/SKILL.md"
      ],
      "rationale": "Retain code-anchored bounded properties, ability-to-fail, counterexamples and verification-only edits; secondary naming warnings are conditional on its different UI-driver name.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Fixed secondary substitutions distinguish formal checks from its project verify UI driver. OMS uses verify-<app>; retain scoped formal checking and avoid copying the foreign fixed-name convention."
    },
    {
      "id": "skill:create-verification-skill",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/create-verification-skill/SKILL.md",
        "pstack/skills/create-verification-skill/references/feature-map-example/README.md",
        "pstack/skills/create-verification-skill/references/feature-map-example/create-note.md",
        "pstack/skills/create-verification-skill/references/feature-map-example/search.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/create-verification-skill/SKILL.md",
        "plugins/pstack/skills/create-verification-skill/references/feature-map-example/README.md",
        "plugins/pstack/skills/create-verification-skill/references/feature-map-example/create-note.md",
        "plugins/pstack/skills/create-verification-skill/references/feature-map-example/search.md"
      ],
      "rationale": "Retain verify-<app>, launch/doctor/drive/evidence/cleanup and one proved mapped feature; reject renaming every generated driver to verify merely to shadow a Claude built-in.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:eval",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/eval.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/eval.md"
      ],
      "rationale": "Retain isolated candidate conditions and transcript-based chain grading; fix W1's corrupted promoted transcript directory without changing the canonical evaluation stages.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:feature",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/feature.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/feature.md"
      ],
      "rationale": "Retain named data shape, design exploration when shapes differ, bounded code-writing delegation and independent lead review; use actual host isolation, not secondary remote-default assumptions.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:figure-it-out",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/figure-it-out/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/figure-it-out/SKILL.md"
      ],
      "rationale": "Retain task-scaled bespoke playbook, predicate and hypothesis loop with audit trail; no extra fixed reference strategy or blanket approval stage.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:hillclimb",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/hillclimb.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/hillclimb.md"
      ],
      "rationale": "Retain baseline/metric/hypothesis loop and accepted-win evidence; do not confuse an unmeasured change with an improvement or relax the target to finish.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:how",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/how/SKILL.md",
        "pstack/skills/how/references/explainer-prompt.md",
        "pstack/skills/how/references/explorer-prompt.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/how/SKILL.md",
        "plugins/pstack/skills/how/references/explainer-prompt.md",
        "plugins/pstack/skills/how/references/explorer-prompt.md"
      ],
      "rationale": "Retain simple one-explainer path, complex bounded explorers then explainer, and light parent presentation edits; no optional enhanced root acceptance stages by default.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:in-your-own-words",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/in-your-own-words/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/in-your-own-words/SKILL.md"
      ],
      "rationale": "Retain the concise user-goal restatement as an explicit task, without implementation or new questioning stages.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:interrogate",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/interrogate/SKILL.md",
        "pstack/skills/interrogate/references/code-quality-review.md",
        "pstack/skills/interrogate/references/lead-judgment.md",
        "pstack/skills/interrogate/references/reviewer-prompt.md",
        "pstack/skills/interrogate/references/rubric.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/interrogate/SKILL.md",
        "plugins/pstack/skills/interrogate/references/code-quality-review.md",
        "plugins/pstack/skills/interrogate/references/lead-judgment.md",
        "plugins/pstack/skills/interrogate/references/reviewer-prompt.md",
        "plugins/pstack/skills/interrogate/references/rubric.md"
      ],
      "rationale": "Retain independent reviewers, same frozen intent/rubric and root lead judgment; W2 proposes repairing fallback metadata so root passes cannot replace the required independent verdict.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:investigation",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/investigation.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/investigation.md"
      ],
      "rationale": "Retain a cited answer and read-only scope, routing How/Why or evidence work as needed; a question is not implementation authority.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:ketchup",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/ketchup/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/ketchup/SKILL.md"
      ],
      "rationale": "Retain read-only current-chat catch-up, every real user-owned call, honest risk and actual captured visuals; prefer the newer official body over older secondary wording.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:maintain-formal-verification-skill",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/maintain-formal-verification-skill/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/maintain-formal-verification-skill/SKILL.md"
      ],
      "rationale": "Retain sync/updated/bug/blocked outcomes, every covered-code change and explicit property-change evidence; no weakening a failing property or editing product code by default.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Fixed secondary substitutions distinguish formal checks from its project verify UI driver. OMS uses verify-<app>; retain scoped formal checking and avoid copying the foreign fixed-name convention."
    },
    {
      "id": "skill:maintain-verification-skill",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/maintain-verification-skill/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/maintain-verification-skill/SKILL.md"
      ],
      "rationale": "Retain one source reader per mapped feature and coordinator-owned live driving, doctor/residue/evidence rules and verification-directory edit scope.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:make-bot-ui",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/make-bot-ui/SKILL.md"
      ],
      "referencePaths": [],
      "rationale": "Retain the source workflow as host-gated instructions with untrusted body and private secret handling; source routine/SendToUser/Tailscale commands are not generic OMS host capabilities.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Searched fixed plugins/pstack/skills/make-bot-ui and tools/upstream.json; the component explicitly excludes this Skill. No canonical counterpart. Preserve only host-supported authorized webhook behavior, not source routine APIs."
    },
    {
      "id": "skill:multi-phase-plan",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/multi-phase-plan.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md"
      ],
      "rationale": "Retain plan-only unit/live/perf checklist and execution-playbook authority; W3 proposes portable parser fixes only, not secondary store/model/landing-policy changes.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:no-comments",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/no-comments/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/no-comments/SKILL.md"
      ],
      "rationale": "Retain comment-only worker, exact exception proof, scoped root-cause fixes and existing constraint-encoding authority; do not import unrelated Thermos review stages.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:oms-auto",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain separate opt-in routing status gate, explicit Skill/child precedence, no implicit publication/delegation authority and labelled simple-path limits; reject auto-on reference routing.",
      "officialRationale": "Searched fixed pstack/skills and setup/mode entries; no equivalent opt-in switch-first automatic routing Skill. This is a local entry whose authority comes only from the actual user request.",
      "referenceRationale": "Searched fixed plugins/pstack/skills and routing setup/hook contracts. SessionStart mandate and default-on sheet hooks are a different policy, not a counterpart to OMS opt-in routing."
    },
    {
      "id": "skill:oms-enhanced-delivery",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain the active historical frozen-delivery and extra attribution/review contracts only when explicitly selected or required by the repository; no default-workflow stage expansion.",
      "officialRationale": "Searched fixed pstack/skills workflow and reference contracts; no equivalent optional frozen-delivery extension. Prior OMS extra stages remain local and explicitly selected, not default official behavior.",
      "referenceRationale": "Searched fixed plugins/pstack/skills and references; no equivalent optional OMS frozen-delivery/attribution extension. Native review helpers do not constitute this stronger historical delivery contract."
    },
    {
      "id": "skill:opening-a-pr",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/opening-a-pr.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/opening-a-pr.md"
      ],
      "rationale": "Retain current hygiene and publication gates; propose checking actual live writer ownership before shipping a tree, without stopping unrelated read-only work or trusting completion notifications as exit proof.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:orchestrate",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/orchestrate.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/orchestrate.md"
      ],
      "rationale": "Retain program-level coordinator ownership, durable units/ledger/inbox/gates and host-specific lifecycle; reject a fixed Claude store or worker nesting assumption as a universal model.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:pause-safely",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/pause-safely.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/pause-safely.md"
      ],
      "rationale": "Retain explicit pause-only safe boundary; propose discoverable durable checkpoint/requested-artifact preservation through the host rather than mandatory reference resume.mjs.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:perf-issue",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/perf-issue.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/perf-issue.md"
      ],
      "rationale": "Retain measured baseline, limiter/mechanism proof and matching-surface after measurement; no unearned speedup claim or speculative fix.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:poteto-help",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-help/SKILL.md",
        "pstack/skills/poteto-help/references/prompting.md",
        "pstack/skills/poteto-help/references/recipes.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-help/SKILL.md",
        "plugins/pstack/skills/poteto-help/references/prompting.md",
        "plugins/pstack/skills/poteto-help/references/recipes.md"
      ],
      "rationale": "Retain help without execution and work requests with execution; W4 proposes host/catalog precedence for setup, routing and invocation statements while retaining fixed official provenance.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:poteto-mode",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-mode/SKILL.md",
        "pstack/skills/poteto-mode/playbooks/authoring-a-skill.md",
        "pstack/skills/poteto-mode/playbooks/autonomous-run.md",
        "pstack/skills/poteto-mode/playbooks/autopilot-full.md",
        "pstack/skills/poteto-mode/playbooks/autopilot-stack.md",
        "pstack/skills/poteto-mode/playbooks/babysit.md",
        "pstack/skills/poteto-mode/playbooks/bug-fix.md",
        "pstack/skills/poteto-mode/playbooks/eval.md",
        "pstack/skills/poteto-mode/playbooks/feature.md",
        "pstack/skills/poteto-mode/playbooks/hillclimb.md",
        "pstack/skills/poteto-mode/playbooks/investigation.md",
        "pstack/skills/poteto-mode/playbooks/multi-phase-plan.md",
        "pstack/skills/poteto-mode/playbooks/opening-a-pr.md",
        "pstack/skills/poteto-mode/playbooks/orchestrate.md",
        "pstack/skills/poteto-mode/playbooks/pause-safely.md",
        "pstack/skills/poteto-mode/playbooks/perf-issue.md",
        "pstack/skills/poteto-mode/playbooks/prototype.md",
        "pstack/skills/poteto-mode/playbooks/refactoring.md",
        "pstack/skills/poteto-mode/playbooks/runtime-forensics.md",
        "pstack/skills/poteto-mode/playbooks/session-pickup.md",
        "pstack/skills/poteto-mode/playbooks/shipping.md",
        "pstack/skills/poteto-mode/playbooks/trace-forensics.md",
        "pstack/skills/poteto-mode/playbooks/visual-parity.md",
        "pstack/skills/poteto-mode/playbooks/worktree-cleanup.md",
        "pstack/skills/poteto-mode/references/bugbot-triage.md",
        "pstack/skills/poteto-mode/scripts/bootstrap.ts",
        "pstack/skills/poteto-mode/scripts/bun.lock",
        "pstack/skills/poteto-mode/scripts/check-plan.mjs",
        "pstack/skills/poteto-mode/scripts/check-plan.test.ts",
        "pstack/skills/poteto-mode/scripts/orch/orch.test.ts",
        "pstack/skills/poteto-mode/scripts/orch/orch.ts",
        "pstack/skills/poteto-mode/scripts/orch/store.ts",
        "pstack/skills/poteto-mode/scripts/package.json",
        "pstack/skills/poteto-mode/scripts/watch-pr/cli.test.ts",
        "pstack/skills/poteto-mode/scripts/watch-pr/cli.ts",
        "pstack/skills/poteto-mode/scripts/watch-pr/fakes.test-helper.ts",
        "pstack/skills/poteto-mode/scripts/watch-pr/github.test.ts",
        "pstack/skills/poteto-mode/scripts/watch-pr/github.ts",
        "pstack/skills/poteto-mode/scripts/watch-pr/policy.test.ts",
        "pstack/skills/poteto-mode/scripts/watch-pr/policy.ts",
        "pstack/skills/poteto-mode/scripts/watch-pr/render.ts",
        "pstack/skills/poteto-mode/scripts/watch-pr/tsconfig.json",
        "pstack/skills/poteto-mode/scripts/watch-pr/types.compile.ts",
        "pstack/skills/poteto-mode/scripts/watch-pr/types.ts",
        "pstack/skills/poteto-mode/scripts/watch-pr/watch-pr",
        "pstack/skills/poteto-mode/scripts/worktree-audit.sh"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/SKILL.md",
        "plugins/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md",
        "plugins/pstack/skills/poteto-mode/playbooks/autonomous-run.md",
        "plugins/pstack/skills/poteto-mode/playbooks/autopilot-full.md",
        "plugins/pstack/skills/poteto-mode/playbooks/autopilot-stack.md",
        "plugins/pstack/skills/poteto-mode/playbooks/babysit.md",
        "plugins/pstack/skills/poteto-mode/playbooks/bug-fix.md",
        "plugins/pstack/skills/poteto-mode/playbooks/eval.md",
        "plugins/pstack/skills/poteto-mode/playbooks/feature.md",
        "plugins/pstack/skills/poteto-mode/playbooks/hillclimb.md",
        "plugins/pstack/skills/poteto-mode/playbooks/investigation.md",
        "plugins/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md",
        "plugins/pstack/skills/poteto-mode/playbooks/opening-a-pr.md",
        "plugins/pstack/skills/poteto-mode/playbooks/orchestrate.md",
        "plugins/pstack/skills/poteto-mode/playbooks/pause-safely.md",
        "plugins/pstack/skills/poteto-mode/playbooks/perf-issue.md",
        "plugins/pstack/skills/poteto-mode/playbooks/prototype.md",
        "plugins/pstack/skills/poteto-mode/playbooks/refactoring.md",
        "plugins/pstack/skills/poteto-mode/playbooks/runtime-forensics.md",
        "plugins/pstack/skills/poteto-mode/playbooks/session-pickup.md",
        "plugins/pstack/skills/poteto-mode/playbooks/shipping.md",
        "plugins/pstack/skills/poteto-mode/playbooks/trace-forensics.md",
        "plugins/pstack/skills/poteto-mode/playbooks/visual-parity.md",
        "plugins/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md",
        "plugins/pstack/skills/poteto-mode/references/bugbot-triage.md",
        "plugins/pstack/skills/poteto-mode/scripts/bootstrap.ts",
        "plugins/pstack/skills/poteto-mode/scripts/bun.lock",
        "plugins/pstack/skills/poteto-mode/scripts/check-plan.mjs",
        "plugins/pstack/skills/poteto-mode/scripts/check-plan.test.ts",
        "plugins/pstack/skills/poteto-mode/scripts/orch/orch.test.ts",
        "plugins/pstack/skills/poteto-mode/scripts/orch/orch.ts",
        "plugins/pstack/skills/poteto-mode/scripts/orch/store.ts",
        "plugins/pstack/skills/poteto-mode/scripts/package.json",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/cli.test.ts",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/cli.ts",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/fakes.test-helper.ts",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/github.test.ts",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/github.ts",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/policy.test.ts",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/policy.ts",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/render.ts",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/tsconfig.json",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/types.compile.ts",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/types.ts",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/watch-pr"
      ],
      "rationale": "Retain full source principles/router/stages and parent playbook ownership; W2/W5 propose scoped review/evidence/lifecycle clarifications, not auto-on hooks, fixed panels or new approval gates.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered. Additional merge-safety/resume/host-mapping resources are compared in the report; they are not assumed native OMS capabilities."
    },
    {
      "id": "skill:principle-attack-the-premise",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-attack-the-premise/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-attack-the-premise/SKILL.md"
      ],
      "rationale": "Retain writing and testing the shared premise after repeated same-premise failures before attempting another such fix.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-boundary-discipline",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-boundary-discipline/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-boundary-discipline/SKILL.md"
      ],
      "rationale": "Retain validation at external boundaries, pure business logic and domain-facing public types; no internal defensive-check proliferation.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-build-the-lever",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/principle-build-the-lever/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-build-the-lever/SKILL.md"
      ],
      "rationale": "Retain the smallest rerunnable tool; comparator controls already exist for the image implementation, while general policy clarification remains a separate optional proposal in W5.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-encode-lessons-in-structure",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-encode-lessons-in-structure/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-encode-lessons-in-structure/SKILL.md"
      ],
      "rationale": "Retain structural guardrails before repetitive instructions, with prominent examples only when the lesson cannot be encoded.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-exhaust-the-design-space",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-exhaust-the-design-space/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-exhaust-the-design-space/SKILL.md"
      ],
      "rationale": "Retain structurally distinct alternatives where shape or product feel matters, rather than making every trivial edit an arena.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-experience-first",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-experience-first/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-experience-first/SKILL.md"
      ],
      "rationale": "Retain consumer and maintainer experience as the target, keeping justified controls, polished core loop and cheap prototypes.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-explain-the-number",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-explain-the-number/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-explain-the-number/SKILL.md"
      ],
      "rationale": "Retain limiter, alternative explanations, measured run count/spread and scope; no proxy or invented performance number.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-fix-root-causes",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-fix-root-causes/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-fix-root-causes/SKILL.md"
      ],
      "rationale": "Retain first wrong decision, runtime evidence and legitimate-versus-impossible state distinction; do not outlaw valid boundary handling merely because it is a guard.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-foundational-thinking",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-foundational-thinking/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-foundational-thinking/SKILL.md"
      ],
      "rationale": "Retain data shape/scaffolding/option value and concurrency isolation, with cohesive increments rather than premature abstraction.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-guard-the-context-window",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-guard-the-context-window/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-guard-the-context-window/SKILL.md"
      ],
      "rationale": "Retain bounded bulk-evidence handling and concise attributable findings; local assignment and no-delegation limits still apply.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-laziness-protocol",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-laziness-protocol/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-laziness-protocol/SKILL.md"
      ],
      "rationale": "Retain simplifying the real work and smallest coherent mechanism, not using simplicity as an excuse to omit required evidence or review.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-make-operations-idempotent",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-make-operations-idempotent/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-make-operations-idempotent/SKILL.md"
      ],
      "rationale": "Retain convergence across retries/crashes, explicit identity and repeat-safe state transitions.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-migrate-callers-then-delete-legacy-apis",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md"
      ],
      "rationale": "Retain complete caller migration and old-API deletion in one planned wave, including textual references, not indefinite compatibility paths.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-minimize-reader-load",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-minimize-reader-load/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-minimize-reader-load/SKILL.md"
      ],
      "rationale": "Retain a clear local mental model and lower reader burden as the measure of a structural change.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-model-the-domain",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-model-the-domain/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-model-the-domain/SKILL.md"
      ],
      "rationale": "Retain a named domain shape and structure that removes branches/invalid states; boring local code remains acceptable where no abstraction earns its cost.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-never-block-on-the-human",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-never-block-on-the-human/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-never-block-on-the-human/SKILL.md"
      ],
      "rationale": "Retain authorized reversible progress and human product direction; existing external/irreversible authorization boundaries remain authoritative.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-outcome-oriented-execution",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-outcome-oriented-execution/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-outcome-oriented-execution/SKILL.md"
      ],
      "rationale": "Retain planned reversible intermediate breakage and explicit verification boundaries, not unscoped damage or a relaxed final predicate.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-prove-it-works",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/principle-prove-it-works/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-prove-it-works/SKILL.md"
      ],
      "rationale": "Retain real-artifact and rerunnable checks; W5 proposes actual failure/status/provenance evidence without adding another acceptance stage.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-redesign-from-first-principles",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-redesign-from-first-principles/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-redesign-from-first-principles/SKILL.md"
      ],
      "rationale": "Retain whole-shape integration and propagation through types/docs/examples, delivered incrementally inside the authorized fence.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-separate-before-serializing-shared-state",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md"
      ],
      "rationale": "Retain eliminating shared write targets first and real structural serialization only when sharing is an invariant; prose ownership alone is not a lock.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-sequence-verifiable-units",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-sequence-verifiable-units/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-sequence-verifiable-units/SKILL.md"
      ],
      "rationale": "Retain each small unit ending in a relevant check and ordered delivery that proves the sequence; authorization still controls commits/publication.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-subtract-before-you-add",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-subtract-before-you-add/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-subtract-before-you-add/SKILL.md"
      ],
      "rationale": "Retain complexity removal, observed usage and no speculative validation/framework, while preserving unrelated work.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-test-behavior-not-implementation",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/principle-test-behavior-not-implementation/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-test-behavior-not-implementation/SKILL.md"
      ],
      "rationale": "Retain break-behavior/change-internals discrimination; W5 considers the secondary clarification that a documented user-facing constant may itself be the promise.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:principle-type-system-discipline",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-type-system-discipline/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-type-system-discipline/SKILL.md"
      ],
      "rationale": "Retain branded semantic primitives, parsed external data and schema-derived shapes; preserve the newer official TypeScript reference.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:prototype",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/prototype.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/prototype.md"
      ],
      "rationale": "Retain throwaway isolated alternatives and matching-surface observation to decide an empirical fork; no production-code or test-framework expansion.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:prove-it-works",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain the read-only installation evidence probe and source-versus-role-footer distinction; it does not certify arbitrary workflows or duplicate the prove-it-works principle.",
      "officialRationale": "Searched fixed pstack/skills and agents for this installation evidence probe. The prove-it-works principle is about product/task verification and is not an equivalent read-only installation Skill.",
      "referenceRationale": "Searched fixed plugins/pstack/skills and tests for the installation evidence contract. Generic proof principles are not an equivalent loaded-Skill/workspace/no-edit probe."
    },
    {
      "id": "skill:recall",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/recall/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/recall/SKILL.md"
      ],
      "rationale": "Retain scoped history/shared-record/live-state reconstruction; W5 proposes project-designated-record exhaustion and original human-ruling attribution.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:refactoring",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/refactoring.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/refactoring.md"
      ],
      "rationale": "Retain a behavior pin before structure, caller migration/deletion and real equivalence evidence; reject treating a newly discovered feature as a structural cleanup.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:reflect",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/reflect/SKILL.md",
        "pstack/skills/reflect/references/divergent-reviewer.md",
        "pstack/skills/reflect/references/judgment-reviewer.md",
        "pstack/skills/reflect/references/synthesizer.md",
        "pstack/skills/reflect/references/tooling-reviewer.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/reflect/SKILL.md",
        "plugins/pstack/skills/reflect/references/divergent-reviewer.md",
        "plugins/pstack/skills/reflect/references/judgment-reviewer.md",
        "plugins/pstack/skills/reflect/references/synthesizer.md",
        "plugins/pstack/skills/reflect/references/tooling-reviewer.md"
      ],
      "rationale": "Retain current-session three-lens review and synthesis before routed edits; W5 proposes a factual transcript fallback while using native session-exact location evidence.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:reproduce-and-fix-issues",
      "decision": "retain",
      "officialPaths": [
        "pstack/automations/benny/skills/reproduce-and-fix-issues/SKILL.md",
        "pstack/automations/benny/skills/reproduce-and-fix-issues/references/control-adapter.md",
        "pstack/automations/benny/skills/reproduce-and-fix-issues/references/feature-map.example.md",
        "pstack/automations/benny/skills/reproduce-and-fix-issues/references/verify-existing-fix.md"
      ],
      "referencePaths": [],
      "rationale": "Retain extras-only trusted triage, immutable source thread, real UI repro/evidence review, rejection window, existing-fix proof and bounded draft PR; no automation or account calls here.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Searched fixed plugins/pstack/skills and automations counterparts; tools/upstream.json explicitly excludes automations/. No canonical secondary Benny counterpart; do not invent one from generic review or driver tools."
    },
    {
      "id": "skill:runtime-forensics",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/runtime-forensics.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/runtime-forensics.md"
      ],
      "rationale": "Retain live instrumentation and a cited mechanism diagnosis, not a source-only guess or unasked production fix.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:session-pickup",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/session-pickup.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/session-pickup.md"
      ],
      "rationale": "Fix W1 promoted path; retain progress reuse and real inherited-claim verification; W5 proposes checkpoint discovery and original human-ruling evidence rather than trusting an agent summary as permission.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:setup-benny",
      "decision": "retain",
      "officialPaths": [
        "pstack/automations/benny/skills/setup-benny/SKILL.md",
        "pstack/automations/benny/templates/configuration.example.yaml",
        "pstack/automations/benny/templates/reproduce-automation-prompt.md",
        "pstack/automations/benny/templates/triage-automation-prompt.md"
      ],
      "referencePaths": [],
      "rationale": "Retain extras-only configured source/tracker/control/budget preflight, preserving unrelated settings and explicit creation boundary; source-host automation prerequisites are not native installation proof.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Searched fixed plugins/pstack/skills and automations counterparts; tools/upstream.json explicitly excludes automations/. No canonical secondary Benny counterpart; do not invent one from generic review or driver tools."
    },
    {
      "id": "skill:setup-oh-my-stack",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/setup-pstack/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/setup-pstack/SKILL.md"
      ],
      "rationale": "Retain observed inventory, existing ordered panels/aliases, accepted configuration preview, project/user authority and optional verification offers; reject secondary auto-on hook and personal-instruction defaults.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:sharpen",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/sharpen/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/sharpen/SKILL.md"
      ],
      "rationale": "Retain newer official prompt-only four-part deepening and rewritten prompt; do not import the secondary's older start-the-task formulation.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Fixed secondary has the older task-starting formulation; current official prompt-only rewrite is preferred. The secondary baseline lags the OMS official revision."
    },
    {
      "id": "skill:shipping",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/shipping.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/shipping.md"
      ],
      "rationale": "Retain independent real-surface verdicts and contiguous bottom-up landing under user authority; W5 proposes applicable revision/destination/pending-merge safeguards through existing native forge owners.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:show-me-your-work",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/show-me-your-work/SKILL.md",
        "pstack/skills/show-me-your-work/references/decision-log-template.tsv",
        "pstack/skills/show-me-your-work/scripts/log.sh"
      ],
      "referencePaths": [
        "plugins/pstack/skills/show-me-your-work/SKILL.md",
        "plugins/pstack/skills/show-me-your-work/references/decision-log-template.tsv",
        "plugins/pstack/skills/show-me-your-work/scripts/log.sh"
      ],
      "rationale": "Retain append-only scoped TSV, attributable evidence and independent trail review; the shell helper remains an exact source reference, not an adopted native concurrent logger.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:statechart",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/statechart/SKILL.md",
        "pstack/skills/statechart/scripts/chart-to-tla.mjs",
        "pstack/skills/statechart/scripts/compare-charts.mjs",
        "pstack/skills/statechart/scripts/lib.mjs",
        "pstack/skills/statechart/scripts/model/OutputFolder.cfg",
        "pstack/skills/statechart/scripts/model/OutputFolder.map.mjs",
        "pstack/skills/statechart/scripts/model/OutputFolder.tla",
        "pstack/skills/statechart/scripts/statechart.mjs",
        "pstack/skills/statechart/scripts/test/statechart.test.mjs",
        "pstack/skills/statechart/scripts/test/sync.mmd",
        "pstack/skills/statechart/scripts/test/upload.mmd",
        "pstack/skills/statechart/scripts/tlc-to-chart.mjs"
      ],
      "referencePaths": [],
      "rationale": "Retain newer official user-facing charts, code-cited models, invariant counterexamples and honest model bounds; 29 local tests passed and 38 TLC cases skipped, so full execution remains unverified.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Searched fixed plugins/pstack/skills/statechart and related formal-verification Skills. No Statechart implementation exists at this reference commit; formal authoring is adjacent, not an equivalent CLI/chart implementation."
    },
    {
      "id": "skill:swarm",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/swarm/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/swarm/SKILL.md"
      ],
      "rationale": "Retain bounded parallel slices/races, each writer's own output, complete drainage and attributable results; disclose missing independence rather than claiming live multi-agent proof.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:tdd",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/tdd/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/tdd/SKILL.md"
      ],
      "rationale": "Retain cheap practical red/green checks and no test when an unsuitable harness would dominate; W5 proposes quoting the predicted failure diff rather than arbitrary red output.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:teach",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/teach/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/teach/SKILL.md"
      ],
      "rationale": "Retain an evidence-based learning/explanation task with bounded independent investigation where available; it does not grant implementation scope.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:technical-writing",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/technical-writing/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/technical-writing/SKILL.md"
      ],
      "rationale": "Retain mode/reader/sentence/ambiguity rules and the task-specific Diataxis exception; do not replace the current source with reference-specific reply formatting policy.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:trace-forensics",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/trace-forensics.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/trace-forensics.md"
      ],
      "rationale": "Retain fixed-artifact parsing, queryable shape, source-symbol attribution and paired-capture limits; no live rerun or fix unless requested.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:triage-issue-reports",
      "decision": "retain",
      "officialPaths": [
        "pstack/automations/benny/skills/triage-issue-reports/SKILL.md",
        "pstack/automations/benny/skills/triage-issue-reports/references/routing.example.md"
      ],
      "referencePaths": [],
      "rationale": "Retain extras-only source-thread preflight, attachment limits, cause-aware routing, dedupe, compensation and one trusted verdict; no repro/fix or external post was performed.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Searched fixed plugins/pstack/skills and automations counterparts; tools/upstream.json explicitly excludes automations/. No canonical secondary Benny counterpart; do not invent one from generic review or driver tools."
    },
    {
      "id": "skill:typescript-best-practices",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/typescript-best-practices/SKILL.md",
        "pstack/skills/typescript-best-practices/references/patterns.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/typescript-best-practices/SKILL.md",
        "plugins/pstack/skills/typescript-best-practices/references/patterns.md"
      ],
      "rationale": "Retain newer official constructive/total types, schemas, narrowing, exhaustive variants and object arguments; generic type discipline remains a separate principle.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:unslop",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/unslop/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/unslop/SKILL.md"
      ],
      "rationale": "Retain concrete prose-pattern removal and plain speech without dropping required evidence or task content.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:visual-parity",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/visual-parity.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/visual-parity.md"
      ],
      "rationale": "Retain immutable baseline, real image difference and one-component ownership; no baseline/harness tampering or visual acceptance inferred from compilation.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:why",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/why/SKILL.md",
        "pstack/skills/why/references/epistemics.md",
        "pstack/skills/why/references/investigator-prompt.md",
        "pstack/skills/why/references/source-playbook.md",
        "pstack/skills/why/references/sources/code-archaeology.md",
        "pstack/skills/why/references/sources/databricks.md",
        "pstack/skills/why/references/sources/datadog.md",
        "pstack/skills/why/references/sources/incident-postmortem.md",
        "pstack/skills/why/references/sources/linear.md",
        "pstack/skills/why/references/sources/notion.md",
        "pstack/skills/why/references/sources/sentry.md",
        "pstack/skills/why/references/sources/slack.md",
        "pstack/skills/why/references/synthesizer-prompt.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/why/SKILL.md",
        "plugins/pstack/skills/why/references/epistemics.md",
        "plugins/pstack/skills/why/references/investigator-prompt.md",
        "plugins/pstack/skills/why/references/source-playbook.md",
        "plugins/pstack/skills/why/references/sources/code-archaeology.md",
        "plugins/pstack/skills/why/references/sources/databricks.md",
        "plugins/pstack/skills/why/references/sources/datadog.md",
        "plugins/pstack/skills/why/references/sources/incident-postmortem.md",
        "plugins/pstack/skills/why/references/sources/linear.md",
        "plugins/pstack/skills/why/references/sources/notion.md",
        "plugins/pstack/skills/why/references/sources/sentry.md",
        "plugins/pstack/skills/why/references/sources/slack.md",
        "plugins/pstack/skills/why/references/synthesizer-prompt.md"
      ],
      "rationale": "Retain code anchor, per-available-source investigation and confidence separation; W5 proposes original human-ruling provenance and copied-summary dependence in the existing templates.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    },
    {
      "id": "skill:worktree-cleanup",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/worktree-cleanup.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md"
      ],
      "rationale": "Retain advisory native audit and active/pinned evidence; align preservation prose with already adapted reflog controls, reject disposable-file and automatic-deletion policy, and do not execute the source shell cleaner.",
      "officialRationale": "Current body/resources derive from these fixed official receipt paths. Retain task boundaries and declared host translations; local skill.json or role.json remains OMS-owned. See the module rationale and actionable findings, not hashes alone.",
      "referenceRationale": "Compared the actual fixed canonical counterpart files and applicable forks/substitutions. Mechanical tool/model/path translation is host-specific; any proposed policy delta remains unadopted unless separately registered."
    }
  ]
}
```
