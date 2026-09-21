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
| OMP | Research | Runtime package | Documented, schema-dependent | Pending |
| Codex desktop | Documented | Documented | Documented | Pending |
| Codex CLI | Documented | Documented plugin browser | Documented | Pending |
| Codex IDE | Documented | Documented unavailable | Documented | Pending |
| Claude Code | Documented | Documented | Documented | Pending |

The Codex baseline is derived from the official [Skills and Plugins](https://developers.openai.com/codex/skills-and-plugins), [Plugins](https://developers.openai.com/codex/plugins), and [Subagents](https://developers.openai.com/codex/subagents) documentation. Repository documentation must retain the observation date; generated evidence must retain the exact runtime coordinates.

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

```yaml
schema_version: 1
target:
  runtime: codex
  surface: cli
  runtime_version: "..."
  platform: macos
  architecture: arm64
  configuration_fingerprint: "sha256:..."
capability: agents.follow_up
status: native
provider: codex
permissions: []
observed_at: "YYYY-MM-DD"
fixture: evals/fixtures/follow-up
command_or_prompt: "..."
artifact: "evals/evidence/..."
result: pass
notes: "..."
```

Evidence expires when its runtime version, surface, provider set, permission state, fixture revision, or adapter contract changes.
