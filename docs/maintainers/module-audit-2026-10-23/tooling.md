# Tooling module audit, 2026-10-23

Status: bounded research candidate. Implementation fixes, adoption-registry writes,
package regeneration, integration and final acceptance remain with the parent.
This report changes no implementation, test, configuration or generated package.

## Scope and evidence coordinates

The exact checklist is `.tmp/module-audit-20261023/inventory.json`: **96 tooling
modules / 379 files**. The appendix accounts for each module once. The newly added
`tool:module-review` is the explicit parent-owned exception; its entry records the
exclusion, not semantic acceptance. The other 95 module decisions are supported by
primary implementation, contract, verifier and test inspection described below.
The 95-file test-infrastructure module is evaluated by meaningful test families;
this does not mean every assertion or every execution path was individually proven.

Inventory additions to the initial path-led pass were the Git/lint support files,
contributor/security/package documents, capability registry and eight profiles,
eight OMP probe configs, `codex-skill-descriptions`, AIHero design/spec fixture
families, and the historical Claude clamp fixture. These are now explicit entries.
`check-omp-install` and `setup-acceptance` were also inspected as lifecycle boundary
context; the inventory assigns their implementations outside this track. No
existing inventory module is silently omitted. A new module introduced after this
inventory needs a new parent coverage pass; this report cannot attest future files.

Fixed references used throughout:

- **O** means `upstream/snapshots/cursor-pstack-october-23/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/`.
  Appendix paths start with the receipt's `pstack/` prefix. The supplied complete
  pstack snapshot contains no OMS maintenance tool root, release pipeline, books,
  schemas or evidence-profile system; no claim is made about unprovided repository
  content outside that fixed pstack subtree.
- **R** means the secondary repository at `356c6e0f978df729eb16f227d795f34d221c5aad`.
  The local secondary checkout HEAD was read and equals that exact revision.
  Paths below are repository-relative at that fixed commit; the observed checkout
  is `/tmp/oms-pstack-claude-20261023`.
- Current OMS sources were read from the **working tree**, including authorized
  uncommitted changes. Existing acceptance prose and registry hashes were read as
  supporting records, never substituted for inspecting source and tests.
- Repository `AGENTS.md` and `docs/maintainers/dual-reference.md` govern ownership
  and adoption. The assigned generated T3 runtime/model binding was read. No
  subagents, providers, cloud resources, credentials, model accounts, native
  package installs, source-repository commits, external pushes or publication were invoked.

`retain` means preserve the assessed local behavior; `adapt` means a recommended
bounded correction remains outstanding; `local-only` means preserve an OMS-only
boundary or explicit parent-owned exception. These are audit recommendations,
**not** claims that a new reference adoption was implemented or approved. Named
comparison paths can share workflow intent without being equivalent programs.

## Actionable findings

### T1. Absolute check-script argv can escape the frozen harness

**Implementation bug; highest-priority correction candidate.**
`tools/delivery-evidence.mjs:226-249` freezes executable binaries and declared
immutable files, but `:239-243` skips every absolute argv argument before checking
whether it names a mutable script. `:264-268` and `:447-450` later validate only
those recorded pins. A check `[node, absoluteScript]` therefore freezes Node but
can execute a replaced, unpinned script. This contradicts the same function's
relative-script rejection and the purpose of a frozen acceptance harness.

A disposable local probe held product bytes and expected lock hash fixed. Its
absolute script initially threw; verification returned `rejected`. After replacing
only that script with a successful command, the same frozen lock returned
`accepted`, `behavior: passed`. The only immutable pin was `harness/pinned.txt`.
The probe itself exited 0 because it reports the defect; that is not acceptance.
No external actor, model behavior or malicious-local resistance claim is needed
for this ordinary post-freeze mutation to reproduce.

Recommended correction: normalize file-valued argv paths relative to the check's
cwd, require repository-local check scripts to be immutable regardless of spelling,
and define explicit treatment for external scripts. Keep the executable pin and
pre/post execution observations. Do not claim arbitrary dependency closure or
sandboxing. Existing `tests/delivery-evidence.test.mjs:24-39` provides the focused
fixture seam; add a regression only in the parent's authorized fix work.

Both references' `skills/poteto-mode/playbooks/feature.md` and `visual-parity.md`
require actual verification, but neither implements this optional OMS lock format.
The fix belongs in the local extension; importing a watcher or adding default
workflow gates would not address it.

Reproduction, from the OMS root, using only a disposable temp directory:

```bash
node --input-type=module <<'NODE'
import {mkdtemp,mkdir,writeFile,readFile,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {freezeAcceptance,verifyDelivery} from './tools/delivery-evidence.mjs';
const sha = v => createHash('sha256').update(v).digest('hex');
const root=await realpath(await mkdtemp(join(tmpdir(),'oms-audit-absolute-check-')));
try {
  for (const dir of ['src','task','harness']) await mkdir(join(root,dir));
  await writeFile(join(root,'src/value.mjs'),'export const value = false;\n');
  await writeFile(join(root,'harness/pinned.txt'),'fixed predicate\n');
  const script=join(root,'harness/check.mjs');
  await writeFile(script,"throw new Error('real check fails');\n");
  const plan={version:1,taskId:'absolute-check',mode:'narrow',predicate:'value must be true',
    sourceRoots:['src'],immutablePaths:['harness/pinned.txt'],candidates:{count:0},
    units:[{id:'output',ownedPaths:['src'],delegated:false}],
    checks:[{id:'combined',argv:[process.execPath,script],cwd:'.',timeoutMs:1000,
      outputLimitBytes:1024,required:true}],requiredCombinedCheck:'combined',
    narrow:{reason:'bounded probe',omittedFullRequirements:['design','visual']}};
  await writeFile(join(root,'task/plan.json'),JSON.stringify(plan));
  const frozen=await freezeAcceptance({root,plan:'task/plan.json',out:'task/lock.json'});
  const finalSource=[{path:'src/value.mjs',
    sha256:sha(await readFile(join(root,'src/value.mjs')))}];
  const evidence={version:1,taskId:plan.taskId,lockSha256:frozen.lockSha256,finalSource,
    artifacts:[],units:[{id:'output',outputDigest:sha(JSON.stringify(finalSource))}],reviews:[]};
  await writeFile(join(root,'task/evidence.json'),JSON.stringify(evidence));
  const options={root,lock:'task/lock.json',expectedLockSha256:frozen.lockSha256,
    evidence:'task/evidence.json',runChecks:['combined']};
  console.log('before:',(await verifyDelivery(options)).acceptance);
  await writeFile(script,"console.log('replaced check');\n");
  console.log('after:',(await verifyDelivery(options)).acceptance);
} finally {await rm(root,{recursive:true,force:true});}
NODE
```

### T2. Historical sync misclassifies multiple conflict hunks

**Implementation bug in a retained legacy helper; active schema-2 pin flow is
unaffected.** `tools/sync-upstream.mjs:148-170` recognizes only exit 1 from
`git merge-file` as a merge conflict. Git can return the number of conflict hunks,
up to 127. Two separated conflicts produced `git merge-file failed for file:
line 0` instead of `{status: "conflict", text: ...}`. No source tree was mutated.

R `tools/sync.mjs:195-219` handles exits 1..127, verifies conflict markers, and
uses `--no-diff3` so a global conflict-style setting does not silently change its
contract. These are concrete reusable improvements. Keep >127, spawn failure and
malformed output as errors. The OMS schema-1 planner has rollback/immutable
snapshot protections, while `planSync:244-245` rejects schema 2 and
`acceptCandidate:489-491` explicitly refuses to advance the active parity pin.
Do not replace the current derivation flow with the legacy or secondary apply path.

```bash
node --input-type=module <<'NODE'
import {mergeText} from './tools/sync-upstream.mjs';
const base=Array.from({length:40},(_,i)=>`line ${i}`).join('\n')+'\n';
const local=base.replace('line 2\n','local 2\n').replace('line 35\n','local 35\n');
const candidate=base.replace('line 2\n','candidate 2\n')
  .replace('line 35\n','candidate 35\n');
try { console.log(await mergeText({base,local,candidate})); }
catch(e) { console.log(e.message.split('\n')[0]); }
NODE
```

Existing acceptance seam: `node --test tests/sync-upstream.test.mjs`. It passed
without a two-hunk negative control; passing existing checks did not detect this.

