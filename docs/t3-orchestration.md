# Use OMS workflows inside T3 Code

[English](t3-orchestration.md) | [简体中文](zh-CN/t3-orchestration.md)

Build a T3-selected package when T3 should own delegated workflow tasks.
Codex and Claude Code retain their native plugin formats. T3 supplies model
discovery, child tasks, result delivery, cancellation, and event tools.

## Generate a detached package

From the source checkout, run:

```bash
node tools/generate.mjs --orchestration t3 --output-root .tmp/t3
```

The selected Codex and Claude Code packages live under `.tmp/t3/packages/`.
OMP and Pi keep their native bindings. Ordinary `npm run generate` keeps the
default package contents. T3 generation requires a detached destination.
It does not update an installed plugin or change release inputs.

Select one generated package for its native host using that host's existing
local-package mechanism. Keep the selected package separate from the default
installation. Use it in a T3 thread that exposes `orchestrator_capabilities`
and `delegate_task`. Report an unavailable tool rather than interpreting a
standalone terminal session as T3.

The selected binding translates host operations. It does not add review
stages, change the pinned pstack procedure, require another model family, or
authorize external writes.

## Capture the actual catalog

Call `orchestrator_capabilities` in the current thread. Save its structured
result as JSON. The catalog lists provider instances, exact model identifiers,
typed options, and execution constraints. A listed model on a disabled provider
cannot run a child task.

Use the package's `scripts/t3-orchestration.mjs` helper to prepare local JSON
artifacts. Its commands share this interface:

```bash
node scripts/t3-orchestration.mjs COMMAND --input input.json --output output.json
```

The helper does not contact a provider or invoke T3 tools. The running agent
uses the prepared request with the actual host tool. Model identifiers remain
opaque for dispatch. Known model prefixes or explicit family assignments are
selection metadata, not independent proof of backend model identity.

Use `catalog` for a captured capability result, `configure` for a detached
resolution preview, and `resolve` for scope lookup. Use `prepare` for a child
request, `observe` for a task result, `cancel` for a cancellation request, and
`schedule` for a scheduler draft.

## Helper input reference

Each command reads one JSON object. Embed the captured `catalog` and generated
`contracts` as objects, not file-name strings. `configure`, `prepare`, and
`observe` correspond to `configureT3Resolution`, `prepareT3Delegation`, and
`observeT3Task` in the helper module.

| Command | Required input | Optional input |
| --- | --- | --- |
| `catalog` | The captured capability result itself. | None. |
| `configure` | `catalog`, `contracts`. | `preset`, `previous`, `overrides`. |
| `resolve` | Absolute `cwd`, `userRoot`. | `contracts`. |
| `prepare` | `bundleRoot`, `catalog`, `cwd`, `ownedPaths`, `task`, `runId`, `stepId`, and one of `routeName` or `roleName`. | `resolution`, `userRoot`, one-based `entry`, `round`, `originalBrief`, `priorRound`, `priorPreparedRequest`, `mode`, `timeoutMs`, `runtimeMode`, `interactionMode`, `title`, `reviewedModel`, `modelRejections`, `jobProfile`, `rejectedPreparedRequest`. |
| `observe` | `observation`, the structured task result. | `previous`, the preceding normalized observation; `prepared`, the saved delegate request. |
| `cancel` | `taskId`. | `reason`, `clientRequestId`. |
| `schedule` | `prompt`, structured `schedule`. | `title`, `enabled`, `projectId`, `currentProjectId`, `bindToCurrentThread`, `freshThreadIntent`, `clientRequestId`. |

Configuration overrides use `roles` keyed by canonical role name and `routes`
keyed by logical route name. Each route override is its complete ordered target
array. An optional `selectionPolicy` override replaces the complete selection
policy. `previous` contains the reviewed resolution whose choices you want to
retain. `prepare` reads contracts from `bundleRoot/config/t3-role-contracts.json`.

For round two and later, supply `originalBrief` and `priorRound` with `round`,
`findings`, `responses`, and `unresolvedObjections`. Retry by supplying the
saved `priorPreparedRequest` or invoking its unchanged arguments directly.
Prepared outputs contain `tool`, exact native `arguments`, and local `audit`
metadata. `--output` creates a new file and refuses to overwrite an existing one.

## Keep T3 configuration separate

T3 resolution lives at `.oh-my-stack/t3/resolution.json` in the project or
user root. The nearest project file shadows the whole user configuration.
It does not merge panel entries across scopes. Native Codex and Claude model
manifests remain independent.

