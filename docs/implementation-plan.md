# Implementation plan

The plan is ordered by proof. Each phase ends with a usable artifact and a gate. A later phase must not compensate for an unverified earlier layer.

## Phase 0: repository and provenance baseline

### Work

- Add the initial directory skeleton under `src/`, `tools/`, `tests/`, and `evals/`.
- Select the implementation runtime for generators and validators. Prefer Node.js with no production dependency unless a dependency materially reduces parser risk.
- Add MIT licensing for original project code if approved.
- Add `THIRD_PARTY_NOTICES.md` before importing any upstream content.
- Create machine-readable source, snapshot, ownership, and patch records for pstack, `pstack-claude`, `dsebban/skills`, and `oh-my-pstack`.
- Define the executable-entry inventory, Hook policy, minimum-permission policy, and user-owned configuration boundary.
- Add CI that runs formatting, unit tests, generation checks, and link validation.

### Gate

- Clean clone installs development dependencies reproducibly.
- Test and validation commands run with zero network access after installation.
- No third-party content exists without a source revision and license record.
- No executable entry point exists without an owner, permission description, and uninstall behavior.

## Phase 1: capability schema and build skeleton

### Work

- Define JSON Schema or equivalent validation for target coordinates, capabilities, canonical roles, workload classes, playbook requirements, fallbacks, and evidence records.
- Add initial profiles for OMP, Codex desktop/CLI/IDE, and Claude Code. Unprobed capabilities start as `unknown`.
- Implement a deterministic generator that can render one trivial Skill for all three targets.
- Add forbidden-token checks that reject runtime names and tool syntax in core files.
- Define each adapter through `render`, `package`, `validate`, and `probe` contracts.
- Add target validators, permission checks, and snapshot tests.

### Gate

- One source Skill generates three native package layouts.
- Running generation twice produces no diff.
- Removing a required capability or adapter mapping makes generation fail with an actionable error.
- Injecting `spawn_agent`, `hub`, `Agent`, `.codex`, `.claude`, or `.omp` into the core makes validation fail.
- A target cannot claim a documented capability as live evidence without a passing probe record.

## Phase 2: runtime probes

### Current progress

- OMP 18.2.6 and Codex CLI 0.155.1 pass discovery, explicit invocation,
  relative-resource, packaged-script, and one read-only delegated-worker
  fixtures on macOS arm64.
- The delegated-worker fixture reaches `W2`: one child-only result is
  collected, then the root independently re-reads its own evidence.
- Both runtimes also pass two-worker parallel fan-out and wait-all. OMP proves
  asynchronous background-job waiting; Codex CLI requires persisted sessions
  in an isolated state directory because its ephemeral mode cannot spawn
  usable child threads on version 0.155.1.
- Both runtimes pass same-worker follow-up with retained context. OMP wakes the
  completed worker through its hub; Codex records two turns in the same child
  thread without rereading the first-turn asset.
- Both runtimes pass active-worker cancellation and exclude the cancelled
  generation from accepted results. Neither probe delivered a late stale
  payload during that original cancellation probe.
- Both runtimes pass one-writer isolation. OMP uses an isolated task worktree
  with an unapplied retained patch; Codex CLI uses a managed top-level worktree
  shared by the writer child. Both leave the source checkout clean.
- Completed-worker transcript retrieval passes. OMP exposes a native
  `history://` resource; Codex CLI requires an external read of the persisted
  session JSONL and keeps the assignment body encrypted while retaining an
  attributable task envelope.
- One canonical read-only role now generates native definitions for all three
  targets. OMP discovers and applies the generated role. Codex CLI 0.155.1
  reads its project definition but exposes no role selector on `spawn_agent`,
  so that exact surface is recorded as unsupported rather than normalized to
  the newer documented behavior.
- Per-worker model and reasoning overrides pass on both live CLI surfaces.
  OMP resolves a probe-only role alias and `thinkingLevel`; Codex CLI applies
  both values directly at spawn. Persisted runtime metadata independently
  confirms the resolved worker values.
