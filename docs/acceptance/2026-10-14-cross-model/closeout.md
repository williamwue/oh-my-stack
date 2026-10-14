# T3 source closeout

The user authorized fixing the two repository-check failures and completing
independent review, audit organization and a local source commit. Model-ranking
changes, new-session workflow acceptance and formal publication are outside
this closeout.

## Check failures

The historical cleanup receipt now uses home-relative configuration-path keys.
Its recorded hash values and cleanup facts are preserved. The original receipt
is retained in private local audit storage.

The executable-pinning test now writes a small POSIX executable fixture with
an explicit exit status instead of relocating a dynamically linked Homebrew
Node binary. Windows retains its native executable fixture. The baseline exit
status and the rejection of a changed executable remain required assertions.
No delivery-verifier implementation, timeout or rejection gate was weakened.
The isolated regression and repository validator pass without a Node preload.

## Source and audit scope

The commit includes the existing coherent T3 adapter candidate, explicit model
selection, retained curated acceptance records and these check fixes. The
pre-existing package-manager metadata change is excluded and preserved.
Private raw logs, source snapshots and configuration backups are locally
excluded from Git. The old installed package backup was moved outside the
source tree, so its generated upstream documents do not enter source lint.
The released marketplace source and guarded rollback command remain available.

## Verification and review

The complete `npm run check` passes without a Node preload: 442 tests pass,
two retain their existing conditional skips, and none fail. Detached T3
generation, source validation and Markdown checks pass.
A read-only reviewer receives the frozen source diff, intent, changed-file
hashes and validation results. It cannot write application files or issue a
release approval. Local preparation and reported child metadata remain distinct
from backend engine or option-enforcement proof.

The [independent review receipt](review.json) preserves both rounds. Codex Astra
found one P2 defect: inherited panel seats skipped availability validation.
The fix validates every seat before excluding inherited targets from family
diversity counting. A new regression failed before the fix and passed after
it. The fresh second round returned PASS with no findings and independently
checked additional unavailable-provider, model and runtime-mode cases.

The installed local Codex package is updated to the reviewed build at
`~/.local/share/oh-my-stack/local-builds/t3-cross-model-closeout-20261014`.
The original released source and initial local build are retained for rollback.
The complete user T3 selection, native model configuration and manual routing
remain unchanged. The source is committed locally on `codex/t3-orchestration`;
no remote push, PR, release or production deployment is part of this closeout.
Final report metadata was appended by the coordinator after the source review.