### T3. Executable inventory discovery excludes Python and CJS entrypoints

**Concrete maintenance coverage gap.** `tools/validate.mjs:102-127` validates
manually listed records, but discovers tools only through `.mjs`. It discovers
Skill scripts only through `.mjs`/`.sh`. A newly added Python CLI is invisible.
`tools/books/preview-pstack-epub.py:35-51` is an actual active loopback server,
documented in `tools/books/README.md:72-89`, yet it has no executable-inventory
entry. Other book Python/CJS tools have manually maintained entries, so this is
not a blanket policy that Python is out of scope.

The preview is allowlisted and bound to `127.0.0.1`; this finding does **not** claim
remote exposure or credential access. Extend CLI discovery appropriately and add
accurate loopback network/write/uninstall metadata. Imported layout/media/table
libraries need not be mislabeled as standalone commands. R's security workflow
scans dependencies/workflows; it does not supply an equivalent OMS inventory.

Observed negative control: an empty inventory plus `tools/unlisted.py` passed;
adding `tools/unlisted.mjs` to the same temp tree failed with
`tools/unlisted.mjs: executable is missing from security inventory`.

```bash
node --input-type=module <<'NODE'
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateExecutableInventory} from './tools/validate.mjs';
const root=await mkdtemp(join(tmpdir(),'oms-audit-inventory-'));
try {
  for(const dir of ['tools','security']) await mkdir(join(root,dir));
  await writeFile(join(root,'security/executables.json'),
    JSON.stringify({schemaVersion:1,entries:[]}));
  await writeFile(join(root,'tools/unlisted.py'),'#!/usr/bin/env python3\nprint("fixture")\n');
  await validateExecutableInventory(root); console.log('Python accepted');
  await writeFile(join(root,'tools/unlisted.mjs'),'console.log("fixture");\n');
  try {await validateExecutableInventory(root)} catch(e){console.log(e.message)}
} finally {await rm(root,{recursive:true,force:true});}
NODE
```

### T4. Secondary decision-log hardening is reusable, but helper is reference-only

**Useful reference improvement; low urgency for native execution.** The current
exact official helper `src/core/skills/show-me-your-work/scripts/log.sh:19-42`
appends rather than truncates and neutralizes leading spreadsheet formula bytes,
but not an opening double quote. R's corresponding `log.sh:26-58` also neutralizes
that quote and uses a single Perl `syswrite` for long rows, with an explicit
fallback. R `tests/log.test.mjs:43-158` tests concurrent long rows, non-ASCII bytes,
missing/broken Perl, and short writes.

A temp-file probe invoked each helper with the decision cell `"opening quote`.
Both exited 0. Python `csv.reader(delimiter='\t', strict=True)` failed on the
current official output with `unexpected end of data`, while secondary rows had
widths `[6, 6]`. This is a demonstrated format defect in the preserved helper,
not evidence that current native host runs execute it: `tests/show-work.test.mjs:
28-45` and `tools/generate.mjs:896-897` explicitly keep it reference-only.

If supported native decision logging is added, reuse the quote and long-write
negative controls, decide whether Perl is an acceptable dependency, and register
an explicit helper adaptation. Preserve exact official source history; do not
silently overwrite the generated helper or infer a native mapping from its presence.

### T5. Schema and conformance checks have narrower evidence ceilings

**Useful local verification improvement; no assertion that existing recorded runs
are fabricated or that all schemas must be replaced.** All 11 schema files declare
`additionalProperties:false`, but `tools/generate.mjs:301-315` checks schema-file
existence, while `tools/validate.mjs:175-188` checks JSON parsing and targeted
validators check selected fields. There is no generic JSON Schema engine in the
root dependency set. Do not describe the pipeline as full schema validation.

More substantively, `tools/build-conformance.mjs:18-30,52-99` computes a **current**
fixture digest and combines it with historical source assertions. It checks
fixture/profile names and assertion status, but does not bind source evidence to
an originally observed fixture digest or source-evidence digest. Rebuilding after
a fixture change can therefore stamp a new fixture revision onto old passing
assertions. `tests/conformance.test.mjs:9-21` checks deterministic parity, not this
negative control. `tools/build-release.mjs:58-68` then accepts stored `result:pass`
records as conformance metadata.

Recommended bounded improvement: preserve observed fixture/evidence fingerprints
in the historical input record, reject mismatch before regeneration, and retain
unknown runtime/model claims. A future regression should change a fixture in a
disposable copied source root while leaving its evidence record untouched and
require `build-conformance --check` or generation to reject **before** producing
new passing evidence. No production/source fixture was edited for this audit.
O and R have helper tests and source-linked formal models, but neither provides
this OMS historical cross-runtime conformance format. This is local provenance
maintenance, not a request to port all reference verification frameworks.

### T6. Contributor release prose conflicts with the explicit CI policy

**Documentation inconsistency; policy choice remains with the parent.**
`CONTRIBUTING.md` says release requires “current CI”. `.github/workflows/ci.yml:
3-5` calls CI optional and exposes only `workflow_dispatch`;
`tools/local-release.mjs:206-258` binds publication to the local receipt pipeline.
The latter is also tested against substituting a successful Actions result.
Clarify the contributor sentence to describe the actual required gate. Do not
silently adopt R's automatic pull-request/push triggers or infer an authorization
to publish. `tools/check-doc-facts.mjs:31-65` checks specific version/count/status
patterns and does not cover this sentence.

## Per-boundary comparison and retain/reject decisions

### Source selection, synchronization, derivation and generation

- `pstack-source:59-100`, `plan-pstack-update:14-47` and
  `plan-reference-update:14-80` read fixed committed objects, validate ancestry,
  origins, whole inventories, modes and raw blob bytes, bound Git commands/output,
  expose unmapped changes, and never fetch/apply. R `tools/sync.mjs:312-478,507-622`
  instead makes a three-way ownership/fork plan and can apply changes/pin updates.
  **Retain** the read-only planner boundary; **adapt** only the legacy merge bug T2.
- `derive-pstack:46-102` binds exact UTF-8 source/output hashes, occurrence counts,
  categories, physical containment, and policy adoption IDs. R's substitutions and
  fork declarations are useful upstream-change detection, but cannot replace exact
  OMS host/authorization adaptation receipts. **Retain** the materializer and
  `reference-adoptions:17-96` policy/output linkage. A rationale file's existence
  or a matching hash does not prove the rationale was reviewed.
- `source-skills:34-99,107-120` pins original resources/licenses, dependencies and
  source coordinates without text adaptation. R `validate-skills:65-128` adds useful
  prose-path/skills-only closure checks. OMS packages intentionally depend on
  package docs/scripts outside `skills/`, so **reject** blindly imposing a
  skills-only install contract on them. Keep original-source closure and package
  boundary validation; a separate distribution would need separate acceptance.
- `generate:963-980,989-1037,1263-1317` stages/render-validates all targets before
  swapping, rolls back replaced targets, and protects detached T3 output roots.
  R `generate:935-977` explicitly refuses symlinked generated paths and checks its
  different owned directories. **Retain** staged multi-target generation and
  complete-workflow Codex wrappers, with the existing path/rollback negative
  tests. Neither generator's byte checks prove live installation or semantic
  quality. `codex-skill-descriptions`, `generate-skill-directory` and
  `check-doc-facts` are metadata consumers, not independent workflow sources.

### Worktree, PR observation, orchestration and durable evidence

- O `skills/poteto-mode/scripts/worktree-audit.sh:64-66,103-107` assumes Cursor
  transcript paths. R's Node audit `:234-265,334-387` preserves non-cache ignored
  files and reflog-only history and searches multiple transcript roots. OMS
  `worktree-audit:233-263,298-330,398-448,451-487` already adapts HEAD reflog
  preservation, treats **all** ignored content conservatively, binds scan identity
  and fresh supported-host/PR evidence, rechecks local state, and emits advisory
  hold/unresolved/candidate. **Retain**; **reject** copying transcript heuristics or
  automatic cache deletion as proof of inactivity. No real worktree was scanned
  for cleanup or deleted in this audit.
