---
name: setup-oh-my-stack
description: "Preview and configure pstack-style per-workflow models, review panels, and reasoning budget from the current runtime inventory."
disable-model-invocation: true
---

# Setup Oh My Stack

## OMP source-style setup

The project resolution manifest is the current Oh My Stack choice table.
On a re-run, preview the existing budget and any model-family, panel, or
inherit-parent overrides before asking for changes. When reusing the same preset,
the configurator preserves those overrides and applies the selected budget
to real models using OMP's advertised thinking levels. Confirm the entire
ordered table before `--apply`. This project-scoped configuration is used
by Oh My Stack workflows; it is not a Cursor-style global always-applied rule.

If `--preset pstack` fails because its Cursor model IDs are absent, check
the observed inventory for every ID in the bundled `pstack-openai-codex`
preset. Only if all are present, preview that preset without `--apply`.
Its fast/balanced/deep choices are respectively GPT-6 Luna/Sol/Astra:
a provider-specific proposal, not an equivalence claim or silent fallback.
Use current OMP model metadata for prices when available; otherwise state
that price is unknown. Explain that Astra is the expensive deep/panel
choice. Show the complete ordered routes and obtain the user's model
and budget decision before apply.
On a preset switch, explicitly carry over any desired budget or overrides
only after reviewing them; the configurator does not retain them across
different presets. If any required model is absent, stop and request
explicit observed choices; never fill a slot with a legacy model merely
because it appears in the inventory or has a familiar name.

Use this workflow to give Oh My Stack opinionated, editable per-workflow model
choices without assuming Cursor model names work on another runtime.

## 1. Observe before selecting

Identify the active runtime surface. Locate this package's
`scripts/collect-model-inventory.mjs` and run it with a dedicated output path.
The collector calls the native inventory operation verified for the current
generated target and normalizes its live response. Do not reuse remembered
model names, examples from documentation, or an inventory from another runtime
surface.

The collector deliberately stops when the generated target has no verified
inventory operation. If collection fails, report the exact missing observation.
Do not replace the collector with a guessed model list.

The resulting JSON inventory contains:

- `schemaVersion: 1`;
- the target runtime identifier;
- the observation timestamp and exact inventory source;
- each returned model ID and the reasoning efforts that the runtime reports as
  valid for it.

If the runtime cannot expose an inventory, stop before writing configuration.
Return the missing observation instead of guessing a model identifier.

Before applying, also inspect the live child-delegation tool and its agent/model
selection fields. A model inventory alone does not prove a child can use those
models. If this surface cannot delegate or cannot select the proposed route,
stop and report the capability gap; do not present a written mapping as active.

## 2. Preview a pstack-style mapping

Run `scripts/configure-models.mjs` without `--apply`, with `--preset pstack`,
the observed inventory, and a dedicated `--project-root` or `--output` path.
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
or `small` (target medium). Both generated runtimes set every non-inherited
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

For a project whose target runtime supports native project-scoped roles, use
`--project-root` with that existing project's path instead of `--output`.
Preview with the same selections first, then apply. The tool selects the
runtime's project role directory and writes only its owned role files and
resolution manifest; it does not edit global runtime configuration or existing
project configuration. Do not treat plugin-bundled `agents/` as proof of native
role discovery. Keep `--output` for detached review or targets without verified
project role activation.

After writing project files, use a fresh runtime session to verify the actual
route. Only call native role selection activated when the runtime selects the
named role. Otherwise pass the selected model and reasoning effort explicitly
at spawn time together with the complete role instructions and bounded task;
report this as explicit routing, not native role selection. For panels, verify
the number of spawned workers and their ordered, attributable model identities.
Check worker model and reasoning from runtime records, not configured files or
self-report. If records are unavailable, report resolution as unverified.
Distinct configured IDs do not establish multi-model execution or distinct
provider backends.

Run `scripts/setup-acceptance.mjs --resolution <applied-manifest>` after apply.
It verifies the generated role hashes but intentionally reports activation as
`unverified` until a fresh session supplies parent and child records. Next run
one bounded, read-only child for a single configured route in that project.
Give the child an exact existing file to inspect and forbid edits and further
delegation. Use the native route agent where supported, or the documented
explicit-spawn fallback. Pass the parent and child record paths, the route,
and (for an explicit spawn) its prepared request to `setup-acceptance.mjs`.
Do not run a multi-worker panel merely to certify basic setup. A failed,
cancelled, or unavailable smoke leaves activation `unverified`; report the
specific failed check and do not silently retry or reconfigure. Ask before a
model-consuming smoke when the user requested configuration only.

Report four separate facts: applied files, runtime role discovery or explicit
spawn mechanism, observed worker model/effort, and workflow-level coverage.
One successful read-only child proves only its route, not every workflow or
cross-provider diversity. A different project or machine needs its own setup.

## Output

Report the inventory timestamp and source, preset, budget, workload and named
route mappings, ordered panel counts, user overrides, unresolved choices,
preview/application status, target path, and which native role and model
observations remain pending. Do not claim model diversity from configuration
alone.
