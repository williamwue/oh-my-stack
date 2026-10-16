# Official pstack update preview

Use `tools/plan-pstack-update.mjs` for the active schema-2 imports and exact
parity derivations. The older `sync-upstream.mjs` remains a historical schema-1
tool; its apply and accept paths must not advance the current pin.

## Prepare the input

Provide a local Git checkout of `cursor/plugins` containing both the pinned
commit and the intended candidate commit. Fetch those objects separately if
needed. Use a full 40-character candidate SHA, then run from the OMS checkout:

```sh
node tools/plan-pstack-update.mjs --source-checkout /path/to/cursor-plugins --revision FULL_CANDIDATE_SHA
```

Use `--root /path/to/oms` when invoking the tool from elsewhere. Output is JSON
on stdout. Redirection to a chosen report is a caller action; the planner itself
writes no files. There is no apply option, checkout, fetch, credential access,
configuration update, or pin advancement. Dirty candidate working files are
ignored: the input is the committed tree under `pstack/` at the supplied SHA.

The origin must be the official GitHub `cursor/plugins` repository using HTTPS
or Git-over-SSH. Reference forks, including pstack-claude, are rejected. The
candidate must descend from the pinned commit. Both revisions are resolved
exactly; the old Git tree must match every blob in the active source receipt,
and the local snapshot must match those bytes and the complete file set.
Origin configuration is a local identity check, not independent network or
signature attestation of the candidate. Choose the SHA from the official source.

## Read the plan

| Status | Exit | Meaning |
| --- | --- | --- |
| `unchanged` | 0 | Same pstack content and modes, with no detected mapping or local-output problem. |
| `review-required` | 0 | Differences or unmapped semantic entries need review. This is not acceptance or permission to apply. |
| `blocked` | 1 | An anchor, local output, deletion, unsupported entry or portable-path conflict prevents reuse of the current derivations. |
| No plan | 2 | Invalid invocation, incomplete Git objects, unsafe paths, invalid baseline or malformed plugin metadata. |

The plan includes full old/new revisions and versions, file hashes and Git
modes, additions/deletions, derived versus source-only ownership, sequential
replacement occurrence checks, proposed derived hashes, current local-output
state, metadata review entries, generated targets and required checks.
Unknown source-only resources remain visible without being assigned a runtime
mapping. An added Skill or agent needs a reviewed mapping and local metadata;
the planner does not invent invocation policy, roles, routes or catalog entries.

An anchor mismatch records the first failing replacement for that derivation;
later replacements depend on it and are not evaluated. The proposed hash stays
null. Deleted derived sources and locally changed or missing outputs block the
plan. Case/Unicode aliases in candidate paths or new local semantic destinations
are diagnosed. Symlinks and submodules in the candidate are unsupported; local
symlink paths are rejected. All historical snapshots remain untouched.

Plans omit timestamps and machine paths so identical inputs produce identical
JSON. They describe observed bytes, not a durable authorization or transaction.
Rerun after any input changes. Local Git operations have a 10-second command
timeout and 64 MiB output bound; the source tree is limited to4096 files and
individual blobs to8 MiB. Missing objects fail rather than triggering lazy fetch.

## Apply a separately reviewed update

Review each changed file and adaptation. Preserve the old snapshot and receipts,
capture the candidate's complete official tree, and update the current source
receipt, exact source mappings, metadata, catalogs, provenance and documentation
through the existing maintenance process. No literal anchor is automatically
relaxed and no conflict marker is accepted by this planner.

After the mappings and hashes are reviewed, use the established materialization
and generation flow, then run its checks:

```sh
node tools/derive-pstack.mjs
node tools/derive-pstack.mjs --check
npm run generate
npm run check
```

Keep native execution, installation and publication evidence separate from
source consistency. This maintenance command is not installed in runtime packages.
