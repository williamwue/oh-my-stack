# GitHub target policy experiment — October 3, 2026

## Decision

Keep strict target-revision semantics as the workflow default. GitHub cannot
provide that guarantee through this merge API, so strict mode stops. Allow
ordinary single-PR shipping only when its authorization explicitly accepts
`server-policy`; never substitute this policy inside `autopilot-full`.

## Experiment and evidence

This was a throwaway experiment outside production source, using the real
`GitHubAutopilotProvider` and an injected deterministic API transport. It did
not contact or mutate GitHub. The provider SHA-256 was
`6c08a3182afedbcc70a19e7cb2d6c786a10ca015eda9910a164dffc83cf5a440`.
Node.js was v22.16.0 on macOS. The fixture kept checks and approvals green,
reported a protected base, and moved only the target branch.

The retained scratch directory is `/tmp/oms-target-policy-prototype-20261003`.
Run `node /tmp/oms-target-policy-prototype-20261003/compare.mjs strict` or
replace `strict` with `server-policy`. The switch exercises three timings
against identical authorization and review records. The original scratch
assertion used the wrong expected authorization error label; after correcting
it to the provider's `UNAUTHORIZED`, both complete runs exited 0.

| Policy | Target movement | Outcome | Merge PUTs |
| --- | --- | --- | --- |
| strict | None | `UNSUPPORTED_TARGET_CAS` | 0 |
| strict | Before preflight | `UNSUPPORTED_TARGET_CAS`; no API call reached the injection | 0 |
| strict | After final read | `UNSUPPORTED_TARGET_CAS`; no API call reached the injection | 0 |
| server-policy | None | `merged` | 1 |
| server-policy | Before preflight | `MERGE_BLOCKED` | 0 |
| server-policy | After final protected-branch read | `merged` | 1 |

After the final variant, changing the operation ID while retaining its old
authorization returned `UNAUTHORIZED`; the PUT count remained one. This
establishes that old authority cannot be relabeled as another operation. It
does **not** establish an atomic target-revision guard: the accepted
server-policy operation itself merged after its reviewed target moved.

## Consequences and cleanup

Pin the policy in the workflow authorization alongside the branch names,
revisions and operation identity. A switch from strict to server-policy needs
a new explicit authorization; fresh reads alone cannot close the race. The
server remains responsible for enforcing repository protections, and the
client's observed protection flag is not an audit of effective rules.

The scratch script and two output files are retained for local inspection.
Temporary journals were removed after every case. The experiment is not a
shipped runner, live write acceptance, or a scheduler. Its decision feeds the
separate [workflow integration](github-workflow.md).
