# OMS

OMS ships one plugin, `pstack@oms`: michael-denyer/pstack-claude with chhoumann/t3-pstack's T3 adaptation. Keep both as close to their originals as possible and add only the joins.

- pstack-claude is the base for every native host. Take its tagged releases with `git merge`; its `tools/sync.mjs` follows cursor/plugins. Do not reword its skills.
- For a t3-pstack sync, read [docs/t3.md](docs/t3.md) for the pinned commit, file map, and OMS adaptations to retain. Carry over upstream dispatch and installation changes in their original wording and code.
- The joins are: the generator's T3 lead lines, the T3 files' exemption from pstack-claude's slug, prose-path, and denylist scans (`T3_QUOTED`), the installer's three names and models path, settle's wiring into pstack-claude's watch-pr, and the distribution layer (marketplace name `oms`, VERSION, docs, attribution).

`tools/generate.mjs` owns the lead lines and Models sections. Edit `plugins/pstack/models.t3.json` for OMS T3 defaults, then regenerate the T3 routing and setup tables. A file OMS changes from pstack-claude's upstream gets an entry in `tools/forks.json`. A change to a hooks file needs a new pin in `tools/frozen-hooks.json` and a CHANGES entry telling users to rerun the installer.

Run `bun tools/generate.mjs --check` and `bun test tests/`, plus `bun run typecheck`, `bun test watch-pr`, and `bunx prettier@3.6.2 --check .` in `plugins/pstack/skills/poteto-mode/scripts` when watch-pr changes. Many tests fail on native Windows for environment reasons (symlinks, file modes, CRLF, shell fakes); compare against an untouched checkout of the same upstream before calling a failure new. Report fixture, native-host, and live-session evidence separately. Never use a model call or an external write merely to run a fixture test. Do not spawn agents unless the task explicitly requests them.

Preserve personal model sheets, AGENTS.md settings, native logins, books, author attribution, and authorization records. `docs/oms-history/` is archival; preserve its facts and bytes. Source changes do not authorize installing, updating, or removing plugins in the user's host configuration.
