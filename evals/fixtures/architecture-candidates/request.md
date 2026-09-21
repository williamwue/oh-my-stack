# Compare two frozen architecture candidates

Use only the generated repository Skills and roles. Explicitly load
`poteto-mode` and select the workflow for an adversarial review of a bounded
design, then load that generated workflow.

Read `requirements.md`, `candidates/memory-queue.md`, and
`candidates/durable-log.md`. Record each file's SHA-256 before delegation and
freeze those exact three files as the shared review packet.

Start exactly two independent read-only reviewers before waiting for either.
Give both the identical frozen packet, decision question, output contract, and
candidate names. Do not assign personas. Each reviewer must assess every
requirement, select one candidate, and identify any blocking mismatch. Freeze
both complete attributable results without follow-up, retry, or replacement.

Only after both reviewer results are frozen, start exactly one new read-only
synthesizer with the unchanged packet and both frozen results. It must preserve
attribution, resolve disagreement from the requirements, and recommend one
candidate. Freeze its result.

The root must then reread all three files, inspect their current hashes, and run
`node verify.mjs durable-log` from the fixture root. The root—not a child—makes
the final decision and reports the exact command and outcome. Do not modify any
file, start any other child, publish anything, or claim model diversity unless
runtime metadata independently proves it.

Return the selected router workflow, frozen hashes, two separately attributable
reviewer decisions, synthesizer decision, root decision, verification command
and result, diversity boundary, and clean Git status.
