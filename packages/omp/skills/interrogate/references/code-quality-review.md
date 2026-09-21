# Code quality lens

Look first for structural simplifications that preserve behavior while deleting
branches, wrappers, modes, or layers. Prefer direct and maintainable code over
magic, pass-through abstractions, cast-heavy contracts, and configuration for
cases with no caller.

Treat new scattered conditionals, feature checks in shared paths, silent
fallbacks, and a file crossing a major size boundary as review signals. Ask
whether logic belongs in a canonical module or deeper interface. Do not demand
a rewrite without showing a concrete defect or meaningful simplification.

Prioritize a few high-conviction findings over cosmetic volume. A clean review
may return no findings.
