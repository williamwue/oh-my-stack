---
name: setup-oh-my-stack
description: "Configure role models from a freshly observed runtime inventory without overwriting unrelated user configuration."
---

# Setup Oh My Stack

Use this workflow to resolve portable workload classes and role constraints to
models available on the current runtime surface.

## 1. Observe before selecting

Identify the active runtime surface and use its native inventory operation or
documented local command to list models available to the current account and
configuration. Do not reuse remembered model names or examples from
documentation.

Normalize the result into a JSON inventory with:

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
