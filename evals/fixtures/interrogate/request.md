# Interrogate fixture

Use the `interrogate` Skill to review `project/lib/window.mjs` without changing
any file.

Freeze this intent exactly: "`parseWindow` accepts only a complete decimal
integer string in the inclusive range 1 through 100; every other input returns
10."

Use exactly two independent reviewers. Start both before waiting for either
result and give them identical frozen inputs. Freeze both results, then start
one new synthesizer. After synthesis, independently verify every proposed
`Act on` finding against the file from the root session. Report whether model
diversity was proven by runtime metadata; do not infer it from session names.