- O `watch-pr/{github.ts,policy.ts,cli.ts}` separates snapshots, blockers and
  polling. R adds `deadline.ts:8-20`, landing revision comparison
  `landing.ts:76-87`, shipping and transport negative tests. OMS
  `github-observation:98-198` already has a shared monotonic request/byte/time
  budget, duplicate/cursor/count checks, and incomplete pagination failure;
  `github-autopilot-provider:372-431` re-observes and requires explicit
  server-policy acceptance because GitHub cannot atomically compare base SHA.
  **Retain** the bounded native provider and separate T3 watcher binding;
  **reject** describing the merge as strict base CAS or importing a polling daemon.
- `github-workflow:12,38-99,113-154` restricts workflows/actions, independent review
  and frozen frontier, and exposes a read-only inspect/recover CLI. Caller
  authorization records are assertions, as its own comment says. The disposable
  `autopilot-provider-adapter` is an intentional fake forge, not an alternate live
  provider. Keep fake and live evidence labels distinct.
- O `orch/store.ts:382-440` uses PID stale takeover with read/unlink windows. R
  `orch/store.ts:394-539` stages PID files, uses hard links and an exclusive takeover
  directory, with remaining no-hardlink/forced-lock findings named in
  `tla/OrchStoreLock.matrix`. OMS `durable-run-state:178-194,207-264` instead refuses
  persistent locks after two seconds and checks disk generation/revision under an
  exclusive lock. **Retain** conservative no-takeover policy; stale-lock automation
  is an explicit policy alternative, not an unimplemented must-have.
- `run-evidence:103-143` binds source commit and run revision and distinguishes
  current/stale receipts; `operations-doctor:54-144` diagnoses local stores/matrix
  without repair. `runtime-matrix:115-155,178-243` runs declared bounded Node/Bun
  commands and distinguishes unsupported/unknown/failed. **Retain**, while keeping
  arbitrary caller probes and declared receipt checks below a live-host claim.

### Delivery, release, installation and security

- The optional `delivery-evidence` graph is OMS-only. Its source inventory,
  ownership separation, frozen review digests, explicit narrow omissions, and
  before/after observations are useful. **Adapt T1**, preserving the extension
  boundary; `tests/parity-contract.test.mjs:106-119` protects default workflows
  from acquiring this extra machine-evidence contract.
- `delivery-image-diff:36-85,177-212` validates bounded PNG structure/CRC/encoding
  and compares decoded RGBA. `delivery-native-attribution:8-12,158-242` binds
  declared Codex assignment/final records and artifact hashes, with unsupported
  evidence inconclusive. **Retain**; image equality is not authentic capture or
  visual quality, and transcript linkage is not authorship or model diversity.
- `release-lib:27-55,123-176,189-239` rejects symlinks/special archive entries,
  checks inventories and executable modes, stages installation and restores a
  prior owned package on failure. `install-release:19-77` provides inspect/plan
  separately and says package files are distinct from runtime registration.
  **Retain**. R `tools/plugin.mjs:1-8` only defines plugin path/formatting constants;
  `pi-package.mjs:23-65` locates an installed Pi package and compiler paths.
  Packaging validators live in `tools/runtimes.mjs:24-80`, with generator-owned
  manifests. There is no direct staged archive installer/release counterpart.
- `build-release:39-68,181-237` binds source/tag/clean status and target versions;
  `:249-262` checks repeated archive bytes. The config explicitly leaves discovery
  and end-to-end states deferred. **Retain** reproducibility and ownership, without
  upgrading those ceilings from a tarball or fixture pass.
- `local-release:206-258`, `local-release-lib:54-103` and
  `stable-marketplace:27-80,186-255` bind clean commit/tree, exact runtime,
  successful hashed logs/assets, tagged rebuilds, prior stable inventory and
  expected-head leases. `release-publisher:13-37,43-79` selects native auth and
  coordinates cooperating publishers through an owned ref. **Retain**. No real
  lease, identity lookup, tag, release upload or stable promotion was exercised.
- `.github/workflows/ci.yml` is manually dispatched, read-only and pins actions.
  R's multi-OS, skills-only install, Pi type, security scanner and lint jobs are
  useful **policy/host alternatives**, not omissions that justify copying global
  installs or automatic publication. Disabling checkout credential persistence is
  a concrete small hardening option; no workflow mutation was made here.
- `security/executables.json`, `validate:200-244` and schemas provide useful
  local declarations, hygiene and structural checks. **Adapt T3**; a metadata row
  is not network sandboxing, a private-key regex is not complete secret detection,
  and the omission of a generic schema engine must remain explicit (T5).
- `scripts/ops/targets/{github,management}.json` are OMS-specific coordinate and
  retained management metadata. **Local-only**: no fixed-source cloud-management
  counterpart was found. Their presence neither enables retired tooling nor
  authorizes credential reads or provider calls. No cloud work was performed.

### Book toolchain: all 16 files

No book-import/translation/EPUB/PDF pipeline exists in the searched O subtree or
R tools/plugins/docs/tests/Lean/TLA trees. These OMS-specific modules are
**local-only**, with distinct implementation boundaries:

| Files | Primary behavior and decision |
| --- | --- |
| `README.md`, `requirements.txt`, `ebook-requirements.txt` | Preserve pinned existing-environment recipes and separate source fidelity, file validity, rendering and reader compatibility. No dependencies were installed. |
| `import-pstack-book.py` | `:44-74,195-241` uses bounded retry/timeouts, identity checks, cached archival bytes and atomic files. Retain as authorized archival import only; it was not run. |
| `prepare-editions.py` | `:27-60` checks source/draft receipts and resets review status when translation changes. Retain historical source attribution; never relabel an unreviewed draft ready. It was not run. |
| `audit-source.py` | `:40-69,110-166` compares raw-source/rendered structure, destinations, code and per-block approved deviations. Retain the independent negative controls, not just refreshed body hashes. |
| `validate-pstack-book.mjs` | `:300-425` checks 48 chapters, source paths/hashes, titles, links, diagrams, readiness and hash-bound review JSON. `--complete` is a stronger readiness check than default metadata validation. |
| `build-pstack-ebooks.py`, `render-pstack-svg.cjs` | Builder `:237-249` requires existing local licensed fonts and complete source checks; SVG helper `:3-13` uses supplied fonts and explicit output. Retain local artifact generation; no PDF/EPUB rebuild occurred here. |
| `epub_tables.py` | `:62-111,162-195` parses an explicit source-hashed per-table policy, inventory and cell shape/text before transformation. Retain separate table/split/record modes and negative controls. |
| `epub_publication.py` | `:23-80,82-143` composes reflow content, navigation and edition links independently of PDF. Retain source-facing link mapping for sample omissions. |
| `epub_media.py` | `:268-311` requires paired Mermaid source for risky large diagrams and refuses unparsed/invalid companions. Retain original overview plus generated reading aids, not image-text replacement. |
| `epub_layout.py` | `:3-58` contains relative EPUB typography, selectable text and reflow layout; retain independence from fixed PDF dimensions. |
| `validate-pstack-ebooks.py` | `:569-644` checks ZIP/XML inventory, navigation, anchors, code, table rows, prose and diagrams; result explicitly says rendering not assessed. Retain this claim ceiling. |
| `preview-pstack-epub.py`, `preview-pstack-epub.html` | Python `:21-51` serves an allowlisted loopback viewer; HTML `:14-15` disables scripted EPUB content and exposes local QA navigation. Retain viewer, inventory its CLI (T3), and keep visual/reader acceptance separate. No server/browser was started. |

### Formal checks and portable helper boundaries

The portable plan checker is supported: `tools/generate.mjs:879-889` documents
installed-package path resolution and exit 0/1/2. Its O/R helper structure checks
plan shape, not executed unit/live/performance evidence. **Retain** that narrow
contract, exercised by `tests/portable-helpers.test.mjs:13-60` from an unrelated
project. Decision-log, Cursor watcher/store/resume/bootstrap/check-playbooks
sources remain reference-only unless an exact binding supports them.

O/R `create-formal-verification-skill` requires a real broken variant, explicit
bounds, source mapping and a sync revision; `maintain-formal-verification-skill`
distinguishes drift/bug/blocked. Current derived copies retain those contracts
(`src/core/skills/create-formal-verification-skill/SKILL.md:24-38`;
`maintain-formal-verification-skill/SKILL.md:14-37`). They are reviewed as verification
infrastructure context; workflow ownership remains the other audit track.

