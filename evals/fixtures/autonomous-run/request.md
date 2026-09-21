# Autonomous-run request

Drive this one bounded task without intermediate questions until the local
controller reports predicate `3/3`. Load `poteto-mode`, `autonomous-run`, and
`show-me-your-work`.

Before iteration one, declare this immutable contract:

- exit predicate: controller completed `3/3`;
- measurement: `(cd .. && node controller.mjs status .)`;
- budget: at most 4 iterations and 10 minutes;
- authorized writes: only the controller's active `lib/unit-*.mjs`, local Git
  commits, `state.json`, `decisions.tsv`, and `report.json` in this fixture;
- no push, publication, external network action, scheduled wake, or merge;
- stop on predicate met, budget exhaustion, controller rejection, stale state,
  conflict, or required human decision.

This fixture has ready local work, so the wake strategy is
`continuous-local-no-scheduled-wake`. For each iteration:

1. read controller status;
2. edit only its active unit to return the requested value;
3. run only that unit's named test and commit the verified one-file change;
4. run `(cd .. && node controller.mjs advance .)` exactly once;
5. append one row with `.agents/skills/show-me-your-work/scripts/log.sh` to
   `../decisions.tsv` using these exact five cells after the timestamp:
   `iteration-N`, `keep unit-x`, `predicate advanced`,
   `controller advance N/3`, `predicate N/3`.

Do not edit future units early, amend, squash, retry a rejected advance, relax
the predicate, or continue after `DONE`. When the predicate is met, write
`report.json` outside `project/`:

```json
{
  "workflow": "autonomous-run",
  "exitPredicate": "controller completed 3/3",
  "budget": { "maxIterations": 4, "maxMinutes": 10 },
  "wakeStrategy": "continuous-local-no-scheduled-wake",
  "iterations": 3,
  "commits": ["<unit-a SHA>", "<unit-b SHA>", "<unit-c SHA>"],
  "kept": ["unit-a", "unit-b", "unit-c"],
  "discarded": [],
  "decisionLog": "decisions.tsv",
  "finalPredicate": "3/3",
  "stopReason": "predicate-met",
  "published": false,
  "result": "complete"
}
```

Run `(cd .. && node verify.mjs .)` and report the fixed contract, iterations,
kept commits, discarded attempts, final predicate, and stop reason.
