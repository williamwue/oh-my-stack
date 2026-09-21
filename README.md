# oh-my-stack

Portable, verifiable engineering workflows for OMP, Codex, and Claude Code.

`oh-my-stack` is a portable execution framework derived from pstack's engineering workflows. It keeps workflow intent and verification rules independent from any one agent runtime, then generates native packages for each supported host.

## Status

The repository currently contains the architecture and implementation plan. It does not yet ship runnable skills or plugins.

## Goals

- Maintain one semantic source of truth for workflows, roles, principles, and lifecycle protocols.
- Generate native OMP, Codex, and Claude Code packages instead of asking an agent to translate foreign tool names at runtime.
- Preserve upstream pstack provenance and make upstream synchronization reviewable.
- Treat skill discovery, delegation, isolation, lifecycle control, model routing, and end-to-end behavior as separate compatibility claims.
- Require observable evidence before declaring a runtime or workflow supported.

## Non-goals

- Reproduce Cursor-only behavior that has no safe equivalent.
- Promise feature parity from `SKILL.md` discovery alone.
- Make model slugs part of the portable core.
- Maintain three hand-edited copies of every playbook.
- Import all long-running and shipping workflows into the first release.

## Design documents

- [Architecture](docs/architecture.md)
- [Runtime capability model](docs/capabilities.md)
- [Prior-art assessment](docs/prior-art.md)
- [Implementation plan](docs/implementation-plan.md)
- [ADR 0001: portable core and generated targets](docs/decisions/0001-portable-core.md)

## Target repository shape

```text
oh-my-stack/
├── src/
│   ├── core/
│   ├── adapters/
│   │   ├── omp/
│   │   ├── codex/
│   │   └── claude-code/
│   ├── capabilities/
│   └── packaging/
├── tools/
├── tests/
├── evals/
├── upstream/
└── dist/
```

`dist/` will be generated and must never become a second source of truth.

## Attribution

The planned implementation will derive material from MIT-licensed upstream projects. No third-party source has been copied into this repository yet. Before importing upstream content, add the applicable licenses, copyright notices, pinned revisions, and per-component provenance records.

