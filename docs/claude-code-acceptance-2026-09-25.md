# Claude Code first native acceptance — 2026-09-25

This is a bounded macOS CLI observation on Claude Code 2.1.282, not complete
pstack parity or a user-level Oh My Stack installation. The user had an
authenticated Claude Code session. Testing used `--plugin-dir`, which loads the
plugin only for the test session and did not change Claude Code plugin settings.

The published `v0.2.0-beta.3` Claude Code archive was extracted into a
dedicated temporary directory. `claude plugin validate` passed against its
plugin root. A fresh plan-mode run explicitly invoked
`/oh-my-stack:prove-it-works` from that extracted package. Session
`ac5351e3-222b-4f6a-81d8-cd16793e078e` reported the installed Skill path,
the repository root, and a clean Git tree; the invocation had no permission
denials or file changes.

A second fresh plan-mode run selected the packaged native
`oh-my-stack:explorer` agent once. Session
`7895af48-f81f-4d00-b0c7-8f3ae5f7c395` recorded one requested, spawned,
and completed child of that exact type. Its child transcript reported
`claude-opus-5-5`; the root independently confirmed `package.json` name and
version. The run did not set a route model or effort, so it verifies native
role discovery and basic delegation, **not** Oh My Stack model routing or
reasoning intensity. Neither a three-worker panel nor a write workflow ran.

`claude -p '/model'` returned aliases including Fable, but a separate
session-local `/model fable` request reported that Fable 5.1 requires one-time
interactive consent on this account. A menu entry is therefore not sufficient
evidence of account entitlement. At the published beta.3 revision, the Claude
inventory collector failed closed, and `setup-oh-my-stack` could not write a
verified mapping. Personal Claude settings and the project repository were
not changed by these first live probes.

Subsequent unpublished local development added an opt-in bounded model probe,
Claude-native user/project role output, and a setup file/scope auditor. The
later temporary-project test observed Sonnet and Opus; requesting the Haiku
alias instead yielded Sonnet, so the collector rejected that result. A native
`ohmystack-how-explorer` child used its configured Sonnet model. Child effort
was not observable in that record. The user then chose a two-model mapping
without Haiku. A second temporary-project run spawned the three configured
`architect.runners` agents in order: Opus 5.5, Sonnet 5, Opus 5.5. All three
completed the same read-only task. A project-local `PreToolUse` hook recorded
each child identity and effective `high` effort, checked against matching
parent and child records. This is one bounded panel, not full architect
workflow acceptance. Neither run changed the user's global Claude settings.
Another session-only `--plugin-dir` run exercised the generated package's
effort hook and setup auditor for one `how.explorer` child at Sonnet 5 `@high`.
That parent answer incorrectly treated appended role-policy text as part of the
fixture file, so task-content correctness is not included in the acceptance.
This later code was not part of the published beta.3 acceptance.

Machine-readable local panel evidence:
[setup-panel-local-candidate.json](../evals/evidence/claude-code-2.1.282/setup-panel-local-candidate.json).

Machine-readable evidence: [native-plugin-smoke.json](../evals/evidence/claude-code-2.1.282/native-plugin-smoke.json).

## Installed beta.4 follow-up — 2026-09-26

On Claude Code 2.1.283, the user-scope beta.4 plugin was enabled. A read-only
audit selected the user's medium-budget resolution in a temporary project and
verified all 29 owned role files. A bounded three-reviewer test used a frozen
six-line fixture with one real upper-clamp defect. Parent/child records and a
project-local effort hook independently verified the ordered
`interrogate.reviewers` panel at Opus 5.5, Sonnet 5, Opus 5.5, each `@high`.
All three reviewers found the defect; the root independently confirmed it.

A second session directly invoked `/oh-my-stack:interrogate`. It read the
packaged review references, completed three independent reviewers and a
separate synthesizer, and reached the same correct finding. External records
again verified worker models and effort. However, the root answer attributed
the model IDs to reviewer self-reports rather than runtime metadata. That
violates the Skill's attribution rule, so full Skill acceptance is withheld.
The root also disclosed that its restricted tool scope prevented it from
checking the fixture hash and active user manifest; those facts were verified
separately outside the Claude session. No global hook was installed and no
business repository files were changed. See the
[panel pass](../evals/evidence/claude-code-2.1.283/interrogate-panel-user-setup.json)
and [Skill attribution gap](../evals/evidence/claude-code-2.1.283/interrogate-skill-attribution-gap.json).

## Unreleased repair acceptance — 2026-09-26

An explicit root-metadata requirement now prevents reviewer self-description
from establishing model identity. A session-only candidate retest completed
three reviewers and a separate synthesizer, found the fixture defect, and
reported each model as unverified because the root lacked runtime records.
The external auditor separately verified the three configured models and high
effort. This passes the attribution repair, not the root's inaccessible hash
and manifest checks. See the
[attribution retest](../evals/evidence/claude-code-2.1.283/interrogate-skill-attribution-candidate-retest.json).

A read-only arena probe launched all three configured runners and a separate
cross-judge. The first run handed the judge summaries rather than complete
candidate artifacts. The shared Skill now requires complete frozen outputs
or readable immutable artifact paths. A subsequent candidate run delivered
three labeled complete outputs, compared them, and returned a source-checked
patch proposal. It did not apply or execute the patch. Preserve both the
[initial gap](../evals/evidence/claude-code-2.1.283/arena-panel-readonly-probe.json)
and [handoff retest](../evals/evidence/claude-code-2.1.283/arena-full-artifact-candidate-retest.json).

The candidate passed 121 repository tests, generation and conformance checks,
reproducible build, schema validation, and Markdown lint. These session-only
tests did not upgrade the user's installed beta.4. Failure/cancellation,
implementation isolation, redesign, and a newer-version upgrade remain open.
