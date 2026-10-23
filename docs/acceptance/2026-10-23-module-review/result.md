# Complete current-module dual-reference review, 2026-10-23

Status: **accepted for the current-module dual-reference review, implementation
convergence and local validation scope**. The required full local check and
isolated generated-package checks passed. The [fourth independent review](workflow-review-r4.md)
returned **No findings**, closing the prior workflow findings. The
[parser decision](../../maintainers/module-audit-2026-10-23/plan-parser.md) records
why the incomplete handwritten grammar was replaced. Research reports remain
attributable original proposals; this record owns their final dispositions.

The [independent runtime/tooling review](runtime-tooling-review.md) returned
**No findings**, with all 29 frozen file hashes matching before and after review.
That scoped review does not complete workflow acceptance or the full checks.
The final parser integration changes two of those files: generator guide wording
and executable inventory. The other 27 remain unchanged; both changes are
included in round 4's expanded 52-file scope and accepted there.
The [first workflow review](workflow-review-r1.md) found a P2 ordered-list fence
case. Its correction is integrated, including a further lazy-continuation case
reproduced by the parent before acceptance. The [second workflow review](workflow-review-r2.md)
confirmed both fixes and found a separate Setext-heading boundary case. That
correction is integrated. The [third workflow review](workflow-review-r3.md)
confirmed the previous reproductions and found reference definitions creating
false paragraph ownership. The replacement removes custom paragraph/list grammar
and uses fixed parser fence source maps. Round 4 confirmed all prior reproductions
and meaningful negative controls with no further findings. The parent verified
all 52 final frozen hashes after review; the other 27 runtime/tooling files
remain unchanged from their earlier accepted scope.

The review covers all current active source, including older implementations
still used. Official pstack `4ec7ffa173eaa70d3d9467a627baf0954645a353` is primary;
pstack-claude `356c6e0f978df729eb16f227d795f34d221c5aad` is secondary. The
reference declares official base `7b353f78f6ec193bdbe48ed8059444eb09b6878e`.
Its lag is distinct from intentional policy differences.

## Attributable research

- [Workflows and roles](../../maintainers/module-audit-2026-10-23/workflows.md)
- [Runtime, routing and model selection](../../maintainers/module-audit-2026-10-23/runtime.md)
- [Tooling, evidence and packaging](../../maintainers/module-audit-2026-10-23/tooling.md)

The reports preserve their findings as originally proposed. Only private local
checkout prefixes were redacted for publication hygiene. Their test counts are
researcher observations, separate from the parent's final integrated checks.
The original tooling task failed with a model-capacity error; its new-step retry
used the configured model line. No model substitution was hidden as a success.

## Integration decisions

