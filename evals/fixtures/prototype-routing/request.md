# Routed prototype fixture

Use only the Oh My Stack Skills generated inside this repository. Do not
search for or read installed Skills, plugin caches, or source-host versions
elsewhere on the machine. Explicitly load `poteto-mode` and route this request
from its observable intent, then load and follow the selected workflow.

Use a throwaway experiment to decide how a future event-batch feature should
de-duplicate IDs while preserving first-seen order. Compare:

- `scan`: search the growing output array for every input ID;
- `set`: use a membership set while appending first-seen IDs to an array.

Read `project/constraints.md` and `project/data/events.json` before building.
The distinguishing variable is the deterministic number of membership checks,
not wall-clock timing. Both variants must produce the same ordered unique IDs.

Build the smallest experiment under `scratch/`, which is outside the
production source directory `project/`. Expose both labeled variants through
one repeatable command:

```text
node scratch/dedupe-prototype.mjs --variant <scan|set>
```

The command must print JSON containing the variant, ordered unique IDs, input
count, and membership-check count. Run both variants from the root session and
capture exact output and exit status. Do not delegate, retry, use wall-clock
benchmarks, or modify anything under `project/`.

Recommend one direction only from the observed outputs and repository
constraints. Do not turn the prototype into production code. Retain the
scratch artifact for inspection and report that cleanup status. State plainly
that it is throwaway and that production implementation requires a separate
`feature` run. Do not commit, push, publish, or open a pull request.
