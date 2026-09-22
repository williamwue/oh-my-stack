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
`setup-oh-my-stack` configuration Skill, and the Phase 7 `babysit`,
`pause-safely`, `session-pickup`, `autonomous-run`, `shipping`, `orchestrate`,
`autopilot-stack`, `autopilot-full`, `setup-benny`, `triage-issue-reports`, and
`reproduce-and-fix-issues` Skills generate deterministic OMP, Codex, and Claude
Code target packages. Seven canonical roles generate native read-only and
writable definitions. All packages pass static `D0` validation.

Live `W1` and `W2` probes pass on OMP 18.2.6 and Codex CLI 0.155.1 on macOS
arm64. The `W2` fixtures prove one read-only worker, two parallel read-only
workers, and a two-turn follow-up on the same read-only worker. Results remain
separately attributable and are followed by an independent root read.
The official Codex repository-marketplace lifecycle fixture establishes `D1`,
so Codex CLI reaches cumulative `D3` after its observed discovery and
explicit-invocation checks. OMP's artifact-level npm lifecycle passes, but OMP
remains overall `D0`: its 18.2.6 plugin manager unexpectedly writes during a
`--dry-run`, so the real D1 safety gate is unresolved. Codex Desktop has a
focused scheduled-wake probe; its other capability families and Codex IDE
remain unprobed. Claude Code verification is explicitly deferred until a local
account and authenticated runtime are available.

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

The routed Alpha 3 `feature` fixture passes on both live CLI runtimes as well.
Each root inspects the simple normalize-to-render boundary with `how`, captures
the new receipt-note test failing before delegation, records the direct design
and throughput checkpoint, starts exactly one bounded writer, inspects the
actual two-file diff, and reruns the same command to two passing tests. OMP
uses an isolated child worktree and root-applied patch. Codex isolates the
whole root session in a managed worktree and serializes its single writer
inside that checkout because nested child isolation is unavailable. Neither
run changes tests or performs publication.

The routed `refactoring` fixture now passes on the same two runtimes. Each root
pins the exact four-output behavior before delegation, names the duplicated
reader load and target private helper, runs exactly one bounded writer, checks
that only the implementation module changed and that no public export was
added, then reruns the identical test to the same two passing tests. OMP uses
an isolated child patch; Codex uses its managed root worktree and serialized
writer fallback. This is behavior-preserving evidence, not a feature claim.

The root-only `prototype` fixture passes on OMP and Codex CLI. Both create one
throwaway script under `scratch/`, run scan and set through the same variant
switch, preserve identical first-seen output, and observe deterministic
membership-check counts of 14 and 8 without using wall-clock timing. Project
inputs retain their hashes, the artifact stays outside production source, and
both reports require a separate `feature` run for implementation. The first
Codex attempt is retained as a failure because automatic approval rejected
creation of a previously absent scratch directory; the passing harness tracks
that empty repository-owned directory before invocation.

The `opening-a-pr` fallback fixture passes on OMP and Codex CLI. Both roots
resolve the real Git remote, base, head, one-commit range, and two-file diff;
rerun the two-test verification command; apply `technical-writing` followed by
`unslop`; and return an exact pending `gh pr create` operation. Because
`scm.pull_requests` remains `unknown`, neither runtime contacts a forge,
publishes a pull request, fabricates a URL, or merges anything. The first run
on each runtime is retained as a harness failure because runner logs were
written inside the fixture repository. Hardened reruns externalize every
runner artifact and leave strict Git status clean. This is passing W1 fallback
evidence, not authenticated W4 publication or forge read-back.

The standalone `technical-writing` then `unslop` fixture passes at W1 on both
CLI runtimes. Each top-level agent captures the intentionally failing document
test, reads both generated Skills in order, rewrites one file as a concise
how-to, inspects the complete diff, and reruns the same command to one pass.
The hardened contract preserves the Node.js prerequisite, commands, port,
counts, outputs, URL, stop action, and operational order. OMP's first attempt
is retained as a semantic failure because the original test allowed the
Node.js prerequisite to disappear. Codex's first attempt is retained because
the phrase `as root` triggered an unnecessary rejected `sudo` command; the
current fixture names the top-level agent and forbids user changes. Passing
runs modify only the document and use no delegation or publication.

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
local links, deterministic release output, the executable inventory, and the
test suite without network access.

