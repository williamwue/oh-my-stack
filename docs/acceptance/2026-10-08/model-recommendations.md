# Model recommendation update — 2026-10-08

## Source changes

- Codex `pstack` and OMP `pstack-openai-codex` now recommend GPT-6.1 Sol in
  every prior GPT-6 Sol default slot. Astra, Luna, efforts, and panel sizes
  are unchanged. OMP's Cursor source-style preset retains its provider-specific
  selectors; its Claude Opus recommendation was already 5.5.
- Claude Code setup observes canonical IDs behind aliases rather than using
  a version-pinned preset. Its effort policy now recognizes Sonnet 5.5 and
  Haiku 5.5 alongside the already supported Opus 5.5. Unknown Haiku versions
  stop collection instead of receiving Haiku 4.5's `none` override.
- Existing explicit pins remain explicit. A missing recommended model stops
  setup rather than selecting an older observed model silently.

Checked against [OpenAI's model catalog](https://developers.openai.com/api/docs/models),
[GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), and
[Claude Code model configuration](https://code.claude.com/docs/en/model-config).

## Initial local validation

Generated all three target packages from canonical sources. `npm run check`
passed 267 tests and its generation, documentation, conformance, release,
validation, book, and Markdown checks. Added regressions cover default migration,
retained explicit legacy pins, missing-model rejection, and current Claude effort
normalization through native configuration generation.

Claude 5.5 tests use fixtures. No Claude account model probes or child model
turns were performed, so these tests do not establish account availability or
effective child effort.

## Maintainer's Codex configuration

The live `codex app-server model/list (includeHidden=false)` observation at
2026-10-07T23:45:40.762Z included GPT-6.1 Sol and the required reasoning effort.
The current T3 provider catalog also supported explicit GPT-6.1 Sol selection.

After backing up the owned files, the installed 0.11.1 configurator applied
explicit Sol overrides at user scope. Exactly 13 owned agent files changed
only `gpt-6-sol` to `gpt-6.1-sol`; the other 22 files were byte-identical.
The medium reasoning budget still means `high` on every configured model.
All four ordered panels still contain Astra, Sol, and Luna in that order.
Global Codex settings, hook trust, routing files, and project files were unchanged.

The installed preset's next preview retains these explicit overrides. The
setup auditor verified all 35 owned files and selected the user manifest for
the current project. Runtime activation remains unverified; this is configuration
acceptance, not model execution or workflow coverage.

## Maintainer's Claude configuration before release continuation

Read-only inspection found Claude Code 2.1.287, OMS plugin 0.7.0 at user scope,
and an existing mapping containing Sonnet 5 and Opus 5.5. These are retained
configuration choices, not live account availability observations.

Official Claude Code documentation requires at least 2.1.280 for Opus 5.5,
2.1.284 for Sonnet 5.5, and 2.1.293 for Haiku 5.5. This client meets the first
two requirements but needs a host update before Haiku 5.5. Claude installation
and mappings were not changed, and no usage-consuming probes were run.

## Initial delivery boundary

Source changes are in the isolated `codex/update-model-recommendations` branch.
They have not been committed, published, or installed as a new OMS plugin
release. The maintainer's Codex workflow mapping migration is applied separately.

## Release continuation candidate

The maintainer requested completing the remaining release and local upgrade
work. Two bounded, authenticated alias probes returned Sonnet 5.5 and Opus
5.5. Haiku and Fable were not probed. Both probes only requested `OK`; they
establish returned model identity, not child effort or workflow quality.

Both native managers installed the generated 0.11.2 candidate in isolated
homes. Complete cache inventories matched the candidate manifest. Installed
configuration scripts generated detached mappings from the current observations,
with all four ordered panels retaining three positions. Fresh Codex discovery
loaded 90 public Skills at 0.11.2 and one untrusted native hook.

The Claude personal migration preview replaces Sonnet 5 with Sonnet 5.5 and
retains Opus 5.5, the medium budget targeting high, all route choices, and four
three-position panels. Application follows verified published plugin upgrades;
this candidate record does not claim that later application or publication.
