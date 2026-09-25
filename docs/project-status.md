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

Further installed-package acceptance on 2026-09-25 used a clean build from
commit `a2708e2` (still reporting the source version `0.2.0-beta.1`, not a new
published release). Archive checksums passed. Codex installed the candidate
into an isolated `CODEX_HOME`; a fresh model session read the installed setup
Skill and complete workflow and produced the full role, route, and panel
receipt. That prompt deliberately limited inspection to the user manifest, so
the session correctly left this project's effective selection unconfirmed;
the separate read-only setup audit confirmed the user manifest is effective.
OMP's isolated-profile package install, doctor, and `skill://setup-oh-my-stack`
load passed, but that profile had no model login, so its candidate Skill was
not exercised by an OMP model. Neither CLI test proves structured selection
from the desktop Skill picker.

One fresh `how.explorer` child was verified on each host against the existing
user resolution, with the current project selecting that user manifest and 35
owned files passing audit. OMP's installed beta.1 used native agent
`ohmystack-how-explorer`; parent/child records for task
`PackageMetadataAcceptance` observed `openai-codex/gpt-6-luna@high` with no
model fallback. Codex's isolated candidate package prepared the full explorer
contract and explicitly spawned `package_metadata_acceptance`; parent/child
records (`01a0d616-ccd7-79f1-991b-3a95d1ac3046` and
`01a0d616-f9b2-7591-a166-c921a8abfd7e`) observed `gpt-6-luna@high`.
The parent record encrypted the message,
so the audit could not compare its role text byte-for-byte, and Codex native
role selection is not claimed. Both children read only `package.json`; this
certifies one route on each host, not every workflow or panel.

An OMP local-path install ignored `--scope=project` and briefly replaced the
user plugin link during this test. The link was restored to the original beta.1
package immediately, and `plugin doctor` passed. Local-path project isolation
must not be assumed; use the tested isolated `--profile` gate instead. The
temporary Codex credential copy used for model execution was removed.

Additional candidate acceptance on 2026-09-25 exposed a receipt omission:
an authenticated OMP session read the installed setup Skill but summarized
only 13 of 16 named single routes after a long, truncated manifest read. The
source now provides a deterministic, read-only Markdown receipt that verifies
owned hashes and emits all configured workloads, roles, routes, and ordered
panels. A separate installed-path test also exposed CLI entrypoints that
silently exited through a symlinked package or macOS `/tmp` alias; those
entrypoints now resolve their actual script path. The full check passed 110
tests, including both-runtime receipt completeness and symlinked CLI coverage.

A clean candidate build from commit `5ec3394` passed archive checksums and
OMP's isolated install gate. In an authenticated, temporary user-plugin link,
the OMP model called `skill://setup-oh-my-stack` and the installed receipt
script from outside the source checkout. Its final receipt contained all 7
canonical roles, 16 single routes, and four ordered panels, with effective
user scope and activation still unverified. The original beta.1 plugin link
was restored; its lock/package hashes and plugin doctor matched the baseline.
An isolated Codex CLI install of the same candidate read the installed Skill
and workflow and ran its bundled receipt script. A fresh final answer matched
that script's complete output after trimming surrounding newlines. Its temporary auth copy was
removed. These are installed-package CLI/model tests, not structured selection
from the desktop Skill picker; the available desktop-control interface denied
access to the Codex app. The candidate still uses the source version
`0.2.0-beta.1` and has not been published as a new release.

## Next work

| Priority | Work | Completion evidence |
| --- | --- | --- |
| P1 | Verify structured Skill selection in the desktop UI | Fresh Codex and OMP interactive sessions select the installed candidate directly and show the complete receipt; CLI/model execution is already verified, but desktop picker access was unavailable to this task |
| P1 | Expand worker evidence beyond the first route | New parent/child records cover representative panels and failure paths without treating the single-route smoke as full workflow parity |
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