- Native fixed-choice and custom-text interaction passes on the interactive
  OMP and Codex CLI TUI profiles. Non-interactive OMP print mode and Codex
  `exec` pass the declared pause-and-return fallback without inventing input.
  Codex interaction is an experimental asynchronous queued-card surface;
  OMP's observed success is model-bound.
- A W3-targeted coordinated-panel fixture passes on both live CLI runtimes:
  two independent candidates start before waiting, their results freeze before
  a new reviewer, the review freezes before a distinct synthesizer, and the
  root independently verifies afterward.
- A controlled stale-replay fixture passes on Codex CLI. Generation 1 sends a
  peer-ready message, is confirmed active and cancelled, then releases its
  retained old marker through one follow-up on the same child thread only
  after generation 2 has been accepted. The parent receives but rejects the
  stale payload. Together with the panel, follow-up, and writer-isolation
  fixtures, this supplies passing evidence for every W3 semantic family on the
  probed Codex CLI coordinate. It is a controlled replay, not a naturally
  racing network response.
- The same OMP stale-replay fixture failed twice before the ready boundary.
  The generation-1 job remained reported as running, but its child transcript
  contained no assistant or tool event before provider stall/deadline. This
  leaves OMP peer messaging unknown and its overall W3 coverage incomplete;
  it does not override the separately passing OMP cancellation and follow-up
  evidence.
- Claude Code verification remains deferred until an authenticated local
  runtime is available.

### Work

- Record exact runtime surface, version, platform, configuration fingerprint, installed providers, and permission profile.
- Build minimal fixture Skills and agents for each host.
- Probe discovery, explicit invocation, relative resources, scripts, one subagent, parallel subagents, wait, follow-up, cancellation, transcript access, worktree isolation, model override, and user interaction.
- Store machine-readable evidence records under `evals/evidence/`.
- Replace assumptions in capability profiles with observed results.

### Gate

- Every capability required by the active alpha has a current pass result or an explicit fallback test.
- Runtime documentation and live behavior disagreements are recorded, not normalized away.
- No adapter instruction names an operation that the corresponding probe could not invoke.
- Codex desktop, CLI, and IDE results remain separate even when they share package content.

## Phase 3: upstream import and semantic core

### Current progress

- The pstack source is pinned at
  `6ed0f7a9504f577d7529064103cecce9be7dfc5e` and all twenty-three
  `principle-*` Skills are staged from immutable source snapshots.
- Canonical metadata preserves their explicit-only invocation policy. OMP and
  Claude-compatible packages receive generated frontmatter while Codex
  receives generated `agents/openai.yaml` policy.
- The upstream sync tool performs path and regular-file validation, immutable
  snapshots, portable transformations, denylist checks, three-way text merge,
  typed conflict reporting, transactional rollback, and two-step candidate
  acceptance. The baseline and verified pins advance only after the repository
  check command passes.
- Fixture coverage includes no-op source records, clean updates, local forks,
  non-overlapping merges, overlapping conflicts, deletion classification,
  binary rejection, denylist rejection, transactional rollback, and failed
  verification without pin advancement.

### Work

- Pin a pstack upstream commit.
- Store the imported immutable source slice and distinguish inspected, baseline, candidate, and verified revisions.
- Import the principle Skills first because they have minimal runtime coupling.
- Classify every imported file or generated region by ownership.
- Implement substitutions and denylist rules for obvious runtime bindings.
- Extract canonical roles and lifecycle protocols from `poteto-mode`.
- Implement a sync tool with dry-run, atomic writes, old/new/local derivation, three-way merge, typed conflicts, and pin advancement only after success.

### Gate

- All selected principles build for three targets without runtime tokens in core.
- A no-op sync produces no diff.
- A clean upstream update, local fork, non-overlapping merge, overlapping conflict, deletion, binary change, and denylist hit each have fixture coverage.
- Failed synchronization leaves files and the upstream pin unchanged.

