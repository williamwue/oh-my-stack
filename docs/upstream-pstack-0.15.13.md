# Use the pstack 0.15.13 additions in Oh My Stack

The 0.7.0 source candidate adds four directly invocable Skills. It reviews all
33 pstack files changed between `ecc249f1` (0.15.5) and `2cbf5850` (0.15.13).
The [decision receipt](acceptance/2026-10-06/upstream-decisions.json) records
each source file, target, and retained difference. This is a scoped semantic
update, not full Cursor workflow parity or a published release.

## Ask for help without starting the work

Select [poteto-help](../src/core/skills/poteto-help/SKILL.md) in your host and
ask which workflow fits your task. It reads the generated catalog and the
owning procedure, then gives an answer, one usable prompt, and a source.
Installation, model probes, and workflow execution require an actual request.
An explicit work request goes through poteto-mode instead of remaining in help.

State the goal, a done check, the proof to show, known evidence, and constraints.
Use the host's actual Skill picker or invocation syntax. Plain text alone may
not select a structured Skill input. Keep model configuration, plugin version,
and workflow behavior separate when diagnosing a run.

## Prevent a recurring mistake

Select [correct](../src/core/skills/correct/SKILL.md) to group real repeated
repository failures and eliminate their mechanism. Give the agent the relevant
history and boundaries. It tries architecture, types, diagnostic checks, and
behavior tests before documentation. Require the new constraint to reject an
authentic past failure before accepting it. Missing history is a proof gap.
Use reflect when the requested change is to a workflow Skill itself.

Architect now also checks split ownership, multiple supported paths, importable
internals, and hand-synced lists. Typescript guidance reuses the existing schema,
derives types from it where possible, and requires a type-first validator to
prove the complete structure.

## Check what a performance number means

Use [benchmark-checklist](../src/core/skills/benchmark-checklist/SKILL.md) before
reporting or acting on a performance comparison. Read the measurement code and
record tuning, actual completed work, failures, repeated samples, spread, the
limiter, and end-to-end relevance. Profile separately from reported timings.
Compare both sides fairly. A faster error or unconsumed generator is not a win.

The [Explain the Number](../src/core/skills/principle-explain-the-number/SKILL.md)
principle applies to measured performance and eval claims. If a conclusion
cannot rule out skipped work, failure, untuned settings, or noise, retain the
uncertainty. A requested ballpark can use one disclosed sample; selecting a
winner between alternatives needs the full comparison.

Perf issue tries cheaper strategies first and stops when the target is met.
Hillclimb uses that order but retains its own frozen sustained-run contract.
Its harness prints failures and completed work so every attempt can be checked.

## Hand off work with complete context

New tasks, repair rounds, retries, and queue items use fresh child sessions with
the original brief, later directives, prior findings and responses, unresolved
objections, exact revisions, ownership, and checks. A role outlives its agent.
Reuse requires costly state such as a live process or bound runtime identity
and must be permitted by the host. Fence active writers before replacement.

Standing programs record a configurable audit interval, defaulting to one
hour. They use an authorized verified host scheduler with a deadline and wake
budget. Missing wake support produces a durable pause. This update does not
install a scheduler, arm a recurring job, or expand provider execution support.
Each verifiable unit saves progress; remote pushes still require authorization.

## Prepare a reviewable change

Opening a PR follows the repository's template and the user's instructions.
Explain the problem, meaningful changes, scope, risk, and actual verification.
Prefer host-owned PR tools for the operations they own and associate the PR
with its task when the host requires it. Tool availability grants no publishing
authority. Personal plugin updates and release publication remain separate.

The source attribution lines in technical-writing are retained. The upstream
version number belongs to the provenance record; OMS remains independently
versioned. Existing book editions and dated acceptance records preserve their
historical source rather than being rewritten by this update.
