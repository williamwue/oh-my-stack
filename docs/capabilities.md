# Runtime capability model

## Why compatibility is multidimensional

Package installation, Skill discovery, subagent lifecycle behavior, and real external-system completion are different claims. A single compatibility level hides useful fallbacks and can produce impossible ordering—for example, a workflow may pass behavioral conformance through a safe cancellation fallback even when native cancellation is unavailable.

Oh My Stack therefore records delivery maturity, workflow conformance, and individual capabilities separately.

## Delivery maturity

| Level | Claim |
| --- | --- |
| `D0` | Target package validates statically |
| `D1` | Clean install, update, and uninstall complete without harming user-owned files |
| `D2` | Runtime discovers the expected Skills, agents, and optional components |
| `D3` | Explicit invocation resolves the Skill and all packaged resources |

Delivery maturity belongs to a target package on one runtime surface. It does not prove that a workflow behaves correctly.
The maturity value is cumulative: a direct observation of a later check is
recorded, but it does not advance the overall level while an earlier gate is
missing.

## Workflow conformance

| Level | Claim |
| --- | --- |
| `W0` | No live behavioral evidence |
| `W1` | Root-only or single-session workflow satisfies its fixture |
| `W2` | One delegated session executes, returns evidence, and is independently verified |
| `W3` | Panels, follow-ups, stale-generation handling, and writer isolation satisfy semantic assertions |
| `W4` | Long-running, PR, shipping, or other external-system workflow completes against a disposable real system |

Workflow conformance is assigned per playbook and fixture, not globally to a runtime. A declared fallback may satisfy a workflow when the fixture proves the same safety invariant.

## Target coordinates

Every profile and evidence record must identify:

```yaml
runtime: codex
surface: desktop # desktop | cli | ide
runtime_version: "..."
platform: macos
architecture: arm64
configuration_fingerprint: "sha256:..."
installed_providers: []
permission_profile: "..."
```

`runtime` alone is never a sufficient compatibility coordinate. OMP profiles also record the observed `task` and job-control schemas. Claude Code profiles record plugin, agent, Hook, and MCP availability separately.

## Capability status

Each capability has one status:

| Status | Meaning |
| --- | --- |
| `native` | Supplied by the runtime surface itself |
| `extension` | Supplied by an installed plugin, extension, or MCP server |
| `external` | Supplied by a separately installed CLI or service |
| `fallback` | No direct operation; a declared fallback preserves the required invariant |
| `unsupported` | Tested and unavailable with no acceptable fallback |
| `unknown` | Not yet probed |

Records also name the provider, permissions, probe, and evidence artifact. Documentation can seed a hypothesis but cannot produce a `pass` observation.

## Canonical capabilities

### Skills and resources

- `skills.discover`
- `skills.invoke.explicit`
- `skills.invoke.automatic`
- `resources.relative_paths`
- `scripts.execute`

### Agent lifecycle

- `agents.spawn`
- `agents.spawn_parallel`
- `agents.wait`
- `agents.follow_up`
- `agents.cancel`
- `agents.read_result`
- `agents.read_transcript`
- `agents.custom_roles`
- `agents.model_override`
- `agents.reasoning_override`

### Workspace

- `workspace.inspect`
- `workspace.write`
- `workspace.isolate`
- `workspace.attach_worktree`
- `workspace.transfer_patch`
- `workspace.detect_generation`

### Coordination

- `coordination.task_list`
- `coordination.structured_output`
- `coordination.peer_messages`
- `coordination.durable_state`
- `coordination.scheduled_wake`

### Interaction and integrations

- `interaction.fixed_choice`
- `interaction.free_text`
- `web.search`
- `browser.control`
- `scm.pull_requests`
- `scm.review_threads`
- `scm.merge`
- `automation.recurring`

The last group is frequently supplied by an extension or external provider. It must not be attributed to the runtime without evidence.

## Surface baseline

This is a documentation-derived research baseline, not live conformance evidence.

| Surface | Skills | Plugins | Custom/subagents | Live probe status |
| --- | --- | --- | --- | --- |
| OMP | Observed, including relative resources | Runtime package | Generated custom role, delegation, parallelism, follow-up, active cancellation, completed-worker transcripts, isolated writer worktrees, and role-bound model/reasoning routing observed | Two W1 fixtures and eight delegated fixtures achieve W2; custom-role application, model/reasoning routing, cancellation, stale-generation exclusion, transcript retrieval, and one-writer isolation pass; D2/D3 are observed while overall delivery remains D0 because plugin-manager D1 is unresolved |
| Codex desktop | Documented | Documented | Documented | Pending |
| Codex CLI | Observed, including relative resources | Documented plugin browser | Delegation, parallelism, follow-up, active cancellation, external persisted-transcript reads, a managed writer worktree, and direct per-worker model/reasoning routing observed; generated custom role cannot be selected | D3, two W1 fixtures, and seven delegated fixtures achieve W2 on 0.155.1; custom roles are unsupported on the probed spawn surface, while model/reasoning routing, cancellation, stale-generation exclusion, transcript retrieval, and one-writer isolation pass |
| Codex IDE | Documented | Documented unavailable | Documented | Pending |
| Claude Code | Documented | Documented | Documented | Deferred: no local account or authenticated runtime available |

