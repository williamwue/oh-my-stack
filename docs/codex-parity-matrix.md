# Codex upstream parity and acceptance backlog

## Assessment boundary

Reviewed on 2026-09-23. Local implementation baseline: `v0.2.0-alpha.4`,
commit `4820c9b11be779f7e826041fa8f15df482520a81`.
Upstream comparison: [cursor/plugins pstack at 86ecc820](https://github.com/cursor/plugins/tree/86ecc82055e4d3cb567e72c56f390800a4978c9b/pstack),
resolved from upstream main during this review. This is a pinned inventory
comparison, not a claim of line-by-line semantic equivalence.

**Verdict: usable Codex Alpha, not a complete port of current upstream.**
Discovery, implementation, fixture behavior, installed-plugin behavior, and
real external-system completion are separate claims.

Our [source records](../upstream/sources.yaml) and
[semantic derivations](../upstream/semantic-derivations.json) pin several older
revisions (`6ed0f7a9`, `640ea3ab`, and `53e579f1`). They do not claim synchronization
with the current upstream revision. This audit does not change those provenance
records or imply that every missing entry was newly added upstream.

## Current source progress

The user reprioritized upstream completion before release work. The
[completion plan](upstream-completion-plan.md) tracks all 25 original gaps.
All 25 originally missing entries now have core implementations, direct metadata,
router entries, pinned provenance, and three generated packages. The current
source has **74 public entries (51 workflows, 23 principles)**. Their behavioral
acceptance is not complete. The installed local Codex candidate now exposes
74 entries; the published alpha.4 still exposes 49.
The [bounded acceptance record](discovery-design-acceptance.md) covers static
checks and two independent forward tests with explicit execution limits.
The [second-batch acceptance record](upstream-completion-acceptance.md) covers
the 74-entry installed candidate and two read-only negative behavior runs.

The source inventory below records the original alpha.4 comparison; it is not
the current generated-package count.

## Original inventory reconciliation

| Inventory | Count | Meaning |
| --- | ---: | --- |
| Upstream main Skill directories | 47 | Includes 23 principles |
| Upstream nested poteto-mode playbooks | 23 | Not 23 additional main-directory Skills |
| Upstream Benny automation Skills | 3 | Separate automation subtree |
| Local public entries | 49 | 26 workflows and 23 principles |
| Local internal probes | 12 | Excluded from public packages |

Of the 47 upstream main entries, 30 have same-name local entries: the 23
principles and seven workflows below. Another entry, `setup-pstack`, has a
renamed, scoped adaptation. Sixteen have no dedicated local counterpart.
The other 19 local entries comprise 14 extracted playbooks, three Benny Skills,
`setup-oh-my-stack`, and the local `prove-it-works` installation helper.
Therefore neither 49/47 nor a same-name ratio is a behavioral coverage score.

## Main Skill matrix

Evidence links below describe previously recorded runs, not new test runs from
this audit. W1 means root-only bounded behavior; W2 adds verified delegation;
W3 covers coordinated behavior; W4 requires a real disposable external system.
See [capability definitions](capabilities.md) for the full requirements.

| Upstream entry | Local implementation | Strongest relevant evidence and boundary |
| --- | --- | --- |
| All 23 `principle-*` entries | Same-name entries; full list in [directory](skill-directory.md#principles-23) | [Public matrix](../evals/evidence/codex-cli-0.155.1/public-skill-matrix.json) verifies loading, not adherence in every task |
| `poteto-mode` | Explicit router | [Installed alpha.4 acceptance](releases/0.2.0-alpha.4-acceptance.md): investigation/how route; not every branch |
| `how` | Read-only explanation with staged delegation | [W3 fixture](../evals/evidence/codex-cli-0.155.1/how-routing.json); installed explicit invocation also observed |
| `interrogate` | Frozen review packets and independent root judgment | [W3 fixture](../evals/evidence/codex-cli-0.155.1/interrogate.json); model diversity not proven |
| `tdd` | Public testing instruction | Used by [bug-fix W2 fixture](../evals/evidence/codex-cli-0.155.1/bug-fix-delegated.json); not standalone installed-plugin acceptance |
| `show-me-your-work` | Durable decision trail | Exercised in [session pickup](../evals/evidence/codex-cli-0.155.1/session-pickup.json); not every lifecycle failure mode |
| `technical-writing`, `unslop` | Public writing instructions | [W1 writing fixture](../evals/evidence/codex-cli-0.155.1/writing-cleanup.json); bounded document contract |
| `setup-pstack` | `setup-oh-my-stack`: observed inventory and project-owned role configuration | [W1 setup](../evals/evidence/codex-cli-0.155.1/setup-live.json); not Cursor always-applied rules or full host-wide setup |

The following were missing in the original audit. All now have dedicated
portable implementations; behavioral verification is pending. Related runtime
primitives or similarly named fixtures do not substitute for these contracts.

| Upstream entry | Intended scope / remaining work |
| --- | --- |
| `architect` | Implemented; full implementation/redesign behavioral acceptance pending |
| `arena` | Implemented; native multi-candidate and cross-judge acceptance pending |
| `swarm` | Implemented; native coverage/race/drainage acceptance pending |
| `why` | Implemented; authenticated multi-source acceptance pending |
| `teach` | Implemented; composed behavioral acceptance pending |
| `blast-radius` | Investigate consequences beyond a diff and execute the critical safety check |
| `figure-it-out` | Auditable adaptive plan for work that does not fit a narrower workflow |
| `create-verification-skill` | Generate a project-specific user-facing verification driver |
| `maintain-verification-skill` | Audit verification drivers and feature coverage against live behavior |
| `automate-me` | Derive or refresh a personal working-style Skill |
| `recall` | Reconstruct context from history and live records; broader than checkpoint pickup |
| `reflect` | Review transcript learnings and route them to existing Skill changes |
| `no-comments` | Specialized comment review and structural encoding of constraints |
| `bro` | Plain-language restatement |
| `make-bot-ui` | Portable webhook UI workflow; target webhook capability and live delivery remain unverified |
| `typescript-best-practices` | Language-specific guidance and trigger policy |

In particular, `architecture-candidates.json` and `mixed-review.json` prove
bounded coordination primitives, not completion of `architect` or `arena`.
The router now selects all 25 new public workflows by specific intent.

## Nested playbook matrix

Compare the pinned [upstream playbook directory](https://github.com/cursor/plugins/tree/86ecc82055e4d3cb567e72c56f390800a4978c9b/pstack/skills/poteto-mode).
Local counterparts are separate directly selectable public Skills.

| Upstream playbook | Local status / evidence boundary |
| --- | --- |
| `investigation` | Implemented; [how-routing W3](../evals/evidence/codex-cli-0.155.1/how-routing.json), plus installed router check |
| `bug-fix` | Implemented; [root W1](../evals/evidence/codex-cli-0.155.1/bug-fix-root.json) and [delegated W2](../evals/evidence/codex-cli-0.155.1/bug-fix-delegated.json) red/green fixtures |
| `feature` | Implemented; [W2](../evals/evidence/codex-cli-0.155.1/feature-routing.json), bounded fixture |
| `refactoring` | Implemented; [W2](../evals/evidence/codex-cli-0.155.1/refactoring-routing.json), pinned behavioral assertions |
| `prototype` | Implemented; [W1](../evals/evidence/codex-cli-0.155.1/prototype-routing.json), operation-count comparison, not performance benchmarking |
| `opening-a-pr` | Implemented; [W1 fallback](../evals/evidence/codex-cli-0.155.1/opening-pr-fallback.json), real PR creation not executed by that fixture |
| `babysit` | Implemented; [check](../evals/evidence/codex-cli-0.155.1/babysit-check.json) and [drive W1](../evals/evidence/codex-cli-0.155.1/babysit-drive.json), no live forge polling |
| `pause-safely` | Implemented; [checkpoint/pickup W1](../evals/evidence/codex-cli-0.155.1/session-pickup.json), not every in-flight cancellation state |
| `session-pickup` | Implemented; same W1 record, file checkpoint across roots, not native/cloud handoff |
| `autonomous-run` | Implemented; [W1](../evals/evidence/codex-cli-0.155.1/autonomous-run.json) and [wake fallback](../evals/evidence/codex-cli-0.155.1/autonomous-run-wake-fallback.json); cold restart not proven |
| `shipping` | Implemented; [W3](../evals/evidence/codex-cli-0.155.1/shipping.json), disposable local provider, not hosted merge queues |
| `orchestrate` | Implemented; [W3](../evals/evidence/codex-cli-0.155.1/orchestrate.json), local provider, real coordinator restart pending |
| `autopilot-stack` | Implemented; [W3](../evals/evidence/codex-cli-0.155.1/autopilot-stack.json), local change provider, no W4 forge evidence |
| `autopilot-full` | Implemented; [W3](../evals/evidence/codex-cli-0.155.1/autopilot-full.json), deterministic verification, not three independent real surfaces |
| `authoring-a-skill` | No dedicated local counterpart |
| `eval` | No dedicated local counterpart |
| `hillclimb` | No dedicated local counterpart |
| `multi-phase-plan` | No dedicated local counterpart |
| `perf-issue` | No dedicated local counterpart |
| `runtime-forensics` | No dedicated local counterpart |
| `trace-forensics` | No dedicated local counterpart |
| `visual-parity` | No dedicated local counterpart |
| `worktree-cleanup` | No dedicated local counterpart |

The three Benny entries (`setup-benny`, `triage-issue-reports`,
`reproduce-and-fix-issues`) are implemented with [W3 local-provider evidence](../evals/evidence/codex-cli-0.155.1/benny.json).
Authenticated Slack/tracker/forge operation remains unverified. The local
`prove-it-works` helper checks installation; it does not implement upstream's
project-specific verification-driver generation.

## Codex adaptation boundaries

- Alpha.4 native app-server discovery returned 49 enabled entries. Installed
  structured invocation was checked for `how` and the router, not all workflows.
  The older 49-entry matrix used project `.agents/skills`, not this installation.
- Plain-text `$name` and structured picker selection are not equivalent.
  Desktop picker clicking/rendering remains unverified: the computer-use tool
  explicitly denied access. Do not bypass that restriction.
- CLI 0.155.1 fixtures used inline role contracts where the probed spawn surface
  could not select generated custom roles. This is a surface/version observation,
  not a claim that every current Codex surface has that limitation.
- A managed top-level worktree can be shared by parent and child; it does not
  establish per-writer worktree isolation. Shared writers need explicit ownership
  or serialization.
- Transcript inspection in these CLI fixtures uses persisted session JSONL,
  not a native child-history tool. Ephemeral and Desktop parity is not established.
- Independent sessions do not prove independent models. The model-routing probe
  does not retroactively prove diversity in earlier review panels.
- Controlled stale replay and local provider tests are useful but do not prove
  natural network races, real credentials, scheduled recovery, or hosted merges.

## Ordered implementation and acceptance backlog

Step 1 now has a [real root-only bug-fix acceptance record](releases/0.2.0-alpha.4-bug-fix-acceptance.md):
installed instructions were read directly and the installer regression went
from failing to passing. This does not add structured selection, Desktop picker,
or delegated-path evidence. Step 2's feature half now has a
[read-only installation verification acceptance record](releases/0.2.0-alpha.4-feature-acceptance.md),
including a successful check of the actual installed Codex package. Its
behavior-preserving refactoring half now also has an
[acceptance record](releases/0.2.0-alpha.4-refactoring-acceptance.md), with all six
release outputs matching their pre-refactor inventories. Step 3 now has a
[review and read-only routing record](releases/0.2.0-alpha.4-review-acceptance.md):
two independent reviewers, a distinct synthesizer, root checks, and unchanged
project content hashes. Its routing check used loaded instructions in the root,
not an automatic trigger. Step 4's
[installed direct-entry audit](releases/0.2.0-alpha.4-direct-entry-acceptance.md)
found 49 discoverable and explicitly selected entries, but only 45 complete
bodies matched persisted instructions. Four long bodies were recorded as
approximately 8,000-character prefixes. A follow-up
[diagnosis and candidate fix](releases/0.2.0-alpha.4-long-skill-fix.md) confirmed
the missing tails in model responses and verified 49 complete candidate entries
plus four complete linked-procedure reads. The installed alpha.4 is unchanged;
the [versioned local installation and repeat acceptance](releases/0.2.0-alpha.4-local-plugin-acceptance.md)
now pass with 49 complete installed entries and four complete procedure reads.
The published alpha.4 is unchanged. Desktop UI
confirmation remain pending; steps 5–8 are also pending. The earlier implementation
records remain root-only; no new Desktop picker or model-diversity claim follows.
Keep every public direct entry,
short descriptions, and workflow/principle categories. Do not reintroduce a
default hidden library or ship internal probes.

| Order | Task | Completion gate |
| --- | --- | --- |
| 1 | Installed-plugin real bug-fix acceptance | Pick a reproducible repository defect; retain failing command, root cause, reviewed diff, identical passing command, and relevant regression results |
| 2 | Installed-plugin feature and refactoring acceptance | One bounded behavior change and one separate behavior-preserving change; test new behavior and negative cases, or freeze invariants before refactoring |
| 3 | Installed-plugin review and read-only routing acceptance | Review a frozen change; independently confirm findings, reject unsupported ones, and prove no unauthorized writes |
| 4 | Direct-entry acceptance and UI confirmation | Record per-entry installed-path selection/loading separately from behavior; user/manual Desktop check when permitted |
| 5 | Design the first missing-workflow batch | Specify `why`, `architect`, `arena`, `swarm`, then `teach` dependencies; review upstream contracts, provenance, host mapping, and negative acceptance cases before implementation |
| 6 | Triage remaining upstream gaps | Decide port/defer/out-of-scope for the other 11 main entries and nine playbooks; do not silently mark deferred work complete |
| 7 | External-system acceptance | On an explicitly authorized disposable repository: real PR creation, checks, review handling, and separately authorized merging; retain remote readback |
| 8 | Long-running and automation acceptance | Exercise restart, stale state, conflicting writers, scheduled wake, and authenticated Benny integrations; track each dependency separately |

For steps 1–3, use actual scoped work, not artificial edits solely to obtain a
green result. If no suitable authorized task exists, record the pending scenario.
Each run must capture the installed version/path, package identity, host/version,
repository commit and dirty-state baseline, exact user request, selected entry,
observed calls, root verification, final diff, and limitations. A worker's
success statement is not acceptance evidence. Preserve failed attempts.

Do not publish raw logs containing credentials, private paths, or customer data;
follow the [evidence policy](evidence-policy.md). A documentation audit is not a
workflow execution, and passing checks for this document do not advance W levels.

Claude Code live verification remains explicitly deferred at the user's request
until an account is available. OMP's separate native-manager safety boundary
remains open; neither blocks a narrowly stated Codex Alpha claim.
