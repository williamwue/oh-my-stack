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
  payload, so cancellation-race coverage remains pending and achieved
  conformance stays at W2.
- Both runtimes pass one-writer isolation. OMP uses an isolated task worktree
  with an unapplied retained patch; Codex CLI uses a managed top-level worktree
  shared by the writer child. Both leave the source checkout clean.
- Transcript API access, panels, model override, and interaction remain
  pending.
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

- `tdd`;
- `show-me-your-work`;
- a minimal bug-fix playbook and required principle leaves;
- root-only and one delegated-session fixtures;
- independent root verification.

### Alpha 2: coordinated panel

- `architect` or `interrogate`, not both initially;
- parallel candidate start when supported;
- frozen candidate and reviewer artifacts;
- synthesis in a separate session;
- isolation and fallback fixtures.

### Alpha 3: routing and expansion

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

## Phase 5: same-scenario conformance suite

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