| Finding | Parent disposition |
| --- | --- |
| T1, mutable absolute harness operand | Corrected: normalize against check cwd, require immutable local file operands, reject external and symlink operands; preserve executable pins. |
| T2, multiple merge conflicts | Adapted secondary exit-range, conflict-marker and `--no-diff3` handling in the retained legacy helper. The active schema-2 pin flow remains separate. |
| T3, executable discovery | Corrected: include CommonJS/shell/JS/TS and Python CLI markers; register the actual loopback EPUB preview. Python libraries remain libraries. |
| T4, source decision-log helper | Retain exact official reference-only resource. Reject treating it as a supported native logger; quote/long-write hardening becomes relevant if that separate capability is introduced. No native logging claim is made. |
| T5, historical conformance drift | Corrected: bind fixture revisions and reviewed source-evidence bytes before checking or regeneration; release packaging checks generated conformance first. |
| T5, generic schema validation | Retain targeted validators and correct the evidence ceiling. Declared JSON Schemas are not claimed to be fully validated by a generic engine. |
| T6, contributor release prose | Corrected to required local release receipts and optional manually triggered Actions. |
| RUNTIME-01, custom native homes | Corrected: lookup, setup and inspection share Codex/Pi native-home resolution. Explicit isolated user roots and project shadowing remain supported; relative overrides fail. |
| RUNTIME-02, Claude rejected adjustment | Corrected: replay the complete saved prepared request against its captured capabilities and assignment; separately validate the restored selection against current capabilities. Rejection authenticity remains host-owned. |
| RUNTIME-03, legacy inventory collectors | Corrected: direct-child SIGTERM/SIGKILL escalation, observed exit and bounded pipe draining; cap output, request bytes, models, pages and repeated cursors. Parent reran all 24 collector tests, including real resistant-child PID checks. Descendant-tree supervision is not claimed. |
| RUNTIME-04, Pi failure envelope | Adapted native `isError` signaling. Failed tasks and cancelled collection are errors; successful cancellation commands, running tasks and empty lists remain successful. |
| RUNTIME-05, implicit T3 defaults | Corrected generated guide source: implicit observed defaults remain unsaved and are rederived. |
| W1, promoted transcript tokens | Corrected complete helper anchors in the derivation declarations; preserve `agent-transcripts/` in Eval, Session pickup and Orchestrate. |
| W2, independent review fallback | Corrected metadata and instructions: absent independent review remains incomplete/blocked, preserves available findings and permits unrelated work. Sequential independent sessions remain valid. |
| W3, portable plan parser | Preserve official plan policy and secondary BOM handling; replace the incomplete local grammar with exact markdown-it 15.0.1 browser ESM bytes and fence source maps. Only fence ranges are exempt. Existing ownership and generation distribute parser, notices and provenance. The default dialect, nesting limit of 100 and bare-CR extension have controls. No runtime installation or fallback parser is used. |
| W4, installed help authority | Adapted catalog, invocation metadata, binding, routing and model-manifest precedence; fixed official links remain source provenance. |
| W5, design and evidence policies | Adapted accepted-deviation reconciliation, asserted-code premise checks, human-ruling provenance and record exhaustion, decisive verification evidence, comparator/public-promise controls and factual Reflect inputs. |
| W5, forge and lifecycle policies | Adapted revision-bound landing/restack evidence, conservative cleanup, scoped writer lifecycle, discoverable pause/resume artifacts, installed workflow reads and scoped review lanes. Existing authorization and provider limits remain. |

All bounded runtime and workflow candidates are integrated. The parent reran
27 focused Node tests, five original Bun tests, 181 exact derivations and the
adoption/module checks after the token-parser replacement; they passed. Native
four-target generation and detached T3 plus AIHero generation/check also passed.

The parent separately copied actual generated script resources from all four
native targets to real paths outside the repository, with no symlinks or
ancestor `node_modules`, unrelated working directories and cleared `NODE_PATH`.
All 64 Node 22.23.3 / Bun 1.4.2 checks passed, including the original ordered,
lazy, Setext and reference-definition cases, ordinary-prose rejection, usage
and missing-parser failure. See the [generated-copy evidence](plan-generated-result.json).

## Reproduction and integration history

The first full integration run reached 976 tests: 934 passed, two failed and 40
were skipped. The two failures were old source-contract assertions in
`pstack-01523.test.mjs` and `pstack-01525.test.mjs`. Their updates require the
stronger revision, lease and destination controls and the named registered
public-promise policy while preserving the complete official principle and
exact derivation verification. Both files are included in round 2's review.

After the first ordered-item correction, the parent reproduced the remaining
lazy-continuation failure before requesting the bounded follow-up. For the
rendered fenced-code example `1. First item`, an unindented lazy continuation,
then item `2.` containing the fence, the saved failing check reported:

```text
mid-sentence colon
1 !== 0
# tests 1
# pass 0
# fail 1
```

The same reproduction now passes in the renderer-backed controls, alongside
nested/unordered lists, blank/block boundaries and visible-prose negatives.
The parent separately reproduced round two's exact Setext example with exit 1,
`mid-sentence colon`, and the same `1 !== 0` failure before correction. That
intermediate materialized correction recognized underlines only after an actual
paragraph in the same container with valid indentation. Renderer controls cover both
underline markers, nesting and lazy boundaries; ordinary continuation and
out-of-container underlines still expose visible prose. At that stage, the parent
focused run reported:

