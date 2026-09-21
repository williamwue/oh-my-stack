# Root-only bug-fix fixture

Use the `bug-fix` Skill to repair the project in `project/`.

The TCP port validator incorrectly accepts `65536`. Treat
`node --test test/port.test.mjs` as both the original same-surface reproduction
and the focused regression check. Perform this small fix entirely in the root
session: do not delegate. Change only what the evidence requires, inspect the
final diff yourself, and return the failing-before and passing-after exit states
and decisive assertion output.
