---
name: opening-a-pr
description: "Prepare and, only when explicitly requested, publish a reviewed branch as a ready pull request with verified scope and evidence."
disable-model-invocation: true
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
5. Write a concise conventional title and a body with `Why`, `What changed`,
   `Scope`, optional `Tradeoffs`, `Blast Radius`, and `Verification`. Use section
   headings when the repository template or host calls for them. Keep the
   problem and approach brief, list only meaningful changes, and name scope
   boundaries when they affect review. Verification names actual commands and
   outcomes; performance claims link the sample, spread, and limiter evidence
   and keep one primary number in the body. Follow the repository template and
   the user's writing requirements. Apply `technical-writing`
   and `unslop` without changing technical meaning.
6. Prefer a host-owned pull-request tool for operations it owns. Use the
   resolved forge for unsupported operations and follow the host's association
   requirements so created or updated requests remain attached to the task.
   Tool availability does not grant publication authority.
   Show the resolved destination and intended public change immediately before
   the external operation. Create a ready pull request, not a draft, using the
   available forge integration.
7. Read the created pull request back from the forge. Report its URL, base and
   head branches, readiness, and any verification boundary. Creating it does not
   authorize merging or continuous monitoring.

If pull-request creation is unavailable, produce the exact title, body,
destination, and pending command or operation, then report that publication did
not occur. Never claim a URL that was not returned by the forge.
