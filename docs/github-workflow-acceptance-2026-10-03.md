# GitHub workflow integration — October 3, 2026

## Scope and throughput checkpoint

This continuation follows the remaining-task checklist using `poteto-mode`
routed to `feature`. Its bounded result is Codex package integration for one
GitHub PR, a complete local gate, and a target-concurrency policy decision.
The source baseline is `52bec251d379799afc56a3eb538ad82e68908020`; acceptance
applies to the working-tree candidate, not that commit alone.

One implementation writer owns the workflow helper, generator bindings and
tests in an isolated worktree. The root owns integration, inventory, acceptance
documentation and the separate concurrency experiment. A read-only reviewer
independently inspected the frozen implementation and its fixes. Shared generated
packages are rebuilt by the root only. Independent book work and its existing
gate fixes remain in the user's workspace.

The design is deliberately one PR at a time. It does not implement stack
topology, a repair loop, autonomous queue scheduling or worker reattachment.
Workflow authorization and independent review records are caller assertions;
they do not manufacture user consent or authenticate a reviewer session.

## Repository gate baseline

Before workflow integration, the concurrent book work had already repaired the
repository gate. The root verified `npm run check`: exit 0, 211 tests passed,
zero Markdown issues, three generated targets, twelve conformance records and
seven reproducible release outputs. The log is retained locally at
`/tmp/oms-check-before-workflow-20261003.log`.

Historical reports retain their exact original bytes. The validator pins these
hashes and grants only those exact documents the historical-path exception;
changed or copied content remains rejected. Private-key scanning still runs.
The new negative test verifies these boundaries. Narrow style overrides retain
the reports' original formatting, while ordinary instruction documents receive
formatting fixes.

| Frozen document | SHA-256 |
| --- | --- |
| `docs/operations/cloud-management-acceptance-2026-10-01.md` | `b05a97a10e579751b187d5e5d06e7150841aea9f85e4c994931594ec101dcce8` |
| `docs/omp-18.2.9-live-test-plan.md` | `17c558f6a5ccb28c6c2434b1877bb94ea9151d7f7339cc5c2160a4be7876b7ac` |

This supersedes the gate-blocked status recorded in the earlier
[provider acceptance](github-provider-acceptance-2026-10-03.md) without rewriting
that historical result or taking ownership of the concurrent changes.

## Target concurrency decision

The [throwaway experiment](github-target-policy-prototype-2026-10-03.md) compared
strict target revision and explicitly accepted server-policy behavior against
the real provider with an injected API transport. Strict mode made zero API
calls. Server-policy mode rejected drift visible before preflight, but merged
after drift injected immediately after the final protected-branch read.
Relabeling the operation ID while retaining old authority was rejected.

Therefore the workflow defaults to strict refusal. Ordinary shipping may use
an explicit, authorization-bound server-policy selection; it cannot silently
weaken a strict autonomous program.

## Final local verification

| Check | Observed outcome |
| --- | --- |
| `node --test tests/github-workflow.test.mjs tests/github-autopilot-provider.test.mjs` | 26 passed after review fixes; fake transport only |
| `npm run generate` and `npm run release:build` | Three targets and five package/plugin archives rebuilt locally |
| `npm run check` before independent-review fixes | 217 passed, zero failures |
| `npm ci --ignore-scripts` then `npm run check` in an isolated copy of the final candidate | Exit 0; 218 tests passed, zero Markdown errors, three targets, twelve conformance records and seven reproducible release outputs verified |
| `node tools/install-release.mjs install`, then `update` and `verify` with the candidate manifest and Codex target | Disposable installation succeeded; final installed bytes verified |
| Installed helper `--help` and library import/inspection | Succeeded without source-checkout dependency |
| Installed helper live `inspect` | Native account `williamwue`, repository `williamwue/oh-my-stack`, default branch `main`, public repository confirmed; remote reads only |
| Independent frozen implementation review and followup | Initial P1/P2 defects reproduced, fixed and independently rechecked; final PASS, no findings in scope |

The final full-check log is `/tmp/oms-check-workflow-final-20261003.log`.
The retained candidate checkout is
`/tmp/oms-workflow-acceptance-source-20261003`; production environment files
were excluded. The disposable installation is
`/tmp/oms-codex-workflow-install-20261003`. It does not register or replace the
user's active plugin. These paths and the earlier experiment remain available
for inspection; temporary test journals were cleaned by their tests.

The independent reviewer reproduced two defects in the first candidate:

- Mutable caller objects could retarget PR 7 to PR 8 after workflow validation
  but before provider invocation. The root first reproduced the failure, then
  added a synchronous complete request snapshot. The regression now observes
  exactly one PUT to the reviewed PR 7 despite caller-side edits.
- A sparse verification array passed `.every()` without containing actual
  evidence. The root reproduced that bypass, then required 1–256 real entries
  and inspected empty slots. Independent recheck confirmed sparse and oversized
  arrays fail before journal creation or network calls.

Final reviewed SHA-256 values:

- `tools/github-workflow.mjs`:
  `b30d0556c8be39c56d20ec7bc5226a553f28a3921a101ebbb09b143944857be5`
- `tests/github-workflow.test.mjs`:
  `aef4676460b93155b295db976e900f63ebf019b98eb89a1266c9f003af6ee273`
- `tools/generate.mjs`:
  `2a11ccec40a84002da5a630c31e160d6dcbf64bee3dbc7ebe8d93142a548b80b`
- `docs/github-workflow.md`:
  `e8de793c1ba40bb61b3b62a12a2a9a5f968e3a84ee40db3e7c3a210c168fbbe6`

The delegation helper verified the implementer's `gpt-6-sol/high` and separate
reviewer's `gpt-6-astra/high` against persisted child contexts and parent links.
Parent spawn-message bodies were encrypted, so exact role/task text could not
be audited; native custom-role activation is not claimed. The root inspected
the diff and ran integrated, installed-package and live read-only checks.

The previous provider source remains unchanged. The public catalog remains
74 Skills; only the Codex package gains these three bindings and their helper
dependencies. Existing book edits and historical evidence were preserved.

## Remaining hosted acceptance packet

Live write acceptance still needs an explicitly selected disposable repository,
target branch and permitted operations. With that scope, the reviewable run is:

1. Verify native account, origin, repository and branch protection. Freeze a
   fresh run identity, private journal and isolated source branch.
2. Authorize publishing one fixture PR. Read back its exact target and head.
3. Observe a deliberately failing CI check, apply one bounded repair, push
   under the same explicit scope and observe the replacement check result.
4. Obtain an independent OMS review of the final patch and a separate current
   GitHub approval from an authorized reviewer. Neither is fabricated by the
   helper or substituted for the other.
5. Obtain root merge authority bound to that revision and the accepted target
   policy. Merge once and verify the remote result and target ancestry.
6. Repeat the interrupted-response case in a fresh authorized run: terminate
   the client after intent/write, reopen its original journal, reconcile by
   readback and prove the POST/PUT was not repeated.

No fixture repository or remote branch is silently selected. This local
continuation does not create PRs, trigger remote CI, post reviews, merge,
publish a release or upgrade the user's installed plugin.
