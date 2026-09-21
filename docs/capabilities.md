# Runtime capability model

## Compatibility levels

| Level | Claim |
| --- | --- |
| L0 | Package structure validates statically |
| L1 | Runtime installs and discovers the Skills |
| L2 | A user can explicitly invoke a Skill and resolve its resources |
| L3 | Single delegated sessions execute and return complete results |
| L4 | Parallel panels, lifecycle control, and isolation work natively |
| L5 | Representative playbooks satisfy cross-runtime behavioral fixtures |
| L6 | Long-running, PR, and shipping workflows complete against real external systems |

Each runtime and playbook receives its own level. Discovery of one Skill cannot raise unrelated workflows to the same level.

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

### Interaction and external systems

- `interaction.fixed_choice`
- `interaction.free_text`
- `web.search`
- `browser.control`
- `scm.pull_requests`
- `scm.review_threads`
- `scm.merge`
- `automation.recurring`

## Initial runtime matrix

The table is a design baseline, not a verified claim. Phase 2 replaces every `Research` entry with a versioned observation and evidence link.

| Capability | OMP | Codex | Claude Code |
| --- | --- | --- | --- |
| Skills discovery | Documented | Documented | Documented |
| Explicit invocation | Research | Documented | Documented |
| Custom agents | Documented | Documented | Documented |
| Spawn one agent | Documented | Documented | Documented |
| Parallel panel | Documented | Documented | Documented |
| Follow-up existing agent | Documented | Documented | Research |
| Cancel agent | Documented | Documented | Research |
| Read full result | Documented resources | Returned/wait result | Returned result |
| Transcript retrieval | Documented resources | Research | Documented storage/API |
| Isolated worktree | Documented task option | Native worktree support | Native worktree support |
| Per-agent model | Configuration mapping | Agent config/spawn override | Agent frontmatter/call |
| Scheduled wake | Host job control | Heartbeat/automation | Routines/background mechanisms |
| Plugin packaging | Runtime package | Agent Plugins/Codex manifest | Claude plugin manifest |

## Fallback rules

- Missing parallelism may degrade to sequential independent passes only when the playbook does not require simultaneous writers or unbiased frozen candidates.
- Missing isolation requires one writer at a time. Prompt instructions are not a substitute for filesystem isolation.
- Missing follow-up starts a fresh session with a consolidated standalone brief.
- Missing cancellation marks the prior generation stale and prevents its later result from being accepted.
- Missing scheduled wake disables unattended completion claims; it does not authorize an improvised sleep loop.
- Missing model diversity must be disclosed in the verdict.
- Missing user-interface control prevents a claim that the visible behavior was verified.

## Evidence record

Every runtime observation should eventually use this shape:

```yaml
runtime: codex
runtime_version: "..."
capability: agents.follow_up
status: pass
observed_at: "YYYY-MM-DD"
fixture: evals/fixtures/follow-up
command_or_prompt: "..."
artifact: "..."
notes: "..."
```

