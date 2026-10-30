# Oh My Stack

OMS 0.21.1 distributes pinned pstack-claude workflows with necessary T3 host
mapping and the complete selected AIHero extension. Codex, Claude Code and Pi
are supported package targets. OMP is retired from new releases.

## Install

Codex:

```sh
codex plugin marketplace add williamwue/oh-my-stack --ref stable
codex plugin add oh-my-stack@oh-my-stack
```

Claude Code:

```sh
claude plugin marketplace add https://github.com/williamwue/oh-my-stack.git#stable
claude plugin install oh-my-stack@oh-my-stack --scope user
```

Pi: download `oh-my-stack-pi-0.21.1.tar.gz` from the
[latest release](https://github.com/williamwue/oh-my-stack/releases/latest), verify
SHA256SUMS and the release manifest, extract its `oh-my-stack` root to a dedicated
directory, then run `pi install /absolute/path/to/oh-my-stack`.

Restart the host, invoke `oh-my-stack:poteto-help` (Pi: `poteto-help`), and verify
the loaded path/version. Native hooks may require host trust. Existing upstream
`pstack-models.md` sheets follow upstream rules. Installation never migrates,
overwrites or deletes personal configuration. Use an isolated host home to try
pure defaults. `setup-pstack` is an explicit configuration action.

## Sources and boundaries

The direct workflow source is pstack-claude 0.9.112; its complete source and fixed
receipt are committed in `upstream/vendor/pstack-claude` and
`upstream/distribution.json`. Official pstack is independently pinned for
comparison. OMS changes plugin identity and native namespace at packaging time,
retaining upstream model defaults, reasoning settings, agents, workflows and
failure rules. T3 dispatch uses one [host mapping](src/adapters/t3-tools.md).
AIHero skills remain independently invocable; they are not workflow stages.

The selected 20 originals are listed with their full paths in the receipt.
`prototype` is additionally included as wayfinder's current dependency. Original
text, trigger markers, resources and licenses are retained. See
[source review and test retirement](docs/maintainers/upstream-0.21.0.md).

## Maintain and release

```sh
npm ci --ignore-scripts
npm run generate
npm run check
```

Set `OMS_BUN` to a Bun 1.4.4 executable when it is not the default `bun`.
Checks run the fixed upstream generator and fixture suite in a temporary Git
checkout, plus upstream orchestration typechecks/tests, source/resource checks,
archive reproducibility, installation and archive-to-stable integration tests.
Windows, actual model/provider calls and live T3 child execution are separate
acceptance; fixtures do not certify them.

Publish only after independent review, normal PR merge and a clean exact tag.
The [local release pipeline](docs/local-release.md) retains the official pinned
Node/zlib build, native gh identity, publication lease, downloads and tag rebuild,
and expected-head stable protection. New releases have seven assets: three
runtime archives, two marketplace archives, release-manifest.json and SHA256SUMS.

MIT. See the source LICENSE/NOTICE files and [third-party notices](THIRD_PARTY_NOTICES.md).
