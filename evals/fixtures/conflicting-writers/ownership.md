# Writer ownership

- `BatchWriter` owns only the numeric value of `ingestion.maxBatch` in
  `workspace/settings.mjs`. It changes `10` to `25` and runs
  `node verify-part.mjs batch`.
- `RetryWriter` owns only the numeric value of `retry.delayMs` in
  `workspace/settings.mjs`. It changes `100` to `250` and runs
  `node verify-part.mjs retry`.

The writers share a physical file, so concurrent edits in one checkout are
unsafe even though their semantic line ownership is disjoint. Use isolated
writer worktrees with root-controlled patch integration when the runtime proves
that capability. Otherwise serialize the two writers in the shared checkout,
inspect the first result before starting the second, and disclose the fallback.
