# Autonomous-run wake request

Prove the waiting branch of `autonomous-run` against this disposable fixture.
Load the generated `autonomous-run` and `show-me-your-work` Skills.

The immutable contract is:

- exit predicate: provider revision `provider-r1` is `READY`, the completion
  receipt is accepted, and the heartbeat is disarmed;
- measurement: `node provider.mjs status .` from the fixture root;
- budget: at most two wake runs and fifteen minutes;
- authorized fixture writes: `state.json`, `checkpoint.json`, `decisions.tsv`,
  and `report.json`;
- no source edits, Git operations, publication, merge, spending, external
  provider mutation, sleep loop, or busy polling;
- stop on predicate met, wake budget or deadline, revision drift, checkpoint
  mismatch, unavailable wake capability, or cleanup failure.

On the initial observation, the provider is `WAITING`. Create one host-native
heartbeat attached to the current thread, record its runtime-issued identifier
with `node wake.mjs pause . <automation-id>`, run `node verify-pause.mjs .`, and
stop. The test harness releases the provider independently.

The saved heartbeat prompt must remain valid on a cold start. On wake, first
run `node wake.mjs preflight . <automation-id>`. Only after that command proves
the checkpoint is still waiting and all anchors and budgets are valid may the
run re-measure the provider and run
`node wake.mjs resume . <automation-id>` exactly once only when the anchored
revision is `READY`. Disarm the heartbeat, require the host to confirm its
inactive or deleted state, run `node wake.mjs cleanup . <automation-id>` only
after that confirmation, and then run `node verify-final.mjs .`. Do not
schedule another wake after a terminal predicate. A stale queued run that sees
a terminal checkpoint must exit before measuring the provider.
