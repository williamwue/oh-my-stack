---
name: interrogate
description: Run an adversarial multi-session review with identical inputs, frozen findings, independent synthesis, and root-owned judgment.
---

# Interrogate

Use this workflow to challenge a change, design, or bounded code surface from
independent angles. It produces a review verdict only. Do not modify the code
under review or automatically apply suggestions.

## 1. Freeze scope and intent

Identify the exact diff, files, revision, or artifact to review. Read enough
surrounding code to make the scope understandable, but do not silently expand
it. Write one intent paragraph derived from the user's request and observable
repository evidence. If intent is materially ambiguous, return the unresolved
question instead of inventing a goal.

Create one immutable review packet containing:

- the intent paragraph;
- the exact code or diff and its revision or content hash;
- required surrounding context;
- `references/rubric.md`;
- `references/code-quality-review.md`;
- the output contract from `references/reviewer-prompt.md`.

## 2. Start independent reviewers

Start at least two independent read-only reviewer sessions before waiting for
either result. Give every reviewer the same frozen packet. Do not assign
personas or reveal another reviewer's findings. More than two reviewers are
optional and must be justified by review risk rather than available capacity.

Prefer model diversity when the runtime can resolve it, but do not hard-code
models or equate distinct session names with distinct backends. If per-worker
model selection is unavailable, use the available reviewers and disclose that
diversity was not established. Report model identities only from runtime
metadata, never reviewer self-description.

If parallel start is unavailable, run independent reviewers sequentially
without sharing prior results. If delegation is unavailable, perform two
clearly separated root passes and disclose that the review was not session
independent.

## 3. Freeze findings

Wait for every started reviewer and capture each complete, attributable result.
Once captured, a finding set is frozen: do not ask its reviewer to revise it,
silently rewrite it, or replace a weak reviewer with a retry. A malformed or
failed result remains part of the evidence boundary and limits the verdict.

## 4. Synthesize in a new session

After all reviewer results are frozen, start one new read-only synthesizer
session. Give it the intent, exact frozen findings, and
`references/lead-judgment.md`. The synthesizer must deduplicate equivalent
findings, map agreement and disagreement, preserve attribution, and propose one
of these categories for each finding:

- `Act on`: a concrete correctness, security, or maintainability problem;
- `Consider`: a legitimate tradeoff without enough evidence to block;
- `Noted`: valid context with low current action value;
- `Dismissed`: wrong, ungrounded, duplicative, or merely stylistic.

If a separate synthesizer is unavailable, the root performs synthesis only
after freezing all review passes and discloses that fallback.

## 5. Root judgment

Freeze the synthesis, then have the root independently inspect the cited code
and evidence for every proposed `Act on` item and any disputed high-severity
finding. The root is responsible for the final categories; reviewer consensus
raises the inspection priority but is not proof. Reject findings that cannot be
traced to the frozen scope or an executable path.

## Output

Return:

### Intent

The frozen intent and reviewed revision or hash.

### Reviewers

One line per attributable reviewer with result state, verified model identity
when available, and finding count.

### Act On / Consider / Noted / Dismissed

For every finding, include location, concrete evidence, reviewer attribution,
and the root's rationale.

### Agreement Map

State consensus, disagreements, failed or malformed reviews, and whether model
diversity was independently verified.

### Verification Boundary

State that no code was changed, identify the frozen reviewer and synthesis
artifacts, and name any fallback that weakened independence or concurrency.
