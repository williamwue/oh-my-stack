# Public evidence policy

Oh My Stack keeps runtime evidence in the repository so capability claims can
be reviewed independently from implementation code. Evidence must remain
useful without exposing private workspace or account content.

## Allowed evidence

- runtime and surface versions;
- operating-system family and architecture;
- disposable fixture names, assertions, checksums, and local commit IDs;
- opaque session or task identifiers created for a disposable verification
  run when they are needed to distinguish attributable participants;
- concise descriptions of tool behavior and observed limitations.

Opaque runtime identifiers are evidence labels, not credentials. The
repository does not include the corresponding private transcript stores, user
prompts, or account access needed to resolve them.

## Prohibited evidence

- API keys, tokens, cookies, credentials, or private keys;
- raw session transcripts or runtime state databases;
- personal names, email addresses, account IDs, or private hostnames;
- absolute home-directory or private workspace paths;
- customer data or proprietary repository content;
- unredacted external-service responses.

## Review requirements

New evidence must use a disposable fixture and the smallest permission
profile that proves the claim. Summaries should describe only facts required
for the capability assertion. Before commit, reviewers must check the evidence
against this policy and run `npm run check`.

Removing or replacing evidence must preserve references from capability
profiles and related-evidence links. Do not rewrite historical observations to
make a later release appear more capable than the runtime that was actually
tested.
