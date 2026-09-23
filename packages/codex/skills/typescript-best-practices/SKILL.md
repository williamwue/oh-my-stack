---
name: typescript-best-practices
description: "Apply type and boundary guidance to TS or TSX work."
---

# TypeScript best practices

Apply [type-system-discipline](../principle-type-system-discipline/SKILL.md)
when reading or changing `.ts` or `.tsx` files. Keep this Skill directly
invocable; the runtime adapter may offer path-scoped discovery only where its
native Skill format supports it. Do not broaden it to unrelated languages.

- Model variants with discriminated unions; use branded primitives only where
  mixing identifiers would be a real bug. Construct shapes that exclude invalid
  states, but keep simple total types such as `T[]` until a stronger type removes
  casts, non-null assertions, or impossible branches.
- Treat external values as `unknown` and parse once at boundaries. Prefer the
  repository's existing schema library to a handwritten guard. A type guard
  must actually check the shape it claims. Inside validated code, trust the
  domain type.
- Prefer discriminant switches, then property or primitive checks. Use casts
  only when evidence or validation justifies them. Use `satisfies` when checking
  an object without widening its literals. Check union exhaustiveness with
  `never` where a missing case would be harmful.
- Reuse `Pick`, `Omit`, `Parameters`, `ReturnType`, `Awaited`, and `typeof` when
  they express the same source of truth. Prefer named object arguments where
  positional order is error-prone; measure before changing hot paths.
- Test observable behavior with real local primitives when practical. Log
  useful structured identifiers rather than stray debugging output. Follow
  project style and actual library versions over generic examples.

Report specific changed or risky types, the boundary that validates them, and
checks run. Avoid a checklist recital for code that needs no change.