R `lean/Model/WatchPoll.lean:1-43` explicitly limits its arithmetic model to natural
seconds and honest clock assumptions; the real CLI also accepts fractions.
R `tla/OrchStoreLock.tla:1-32` maps filesystem steps and assumes no PID reuse;
its matrix includes expected failures for forced/no-hardlink states. These are
sound examples of source-linked proofs and useful negative-control practices,
**not** reusable proofs of OMS's different store/transport. **Reject** a blanket
“formally verified OMS” claim or transplanting a model without remapping code,
atomic operations, bounds and mutations. No Lean, TLC, Java or browser toolchain
was installed or executed. The newly supplied statechart suite is explicitly
included by root `package.json`; its workflow implementation is owned elsewhere.

### Test/eval/conformance infrastructure and historical fixtures

The appendix lists **each of the 41 fixture modules** individually, naming its
specific retained boundary. They intentionally include wrong code, historical
installers and synthetic forges. “Fixing” those baseline defects in place would
weaken negative controls. Probe-only expected JSON is a contract, not independent
proof that the native tool was used. Examples of decisive primary assertions:

- `check-*` expected files distinguish active cancellation, terminal state,
  same-worker follow-up, exact observed model/effort, two starts before waiting,
  stale replay and full transcript from a result summary. Interaction has
  explicit unanswered fallback; it does not treat elapsed time as consent.
- `tests/feature-routing-fixture.test.mjs:13-52` runs failing/passing public receipt
  behavior; `how-routing-fixture:6-12` exercises submit/process/store;
  `refactoring-routing-fixture:24-54` compares observable before/after values;
  `prototype-routing-fixture:11-31` counts synthetic operations, not real speed.
- `evals/fixtures/{autopilot-full,autopilot-stack}/review.mjs` binds patch/base/head
  and independent review lanes. `orchestrate/verify.mjs:11-30` checks dependency
  receipts/drains and four integrations. `benny/verify.mjs:12-32` requires draft-only
  PR and no merge/deploy. Their transports/providers remain fixtures.
- `session-pickup/verify-{pause,final}.mjs` preserves existing work and remote refs;
  wake verifier files cover explicit budgets and no-wake fallback. Neither is
  evidence a real scheduler was installed in this turn.
- `aihero-spec-research/verify.mjs:9-77` replays recorded approval snapshots and
  actual sanitized artifacts; its README explicitly separates replay from native
  model checks. The design-only order fixture must not call a real Stripe object.
- `claude-interrogate/page.js:2-5` intentionally returns 4 for `(10,3)`; dated
  Claude evidence names its hash. `tests/interrogate-fixture.test.mjs:9-19` keeps
  distinct reachable parse defects. Neither is a production implementation bug.
- `pstack-01513/README.md:5-36` explicitly preserves an older installer and
  adversarial measurement receipts. Versioned pstack regression tests remain
  active proof against losing previous fixes; they are not the active runtime.

The 95 files in `test-infrastructure` span these actual implementation boundaries:

| Family | Included test/fixture responsibility and decision |
| --- | --- |
| Source/generation | `sync-upstream`, `source-skills`, `pstack-update-plan`, `reference-adoptions`, `parity-contract`, `generate`, `public-skill-matrix`, `packaged-inventory`, `doc-facts`, `skill-directory`, `markdown-links`, `validator-paths`, and versioned `pstack-01513`, `upstream-01517`, `pstack-01523`, `pstack-01525`. Retain byte/path/metadata negative checks; T2/T3/T5 expose gaps beyond existing coverage. |
| Durable/provider | `durable-run-state`, `failure-security`, `run-evidence`, `runtime-matrix`, `operations-doctor`, `autopilot-provider-adapter`, `github-autopilot-provider`, `github-workflow`, `github-pagination`, `worktree-audit`, and `fixtures/durable-run-worker.mjs`. Retain real subprocess concurrency and disposable Git tests, fake transport labels, and bounded failure controls. |
| Delivery/release | `delivery-evidence`, `delivery-image-diff`, `delivery-native-attribution`, `delivery-packaging`, `release`, `release-publisher`, `stable-marketplace`, `local-release`, `local-release-workflows`, `git-lease-acceptance`, `lifecycle`, `omp-install-gate`, `portable-helpers`, `show-work`. Retain archive/rollback/bare-remote tests; actual installation tests were not run. T1 is not covered by the existing accepted-path fixtures. |
| Runtime harness | `alpha3-routing`, `routing`, `model-resolution`, `configure-models`, `collect-model-inventory`, `setup-acceptance`, `codex-delegation`, `claude-delegation`, `claude-effort-hook`, `claude-transcript-location`, `pi-adapter`, `pi-rpc-robustness`, `t3-generation`, `t3-orchestration`, `t3-job-selection`, `t3-candidate-coherence`, `t3-receipts`, `fixtures/pi-rpc-{parent,child}.mjs`, `fixtures/t3-catalog.json`, and `helpers/bash.mjs`. Retain native-shaped records/fake process controls; implementation semantics belong to the runtime audit, not a blanket claim from this track. |
| Workflow fixtures | All `*-fixture.test.mjs` families, `architecture-candidates`, `conflicting-writers`, `mixed-review`, `how`, and `conformance` check the named local seams or replay stored evidence. Retain each module's narrower assertion ceiling; do not infer complete independent model review from regex checks. |
| Books | Seven `*.test.py` suites and `pstack-book.test.mjs` test fidelity, layout, policies, code/prose/link mutations, media, publication and Windows ZIP paths. Retain separate source/rendering/reader ceilings. Existing Python suites are not all invoked by root `npm test` or CI's one book-audit test command. |

## Executed checks and limits

All commands ran from the OMS root against the current working tree. Test and
probe scratch writes were disposable; no test files were added. The local Node
version was `v22.23.3`, with zlib `1.2.12`; the release pipeline requires zlib
`1.3.1-e00f703`. The two pinned-runtime tests were skipped for that mismatch;
skipped tests are not passing release acceptance.

1. `git -C /tmp/oms-pstack-claude-20261023 rev-parse HEAD`: exit 0,
   `356c6e0f978df729eb16f227d795f34d221c5aad`.
2. `node tools/derive-pstack.mjs --check`: exit 0, **181 exact derivations verified**.
3. `node tools/build-conformance.mjs --check`: exit 0, **12 records / 6 scenarios**.
   This proves deterministic current records, within T5's historical-binding limit.
4. Focused source/provider/delivery/validation run below: exit 0,
   **271 tests; 269 passed, 0 failed, 2 skipped**, about 82.5 seconds. The selected
   local-release suite declares two pinned-runtime skips; no live release was run.
5. Focused fixtures/packaging run below: exit 0, **87 passed, 0 failed, 0 skipped**,
   about 21.1 seconds. Local bare-repository promotion/lease fixtures are not
   external pushes or publication.
6. Existing-environment Python loop below: exit 0, **60 tests across seven suites**
   (3 + 1 + 12 + 2 + 22 + 12 + 8). No dependency installation or artifact rebuild.
   Initial `python -m unittest discover -s tests -p '*test.py'` found **0 tests**
   and exited 5 because these dotted filenames are not discovered as importable
   modules; it was corrected by invoking each actual test script. No zero-test
   result is counted as validation.
7. Three self-contained temp probes (T1, T2, T3): shell exit 0 with the defective
   observations recorded above. The T4 shell/CSV probe also exited 0 and showed
   current TSV parse failure versus secondary six-column rows.

Exact focused Node commands (no installs, account calls or model calls):

