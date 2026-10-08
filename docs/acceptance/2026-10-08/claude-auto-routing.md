# Claude Code automatic routing acceptance

Date: 2026-10-08. Source baseline: `570db48665bb6b6c09ddbea03795f138880eacb2`
(0.11.3), with the Claude routing changes in this worktree. This is unpublished
source acceptance, not an upgrade of the maintainer's installed plugin.

## Implementation

The shared switch accepts an explicit runtime and retains the original Codex
paths. Claude uses its native configuration directory and a separate project
`routing.claude-code.json`. The generated Claude plugin includes a SessionStart
hook and Claude bindings in `oms-auto` and `setup-oh-my-stack`. Routing defaults
to manual; project overrides, preview-before-apply, and model setup remain separate.
The two runtime hook adapters use the same bounded context and input handling.

## Offline checks

`npm run check` passed generation, documentation, conformance, release, source
validation, book validation, Markdown lint, and the test suite: 285 passed,
2 skipped by existing optional native-test conditions, 0 failed (287 total).
The routing suite has 12 passing tests. The added checks exercise runtime
isolation, nearest overrides, malformed and foreign configurations, symlink
rejection, native environment selection, preserved model/settings files, generated
Claude hook/entry bindings, and fail-closed event/input behavior.

## Native CLI observations

Claude Code 2.1.293 loaded the generated package with `--plugin-dir`. User settings
were excluded; the persistent OMS plugin was disabled for these sessions, with
native account authentication retained. Init records identified the inline package
and `claude-opus-5-5`. Main sessions requested `high`; no child agents or paid
model-inventory probes ran. Tool availability was limited to Read, Bash, and Skill.

- Ordinary regression investigation, no Skill name: startup hook executed with
  exit 0 and injected the OMS pointer. Claude invoked `oh-my-stack:oms-auto`,
  ran Claude routing status, read `poteto-mode`, selected `investigation`, and
  verified that the fixture's `add` subtracted. Both source files stayed unchanged.
- Explicit skip with routing on: hook injected its pointer, but Claude loaded
  neither `oms-auto` nor any OMS workflow. It read the fixture and answered directly.
- Project manual mode: startup hook returned `{}`. Claude read the two fixture
  files and answered without calling or reading an OMS workflow.
- Explicit routing-only setup with selected project scope: the expanded setup
  entry checked status, previewed `auto`, applied that same choice, and rechecked
  status. Only the disposable project's switch changed to `auto`. No inventory
  collector or model configurator was called.
- Resume plus translation: the resume hook executed with exit 0 and injected
  the pointer, but Claude translated the sentence with zero tool calls.

An initial simple explanation probe called `oms-auto` and checked status but
answered directly without reading the router. The Claude hint was clarified to
require the router after a successful status check; the regression investigation
above observed that complete sequence. This does not establish a routing success
rate or universal instruction adherence.

Fixture source content remained unchanged. A sampled post-probe comparison found
unchanged hashes for user settings, the user model-resolution manifest, and the
installed-plugin registry; no user Claude routing file was created.
See the [sanitized native tool receipt](claude-auto-routing.json). Raw stream logs
remain in the external temporary evidence directory named in that receipt.

## Verification limits

Native startup and resume were observed. Clear and compact sources were exercised
by executable hook tests, not by native interactive actions. The choice menu and
hook-review UI were not driven; native setup used an already-selected mode and scope.
The installed 0.11.3 plugin was not replaced, global routing was not enabled,
and no release or PR was published. Runtime hook permissions were not bypassed.
This establishes only the stated local CLI package behavior.
