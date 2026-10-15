---
name: autopilot-stack
description: "Follow the upstream Autopilot-stack playbook for its named task."
disable-model-invocation: true
---

## Pi native binding

Read [the native binding](../../docs/runtime-binding.md) and
[model selection](../../docs/model-selection.md). Use `oms_delegate` with
`start`, `collect`, and `cancel` for the workflow's explicitly requested
route/member. Saved Pi resolution and packaged role contracts select
the child model, thinking level, and permissions. Preserve panel order and
count. Supply explicit context and an isolated checkout for writing roles.
Report actual model and effort separately from requested configuration.

Host adaptation. Read the installed package's [runtime binding](../../docs/runtime-binding.md) for delegation, tools, paths, transcript access, and control surfaces, and [model selection](../../docs/model-selection.md) for the named routes and ordered panels below. These bindings translate host calls; they add no workflow stages. Continue already authorized implementation through its checks. Advice-only requests end with advice. Publication, merge, deployment, billable requests, credential access, and user-scope configuration retain the host and project authorization gates. A workflow step naming one of these actions does not grant that authority. Source-host helpers under `../poteto-mode/scripts/` are reference-only unless the generated binding identifies supported execution for that exact helper; use the documented native helper only for the capability it supports. Report unavailable capabilities and verification separately.

### Autopilot-stack

**You own the stack, never the landing. Hand the operator one linear stack of base-chained PRs to review and land.** **Autopilot-full** holds except for how verified work leaves. Each tick re-reads both playbooks from trunk, and this one wins where they differ.

1. **Run Autopilot-full's owners, minus the landing.** Owners report STACK-READY in place of merge-ready. They never rebase onto another branch, trunk included, and never retarget, merge, close a PR, or arm auto-merge, because the root owns the chain's topology and the operator owns the landing. When an item depends on another, its owner branches from that item's branch, not from trunk.
2. **Give the topology one writer.** Owners push only their own branches and report each tip and its intended parent. Only you rebase or retarget a link, because two writers on one chain undo each other. Append each clean PR in dependency order, with its base set to its parent's branch (`origin pr edit <pr> --base <parent-branch>` or `gh pr edit <pr> --base <parent-branch>`). Never require `gt`. An owner takes your push as its new base and lease, and on a conflict resolves its own slice for you to push.
3. **Absorb drift at the root.** Until landing starts, apply Autopilot-full step 5's test to each link and rebase the chain bottom-up where it calls for one. Then apply the patch-id rule link by link, since a link's base is its parent.
4. **Deliver the chain, then keep your hands off it.** Each link carries its verdict in its PR. Once landing starts, nobody writes to the chain except the post-merge retarget that `playbooks/shipping.md` sanctions, because a second writer breaks a landing in flight. A mid-landing problem goes through you to the operator, and any fix waits for the operator's go.

**Choosing between the autopilots.** Autopilot-full when the PRs are independent and landing authority is granted. Autopilot-stack when the operator wants review before landing, the work is sequenced or coupled, or merge authority is withheld.

**Reply:** catch the operator up per the **ketchup** skill, with links to the stack root and tip, a one-line verdict per link, and anything parked or excluded with the reason.
