---
name: setup-oh-my-stack
description: "Configure per-workflow models, ordered panels, and reasoning budget from the current host inventory."
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

Host adaptation. Read the installed package's [runtime binding](../../docs/runtime-binding.md) for delegation, tools, paths, transcript access, and control surfaces, and [model selection](../../docs/model-selection.md) for the named routes and ordered panels below. These bindings translate host calls; they add no workflow stages. Continue already authorized implementation through its checks. Advice-only requests end with advice. Publication, merge, deployment, billable requests, credential access, and user-scope configuration retain the host and project authorization gates. A workflow step naming one of these actions does not grant that authority. Source-host helpers under `scripts/` are reference-only unless the generated binding identifies supported execution for that exact helper; use the documented native helper only for the capability it supports. Report unavailable capabilities and verification separately.

# Setup pstack

Configure the installed host's owned resolution manifest, which sets pstack models per role. Follow the generated model selection guide for native inventory and configuration commands.

## Steps

### 1. Detect available models

Enumerate the models accepted by the current host's native child-delegation surface. Run the packaged inventory collector using the generated model selection guide. Use a current observation, not remembered names. If inventory is unavailable, report the missing observation and stop before configuration writes. Never write an unobserved real model. The aliases `inherit-parent` and `auto` omit a native model override.

### 2. Load current state

Read the effective resolution manifest and its reasoning budget through the generated model selection guide. Preserve current models, aliases, panel membership, order, and length on the same target and preset. Start a fresh setup from the host's observed preset. Fresh runner and reviewer panels have two entries. Report retired routes that are removed.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer the host's fixed-choice question tool when available. Reuse a budget already selected in this session. Offer these four options with these exact labels, and name the current budget. With no saved choice, `large` is the upstream target; use only efforts the current host supports.

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the observed host preset. On a re-run preserve each model identity, alias, and ordered panel. `unlimited`, `large`, `medium`, and `small` target `max`, `xhigh`, `high`, and `medium`. Native effort may be a separate setting rather than part of a model slug. For each observed model, choose its highest supported effort at or below the target; mark unsupported choices for selection. `inherit-parent` and `auto` do not change. Report effective effort per route and any route below target. This is a reasoning setting, not a token or money spending cap.

**(c) Show the roles and confirm.** Show every role with its model, marking any real slug not in the detected set as needing a choice. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected models plus `inherit-parent` and `auto` (both mean: this role runs on the parent chat model, which is how Auto users stay on Auto) as the options. Prefer the host's available fixed-choice question tool over free text. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena selects one value from it whose model family differs from the parent's when possible. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every real slug written must be in the detected set. `inherit-parent` and `auto` always pass. If a chosen real slug is not available, stop and ask again.

### 5. Write the host configuration

Preview the complete configuration with the packaged configurator through the generated model selection guide. Show the destination scope and effective project override. Apply only the already accepted choices to an authorized destination. User defaults require user-scope authorization; project setup leaves personal configuration alone. Protect modified or unowned files and reconcile an interrupted apply before retrying. Keep detached previews read-only. The host configuration represents the following role and ordered-panel shape:

```text
budget: chosen label and observed supported effort
feature, refactoring: observed code model
bug-fix: observed code model
perf-issue: observed code model
hillclimb: observed code model
judgment and prose: observed judgment model
hardest tasks: observed strongest judgment model with implementation authority
how explorer: observed code model
how explainer: observed judgment model
why investigators: observed code model
why synthesizer: observed judgment model
reflect tooling: observed code model
reflect judgment, divergent, synthesizer: observed judgment model
arena runners: ordered panel with two fresh entries
arena cross-judge pool: ordered pool with two fresh entries, choose one
swarm workers: observed code model
architect runners: ordered panel with two fresh entries
interrogate reviewers: ordered panel with two fresh entries
```

### 6. Confirm

Report the files written, destination scope, effective selection, every role and ordered-panel entry, and the reasoning setting. Configuration files prove saved configuration only. Verify native discovery or explicit routing separately through the generated binding, and report worker model and effort from runtime records when observed. A model-consuming smoke requires the relevant authorization. A missing or failed smoke leaves activation unverified. Re-running this skill updates accepted choices for new sessions.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, invoke `/create-formal-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.
