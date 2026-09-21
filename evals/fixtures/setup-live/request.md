# Live setup fixture

Use only the `setup-oh-my-stack` Skill generated inside this repository. Do
not search for or read installed Skills, plugin caches, or source-host versions
elsewhere on the machine. Do not delegate.

The generated target package is under `package/`. Run its
`scripts/collect-model-inventory.mjs` and write the fresh inventory to
`workspace/inventory.json`. Inspect the inventory source, timestamp, model IDs,
and advertised reasoning efforts. Choose the first returned model that supports
all three of `low`, `medium`, and `high`. Map that one observed model to `fast`
at low, `balanced` at medium, and `deep` at high. This deterministic fixture
does not claim model diversity.

Use `package/scripts/configure-models.mjs` with `package/` as the package root
and `workspace/configured/` as the dedicated output directory. First try an
invented model ID and require rejection before any output manifest is written.
Then run the valid mapping without `--apply`, inspect `applied: false` and all
seven role mappings, and confirm that the preview creates no manifest or agent
file. Finally rerun the exact valid mapping with `--apply`.

Do not edit `package/`, `request.md`, `verify.mjs`, or the tracked
`workspace/configured/keep-me.txt` marker. Do not write into home-level or
user-level runtime configuration. After apply, run `node verify.mjs` from the
repository root and require success. Inspect Git status and the generated
manifest yourself as the top-level agent.

Do not commit, push, publish, or open a pull request. Report the runtime,
inventory source and timestamp, inventory count, selected mapping, invented
model rejection, preview result, applied paths, verifier result, preserved
marker, and limitations.
