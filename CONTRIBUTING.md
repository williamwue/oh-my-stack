# Contributing to Oh My Stack

Thanks for helping improve portable engineering workflows across agent
runtimes. Contributions should preserve portability, explicit capability
boundaries, and independently checkable evidence.

## Development setup

Oh My Stack requires Node.js 20 or newer and npm.

```bash
npm ci --ignore-scripts
npm run check
```

The complete check is offline. It validates generated drift, schemas, local
links, executable inventory, provenance, deterministic release output, and the
test suite.

## Source and generated files

Edit canonical workflow content under `src/core/`, runtime adapters under
`src/adapters/`, and release configuration under `src/packaging/`. Do not edit
generated files under `packages/` directly. Regenerate them with:

```bash
npm run generate
```

Commit canonical and generated changes together. Run `npm run check` before
opening a pull request.

## Contribution expectations

- Keep portable core instructions free of runtime-specific names and paths.
- Put host-specific behavior in adapters or capability profiles.
- Preserve the distinction between static validation, discovery, lifecycle,
  and end-to-end evidence.
- Do not broaden a claim from one runtime surface to another.
- Add or update focused tests for behavior changes.
- Keep user configuration additive and preserve unrelated files.
- Follow the [public evidence policy](docs/evidence-policy.md) for fixtures and
  runtime observations.

Imported or derived third-party content also requires a pinned source revision,
license record, ownership declaration, and transformation or derivation record.
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
[docs/prior-art.md](docs/prior-art.md) before adding upstream material.

## Pull requests

Keep each pull request focused and include:

- the problem and intended behavior;
- the affected runtime surfaces;
- commands used for verification;
- known limitations or deferred live checks;
- provenance changes, when third-party material is involved.

Runtime credentials are not required for ordinary contributions. A change may
ship with a live check explicitly deferred when the package, schema, and
offline lifecycle remain verifiable and the limitation is documented.

## Security reports

Do not open a public issue for a suspected vulnerability. Follow
[SECURITY.md](SECURITY.md) instead.
