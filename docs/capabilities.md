# Runtime capability model

## Why compatibility is multidimensional

Package installation, Skill discovery, subagent lifecycle behavior, and real external-system completion are different claims. A single compatibility level hides useful fallbacks and can produce impossible ordering—for example, a workflow may pass behavioral conformance through a safe cancellation fallback even when native cancellation is unavailable.

Oh My Stack therefore records delivery maturity, workflow conformance, and individual capabilities separately.

## Delivery maturity

| Level | Claim |
| --- | --- |
| `D0` | Target package validates statically |
| `D1` | Clean install, update, and uninstall complete without harming user-owned files |
| `D2` | Runtime discovers the expected Skills, agents, and optional components |
| `D3` | Explicit invocation resolves the Skill and all packaged resources |

Delivery maturity belongs to a target package on one runtime surface. It does not prove that a workflow behaves correctly.
The maturity value is cumulative: a direct observation of a later check is
recorded, but it does not advance the overall level while an earlier gate is
missing.

## Workflow conformance

| Level | Claim |
| --- | --- |
| `W0` | No live behavioral evidence |
| `W1` | Root-only or single-session workflow satisfies its fixture |
| `W2` | One delegated session executes, returns evidence, and is independently verified |
| `W3` | Panels, follow-ups, stale-generation handling, and writer isolation satisfy semantic assertions |
| `W4` | Long-running, PR, shipping, or other external-system workflow completes against a disposable real system |

Workflow conformance is assigned per playbook and fixture, not globally to a runtime. A declared fallback may satisfy a workflow when the fixture proves the same safety invariant.

## Target coordinates

Every profile and evidence record must identify:

```yaml
runtime: codex
surface: desktop # desktop | cli | ide
runtime_version: "..."
platform: macos
architecture: arm64
configuration_fingerprint: "sha256:..."
installed_providers: []
permission_profile: "..."
```

`runtime` alone is never a sufficient compatibility coordinate. OMP profiles also record the observed `task` and job-control schemas. Claude Code profiles record plugin, agent, Hook, and MCP availability separately.

## Capability status

Each capability has one status:

| Status | Meaning |
| --- | --- |
| `native` | Supplied by the runtime surface itself |
| `extension` | Supplied by an installed plugin, extension, or MCP server |
| `external` | Supplied by a separately installed CLI or service |
| `fallback` | No direct operation; a declared fallback preserves the required invariant |
| `unsupported` | Tested and unavailable with no acceptable fallback |
| `unknown` | Not yet probed |

Records also name the provider, permissions, probe, and evidence artifact. Documentation can seed a hypothesis but cannot produce a `pass` observation.

`coordination.scheduled_wake` is credited only when a later host-scheduled run
actually re-enters the workflow, validates its durable anchors, re-measures the
provider, and verifies schedule cleanup at a terminal state. Successfully
creating an active schedule is delivery evidence for the operation, but not a
passing wake. A documented feature or an untriggered schedule remains
`unknown`; a durable checkpoint may still provide an explicit fallback.

## Canonical capabilities

### Skills and resources

- `skills.discover`
- `skills.invoke.explicit`
- `skills.invoke.automatic`
- `resources.relative_paths`
- `scripts.execute`

### Agent lifecycle

- `agents.spawn`
- `agents.spawn_parallel`
- `agents.wait`
- `agents.follow_up`
- `agents.cancel`
- `agents.read_result`
- `agents.read_transcript`
- `agents.custom_roles`
- `agents.model_override`
- `agents.reasoning_override`

### Workspace

- `commands.run`
- `workspace.inspect`
- `workspace.write`
- `workspace.isolate`
- `workspace.attach_worktree`
- `workspace.transfer_patch`
- `workspace.detect_generation`

### Coordination

- `coordination.task_list`
- `coordination.structured_output`
- `coordination.peer_messages`
- `coordination.durable_state`
- `coordination.scheduled_wake`

### Interaction and integrations

- `interaction.fixed_choice`
- `interaction.free_text`
- `web.search`
- `browser.control`
- `scm.pull_requests`
- `scm.review_threads`
- `scm.merge`
- `automation.recurring`

The last group is frequently supplied by an extension or external provider. It must not be attributed to the runtime without evidence.

## Surface baseline

This is a documentation-derived research baseline, not live conformance evidence.

