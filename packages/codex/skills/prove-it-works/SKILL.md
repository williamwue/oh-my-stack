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

If a delegated result quotes a file, read that file yourself before reporting
its exact contents. Keep source text separate from the agent's explanation,
tool annotations, and role-policy footer. A `ROLE_POLICY` marker in an agent
response is execution metadata, not evidence that the marker exists in the
file. If you cannot read the source, report the child's claim as unverified.
