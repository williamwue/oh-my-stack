# ADR 0002: surface-aware compatibility profiles

- Status: Accepted
- Date: 2026-09-21

## Context

One runtime name can expose different packaging and lifecycle behavior across desktop, CLI, IDE, operating system, version, permission mode, and installed providers. Package discovery is also independent from successful workflow execution. A single `supported` flag or linear compatibility level cannot express those differences safely.

## Decision

Record compatibility using three independent structures:

1. delivery maturity for static validity, installation, discovery, and invocation;
2. workflow conformance for single-session, delegated, coordinated, and external-system fixtures;
3. capability profiles bound to exact runtime surface coordinates.

Capability states are `native`, `extension`, `external`, `fallback`, `unsupported`, or `unknown`. Documentation seeds research records; only live probes produce pass evidence.

## Consequences

### Positive

- A missing native operation can use a verified fallback without creating a contradictory compatibility level.
- Desktop, CLI, and IDE differences remain visible.
- Plugin- or MCP-supplied abilities are not misattributed to a runtime.
- Release notes can make precise, evidence-backed claims.

### Negative

- Compatibility tables contain more coordinates and require evidence maintenance.
- Runtime upgrades may expire several observations at once.
- Users may need a generated summary rather than reading raw profiles.

## Rejected alternatives

### One L0-L6 ladder

Rejected because packaging maturity and workflow behavior do not form one reliable ordering.

### One manifest per runtime name

Rejected because surfaces, versions, platforms, providers, and permission modes can materially change available operations.
