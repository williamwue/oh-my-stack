# Project status

Updated: 2026-09-25. Published baseline: [v0.2.0-beta.1](releases/0.2.0-beta.1.md).
This is the current backlog. Earlier dated acceptance documents remain evidence
for their recorded revisions and runtimes, not a second current task list.

## Completed

- All 25 originally missing upstream entries are implemented: 16 main entries
  and nine extracted playbooks. The public catalog has 74 directly selectable
  Skills: 51 workflows and 23 principles. See the
  [completion plan](upstream-completion-plan.md) for preserved contracts.
- Codex and OMP user-level setup, complete project overrides, named workflow
  routes and ordered panels, and shared reasoning-budget targets are implemented.
  Model choices remain runtime-specific; see the [setup guide](../README.md).
- Beta.1 was published on 2026-09-24. Its clean tagged build passed 108 tests;
  the corresponding GitHub CI completed successfully. Local Codex and OMP
  installation and bounded Skill loading passed. Runtime limits are recorded
  in the [release notes](releases/0.2.0-beta.1.md).
- Second-computer first installation: the user reported on 2026-09-25 that it
  was completed without problems, in response to the installation follow-up.
  This closes that user experience task. No logs, exact host versions, or OS
  were supplied; it does not establish a Windows compatibility matrix or
  certify every setup route.

## Changes prepared after beta.1

- Setup now identifies its destination as user, project, or detached scope.
  The post-apply audit can report which manifest the current project selects,
  including a project override that differs from the successfully saved user
  default. Configuration checks remain separate from runtime verification.
- The setup receipt names all configured roles/routes and ordered panel entries,
  the effective scope, evidence and next action, and distinguishes OMP's
  general model roles from Oh My Stack workflow agent settings.
- These changes are source changes for the next release, not changes to the
  published beta.1 archive or existing installed plugins.

Validation on 2026-09-25: the full `npm run check` passed (108 tests), with
the existing cross-runtime scope test extended to audit a shadowed user
configuration. Skill format validation passed. Read-only audits against the
local Codex and OMP configurations each verified 35 owned files and selected
the user manifest for this repository. No parent/child records were supplied
to those audits, so they correctly retained unverified runtime activation.

The revised setup receipt was also exercised on both hosts on 2026-09-25.
Fresh model inventories produced read-only user-scope previews for Codex and
OMP. Applying the same choices only inside disposable projects produced
project-scope manifests; auditing the existing user manifests from those
projects correctly reported that the project overrides were effective and the
audited user manifests were shadowed. Each audit verified 35 owned files and
left runtime activation unverified. Separate, read-only Codex CLI and OMP
sessions read the candidate setup instructions and existing user manifests,
then reported all named routes, canonical roles, ordered panels, effective
user scope and the missing parent/child evidence. Those sessions tested the
source-guided receipt, not direct selection of a newly installed plugin Skill
or actual worker dispatch. The user's global setup was not rewritten.

## Next work

| Priority | Work | Completion evidence |
| --- | --- | --- |
| P1 | Refresh representative worker evidence for the next package | New parent/child records identify the installed version, route, actual model/effort and role contract; previous logs retain their original dates |
| P1 | Verify the next installed package's setup entry | Direct Skill selection in fresh Codex and OMP sessions shows the same complete receipt and correct effective scope |
| P2 | Simplify installation, diagnosis and upgrades | A documented entry identifies installed version and selected configuration, previews owned changes, and supports verified update/rollback |
| P2 | Track host and model compatibility | Record tested host/OS versions and regressions for missing models, unsupported efforts and changed delegation tools |

## Deferred by user choice

- Full real-project collaboration: swarm recovery, cancellation and retry,
  arena candidates/cross-judges, architect implementation/redesign, and
  autopilot review/merge behavior. Bounded fixtures and earlier live cases
  remain useful evidence without certifying every scenario.
- Authenticated external systems and long runs: PRs, remote CI, scheduled wake,
  coordinator restart, Benny and webhook delivery.
- Claude Code authenticated runtime tests until the user has an account.

The user's personal OMP `modelRoles` configuration is separate from the
product. No personal Cursor/OpenAI subscription choices are installed as
defaults for other users. Full Cursor pstack behavioral parity remains unproven.
