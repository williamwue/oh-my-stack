---
name: check-resources
description: Verify that a packaged Skill can resolve its own references, assets, and executable helper without changing the workspace.
---

# Check Resources

Resolve every path relative to the directory containing this file.

1. Read [the expected marker](references/expected.md).
2. Read `assets/payload.json`.
3. Execute `scripts/render.mjs` without changing the workspace.
4. Report the reference marker, asset marker, and exact script output.

Do not recreate missing resources, search outside this Skill directory, install
dependencies, or write project files. Report a missing or unusable resource as
unknown instead of guessing.
