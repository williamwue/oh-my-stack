---
name: shipping
description: "Land an explicitly authorized PR or stack after independent checks."
---

## Codex delegation binding

For every delegated worker in this workflow, derive the exact `model`,
`reasoning_effort`, and complete role-plus-task `message` with
`../../scripts/codex-delegation.mjs prepare` relative to this Skill. It resolves
the nearest project manifest first, then the user manifest. Supply the named
route/panel entry where configured; otherwise supply the canonical role
and the observed parent model and effort. For task adjustment, supply
`--job-context JOB.json` with `kind` hardest, judgment, routine, or verification
and optional boolean `urgent`, plus `--inventory INVENTORY.json` for observed
effort alternatives. The saved model stays fixed. Without inventory only
the saved effort is available. Read `audit.taskSelection` before dispatch.
Keep the complete prepared request. If the host rejects its adjustment,
supply `--rejected-adjustment ERROR.json` and
`--rejected-prepared-request REQUEST.json` to retry the original role line
even after the inventory changes. A request checksum binds the receipt;
the host remains responsible for authenticating the rejection evidence.
Pass
the returned `task_name`, `fork_turns=none`, model, effort, and message
explicitly to the spawn call. Do not use a generated custom-role name as a selector or
claim its TOML was activated. After the worker finishes, run the helper's
`verify` mode on the persisted parent and child records when available; it
checks the spawn metadata, parent link, and child `turn_context`.
The persisted spawn message may be encrypted; disclose when its exact
role/task text cannot be audited. If records are unavailable, state that
runtime model resolution is unverified.

## Codex GitHub workflow binding

When the selected provider is explicitly `github.com`, read
`../../scripts/github-workflow.mjs` and
`../../docs/github-workflow.md` before using this bounded single-PR adapter.
For authorized operations supported by a host-owned PR tool, use that
tool first and preserve the host's task association requirements.
Use `executeGitHubWorkflow(request)` only as the bounded fallback for
creation or merge that the host-owned tool does not support. Tool choice
does not expand the workflow's authorization or target gates.
Its CLI exposes only `inspect` and `recover`; recovery
can append local reconciliation evidence. The request must name this
workflow, the exact target and account, and any required journal and
authority records. Caller records assert scope; they do not authenticate
human consent or reviewer provenance. Select no provider by inference.
This binding accepts one root-countersigned bottom PR only. It does
not discover or validate stack topology. Strict target CAS stops;
`server-policy` requires separately scoped authorization and retains
the GitHub base-revision race boundary. Review defaults to `github-review`;
`independent-oms` must be explicitly authorized and still honors
the repository's actual GitHub approval requirements.

Host adaptation. Read the installed package's [runtime binding](../../docs/runtime-binding.md) for delegation, tools, paths, transcript access, and control surfaces, and [model selection](../../docs/model-selection.md) for the named routes and ordered panels below. These bindings translate host calls; they add no workflow stages. Continue already authorized implementation through its checks. Advice-only requests end with advice. Publication, merge, deployment, billable requests, credential access, and user-scope configuration retain the host and project authorization gates. A workflow step naming one of these actions does not grant that authority. Source-host helpers under `../poteto-mode/scripts/` are reference-only unless the generated binding identifies supported execution for that exact helper; use the documented native helper only for the capability it supports. Report unavailable capabilities and verification separately.

### Shipping

**You own what lands. Verify each PR independently, land only the verified run from the root, then keep your hands off the stack.**