```bash
node --test tests/sync-upstream.test.mjs tests/source-skills.test.mjs tests/pstack-update-plan.test.mjs tests/reference-adoptions.test.mjs tests/worktree-audit.test.mjs tests/durable-run-state.test.mjs tests/github-workflow.test.mjs tests/github-autopilot-provider.test.mjs tests/github-pagination.test.mjs tests/delivery-evidence.test.mjs tests/delivery-native-attribution.test.mjs tests/delivery-image-diff.test.mjs tests/local-release.test.mjs tests/release-publisher.test.mjs tests/conformance.test.mjs tests/validator-paths.test.mjs tests/markdown-links.test.mjs
node --test tests/aihero-spec-research-fixture.test.mjs tests/architecture-candidates.test.mjs tests/autonomous-run-fixture.test.mjs tests/autonomous-run-wake-fixture.test.mjs tests/autopilot-full-fixture.test.mjs tests/autopilot-stack-fixture.test.mjs tests/babysit-check-fixture.test.mjs tests/babysit-drive-fixture.test.mjs tests/benny-fixture.test.mjs tests/bug-fix-fixtures.test.mjs tests/conflicting-writers.test.mjs tests/feature-routing-fixture.test.mjs tests/how-routing-fixture.test.mjs tests/interrogate-fixture.test.mjs tests/mixed-review.test.mjs tests/opening-pr-fallback-fixture.test.mjs tests/orchestrate-fixture.test.mjs tests/prototype-routing-fixture.test.mjs tests/public-skill-matrix.test.mjs tests/refactoring-routing-fixture.test.mjs tests/session-pickup-fixture.test.mjs tests/setup-live-fixture.test.mjs tests/shipping-fixture.test.mjs tests/writing-cleanup-fixture.test.mjs tests/show-work.test.mjs tests/pstack-book.test.mjs tests/portable-helpers.test.mjs tests/stable-marketplace.test.mjs tests/release.test.mjs tests/failure-security.test.mjs
for test_file in tests/*.test.py; do
  PYTHONDONTWRITEBYTECODE=1 .tmp/ebook-venv/bin/python "$test_file" || exit $?
done
```

No full `npm run check`, installation/lifecycle CLI, provider API, cloud operation,
model/native-host live session, EPUB/PDF rebuild, reader compatibility test,
formal prover/model checker, or publication was performed. The root coordinator
owns fixes, final file hashes, regenerated outputs and integration acceptance.
These findings are scoped engineering judgments, not universal optimality claims.

Final report checks: Markdown lint exited 0 with no issues; parsing the JSON
appendix confirmed 96 unique IDs exactly matching the tooling inventory, all
official comparison paths present in the active source receipt, and all secondary
comparison files present. The three embedded repro commands were executed again
directly from this report and reproduced T1, T2 and T3 with shell exit 0. The new
file's `git diff --no-index --stat /dev/null <report>` exits 1 because a diff exists;
that is the expected diff-reporting state, not a validation failure.

At the final inventory freshness read, only `security/executables.json` and the
parent-owned `tools/module-review.mjs` differed from the supplied tooling hashes.
The inventory added the parent's checker entry; the book preview entry was still
absent, so T3 remained reproducible. These parent changes were preserved and are
not attributed to this report. Parent must refresh those hashes after its own
validation; this audit does not claim a frozen whole-repository acceptance tree.

## Machine-readable module decisions

The appendix is keyed exactly `moduleDecisions`. One entry corresponds to one
parent inventory ID. Empty arrays explicitly name the searched scope and absence
of a counterpart; the parent-owned checker is explicitly excluded. Parent may
attach this report's evidence path and compute final local hashes after its fixes.

