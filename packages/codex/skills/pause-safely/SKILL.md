---
name: pause-safely
description: "Checkpoint in-flight work when the user requests a pause."
---

Host adaptation. Read the installed package's [runtime binding](../../docs/runtime-binding.md) for delegation, tools, paths, transcript access, and control surfaces, and [model selection](../../docs/model-selection.md) for the named routes and ordered panels below. These bindings translate host calls; they add no workflow stages. Continue already authorized implementation through its checks. Advice-only requests end with advice. Publication, merge, deployment, billable requests, credential access, and user-scope configuration retain the host and project authorization gates. A workflow step naming one of these actions does not grant that authority. Source-host helpers under `../poteto-mode/scripts/` are reference-only unless the generated binding identifies supported execution for that exact helper; use the documented native helper only for the capability it supports. Report unavailable capabilities and verification separately.

### Pause safely

**You own a clean stop. Leave a checkpoint a cold-start agent can resume from.** This is explicit only. On "keep going", "going to bed, keep going", or "don't stop", do not pause.

1. Stop at a safe boundary. Finish the current atomic step or back out of it. Start nothing new, and cancel any nested subagents.
2. Take no irreversible action to pause. No PR and no push unless you already had one out.
3. Make the work durable. Commit uncommitted edits as one clear `wip:` commit on the current branch so nothing is lost. If the tree is broken, say so in the commit body in one line.
4. Write the resume note off-context. Capture intent, what you were doing, progress and what's verified, current state, next steps, key files, and gotchas. Use the project-designated durable checkpoint pointer and location. If the project has none, use `.oh-my-stack/resume.md` in the current project as the discoverable pointer to the existing resume note or decision trail. Record the actual workspace, task and revision. Put a compact resume summary at the pointer: objective and delivery target, current phase, latest verified checkpoint and its evidence, active writers or pending handles, blocker if any, and the first next action. Link the existing plan and trail for details. Mark unknown fields explicitly. Keep the note and pointer in storage that survives the expected interruption, rather than relying only on `/tmp`. Reuse an existing trail instead of duplicating it.
5. Preserve requested resume artifacts, including questions, acceptance checklists and procedures, by linking their existing files or saving the complete requested material with the checkpoint. Preserve requested wording and order. Read back the checkpoint using only the project directory and follow its artifact links before claiming it is ready. Label unavailable or incomplete artifacts. This applies only to an explicit pause or checkpoint and does not pause ongoing authorized work.

**Reply:** where you are in the loop, what's on disk versus still in your head (paths, no diff dumps), the commits you made and whether the tree is clean, and the first action on resume. This is a pause, not a final report.
