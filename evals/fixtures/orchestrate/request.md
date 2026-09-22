# Orchestrate request

Use `orchestrate` to complete the four-unit disposable local program. The fixed
predicate is `4/4` integrated units in generation 1. The maximum live worker
window is two. Local provider integration is authorized; publication is not.

The root is the coordinator and must not run `unit.mjs execute` or
`unit.mjs verify`. It may run only program status, brief, start, drain, verdict,
integrate, report, and final verification commands.

Run `pilot` through a real native worker and a different real native reviewer,
then integrate it before starting any other unit. After the pilot, create the
generation-bound briefs for `alpha` and `beta`, start both workers before
waiting, and treat each completion as an inbox event. Drain `alpha` by itself
while `beta` remains live; review and integrate it, then drain, review, and
integrate `beta`. Only then brief and run `join`, whose brief must carry the
actual integrated head receipts for both dependencies.

Every worker may run only
`node unit.mjs execute . <unit> worker-<native-task-id>`. Every reviewer may run
only `node unit.mjs verify . <unit>` and must return its unchanged native task
identifier and observed result without writing. The root records exact native
identifiers, never invented replacements. Finish with `program.mjs report` and
`verify.mjs`. Do not push, publish, weaken the predicate, exceed the rolling
window, or absorb a child unit into the root.
