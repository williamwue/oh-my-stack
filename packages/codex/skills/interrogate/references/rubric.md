# Review rubric

Apply only relevant lenses and trace every claim to the frozen scope.

## Correctness and root cause

Check boundary values, error propagation, state transitions, repeated runs,
concurrency, stale state, and whether the change repairs the governing contract
rather than masking a symptom. A hypothetical is actionable only when a real
caller or input path can reach it.

## Structural integrity

Check whether validation sits at the boundary, ownership remains clear,
abstractions hide rather than leak complexity, shared logic stays canonical,
and migrations remove obsolete paths when safe. Do not penalize simple code for
not having speculative abstractions.

## Verification

Check that tests exercise behavior, the original failure has a regression
signal, integration claims cover the real boundary, delegated claims inspect
artifacts rather than self-reports, and the evidence actually supports the
stated outcome.

## Complexity and security

Flag avoidable moving parts, scattered special cases, dead compatibility code,
non-atomic updates, or unsafe flows into command, query, markup, credential, or
filesystem boundaries. Security claims require a traceable source-to-sink path.
