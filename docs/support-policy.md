# Support policy

The latest published release is 0.9.1. The AIHero guide and generated directory
also describe five additions in the unreleased 0.10.0 source candidate. Support is limited to the
observed tools, installation surfaces, and tasks below. Entry discovery and
intact source files do not certify every workflow on every model.

## Tested tools and surfaces

| Tool | Recorded observation | Limits |
| --- | --- | --- |
| Codex CLI 0.160.1 on macOS | Native user plugin installed and enabled at 0.9.0; public entries and all six originals discovered. Explicit initial rounds for `grill-me` and `grill-with-docs` loaded original dependencies; the latter wrote confirmed glossary terms. | Two installed initial rounds, not complete interviews or all original workflows. |
| Codex CLI 0.160.1 on macOS | Four fresh project-local AIHero fixtures: interviews, terminology and an ADR, and architecture report creation. | Project-local loading differs from the installed native plugin. Automatic report opening failed in the fixture. |
| Claude Code 2.1.287 on macOS | Four fresh session-plugin AIHero fixtures, including native user slash invocation of explicit entries. | Session-plugin fixtures do not certify every persistent installation scope or full interviews. |
| OMP 18.3.0 | Earlier profile-gated core observations and verified original-file packaging. | The five originals added in 0.9.0 have not received live OMP acceptance. |

These are recorded tool versions, not minimum-version requirements.
See the [native Codex release observation](acceptance/aihero-0.9.0/native-install.json),
[AIHero fixture acceptance](aihero-original-0.9.0-acceptance.md), and
[historical host matrix](host-compatibility.md). The native summary records the
completed release checks; this documentation change does not rerun those model tasks.

The Codex desktop Skill picker has not received a separate interaction check.
Its documented selection is a user entry; native CLI structured selection is
the observed explicit invocation. Linux offline CI checks do not establish
Linux interactive behavior. Windows interactive behavior is not certified.

## Unreleased 0.10.0 source observations

Version 0.11.0 includes an optional `oms-auto` entry and a Codex routing
switch plus short SessionStart hook. It is off by default. Configuration and
offline checks do not establish implicit selection or hook activation on every
host; see [automatic routing](automatic-routing.md) and
[the bounded CLI acceptance](codex-auto-routing-0.10.0-acceptance.md).
The native CLI follow-up observed installed-plugin hook execution after startup,
resume, compact, and an API-supplied clear source, with bounded read-only routing
and manual/translation controls. Desktop/IDE activation remains unverified.
A fix could still choose the existing implicit bug-fix Skill directly. These
observations do not establish universal activation or a routing success rate.

Five additional original skills each passed a separate bounded fixture on
Codex CLI 0.160.1 and Claude Code 2.1.287: research, questionnaire, setup,
spec, and tickets. See [the acceptance and limitations](aihero-original-0.10.0-acceptance.md).
These used project-local or session-plugin loading and a local Markdown tracker.
They do not establish a global installed-version upgrade, remote issue publishing,
live internet research, automatic selection quality, or live OMP behavior.

## What the package provides

- Direct Skill selection, with current entries and invocation modes in the
  [generated directory](skill-directory.md).
- Release archives, integrity receipts, and tool-specific installation guidance.
- Optional setup preview and apply, scoped defaults, role mappings, and review
  panels for the pstack-derived workflows that use them.
- Six selected AIHero originals with their original dependencies and resources.
  They do not receive inserted OMS model-routing instructions.

Model access, authentication, pricing, and delegation APIs belong to the host
and provider. Inventory discovery does not establish a successful worker call.
User and project configuration remain separate from plugin installation.
Read [model configuration](model-configuration.md) before changing those choices.

## Remaining limits

Complete pstack parity, full real-project execution of every Skill, and every
model/provider combination are not verified. Long-running autonomous work,
reattachment after coordinator restart, concurrent writers, independent GitHub
account approvals, and unattended hosted lifecycle remain bounded or unverified.

GitHub workflow helpers require explicit target and operation authority,
independent OMS review, and the applicable remote repository policy. A Skill
invocation or model configuration does not by itself authorize publication,
merge, deployment, or credential access. See the
[GitHub integration guide](github-workflow.md) and its dated acceptance records.

Use the [maintainer index](maintainers/README.md) for older evidence and
implementation gaps. The [previous support policy](maintainers/support-policy-0.9.0.md)
is a historical snapshot; its older release baselines are not current instructions.

## Updating and reporting problems

Keep the prior trusted archive and installation source before upgrading.
Follow [updates and removal](guides/update-and-uninstall.md); review newer
configuration separately before a downgrade. Removing the plugin does not
remove personal or project model configuration.

For a bug report, include the plugin version, tool version and platform,
selected Skill, invocation method, expected result, actual result, and redacted
evidence. Report ordinary issues through
[GitHub Issues](https://github.com/williamwue/oh-my-stack/issues), and follow
[SECURITY.md](../SECURITY.md) for security reports. Do not include credentials
or unredacted account logs.
