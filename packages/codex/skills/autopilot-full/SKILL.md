---
name: autopilot-full
description: "Build, review, and land a queue only with explicit authorization."
---

# Autopilot Full

Read the [complete workflow](WORKFLOW.md) beside this SKILL.md before applying
this Skill. Read it through the end; if a tool truncates output, continue with
bounded chunks until the whole file has been read. Do not execute a partial
procedure or infer missing instructions. If the file cannot be read, report
the limitation and stop before taking workflow actions.

The user's request sets the scope and authorization. Loading this Skill does
not authorize writes, external actions, or running its workflow when the user
only asks to inspect or explain it.
