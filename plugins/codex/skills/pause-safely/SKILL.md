---
name: pause-safely
description: "Checkpoint in-flight work when the user requests a pause."
---

# Pause Safely

Use this workflow only when the user explicitly asks to pause or hand off work.
“Keep going”, “do not stop”, and unattended-execution requests do not authorize
a pause.

## Protocol

1. Finish the current atomic step or back it out. Start nothing new. Stop or
   account for every owned active worker before checkpointing.
2. Inspect the real repository state. Record the objective, repository identity,
   branch, base and current head, clean or dirty status, completed units with
   their evidence, pending units, decisions, next action, key files, and known
   risks. Do not copy secrets or an entire transcript into the checkpoint.
3. Make scoped work durable. Commit valid uncommitted work as one clearly named
   `wip:` commit when the repository permits it. Never push, open a pull request,
   or publish merely to pause. If the durable state is intentionally failing,
   name the exact failing check in the commit body and checkpoint.
4. Write the checkpoint outside the versioned worktree unless the user names a
   repository-owned location. Include a schema version and the exact branch,
   head, and expected clean-state anchors that a cold-start session must verify.
5. Re-read the checkpoint and verify its anchors against the repository. If the
   work cannot be made durable or the anchors already disagree, report that and
   do not call the pause resumable.

## Output

Report the durable commit and checkpoint path, repository cleanliness, completed
versus pending work, verification state, and the first action on resume. This is
a pause record, not a completion claim.
