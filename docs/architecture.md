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

## Model policy

The core separates workload class from role constraints and never names concrete models:

| Workload | Intended use |
| --- | --- |
| `fast` | Mechanical work and narrow reconnaissance |
| `balanced` | Routine implementation |
| `deep` | Difficult architecture and ambiguous implementation |

A role adds constraints such as `read_only`, `independent_session`, `reasoning_required`, and `model_diversity_preferred`. `reviewer` and `synthesizer` are roles, not model tiers. Each runtime resolves workload and role constraints to its live inventory and permits user overrides. A diversity claim requires returned model or backend evidence; distinct agent names alone are insufficient.

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

### Codex

The Codex target generates Skills, a portable root `plugin.json`, and the supported `.codex-plugin/plugin.json` compatibility manifest. It will add custom-agent TOML files and Hook definitions only when a workflow requires them. Capability and installation claims are recorded separately for Codex desktop, CLI, and IDE surfaces. A skills-only package remains valid when a surface does not support plugin installation.

For Codex CLI, a top-level managed worktree may be the single writer isolation
boundary and delegated children may share it. Project `.agents` content is
configuration and can be read-only under a workspace-write sandbox, so mutable
workflow state belongs in ordinary project-owned paths rather than Skill
assets.

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
