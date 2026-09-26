# Claude Code continuation acceptance — 2026-09-26

Runtime: Claude Code 2.1.283 on macOS. Tests loaded the beta.5 generated
package using session-only `--plugin-dir`, with existing authenticated user
roles. This did not upgrade personal plugins, change setup, or publish a release.
All fixtures were disposable local projects; no external repository was changed.

| Scope | Observed result | Boundary |
| --- | --- | --- |
| Natural late delivery | A worker captured generation 1, waited 45 seconds, and returned after the generation-2 worker. Both completed; root accepted only generation 2. | Controlled delay, not a production/network race; the test explicitly supplied the generation rule. |
| Actual crash and pickup | Driver killed the coordinator after checkpoint and child start. A fresh process validated anchors, inherited completed A, and dispatched only pending B. | Old child survived temporarily and was drained before pickup; original handle was not reattached. |
| Stale checkpoint | After a fixture commit changed HEAD, a fresh pickup refused continuation and spawned zero workers. | One changed-HEAD negative case, not every possible stale anchor. |
| Two-round architect | First synchronous implementation passed. New async/error requirements produced two failures, then another three-candidate arena plus judge led to a passing implementation. Independent final tests passed 3/3. | Guided new requirement, not autonomous discovery; full delegated how/why composition not tested. |

## Evidence and reproduction scope

- [Late delivery](../evals/evidence/claude-code-2.1.283/natural-late-delivery.json):
  `/tmp/oms-late-delivery.GyMrpo`, session
  `a4abd42a-d6ff-4013-ba58-8d2e7fec1e66`. The slow reader captures before
  sleeping; the root advances state only after its start marker, then starts
  the current reader. Native notifications arrived at 01:06:29.955Z for the
  current result and 01:07:09.716Z for the old result. No cancellation was used.
- [Crash pickup](../evals/evidence/claude-code-2.1.283/crash-checkpoint-pickup.json):
  `/tmp/oms-restart.vehMqr`, session
  `cad53758-b688-4206-9fec-0e27d7950566`. A scoped driver used SIGKILL only on
  its own coordinator after persisting the pending handle. It observed the
  orphan reader exit before starting pickup. The resumed tool surface did not
  expose `TaskOutput`; recovery used a validated checkpoint and a fresh B
  worker. Writers would require terminal-state confirmation or isolation before
  replacement. Session `2334abac-f346-4a7e-b909-0d6466d89d81` rejected the
  checkpoint after HEAD changed.
- [Redesign](../evals/evidence/claude-code-2.1.283/multi-round-redesign.json):
  `/tmp/oms-redesign.89DkQ6`, session
  `a70d7d07-07f6-4901-bfeb-573637170583`. Preserve first-round implementation
  and design, then add immutable tests requiring ordered outcomes, isolated
  sync throws and awaited async rejections. Round 2 compared concurrent fan-out,
  sequential delivery and per-event queues. The independently inspected judge
  request contains all three design packages, including pseudocode, rationale
  and test implications. Root chose fan-out and changed delivery/completion
  ownership. External `node --test phase1.test.mjs phase2.test.mjs` passed 3/3;
  historical snapshot and phase-1 test hashes stayed unchanged. Round-1 judge
  summaries are not credited as full-artifact handoff. Unsubscribe-during-publish,
  out-of-order completion and never-settling handlers remain outside these tests.

The temporary directories and private runtime transcripts are local audit
artifacts, not portable checked-in fixtures. Checked-in JSON records preserve
the assertions, session IDs, observations and relevant hashes. These results
are W2/D0 bounded workflow evidence, not deployment evidence or certification
of the same behavior on Codex and OMP. No product code change was needed for
these scoped tests; no new version is published by this acceptance record.
