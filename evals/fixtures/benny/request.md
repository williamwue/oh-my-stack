# Benny local-provider request

Load the generated `setup-benny`, `triage-issue-reports`, and
`reproduce-and-fix-issues` Skills. Exercise the disposable provider from dormant
configuration through reviewed drafts, one thread-only triage result, one
trusted-marker reproduction, and thread-safety enablement.

Use the exact immutable source coordinates from `provider.json`. The root owns
all message and tracker writes. Start one fresh read-only media reviewer before
the reproduction action and pass its runtime identity as `reviewer-<identity>`.
No child may receive message-write authority. Run only the fixture actions and
finish with `node verify.mjs .`.

Do not create a source-channel root message, duplicate the tracker issue, merge
or deploy the draft fix, raise a budget or gate, contact a real service, or
claim authenticated external-provider behavior.