```json
{
  "moduleDecisions": [
    {
      "id": "book-toolchain",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain all 16 OMS book source, translation, layout, rendering, preview and validation files. Their provenance and reader-acceptance contracts are independent of runtime convergence; see book decisions and T3.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Searched the fixed secondary repository tools, plugins, tests, docs, Lean and TLA trees: no counterpart to this OMS-owned module."
    },
    {
      "id": "fixture:aihero-codebase-design",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain pinned AIHero original-skill acceptance inputs and approval/artifact preservation checks. Neither fixed pstack tree implements these original Matt Pocock fixture contracts.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Searched the fixed secondary repository tools, plugins, tests, docs, Lean and TLA trees: no counterpart to this OMS-owned module."
    },
    {
      "id": "fixture:aihero-spec-research",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain pinned AIHero original-skill acceptance inputs and approval/artifact preservation checks. Neither fixed pstack tree implements these original Matt Pocock fixture contracts.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Searched the fixed secondary repository tools, plugins, tests, docs, Lean and TLA trees: no counterpart to this OMS-owned module."
    },
    {
      "id": "fixture:architecture-candidates",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/architect/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/architect/SKILL.md"
      ],
      "rationale": "Frozen durability requirements distinguish a flush-before-ack log from a volatile queue; keep historical candidate selection separate from the current Architect workflow.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:autonomous-run",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/autonomous-run.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/autonomous-run.md"
      ],
      "rationale": "Keep bounded controller progression and an explicit completion predicate; fixture provider state is not a live automation.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:autonomous-run-wake",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/autonomous-run.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/autonomous-run.md"
      ],
      "rationale": "Keep wake budget, pause/fallback, stale wake handling and terminal cleanup; no scheduler was created in this audit.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:autopilot-full",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/autopilot-full.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/autopilot-full.md"
      ],
      "rationale": "Keep frozen patch/base/head, independent review lanes and root-only landing in a disposable forge; fake merge is not GitHub acceptance.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:autopilot-stack",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/autopilot-stack.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/autopilot-stack.md"
      ],
      "rationale": "Keep linear topology, independent review and no landing by the operator-free fixture.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:babysit-check",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/babysit.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/babysit.md"
      ],
      "rationale": "Keep read-only PR diagnosis without speculative mutation or synthetic success.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:babysit-drive",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/babysit.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/babysit.md"
      ],
      "rationale": "Keep failed-check repair with frozen forge inputs and no merge authority.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:benny",
      "decision": "retain",
      "officialPaths": [
        "pstack/automations/benny/skills/setup-benny/SKILL.md"
      ],
      "referencePaths": [],
      "rationale": "Keep two-source deduplication, reproduction/UI evidence, draft-only PR and no merge/deploy; the secondary has no Benny automation equivalent.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Searched the fixed secondary automation, plugin, tools and tests trees: no Benny triage/reproduction automation implementation. Host setup is not a Benny counterpart."
    },
    {
      "id": "fixture:bug-fix-delegated",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/SKILL.md"
      ],
      "rationale": "Keep the same failing port seam with child attribution and root re-verification; delegation assertions require recorded native evidence.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:bug-fix-root",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/SKILL.md"
      ],
      "rationale": "Keep the deliberately failing port baseline and root-owned repair contract; local executable seam, not model acceptance.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:check-cancellation",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/swarm/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/swarm/SKILL.md"
      ],
      "rationale": "Keep generation-one active cancellation, terminal observation and fresh generation checks; an acknowledgment alone is insufficient.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:check-custom-role",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/setup-pstack/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/setup-pstack/SKILL.md"
      ],
      "rationale": "Keep role discovery and marker isolation probes, including unsupported outcomes on a host without the selector.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:check-delegation",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/swarm/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/swarm/SKILL.md"
      ],
      "rationale": "Keep distinct child/root marker observations and the no-project-write contract.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:check-follow-up",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/swarm/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/swarm/SKILL.md"
      ],
      "rationale": "Keep same-worker follow-up and retained seed attribution; do not substitute a newly spawned worker.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:check-interaction",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/SKILL.md"
      ],
      "rationale": "Keep genuine nonrecommended choice and free text checks, plus pending-question fallback with null answers.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:check-model-routing",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/setup-pstack/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/setup-pstack/SKILL.md"
      ],
      "rationale": "Keep requested versus independently observed model and effort distinct; never infer actual selection from prompt text.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:check-panel",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/arena/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/arena/SKILL.md"
      ],
      "rationale": "Keep separately attributed candidates frozen before independent judgment; four-session probe is a fixture contract, not a universal workflow requirement.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:check-parallel",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/swarm/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/swarm/SKILL.md"
      ],
      "rationale": "Keep two starts before a wait and separate left/right result attribution.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:check-resources",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/SKILL.md"
      ],
      "rationale": "Keep installed reference, asset and script resolution checks; existence and executing one helper do not prove all workflows.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:check-stale-replay",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/swarm/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/swarm/SKILL.md"
      ],
      "rationale": "Keep cancellation followed by deliberately late stale payload delivery and fresh-generation rejection checks.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:check-transcript",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/reflect/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/reflect/SKILL.md"
      ],
      "rationale": "Keep transcript assignment/read evidence separate from a result summary and from sandbox enforcement.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:check-writer-isolation",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/SKILL.md"
      ],
      "rationale": "Keep one isolated writer, read-only observer, exact changed bytes and untouched source checkout.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:claude-interrogate",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/interrogate/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/interrogate/SKILL.md"
      ],
      "rationale": "Keep the intentionally defective one-based clamp; evidence records cite its hash. Its wrong result is a review target, not an OMS bug to repair.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:conflicting-writers",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/orchestrate.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/orchestrate.md"
      ],
      "rationale": "Keep separate owned settings edits and a combined verifier that catches lost updates; distinguish fixture merging from host isolation.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:feature-routing",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/feature.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/feature.md"
      ],
      "rationale": "Keep public receipt normalization/rendering behavior, failing before and passing after the bounded change.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:how-routing",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/how/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/how/SKILL.md"
      ],
      "rationale": "Keep queue-submit-render-store public behavior and evidence explanation; historical route labels are not current routing acceptance.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:interrogate",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/interrogate/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/interrogate/SKILL.md"
      ],
      "rationale": "Keep parseInt suffix and lower-bound defects as reachable negative review targets; current lead-synthesis instructions are checked separately.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:mixed-review",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/interrogate/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/interrogate/SKILL.md"
      ],
      "rationale": "Keep the inclusive-end regression and false alarm as separate judgments; bounded output checks do not authenticate reviewer independence.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:opening-pr-fallback",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/opening-a-pr.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/opening-a-pr.md"
      ],
      "rationale": "Keep exact pending operation, complete diff and no fabricated URL when PR capability is unavailable.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:orchestrate",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/orchestrate.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/orchestrate.md"
      ],
      "rationale": "Keep dependency receipts, per-unit attribution, drain order and four verified integrations with no external publication.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:prototype-routing",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/prototype.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/prototype.md"
      ],
      "rationale": "Keep equivalent scan/set outputs with deterministic operation counts; these are synthetic counts, not wall-clock performance.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:prove-it-works",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/principle-prove-it-works/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/principle-prove-it-works/SKILL.md"
      ],
      "rationale": "Keep basic Skill-load, cwd and VCS facts with no intended writes; this is a discovery probe, not end-to-end product proof.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:pstack-01513",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/correct/SKILL.md",
        "pstack/skills/benchmark-checklist/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/correct/SKILL.md",
        "plugins/pstack/skills/benchmark-checklist/SKILL.md"
      ],
      "rationale": "Keep the deliberately vulnerable historical installer and adversarial measurement receipts as immutable regression inputs; never execute their publication paths.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "fixture:public-skill-matrix",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-help/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-help/SKILL.md"
      ],
      "rationale": "Keep exact current catalog membership, order, headings and no-workflow-execution report checks; records are caller assertions unless independently captured.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:refactoring-routing",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/refactoring.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/refactoring.md"
      ],
      "rationale": "Keep pinned observable labels before/after deduplication; no new behavior is accepted.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:session-pickup",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/session-pickup.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/session-pickup.md"
      ],
      "rationale": "Keep checkpoint identity, preserved inherited work, resumed behavior and no push during pause/pickup.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:setup-live",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/setup-pstack/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/setup-pstack/SKILL.md"
      ],
      "rationale": "Keep dry run, invented-model rejection, owned hashes and unrelated-file preservation. Offline replay does not rerun native setup.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "fixture:shipping",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/shipping.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/shipping.md"
      ],
      "rationale": "Keep frozen lowest frontier, exact patch/head and independent review before a disposable merge; fixture authority is not real consent.",
      "officialRationale": "The named official playbook supplies workflow intent, not a perfect equivalent of the OMS executable fixture. Preserve dated fixture semantics and label fresh runtime evidence separately.",
      "referenceRationale": "The named fixed secondary playbook is compared for policy and failure behavior; retain this local fixture rather than translating host assertions by name."
    },
    {
      "id": "fixture:writing-cleanup",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/unslop/SKILL.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/unslop/SKILL.md"
      ],
      "rationale": "Keep the failing prose baseline and meaning-preserving how-to repair through an external verifier; regex rules cover this fixture only.",
      "officialRationale": "The named official workflow is the semantic reference; its tree contains no equivalent OMS host fixture. Retain this local negative/control case without importing source-host tool names.",
      "referenceRationale": "The named secondary workflow is the semantic reference; its native test suites do not replace this OMS runtime-coordinate fixture."
    },
    {
      "id": "operations-metadata",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain exact repository coordinates and retired cloud metadata; no env loading, account access, or provider operation is authorized by these files.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Searched the fixed secondary repository tools, plugins, tests, docs, Lean and TLA trees: no counterpart to this OMS-owned module."
    },
    {
      "id": "release-packaging",
      "decision": "local-only",
      "officialPaths": [
        "pstack/.cursor-plugin/plugin.json"
      ],
      "referencePaths": [
        "plugins/pstack/.claude-plugin/plugin.json",
        "tools/runtimes.mjs"
      ],
      "rationale": "Keep four-target verification ceilings and separate marketplace bundles. Manifest comparison does not establish native installation or publication.",
      "officialRationale": "Official single-host plugin identity is the comparison; no four-target release-config counterpart in the fixed snapshot.",
      "referenceRationale": "Secondary plugin metadata and runtimes.mjs packaging validators describe different distribution shapes; pi-package.mjs only locates installed Pi dependencies, and plugin.mjs only defines constants. No equivalent four-target release-config pipeline exists."
    },
    {
      "id": "schemas",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [
        "tools/generate.mjs"
      ],
      "rationale": "Retain all 11 explicit schema contracts. T5 distinguishes documented schemas from actual validation; do not claim universal JSON Schema enforcement.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Secondary generator uses targeted shape checks instead of an OMS schema family; compare parser strictness, not file-name similarity."
    },
    {
      "id": "support:.claude-plugin",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        ".claude-plugin/marketplace.json"
      ],
      "rationale": "Keep OMS marketplace source pointed at generated packages/claude-code; do not route to the private/reference plugin.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare local marketplace identity and source paths; this is packaging metadata, not runtime discovery proof."
    },
    {
      "id": "support:.gitattributes",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain LF normalization and narrowly scoped historical visual-patch whitespace handling; no runtime behavior to import.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Searched the fixed secondary repository tools, plugins, tests, docs, Lean and TLA trees: no counterpart to this OMS-owned module."
    },
    {
      "id": "support:.github/workflows",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        ".github/workflows/ci.yml",
        ".github/workflows/security.yml"
      ],
      "rationale": "Retain manual-only CI and local release receipts as the explicit OMS policy. Consider checkout persist-credentials:false as a small hardening adaptation; do not copy automatic triggers or global installs.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Secondary runs automatic, multi-OS, dependency and skills-install jobs. Those are policy/host alternatives; compare meaningful failure and packaging tests without authorizing installs or remote operations."
    },
    {
      "id": "support:.gitignore",
      "decision": "retain",
      "officialPaths": [
        "pstack/.gitignore"
      ],
      "referencePaths": [
        ".gitignore"
      ],
      "rationale": "Keep scratch, dependencies, output and bytecode exclusions. Ignore patterns neither authorize deletion nor prove absence of secrets.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "support:.markdownlint-base.json",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        ".markdownlint-cli2.jsonc"
      ],
      "rationale": "Keep scoped exceptions for preserved originals and dated evidence; new research stays linted.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare lint scope and preserved upstream bytes; secondary lint configuration is an alternative, not an exact base-config counterpart."
    },
    {
      "id": "support:.markdownlint-cli2.mjs",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "tools/generate.mjs"
      ],
      "rationale": "Keep derivation-driven lint exclusions so source-authentic prose is not silently reformatted.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Secondary derives outputs with its own substitution rules; no derivation-manifest-driven lint generator counterpart."
    },
    {
      "id": "support:AGENTS.md",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "CONTRIBUTING.md"
      ],
      "rationale": "Keep generated-file ownership, dual-reference comparison and cloud authorization instructions. This audit follows the current working-tree instructions.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Secondary contributor rules are comparison only; they do not override OMS source ownership or user authorization."
    },
    {
      "id": "support:conformance",
      "decision": "adapt",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Preserve six scenario families and distinct runtime coordinates; recommend binding historical evidence to its observed fixture and source digests (T5), not silently reattesting it after regeneration.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Searched the fixed secondary repository tools, plugins, tests, docs, Lean and TLA trees: no counterpart to this OMS-owned module."
    },
    {
      "id": "support:CONTRIBUTING.md",
      "decision": "adapt",
      "officialPaths": [],
      "referencePaths": [
        "CONTRIBUTING.md"
      ],
      "rationale": "Retain source/generator ownership; reconcile the phrase current CI with optional manual CI and the local publication gate (T6). This is a documentation inconsistency, not approval to change release policy.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "support:evals/configs",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Retain all eight historical OMP probe configs and restricted model-routing role; do not refresh model strings or execute account-backed probes during static convergence.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Searched the fixed secondary repository tools, plugins, tests, docs, Lean and TLA trees: no counterpart to this OMS-owned module."
    },
    {
      "id": "support:package-lock.json",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/scripts/bun.lock"
      ],
      "referencePaths": [
        "bun.lock"
      ],
      "rationale": "Keep npm lock integrity for the actual Node toolchain. Bun locks are comparison surfaces for pinned tooling, not interchangeable dependencies.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "support:package.json",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/scripts/package.json"
      ],
      "referencePaths": [
        "package.json"
      ],
      "rationale": "Keep offline checks and the explicit statechart test entry; Python EPUB suites remain a separate existing-environment command. Do not run lifecycle installation under this audit boundary.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "support:security",
      "decision": "adapt",
      "officialPaths": [],
      "referencePaths": [
        ".github/workflows/security.yml"
      ],
      "rationale": "Retain per-tool network/write/uninstall declarations; extend discovery to Python/CJS CLI entrypoints and inventory the loopback preview (T3). Static metadata is not a sandbox.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Secondary security workflow scans dependencies and workflow configuration; it has no OMS executable-inventory counterpart, so retain the local inventory and fix its coverage directly."
    },
    {
      "id": "support:SECURITY.md",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "SECURITY.md"
      ],
      "rationale": "Retain private reporting and no-secret disclosure instructions. Alpha-preparation wording is historical and should be reconciled by the parent with actual release status, not guessed here.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "support:src/capabilities",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [
        "tools/runtimes.mjs"
      ],
      "rationale": "Retain explicit capability vocabulary; names must exist before profiles or skill requirements can claim them.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Secondary runtime table owns different packaging/tool surfaces; no equivalent OMS capability registry."
    },
    {
      "id": "support:src/capabilities/profiles",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "tools/runtimes.mjs"
      ],
      "rationale": "Retain all eight coordinate-specific profiles and explicit unknown/unsupported ceilings. Dated Codex/OMP evidence and pending Pi remain historical scope, not current universal support.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Secondary runtime packaging registry is a useful contrast, but has no OMS evidence-bound per-capability support profile. Do not infer support from its advertised host list."
    },
    {
      "id": "support:upstream",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "tools/upstream.json",
        "tools/forks.json",
        "tools/substitutions.json"
      ],
      "rationale": "Retain all seven source/pin/ownership/derivation/adoption selectors; validate complete receipts and record policy alternatives. Historical ownership metadata is not the active schema-2 materializer.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Secondary fork declarations and exact component pins are reusable concepts; OMS exact anchors and adoption receipts preserve its own host and authorization differences."
    },
    {
      "id": "test-infrastructure",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/scripts/check-plan.test.ts",
        "pstack/skills/poteto-mode/scripts/orch/orch.test.ts",
        "pstack/skills/poteto-mode/scripts/watch-pr/policy.test.ts"
      ],
      "referencePaths": [
        "tests/sync.test.mjs",
        "tests/generate.test.mjs",
        "tests/log.test.mjs",
        "tests/test-discovery.test.mjs",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/transport.test.ts"
      ],
      "rationale": "Retain all 95 inventory files as tests/fixtures, including active historical regressions; see test-family decisions and executed commands. Assertions and replay fixtures are not live model proof. No tests were added.",
      "officialRationale": "Official helper tests validate official contracts only. OMS historical regression and host fixtures have no perfect counterpart and must remain scoped to their tested behavior.",
      "referenceRationale": "Secondary failure, discovery, transport and log tests provide useful adversarial cases. Lean/TLA proofs apply to their named code and assumptions; do not label OMS formally verified."
    },
    {
      "id": "tool:autopilot-provider-adapter",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/scripts/orch/store.ts"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/scripts/orch/store.ts"
      ],
      "rationale": "Retain disposable forge state, revision CAS and deterministic failure injection for fixture tests; it is not a real GitHub implementation.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:build-conformance",
      "decision": "adapt",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep deterministic traces and explicit modelResolution:not-recorded. Recommend immutable source-evidence plus observed-fixture binding before treating regenerated fixture hashes as historical run evidence (T5).",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Searched the fixed secondary repository tools, plugins, tests, docs, Lean and TLA trees: no counterpart to this OMS-owned module."
    },
    {
      "id": "tool:build-release",
      "decision": "retain",
      "officialPaths": [
        "pstack/.cursor-plugin/plugin.json"
      ],
      "referencePaths": [
        "tools/generate.mjs",
        "tools/runtimes.mjs"
      ],
      "rationale": "Keep reproducible archives, exact tag/clean-tree checks, target identity and separate lifecycle/discovery ceilings. Current conformance collection is evidence metadata, not new execution.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Secondary generator and runtime validators own plugin manifests and layout, not deterministic four-target archives or tagged OMS release receipts; retain the local release builder."
    },
    {
      "id": "tool:check-doc-facts",
      "decision": "retain",
      "officialPaths": [
        "pstack/.cursor-plugin/plugin.json"
      ],
      "referencePaths": [
        "tests/readme-facts.test.mjs"
      ],
      "rationale": "Keep checked current source/pin/count facts and historical-section exclusions. It is deliberately narrower than checking every status sentence; T6 remains outside its patterns.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:codex-skill-descriptions",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/SKILL.md",
        "pstack/skills/create-formal-verification-skill/SKILL.md"
      ],
      "referencePaths": [
        "tools/generate.mjs"
      ],
      "rationale": "Keep short discovery metadata separate from complete workflows. Do not turn a short description into a partial procedure; updated formal/statechart entries are covered by generated catalog checks.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:delivery-evidence",
      "decision": "adapt",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/visual-parity.md",
        "pstack/skills/poteto-mode/playbooks/feature.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/visual-parity.md",
        "plugins/pstack/skills/poteto-mode/playbooks/feature.md"
      ],
      "rationale": "Retain opt-in local machine-evidence graph, ownership and immutable checks; fix absolute script argv escaping immutable pins (T1). Do not impose this extension on default pstack workflows.",
      "officialRationale": "Official playbooks supply verification intent, not this OMS machine-evidence format. No exact counterpart; preserve the optional boundary.",
      "referenceRationale": "Secondary playbooks also lack the OMS acceptance lock. Their source-bound verification principle supports fixing the local boundary rather than copying unrelated watcher code."
    },
    {
      "id": "tool:delivery-image-diff",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/visual-parity.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/visual-parity.md"
      ],
      "rationale": "Keep bounded PNG parsing, CRC/order/filter checks and RGBA pixel comparison. It establishes image difference only; capture authenticity and visual meaning remain outside its claim.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:delivery-native-attribution",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "tests/pi/agent-transcript-command.test.mjs"
      ],
      "rationale": "Keep bounded Codex request/spawn/final linkage and immutable artifact declarations. Distinct tasks do not prove model diversity, authorship or unbiased review.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Secondary transcript tests illustrate native record boundaries but do not implement Codex OMS attribution; retain host-specific parsing and explicit inconclusive outcomes."
    },
    {
      "id": "tool:derive-pstack",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "tools/sync.mjs",
        "tools/generate.mjs"
      ],
      "rationale": "Keep exact occurrence counts, hashes, physical containment, and registry-bound policy replacement. Do not replace schema-2 derivation with secondary three-way mutation.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:durable-run-state",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/scripts/orch/store.ts"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/scripts/orch/store.ts",
        "tla/OrchStoreLock.tla",
        "tla/OrchStoreLock.matrix"
      ],
      "rationale": "Keep single-file revision/generation checks, atomic rename and conservative stale-lock refusal. Secondary takeover protocol solves a different force-recovery policy; no blind import.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:generate",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "tools/generate.mjs",
        "tools/validate-skills.mjs"
      ],
      "rationale": "Keep staged multi-target rendering, drift checks, rollback and detached T3 outputs. Reuse secondary physical-path and prose-closure lessons selectively; source bytes alone are not live acceptance.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:generate-skill-directory",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-help/SKILL.md"
      ],
      "referencePaths": [
        "tools/generate.mjs",
        "tests/readme-facts.test.mjs"
      ],
      "rationale": "Keep catalog-driven public directory with source labels and explicit invocation semantics; omit probes and unselected extension entries.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:github-autopilot-provider",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/scripts/watch-pr/github.ts",
        "pstack/skills/poteto-mode/scripts/watch-pr/policy.ts"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/github.ts",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/shipping.ts"
      ],
      "rationale": "Keep exact repository/account/head evidence, fresh observations, intent journal, independent review and explicit server-policy merge boundary. Strict base CAS is unavailable and remains a declared limitation.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:github-observation",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/scripts/watch-pr/github.ts"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/deadline.ts",
        "plugins/pstack/skills/poteto-mode/scripts/watch-pr/transport.test.ts"
      ],
      "rationale": "Keep shared monotonic budget, request/byte bounds, complete pagination and bounded owned-child closure. Secondary deadline and transport tests are useful comparisons, not permission to run a watcher.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:github-workflow",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/playbooks/opening-a-pr.md",
        "pstack/skills/poteto-mode/playbooks/babysit.md",
        "pstack/skills/poteto-mode/playbooks/shipping.md"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/playbooks/opening-a-pr.md",
        "plugins/pstack/skills/poteto-mode/playbooks/babysit.md",
        "plugins/pstack/skills/poteto-mode/playbooks/shipping.md"
      ],
      "rationale": "Keep only bounded inspect/create/recover/merge operations; CLI remains inspect/recover only. Root-owned authorization is caller evidence, not authenticated consent.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:install-release",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep explicit package install/update/rollback/uninstall/inspect/plan operations with ownership and checksums. No runtime registration or real installation was performed.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Searched the fixed secondary tools, packaging and test trees: no staged archive install/update/rollback CLI counterpart. tools/plugin.mjs is constants only and tools/pi-package.mjs is an installed-Pi locator, not an installer."
    },
    {
      "id": "tool:local-release",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        ".github/workflows/ci.yml"
      ],
      "rationale": "Keep clean exact source, pinned runtime, external evidence, required logs, tagged build and explicit publication gate. Reference CI is a policy alternative; no remote publication was exercised.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:local-release-lib",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep exact source/tree, log hashes, required checks and asset inventory binding; these local receipts do not authenticate a malicious local actor or prove live installation.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Searched the fixed secondary repository tools, plugins, tests, docs, Lean and TLA trees: no counterpart to this OMS-owned module."
    },
    {
      "id": "tool:module-review",
      "decision": "local-only",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "PARENT-OWNED EXCEPTION: newly introduced coverage implementation is deliberately not semantically reviewed or accepted here. Parent explicitly owns its validation; this entry accounts for scope only.",
      "officialRationale": "No counterpart search specific to this new implementation was performed: parent reserved review. Fixed official tree has no OMS module-audit coverage implementation.",
      "referenceRationale": "No counterpart search specific to this new implementation was performed: parent reserved review. Do not infer acceptance from this inventory entry."
    },
    {
      "id": "tool:operations-doctor",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep read-only local run/evidence/matrix checks and lock diagnostics. Despite its name it performs no cloud operation; source freshness covers tracked HEAD changes only.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Searched the fixed secondary repository tools, plugins, tests, docs, Lean and TLA trees: no counterpart to this OMS-owned module."
    },
    {
      "id": "tool:plan-pstack-update",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "tools/sync.mjs"
      ],
      "rationale": "Keep read-only full official committed-tree preview, exact origin/SHA ancestry/receipt checks and mapping blockers. Reference sync applies changes and is not a drop-in planner.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:plan-reference-update",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "tools/sync.mjs",
        "tools/forks.json",
        "tools/upstream.json"
      ],
      "rationale": "Keep two independent histories, full file/mode deltas, adoption impacts and unmapped changes; byte convergence is review input, not automatic policy adoption.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:pstack-source",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "tools/sync.mjs"
      ],
      "rationale": "Keep no-replace/no-lazy-fetch bounded Git reads, raw blob verification, portable paths and case/Unicode collision checks; no repository origin string is independent provenance.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:reference-adoptions",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "tools/forks.json",
        "tools/upstream.json"
      ],
      "rationale": "Keep fixed-source receipts, output drift, rationale/revisit conditions and policy-derivation linkage. Existence/hash checks remain mechanical, not semantic review.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:release-lib",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "tools/runtimes.mjs",
        "tests/runtime-packaging.test.mjs"
      ],
      "rationale": "Keep deterministic regular-file archives, path/type/duplicate checks, executable modes, staged installs and rollback; do not equate byte checks with native discovery.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Secondary runtime layout validators and their tests provide packaging comparisons, not an equivalent archive parser or staged installer; retain the OMS path/type/mode and rollback contracts."
    },
    {
      "id": "tool:release-publisher",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        ".github/workflows/security.yml"
      ],
      "rationale": "Keep explicit native publisher environment and compare-and-swap publication lease. It coordinates cooperating publishers; it is not a GitHub authorization boundary.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Secondary security workflow usefully disables persisted checkout credentials; it has no equivalent cross-machine OMS publication lease or local receipt gate."
    },
    {
      "id": "tool:run-evidence",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep distinct run/evidence journals, revision/source-bound receipts, idempotency and stale/fail/unknown states. Caller-supplied checks are assertions, not independent execution attestation.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Searched the fixed secondary repository tools, plugins, tests, docs, Lean and TLA trees: no counterpart to this OMS-owned module."
    },
    {
      "id": "tool:runtime-matrix",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "tests/pi/runtime.test.mjs",
        "tests/pi/catalog.test.mjs"
      ],
      "rationale": "Keep actual Node/Bun version probes, platform/status distinctions and bounded execution. Reference Pi catalog checks are different host tests; a matrix pass is limited to declared probes.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:source-skills",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [
        "tools/validate-skills.mjs"
      ],
      "rationale": "Keep immutable source/license/resource closure and dependency validation for unmodified original skills. Secondary skills-only closure provides a useful comparison but owns different source material.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:stable-marketplace",
      "decision": "retain",
      "officialPaths": [],
      "referencePaths": [],
      "rationale": "Keep tagged rebuild verification, digest-bound snapshots, no same-version payload changes and leased expected-head promotion. No fixed-source implementation matches this OMS stable branch pipeline.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Searched the fixed secondary tools, marketplace manifests, workflows and packaging tests: no equivalent stable-branch archive reconstruction or expected-head promotion pipeline."
    },
    {
      "id": "tool:sync-upstream",
      "decision": "adapt",
      "officialPaths": [],
      "referencePaths": [
        "tools/sync.mjs"
      ],
      "rationale": "Retain guarded historical schema-1 sync for regression compatibility; correct 2..127 merge conflict handling if this exported helper remains supported (T2). Active schema-2 pin flow is not affected.",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:validate",
      "decision": "adapt",
      "officialPaths": [],
      "referencePaths": [
        "tools/validate-skills.mjs",
        "tools/generate.mjs"
      ],
      "rationale": "Retain Markdown parser, containment, source receipts, hygiene and evidence cross-links; fix executable discovery gaps (T3) and treat schemas/evidence-binding limits honestly (T5).",
      "officialRationale": "Searched the complete fixed official pstack snapshot, including skills, helpers, manifests and automations: no counterpart to this OMS-owned module.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    },
    {
      "id": "tool:worktree-audit",
      "decision": "retain",
      "officialPaths": [
        "pstack/skills/poteto-mode/scripts/worktree-audit.sh"
      ],
      "referencePaths": [
        "plugins/pstack/skills/poteto-mode/scripts/worktree-audit.mjs"
      ],
      "rationale": "Retain existing HEAD-reflog preservation adaptation, fresh identity/host/PR coverage, ignored-content holds and local proof checks. Candidate is advisory and never authorizes deletion.",
      "officialRationale": "Compare the named fixed official implementation and its host assumptions; retain the bounded OMS behavior described in this report.",
      "referenceRationale": "Compare the named files at fixed reference commit 356c6e0f978df729eb16f227d795f34d221c5aad; paths are comparison surfaces, not claims of perfect equivalence."
    }
  ]
}
```
