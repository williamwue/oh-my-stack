---
name: thermos
description: "Launch both thermo-nuclear review subagents in parallel, then synthesize their findings. Use for thermos, double thermo review, or combined bug/security and code-quality branch audits."
disable-model-invocation: true
---

# Thermos

Run the two thermo review passes as async background subagents in parallel, then synthesize their results.

## Workflow

1. Determine the review scope from the user request, PR, current branch, or relevant changed files.
2. Gather the diff and any file/context excerpts needed for reviewers to evaluate the change without guessing.
3. Launch both subagents in the same response as two `delegate_task` calls with `mode: "async"` and `role: "review"`, on the first two model families of the `interrogate reviewers` sheet line (`<plugin root>` is the directory that holds this plugin's `skills/`):
   - a brief that opens with "Read `<plugin root>/agents/thermo-nuclear-review-subagent.md` and `<plugin root>/skills/thermo-nuclear-review/SKILL.md` in full and act as they say" for bugs, breakages, security, devex regressions, feature-flag leaks, and other branch-audit risks.
   - a brief that opens with "Read `<plugin root>/agents/thermo-nuclear-code-quality-review-subagent.md` and `<plugin root>/skills/thermo-nuclear-code-quality-review/SKILL.md` in full and act as they say" for maintainability, structure, file-size growth, spaghetti, abstractions, and codebase-health risks.
4. Pass each subagent the same scoped diff/file context and ask it to return prioritized findings with file references and evidence.
5. After both finish, synthesize the results with findings first, deduplicated across reviewers. Weight overlapping findings more heavily, resolve disagreements with your own judgment, and keep summaries brief.

If individual background summaries are already visible to the user, do not restate them wholesale. Surface the unified verdict, the highest-signal findings, and any remaining uncertainty.