Both selected installation hosts expose the same logical T3 routes. Preparing
a task reads the active T3 configuration automatically unless you supply an
explicit resolution. The optional `userRoot` input supports isolated checks.

Preview configuration into a detached file. Reusing a preset preserves saved
models, option values, panel membership, and order, including saved targets that
are now unavailable. Replace a panel explicitly to change its order or size.
Fresh panels instantiate exactly their contract's `defaultCount` independent
seats. Inherited seats are valid and receive distinct request identities.
The four default panels each contain two seats. A saved intentional empty
panel stays empty. A missing configuration prepares these inherited defaults.
The Arena judge pool still chooses one seat for a judge request.
New overrides are validated against the current catalog. Inspect availability
by preparing the selected task; preserving a saved target is not proof that it
can execute. Refreshing a catalog never silently replaces an unavailable model.

There is no configuration apply command. After an authorized setup request and
review of the complete preview, place that resolution in the selected T3 scope.
Preserve any existing user-owned file when that replacement was not requested.

Explicit choices contain `providerInstanceId`, `model`, and an `options`
object. Option values are strings or JSON booleans. Preserve `false` as a
boolean. Claude's `effort` and Codex's `reasoningEffort` are different keys.
Missing option values are unpinned and remain visible in audit metadata.
They do not establish a reproducible effort setting.

## Select cross-family reviewers predictably

The optional resolution `selectionPolicy` keeps candidate order and allowed
fallbacks explicit. For example, on a catalog listing these exact targets:

```json
{
  "roleCandidates": {
    "trail-reviewer": [
      { "providerInstanceId": "cursor", "model": "claude-opus-5-5", "options": { "effort": "high" } },
      { "providerInstanceId": "cursor", "model": "gemini-4-argon", "options": { "reasoning_effort": "high" } },
      { "providerInstanceId": "cursor", "model": "grok-4.7", "options": { "reasoning_effort": "high" } }
    ]
  },
  "fallbackTargets": []
}
```

The configured role target is tried first, followed by its ordered candidates.
`trail-reviewer` always requires a known family different from `reviewedModel`,
which defaults to the current thread's inherited model. Supply the actual
writer's model when it differs. Same-family and unknown-family candidates are
skipped; unavailable candidates retain their rejection reasons. With no
compliant candidate, preparation fails with `BLOCKED: independent review`.
This enforces the existing trail-review requirement, not an additional stage.

Known prefixes are `gpt`, `claude`, `gemini`, and `grok`, taken from the last
slash-separated model-ID segment. Provider names never determine the family.
`cursor-grok-` and `composer-` also identify the Grok family.
Unknown custom IDs require an explicit `modelFamilies` mapping when family
independence is required. Mappings cannot contradict a known prefix. They are
configuration assertions, not backend verification.

Explicit `fallbackTargets` permit another approved channel serving the same
family. Disabling a provider prevents that channel from running; it is not a
model-slug rejection. No provider is enabled and no saved target is rewritten.

Panel family minimums are optional user constraints. They are not pstack
defaults: two independently run models of the same family are valid without a
custom minimum. An explicit minimum remains enforced; inherited aliases do not
establish family diversity. A single-seat model replacement that changes family
cannot prove a complete panel's custom minimum and is blocked. Review and
configure the complete effective panel before using that custom constraint;
the helper does not infer earlier seats' substitutions from their old targets.

### Preserve upstream model-rejection fallback

Route-scoped `selectionPolicy.modelFallbacks` maps the original workflow's
defaults to exact observed T3 targets:

```json
{
  "modelFallbacks": {
    "interrogate.reviewers": {
      "strategy": "interrogate",
      "familyDefaults": {
        "claude": { "providerInstanceId": "cursor", "model": "claude-opus-5-5", "options": { "effort": "high" } }
      },
      "unknownFamilyDefault": { "providerInstanceId": "cursor", "model": "claude-opus-5-5", "options": { "effort": "high" } }
    }
  }
}
```

Use `interrogate` only for `interrogate.reviewers`. Use `arena` for
`arena.runners` or `architect.runners`. These strategies do not apply to
arbitrary roles or inherited aliases. A mapped default must belong to the
original provider when used for a rejected seat.

