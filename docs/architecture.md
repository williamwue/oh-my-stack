# Architecture

## Outcome

One workflow definition must produce native, testable packages for OMP, Codex, and Claude Code without embedding one host's tool names in another host's prompt.

The architecture has five layers:

1. Upstream staging preserves source provenance and reviewed transformations.
2. The semantic core defines workflow intent and invariants.
3. Capability profiles describe what a particular runtime surface can actually do.
4. Runtime adapters render canonical operations into native host mechanics.
5. Packaging targets generate installable artifacts and host-specific metadata.

## Upstream staging

Imported material moves through an explicit boundary:

```text
pinned upstream slice
        ↓
immutable snapshot + provenance record
        ↓
mechanical normalization
        ↓
reviewed semantic patches
        ↓
portable core
```

`upstream/sources.yaml` records sources and revisions. `upstream/ownership.yaml` records ownership at file or region granularity. `upstream/snapshots/` contains only the immutable source slices needed to reproduce an import. `upstream/patches/` records deliberate semantic or portability changes. Raw upstream content is never shipped directly as a portable target.

An inspected revision is not automatically a baseline. The import baseline advances only after the derived core and all affected target packages pass their gates.

## Semantic core

The core owns:

- principles;
- canonical roles;
- lifecycle protocols;
- playbook steps and gates;
- verification and evidence rules;
- user-facing workflow selection;
- acceptance and reporting contracts.

The core must not contain:

- runtime tool names such as `task`, `hub`, `spawn_agent`, or `Agent`;
- runtime configuration paths such as `.omp`, `.codex`, or `.claude`;
- concrete model slugs;
- runtime-specific resource URIs such as `agent://` or `skill://`;
- assumptions that a host supports background work, worktrees, follow-ups, or cancellation.

### Canonical roles

The initial role vocabulary is:

| Role | Purpose | Writes |
| --- | --- | --- |
| `explorer` | Read-only repository reconnaissance | No |
| `researcher` | Source-verified external research | No |
| `planner` | Architecture, decomposition, and sequencing | No |
| `designer` | Product, interaction, and visual candidates | Optional artifacts only |
| `implementer` | One bounded implementation unit | Yes |
| `reviewer` | Independent code or behavioral review | No |
| `synthesizer` | Adjudicate frozen candidate or review reports | No |
| `watcher` | Observe one exact external-state generation | No |
| `owner` | Retain context across coupled implementation phases | Yes |
| `mechanical` | Fully specified, low-judgment edits | Yes |

Runtime agent names are mappings, not part of this vocabulary.

Canonical role metadata and instructions are stored once under
`src/core/roles/`. The generator renders host-native definitions rather than
copying one runtime's role format into another: Markdown frontmatter for OMP,
standalone TOML for Codex, and plugin agent Markdown for Claude Code. Concrete
model identifiers remain outside the canonical role and are resolved by a
runtime-aware setup layer.

### Canonical lifecycle protocols

The portable core initially recognizes four protocols:

- **Bounded session.** One role, one unit, one terminal report.
- **Panel.** Independent participants start before any result is consumed; evidence freezes before review and synthesis.
- **Long-lived owner.** One retained session owns a coupled sequence, with verification at each boundary.
- **One-shot watcher.** One exact generation and stop predicate; a changed generation requires a fresh watcher.

Every protocol keeps user interaction, irreversible actions, integration, and final verification with the root coordinator.

## Capability profiles

Capabilities are machine-readable contracts, not prose suggestions. A playbook declares required and optional capabilities. A profile is bound to an exact runtime surface, version, platform, configuration, installed providers, and permission state. Each adapter declares how it renders a supported operation and which fallback is valid.

Example:

```yaml
playbook: bug-fix
requires:
  - workspace.inspect
  - commands.run
optional:
  - agents.spawn
  - agents.wait
  - workspace.isolate
fallbacks:
  agents.spawn: root_executes_sequentially
  workspace.isolate: one_writer_at_a_time
```

Capability support uses `native`, `extension`, `external`, `fallback`, `unsupported`, or `unknown`. The generator fails when a target lacks a required capability and has no declared fallback. Runtime probes may further reduce what a generated package is allowed to claim.

