# Architecture

## Outcome

One workflow definition must produce native, testable packages for OMP, Codex, and Claude Code without embedding one host's tool names in another host's prompt.

The architecture has four layers:

1. The semantic core defines workflow intent and invariants.
2. Capability manifests describe what each runtime can actually do.
3. Runtime adapters implement canonical operations with native host mechanics.
4. Packaging targets generate installable artifacts and host-specific metadata.

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

## Capability manifests

Capabilities are machine-readable contracts, not prose suggestions. A playbook declares required and optional capabilities. Each runtime adapter declares how it implements them and which fallback is valid.

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

The generator fails when a target lacks a required capability and has no declared fallback.

## Runtime adapters

Each adapter owns:

- canonical-role mapping;
- spawn, wait, follow-up, cancel, and result retrieval mechanics;
- workspace and worktree isolation;
- model-tier mapping;
- task tracking and user interaction;
- path and resource reference syntax;
- transcript and durable-state discovery;
- long-running wake mechanisms;
- runtime-specific security and approval boundaries.

Adapters generate concrete prose and metadata. Runtime Skills must not need to read a foreign-host translation table before using a tool.

## Model policy

The core uses model tiers, never model names:

| Tier | Intended use |
| --- | --- |
| `fast` | Mechanical work and narrow reconnaissance |
| `balanced` | Routine implementation |
| `deep` | Difficult architecture and ambiguous implementation |
| `judge` | Independent review and synthesis |

Each runtime supplies defaults and permits user overrides. A panel declares desired diversity and size; an adapter reports when the available models reduce diversity.

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
generated target packages
        ↓
static validation → install tests → runtime conformance tests
```

Generated artifacts must be deterministic. Running the generator twice must produce no diff.

## Target packages

### OMP

The OMP target will generate Agent Skills plus OMP-native agent and lifecycle configuration. It will map canonical operations to the live `task` and job-control surface, including isolation and durable result resources when available.

### Codex

The Codex target will generate a portable Agent Plugins manifest plus a Codex compatibility manifest when needed, Skills, Codex custom-agent TOML files, and trusted Hook definitions only when the workflow requires them.

### Claude Code

The Claude Code target will generate `.claude-plugin/plugin.json`, Skills, namespaced subagents, Hooks, and optional MCP configuration. Claude-specific Skill frontmatter stays in this target.

## Upstream ownership

Every imported file is classified as one of:

- **upstream-owned**, regenerated from an upstream snapshot;
- **derived**, generated from upstream semantics plus an adapter;
- **local-core**, maintained by this project;
- **target-only**, maintained by one runtime adapter;
- **generated**, owned entirely by the build tool.

The sync tool must use a pinned old revision, a selected new revision, and the current local derivation. It must distinguish clean updates, local forks, automatic three-way merges, and real conflicts. A failed sync writes nothing and does not advance the pin.

## Verification strategy

Support is established in layers:

1. Static package validity.
2. Clean installation and discovery.
3. Explicit Skill invocation.
4. Native subagent lifecycle behavior.
5. Workspace isolation and ownership.
6. Same-scenario behavioral conformance.
7. End-to-end verification against a real artifact.

Final responses and release notes must name the highest verified layer instead of using a single ambiguous `supported` label.

