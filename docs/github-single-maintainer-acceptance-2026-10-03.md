# GitHub single-maintainer acceptance — 2026-10-03

## Scope and authority

The maintainer requested the proposed single-maintainer policy, normal merge,
interrupted-merge recovery, and release continuation. After the existing
private repository returned a plan-related HTTP 403 for branch protection,
the maintainer explicitly authorized a new public synthetic-only repository:
`williamwue/oms-github-acceptance-public`, target `main`. The original private
repository and its open PR remain unchanged; no GitHub account or paid plan
was added.

The root used the existing native `gh` login as `williamwue`. The new public
repository has only a README, an answer module, a Node test and a GitHub Actions
workflow. The target requires the `acceptance` check from GitHub Actions App
15368, strict freshness, administrator enforcement, conversation resolution,
and no force pushes or deletion. GitHub approval count is explicitly zero;
independent OMS review is required separately by the new adapter policy.

## Implementation and independent review

The [design record](single-maintainer-design-2026-10-03.md) records the direct
policy discriminator and one-writer throughput boundary. Implementation ran
in an isolated worktree based on `427f15733894448ca8474c5434500444f96aeef4`.
Original workspace book and release changes were preserved.

`/root/single_maintainer_impl` owned the two source helpers and their tests.
The root owned integration, documentation, packaging and GitHub mutations.
`/root/single_maintainer_review` reviewed frozen hashes independently. Its
first verdict was FAIL: a missing required-check App ID could match any
source. The regression failed before the fix. The corrected policy requires
positive App IDs and reconciles legacy contexts against pinned checks.
The second verdict was PASS with no findings. The reviewer independently
repeated the missing-source and wrong-source probes (zero PUTs), and recovered
an interrupted journal created by the actual 0.4.0 provider with one total PUT.

The corrected focused command passed 35 tests:

```sh
node --test tests/github-autopilot-provider.test.mjs tests/github-workflow.test.mjs
```

`npm run check` passed 227 tests, generated-file checks, deterministic build
checks, validation, book validation and Markdown lint. The installed candidate
Codex package passed manifest verification and its helper bytes matched source:

| Helper | SHA-256 |
| --- | --- |
| github-autopilot-provider.mjs | `5ea3b704593ea96fc2e7cf11119db3cdd30f6d6c3fe100baa5965cc2fa2d7ef6` |
| github-workflow.mjs | `4595fabb137e8bd06973d2a2d6c2e6cc1a08665106e899cae07c8480960ef7b7` |

Worker and reviewer model/effort, parent links and task paths were checked in
persisted runtime records. Parent spawn messages were encrypted, so exact
role/task text could not be audited there. Separate sessions, not distinct
GitHub accounts, supplied the OMS reviews.

## Normal merge

[Public fixture PR 1](https://github.com/williamwue/oms-github-acceptance-public/pull/1)
changed five README lines. `/root/normal_fixture_review` independently returned
PASS after checking the exact diff, one passing Node test, live CI and target
protection.

- Base: `fd0c3338e93b8ce0c183732cb2952048d62a3951`.
- Head: `65d60ab20e18315cfd4a74d6329c729b6926951c`.
- Stable patch: `46abd59df5696bc9cd299d27686162c0002280a4`.
- Merge: `faa8ad575f20312e162dbbd2f4cfdde036f4fc38`.

The installed candidate reported `ready: false` under the default
`github-review` policy and `ready: true` under explicit `independent-oms`.
The root then called the installed workflow library with the bound verdict,
frontier and server-policy authorization. Native GitHub merged the PR; the
journal recorded intent and completed outcome. A fresh fetch and
`git merge-base --is-ancestor` confirmed the merge on `main`. No admin bypass
or GitHub review was fabricated.

## Interrupted merge

[Public fixture PR 2](https://github.com/williamwue/oms-github-acceptance-public/pull/2)
also changed five README lines. `/root/interrupted_fixture_review` returned
PASS for the exact patch, test and live gates before the root initiated merge.

- Base: `faa8ad575f20312e162dbbd2f4cfdde036f4fc38`.
- Head: `4a885e44ab7e17eafbdff51a8b67c1e2fa62ae82`.
- Stable patch: `d67ff1162505073fe8c568f4263345fe641b69a7`.
- Merge: `7e5f008cff30482f7407a131f721d4f35d2649c8`.
- Operation: `public-interrupted-merge`, generation 1.

A transport wrapper around the installed package's native transport saved
GitHub's accepted merge result and then killed its own process with SIGKILL,
before the provider could append an outcome. The supervisor observed PID
31063 exit with return code -9. The journal retained exactly one intent and
its operation lock. The first recovery correctly stopped with
`CONCURRENT_WRITER`.

The root verified the supervisor result, matching lock and child PID, absent
owner process, and absent append lock. It renamed only the orphan operation
lock into evidence, preserving the journal and operation ID. A fresh process
reopened the same operation with the same `independent-oms` policy. Five GET
requests reconciled the merged result; the journal then contained intent and
completed outcome. The entire scenario issued exactly one merge PUT. Fresh
remote readback and target-ancestry checks confirmed the merge on `main`.
The normal scenario also issued exactly one PUT. Protection readback after
both merges retained the configured restrictions.

This is operator-assisted orphan recovery, not automatic lock reclamation or
host-session restart. The wrapper introduced the interruption but delegated
every GitHub request to the real installed native transport.

## Scope limits

This verifies an installed Codex helper using native GitHub authentication.
It does not certify the default independent-GitHub-account approval path,
automatic orphan reclamation, host-session restart, worker reattachment,
background scheduling, full autonomous queues, or complete pstack equivalence.
Caller review records remain assertions. Active rulesets, unpinned/legacy-only
checks, code-owner and last-push approval policies stop as unsupported in the
new mode. The atomic expected-base-SHA limitation remains unchanged.

Raw journals and transport-call audits are local private evidence, separate
from these public summary coordinates. Release publication and installed
host registration require their own receipts.