When no `selectionPolicy` exists, preparation derives defaults for explicit
panel seats from the current observed catalog. Configuration leaves implicit
defaults unsaved, so provider overrides and catalog changes use current defaults.
Inherited defaults need no policy.
An explicit policy replaces the whole policy and disables inferred additions.
Same-preset refresh preserves a saved policy without refreshing its targets.
It also preserves a configuration without a policy. Previously saved policies
remain authoritative because their provenance cannot be inferred.

Derived choices use runnable models on each seat's original provider only.
Within a family, another observed model is preferred over the configured slug.
Claude defaults prefer observed Opus models. Identifier distance breaks ties,
then model-ID order. Compatible configured options are retained or translated.
The unknown-family default uses observed Claude when available, then the
original host's observed model. No slug or unavailable provider is invented.

Mixed-provider panels derive separate `providerDefaults` keyed by exact provider
instance. Each value contains `familyDefaults`, `unknownFamilyDefault`, and an
optional `hostFallback`. These targets must remain on that provider.
If the original provider cannot serve the configured family, the derived
`hostFallback` uses its inherited model when advertised there, otherwise an
observed equivalent on that provider. The audit reports
`model-original-host-default` and the actual family change. It does not label a
GPT replacement as Claude or Grok. Arena equivalents then stay in the selected
default's actual family. A disabled provider remains an availability failure.

After an actual model rejection, pass `modelRejections` to `prepare`, retaining
the rejected explicit `target`, `code: "model-rejected"`, the nonempty
`rawError`, and the error's `validModelIds`. Evidence is supplied by the host;
the helper cannot independently authenticate an error string. Do not invent
rejection evidence from provider unavailability, option errors or a timeout.

The seat first tries its mapped family default. A recognized family without
a mapping or an explicit `hostFallback` is a configuration error.
Only an actually unknown family uses the mapped Reviewer A default.
If that default is also rejected, Interrogate
chooses the closest observed model among its reported valid IDs, preferring
the same family and compatible reasoning effort. Arena and Architect keep
that equivalent within the default's family. A model must also exist on the
original provider's current catalog; IDs reported by another provider do not
authorize a substitution. Replacement options use the model's advertised keys
and values. Every changed or unpinned option is disclosed in the audit.

The original seat, configured target and rejection evidence remain visible.
A replacement uses a new `stepId`; unchanged retries reuse its saved request.
This fallback does not discard an Interrogate reviewer or manufacture a
cross-family trail review. Missing valid equivalents remain unavailable.

### Preserve candidate and judge rules

Arena may proceed with N-1 when a candidate produces no output, recording the
dropout and its actual cause. Provider unavailability must be reported as such;
it is not evidence of a rejected model. Architect inherits Arena's runner
rules but still requires at least two structurally distinct design artifacts
before synthesis. A dropout cannot waive that requirement.

Arena chooses one runnable judge from its configured pool, preferring a
different family from the parent when possible. That preference is not a hard
family minimum. Trail review retains its mandatory different-family rule.

Saved configuration is structurally parsed before runtime selection so a stale
unrelated target does not prevent preparing an otherwise available task.

Prepared `audit.selection` records the configured and selected targets,
families, configuration scope, candidate rejections, and selection reason.
Invoke the prepared target unchanged. A changed choice requires a new step
identity, never a silent retry substitution. Pass `prepared` to `observe` to
retain the selection and compare it with the reported provider/model.
Report substitutions and mismatches, with the task ID; do not label an
agent-selected target as a model chosen automatically by T3. Reported names do
not establish effective reasoning effort or backend engine identity.

## Supply the intended job profile

Workflow callers supply `jobProfile` to preparation before invoking the saved
request. Older callers may omit it to retain their configured selection.
Use `{"kind":"routine","urgent":false}` for routine work, or choose
`judgment`, `hardest`, or `verification` as the kind.

Routine work lowers effort two levels. Judgment lowers it one level. Hardest
work raises it one level, capped at `max` or the highest advertised level below
`max`. An explicitly saved level above `max` remains unchanged for hardest work.
Preparation steps through advertised levels in `none`, `minimal`, `low`,
`medium`, `high`, `xhigh`, `max`, `ultra` order. A catalog
with `low`, `high`, and `max` therefore raises `high` to `max` for hardest work.
Typed effort options need a configured value or an advertised
`defaultValue`; unknown settings remain unpinned and disclosed. Multiple effort
selectors use their shared advertised levels; contradictory saved values or
defaults fail rather than producing conflicting request options.