## Runtime adapters

Adapters are compiler and verification boundaries, not a portable orchestration daemon. Each adapter exposes four responsibilities:

- `render`: expand canonical roles and protocols into native instructions and configuration;
- `package`: create the target layout and manifests;
- `validate`: reject invalid, unreachable, unsafe, or stale target output;
- `probe`: exercise live runtime behavior and write evidence records.

Within those responsibilities, an adapter owns:

- canonical-role mapping;
- spawn, wait, follow-up, cancel, and result retrieval mechanics;
- workspace and worktree isolation;
- workload-class and role-constraint resolution;
- task tracking and user interaction;
- path and resource reference syntax;
- transcript and durable-state discovery;
- long-running wake mechanisms;
- runtime-specific security and approval boundaries.

The host runtime performs the actual spawn, wait, cancellation, isolation, and tool execution. Adapters generate concrete prose and metadata; they do not proxy those calls. Runtime Skills must not need to read a foreign-host translation table before using a tool.

### Long-running wake contract

`coordination.scheduled_wake` means the runtime can start a later observation,
not that the current process can sleep. Before a workflow arms a wake, it
persists the fixed predicate, provider revision, checkpoint locator, next useful
observation, wake-count or deadline budget, later-session authority, and every
terminal stop. The adapter stores the runtime-issued wake identifier with that
checkpoint. A later run validates the anchors, consumes at most one wake,
re-measures the provider, and disarms the wake when the predicate or another
stop condition is reached. Completion requires an inactive or deleted wake;
creating a schedule alone is not conformance evidence.

Scheduled wake and recurring automation are separate capabilities. A host may
support a bounded follow-up on one task without supporting a standalone job on
an arbitrary cadence. A recurring provider is safe for a one-shot wake only
when its next recurrence cannot overlap the active run and the run disarms it
before another occurrence can queue. Schedule deletion does not prove that an
already queued occurrence was cancelled. Every later run therefore validates
that the checkpoint is still waiting before it measures the provider; stale or
terminal runs exit without another observation. Adapters use only an observed
host-native operation. If the operation is unavailable or cannot be verified,
the portable fallback is a durable pause checkpoint. A background shell sleep,
busy poll, or detached process is not a wake provider.

## Model policy

The core separates workload class from role constraints and never names concrete models:

| Workload | Intended use |
| --- | --- |
| `fast` | Mechanical work and narrow reconnaissance |
| `balanced` | Routine implementation |
| `deep` | Difficult architecture and ambiguous implementation |

A role adds constraints such as `read_only`, `independent_session`, `reasoning_required`, and `model_diversity_preferred`. `reviewer` and `synthesizer` are roles, not model tiers. Each runtime resolves workload and role constraints to its live inventory and permits user overrides. A diversity claim requires returned model or backend evidence; distinct agent names alone are insufficient.

Resolution is deliberately host-native. An OMP adapter may bind a generated
role to a configured `modelRoles` alias and thinking level, while a Codex
adapter may pass a model and reasoning effort at spawn time. Both represent
the same portable requirement, but neither concrete identifier nor host field
name belongs in the core. Conformance requires runtime-produced session
metadata for the resolved child values; a worker's statement about its own
model is insufficient.

Every generated target carries a runtime-resolution descriptor, a live
inventory collector, and the same offline configuration script. The collector
calls the native inventory operation verified for that generated target and
normalizes model identifiers plus supported reasoning efforts. It fails closed
when no operation has been verified. The configuration script accepts that
timestamped, source-attributed inventory plus either explicit `fast`,
`balanced`, and `deep` selections or a target-native `pstack` recommendation
preset. The preset adds named workflow slots, ordered runner/reviewer panels,
a reasoning-budget rule, and an `inherit-parent` choice. OMP applies the
upstream target-effort semantics, using the highest supported effort at or
below that target for a model, and retains explicit slot/panel choices on
reconfiguration. Codex uses the same target-effort rule. Preset model IDs
remain target-specific data, never portable-core requirements; every selected
ID and effort must be present in the observed inventory. Panel length is the
intended worker count, while each generated route agent has a distinct name and
ordered manifest entry. OMP and Codex default to a user-owned configuration
directory; a project manifest is a complete override for that project.
Reruns preflight every owned file before writing, replace only files whose
hashes match the prior manifest, remove only unchanged obsolete owned
route agents, and preserve unrelated user files. Configuration alone never
establishes model diversity or native route selection; a worker trace must
verify both. OMP workflows read the nearest project resolution manifest or
the user default when invoked and select generated native task agents; unlike
Cursor, this is not a globally injected rule. On Codex, a generated role file is only a reference artifact until
native role selection is independently observed. The adapter instead derives
each spawn's explicit model and reasoning effort, embeds the full role contract
in the task message, and checks the parent spawn call plus child runtime record
when persisted records are available. An encrypted persisted spawn message
limits independent verification of its exact text; report that separately
from verified model and effort. OMP retains its verified native
project-role route.