```text
# tests 19
# pass 19
# fail 0
# skipped 0
```

The Setext candidate subsequently passed a full run of 976 tests, with 936
passed, zero failed and 40 skipped. That historical pass did not close R3's
reference-definition finding. After the parser replacement, the parent reran
the expanded suite and recorded the current results below.

## Current local verification

| Check | Observed result |
| --- | --- |
| `npm run check` | Exit 0; 984 tests, 944 passed, zero failed, 40 skipped. Generation, documentation, conformance, release, validation, books and Markdown stages also passed. |
| Focused Node checks | 27 passed, zero failed or skipped: 16 workflow/parser tests and 11 historical contract checks. |
| Original Bun plan-checker tests | Five passed, zero failed. |
| Exact official derivations | 181 verified. |
| Capability and module validators | 28 decisions; 229 modules and 764 files. |
| Native generated packages | Four targets, 81 of 93 source Skills; generation check passed. |
| Detached T3 plus AIHero | Four targets, 101 of 113 source Skills; generation check passed. |
| Generated Pi package on native Pi 1.2.0 | Native RPC/task/session/activity/cancellation/shutdown checks passed with a local simulated provider, including the failed-collect error envelope. No live account used. |
| Actual generated portable checker copies | All four native targets passed 64 isolated Node/Bun checks without ancestor `node_modules`, symlinks or repository-relative imports. |
| Final independent review | No findings; 52 hashes matched before and after review, with eleven in-memory control groups passing. |

The 40 skipped tests comprise 38 requiring unavailable TLC and two requiring
the pinned release runtime. They remain unexecuted. The earlier Pi acceptance
exercises the unchanged reviewed runtime; the final token-parser replacement was
checked through Node, Bun, actual isolated generated copies, exact generation
and the full suite. Read the machine-readable
[verification record](verification.json) and [native Pi result](pi-native-result.json)
alongside the independent review records.

## Coverage and evidence boundaries

`upstream/module-reviews.json` records each current module's final source hashes,
decision, fixed-source counterparts or searched scopes, rationale and evidence.
`tools/module-review.mjs` independently discovers current owned inputs. Normal
validation rejects missing/new modules, added/deleted resources, byte drift,
stale assessment pins and invalid counterpart/evidence paths.

The current ledger covers 229 modules and 764 files: 109 workflow modules, 24
runtime modules and 96 tooling modules. The adoption registry records 28
capability decisions: 27 adaptations and one explicit rejection, with no deferred
entries. Retained and local-only modules also have fixed-source comparisons or
searched scopes and explicit reasons in the complete ledger.
The three additional files are the pinned parser, portable notices and source
receipt under the existing Poteto Mode module. The root third-party notice is
also explicitly included in round 4's frozen review scope.

The full secondary Git-tree metadata index covers all 373 fixed files. The 43
selected snapshot files retain fixed Git-byte/blob/license receipts.
The metadata index supports scope lookup; it does not import all secondary code.
Mechanical coverage and hashes do not prove optimal design or every execution
path. The new checker is parent-owned and separately assessed rather than
misattributed to the tooling researcher.

Conformance pins are a reviewed historical snapshot migration. Saved result
fixtures supply their existing revisions; source-evidence bytes were pinned
during this maintenance review. Original runs did not record source-evidence
hashes. No historical live observation was rewritten or relabeled as a new run.

Generated packages and frozen evidence keep their existing generation/provenance
checks. Deleted Git versions are outside this current-source review. Real Claude
Code model execution remains excluded. Native Pi with a local simulated provider
is distinct from a live model account or installed package acceptance.

The earlier hardening task's cross-family Trail review remains blocked by the
available provider catalog. These same-family independent code reviews do not
replace it. See the [separate hardening record](../2026-10-23-reference-hardening/result.md).

No commit, push, plugin installation, publication, cloud operation or personal
configuration write is authorized or performed by this acceptance task.
