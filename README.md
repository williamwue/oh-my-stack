# Oh My Stack

Portable, verifiable engineering workflows for OMP, Codex, and Claude Code.

`oh-my-stack` is a portable execution framework derived from pstack's engineering workflows. It keeps workflow intent and verification rules independent from any one agent runtime, then generates native packages for each supported host and surface.

## Status

Phase 1, the Alpha 0 build slice, and the first Phase 2 delegation slice are
implemented. Eight original Skills—`prove-it-works`, `check-resources`,
`check-delegation`, `check-parallel`, `check-follow-up`, `check-cancellation`,
`check-transcript`, and `check-writer-isolation`—generate deterministic OMP,
Codex, and Claude Code target packages. All packages pass static `D0`
validation.

Live `W1` and `W2` probes pass on OMP 18.2.6 and Codex CLI 0.155.1 on macOS
arm64. The `W2` fixtures prove one read-only worker, two parallel read-only
workers, and a two-turn follow-up on the same read-only worker. Results remain
separately attributable and are followed by an independent root read.
The official Codex repository-marketplace lifecycle fixture establishes `D1`,
so Codex CLI reaches cumulative `D3` after its observed discovery and
explicit-invocation checks. OMP's artifact-level npm lifecycle passes, but OMP
remains overall `D0`: its 18.2.6 plugin manager unexpectedly writes during a
`--dry-run`, so the real D1 safety gate is unresolved. Codex desktop and Codex
IDE remain unprobed. Claude Code verification is explicitly deferred until a
local account and authenticated runtime are available.

The resource fixture proves that OMP and Codex CLI can load packaged
`references/` and `assets/`, then execute a packaged helper that resolves its
own asset. Script execution currently depends on the external Node.js runtime
and is recorded separately from native relative-resource support.

OMP's parallel fixture also proves asynchronous background-job waiting. Its
follow-up fixture proves an idle worker can be woken, while Codex records both
worker turns on the same child thread. A W3-targeted cancellation fixture now
proves active-worker cancellation and exclusion of the cancelled generation
from accepted results on both runtimes. A second W3-targeted fixture proves one
writer is isolated from the source checkout: OMP retains an unapplied patch
from an isolated task worktree, while Codex runs the parent and writer in a
managed `--worktree` checkout. Completed-worker transcript retrieval is also
proven: OMP exposes a native `history://` resource, while Codex CLI requires an
external read of its persisted session JSONL. It does not yet prove a race
where a late stale payload is delivered or coordinated panels, so achieved
conformance remains W2. Codex lifecycle probes require persisted sessions;
`--ephemeral` cannot create usable child threads in Codex CLI 0.155.1.

No pstack workflow content has been imported yet.

## Development

```bash
npm install
npm run generate
npm run check
```

`npm run generate` replaces only the generator-owned target directories under
`packages/`. `npm run check` verifies generated drift, schemas and invariants,
local links, the executable inventory, and the test suite without network
access.

Runtime probe records live under `evals/evidence/`. The OMP probe overlay at
`evals/configs/omp-probe.yml` clears machine-specific Skill allowlists so the
fixture measures the generated package rather than a developer preference.
The writer-isolation fixture keeps its writable project data outside
`.agents/skills`: Codex exposes project Skill content as read-only
configuration even in a workspace-write session.
Codex output contains the preferred portable root `plugin.json` plus the
supported `.codex-plugin/plugin.json` compatibility manifest.

## Goals

- Maintain one semantic source of truth for workflows, roles, principles, and lifecycle protocols.
- Generate native OMP, Codex, and Claude Code packages instead of asking an agent to translate foreign tool names at runtime.
- Preserve upstream pstack provenance and make upstream synchronization reviewable.
- Treat skill discovery, delegation, isolation, lifecycle control, model routing, and end-to-end behavior as separate compatibility claims.
- Require observable evidence before declaring a runtime or workflow supported.
- Keep packaging maturity separate from workflow conformance.

## Non-goals

- Reproduce Cursor-only behavior that has no safe equivalent.
- Promise feature parity from `SKILL.md` discovery alone.
- Make model slugs part of the portable core.
- Maintain three hand-edited copies of every playbook.
- Import all long-running and shipping workflows into the first release.
- Build a cross-runtime agent daemon or replace native host orchestration.

## Naming

- Display name: **Oh My Stack**
- Repository and plugin slug: `oh-my-stack`
- Reserved future CLI command: `oms`
- Reserved package scope: `@oh-my-stack/*`

Use `oh-my-stack` in paths, manifests, package names, and documentation links. `ohmystack` is not a second identifier.

## Design documents

- [Architecture](docs/architecture.md)
- [Runtime capability model](docs/capabilities.md)
- [Prior-art assessment](docs/prior-art.md)
- [Implementation plan](docs/implementation-plan.md)
- [Security model](docs/security.md)
- [ADR 0001: portable core and generated targets](docs/decisions/0001-portable-core.md)
- [ADR 0002: surface-aware compatibility profiles](docs/decisions/0002-surface-aware-compatibility.md)
- [ADR 0003: adapters compile and probe](docs/decisions/0003-adapters-compile-and-probe.md)

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
├── packages/
│   ├── omp/
│   ├── codex/
│   └── claude-code/
├── tools/
├── tests/
├── evals/
├── upstream/
│   ├── sources.yaml
│   ├── ownership.yaml
│   ├── snapshots/
│   └── patches/
└── dist/
```

`packages/` contains committed generator-owned installation trees so Git-based installs remain reviewable. CI regenerates them and rejects drift. `dist/` contains uncommitted release archives and checksums; neither directory is a semantic source of truth.

## Attribution

The planned implementation will derive material from MIT-licensed upstream projects. No third-party source has been copied into this repository yet. Before importing upstream content, add the applicable licenses, copyright notices, pinned revisions, and per-component provenance records.
