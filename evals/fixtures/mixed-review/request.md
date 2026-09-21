# Adjudicate a mixed review

Use only the generated repository Skills and roles. Explicitly load
`poteto-mode`, select the workflow for adversarial review of a bounded change,
then load that generated workflow.

Read `intent.md`, `baseline.mjs`, `proposed.mjs`, and `review-seeds.md`. Record
each SHA-256 and freeze the complete literal contents and hashes as one packet.

Start exactly two independent read-only reviewers before waiting for either.
Each initial assignment must contain the identical complete literal packet,
decision question, and output contract. Do not refer to shared history, a prior
tool result, or repository paths as substitutes. Do not assign personas. Each
reviewer must evaluate F1 and F2 separately, trace reachable inputs through the
public boundary, and classify each as `Act on`, `Consider`, `Noted`, or
`Dismissed`, with concrete evidence. Freeze both complete attributable results
without follow-up, retry, replacement, or repair.

Only after both results are frozen, start exactly one new read-only synthesizer
with the unchanged packet and both results. It must preserve attribution,
deduplicate equivalent reasoning, resolve disagreement from reachability and
the frozen intent rather than vote counting, and return a classification for
F1 and F2. Freeze its complete result.

The root must then reread all four files, compare their hashes, independently
trace both findings, and run `node verify.mjs F1 F2-dismissed` from the fixture
root. The root—not a child—makes the final classification and reports the exact
command and result. Do not modify files, start another child, publish anything,
or claim model diversity without independent runtime metadata.

Return the selected router workflow, frozen hashes, two separately attributable
reviews, synthesis, root classifications, exact verification result, diversity
boundary, fallback used or not used, and clean Git status.
