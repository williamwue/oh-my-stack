# Project status

Updated: 2026-09-25. Published baseline:
[v0.2.0-beta.2](releases/0.2.0-beta.2.md).
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

A bounded `architect.runners` panel smoke on 2026-09-25 read only this
repository's `package.json`. OMP beta.1 made one ordered three-task call;
separate child records passed setup acceptance for native roles 1/2/3 at
`openai-codex/gpt-6-astra@high`, `gpt-6-sol@high`, and `gpt-6-luna@high`, with
no model fallback. One child gave an off-by-one file citation; the parent
corrected it, so task-content accuracy remains a separate concern. Codex's
isolated candidate package prepared all three explorer contracts and made
exactly three explicit spawns in the same order. Each child record passed
model/effort acceptance at Astra/Sol/Luna `@high`. Codex's parent message was
encrypted in the runtime record, so contract text could not be compared
byte-for-byte; native custom-role selection is not claimed. This verifies one
synthetic read-only panel, not full architect implementation, all panels, or
cross-provider backend diversity. The temporary Codex credential copy was
removed and the OMP user plugin remains beta.1.

## Next work

Beta.2 was published from clean tag `v0.2.0-beta.2` at `cfe32b5` with four
archives, a release manifest, and SHA-256 checksums. The local tagged gate
passed 111 tests and all checksums; GitHub CI run `36093516834` passed. The
user completed the desktop Skill-selection check on 2026-09-25. This is
user-reported acceptance, not an agent-controlled UI trace. Beta.2 adds
read-only package inspection/change planning, verified
owned-directory rollback, and an observed [host matrix](host-compatibility.md).
Its bounded negative regressions reject missing models, unsupported efforts,
fallback and absent child evidence. Fresh read-only failed-worker, parallel
drain, and one-retry runs on both hosts are recorded in the
[bounded collaboration acceptance](bounded-collaboration-acceptance-2026-09-25.md).
These used beta.2 package instructions and helpers with normally installed
beta.1 plugins; they do not certify plugin-native beta.2 loading. Codex active
cancellation and cross-host checkpoint pickup passed in the same narrow test.
OMP 18.3.0 cancel-and-replace also passed through the current `proc://` API;
the initial `hub`-based probe was obsolete and did not test that path.
Full `npm run check` passed 111 tests before the tagged release gate.

| Priority | Work | Completion evidence |
| --- | --- | --- |
| P1 | Complete collaboration lifecycle | Test real timeout and delayed-result handling, active-worker recovery after coordinator restart, and isolated concurrent writers; then repeat model-facing acceptance through normally installed beta.2 plugins |
| P2 | Broaden host compatibility | Recheck changed delegation tools and test additional OS/host versions as available; the current matrix records only observed local combinations and Ubuntu offline CI |

## Later phases and explicit boundaries

- Continue collaboration acceptance beyond the bounded read-only cases above:
  arena candidates/cross-judges, architect implementation/redesign, and
  autopilot review/merge behavior require their own frozen scopes. Existing
  fixtures do not certify every real-project scenario.
- Authenticated external systems and long runs still need named test targets
  and authority: PRs, remote CI, scheduled wake, Benny and webhook delivery.
- Claude Code authenticated runtime tests until the user has an account.

The user's personal OMP `modelRoles` configuration is separate from the
product. No personal Cursor/OpenAI subscription choices are installed as
defaults for other users. Full Cursor pstack behavioral parity remains unproven.
