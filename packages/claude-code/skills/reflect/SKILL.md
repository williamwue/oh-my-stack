---
name: reflect
description: "Review a scoped conversation for recurring lessons and propose evidence-backed corrections to existing Skills."
disable-model-invocation: true
---

# Reflect

## Child session handoff

Read [the handoff contract](../poteto-mode/references/subagent-handoff.md).
New tasks, repair rounds, retries, and queue items use fresh child sessions
with the original brief, every later directive, prior findings and responses,
and unresolved objections. Reuse only for required costly live state, and
only when the host allows it. Stop and fence active writers before replacement.
A host-owned orchestrator's model catalog, workspace binding, child tools,
and review-round rules take precedence over the native binding above.
Keep its task handles and attribution receipts. Do not use a backing child
conversation as a new delegated review, or claim native-record verification
for a host-owned child. Report attribution evidence gaps explicitly.

Use only when the user asks to reflect on an actual conversation or work run.
Trivial exchanges and one-off preferences do not justify durable Skill edits.
Identify the active task transcript through the runtime's task history or the
workspace-scoped transcript path. Do not search unrelated projects or private
history. When no full transcript is accessible, create a bounded digest from
visible context and disclose the loss of tool evidence.

Run three independent read-only reviews when delegation is available: judgment
(wrong decisions and missed evidence), tooling (friction and repeatable checks),
and divergent alternatives. Give each the same frozen task record and require
precise citations, counterexamples, and proposed destination. When available,
use `reflect.tooling` for tooling and `reflect.judgment` for judgment and the
divergent lens; keep all three sessions independent. Use configured routes,
not assumed model identities. With fewer workers, preserve separate
lenses and label reduced independence.

Synthesize Accepted, Rejected, and Backlog findings. Root rechecks each accepted
claim against the transcript and target Skill. Move a finding to Backlog when
a type, schema, lint rule, test, or runtime check enforces it more reliably than
prose. Reject duplicated guidance, subjective one-offs, and changes outside the
user's workspace or intended scope.

Show the proposed edit set with exact paths and the evidence before altering
shared or personal Skills. Apply only changes the user requested or approved;
otherwise return a reviewable proposal. For approved changes, use
[authoring-a-skill](../authoring-a-skill/SKILL.md), validate references and
frontmatter, and test behavioral changes when warranted. Do not assume a team
tracker exists or file external backlog items without authorization. Return
applied edits, proposed edits, rejected findings, and open structural work.
