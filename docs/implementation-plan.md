# Implementation plan

The plan is ordered by proof. Each phase ends with a usable artifact and a gate. A later phase must not compensate for an unverified earlier layer.

## Phase 0: repository and provenance baseline

### Work

- Add the initial directory skeleton under `src/`, `tools/`, `tests/`, and `evals/`.
- Select the implementation runtime for generators and validators. Prefer Node.js with no production dependency unless a dependency materially reduces parser risk.
- Add MIT licensing for original project code if approved.
- Add `THIRD_PARTY_NOTICES.md` before importing any upstream content.
- Create machine-readable source records for pstack, `pstack-claude`, `dsebban/skills`, and `oh-my-pstack`.
- Add CI that runs formatting, unit tests, generation checks, and link validation.

### Gate

- Clean clone installs development dependencies reproducibly.
- Test and validation commands run with zero network access after installation.
- No third-party content exists without a source revision and license record.

## Phase 1: capability schema and build skeleton

### Work

- Define JSON Schema or equivalent validation for runtimes, capabilities, roles, model tiers, playbook requirements, and fallbacks.
- Add initial `omp.yaml`, `codex.yaml`, and `claude-code.yaml` manifests.
- Implement a deterministic generator that can render one trivial Skill for all three targets.
- Add forbidden-token checks that reject runtime names and tool syntax in core files.
- Add target validators and snapshot tests.

### Gate

- One source Skill generates three native package layouts.
- Running generation twice produces no diff.
- Removing a required capability or adapter mapping makes generation fail with an actionable error.
- Injecting `spawn_agent`, `hub`, `Agent`, `.codex`, `.claude`, or `.omp` into the core makes validation fail.

## Phase 2: runtime probes

### Work

- Record exact supported runtime versions.
- Build minimal fixture Skills and agents for each host.
- Probe discovery, explicit invocation, relative resources, scripts, one subagent, parallel subagents, wait, follow-up, cancellation, transcript access, worktree isolation, model override, and user interaction.
- Store machine-readable evidence records under `evals/evidence/`.
- Replace assumptions in the capability matrix with observed results.

### Gate

- Every capability required by the MVP has a current pass result or an explicit fallback test.
- Runtime documentation and live behavior disagreements are recorded, not normalized away.
- No adapter instruction names an operation that the corresponding probe could not invoke.

## Phase 3: upstream import and semantic core

### Work

- Pin a pstack upstream commit.
- Import the principle Skills first because they have minimal runtime coupling.
- Classify every imported file by ownership.
- Implement substitutions and denylist rules for obvious runtime bindings.
- Extract canonical roles and lifecycle protocols from `poteto-mode`.
- Implement a sync tool with dry-run, atomic writes, old/new/local derivation, three-way merge, typed conflicts, and pin advancement only after success.

### Gate

- All selected principles build for three targets without runtime tokens in core.
- A no-op sync produces no diff.
- A clean upstream update, local fork, non-overlapping merge, overlapping conflict, deletion, binary change, and denylist hit each have fixture coverage.
- Failed synchronization leaves files and the upstream pin unchanged.

## Phase 4: MVP workflow set

### Scope

Include:

- `poteto-mode` router;
- `how`;
- `architect`;
- `interrogate`;
- `tdd`;
- `unslop`;
- `technical-writing`;
- `show-me-your-work`;
- investigation, bug-fix, feature, refactoring, prototype, and opening-a-pr playbooks;
- all required principle leaves.

Delay:

- autonomous-run;
- orchestrate;
- autopilot-full and autopilot-stack;
- babysit and shipping;
- session pickup;
- Benny automations;
- provider-specific review bots and control drivers.

### Work

- Express each MVP playbook in portable semantics.
- Declare its capabilities and fallbacks.
- Generate native OMP, Codex, and Claude Code Skills.
- Generate native agent definitions per runtime.
- Add model-tier configuration and per-runtime defaults.
- Add a setup workflow that inspects live runtime inventory before writing overrides.

### Gate

- All three targets install cleanly in isolated homes.
- Every public Skill is discoverable and explicitly invocable.
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

### Gate

- OMP, Codex, and Claude Code pass the same semantic assertions.
- Differences are limited to adapter events and package paths.
- Results include runtime version, model resolution, fixture revision, and artifact hashes.

## Phase 6: alpha packaging

### Work

- Produce installable OMP, Codex, and Claude Code packages from the same release version.
- Add clean install, update, uninstall, and rollback tests.
- Add generated checksums and a release manifest.
- Publish an explicit compatibility table per runtime and workflow.
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

The first coding change after this plan should be Phase 1 only:

1. Create the source and target directory skeleton.
2. Define the capability schema.
3. Add one portable `prove-it-works` fixture Skill.
4. Generate OMP, Codex, and Claude Code outputs.
5. Validate deterministic generation and forbidden core tokens.

Do not import the full pstack tree until this vertical slice proves the architecture.