| Surface | Skills | Plugins | Custom/subagents | Live probe status |
| --- | --- | --- | --- | --- |
| OMP | Observed, including relative resources | Runtime package | Generated custom role, delegation, parallelism, coordinated panels, follow-up, active cancellation, completed-worker transcripts, isolated writer worktrees, role-bound model/reasoning routing, and interactive input observed | The W3 panel fixture passes; two controlled stale-replay attempts stopped before the peer-ready boundary, so W3-family coverage remains incomplete and peer messaging remains unknown; D2/D3 are observed while overall delivery remains D0 because plugin-manager D1 is unresolved |
| Codex desktop | Documented | Documented | Documented | Standalone local cron scheduled wake passes on 26.915.31945; same-thread heartbeat failed to dispatch; other families pending |
| Codex CLI | Observed, including relative resources | Documented plugin browser | Delegation, parallelism, coordinated panels, follow-up, active cancellation, child-to-parent peer messaging, controlled stale replay, external persisted-transcript reads, a managed writer worktree, direct per-worker model/reasoning routing, and experimental interactive input observed; generated custom role cannot be selected | D3 passes on 0.155.1, with passing evidence across every W3 semantic family; custom roles remain unsupported on the probed spawn surface |
| Codex IDE | Documented | Documented unavailable | Documented | Pending |
| Claude Code | Documented | Documented | Documented | Deferred: no local account or authenticated runtime available |