## Phase 4: progressive alpha workflow set

### Alpha 0: packaging proof

- One portable principle Skill.
- Explicit invocation only.
- Skills-only packages for OMP, Codex, and Claude Code.
- Delivery evidence through `D3` for each probed surface.

### Alpha 1: bounded bug fix

Current progress:

- The pinned `tdd` Skill is imported with explicit-invocation policy and native
  metadata for all three targets.
- `show-me-your-work` is a reviewed semantic port with an append-only TSV log,
  a tested formula-safe helper, capability-based transcript auditing, and a
  read-only trail-review role. Source and output hashes are recorded.
- The portable `bug-fix` workflow keeps reproduction, diagnosis, integration,
  and final verification with the root. It supports root-only execution and
  exactly one bounded writer with declared role, delegation, and isolation
  fallbacks.
- Root-only and one-delegated-writer fixtures pass on OMP 18.2.6 and Codex CLI
  0.155.1. Both prove failing-before and passing-after on the same command, a
  one-line scoped fix, root diff inspection, and no unexpected changes.
- Claude-compatible output passes static generation and validation; live
  verification remains deferred until an authenticated local runtime exists.

- `tdd`;
- `show-me-your-work`;
- a minimal bug-fix playbook and required principle leaves;
- root-only and one delegated-session fixtures;
- independent root verification.

### Alpha 2: coordinated panel

Current progress:

- `interrogate` was selected instead of `architect` because it composes
  directly with the already-probed panel lifecycle and does not pull the
  unported `how`, `why`, and `arena` dependency chain into this alpha.
- Its fixed source-host models and task syntax were replaced by canonical
  reviewer/synthesizer roles, runtime-resolved diversity preferences, identical
  frozen packets, immutable findings, and root-owned final judgment.
- The same end-to-end fixture passes on OMP 18.2.6 and Codex CLI 0.155.1 with
  two reviewers, a later distinct synthesizer, root execution of final
  findings, preserved attribution, and no workspace modification.
- Neither result claims model diversity: OMP proved the same resolved model for
  all children, while Codex exposed no child model identity in this run.
- Claude-compatible output passes static generation and validation; live
  verification remains deferred.

- `architect` or `interrogate`, not both initially;
- parallel candidate start when supported;
- frozen candidate and reviewer artifacts;
- synthesis in a separate session;
- isolation and fallback fixtures.

### Alpha 3: routing and expansion

Current progress:

- The pinned `technical-writing` and `unslop` Skills are imported through the
  reviewed mechanical transformation and generate native explicit-invocation
  policy for all three targets.
- `how` is a reviewed semantic port with simple and complex paths. Complex
  questions use two to four independent read-only exploration angles, freeze
  attributable findings, explain them in a distinct pass, and require root
  verification of critical claims. Fixed source-host models and task syntax
  were replaced by runtime-resolved explorer and explainer roles with explicit
  sequential and root-only fallbacks.
- The explicit `poteto-mode` router now selects only admitted workflows from
  observable user intent. Investigation, feature, refactoring, prototype, and
  opening-a-pr have portable playbooks with root-owned verification and stated
  delegation or isolation fallbacks. Finishing a workflow no longer implies
  authority to publish a pull request.
- Pull-request publication is modeled as a separate `scm.pull_requests`
  capability. It remains `unknown` on every profile until a disposable real
  forge fixture runs; the fallback produces an exact briefing without claiming
  publication.
- Each package now includes a target-specific runtime-resolution descriptor and
  a shared offline setup tool. The `setup-oh-my-stack` workflow requires a fresh,
  source-attributed model inventory, validates every workload and role override
  against it, previews before applying, and writes only a dedicated owned
  configuration directory. Static tests cover all three output formats,
  unobserved-model rejection, modified-owned-file refusal, and preservation of
  unrelated files.
