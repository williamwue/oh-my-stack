---
name: prove-it-works
description: "Check Skill loading and workspace facts without changing files."
---

# Prove It Works

Verify the installation without changing the workspace.

Report:

- that the `prove-it-works` Skill loaded;
- the current workspace path;
- whether the workspace is inside a version-control repository;
- the evidence used for each answer;
- that no project files were intentionally changed.

Use only read-only inspection. If an item cannot be observed, report it as
unknown rather than inferring it. Do not install dependencies, create files,
edit configuration, or claim support for any workflow beyond this check.
