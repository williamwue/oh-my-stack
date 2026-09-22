---
name: opening-a-pr
description: "Prepare a reviewed pull request; publish only when explicitly requested."
---

# Opening a Pull Request

Use this workflow only when the user explicitly asks to create or publish a pull
request. Finishing another workflow does not imply publication authority.

1. Resolve the repository, remote, base branch, current branch, and forge from
   current state. Stop if the destination is ambiguous or the branch contains
   unrelated work that cannot be separated safely.
2. Inspect the complete diff and commit range. Confirm that generated files,
   third-party notices, and provenance records are included when applicable.
3. Run the relevant clean checks and record exact outcomes. A prior child report
   or stale run is not release evidence.
4. Shape small ordered commits without rewriting shared history unless the user
   explicitly authorized it. Never discard unrelated changes.
5. Write a concise conventional title and a body with `Why`, `Scope`, optional
   `Tradeoffs`, `Blast Radius`, and `Verification`. Apply `technical-writing`
   and `unslop` without changing technical meaning.
6. Show the resolved destination and intended public change immediately before
   the external operation. Create a ready pull request, not a draft, using the
   available forge integration.
7. Read the created pull request back from the forge. Report its URL, base and
   head branches, readiness, and any verification boundary. Creating it does not
   authorize merging or continuous monitoring.

If pull-request creation is unavailable, produce the exact title, body,
destination, and pending command or operation, then report that publication did
not occur. Never claim a URL that was not returned by the forge.
