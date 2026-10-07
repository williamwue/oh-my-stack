# Optional automatic routing in Codex

This feature is available in version 0.11.0. Installing or upgrading OMS
does not enable it. Existing `poteto-mode` and other explicit entries remain
available. Claude Code and OMP do not yet have this routing configuration.

Version 0.11.1 adds the choice-based setup below.

In Codex, type `$` and select `oh-my-stack:setup-oh-my-stack`. Submit its default
setup prompt; no enable instruction is needed. Setup shows the effective mode
and offers **Enable automatic routing**, **Disable automatic routing**, or
**Keep current settings**. If you choose a change, select **Default across
projects** or **Only this project**. Completing those choices saves the selected
setting; keeping the current settings or cancelling writes nothing. Existing
project overrides still take precedence over a personal default.

Setup uses native choice controls when the current interface and mode support
them. Otherwise it presents explicit text choices and waits for your selection.
You can finish without configuring models. Routing choices preserve model
mappings and do not run model inventory or worker probes. Review and trust the
OMS hook through `/hooks`, then start a new session to verify automatic routing.

You can still request a specific mode and scope directly, or ask for a read-only
status or preview. Setup reuses choices you already supplied.

After enabling and verifying the hook in a new session, describe an engineering
task normally, without selecting a Skill. OMS routes it through the existing
`poteto-mode` rules. Ordinary chat, translation, and tool-use help remain outside
engineering execution. An explicit Skill or a request to skip OMS takes
precedence. Routing adds no action authority. Narrow tasks use the existing
root-only paths; explicit independent review retains its complete contract.
The switch controls the new `oms-auto` entry and its hook hint. Some existing
OMS Skills already permit implicit invocation; switching to manual does not
change those Skills' native invocation policies.

## Inspect, preview, apply, and disable

The optional routing helpers require Node.js 20 or later. They do not collect
model inventory, load application env files, access credentials, or use a model.
Replace `/path/to/installed/oh-my-stack` with the installed Codex plugin root.
Run these commands from the project you want to configure.

```bash
node /path/to/installed/oh-my-stack/scripts/routing.mjs status
node /path/to/installed/oh-my-stack/scripts/routing.mjs set --scope project --mode auto
node /path/to/installed/oh-my-stack/scripts/routing.mjs set --scope project --mode auto --apply
node /path/to/installed/oh-my-stack/scripts/routing.mjs set --scope project --mode manual --apply
```

Without `--apply`, `set` is a preview and writes nothing. `--scope user` sets
personal defaults. `--cwd PATH` selects a project explicitly. Applying an
already-matching mode is an idempotent no-op.

- User switch: `$CODEX_HOME/oh-my-stack/routing.json`, or
  `~/.codex/oh-my-stack/routing.json` when `CODEX_HOME` is unset.
- Project switch: `.oh-my-stack/routing.json` at the Git worktree root.
- Lookup starts at the current directory and checks ancestors only up to that
  worktree root. The nearest project switch overrides the user switch completely,
  including an explicit `manual` that disables a personal `auto` default.
- Outside Git, only the current directory is considered the project scope.

The command reports both the written scope and the effective mode, so a nearer
project override cannot silently be described as activated. Configuration is
separate from model mappings and plugin files. Unowned, malformed,
or symlinked routing files are rejected. Configuration errors disable automatic
routing instead of falling back to an enabled user default.

To remove a project override and return to the personal default, remove only the
project's OMS-owned `routing.json` after inspecting it. Plugin removal preserves
these user-owned routing preferences, just as it preserves model configuration.

## Hook and invocation boundaries

The Codex package uses `.codex-plugin/plugin.json` with an explicit
`./hooks/hooks.json` path. It intentionally omits root `plugin.json`: the
tested Codex 0.160.1 loader prioritizes that newer manifest format and skips
plugin hooks for it. Verify that your native surface discovers and runs the hook.
The short `SessionStart` hook rechecks the current switch on
startup, resume, clear, and compact; it injects an entry pointer only in auto
mode. The `oms-auto` entry rechecks the switch again when used, so changing a
project to manual also stops this entry from routing in an already-open session.
That recheck applies when the model uses `oms-auto`; it is an instruction
contract, not a host-enforced ban on other implicit Skills.

Installing or enabling a plugin does not trust its hook. Review and trust the
current hook through Codex's native `/hooks` interface when your surface offers
it. Do not bypass hook trust for ordinary installation. If this surface does not
support or run the hook, report that boundary and retain explicit `poteto-mode`.

The automatic entry also permits native implicit Skill selection. That allows
Codex to consider it; it does not guarantee selection. With the switch off, it
returns control without entering OMS workflows. A trusted hook is a routing
hint, not a deterministic dispatcher. A hook failure prints a bounded fallback
message and adds no routing instruction; it does not block the session.

See the official [Skill invocation policy](https://learn.chatgpt.com/docs/build-skills#optional-metadata)
and [hook documentation](https://learn.chatgpt.com/docs/hooks). Hooks in manually
installed packages and public-directory submission have different support
boundaries; hook-containing plugins are currently excluded from the public
plugin directory. This repository's Git marketplace is a separate channel.

## Verify real behavior

Configuration success, hook execution, implicit selection, and correct task
completion are separate observations. In fresh disposable projects, check an
ordinary engineering prompt without a Skill name, a local fix, a read-only
explanation, a negative chat/translation prompt, manual-mode override, and an
explicit user-selected Skill. Inspect actual tool events, project diffs, checks,
and child activity. Never substitute the agent's success statement for these
artifacts. Recheck startup/resume/compact separately on each native surface.

The 2026-10-07 native CLI follow-up observed installed-plugin hook execution
on startup, resume, and compact, plus the API clear source. Ordinary read-only
requests used the installed automatic entry and checked status before workflow
reads. Translation used no tools; manual mode injected no routing context and
loaded no OMS workflows. These are bounded observations, not a success rate or
Desktop/IDE certification. The repository acceptance record at
`docs/codex-auto-routing-0.10.0-acceptance.md` retains the evidence.
Hook activation on your installation still requires separate verification.
