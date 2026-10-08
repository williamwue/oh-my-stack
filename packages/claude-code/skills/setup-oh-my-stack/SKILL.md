---
name: setup-oh-my-stack
description: "Configure optional automatic routing, or preview and configure pstack-style per-workflow models, review panels, and reasoning budget from the current runtime inventory."
disable-model-invocation: true
---

# Setup Oh My Stack

## Claude Code setup boundary

There is no complete read-only account model catalog in this adapter.
For default model setup, probe all three families using
`--claude-models haiku,sonnet,opus
--confirm-claude-probes`. Disclose usage and obtain approval first.
The collector defaults to these three aliases when no subset is supplied.
An explicitly requested subset remains valid; describe it as a partial
inventory, not the account's complete model catalog. If a probe fails,
report the family and failure; do not silently replace Haiku with Sonnet.
A reviewed explicit family pin such as `haiku=claude-haiku-5-5` is
supported in `--claude-models` when the user chooses it after an alias
mismatch. Verify the returned ID exactly; do not automatically pin a
version or rewrite the user's global alias settings.
Never probe Fable or arbitrary IDs through this path; some requests can
incur separate usage credits without a terminal consent prompt.
The probe observes canonical model IDs. Its effort list comes from
reviewed Claude Code documentation, not a live capability API; account
or organization caps may lower effective effort.

Preview `--preset pstack` with the three-family inventory. This dynamic
preset uses observed IDs rather than pinning model versions: Haiku for
`fast` (including how.explorer and why.investigator), Sonnet for
`balanced`, and Opus for `deep`. Its ordered three-worker panels are
Opus/Sonnet/Haiku, analogous to the Codex Astra/Sol/Luna arrangement.
The initial efforts are low/medium/high, reduced to the highest supported
effort below each target when necessary; the user's budget then applies.
Haiku 4.5 uses `none` (no native effort override), not a claimed high.
The preset requires one observed ID per family; missing or ambiguous
families require a refreshed inventory or explicit workload choices.
For an explicit two-model subset, Sonnet can still fill fast/balanced
and Opus deep. Preserve deliberate existing choices; offer the new
three-family recommendation before replacing an older mapping.
Re-running the same preset preserves explicit overrides and budget.
Three configured families do not prove execution or cross-provider
diversity. Preview every route and panel before `--apply`.
Setup defaults to `--user` (`~/.claude/`, or the absolute
`CLAUDE_CONFIG_DIR` when set); `--project-root` writes a complete
project override and `--output` remains detached. Resolve the active
user directory before describing which configuration takes effect.
The setup auditor checks the manifest, hashes, effective scope, and
linked native child identity/model from parent and child records.
A project-local PreToolUse hook can additionally record the runtime's
effective effort through `scripts/claude-effort-hook.mjs`; pass that
JSONL with `--hook-record`. Use an isolated project and do not install a
diagnostic hook into the user's global settings. Without hook evidence,
treat child effort as unverified even when the agent file specifies it.

## Claude Code automatic routing binding

Run `node ../../scripts/routing.mjs status --runtime claude-code` from the
user's project, resolving the script path relative to this installed Skill,
before automatic routing. Use the returned `enabled` flag; errors disable routing.
The nearest Claude project switch overrides the user switch; absence is manual.
The user directory is the absolute CLAUDE_CONFIG_DIR, or ~/.claude when unset.
Claude uses .oh-my-stack/routing.claude-code.json for project overrides;
Codex's .oh-my-stack/routing.json is independent and must not be rewritten.
For a routing setup request, preview `node ../../scripts/routing.mjs
set --runtime claude-code --scope user|project --mode auto|manual`, then
use the same command with `--apply` for the authorized selection.
Report saved scope, effective mode, and project overrides separately.
Routing-only setup needs no model inventory, paid probes, or model mapping changes.
The plugin's SessionStart hook adds the oms-auto entry pointer only in auto mode.
Use the Skill tool for oh-my-stack:oms-auto when available; otherwise read its
installed file. Always recheck the switch before reading poteto-mode or a workflow.
After enabled=true, read ../poteto-mode/SKILL.md and follow its workflow routing.
When enabling, review the plugin SessionStart hook through Claude Code's /hooks
and start a fresh session. Do not bypass host hook permissions or alter trust.
Saving a switch does not prove hook execution or workflow selection.
Read [the routing guide](../../docs/automatic-routing.md) for verification.

## Choose automatic routing

On a target with the generated routing binding, a general setup invocation starts
with automatic routing choices. The user need not write an enable command or
know the configuration script. A request specifically for model setup goes
straight to the model procedure below; a routing status or preview request stays
read-only. If the user already specified a routing mode or scope, reuse it and
ask only for the missing choice.

Inspect the effective routing mode and scope through the binding before offering
choices. Show that current state in the user's language, including any project
override. If inspection fails, report the error before changing configuration.
Use the host's native fixed-choice question tool when available and allowed in
the current mode. Otherwise show the same explicit text choices in the conversation
and wait for a selection. Do not ask the user to compose a configuration prompt.

