# OMP autonomous-run unavailable-wake fallback request

Prove the unavailable-wake fallback of `autonomous-run` against this
disposable fixture.

The immutable contract is:

- exit predicate: provider revision `provider-r1` is `READY` and its receipt is
  accepted by a later authorized pickup;
- measurement: `node provider.mjs status .` from the fixture root;
- budget: no wake runs and fifteen minutes;
- authorized fixture writes: only `state.json` measurement accounting,
  `checkpoint.json`, and `decisions.tsv`;
- the current runtime profile has no verified scheduled or event-wake
  capability;
- no invented automation identifier, source edit, provider release, Git
  operation, publication, merge, spending, sleep loop, detached process, or
  busy polling;
- stop on unavailable wake, budget or deadline, revision drift, checkpoint
  mismatch, or a required human decision.

Load exactly `skill://autonomous-run` and `skill://show-me-your-work`. Do not
search for, list, or read any filesystem copy of a Skill. Then execute exactly
these three shell commands separately and no others:

1. `node provider.mjs status .`
2. `node wake.mjs pause-fallback .`
3. `node verify-fallback.mjs .`

The first command reports `WAITING` and records the one allowed measurement.
Stop after the third command passes. Do not chain commands, use a task list,
start an asynchronous or background operation, inspect extra files, release or
re-measure the provider, create a schedule, claim unattended completion, or
continue local work.
