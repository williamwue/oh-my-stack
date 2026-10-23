# Read-only worktree audit

The OMS-owned helper observes local Git worktrees and assesses explicit host
and merge evidence. It does not fetch, delete worktrees, prune Git metadata or
change branches. Official pstack remains the workflow's semantic source.

## Scan and assess

From a source checkout:

```sh
node tools/worktree-audit.mjs scan --cwd /absolute/project > /outside/project/scan.json
node tools/worktree-audit.mjs assess --scan /outside/project/scan.json --evidence /outside/project/evidence.json
node tools/worktree-audit.mjs assess --scan /outside/project/scan.json --evidence /outside/project/evidence.json --format text
```

In an installed package, resolve its absolute root and substitute
`scripts/worktree-audit.mjs` for the source path. Redirection is a caller action;
choose a destination that does not dirty the worktree being assessed.

The optional `assess --format text` view shows verdict totals and each worktree's
branch, head, readable reason, original reason code and available evidence detail.
It uses the same assessment as the default JSON output. Preserve JSON for
machine-readable evidence; text is a status view. Both modes remain read-only,
and candidate status does not authorize deletion.

The scan freezes worktree paths, physical identities, Git directories, HEADs,
branch and lock state, tracked, untracked and ignored-file observations, and
HEAD/shared-reflog fingerprints. Both endpoints of each reflog entry are
checked for commits not preserved by branches, tags, remotes or shared ref
reflogs. Private HEAD reflogs of other worktrees receive no preservation credit.
Assessment validates the supplied records and re-reads local Git facts to detect
changes. User Git configuration cannot hide untracked files or submodule state.
Incomplete recursive inspection, inaccessible paths and changed identities keep
results unresolved. Every Git command uses `GIT_NO_LAZY_FETCH=1` and the
`--no-lazy-fetch` guard so missing promisor objects cannot trigger a fetch.
Git versions that reject this guard leave the scan unresolved; there is no
retry without it.

## Supported host evidence

Collect evidence after the scan through the host's supported interfaces. Record
active threads, pinned threads, child tasks and processes separately, with exact
scope, observation times and complete coverage. A successful call returning some
threads does not establish complete pinned-thread or process coverage. An
unavailable interface remains unknown; do not read private host databases or
invent a complete empty inventory.

Evidence must bind the scan ID, exact worktree identity and scanned HEAD. Stale,
future, incomplete or mismatched records cannot establish candidacy. These
records are caller assertions, not signed host attestations. Matching snapshots
do not prove that no activity occurred between them.

Merge evidence must identify the exact repository, PR head, target branch and
commit, merge result and complete associated open-PR inventory. Squash merges
use the confirmed merge commit contained in the evidenced target commit;
source-branch ancestry alone does not prove the PR was merged. Missing local
objects stay unknown because the helper never fetches them.

## Evidence format and limits

The JSON envelope is `{ "version": 1, "scanId": "SCAN_ID", "entries": [] }`.
An empty entries array is valid missing evidence and cannot establish a
candidate. For each observed worktree, copy its complete `identity` unchanged
and set `head` to its scanned HEAD. Each entry may supply:

| Field | Required evidence |
| --- | --- |
| `activeThreads`, `pinnedThreads`, `childTasks`, `processes` | `coverage`, string `items`, `observedAt` in Unix milliseconds and `source` |
| `openPrs` | The same observation fields, exact `repo` and `headSha`; each item has `repo`, positive `pr` and `headSha` |
| `merge` | Exact `repo`, positive `pr`, `headSha`, `baseRef`, `baseSha`, `mergeSha`, boolean `merged`, `observedAt` and `source` |

Coverage is `complete`, `partial` or `unavailable`. Source records contain
`kind`, `tool` and `scope: "worktree"`; usage sources use
`kind: "supported-host"`, while PR sources use `kind: "official-provider"`.
Repository identity uses `HOST/OWNER/REPO`, normalized from the local origin.
The merge target is a full local `refs/heads/...` or `refs/remotes/...` ref.
Its current commit must equal the evidenced base SHA.

The maximum evidence age is five minutes. The scan has a 45-second shared Git
read budget, at most 4,096 commands, 32 MiB combined output and 2 MiB per command,
with at most 128 worktrees. Reflog reachability is capped at 4,096 roots;
missing, unreadable, malformed, empty or over-budget evidence stays unresolved. Inputs are bounded to 8 MiB. After observing direct-child exit, the reader
allows 250ms for pipe draining, then closes owned pipes and rejects truncated
output without signalling descendants. This termination allowance follows the
read deadline. Exhausted or incomplete observations remain unresolved. Any indexed submodule currently carries
`SUBMODULE_INSPECTION_INCOMPLETE`; this version does not claim recursive
submodule inspection. Sparse or assume-unchanged index entries also remain
unresolved because they can hide local content.

## Verdicts and cleanup

- `hold`: a positive blocker, such as activity, local content, a lock or an open
  PR, prevents candidacy.
- `unresolved`: evidence or local observation is missing, incomplete or changed.
- `candidate`: the recorded evidence satisfies the advisory criteria.

Main worktrees, ignored content and dirty submodules remain protected. A
candidate does not authorize deletion. Before an authorized cleanup, refresh
host activity and Git observations, preserve unrelated work and follow the
workflow's existing cleanup and approval gates. This audit does not add a
background watcher.