Offer these routing choices:

- **Enable automatic routing**: match ordinary engineering tasks to OMS workflows.
- **Disable automatic routing**: use explicit workflow entries.
- **Keep current settings**: leave all routing configuration untouched.

Recommend keeping the current settings when routing is already enabled;
otherwise recommend enabling it. A recommendation or preselected option is not
a submitted choice. If the user chooses enable or disable and has not specified
the destination, offer these scope choices:

- **Default across projects (recommended)**: save the personal default;
  existing project overrides still take precedence.
- **Only this project**: save a project override without changing the personal
  default. Show the actual destination project before asking.

Explain that selecting a mode and scope saves that setting. Map enable to
`auto`, disable to `manual`, personal default to `user`, and this project to
`project`. Preview the selected change through the generated binding, then
apply that same choice without asking the user to repeat an enable instruction
or reconfirm a completed selection. An explicit preview-only request still
stops before apply. Keep, cancellation, and an unanswered question authorize no
routing write. A free-text answer that leaves mode or scope ambiguous requires
clarification before apply.

Report the saved scope separately from the actual effective mode and any project
override. Preserve model mappings and native hook trust. Give the exact native
hook review and fresh-session step from the binding when enabling; saving the
switch does not prove hook execution or automatic workflow selection.

A routing-only request ends here without model inventory, mapping changes, or
a paid worker probe. After a general setup invocation completes these choices,
offer **Configure models and reasoning budget** or **Finish setup**; continue
below only when model setup is selected or was already requested. Finishing or
not answering this optional question leaves model configuration untouched.
On targets without automatic routing support, skip the routing menu during
ordinary model setup. If routing was requested, report the unsupported target
without changing model configuration.

Use this workflow to give Oh My Stack opinionated, editable per-workflow model
choices without assuming Cursor model names work on another runtime.

## 1. Observe before selecting

Identify the active runtime surface. Locate this package's
`scripts/collect-model-inventory.mjs` and run it with a dedicated output path.
The collector calls the native inventory operation verified for the current
generated target and normalizes its live response. Do not reuse remembered
model names, examples from documentation, or an inventory from another runtime
surface.

The collector deliberately stops when a target has no verified observation.
If collection fails, report the exact missing observation; do not replace it
with a guessed model list.

The resulting JSON inventory contains:

- `schemaVersion: 1`;
- the target runtime identifier;
- the observation timestamp and exact inventory source;
- each observed model ID and its supported reasoning efforts, with the
  provenance of effort support stated for the target.

If the runtime cannot expose an inventory, stop before writing configuration.
Return the missing observation instead of guessing a model identifier.

Before applying, also inspect the live child-delegation tool and its agent/model
selection fields. A model inventory alone does not prove a child can use those
models. If this surface cannot delegate or cannot select the proposed route,
stop and report the capability gap; do not present a written mapping as active.

## 2. Preview a pstack-style mapping

Run `scripts/configure-models.mjs` without `--apply`, with the observed inventory
and the runtime's available pstack preset, if any. Where there is no preset,
choose `--fast`, `--balanced`, and `--deep` from observed IDs, then use route
and panel overrides where appropriate. Choose the target-supported user or
project scope; use `--output` for detached review. When an existing
configuration is present, inspect its effective scope before previewing changes.
The target-specific preset recommends separate choices for code, explanation,
judgment, and ordered review panels. The portable fallback still has three
workload classes:

- `fast` for narrow reconnaissance and mechanical work;
- `balanced` for routine implementation;
- `deep` for architecture, synthesis, and ambiguous judgment.

Show the proposed choice for every named route, including the *ordered* entries
for `arena.runners`, `arena.cross-judge-pool`, `architect.runners`, and
`interrogate.reviewers`. One panel entry means one intended worker; do not
silently add or remove entries. Ask for the user's reasoning budget:
`unlimited` (keep preset effort), `large` (target xhigh), `medium` (target high),
or `small` (target medium). The generated runtimes set every non-inherited
selection to that target, raising or lowering its preset or explicit effort.
When the model does not advertise the target, use its highest advertised effort
below the target; stop if none exists. The budget does not replace a model
family or change panel length. `--uniform-reasoning EFFORT` is an optional
explicit target override and requires every selected model to advertise that
exact effort; it cannot exceed the chosen budget target. A target that
preserves same-preset choices also keeps this explicit override on a re-run;
use `--uniform-reasoning preset` to return to the budget target.
Name this a reasoning setting, not a token or money spending limit. Show the
*effective* model and effort for every route after budget processing, explicitly
calling out any route that fell below the budget target because the model does
not support it. Do not call a mixed-effort table uniformly `medium`.
Show meaningful cost/provider tradeoffs before applying. The preset is a
recommendation, not a silent permission to spend on an expensive model.
For a target where effort is not configurable on one model, `none` denotes
no native effort override. It does not claim the model performs no reasoning.

