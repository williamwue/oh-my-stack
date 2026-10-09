# Local delivery acceptance

The unreleased delivery checker has three operations: `freeze`, `inspect` and
`verify`. It requires Node.js 20 or later and has no npm runtime dependencies.
Each generated package contains the same executable closure under `scripts`.

Use it for local delivery evidence, separately from historical conformance,
runtime installation and external publication. It reads actual files and runs
explicitly selected checks; it does not accept supplied pass flags as proof.

## Plan and lifecycle

All ordinary input and output paths are workspace-relative, normalized and
symlink-free. Use the real absolute workspace root. Keep evidence outside
source roots. Include relevant source, tests and configuration in the scope;
the checker cannot infer an omitted dependency.

A minimal root-owned narrow plan is:

```json
{
  "version": 1,
  "taskId": "label-fix",
  "mode": "narrow",
  "predicate": "The public output contains the corrected label",
  "sourceRoots": ["src"],
  "immutablePaths": ["test/public-output.mjs"],
  "candidates": {"count": 0},
  "units": [{"id": "label", "ownedPaths": ["src"], "delegated": false}],
  "checks": [{
    "id": "combined",
    "argv": ["node", "test/public-output.mjs"],
    "cwd": ".",
    "timeoutMs": 10000,
    "outputLimitBytes": 65536,
    "required": true
  }],
  "requiredCombinedCheck": "combined",
  "narrow": {"reason": "One known local label change", "omittedFullRequirements": ["design"]}
}
```

Freeze requirements before work. The baseline source is informational and may
change during implementation. The evidence must pin the actual final source.
Retain the returned lock digest separately; replacing both lock and evidence
cannot bypass that expected digest.

```bash
node /installed/oh-my-stack/scripts/delivery-evidence.mjs freeze --root /project --plan task/plan.json --out task/lock.json
node /installed/oh-my-stack/scripts/delivery-evidence.mjs inspect --root /project --lock task/lock.json --expected-lock-sha256 SHA --evidence task/evidence.json
node /installed/oh-my-stack/scripts/delivery-evidence.mjs verify --root /project --lock task/lock.json --expected-lock-sha256 SHA --evidence task/evidence.json --run-check combined --out task/report.json
```

The lock cannot be overwritten. `inspect` never spawns commands or assesses
behavior. `verify` executes only named checks with argv, no shell interpolation,
and frozen executable bytes, cwd, timeout and output limits. Omitted required
checks remain unverified. Checks may have side effects; the original task
authorization determines whether executing them is appropriate.

## Final evidence

Evidence has `version`, `taskId`, `lockSha256`, `finalSource`, `artifacts`, `units`
and `reviews`. `finalSource` is the complete sorted inventory of scoped files,
each `{path, sha256}`. Paths sort using the checker's English locale order.
Each unit's `outputDigest` is SHA-256 of `JSON.stringify` of the ordered final
source entries covered by its `ownedPaths`. Property order is `path`, then
`sha256`. Root-owned narrow work has empty artifacts/reviews arrays.

Full design evidence supplies candidate `{slot, artifactId}` entries,
`comparisonArtifactId`, ordered `reviewTargets: [{id, sha256}]`, `comparedSlots`,
`selectedSlot` and `decisionArtifactId`. Candidate/comparison files are actual
nonempty artifacts. The full panel is frozen through
`candidates.panel: {path, pointer}`, where `pointer` selects its ordered entry
array using JSON Pointer. A requested larger `count` retains ordered repeats;
evidence cannot reduce the frozen slots.
Verified candidate model and effort must also match their frozen configured
slot. Missing or unsupported panel-selection information remains unverified;
different task identities alone do not satisfy a configured model panel.
Supported entries specify `model` and `reasoning` (or `reasoning_effort`),
optionally `inheritParent: false` and `agent`. Conflicting reasoning aliases
are rejected. Inherited selections, strings and unknown entry fields are
unverified rather than resolved by guessing.

