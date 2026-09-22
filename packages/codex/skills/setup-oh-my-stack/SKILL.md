---
name: setup-oh-my-stack
description: "Configure role models from observed runtime inventory."
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

Ask the user only when multiple observed choices encode a real cost, quality,
or provider preference that cannot be inferred from their existing settings.
In a non-interactive session, return the observed choices and pending decision.

## 3. Preview and apply safely

Locate this package's `scripts/configure-models.mjs`. Run it first without
`--apply`, passing the inventory, a dedicated output directory, and explicit
`MODEL@REASONING` selections for `--fast`, `--balanced`, and `--deep`.

Inspect the returned role mapping. Then rerun with `--apply`. The tool writes a
project-owned resolution manifest and target-native agent definitions. It
refuses model identifiers absent from the inventory and refuses to overwrite a
modified or unowned agent file. It leaves unrelated files in the output
directory untouched.

Do not write directly into a user's broader runtime configuration. Installation
or copying from the dedicated output directory is a separate, reviewable step.

## Output

Report the inventory timestamp and source, workload-to-model mapping,
role-specific overrides, unresolved constraints, dry-run result, output
directory, and whether files were applied. Do not claim model diversity from
configuration alone.