The Codex baseline is derived from the official
[Build skills](https://developers.openai.com/plugins/build/skills),
[Build plugins](https://developers.openai.com/plugins/build/plugins), and
[Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
documentation. Repository documentation must retain the observation date;
generated evidence must retain the exact runtime coordinates.

The current W2 observations prove `agents.spawn`, `agents.spawn_parallel`,
`agents.follow_up`, `agents.cancel`, `agents.wait`, and `agents.read_result`
for read-only workers. OMP additionally proves native asynchronous
background-job waiting and idle-worker revival. Codex records both follow-up
instructions in the same child thread. The cancellation fixture excludes the
cancelled generation from accepted results, but neither runtime produced a
late stale payload during the probe. Both runtimes isolate one writer from the
source checkout and independently verify its exact diff. OMP retrieves a
completed worker transcript through its native `history://` resource. Codex
CLI has no observed native transcript-read operation and instead reads the
persisted session JSONL as an external artifact; the task body is encrypted,
but its attributable assignment envelope, read command, ordinary assistant
marker, final result, and completion event remain independently visible.
Panels remain unproven, so these results do not establish complete W3.

The canonical `evidence-reader` role generates an OMP Markdown definition, a
Codex TOML definition, and a Claude-compatible Markdown definition from one
portable source. OMP 18.2.6 discovers and applies it, including a policy marker
that was not present in the task assignment. Codex CLI 0.155.1 can read the
project TOML, but its actual `codex exec` `spawn_agent` schema exposes no role
selector, both with and without `--ignore-user-config`. This conflicts with
the newer official custom-agent documentation and is retained as a
version-specific negative observation.

The `check-model-routing` fixture keeps concrete model identifiers out of the
portable Skill. OMP receives a probe-only `modelRoles` mapping and a generated
role definition with `thinkingLevel`; the child session records the resolved
model, thinking level, and non-fallback status. Codex CLI receives the model
and reasoning effort directly in its single spawn call; persisted parent and
child `turn_context` records independently show different model and effort
values. OMP's root invocation requested medium thinking, but its root session
serialized a null thinking-level event, so the evidence claims only the
independently observed worker override rather than complete root-reasoning
telemetry.

The isolation boundary differs by runtime. OMP creates an isolated writer
worktree and retains an unapplied patch. Codex CLI creates one managed worktree
for the root session; its writer child shares that checkout while the original
source remains clean. Codex treats `.agents` Skill content as read-only, so
writable fixtures and workflow outputs must live in project-owned paths.

Codex CLI lifecycle probes use persisted sessions inside a disposable isolated
Codex state directory. Version 0.155.1 returned `no thread with id` when the
same parallel probe ran with `--ephemeral`; delivery-only and root-only success
must not be treated as evidence that ephemeral child threads work.

Phase 2 replaces each research or documented entry with a versioned observation. Separate profiles are created when platforms, permission modes, installed providers, or runtime versions change behavior.

## Fallback rules

- Missing parallelism may degrade to sequential independent passes only when simultaneous writers and frozen unbiased candidates are not required.
- Missing isolation requires one writer at a time. Prompt instructions are not filesystem isolation.
- Missing follow-up starts a fresh session with a consolidated standalone brief.
- Missing cancellation marks the prior generation stale and prevents its later result from being accepted.
- Missing scheduled wake disables unattended-completion claims; it does not authorize an improvised sleep loop.
- Missing model diversity is disclosed. Distinct role names do not prove distinct models or backends.
- Missing UI control prevents a claim that visible behavior was verified.
- A fallback must name the invariant it preserves and have its own fixture.

## Evidence record

```json
{
  "profile": "codex-cli",
  "fixture": "prove-it-works",
  "observedAt": "YYYY-MM-DD",
  "result": "pass",
  "claims": {
    "deliveryTarget": "D3",
    "deliveryAchieved": "D3",
    "workflowAchieved": "W1",
    "observedDeliveryChecks": ["D2", "D3"]
  },
  "capabilities": ["skills.discover", "skills.invoke.explicit"]
}
```

Evidence expires when its runtime version, surface, provider set, permission state, fixture revision, or adapter contract changes.