Urgent work requests advertised fast speed. Other work requests standard speed.
Boolean `fast` and `fastMode` use `true` for fast and `false` for standard.
The `speed` select uses `fast` and `standard`. The `serviceTier` select uses
`priority` and `default`. Preparation adjusts every advertised speed key
independently and uses only advertised values.
Verification keeps configured effort and speed. Inherited aliases remain
untouched. Preparation changes typed effort or speed options when available.
For effort and speed encoded in a slug, it selects only an advertised variant
with the exact same model identity prefix and requested speed. If that speed
lacks the desired effort, preparation selects the nearest advertised effort on
the canonical ladder, preferring the lower level on a tie. When typed selectors
and slug settings coexist, preparation requires an advertised variant consistent
with both. Without one it retains the original target and records a limitation.
Routine and judgment
work never raise the configured effort. It never guesses a variant.
Missing supported settings appear in `audit.selection.jobLimitations`.

Preparation selects a permitted runnable channel before applying job settings.
The audit retains the configured origin, skipped candidates and their reasons,
and the actual channel's original target as `jobBaseTarget`. Verification keeps
that channel's options. A rejected adjustment restores those original options.

Every prepared request captures `audit.preparation.chainOrigin`: its earliest
actual channel, original target options, configured origin, and source catalog.
Save that first actual request even for verification, unchanged effort, or an
omitted profile. Reconstructed rejection receipts retain that chain origin when
the primary channel becomes runnable again. Later receipts must share it.

Save the adjusted request and actual rejection evidence. After rejection of
that selection, pass the same profile and its `modelRejections` with a new
`stepId`. Preparation retries the original configured role line, including
its original options. It does not pick another adjusted variant. Pass the saved
`rejectedPreparedRequest` to retain the rejected choice across catalog changes.
The helper binds the complete receipt and captured preparation inputs, including
task, working directory, owned paths, configuration, and assignment identity.
It reconstructs the captured request to verify the original adjustment. These
checks establish consistency; the host authenticates the rejection evidence.
If the actual channel's original line is also rejected, add that evidence before
model fallback on that channel. The captured catalog validates rejected request
provenance; the current catalog validates the new execution target. The configured
primary channel remains the audit origin.

For each later rejected target, retain its own prepared request. Put that receipt
in the corresponding `modelRejections[].preparedRequest`, keep earlier rejection
entries unchanged, retain the initial adjusted request in `rejectedPreparedRequest`,
and use a fresh `stepId`. This also covers a default model that first appeared in
a refreshed catalog. Preparation reconstructs each captured request independently;
`audit.selection.rejectionProvenance` identifies the source for each rejected
target. A current-catalog or host-reported rejection is labeled separately from
a captured prepared request. The host still authenticates actual rejection.

```js
{
  target: preparedDefault.arguments.target,
  code: "model-rejected",
  rawError: actualError,
  validModelIds: [observedReplacementId],
  preparedRequest: preparedDefault
}
```

Audit metadata preserves the configured and selected targets, profile, changed
options, and rejected job target. Independent records are still required to
prove that runtime effort or speed was enforced.

## Delegate one bounded unit

Read `config/t3-role-contracts.json` from the selected package. Choose the
named route and its one-based panel entry, or a canonical role. Prepare a
request with the complete assignment, working directory, owned output paths,
and stable run and step identifiers.

The prepared task includes the full role contract and installed Skill paths.
For `poteto-agent`, it includes the absolute entry path under the actual
`bundleRoot`, plus the complete `WORKFLOW.md` wrapper fallback and principle
leaf paths. The parent owns playbook coordination and independent review.
The child owns only its assignment and acceptance checks.
T3 children receive only their supplied task prompt. They do not inherit the
parent conversation. A role label alone is insufficient context.

Selected T3 workflow units are explicitly T3-owned. Invoke `delegate_task`
with the prepared arguments, including for same-provider work. Save the
prepared artifact and returned `taskId`. Use asynchronous execution for long
tasks. When only child work remains, end the turn and let T3 deliver the
completion notification. Read `task_status` when a result is needed mid-turn.

Retry with the same saved request and `clientRequestId`. Do not recompute a
different model choice or change the prompt under that identity. A new task
or review round has a new identity. Each later review round includes the
original brief, prior findings, responses, and unresolved objections, and
uses a new `delegate_task` call. Do not continue a review with
`t3_thread_send` on its `childThreadId`.

Writing children use separately created worktrees and exact owned paths.
Read-only instructions and a working directory are coordination constraints.
They are not an operating-system sandbox. Inspect actual write scope when
accepting artifacts.