## Build pipeline

```text
upstream snapshots
        ↓
semantic import and reviewed patches
        ↓
portable core + capability requirements
        ↓
runtime adapter expansion
        ↓
committed generator-owned target trees
        ↓
static validation → install tests → runtime conformance tests → release archives
```

Generated artifacts must be deterministic. Running the generator twice must produce no diff. `packages/` is committed for review and Git-based installation; CI owns its contents. `dist/` is rebuilt from a tagged commit and is not committed.

## Target packages

### OMP

The OMP target will generate Agent Skills plus OMP-native agent and lifecycle configuration. It will map canonical operations only to fields and operations observed in the live `task` and job-control schema, including isolation and durable result resources when available.

Observed writer isolation uses an isolated task worktree with patch merge and
`apply=false`. The root checkout remains the source boundary until runtime
evidence proves otherwise; a temporary path alone is not isolation evidence.
Completed worker transcripts are available through the native `history://`
resource. Structured yields may be collapsed in that view, so portable
transcript assertions place independently verifiable evidence in an ordinary
assistant message before the structured yield.

### Codex

The Codex target generates Skills, a portable root `plugin.json`, and the supported `.codex-plugin/plugin.json` compatibility manifest. It will add custom-agent TOML files and Hook definitions only when a workflow requires them. Capability and installation claims are recorded separately for Codex desktop, CLI, and IDE surfaces. A skills-only package remains valid when a surface does not support plugin installation.

For Codex CLI, a top-level managed worktree may be the single writer isolation
boundary and delegated children may share it. Project `.agents` content is
configuration and can be read-only under a workspace-write sandbox, so mutable
workflow state belongs in ordinary project-owned paths rather than Skill
assets.

Codex CLI 0.155.1 has no observed native completed-child transcript reader in
the probed surface. Persisted sessions can be inspected as an external JSONL
artifact. Assignment bodies may be encrypted, so portable assertions accept
an attributable task envelope and require the remaining evidence in visible
tool and assistant records.

### Claude Code

The Claude Code target will generate `.claude-plugin/plugin.json`, Skills, namespaced subagents, Hooks, and optional MCP configuration. Claude-specific Skill frontmatter stays in this target. Optional MCP and Hook features are separately permissioned rather than silently enabled.

## Upstream ownership

Every imported file is classified as one of:

- **upstream-owned**, regenerated from an upstream snapshot;
- **derived**, generated from upstream semantics plus an adapter;
- **local-core**, maintained by this project;
- **target-only**, maintained by one runtime adapter;
- **generated**, owned entirely by the build tool.

The ownership ledger may classify regions when one Markdown file contains both upstream semantics and local adapter-owned material. Generated regions carry stable markers and must not be hand-edited.

The sync tool must use a pinned old revision, a selected new revision, and the current local derivation. It must distinguish clean updates, local forks, automatic three-way merges, and real conflicts. A failed sync writes nothing and does not advance the pin.

## Verification strategy

Support is reported on separate axes:

- delivery maturity: static validity, installation, discovery, and invocation;
- workflow conformance: root-only, delegated, coordinated, and external-system behavior;
- capability profile: individual operations and their providers or fallbacks;
- evidence freshness: exact runtime surface, version, platform, configuration fingerprint, and observation date.

Final responses and release notes name the verified coordinates rather than using a single ambiguous `supported` label.
