---
name: ketchup
description: "Catch up on this chat since the preceding human message, with current touched-resource status and summaries of pending human-only decisions."
disable-model-invocation: true
---

# Ketchup

Give a read-only catch-up for the current chat. The anchor is the last human
message before this invocation. Notifications, automated updates, tool output,
and subagent reports do not count as human messages. Assume the user remembers
that anchor and nothing after it. If the anchor or part of the interval is
unavailable, state the gap and summarize only the visible record.

## Gather the current state

Collect your own work, subagent reports, and other chat messages since the
anchor. Refresh the current state of each PR, CI run, or agent this chat touched
through available read-only tools. Keep checks scoped to those resources.
Distinguish live observations from earlier reports. Say which resources are
still running and which are unchecked, including the reason a check was
unavailable. A check failure is not evidence that the resource failed.

Also scan earlier visible context for unresolved human-only decisions. An
action item requires a step only the user can take: a product choice, an
approval, an irreversible action awaiting authority, or access you lack.
Work you can still do yourself is remaining work, not a user action item.
Deduplicate decisions and exclude ones the user already resolved. If older
context is incomplete, qualify the count as the visible open action count.

This invocation authorizes observation and a summary. Do not edit files,
publish, start or delegate new work, resume a paused task, or turn a pending
decision into approval. Existing work may continue independently; observing
its status does not authorize changing it.

## Write the catch-up

Open with one sentence giving the open action count, or say there are none.
If nothing happened and no decision is pending, say so and stop.

Report results in order of importance. Give each result and its implication
for the user, skipping steps that changed nothing. Name PRs, branches, and
agents using names the user already knows. State your own remaining work in
one short line without starting it during this turn.

For every action item, give a short decision summary that includes:

- the decision or step the user must take and why it matters now;
- the available options and their cost or consequences;
- your recommendation and its basis;
- what happens if the user does not answer, including any existing hold or
  authorized default.

Say when a cost, option, or consequence is unknown. Link details only when
they exist, and include enough context to decide without opening the link.
Silence grants no new authority.

Use plain everyday words, clear sentences, and only the detail needed to
understand or decide. Keep evidence and uncertainty beside each claim. This
is the plain style used by Bro, expressed here without invoking its
restatement-only procedure.

Use [recall](../recall/SKILL.md) to reconstruct a topic across scoped history.
Use [session-pickup](../session-pickup/SKILL.md) for an authorized resumption
from a durable trail. Ketchup covers this chat and leaves work unresumed.
