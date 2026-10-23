# Native Claude per-call effort

The native helper prepares an `Agent` request and verifies separately supplied
execution evidence. It never invokes Claude, probes an account, installs agents
or changes saved role configuration. T3 delegation continues to use its own
`target.options`; this helper is for standalone Claude Code.

## Prepare a call

Resolve the installed package root, then run:

```sh
node /path/to/installed-package/scripts/claude-delegation.mjs prepare --input request.json
```

In a source checkout use `tools/claude-delegation.mjs`. The input contains
`bundleRoot`, project `cwd`, optional `userRoot`, exactly one `roleName` or
`routeName`, one-based `entry`, `task`, and captured `capabilities`:

```json
{
  "runtime": "claude-code",
  "version": "2.1.292",
  "source": "native Agent schema and authorized model observation",
  "observedAt": "2026-10-23T00:00:00Z",
  "agentTypes": ["ohmystack-how-explorer"],
  "models": [
    { "id": "observed-canonical-model-id", "selector": "sonnet", "reasoningEfforts": ["low", "medium", "high"] }
  ]
}
```

This is an example of the capabilities field, not a model inventory to reuse.
Capture the actual installed version, allowed Agent subagent types and model
selectors, and model-specific effort support. Supply canonical-to-native
selector mappings explicitly; the helper never guesses an alias from a slug.
Project configuration takes precedence over user configuration. Without a saved
canonical-role selection the call inherits its parent and omits model/effort.

The output's `arguments` are the native tool fields. Pass them unchanged to
`Agent`; keep `audit` and `sha256` as a receipt outside the call. The selected
configured agent type is preserved. Packaged canonical roles use the native
`oh-my-stack:ROLE` name and must actually be advertised before dispatch.
An explicitly advertised no-effort selection (`none`) omits the native effort
field; it is never sent as a native effort value. There are no generated
effort-wrapper agents, invented speed fields or global
model rewrites. Optional `jobContext` uses the shared task adjustment logic;
verification keeps the saved effort. To retry an actual rejected adjustment,
supply both `rejectedAdjustment` and the complete saved first result as
`rejectedPreparedRequest`. The helper replays that request using its captured
capabilities and checks the task, role/member, configuration, job and scope.
Current capabilities independently determine whether the restored model, agent
type and saved effort are still supported. Removing the rejected tier from a
refreshed catalog does not change the original retry basis. An altered receipt
or changed assignment requires a new preparation. Rejection consistency checks
do not authenticate the host's reported rejection.

Per-call effort requires Claude Code 2.1.292 or later and model-supported native
`low`, `medium`, `high`, `xhigh` or `max`. The call overrides agent-frontmatter
effort. `CLAUDE_CODE_EFFORT_LEVEL` overrides both; the receipt records this value
as expected effective effort, never observed effort. A forced subagent-model
environment prevents explicit model selection and is reported as unsupported.
See [Claude's native contract](https://code.claude.com/docs/en/sub-agents#choose-an-effort-level).

## Verify effort separately

Keep the actual tool arguments, returned child ID and a matching authorized
PreToolUse hook record from `claude-effort-hook.mjs`. Its existing explicit
output-path interface remains opt-in. It accepts configured `ohmystack-*` and
packaged `oh-my-stack:*` agents, records bounded identity/effort fields and
omits tool inputs and chat bodies. Do not install a hook or read another
session's transcript merely to manufacture evidence.

```sh
node /path/to/installed-package/scripts/claude-delegation.mjs verify --input evidence.json
```

The evidence JSON contains `prepared`, the actual `dispatch`, returned
`agentId`, and one correlated hook `observation`. A changed dispatch or receipt
is invalid. Missing identity, a different child/type, or absent effective effort
is inconclusive. Results distinguish `effort-matched`, `effort-mismatch` and
`inconclusive`; model/backend identity remains unverified by this effort record.
Hook authenticity and task attribution require supported native host evidence.
Synthetic records validate this verifier's behavior, not a real Claude session.

Exit codes: 0 for preparation or matched effort; 1 for inconclusive/mismatched
effort verification; 2 for invalid input or unsupported preparation.
