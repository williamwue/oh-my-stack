# ADR 0003: adapters compile and probe

- Status: Accepted
- Date: 2026-09-21

## Context

The portable core needs to express lifecycle semantics without embedding host tool names. One option is to build a runtime-neutral orchestration service that proxies agent lifecycle calls. That would introduce a new daemon, state model, security boundary, and failure mode while duplicating capabilities already owned by OMP, Codex, and Claude Code.

## Decision

Runtime adapters are build-time and verification components with four responsibilities:

1. `render` canonical workflow operations as native target instructions and configuration;
2. `package` those outputs using the host's current layout and manifests;
3. `validate` package structure, references, permissions, and forbidden drift;
4. `probe` live behavior and emit surface-bound evidence records.

The target runtime executes all agent lifecycle and tool operations. Oh My Stack does not provide a cross-runtime daemon, RPC layer, task scheduler, or transcript store.

## Consequences

### Positive

- Native runtime behavior and user controls remain authoritative.
- Installation does not add a long-running service.
- Security and failure boundaries stay smaller.
- Adapter changes can be tested through deterministic output and probes.

### Negative

- Generated target prose and configuration may differ substantially.
- Some semantics require a documented fallback rather than a uniform API.
- Runtime changes can invalidate an adapter and its evidence records.

## Rejected alternative

### Portable orchestration daemon

Rejected for the initial architecture because it would expand scope and authority without proving that native target packages are insufficient.