## Read results and cancellation accurately

An exhausted wait budget does not cancel a task. Retain its `taskId` and read
its later status. A finished child turn with nested work is not completion.

The original published result remains distinct from `latestTerminal*` and
later pending child runs. Keep failures, interruption, and cancellation
visible. Inspect artifacts and run their acceptance checks independently of
the child's completion summary.

Cancel using `task_cancel` with the saved task ID. A `cancel_requested`
response acknowledges the request. Check actual task status before claiming
cancellation. A terminal original task can have later work stopped while its
published result remains readable.

Record requested model options separately from reported provider and model.
Task responses do not by themselves establish effective option enforcement.
Use native records when available and disclose missing evidence.

## Resolve portable helpers and local evidence

Read the generated runtime binding before invoking retained helpers.
The portable plan checker supports this package-aware invocation:

```bash
node "<absolute-package-root>/skills/poteto-mode/scripts/check-plan.mjs" "<absolute-plan.md>"
```

The checker validates plan structure. It does not run the plan or establish
live acceptance. The Codex binding retains bounded native GitHub helpers and
their documented gates. T3 event watches still own PR monitoring.
Other source-host scripts remain reference-only unless explicitly supported.

For worktree cleanup, inspect Git worktrees and supported host records for
active and pinned threads, child tasks, and processes. Missing usage evidence
leaves deletion candidates unresolved. Preserve cleanup approval gates.
Cursor transcript, SQLite, snapshot, and storage paths do not apply by
assumption. Do not execute the retained Cursor audit helper on T3.
Read transcripts through supported tools or authorized local records.
A task summary cannot prove complete transcript access or enforced read-only
execution. Report missing transcript and cleanup-skill capabilities.

## Associate PRs and use event watches

After authorized PR creation, immediately call `link_pull_request` with its
full URL. Link every stack layer. Before finishing PR work, inspect
`list_thread_pull_requests` and associate any missing PR from the task.

The parent thread owns PR watches. Process existing review activity first.
If the thread is settled, discover and use the actual host interface to
unsettle it before watching. Call `watch_pull_request` and end the turn.
T3 wakes the thread when checks, review activity, or conflicts change.
Do not run a parallel shell watcher. Call `unwatch_pull_request` before
handing the work back. An event wake does not authorize a merge.

Use `t3_thread_launch` or `create_threads` only when the user explicitly asks
for separate top-level conversations. A request for subagents alone does not
authorize that conversion.

## Prepare schedules only within their requested scope

Persistent scheduling requires a user request. Preparing a local draft does
not create persistent work. Use structured trigger objects, such as
`{"type":"interval","everyMs":3600000}` or
`{"type":"fixed_time","timeOfDay":"09:00","weekdays":[1,2,3,4,5]}`.
Keep booleans as booleans and omit unsupported provider or model overrides.

Same-project schedules default to the current thread. Select a fresh thread
only when the user wants one. Another project's schedule always starts a
fresh thread and cannot bind to this one. Report the returned cadence and
`nextRunAt` after an authorized creation.

Webhook requests reach the prompt through the host's documented placeholders.
For signed senders, use `request_secret` and its returned `secretRef`.
Keep credentials out of chat and local artifacts. Share only the returned
public `webhookUrl`. Its absence means no managed public tunnel is available.

## Verify on the actual browser or device

For web verification, call `preview_status` first. If no automation-capable
preview is attached, call `preview_open`. Read human-owned tabs without
operating them. Parallel children open their own tabs and retain each `tabId`.
Refresh snapshots after state changes and use observed locators. Capture
actual screenshots or recordings as evidence.

For mobile verification, call `device_list`, then `device_open` on an observed
device. Use the exact returned launcher, host configuration, and session flags
for every command. Report an unavailable platform. A responsive browser
viewport does not establish simulator or emulator acceptance.

## Check the source candidate

```bash
node --test tests/t3-orchestration.test.mjs tests/t3-generation.test.mjs
npm run check
```

Generated packages and fixtures establish local consistency. Live child
execution, return, cancellation, installation, PR watches, schedules, and UI
behavior need separate observations. The source checkout records the
implementation in `docs/acceptance/2026-10-13-t3/plan.md` and the distribution
boundary in `docs/pstack-parity.md`.

The design comparison used
[t3-pstack](https://github.com/chhoumann/t3-pstack) as a reference.
The OMS implementation follows current T3 tool contracts and retains OMS
source ownership.
