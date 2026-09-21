# Routed refactoring fixture

Use only the Oh My Stack Skills and roles generated inside this repository.
Do not search for or read installed Skills, plugin caches, or source-host
versions elsewhere on the machine. Explicitly load `poteto-mode` and route this
request from its observable intent. Then load and follow the selected workflow
and every prerequisite it names.

Refactor `project/lib/labels.mjs` without changing externally observable
behavior. The file duplicates name trimming, state selection, and label
assembly in `renderTask` and `renderProject`. Replace that duplication with one
private `renderLabel(kind, name, closed)` helper and keep the two public
functions as thin adapters. Do not add a new public export or compatibility
alias.

Treat `node --test test/labels.test.mjs` as the pinned behavior contract and
equivalence check. The root must inspect the callers and tests with `how`, run
the command before delegation, and record the exact passing baseline. Name the
reader-load problem and target shape before editing.

Start exactly one bounded implementer after the baseline pin. Do not retry or
replace a successful child. The writer may change only
`project/lib/labels.mjs`. Use runtime isolation when available; otherwise
serialize the only writer and disclose the shared-workspace fallback. After
collecting the writer result, the root must inspect the actual diff, confirm
that the duplicate branches are gone without adding an exported API, and rerun
the exact command.

Do not edit tests, generated Skills, or runtime configuration. Do not commit,
push, publish, or open a pull request. Report the selected route, pinned
contract, structural before and after, exact equivalence proof, reader-load
reduction, actual changed paths, isolation or fallback used, reverted
experiments if any, and limitations.
