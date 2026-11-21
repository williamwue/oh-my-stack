# OMS

OMS ships one plugin, `pstack@oms`, recombined from two upstreams:

- michael-denyer/pstack-claude supplies pstack for every native host (Claude Code, Codex, OpenCode, Pi, and the other runtimes in `tools/runtimes.mjs`). Merge its tagged releases with `git merge`; its `tools/sync.mjs` follows cursor/plugins.
- chhoumann/t3-pstack supplies the T3 Code adaptation. OMS carries it by hand in `plugins/pstack/skills/poteto-mode/references/t3-tools.md`, `plugins/pstack/skills/setup-pstack/references/t3.md`, `setup-pstack/scripts/t3-sheet.mjs`, `watch-pr/settle.ts`, the `t3` section of `plugins/pstack/models.json`, and `tools/install*`. `bun tools/t3-upstream.mjs <t3-pstack clone>` lists what t3-pstack changed since `tools/t3-upstream.json`; port what applies, then rerun it with `<ref> --advance`.

Without T3's orchestration tools, every skill must behave as in pstack-claude. T3 behavior lives behind the generator's conditional lead lines and the T3 mapping, not in edits to the skills themselves. Never add a second sync tool, a scheduler, a role router, or a configuration store.

`tools/generate.mjs` owns the lead lines, the Models sections, the T3 role defaults, and the T3 setup sheet. Edit `models.json` and regenerate rather than editing generated lines. A file OMS changes from upstream gets an entry in `tools/forks.json`. A change to `plugins/pstack/hooks/codex-hooks.json` needs a reviewed digest in `tools/install/hook-pin.json`, because the installer trusts that hook automatically.

`VERSION` is the OMS release; `docs/t3.md` records both upstream baselines.

Run `bun tools/generate.mjs --check` and `bun test tests/`, plus `bun run typecheck`, `bun test watch-pr`, and `bunx prettier@3.6.2 --check .` in `plugins/pstack/skills/poteto-mode/scripts` when watch-pr changes. Many tests fail on native Windows for environment reasons (symlinks, file modes, CRLF, shell fakes); compare against an untouched checkout of the same upstream before calling a failure new. Report fixture, native-host, and live-session evidence separately. Never use a model call or an external write merely to run a fixture test. Do not spawn agents unless the task explicitly requests them.

Preserve personal model sheets, AGENTS.md settings, native logins, books, author attribution, and authorization records. `docs/oms-history/` is archival; preserve its facts and bytes. Source changes do not authorize installing, updating, or removing plugins in the user's host configuration.
