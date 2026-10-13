# Independent implementation review

## Frozen scope and reviewer

The frozen implementation packet contained the table renderer and explicit policy,
independent validator, diagram adapter, publication/navigation code and focused
checks. Intent is recorded in [CONTRACT.md](CONTRACT.md). The reviewer was a fresh
read-only native subagent, `/root/epub_code_review`, requested as GPT-6 Astra with
high reasoning through the installed OMS delegation helper. The implementation
workers used GPT-6.1 Sol with high reasoning. These are independent model sessions,
not different providers.

## First review

All 48 test cases in the first packet passed. The reviewer then mutated actual
EPUB content in memory, leaving the output files unchanged, and found two P2 gaps:

1. Removing all 13 English `.diagram-reading-aid` blocks still passed validation.
2. Removing every content branch from the English TOC still passed validation.

These were missing acceptance checks, not confirmed content omissions in the
produced EPUBs. The coordinator accepted both findings.

## Corrections and independent recheck

The validator now independently parses the restricted Mermaid syntax used by the
frozen book. SVG dimensions identify required aids; original labels, group members,
directed edges, branch labels, sequence events, figure association and visible
relationship text are compared with packaged XHTML. It also derives required TOC
labels, destinations, section entries and part nesting from source material.

The same reviewer received a separately frozen corrective packet and the exact
final EPUB hashes. It reported both findings resolved:

- Deleting aids now fails with `risky diagram reading aid missing/duplicated`.
- Deleting content navigation now fails with
  `packaged TOC labels/destinations/order/part nesting differ`.

Both mutations were checked against both full editions. Unmodified files passed,
all 12 validator test methods passed, and the reviewer found no new concrete blocker
or renderer import. No rendering acceptance was inferred from these checks.

## Rendering review

A separate bounded worker, `/root/epub_impl_media`, inspected the English EPUB in
its own T3 browser tab. The coordinator inspected Chinese in another tab. Results
are in [reader-en.json](reader-en.json) and [reader-zh-CN.json](reader-zh-CN.json).
The user deferred native WeChat Read acceptance explicitly. Neither these browser
checks nor the content validator establishes native WeChat compatibility.

## Decision-trail review

A separate read-only trail reviewer, `/root/epub_trail_review`, verified source
and output hashes, counts, check logs, representative screenshots and restricted
native runtime metadata. It confirmed GPT-6 Astra/high for itself and the code
reviewer, and GPT-6.1 Sol/high for the listed workers. Original message transcripts
were encrypted and were not audited.

It raised one P3 evidence gap: the initial linked Node failure log showed
`null !== 1`, but did not establish the dynamic-library diagnosis. The coordinator
then preserved controlled [direct](node-copy-direct-diagnostic.log) and
[npm-script](node-copy-npm-diagnostic.log) probes using the same copied executable.
The direct process retains the supplied library path and exits 1 as requested;
the npm script child lacks that variable and aborts loading `libnode.127.dylib`.
The append-only trail clarifies that the binary retains its rpath entries; moving
the executable changes their relative resolution. These diagnostics affect no
book files or test implementation.

The trail reviewer rechecked these corrective artifacts and marked the P3
resolved, with no remaining flags in that scope.

## Publication preparation

The maintainer authorized commit, publication and task workspace cleanup. The
official Node 22.23.3 distribution passed the complete repository check with
406 tests passing, no failures and no skips. This supersedes the Homebrew
environment limitation for publication. The earlier diagnostics remain as
historical evidence. Local paths in new evidence files were normalized for
publication; their test outcomes and artifact hashes were not changed.

A fresh read-only comment reviewer found 26 lines that repeated adjacent code.
The coordinator removed those comments. The reviewer reported no release blocker
or required application-code change. The optional `deslop` helper referenced by
the installed workflow was absent; direct diff inspection and repository checks
provided the cleanup evidence instead.