1. **Resolve the forge, then verify each PR independently before it lands.** GitHub CLI (`gh`) is the default. If `command -v origin` succeeds and Origin can resolve the repository, use `origin pr` for every PR operation. Otherwise stay on `gh` and record the fallback. Never require Graphite (`gt`). One verifier per PR, each a independent remote child where supported by the host, runs the change the way a user would with the matching control skill (such as `control-ui` or `control-cli` through the generated runtime binding), parent against head, and posts `PASS`, `PASS+NOTES`, or `FAIL` on that PR. Only a verdict from an agent that did not write the code counts, because an author checks what it meant to build. Green CI and an approving bot review are not verdicts, because neither runs the change as a user would.
Capture the intended repository, destination branch, PR chain, head SHA, base SHA, base branch, old parent boundary, and stable base-to-head patch-id with each independent verdict. A matching patch-id retains a verdict only after checking applicability to the new destination and dependencies. Reverify changed or uncertain behavior and rerun checks and mergeability after a rewrite or retarget.

2. **Land only the contiguous verified run rooted at the bottom.** Walk up from the lowest unmerged PR and stop at the first one without `PASS` or `PASS+NOTES`. The PRs below it are the run, and the top one is the ceiling. A verified PR above an unverified one waits, because it cannot land without the code below it. One whose branch neither holds nor needs that code can move onto trunk and land on its own. It needs a fresh verdict first, because its old one ran with that code beneath it and trunk does not have it.
3. **Re-check that the verdicts still describe the code.** A verdict covers a patch, and a chain rebase moves every PR above it to a new SHA without failing any check. Compare `git patch-id` at the verdict SHA with the current head before trusting an older verdict. When the patches differ only in tests, docs, or lint config, a lane's result stands if what it ran builds the same at both SHAs apart from noise. Noise is a difference that also shows up between two builds of the verdict SHA, or an embedded commit SHA. Report each kind of noise with its files, so a reader can check the call. The change itself still gets fresh checks and a review, because the old verdict never saw it. A lane with no build output, such as a dev server, cannot show this, so rerun it, and re-verify anything else that drifted.
4. **Land bottom-up, one PR at a time.** Use the installed runtime binding and existing forge owner for every provider operation. The native GitHub workflow helper owns one frozen bottom PR and its explicit target policy; it does not discover or validate a stack. Preserve its strict refusal when the provider cannot enforce the required destination conditions. Use server-policy only when explicitly authorized for that request and disclose the remaining base race. Never silently downgrade target policy. Through the selected provider, use a service-enforced verified-head condition, inspect the destination immediately before the request, and preserve required repository rules. A head guard alone does not atomically guard the base. Unsupported required guarantees leave landing blocked.

   Inspect pending auto-merge and queue membership for every PR affected by a topology change. Cancel them through supported provider operations and read back the same revision before any rewrite or retarget. A failed or unavailable cancellation remains unresolved. Never rearm it to bypass a blocker. After a merge, confirm the merged state, approved head, intended destination, merge commit and its ancestry in the fetched destination. A successful request or queue admission is not a confirmed merge. Before advancing a child, verify its recorded old-parent boundary, replay only its own commits, and push only with an explicit lease on the captured remote SHA. Reconcile a refused lease rather than refreshing it to overwrite concurrent work. Automatic or queued landing needs existing repository rules that enforce verification on the eventual landing revision. Do not change protections or bypass approvals.
5. **Leave the stack alone while it lands.** Step 4's move of the next PR is the only change to a branch or base, because a merge lands whatever its branch and base hold at that moment, verdict or not. On GitHub, watch the run with the queued watcher from `playbooks/babysit.md` (`../poteto-mode/scripts/watch-pr/watch-pr --queued-stack --stack-prs <bottom-to-top>`) under `/loop` until it reports `COMPLETE` at the ceiling. On Origin, re-read the current PR with `origin pr view <pr> --checks` each time `origin pr checks <pr> --watch` returns, until the ceiling reads merged. A base that moves to trunk when its parent merges is expected, not damage to repair. If a merge stalls, find out why before you change anything.
6. **Stop at the ceiling.** Extending the run takes new verdicts, so it is a new pass through step 1.

**Reply:** the verified run and its ceiling, each PR's verdict and who produced it, what landed and how you confirmed it, and what the next gap needs.
