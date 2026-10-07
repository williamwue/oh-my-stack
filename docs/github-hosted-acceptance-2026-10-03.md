# GitHub hosted acceptance — October 3, 2026

## Authorized scope and target

The user selected a new disposable repository,
`williamwue/oms-github-acceptance`, with `main` as the target, and reported no
independent GitHub approval account. This run therefore covers real creation,
CI failure/repair and interrupted-create reconciliation. Merge remains outside
the accepted result. The repository was created private with native `gh` under
the verified maintainer account `williamwue`.

The [test PR](https://github.com/williamwue/oms-github-acceptance/pull/1) was
registered with this T3 thread immediately after creation; final thread-link
readback confirms the link. No application credentials, repository secrets or
production environment files were used. The fixture workflow has read-only
contents permission, one test job and a five-minute timeout.

## Real CI sequence

| Stage | Frozen revision | Observed result |
| --- | --- | --- |
| Baseline `main` | `4c851bf642d54d14c54a0b097f79b7b2787f467e` | [Push CI passed](https://github.com/williamwue/oms-github-acceptance/actions/runs/37121810939) |
| Initial PR head | `d4e0d94ebe286be7387066f18531cd3a5aaf31a5` | [PR CI failed](https://github.com/williamwue/oms-github-acceptance/actions/runs/37121859431); actual assertion was `41 !== 42` |
| Repaired PR head | `dee44d295df5446a207ae73216249c6c1dece23b` | [PR CI passed](https://github.com/williamwue/oms-github-acceptance/actions/runs/37121951333) |

The repair restores the tested value to 42; a harmless README change remains
in the final PR. The packaged `babysit` check observed `checks: blocked` before
repair and `checks: passed` afterward. This was a root-driven bounded repair,
not an implemented babysit drive loop or autonomous queue.

## Actual client interruption and recovery

Creation used the installed candidate's `executeGitHubWorkflow`, real official
`gh` transport, and a private durable journal. A narrow transport wrapper
recorded request methods and paths. After the real creation POST returned
success, it persisted the returned PR identity and killed its own Node process
with `SIGKILL`, before the workflow could reconcile or record completion.
The supervising process observed return code `-9`.

An initial recovery attempt correctly stopped with `CONCURRENT_WRITER` because
the killed client left its operation lock. The root confirmed that the exact
recorded PID no longer existed, checked that the lock contained that PID and
that no durable-store append lock remained, then preserved the operation lock
under a new evidence filename. Lock age alone was not used as proof of death.

A fresh process loaded the same journal, generation and operation ID
`create-crash-ci-1`. Recovery was constrained to GET requests and returned
the original PR 1. The request trace contains exactly one creation POST and
GET-only reconciliation; remote listing confirms exactly one matching PR.
No second POST, new operation ID or fabricated approval was used.

This establishes operator-assisted recovery of an accepted PR creation after
an actual client kill. It does not establish unattended orphan-lock cleanup,
interrupted merge recovery, host restart, live-worker reattachment or scheduler
recovery. The creation receipt retains the initial head SHA; the later PR
inspection separately records the repaired head.

The local evidence directory is located by
`/tmp/oms-hosted-preparation-path.txt`. Its private subdirectory retains the
request packets, PID and exit receipt, journal, request trace, preserved lock,
recovery result and before/after provider observations. Nothing in that
directory was uploaded as an artifact.

| Local evidence | SHA-256 |
| --- | --- |
| `journal.json` | `fe78122e07635f14477ce6b33b147bae898066e16c41767724c625140d75eff0` |
| `calls.jsonl` | `ce4db2732c3d0eba253869def1ab83cd7fe30bce2f367cce78eaef3c0c1ca07a` |
| `recovered.json` | `72c8dda82caef85354c180ab2bc6cab7fc1774a746647ffc6d9820f188897ef5` |
| `orphan-operation-lock.evidence` | `7ee78db35a23c30423ed32b2b9a0b43e524b91ef787d8790d4351dd4a49ea138` |

## Final boundary

PR 1 is ready for review, open and unmerged. Provider inspection reports
`approvedReviewers: []`, `review: unknown`, `threads: unknown`,
`mergeability: clean`, `checks: passed`, and `ready: false`. No merge request
or branch-protection change was made. A returned GitHub test merge SHA is not
evidence of landing: `merged` is false and the target ref remains at its
original baseline SHA.

The disposable repository, branch and PR are retained for further acceptance.
No release, active plugin upgrade, main OMS commit or main OMS push occurred.
Independent GitHub approval, protected-target merge and interrupted-merge
acceptance remain open. The earlier
[local integration acceptance](github-workflow-acceptance-2026-10-03.md) remains
the evidence for source tests and package checks.
