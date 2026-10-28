# Upstream distribution transition 0.21.0

## Reviewed source decisions

Direct workflow source: michael-denyer/pstack-claude
`e2cbd491f94ee4ece30e028b9ff69a8b418d1723` (0.9.107). Independent official
reference: cursor/plugins `c742dd61706fbacc1b95f1a20b7b988cf096ce6c`.
AIHero: mattpocock/skills `59db609eb1e18aaf59b63284d0e52255aff0c63c`.
Complete Git trees with modes, blob IDs and SHA256 receipts are in
`upstream/distribution.json`. Vendored files remain original bytes.

Reuse the entire multi-runtime port's agents, skills, scripts, native Pi engine,
models, hooks and configuration behavior. Its official baseline is
`ab1f702ce8e8b6557edb56b09f52cde8bfb83f17` (tools/upstream.json). The latest
official pstack changes eight files since that baseline: Orchestrate now uses an
agentic Project tracker/store; it removes orch.ts, store.ts and orch.test.ts,
updates the scripts test command and version/guide. Defer these to the port;
maintaining a second local workflow fork is rejected. Upstream's declared policy
forks (tools/forks.json) are adopted as part of this direct source, including
operator merge control, review gates, model diversity and failure behavior.
The port's other component pins (cursor-team-kit and thermos) remain its own.

Adapt only packaging identity/version, `pstack:` native references to
`oh-my-stack:`, selected host manifests and one T3 pointer. Keep model JSON byte
identical. Preserve pstack-models.md configuration locations and native sheet
rules. Never import old OMS personal routes/roles or configure a user on install.
T3 mapping is a capability translation, not an orchestration engine or model
policy. Requests and cancellation requests do not establish terminal success.

Adopt all 20 selected AIHero original skill directories unchanged. Current paths
are engineering, productivity and misc, recorded individually in the receipt.
No selected skill was deleted or renamed. Add `prototype` as a declared dependency
because wayfinder explicitly invokes it; include LOGIC.md and UI.md too. Do not
append AIHero stages to pstack. Keep Markdown example placeholder links intact;
check concrete dependencies without rewriting upstream examples.

Retire the old OMS roles/routes, hybrid model templates, oms-auto,
enhanced-delivery, old T3 helper and OMP adapter from formal generation. Their
source and historical evidence remain in Git. The old parity/module/adoption
registries describe that implementation; they are not refreshed to bless this
new architecture. `upstream/distribution-review.json` records current module
ownership and decisions. New active tests protect the released architecture.

## Test transition

`test-retirement-0.21.0.json` classifies every previous root test file. Tests of
retired local workflows remain historical and are replaced by the upstream's own
fixture/generator suite rather than edited to imitate new implementation details.
Release archive, install, rollback, path/link safety, identity, publication lease,
receipt, exact source, download digest and stable tests remain active. The release
test's old OMS catalog/routing assertions now check native skill discovery and
absence of oms-auto. Asset counts now require seven, reflecting OMP retirement.

Added integration builds from an actual clean tagged fixture, installs each
runtime archive, promotes through the real stable builder, then injects an
incorrect pretty-JSON content digest while updating outer checksums and requires
rejection. Producer and promoter share `inventoryDigest`: compact JSON plus one
LF. No validation is weakened for a serializer mismatch.

Upstream checks use a temporary Git root because its PNG test asks Git for tracked
paths. Running inside a nested source snapshot points at OMS and is invalid.
Original upstream tests remain untouched. Full upstream fixtures are distinct
from live Pi/model, Windows and T3 host execution. Retained books keep their
existing complete validator and Python audit/tests in the formal release gate.

## Local candidate evidence and limits

Independent source, implementation and frozen final reviews completed. Findings
fixed: missing prototype dependency, unsupported manifest residue, T3 standalone
discovery, node_modules pollution, source blob/mode checks, OMS install routing,
manual CI Bun setup, applicable legacy regressions and current documentation.

Validated upstream root: 1325 pass, 36 skips (Windows/live Pi in that fixture run).
Upstream scripts: typecheck and 272 tests pass; fixed Prettier check passes.
Statechart: 267 pass, 67 TLC-dependent checks skipped. Pi 1.2.0 supplemental strict
typecheck and actual process/catalog smoke: 4 pass; no model generation calls.
Current OMS Node suite: 53 pass, no skips. Seven Python regression scripts pass.
The formal release pipeline reruns these source/release gates on the clean tag.

Actual T3 delegate_task smoke completed with inherited Codex gpt-6.1-sol/high:
it read the generated 0.21.0/source revision and returned a terminal result.
This does not verify default upstream gpt-6-sol execution (not in this host's
available model catalog), cross-provider model diversity or confirmed T3 cancel.
Windows, TLC differential checks and live Codex/Claude plugin model calls remain
unaccepted. Normal upstream defaults are retained rather than silently replaced.

AIHero AGENTS.md is a symlink upstream. Its source snapshot stores the original
link blob as bytes, with original 120000 mode in the receipt; it is not executed
or copied into runtime skills. This avoids dereferencing a link into new bytes.
Whitespace retained in upstream skills is original source content, not normalized
for local lint. The new source/resource validators establish provenance; they do
not claim that every upstream policy is suitable for every task.