The Codex baseline is derived from the official
[Build skills](https://developers.openai.com/plugins/build/skills),
[Build plugins](https://developers.openai.com/plugins/build/plugins), and
[Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
documentation. Repository documentation must retain the observation date;
generated evidence must retain the exact runtime coordinates.

The current delegated observations prove `agents.spawn`, `agents.spawn_parallel`,
`agents.follow_up`, `agents.cancel`, `agents.wait`, and `agents.read_result`
for read-only workers. OMP additionally proves native asynchronous
background-job waiting and idle-worker revival. Codex records both follow-up
instructions in the same child thread. The cancellation fixture excludes the
cancelled generation from accepted results, but neither runtime produced a
late stale payload during the probe. Both runtimes isolate one writer from the
source checkout and independently verify its exact diff. OMP retrieves a
completed worker transcript through its native `history://` resource. Codex
CLI has no observed native transcript-read operation and instead reads the
persisted session JSONL as an external artifact; the task body is encrypted,
but its attributable assignment envelope, read command, ordinary assistant
marker, final result, and completion event remain independently visible.
The coordinated-panel fixture passes on both live CLI runtimes. It starts two
independent candidates before waiting, freezes both results before creating a
new reviewer, freezes that result before creating a distinct synthesizer, and
performs a final independent root read. OMP exposes the frozen task bodies and
results in its session records. Codex persists the lifecycle order and child
results but encrypts child assignment bodies, so exact frozen-payload equality
is not externally readable there. Codex CLI's controlled stale-replay fixture
then proves child-to-parent peer delivery, active cancellation, same-session
follow-up after interruption, receipt of the retained generation-1 marker only
after generation 2 was accepted, and rejection of that delivered stale value.
The persisted message bodies are encrypted, but tool ordering, attributable
message delivery, worker reads, session identity, terminal results, and the
absence of a second generation-1 file read are independently visible. This is
a controlled replay and does not claim a naturally racing network response.
With this result, the probed Codex CLI coordinate has passing evidence for all
W3 semantic families. OMP does not: two fresh stale-replay attempts stalled
before the generation-1 peer-ready message, with no child assistant or tool
event. That failure leaves `coordination.peer_messages` unknown instead of
proving it unsupported.

The Alpha 1 `bug-fix` fixtures additionally prove native command execution and
the same bounded workflow on both CLI runtimes. Root-only runs captured the
failing test before the edit and the passing result afterward. Delegated runs
started exactly one writer only after root reproduction and causal diagnosis;
the root then inspected real workspace state and reran the exact test. OMP
returned an isolated unapplied patch for root integration. Codex isolated the
entire run in a top-level managed worktree, while the child shared that
worktree and used the inline implementer fallback because its spawn surface
cannot select the generated custom role. These results establish W1 and W2 for
this fixture, not general bug-fixing success.

The end-to-end `interrogate` fixture composes those lifecycle operations into a
real adversarial review on both CLI runtimes. Two reviewers start before the
first wait with identical intent, source hash, rubric, and output contract;
their attributable results freeze before a distinct synthesizer starts. The
root then executes examples for every final `Act on` claim and confirms the
reviewed Git worktree is unchanged. OMP runtime metadata showed that both
reviewers and the synthesizer resolved to the same model. The Codex run exposed
no independently verifiable child model identity. Both verdicts therefore
report independent sessions but correctly decline to claim model diversity.
The Codex root also made one overly broad filename-only search outside the
fixture while looking for repository instructions; it did not read or modify
the matches, and the limitation remains in its evidence record.

The Alpha 3 `how-routing` fixture composes the explicit router with a real
multi-module explanation. OMP and Codex CLI both select
`poteto-mode -> investigation -> how`, start exactly two independent explorers
before waiting, freeze their attributable results without replacement, start
one later explainer, and finish with an independent root read of the public
entry, queue, worker, renderer, store, submitter, and integration test. Codex
also reruns the integration test with one passing test. The first OMP attempt
is deliberately retained as failing evidence because it inspected an external
installed pstack cache and created a second child generation. The hardened
fixture limits resource discovery to generated repository content and its
fresh OMP and Codex runs pass without changing the project. Codex follows the
inline-role fallback on the observed CLI surface; neither record claims model
diversity.

The routed `feature` fixture adds a matching write scenario. Both roots inspect
the existing `createReceipt -> normalizeOrder -> renderReceipt` boundary,
capture one expected failing feature test before delegation, record the frozen
`{ customer, note, items }` shape and one-writer throughput checkpoint, and
start exactly one bounded implementer. OMP runs that writer in an isolated
worktree and returns an unapplied patch for root integration. Codex isolates
the root in a managed worktree and uses its declared serialized-writer fallback
inside that checkout. Each root inspects the actual two-file diff and reruns
the identical test to two passes. The original Codex fixture checkout remains
unchanged, and neither runtime publishes external state.

The routed `refactoring` fixture proves the corresponding preservation case.
Both roots run the two-test, four-output contract before delegation, name the
duplicated trim/state/assembly reader load and the private-helper target, start
one bounded writer, and inspect the resulting one-file diff. They confirm that
only `renderTask` and `renderProject` remain exported and rerun the identical
test successfully. OMP supplies an isolated child patch; Codex uses the managed
root worktree with one serialized child. The evidence is intentionally bounded
to the fixture's only caller/test surface.

The root-only `prototype` fixture validates the scratch-directory fallback on
both runtimes. A single script exposes scan and set variants, both preserve the
same five first-seen IDs, and explicit membership-check instrumentation reports
14 versus 8 without relying on timing. The project inputs retain their hashes;
the retained scratch artifact is labeled throwaway and handed to a separate
future feature run. Codex initially rejected creation of an absent top-level
scratch directory through automatic approval review. Pre-creating and tracking
the empty repository-owned directory removes that ambiguity and the fresh run
passes; both the failure and pass remain recorded.

The `opening-a-pr` fixture validates the safe publication fallback on both CLI
runtimes. Each root derives the GitHub destination, base, head, one-commit
range, and two changed paths from real local Git state; runs the two-test check;
loads `technical-writing` and then `unslop`; and produces a complete title,
body, and exact pending `gh pr create` operation. The capability packet keeps
`scm.pull_requests` at `unknown`, so no forge, network, browser, merge, or `gh`
operation runs and no URL is invented. Both initial attempts correctly fail the
strict cleanliness assertion because their harnesses placed logs inside the
repository. Hardened reruns place all runner output outside the repository and
pass with empty Git status. The result is W1 fallback evidence only; forge
authentication, remote-head availability, ready-PR creation, and read-back are
still unverified W4 behavior.

The standalone writing fixture proves W1 document editing on both CLI
runtimes. The top-level agent reads `technical-writing` and then `unslop`, runs
the failing check before editing, rewrites only `docs/run-locally.md` as a
how-to, reviews the complete diff, and runs the same check to one pass. The
machine contract preserves the Node.js prerequisite, both commands, port 4100,
the test count, both expected outputs, the health URL, `Ctrl+C`, and their
order. The first OMP attempt exposed a weak fixture because it removed Node.js
while the old test still passed. The first Codex attempt exposed ambiguous
ownership language by trying a rejected `sudo` command after an otherwise
correct edit. Hardened reruns fix both boundaries, retain the failures, change
only the document, and use neither delegation nor publication.

The live `setup-oh-my-stack` fixture proves safe runtime-derived model
configuration at W1 on both CLI runtimes. OMP 18.2.6 normalized 124 models from
`omp models --json --no-extensions`; Codex CLI 0.155.1 normalized five models
from app-server `model/list` with hidden models excluded. Each root loaded the
generated Skill, rejected an invented model before any owned file existed,
completed a valid preview without producing output, and then applied exactly
seven native role definitions plus an inventory-bound manifest. An unrelated
marker retained its hash and strict Git status contained only the expected
generated paths. The fixture's deterministic first-eligible policy selected
one model for all workload classes, so every role records
`diversityEstablished: false`. These observations prove the package-local
configuration workflow, not user-home installation or model quality. Claude
Code collection still fails closed and remains deferred pending an
authenticated runtime.

The public-Skill matrix makes the product boundary machine-readable instead of
inferring it from naming or invocation policy. The catalog now admits 45 public
workflows and principles and marks 12 `check-*` Skills as internal probes. The
Alpha 3 live matrix covers its original public batches of 10, 10, 10, and 8
Skills. The focused `babysit`, `pause-safely`, `session-pickup`,
`autonomous-run`, `shipping`, and `orchestrate` fixtures separately prove live
loading and execution. `autopilot-stack` currently has deterministic fixture
evidence only.
The complete matrix will be refreshed after the Phase 7 catalog stabilizes.
OMP transcripts contain the
matching native
`skill://` reads;
Codex transcripts contain matching `skills.selected_skill_instructions` items
with complete project-local Skill bodies. The verifier checks exact catalog
order, canonical names, first headings, probe exclusion, and a clean fixture.
The Alpha 3 run proves D2/D3 delivery across that 38-Skill catalog snapshot,
not semantic success for every possible workflow input.

The `babysit` fixture now separates read-only check authority from mutating
drive authority. On OMP 18.2.6 and Codex CLI 0.155.1, drive mode freezes PR 23,
reproduces a pinned spacing defect, edits only the owning source file, leaves
the test unchanged, creates exactly one commit, pushes exactly one wave to a
local bare origin, refreshes the deterministic provider once to `READY`, and
stops without merging. The verifier independently checks unchanged main refs,
the one-commit range, strict clean status, the changed-path set, passing test,
provider event count, report bytes, and absent merge authority. Codex
`workspace-write` protects `.git` even when the fixture root is added, so that
failed profile is retained and the passing disposable run explicitly uses
`danger-full-access`. This proves a bounded W1 local-provider workflow, not
live forge APIs, hosted polling, conflict or stale-base handling, multi-wave
repair, `threads-only`, `background`, or W4 completion.

The session-lifecycle fixture proves an explicit pause and cold-start pickup on
OMP 18.2.8 and Codex CLI 0.155.1. One root session verifies a completed atomic
unit, records the still-failing pending unit, creates one `wip:` commit, writes
a structured checkpoint outside the worktree, verifies its exact branch, base,
head and clean-state anchors, and leaves the local origin unchanged. A distinct
root session runs the anchor validator before editing, preserves the inherited
function and tests, completes only the pending unit, creates one completion
commit, and passes combined artifact verification. The deterministic suite also
proves that unexplained dirty state is rejected. This is W1 file-checkpoint
handoff; it does not claim native session continuation, transcript or cloud-task
import, conflict recovery, or delegated W2 conformance. Codex again needs a
permission profile that can write Git metadata inside the disposable fixture.

The `autonomous-run` continuous-local fixture passes on OMP 18.2.8 and Codex
CLI 0.155.1. Before iteration one, each root fixes the predicate, measurement,
four-iteration and ten-minute budget, mutation authority, external-action
boundary, and stop conditions. The controller reveals one ready unit at a time;
each run produces exactly three ordered single-file commits, three accepted
predicate advances, and three append-only decision rows before stopping at
`3/3` without wake or publication. The deterministic negative case rejects a
batched edit to the active and future units. This is W1 evidence for ready local
work and a workspace decision-log fallback, not evidence for
`coordination.scheduled_wake`, external waiting, cold-start restart, live
deadline or cost enforcement, discard or pivot behavior, or W4 completion.

The waiting-branch fixture separately enforces an anchored runtime-issued wake
identifier, one-minute next observation, fifteen-minute absolute deadline,
maximum wake count, cold-start authority, pre-measurement checkpoint validation,
and terminal cleanup. Codex Desktop 26.915.31945 passes through a standalone
local cron automation. A later host-created task validates the checkpoint,
measures the independently released provider once, advances completion once,
confirms schedule deletion, and verifies final cleanup. This supplies native
`automation.recurring` and `coordination.scheduled_wake` evidence for that
exact desktop coordinate at W1.

Two retained failures define the boundary. A current-task heartbeat never
re-entered while its target task remained active, so same-thread wake remains
unverified. A one-minute standalone recurrence completed its first run but had
already queued a second run before deletion; that stale run performed one extra
provider measurement. The passing schedule uses a daily recurrence whose first
occurrence is the next useful minute, leaving enough time for self-deletion.
The fixture now requires every queued run to reject a non-waiting checkpoint
before provider measurement.

OMP 18.2.8 and Codex CLI 0.155.1 separately pass the W1 unavailable-wake
fallback. Both load only generated target Skills, measure the pinned provider
once, preserve `measurementCount: 1`, write a checkpoint with `automationId:
null`, `wakeCount: 0`, and `status: paused-no-wake`, and stop with no completion
report. The hardened envelope permits exactly three separate commands and no
search, async job, sleep, poll, release, Git, or publication action. A retained
OMP failure proves why this boundary matters: two exploratory searches were
backgrounded and their later results triggered a duplicate pass. These passing
records establish `coordination.durable_state` fallback behavior only;
`coordination.scheduled_wake` remains unknown on both CLI profiles. They do not
weaken the separately observed Desktop provider.

The `shipping` fixture supplies deterministic structural coverage plus live W3
evidence on OMP 18.2.8 and Codex CLI 0.155.1. Three local-provider changes freeze
exact base, head, stable patch identity, writer session, distinct native reviewer
session, and verification outcome. OMP uses three command-capable built-in
reviewers; Codex uses three persisted `fork_turns=none` reviewers with the role
contract supplied inline because that CLI surface exposes no role selector.
Both roots keep review execution delegated, land the contiguous passing prefix
one change at a time, refresh the provider after each mutation, and leave the
following `FAIL` open and unarmed. Negative cases reject an upper change before
the current bottom and a reviewed head that changes before merge. Retained live
failures also demonstrate fail-closed behavior for self-review, unavailable
worker commands, and incompatible runtime task identifiers. This does not prove
`scm.merge` on any profile, merge-when-ready, hosted queues, or W4 forge
completion.

The first deterministic `autopilot-stack` fixture freezes an explicit
build-and-stack authorization while withholding landing authority. Two owners
build disjoint branches from one target head; two distinct reviewer lanes bind
clean verdicts to each base, head, and stable patch identity. The named root is
the only topology writer: it keeps the bottom branch on `main`, rebases the tip
onto that exact parent, preserves the code verdict only across an unchanged
stable patch, and refreshes checks at the rewritten head. The verifier requires
a linear two-link chain, open and unarmed changes, unchanged `main`, and no
merge. This is structural W1 evidence; live OMP and Codex coordinator runs are
pending.

The `orchestrate` fixture supplies deterministic structural coverage plus live
W3 evidence on OMP 18.2.8 and Codex CLI 0.155.1. Both roots complete one pilot
through worker, independent review, and integration before widening the window;
bind runtime-issued identities through no-write standby turns and same-session
follow-ups; start alpha and beta before waiting; and preserve separate alpha and
beta drain boundaries. Four distinct reviewers bind verdicts to generation and
output hashes. Join receives the actual integrated dependency heads and the
fixed program closes at `4/4` with no external publication. Transcript audits
find no root `unit.mjs execute` or `unit.mjs verify` command. This does not prove
recovery after an actual coordinator restart, stale-generation reconciliation,
retry exhaustion, a human gate, authenticated external providers, or W4
completion.

Interaction is also surface-specific. OMP's interactive TUI uses `ask` and
accepts both a fixed selection and custom text, while print mode returns both
questions as pending. Codex CLI 0.155.1 exposes an experimental
`request_user_input_async` operation when
`default_mode_request_user_input` is enabled. It queues a question card whose
answers arrive as user messages; non-interactive `codex exec` exposes no such
operation and follows the same explicit pending-question fallback. These
observations do not imply interaction support in Codex desktop or IDE.

The canonical `evidence-reader` role generates an OMP Markdown definition, a
Codex TOML definition, and a Claude-compatible Markdown definition from one
portable source. OMP 18.2.6 discovers and applies it, including a policy marker
that was not present in the task assignment. Codex CLI 0.155.1 can read the
project TOML, but its actual `codex exec` `spawn_agent` schema exposes no role
selector, both with and without `--ignore-user-config`. This conflicts with
the newer official custom-agent documentation and is retained as a
version-specific negative observation.

The `check-model-routing` fixture keeps concrete model identifiers out of the
portable Skill. OMP receives a probe-only `modelRoles` mapping and a generated
role definition with `thinkingLevel`; the child session records the resolved
model, thinking level, and non-fallback status. Codex CLI receives the model
and reasoning effort directly in its single spawn call; persisted parent and
child `turn_context` records independently show different model and effort
values. OMP's root invocation requested medium thinking, but its root session
serialized a null thinking-level event, so the evidence claims only the
independently observed worker override rather than complete root-reasoning
telemetry.

The isolation boundary differs by runtime. OMP creates an isolated writer
worktree and retains an unapplied patch. Codex CLI creates one managed worktree
for the root session; its writer child shares that checkout while the original
source remains clean. Codex treats `.agents` Skill content as read-only, so
writable fixtures and workflow outputs must live in project-owned paths.

Codex CLI lifecycle probes use persisted sessions inside a disposable isolated
Codex state directory. Version 0.155.1 returned `no thread with id` when the
same parallel probe ran with `--ephemeral`; delivery-only and root-only success
must not be treated as evidence that ephemeral child threads work.

The architecture-candidates conformance fixture passes on OMP 18.2.6 and Codex
CLI 0.155.1. Both runtimes froze the same three inputs, started exactly two
read-only reviewers before waiting, preserved their attributable results, then
started one new synthesizer and made a separately verified root decision for
`durable-log`. OMP uses generated native roles and an explicit root-liveness
wait because an earlier print-mode attempt disposed unfinished children. Codex
uses its declared inline-role fallback because this CLI surface exposes no
custom role selector; an earlier attempt that referenced unavailable shared
tool output is retained as a failure. Codex encrypts stored subagent task
bodies, so exact packet byte equality is supported by the root report, absence
of follow-up operations, and both complete child outputs rather than externally
readable task plaintext. Neither run establishes model diversity or benchmarks
the candidate's crash behavior and throughput.

The mixed-review conformance fixture also passes on both CLI surfaces. Its
frozen proposal contains a reachable inclusive-end regression and a tempting
but unreachable negative-`.at()` hypothesis. Two independent reviewers, one
later synthesizer, and the root all retain the former as `Act on` and dismiss
the latter because boundary validation runs first. OMP uses native generated
roles; Codex accurately reports its inline-role fallback. Failed attempts are
retained for OMP's one-word packet mismatch and Codex's initially incorrect
claim that no fallback was used.

The conflicting-writers conformance fixture passes on both CLI surfaces. OMP
records `isolated:true` on exactly two task items after a disposable runtime
configuration is read back as isolation enabled and automatic application
disabled; each writer returns one same-file patch from the frozen baseline and
the root integrates BatchWriter before RetryWriter. Codex uses its declared
serialized shared-checkout fallback inside a managed root worktree: the first
writer completes, the root inspects and verifies it, and only then does the
second writer start. Persisted session timestamps prove no overlap. Retained
OMP failures show why neither prose-only isolation nor a configuration that
auto-applies patches satisfies the boundary.

Phase 2 replaces each research or documented entry with a versioned observation. Separate profiles are created when platforms, permission modes, installed providers, or runtime versions change behavior.

## Fallback rules

- Missing parallelism may degrade to sequential independent passes only when simultaneous writers and frozen unbiased candidates are not required.
- Missing isolation requires one writer at a time. Prompt instructions are not filesystem isolation.
- Missing follow-up starts a fresh session with a consolidated standalone brief.
- Missing cancellation marks the prior generation stale and prevents its later result from being accepted.
- Missing scheduled wake disables unattended-completion claims; it does not authorize an improvised sleep loop.
- Missing model diversity is disclosed. Distinct role names do not prove distinct models or backends.
- Missing UI control prevents a claim that visible behavior was verified.
- A fallback must name the invariant it preserves and have its own fixture.

## Evidence record

```json
{
  "profile": "codex-cli",
  "fixture": "prove-it-works",
  "observedAt": "YYYY-MM-DD",
  "result": "pass",
  "claims": {
    "deliveryTarget": "D3",
    "deliveryAchieved": "D3",
    "workflowAchieved": "W1",
    "observedDeliveryChecks": ["D2", "D3"]
  },
  "capabilities": ["skills.discover", "skills.invoke.explicit"]
}
```

Evidence expires when its runtime version, surface, provider set, permission state, fixture revision, or adapter contract changes.