Build the three local Alpha archives and verify their checksums with:

```bash
npm run release:build
(cd dist && shasum -a 256 -c SHA256SUMS)
```

The release manifest records every installed file, target profile, checksum,
and separate static, discovery, lifecycle, and end-to-end status. See the
[release process](docs/release-process.md) and the
[0.1.0-alpha.0 release notes](docs/releases/0.1.0-alpha.0.md). Claude Code is
packaged and lifecycle-tested offline, while its runtime discovery and
end-to-end status remain explicitly deferred.

Each generated package contains `scripts/collect-model-inventory.mjs`,
`scripts/configure-models.mjs`, and `config/runtime-resolution.json`. The
explicit `setup-oh-my-stack` Skill first runs the collector against the current
runtime's native model inventory, then uses the configuration script to preview
and write target-native role files into a dedicated directory. Collection
fails closed for targets without a verified inventory operation. The resolver
rejects unobserved model or reasoning identifiers and preflights every owned
file before writing any update. It never edits a user's broader runtime
configuration directly.

The live setup fixture passes on OMP 18.2.6 and Codex CLI 0.155.1. OMP
normalized 124 models from `omp models --json --no-extensions`; Codex
normalized five models from app-server `model/list` with hidden models
excluded. Each run rejected an invented identifier before writing, completed a
no-output preview, generated seven native role definitions on apply, bound the
result to the exact inventory hash, and preserved an unrelated marker file.
The deterministic first-eligible selection used by the fixture mapped all
three workload classes to one model, so every generated role correctly records
that model diversity was not established. Claude Code remains fail-closed and
deferred until an authenticated local runtime is available.

The canonical Skill catalog now separates 49 public workflows and principles
from 12 internal `check-*` runtime probes. The complete 49-Skill matrix passes
on OMP 18.2.8 and Codex CLI 0.155.1: every Skill is discovered and explicitly
loaded exactly once, its canonical name and first heading match the generated
package, no probe Skill leaks into the public matrix, and both read-only Git
fixtures remain unchanged. The advanced workflow Skills are also exercised by
focused live fixtures. The three Benny Skills pass a deterministic
local-provider fixture covering dormant setup, source-bound triage,
tracker-write compensation,
trusted-marker handoff, repeated before-and-after UI proof, independent media
review identity, and an unmerged draft pull request. Focused OMP 18.2.8 and
Codex CLI 0.155.1 runs pass the same local-provider protocol at W3 with one
fresh read-only reviewer and externally audited parent and child transcripts.

Phase 5 now has a deterministic same-scenario compiler. It converts passing
OMP and Codex evidence for bug fixing, a boundary-crossing feature, a
behavior-preserving refactor, a frozen architecture comparison, a mixed
true/false-positive review, and conflicting writers into twelve normalized
conformance records. Each record
binds the runtime coordinate and configuration fingerprint
to the source evidence, provider-inventory evidence, exact fixture and artifact
hashes, repetition threshold, common semantic event trace, and mapped protocol
assertions. The compiler deliberately records scenario model resolution as
`not-recorded` where the original run did not expose it instead of borrowing a
model identity from a separate routing probe.

The architecture fixture starts two read-only reviewers with identical complete
literal packets, freezes both attributable results, and only then starts one
synthesizer. OMP and Codex both selected `durable-log`; each root independently
reread the inputs, verified their hashes, ran the exact verifier, and confirmed
a clean repository. Retained failed attempts document OMP print-mode child
disposal and Codex's missing referenced-packet transport; the hardened passing
runs use explicit root liveness and literal initial packets rather than hiding
either failure.

