# Check Stale Replay fixture

Use the `check-stale-replay` Skill exactly once. Require generation 1 to send
its ready peer message while active, cancel it, accept generation 2, then
resume the same generation 1 worker session only to deliver its retained stale
payload. Record but reject that payload, independently verify the root asset,
and make no project changes.
