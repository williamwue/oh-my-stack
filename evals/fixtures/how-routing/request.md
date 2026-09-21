# How routing fixture

Explicitly use `poteto-mode` for this request: How does a submitted report move
from the public API to stored rendered output in `project/lib/`?

This is a read-only investigation. The subsystem spans multiple modules, so use
the complex `how` path with exactly two independent read-only explorers:

- Explorer A traces public entry, validation, ID assignment, and queueing.
- Explorer B traces dequeueing, rendering, persistence, and empty-queue behavior.

Start both explorers before waiting for either. Freeze both attributable results
without follow-up, then start one new read-only explainer with both frozen
results. The root must independently re-read the public entry point, the
queue-to-worker transition, the persistence boundary, and the test before
presenting the answer.

Use only the generated resources inside this repository:
`.agents/skills/poteto-mode`, `.agents/skills/investigation`,
`.agents/skills/how`, and the project-local explorer/explainer definitions. Do
not search for or read another installed plugin, Skill cache, home directory,
or parent workspace. A failed or malformed child remains frozen evidence. Do
not retry, replace, or start a second generation of explorers or explainers.

State the selected route, include the `how` output sections, and end with a
verification boundary that names any runtime fallback. Do not change any file.
