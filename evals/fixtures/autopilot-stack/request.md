# Autopilot stack request

The operator explicitly authorizes autonomous build, review, and topology
changes for changes 51 and 52 in the disposable local provider. Landing,
automatic merge, closing, deployment, and external publication are withheld.

Start one isolated owner for each change before waiting. Each owner may build
only its exact packet and must return its native identity, base, head, patch
identity, focused proof, and trail. Each bound owner runs its exact `build`
command followed by its own exact `self-proof` command. After both owners report
`STACK_READY` with passing self-proof, start
two fresh independent reviewers per change: one `gates` lane and one `live`
lane. The root must not run `review.mjs verify` or invent reviewer identities.

Only `root-coordinator` may aggregate verdicts or invoke topology append. Append
change 51 to `main`, then rebase and retarget change 52 onto change 51. Preserve
the code verdict only when the stable patch identity is unchanged, and refresh
the named checks at the rewritten head. Finish with the report and independent
verifier. Deliver the open, unarmed two-link chain and stop for the operator to
review and land it.