Delegated units carry task authority and an independent review
`{id, unitId, artifactId, targetDigest, authority}`. The target must equal the
current unit digest. Distinct display names or receipt paths alone cannot
establish independent native identity.

## Native completion protocol

The first supported attribution adapter is explicit native Codex delegation.
Other host receipt formats remain unsupported. Host-owned children must retain
their host task authority; do not substitute a native backing conversation.

The frozen plan reserves `nativeParentId` and
`assignments: [{id, taskName, kind}]`, with kind `writer` or `review`. An evidence
authority references the prepared request and native parent/child records:

```json
{
  "kind": "codex-native",
  "requestPath": "task/writer-request.json",
  "parentRecordPath": "task/parent.jsonl",
  "childRecordPath": "task/writer.jsonl",
  "assignmentId": "write-label"
}
```

Use only known records for this task; do not scan unrelated histories or commit
raw transcripts. The native helper must verify explicit model/effort selection,
parent linkage, task name and the exact prepared assignment text. Encrypted
spawn messages remain `INDEPENDENCE_UNVERIFIED`.
Every verified spawn prefix of a shared parent must remain unchanged; later
unrelated parent activity can append. All report and difference destinations
are checked against canonical source/evidence/authority coordinates. A rejected
destination must not be reused by an error-report writer.

The prepared task message carries exactly one assignment block:

````text
```oms-delivery-assignment-v1
{"schemaVersion":1,"taskId":"TASK","lockSha256":"SHA","assignmentId":"ASSIGNMENT","taskName":"TASK_NAME","kind":"writer","outputs":[{"id":"src/app.mjs","path":"src/app.mjs"}],"reviews":[]}
```
````

Its actual child assistant final response carries exactly one completion block:

````text
```oms-delivery-completion-v1
{"schemaVersion":1,"taskId":"TASK","lockSha256":"SHA","assignmentId":"ASSIGNMENT","kind":"writer","outputs":[{"id":"src/app.mjs","path":"src/app.mjs","sha256":"FILE_SHA"}],"reviews":[]}
```
````

Review assignments use `kind: review`, declare their review artifact as output,
and include exact `{id, sha256}` review targets in both blocks. A unit target
uses its unit ID and tree digest; a design comparison targets every complete
candidate artifact. A review completion additionally requires
`verdict: accepted`. Changed targets need a new review task.

Only `response_item` / `message` / `assistant` / `phase: final_answer` text is
accepted. User text, tools, commentary, multiple finals and later task activity
cannot supply a completion. Runtime-recorded attribution binds a child's
declaration and distinct identity; it cannot prove review quality, authorship
or tamper resistance against a local administrator. Model diversity is separate.

## Visual checks and limits

Optional `visual` contains `comparatorVersion: png-rgba-v1`,
`captureConfigPath` and states `{id, baselinePath, width, height,
maxChangedPixels, maxChannelDelta}`. Freeze a configuration containing state,
viewport, scale, fonts, data, timing and capture surface before work. Evidence
captures are `{stateId, path, sha256}`. Exact parity uses both limits zero.
Intentional redesign uses a separately approved frozen target; rectangle masks
are unsupported and rejected.

The comparator supports original noninterlaced 8-bit RGB/RGBA PNG, filters 0–4,
IHDR, optional PLTE, contiguous IDAT and IEND. All other chunks, including
profiles, transparency and harmless ancillary text, are currently unsupported.
It compares raw normalized RGBA, including alpha; it performs no color
management. Limits are 32 MiB input, dimensions 8192, 16M pixels and 64 MiB
decoded scanlines. It reports changed pixels, maximum channel delta and bounding
box, and produces a PNG difference artifact. Capture authenticity remains
unverified by image math.

Reports keep structure, behavior, visual, provenance and external boundaries
separate. Only requested local gates can pass. Unknown required provenance
prevents a full accepted result. External release is always unassessed. Neither
fixture success nor this checker proves equal effectiveness to original pstack.
