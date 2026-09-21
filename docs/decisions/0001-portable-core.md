# ADR 0001: portable core and generated runtime targets

- Status: Accepted
- Date: 2026-09-21

## Context

pstack embeds workflow semantics and Cursor runtime mechanics in the same Skill files. Existing ports take two main approaches:

1. Copy and edit the Skill tree for one host.
2. Keep one host's Skill language and ask other hosts to translate it through a mapping document.

The first approach creates cross-fork drift. The second makes runtime correctness depend on an agent applying a prose translation accurately and on that translation remaining current.

OMP, Codex, and Claude Code share the Agent Skills concept, but their agent definitions, lifecycle tools, isolation, model configuration, Hooks, paths, and packaging differ.

## Decision

Maintain a runtime-neutral semantic core and generate native target packages through explicit capability manifests and runtime adapters.

The core contains no target tool names, paths, model slugs, or resource URI syntax. Runtime adapters expand canonical roles and lifecycle operations into concrete target instructions and metadata.

Generated target files are committed only if doing so improves installation or review, but they remain generator-owned and CI must reject manual drift.

## Consequences

### Positive

- One semantic workflow can be reviewed independently of host mechanics.
- Runtime changes are localized to an adapter and its conformance probes.
- Unsupported capabilities fail during generation or degrade through explicit fallbacks.
- Cross-runtime behavioral comparison becomes practical.
- Upstream pstack changes can be classified as semantic changes or runtime-binding changes.

### Negative

- A generator and schema must be maintained.
- Target Skills may duplicate generated prose.
- Upstream synchronization requires a semantic import step rather than copying files directly.
- Supporting a new runtime requires a full capability inventory, not just a new install path.

## Rejected alternatives

### Maintain three complete forks

Rejected because fixes and upstream changes would need repeated manual reconciliation.

### Use Claude Code Skills as the canonical source

Rejected because Codex and OMP would depend on runtime translation instructions, and Claude model/tool names would remain embedded in the source of truth.

### Use OMP Skills as the canonical source

Rejected for the same reason. `task`, `hub`, `agent://`, `history://`, and `skill://` are not universal runtime primitives.

### Treat Agent Plugins as the universal runtime standard

Rejected because Agent Plugins is a useful packaging format but does not define equal native agent lifecycle semantics across all three targets.

