---
name: setup-oh-my-stack
description: "Configure role models from a freshly observed runtime inventory without overwriting unrelated user configuration."
disable-model-invocation: true
---

# Setup Oh My Stack

Use this workflow to resolve portable workload classes and role constraints to
models available on the current runtime surface.

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

## 2. Select workload mappings

Choose one observed model and advertised reasoning effort for each workload:

- `fast` for narrow reconnaissance and mechanical work;
- `balanced` for routine implementation;
- `deep` for architecture, synthesis, and ambiguous judgment.

Role metadata inherits its workload selection. A role-specific override is
allowed only when its model and reasoning effort occur in the same fresh
inventory. A model-diversity preference remains unverified unless runtime
metadata later proves that distinct backends actually ran.
When review roles prefer diversity and the user accepts the available cost and
provider choices, preview distinct observed models through `--role` overrides.
Report the configured model IDs separately from executed model IDs; do not
invent the latter from the manifest.

Ask the user only when multiple observed choices encode a real cost, quality,
or provider preference that cannot be inferred from their existing settings.
In a non-interactive session, return the observed choices and pending decision.

## 3. Preview and apply safely

Locate this package's `scripts/configure-models.mjs`. Run it first without
`--apply`, passing the inventory, an output location, and explicit
`MODEL@REASONING` selections for `--fast`, `--balanced`, and `--deep`.

Inspect the returned role mapping. If only a preview was requested, stop here.
Otherwise rerun with `--apply`. The tool writes an owned resolution manifest
and target-native agent definitions. It refuses model identifiers absent from
the inventory and refuses to overwrite a modified or unowned agent file.

For a project whose target runtime supports native project-scoped roles, use
`--project-root` with that existing project's path instead of `--output`.
Preview with the same selections first, then apply. The tool selects the
runtime's project role directory and writes only its owned role files and
resolution manifest; it does not edit global runtime configuration or existing
project configuration. Do not treat plugin-bundled `agents/` as proof of native
role discovery. Keep `--output` for detached review or targets without verified
project role activation.

After project activation, use a fresh runtime session to verify that the exact
custom role is selected and its role-policy marker appears without copying
that marker into the worker assignment. Verify actual worker model and reasoning
from runtime metadata, not from configured files or self-report. If either
observation is unavailable, report it as unverified; distinct configured
model IDs do not establish multi-model execution.

## Output

Report the inventory timestamp and source, workload-to-model mapping,
role-specific overrides, unresolved constraints, dry-run result, output
directory or project root, whether files were applied, and which native role
and model observations remain pending. Do not claim model diversity from
configuration alone.
