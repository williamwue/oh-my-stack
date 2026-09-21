# Delegated bug-fix fixture

Use the `bug-fix` Skill to repair the project in `project/`.

The TCP port validator incorrectly accepts `65536`. Treat
`node --test test/port.test.mjs` as both the original same-surface reproduction
and the focused regression check. After reproducing and establishing the cause
in the root session, start exactly one bounded implementer to change only
`project/lib/port.mjs`. Use an isolated writer when available. Collect the
worker result, inspect the actual diff yourself, and rerun the exact test from
the root. Return failing-before and passing-after exit states and decisive
assertion output.