Users may override a workload with `--fast`, `--balanced`, or `--deep`; a
canonical role with `--role ROLE=MODEL@REASONING`; one workflow slot with
`--route KEY=MODEL@REASONING`; or an ordered panel with
`--panel KEY=MODEL@REASONING,MODEL@REASONING`. `inherit-parent` and `auto`
are aliases that omit the native model override. A changed panel length changes
the intended fan-out. An unavailable preset model must be replaced by an
observed choice before applying; never guess a similarly named slug. Re-run
the preview with the user's selections.

## 3. Preview and apply safely

Inspect the preview's workload, role, route, and panel mappings. If only a
preview was requested, stop here. Otherwise rerun the same selections with
`--apply` after the user accepts the choices. The tool writes an owned
resolution manifest and target-native agent definitions. It refuses model IDs
or reasoning settings absent from the inventory, refuses to overwrite modified
or unowned files, and only prunes previously owned unchanged route agents when
a panel shrinks.

When the target supports user scope, prefer it for reusable defaults. This
writes only Oh My Stack's owned manifest and agent files; it does not edit the
runtime's other global settings. A project-specific manifest, when present,
takes precedence as a complete configuration. A project setup must not modify
the user default, and user setup must not modify existing project overrides.
Keep `--output` for detached review. Do not treat generated agents as proof of
native discovery.

After writing configuration files, use a fresh runtime session to verify the actual
route. Only call native role selection activated when the runtime selects the
named role. Otherwise pass the selected model and reasoning effort explicitly
at spawn time together with the complete role instructions and bounded task;
report this as explicit routing, not native role selection. For panels, verify
the number of spawned workers and their ordered, attributable model identities.
Check worker model and reasoning from runtime records, not configured files or
self-report. If records are unavailable, report resolution as unverified.
If a target's auditor cannot prove child effort from transcripts, keep child
model and effort as separate claims until a trustworthy observation exists.
Distinct configured IDs do not establish multi-model execution or distinct
provider backends.

Run `scripts/setup-acceptance.mjs --resolution <applied-manifest> --cwd <current-project>` after apply.
Read `effectiveConfiguration` before describing where the setup will be used.
If its `matchesAuditedResolution` is false, report the selected manifest path
and scope separately from the file just written. A user default may be saved
successfully while the current project continues to use its project override.
When no `--cwd` check was made, effective scope remains uninspected.
It verifies the generated role hashes but intentionally reports activation as
`unverified` until a fresh session supplies parent and child records. Next run
one bounded, read-only child for a single configured route in that project.
Give the child an exact existing file to inspect and forbid edits and further
delegation. In the target project, first resolve the active manifest and its
scope. Use the native route agent where supported, or the documented
explicit-spawn fallback. Pass the parent and child record paths, the route,
and (for an explicit spawn) its prepared request to `setup-acceptance.mjs`.
Do not run a multi-worker panel merely to certify basic setup. A failed,
cancelled, or unavailable smoke leaves activation `unverified`; report the
specific failed check and do not silently retry or reconfigure. Ask before a
model-consuming smoke when the user requested configuration only.

Report four separate facts: applied files, runtime role discovery or explicit
spawn mechanism, observed worker model/effort, and workflow-level coverage.
One successful read-only child proves only its route, not every workflow or
cross-provider diversity. Where user scope is supported, another project on
the same runtime inherits that default unless it has its own override. A
different machine or runtime needs its own inventory and setup.

## Output

Lead with one concrete status: preview only, saved with runtime verification
pending, or saved with the named route verified. If a project override selects
a different manifest, lead with that fact alongside the saved status.

Then show a compact receipt in the user's language:

- Destination: user, project, or detached scope and the target manifest path,
  taken from the configurator's `configuration` result.
- Effective selection: the manifest selected for the current project, whether
  it matches the destination, and that project's override when one exists.
- Choices: inventory source/time, preset, reasoning target, overrides, every
  named route and canonical role, and every panel entry in order. Group rows
  only when model and effort match; retain every route name. Distinguish
  inherited choices and efforts below the requested target.
- Evidence: owned-file checks, delegation mechanism, observed worker model and
  effort, and the exact tested route/entry. Label old records as prior evidence;
  a written table or one tested route does not certify all workflows.
- Next action: the specific missing verification or a workflow ready to try.

For an existing or newly applied resolution manifest, run
`scripts/setup-acceptance.mjs --resolution <manifest> --cwd <current-project> --format markdown`
and retain its complete role, route, and ordered-panel rows in the receipt.
It checks file hashes and prints counts directly from the manifest. Do not
reconstruct the list from a truncated JSON read, omit names while grouping,
or claim a complete receipt if the formatter could not run. The formatter's
`runtime activation: unverified` line remains separate from any later
route-specific parent/child verification.

Explain that this setup configures Oh My Stack's workflow agents. It does not
select the main conversation model or rewrite the host's general model roles.
Keep native discovery, explicit spawning, and workflow coverage separate in
the receipt. Do not claim model diversity from configuration alone.
