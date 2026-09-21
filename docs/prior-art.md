# Prior-art assessment

## Scope

The project starts from four sources. They solve different parts of the problem and should not be treated as interchangeable forks.

## Adopted patterns

| Source | Adopted | Deliberately not adopted |
| --- | --- | --- |
| Cursor pstack | Workflow semantics, principles, routing intent, and verification standards | Cursor tool names, model slugs, cloud assumptions, and raw cross-runtime publication |
| `pstack-claude` | Pinned upstream revisions, deterministic generation, explicit sync ownership, three-way conflict classification, path validation, provenance, and release discipline | Claude-first shared prose and runtime translation by Codex |
| `oh-my-pstack` | Canonical role vocabulary, lifecycle protocols, host-neutral direction, multi-host packaging, and fail-closed integrations | One Pi/OMP-oriented shared adapter and a large protected-path stop list as the primary merge strategy |
| `dsebban/skills` | OMP role mapping, standalone child briefs, batching, isolation, follow-up, cancellation, durable result retrieval, and root-owned verification | OMP-specific tools or resource URIs in the portable core |

These are architectural inputs, not implemented features. Until generated packages and live probes exist, the repository claims design adoption only.

## Cursor pstack

Repository: <https://github.com/cursor/plugins/tree/main/pstack>

Use it as the semantic authority for pstack workflows, principles, playbooks, references, and scripts.

Strengths:

- Complete workflow catalog.
- Strong verification and engineering principles.
- Mature routing through `poteto-mode`.
- Rich long-running, PR, and shipping playbooks.

Constraints:

- Cursor-specific tool names, model slugs, agents, rules, cloud execution, and automation assumptions.
- Some playbooks depend on adjacent Cursor plugins or built-ins.
- Upstream workflow changes and runtime-binding changes are mixed in the same Markdown files.

Decision: pin and synchronize it, but never publish a raw copy as a cross-runtime package.

The main imported baseline remains commit
`6ed0f7a9504f577d7529064103cecce9be7dfc5e`. Session lifecycle and the current
autonomous-run playbook were added later upstream, so `session-pickup.md`,
`pause-safely.md`, and `autonomous-run.md` are separately frozen as
reference-only snapshots at commit
`640ea3abfbdef74aad432b58d8586e4bf645f42d`; this does not silently advance the
verified import baseline or accept unrelated upstream changes.

## dsebban/skills

Repository: <https://github.com/dsebban/skills>

Use it as the main reference for OMP lifecycle behavior.

Strengths:

- Detailed canonical-role mapping to OMP agents.
- Concrete `task`, batch, isolation, job-control, result-resource, and follow-up rules.
- Strong root-coordinator ownership and standalone child-brief contract.

Constraints:

- OMP-only adapter.
- Contains an adapted `poteto-mode` tree rather than a general generation model.
- README states that the complete upstream pstack catalog is not included.
- Its pinned pstack baseline lags current upstream.

Decision: derive the OMP adapter contract from it, with attribution; do not use it as the portable core.

## michael-denyer/pstack-claude

Repository: <https://github.com/michael-denyer/pstack-claude>

Use it as the main reference for repository engineering and release discipline.

Strengths:

- Shared Skill tree with Claude and Codex package overlays.
- Explicit upstream sync boundary.
- Pinned upstream revisions and mechanical substitutions.
- Three-way sync classification for clean, forked, merged, and conflicting files.
- Deterministic generator for manifests, versions, prompts, models, and portable assets.
- Strong skills-only boundary and path-escape validation.
- Detailed provenance, changelog, CI, and release rules.
- Honest distinction between discovery and runtime execution support.

Current evidence:

- A local run on 2026-09-21 completed 192 repository tests with zero failures.
- Those tests are strong static and local behavioral evidence, not proof of live OMP, Codex, or Claude end-to-end parity.

Constraints:

- The shared Skill tree is Claude-first. Codex is instructed to translate Claude tools and models through `codex-tools.md` at runtime.
- Concrete model policy is Claude-centric, with Codex examples added alongside it.
- The Codex translation can drift as Codex tool surfaces evolve.
- OMP has no equivalent first-class adapter in this repository.

Decision: reuse its sync, generation, validation, release, and provenance patterns. Replace the Claude-first core with a runtime-neutral semantic core and generated target Skills.

## shrimpwtf/oh-my-pstack

Repository: <https://github.com/shrimpwtf/oh-my-pstack>

Use it as evidence that a host-neutral pstack vocabulary is practical and as another source for Pi/OMP packaging lessons.

Strengths:

- Moves `poteto-mode` toward canonical roles and lifecycle protocols.
- Removes many Cursor model and tool bindings from shared Skills.
- Provides Pi/OMP packaging plus Claude and Codex manifests.
- Includes a pinned upstream lock, protected adaptation paths, automated sync workflow, static verification, and licensing notices.
- Includes Benny skills and a fail-closed integration posture.

Current evidence:

- A local run on 2026-09-21 verified 49 Skill directories and 110 Markdown files.
- Its three upstream-sync tests passed.

Constraints:

- The only detailed execution adapter is still Pi/OMP-oriented and directly names `task`, `hub`, `agent://`, `history://`, and OMP agent names.
- Claude and Codex receive manifests and shared Skills, but not equivalent detailed lifecycle adapters.
- `skill://` links remain in the supposedly shared core.
- The project is pinned to an older pstack revision than the current upstream inspected during this design work.
- Thirty-one individual paths plus three prefixes are protected from automatic synchronization. Any upstream change to them stops the update rather than attempting the richer three-way classification used by `pstack-claude`.
- Runtime verification is small compared with `pstack-claude`, and no same-scenario three-runtime conformance suite is present.

Decision: do not duplicate or rename this repository. Borrow its canonical vocabulary and Pi/OMP lessons, while building equal adapters and conformance evidence for all three target runtimes.

## Build-or-fork decision

`oh-my-stack` will start as a new repository rather than a direct fork because none of the references has all three properties:

1. a runtime-neutral semantic core;
2. equal first-class OMP, Codex, and Claude Code adapters;
3. generated native targets with same-scenario runtime conformance tests.

Implementation may copy MIT-licensed tooling ideas or adapted code only after adding exact provenance, licenses, pinned source revisions, and focused tests.
