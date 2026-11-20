# OMS

OMS distributes native pstack and the upstream chhoumann/t3-pstack plugin side by side. For a T3 update, import the pinned upstream plugins/pstack Git tree unchanged at plugins/t3-pstack and update its README source pin.
Keep upstream workflows, model defaults, hooks, and runtime support unchanged.
Do not add a scheduler, role router, installer, configuration store, or component catalog.

T3 mapping lives in plugins/pstack/skills/poteto-mode/references/t3-tools.md.
Its conditional entry lines are owned by tools/generate.mjs; regenerate rather than
editing generated lines. The native marketplaces are named oms; the plugins use their respective upstream skill namespaces.
VERSION is the OMS distribution version; docs/t3.md records the upstream baseline.

Run bun tools/generate.mjs --check and bun test tests/. Follow upstream's additional
checks for touched tooling. Report fixture, native-host, and live-session evidence
separately. Never use a model call or an external write merely to run a fixture test.
Do not spawn agents unless the task explicitly requests them.

Preserve existing plugins, personal model sheets, AGENTS.md settings, native logins,
books, author attribution, and authorization records. Historical evidence under
docs/oms-history/ is archival; preserve its facts and bytes. Source changes do not
authorize installing, updating, or removing plugins in the user's host configuration.