The mixed-review fixture proves judgment rather than reviewer voting. A
reachable exclusive-end regression remains `Act on`, while a tempting negative
`.at()` warning is `Dismissed` because the frozen public boundary rejects that
input first. Both runtimes used two frozen read-only reviews, one later
synthesizer, and an independent root execution. Retained failures record an OMP
one-word packet mismatch and a Codex run that failed to disclose its inline-role
fallback before the hardened runs passed.

The conflicting-writers fixture closes the sixth scenario family. OMP starts
exactly two `isolated:true` native implementers from one frozen baseline with
`task.isolation.apply=false`, freezes two disjoint same-file patches, and lets
the root inspect and apply them in order. Codex runs exactly two inline-role
writers serially inside one managed root worktree, with the root inspecting and
verifying BatchWriter before RetryWriter starts. Both final files match the
expected bytes and pass the combined verifier. Two retained OMP failures prove
that prose-only isolation and an unverified apply setting are hard failures.

Phase 7 now graduates both `babysit` check and drive modes on OMP 18.2.6 and
Codex CLI 0.155.1. Check mode performs one frozen read-only classification and
leaves Git and forge bytes unchanged. Drive mode uses a disposable branch,
local bare origin, and deterministic provider to reproduce a pinned defect,
change one source file, create one commit, push one wave, refresh once to
`READY`, preserve main, and stop without merging. Codex drive requires a
permission profile that can write `.git`; its retained workspace-write failure
is not counted as conformance. These are W1 local-provider results, not live
forge access, hosted polling, `threads-only`, `background`, or W4 completion.

The `pause-safely` and `session-pickup` workflows pass on OMP 18.2.8 and Codex
CLI 0.155.1 in a two-session cold-start
fixture: session A commits one existing atomic unit as `wip:`, writes an
off-worktree checkpoint with exact Git anchors, and does not push; a distinct
session B validates those anchors before editing, inherits the completed unit
without redoing it, completes only the pending unit, runs combined verification,
and still does not publish. This is W1 portable checkpoint handoff, not native
runtime resume, transcript import, cloud handoff, or delegated W2 execution.

The first `autonomous-run` slice also passes on OMP 18.2.8 and Codex CLI
0.155.1. Each root freezes a `3/3` predicate, exact measurement, four-iteration
and ten-minute budget, authorized mutations, and stop conditions before work.
It then completes three ready local units in order with one focused test, one
single-file commit, one controller advance, and one append-only decision row per
iteration, stopping immediately at `3/3` without scheduling a wake or
publishing. The deterministic suite rejects early edits to future units. This
is continuous-local W1 evidence only; host-native scheduled or event wake,
external waiting, restart, deadline and cost enforcement, discard or pivot
behavior, and W4 completion remain unverified.

The deterministic waiting-branch fixture persists a runtime-issued wake
identifier, provider revision, next observation, absolute deadline, wake-count
budget, later-session authority, and verified-disarm boundary. Codex Desktop
26.915.31945 passes this branch through one standalone local cron task: a later
host-created task validates the waiting checkpoint, measures the independently
released provider once, advances once, deletes its schedule, and verifies
cleanup. The profile therefore records native `automation.recurring` and
`coordination.scheduled_wake` for that exact surface. A retained one-minute
recurrence failure shows that deleting a schedule does not cancel an occurrence
already queued; the passing run uses a daily cadence whose first occurrence is
the next useful minute and exits before provider measurement when a checkpoint
is no longer waiting. A separate current-thread heartbeat attempt remains
failed W0 evidence because it never re-entered the active task.

The first `shipping` slice generates for all three targets and passes both its
deterministic fixture and live OMP 18.2.8 and Codex CLI 0.155.1 runs against a
disposable local provider. Each runtime starts three real independent reviewer
sessions, preserves its runtime-issued reviewer identifiers, binds each verdict
to the exact base, head, patch identity, and observed verification, and lands
only the contiguous passing run bottom-up. PRs 41 and 42 land; the failing PR 43
remains open and unarmed. Retained failures cover root self-review, a worker
role without command capability, and overly narrow OMP and Codex task-identity
grammars. Deterministic negative cases also reject an upper merge and a head
changed after review. This is coordinated local-provider W3 evidence, not
native `scm.merge` or an authenticated W4 forge merge.

