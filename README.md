# Oh My Stack

Portable, verifiable engineering workflows for OMP, Codex, and Claude Code.

`oh-my-stack` is a portable execution framework derived from pstack's engineering workflows. It keeps workflow intent and verification rules independent from any one agent runtime, then generates native packages for each supported host and surface.

## Status

Phase 1, the Alpha 0 build slice, and most Phase 2 runtime probes are
implemented. Thirteen original capability fixtures, twenty-three pinned pstack
principles, the three Alpha 1 Skills (`tdd`, `show-me-your-work`, and
`bug-fix`), the Alpha 2 `interrogate` Skill, nine Alpha 3 workflow Skills
(`how`, `technical-writing`, `unslop`, `poteto-mode`, `investigation`,
`feature`, `refactoring`, `prototype`, and `opening-a-pr`), and the
`setup-oh-my-stack` configuration Skill generate deterministic OMP, Codex,
and Claude Code target packages. Seven canonical roles generate native
read-only and writable definitions. All packages pass static `D0` validation.

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
external read of its persisted session JSONL. A W3-targeted panel fixture now
proves two independent parallel candidates, frozen candidate and review
boundaries, and distinct reviewer and synthesizer sessions on both runtimes.
A controlled stale-replay fixture additionally passes on Codex CLI: generation
1 sends a peer-ready signal, is cancelled while active, and later releases its
retained old marker through one follow-up on the same session after generation
2 has been accepted. The delivered stale marker is recorded but rejected, so
Codex CLI now has passing evidence for every `W3` semantic family. This is a
controlled replay rather than a naturally racing network response. The same
OMP fixture did not pass in two fresh attempts because the generation-1
provider turn never emitted an assistant or tool event; OMP therefore remains
at `W2` coverage and peer messaging remains `unknown`, not `unsupported`.
Codex lifecycle probes require persisted sessions;
`--ephemeral` cannot create usable child threads in Codex CLI 0.155.1.

The Alpha 1 bounded bug-fix workflow passes both its root-only and one-worker
fixtures on OMP 18.2.6 and Codex CLI 0.155.1. In every run the root captured
the same failing test before the edit, established the off-by-one cause,
inspected the one-line diff, and reran the identical test to two passes. OMP's
worker produced an isolated unapplied patch that the root reviewed and
integrated. Codex used one top-level managed worktree shared by root and child;
the original source checkout remained clean, and the inline implementer
fallback was used because that CLI surface cannot select the generated custom
role.

Alpha 2 now includes the portable `interrogate` workflow. Its live fixture
passes on both OMP and Codex CLI with two reviewers started before waiting,
identical frozen packets, frozen attributable results, a distinct later
synthesizer, and independent root execution of every final `Act on` finding.
Both runs kept the reviewed repository unchanged and correctly declined to
claim model diversity: OMP resolved every child to the same model, while Codex
exposed no independently verifiable child model identity in this run.

The first Alpha 3 end-to-end fixture also passes on OMP and Codex CLI. The
explicit `poteto-mode` router selects `investigation`, which invokes the
complex `how` path: exactly two explorers start before waiting, their
attributable results freeze before one new explainer starts, and the root
independently re-reads the critical flow. An initial OMP attempt failed because
it inspected an installed pstack cache and created a second explorer/explainer
generation. That failure is retained as evidence; the fixture now requires
repository-generated resources only and forbids successful-child replacement.
The hardened rerun passes without modifying the project. Codex uses inline
role contracts because its probed spawn surface cannot select generated custom
roles. Neither run claims model diversity.

The generated custom read-only role is discovered and applied natively by OMP.
Codex CLI 0.155.1 finds the generated project role definition, but the
`spawn_agent` surface exposed to `codex exec` has no role selector. That exact
surface is therefore recorded as `unsupported`, despite newer official Codex
documentation describing custom-agent configuration; desktop and IDE remain
separate, unprobed surfaces.

Per-worker model and reasoning routing is independently observed on both live
CLI surfaces. OMP resolves a probe-only role alias to an alternate model and
applies its `thinkingLevel`; Codex CLI passes an alternate model and reasoning
effort directly at spawn. Runtime session metadata—not worker self-report—
confirms the resolved worker values. Concrete model identifiers remain outside
the portable core and appear only in target-specific probe configuration and
evidence.

Native fixed-choice and free-text interaction passes on the interactive OMP
and Codex CLI TUI surfaces. Non-interactive OMP print mode and Codex `exec`
preserve the workflow invariant through an explicit `INTERACTION_REQUIRED`
result with both questions pending and no fabricated responses. Codex CLI
0.155.1 exposes interaction through the experimental
`default_mode_request_user_input` feature as an asynchronous queued question
card, so it has a separate profile from non-interactive `codex exec`. OMP's
passing interactive result is bound to the observed `cursor/default` model
because a separate reconnaissance model skipped the available native
operation.

The first pstack content slices are imported at the pinned upstream revision:
all twenty-three `principle-*` Skills, `tdd`, `technical-writing`, `unslop`,
`how`, `show-me-your-work`, the `bug-fix` playbook semantics, and the bounded
Alpha 3 router/playbooks. Immutable source snapshots, per-file ownership,
mechanical transformation hashes, reviewed semantic-derivation records, and
the candidate/baseline/verified pin lifecycle are stored under `upstream/`.
Explicit-only policy is compiled into native target metadata rather than
leaking source-host frontmatter into the portable core.

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

Each generated package contains `scripts/configure-models.mjs` and
`config/runtime-resolution.json`. The explicit `setup-oh-my-stack` Skill first
collects a fresh runtime inventory, then uses the script to preview and write
target-native role files into a dedicated directory. The resolver rejects
unobserved model or reasoning identifiers and modified files it does not own.
It never edits a user's broader runtime configuration directly.

Canonical roles live beside the portable Skills. The generator emits native
role definitions under each target package's `agents/` directory; runtime
setup or installation places those definitions in the host's discovered role
location.

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

This repository contains mechanically imported and semantically derived
material from the MIT-licensed upstream projects recorded in
`upstream/sources.yaml`. Imported files are pinned to immutable revisions and
tracked through source snapshots, per-component ownership, derivation records,
license metadata, and `THIRD_PARTY_NOTICES.md`.
