# Portable plan parser decision

Status: implementation and local acceptance complete. Focused, isolated
generated-package and full checks passed; the [fourth independent review](../../acceptance/2026-10-23-module-review/workflow-review-r4.md)
returned No findings. Real Claude Code and the separate cross-family Trail
review retain the boundaries stated in the acceptance result.

The plan checker must retain official pstack's plan policy while recognizing
rendered fenced code inside lists. The fixed official checker and the secondary
checker both use short fence regexes. The secondary adds useful BOM handling,
but its unlimited-indentation regex cannot identify list containers reliably.
OMS's subsequent custom classifier failed on ordered siblings, lazy paragraphs,
Setext headings and reference definitions. The independent findings and parent
reproductions are preserved in the [acceptance record](../../acceptance/2026-10-23-module-review/result.md).

Use the already pinned markdown-it 15.0.1 browser ESM distribution and fence
source maps. Keep the exact parser bytes, complete relevant third-party notices
and provenance beside the checker as explicitly OMS-owned resources. The
existing resource catalog and generation path distribute them. The installed
checker must resolve its relative import without npm installation, network
access or the development checkout's `node_modules`.

Parse the complete post-frontmatter source with the default preset used by the
existing renderer controls. Mark only `fence` token ranges as code, including
their delimiters. Keep indented code, HTML, inline content and reference
definitions outside this exemption. Preserve all remaining official CLI and
plan-policy checks. Normalize line endings consistently before both raw-line
accounting and parsing; the explicit bare-CR extension needs a regression
control. The preset's nesting limit remains a documented boundary.

A complete block-only upstream extraction could reduce package size, but no
supported standalone block bundle exists in the inspected installed package.
Maintaining a separate dependency closure would add ownership and upgrade work.
The selected full browser distribution costs about 138 KB per target and avoids
that extraction. Another handwritten reference-definition regex would retain
the demonstrated incomplete-grammar mechanism.

Local artifact hashes and lock metadata identify the inspected installed copy.
They do not independently attest the npm tarball or exact dependency versions
inside the publisher-built browser artifact. Preserve that distinction in the
shipped provenance and license record.

Acceptance requires the existing positive and negative controls, the exact R3
reproduction, offset and dialect boundaries, unchanged official Bun policy
tests, and Node/Bun execution of an isolated generated copy with its vendor
resources. Source derivation, resource ownership, actual inventory counts,
generation and full checks must pass before a fresh independent review closes
the change. The bounded design investigation wrote only a proposal; its
read-only parser probes do not establish these implementation results.