- The live setup fixture passes on OMP 18.2.6 and Codex CLI 0.155.1. OMP
  normalized 124 models from its native model command and Codex normalized five
  models from app-server `model/list`. Both runs rejected an invented model
  before writing, proved the preview produced no files, applied exactly seven
  native role definitions plus the owned manifest, bound the manifest to the
  inventory hash, preserved unrelated configuration, and made no broader
  runtime-config or publication write. The fixture deliberately chooses the
  first model supporting low, medium, and high reasoning for all workloads;
  this is deterministic test policy rather than a recommendation, and neither
  run claims model diversity.
- The first Alpha 3 end-to-end fixture passes on OMP 18.2.6 and Codex CLI
  0.155.1. In both runs `poteto-mode` selects `investigation`, `how` starts
  exactly two explorers before waiting, freezes their attributable results,
  starts one later explainer, and requires independent root verification of
  the critical report-system flow. Neither run modifies the fixture project.
- The initial OMP attempt is retained as a failing record: it read an installed
  pstack cache and created a second explorer/explainer generation. The hardened
  fixture restricts inspection to repository-generated resources and forbids
  retrying or replacing successful children; the fresh rerun passes.
- Codex used the declared inline-role fallback because its probed spawn surface
  cannot select generated role files. Claude output remains static-only until
  the deferred authenticated-runtime verification.
- The routed `feature` fixture also passes on both live CLI runtimes. It proves
  root-owned inspection and design, a failing-before behavior check, one
  bounded writer over an explicit two-file data contract, root diff review,
  and passing-after verification on the same command. OMP returns an isolated
  unapplied patch for root integration. Codex uses a managed root worktree and
  serializes the writer inside it because nested worktree isolation is not
  exposed to the child.
- The routed `refactoring` fixture passes on OMP and Codex CLI. Both roots pin
  four exact task/project label outputs before editing, reduce two duplicated
  trim/state/assembly branches to one private helper through exactly one
  writer, inspect the actual one-file diff and unchanged exports, and rerun the
  same two-test contract successfully. Isolation follows the same OMP child
  worktree and Codex managed-root-worktree boundaries as the feature fixture.
- The root-only `prototype` fixture passes on OMP and Codex CLI. One repeatable
  scan/set script produces identical ordered IDs and deterministic explicit
  membership-check counts of 14 and 8, leaving production inputs unchanged and
  requiring a later feature run. Codex's first attempt failed when automatic
  approval rejected creation of a missing top-level scratch directory; the
  hardened harness pre-creates and tracks that empty repository-owned path and
  the fresh run passes.
- The `opening-a-pr` fallback fixture passes on OMP and Codex CLI. Both roots
  resolve the repository, GitHub remote, base, head, complete one-commit range,
  and two changed paths; rerun the two-test check; apply `technical-writing`
  followed by `unslop`; and return an exact pending `gh pr create` operation.
  Since `scm.pull_requests` remains `unknown`, neither run contacts a forge,
  creates a URL, or merges. Initial runs are retained as failures because the
  harness wrote runner logs inside the fixture repository; hardened reruns
  place all runner artifacts outside it and finish with strict Git status
  clean. This establishes the declared W1 briefing fallback only. Authenticated
  ready-PR creation and forge read-back remain separate W4 work.