The first `orchestrate` slice also passes its deterministic fixture and live
OMP 18.2.8 and Codex CLI 0.155.1 runs. Each coordinator completes a pilot before
fan-out, binds four runtime-issued worker identities through no-write standby
turns and same-session follow-ups, starts alpha and beta before waiting, freezes
alpha and beta in separate drains, and uses four distinct reviewers. The join
brief carries the actual integrated alpha and beta heads, all verdicts bind to
generation and output hashes, and both runs stop at `4/4` with no publication.
External transcript audits confirm that neither root executes unit work or unit
verification. This is coordinated local-provider W3 evidence, not recovery
from a real coordinator restart or authenticated W4 external-system completion.

The first deterministic `autopilot-stack` slice builds two disjoint changes from
one frozen target, requires two distinct revision-bound reviewer lanes per
change, and reserves aggregation and topology writes for the root. The root
keeps the bottom change based on `main`, rebases the second branch onto that
exact parent, preserves the code verdict only when the stable patch identity
survives, and refreshes checks at the rewritten head. The verifier requires a
linear open chain, unchanged `main`, and no merge or automatic-merge operation.
Live OMP 18.2.8 and Codex CLI 0.155.1 coordinator runs now pass the same local
provider protocol at W3. Both start two attributable owners before waiting,
serialize their exact build and self-proof commands across the shared checkout,
and then use four fresh reviewers for the two frozen gates/live lanes. External
transcript audits find no root owner build, owner self-proof, or reviewer verify
command. Both roots alone arrange `main <- change-51 <- change-52`, preserve the
tip code verdict only across an unchanged stable patch, refresh checks at the
rewritten head, and stop with two open, unarmed changes. This is coordinated
local-provider evidence, not authenticated W4 forge completion.

The first `autopilot-full` slice keeps the upstream authority split intact:
each autonomous change has one attributable owner from build and self-proof
through merge, while only the root aggregates the independent swarm and issues
a single-use countersign. The fixture starts two independent branches from one
target. The first owner lands only after gates, live, and regression lanes
agree; the second owner then rebases onto current `main`, reruns proof, receives
a fresh three-lane verdict and countersign, and lands its own change. A third
operator-held item remains untouched. Negative cases reject delegation of that
item, merge without countersign, root consumption of owner authority, and a
head changed after countersign.

Live OMP 18.2.8 and Codex CLI 0.155.1 coordinator runs now pass the same local
provider protocol at W3. Both start and bind the two lifecycle owners before
waiting, serialize mutations across the shared checkout, use six fresh
reviewers across two three-lane swarms, and keep build, proof, rebase, review,
and merge execution out of the root. In each runtime the original change-61
owner lands first; the original change-62 owner then rebases with an unchanged
stable patch, reruns self-proof, and lands after a fresh countersign. Independent
transcript audits confirm the authority boundary, and the final verifier leaves
change 63 at its operator gate. This is coordinated local-provider evidence,
not authenticated W4 forge completion.

The unavailable-wake fallback now passes on OMP 18.2.8 and Codex CLI 0.155.1.
Each root loads only the generated Skills, measures the pinned provider exactly
once, observes `WAITING`, writes a durable checkpoint with `automationId: null`
and `wakeCount: 0`, and stops after an independent verifier succeeds. A retained
initial OMP failure records why persistent measurement counting and a strict
three-command envelope are required: exploratory searches were backgrounded,
their later delivery caused another pass, and the provider was measured twice.
The hardened passing runs start no schedule, sleep, poll, detached process, or
publication operation and do not claim unattended completion.

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
- [Release process](docs/release-process.md)
- [Alpha release notes](docs/releases/0.1.0-alpha.0.md)
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