- The standalone `technical-writing` then `unslop` fixture passes at W1 on OMP
  and Codex CLI. Both top-level agents capture the intended failure, load the
  generated Skills in order, rewrite only one document as a how-to, inspect the
  full diff, and rerun the same check to one pass. The hardened contract fixes
  every technical fact and its operational order. OMP's initial run is retained
  as a failure because the first test missed the Node.js prerequisite and the
  rewrite dropped it. Codex's initial run is retained because ambiguous `as
  root` wording caused a rejected `sudo` attempt. The current request says
  top-level agent and explicitly forbids operating-system user changes.

- `poteto-mode` router;
- `how`, `unslop`, and `technical-writing`;
- investigation, feature, refactoring, prototype, and opening-a-pr playbooks;
- remaining principle leaves required by those workflows.

### Deferred beyond alpha

- autonomous-run;
- orchestrate;
- autopilot-full and autopilot-stack;
- babysit and shipping;
- session pickup;
- Benny automations;
- provider-specific review bots and control drivers.

### Work

- Express each admitted alpha playbook in portable semantics.
- Declare its capabilities and fallbacks.
- Generate native OMP, Codex, and Claude Code Skills.
- Generate native agent definitions per runtime.
- Add workload-class and role-constraint configuration with per-runtime resolution.
- Add a setup workflow that inspects live runtime inventory before writing overrides.

### Gate

- Each alpha graduates independently on all required target surfaces before the next alpha expands scope.
- All three targets install cleanly in isolated homes for Alpha 0.
- Every admitted public Skill is discoverable and explicitly invocable.
- All generated local links and scripts resolve inside the package.
- The setup workflow never writes an unobserved model slug or destroys unrelated configuration.

The setup portion of this gate passes on both live CLI runtimes. The Alpha 3
snapshot partitions 38 public Skills from 12 internal `check-*` probes, and its
four-batch public matrix discovers and explicitly loads every Alpha 3 Skill
exactly once on OMP and Codex CLI while leaving each fixture repository clean.
The active OMP/Codex Alpha 3 gate is therefore closed. Phase 7 adds public
Skills incrementally and refreshes the whole-catalog matrix after that catalog
stabilizes. Claude Code remains deferred by explicit project decision until an
authenticated local runtime is available.

## Phase 5: same-scenario conformance suite

Current progress:

- `tools/build-conformance.mjs` deterministically compiles runtime evidence into
  normalized records and fails on source-evidence, fixture, assertion, or
  generated-output drift.
- The bug-fix, feature-boundary, behavior-preserving-refactor, frozen
  architecture-candidates, mixed-review, and conflicting-writers scenarios now
  produce paired OMP and Codex records with identical logical event sequences.
- Every record includes its runtime surface and version, configuration
  fingerprint, permission profile, provider-inventory evidence, model-resolution
  observability, fixture revision, per-artifact SHA-256 hashes, repetition
  threshold, semantic trace, and protocol-assertion mapping.
- The current six scenarios are deterministic and require one of one passing
  run with zero acceptable failures. Scenario model identities remain
  `not-recorded` where the original evidence did not independently expose them.
- The architecture scenario requires two byte-identical complete initial
  packets, frozen attributable reviewer results, exactly one later synthesizer,
  and an independent root decision. Retained failures record OMP print-mode
  child disposal and Codex missing referenced-packet transport before the
  hardened runs passed.
- The mixed review retains one reachable exclusive-end defect and dismisses one
  unreachable negative-index hypothesis. Retained failures prove that
  byte-level packet equality and accurate fallback disclosure are hard gates.
- The conflicting-writers fixture proves two OMP isolated patches from one
  frozen baseline with root-ordered integration and a Codex serialized fallback
  in one managed root worktree. Retained OMP failures record both a falsely
  claimed isolation strategy that raced in one checkout and a misconfigured
  apply boundary that integrated patches before root inspection.

The active OMP/Codex Phase 5 gate is closed with six scenarios and twelve
normalized records. Claude Code remains explicitly deferred until an
authenticated local runtime is available; its absence is not converted into a
live conformance claim.

### Fixtures

- A small reproducible bug.
- A feature crossing one function boundary.
- A behavior-preserving refactor.
- Two competing architecture candidates.
- A mixed true/false-positive review diff.
- Two writers that would conflict without isolation.

### Assertions

- Correct playbook selected.
- Expected roles spawned.
- Candidates freeze before review.
- Reviewer did not write implementation files.
- Writers had disjoint ownership or isolated worktrees.
- Root independently inspected the artifact.
- Exact verification commands and outcomes were reported.
- No success claim was accepted from a child report alone.
- Missing capabilities followed the declared fallback.
- Semantic event traces match the protocol contract even when native tool names and event ordering differ.

### Gate

- OMP, Codex, and Claude Code pass the same semantic assertions.
- Differences are limited to adapter events and package paths.
- Results include runtime surface and version, configuration fingerprint, provider inventory, model resolution when observable, fixture revision, semantic event trace, and artifact hashes.
- Nondeterministic fixtures define repetition counts and an acceptable failure threshold; one lucky run is not conformance.

## Phase 6: alpha packaging

Current progress:

- One deterministic builder emits OMP, Codex, and Claude Code archives from
  version `0.1.0-alpha.0`, plus complete file inventories, SHA-256 checksums,
  source coordinates, profiles, conformance summaries, and verification labels.
- Two independent builds must be byte-identical during every `npm run check`.
- The owned-directory installer verifies checksums and archive safety, stages
  and verifies exact files, atomically updates with rollback, and refuses to
  uninstall a directory without the matching generated target marker.
- Lifecycle tests cover clean install, update, injected rollback, exact tree
  verification, user-owned sibling preservation, and uninstall for all three
  target archives. Existing OMP npm and Codex repository-marketplace tests
  remain separate surface evidence.
- Release documentation separates static, discovery, package lifecycle, and
  end-to-end claims. Claude Code runtime checks remain deferred, and OMP's
  native plugin-manager D1 is not inferred from generic package lifecycle.
- The clean-tag gate is implemented and tested in a disposable repository. The
  final local release commit must be tagged and rebuilt from that exact clean
  tag before Phase 6 closes; public publication remains separate.

### Work

- Produce installable OMP, Codex, and Claude Code packages from the same release version.
- Add clean install, update, uninstall, and rollback tests.
- Add generated checksums and a release manifest.
- Publish delivery maturity, workflow conformance, and capability profiles per runtime surface and workflow.
- Document security and trust implications of Hooks and scripts.

### Gate

- A release is reproducible from its Git tag.
- Installed files match generated artifacts.
- Updating preserves user-owned configuration.
- Uninstall removes only project-owned files.
- Release notes distinguish static, discovery, lifecycle, and end-to-end verification.

## Phase 7: advanced workflows

Current progress:

- `babysit` is generated as the thirty-ninth public Skill with explicit
  `check`, `threads-only`, `background`, and `drive` mode boundaries.
- The first graduated slice is `check` only. Its disposable repository freezes
  two refs, a base-to-head diff, a pinned behavior test, checks, merge state,
  and two review threads including command-like untrusted text.
- OMP 18.2.6 and Codex CLI 0.155.1 both load the generated router and Skill,
  declare check mode before reading status, resolve the exact head, retain the
  failing check, dismiss a false-positive thread against the actual diff and
  pinned behavior, leave Git and forge state unchanged, and pass the independent
  verifier. One Codex harness-ordering failure is retained separately.
- This is W1 fallback evidence over a frozen forge artifact. Live
  `scm.pull_requests`, `scm.review_threads`, polling, thread replies, repair
  waves, and merge readiness are not inferred from it. `babysit` drive mode is
  the next slice.

Add advanced workflows one at a time in this order:

1. `babysit` in read-only check mode.
2. `babysit` drive mode.
3. `session-pickup` and pause checkpoints.
4. `autonomous-run` with host-native wake mechanisms.
5. `shipping` with revision-bound independent verdicts.
6. `orchestrate`.
7. `autopilot-stack`.
8. `autopilot-full`.
9. Benny integrations.

Each addition needs a real external-system fixture or disposable repository. Static prompt review is insufficient for merge, cancellation, resume, and long-running claims.

## First implementation slice

The first coding change after this plan should implement Phase 1 and the Alpha 0 fixture only:

1. Create the source and target directory skeleton.
2. Define target-coordinate, capability, workload, role-constraint, and evidence schemas.
3. Add one portable `prove-it-works` fixture Skill.
4. Generate OMP, Codex, and Claude Code outputs.
5. Validate deterministic generation, permissions, and forbidden core tokens.
6. Keep every capability `unknown` until its surface-specific probe runs.

Do not import the full pstack tree until this vertical slice proves the architecture.
