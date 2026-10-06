# Contribute to Oh My Stack

For installation and everyday use, start with the [user documentation](docs/README.md).

## Build and check a change

Use Git, Node.js 20 or newer, and npm. From the repository root, run:

```bash
npm ci --ignore-scripts
npm run generate
npm run docs:generate
npm run check
```

`npm run generate` updates generator-owned packages. `npm run docs:generate`
updates the public Skill directory from the generated catalog.
Edit source instructions under `src/` or reviewed source selection records
under `upstream/`. Generated package files are build outputs.

For documentation changes, keep terminal commands separate from prompts sent
to the agent. Explain expected output and file changes. Keep the English and
Chinese README and first-task instructions consistent. Preserve original
third-party Skill text and dated evidence.

## Find the owning files

| Change | Files |
| --- | --- |
| User entry and guides | `README.md`, `README.zh-CN.md`, and `docs/` |
| Portable workflows and roles | `src/core/` |
| Tool-specific packaging | `src/adapters/` and `src/packaging/` |
| Reviewed upstream imports | `upstream/` and `tools/source-skills.mjs` |
| Tests and behavior evidence | `tests/` and `evals/` |

The [architecture guide](docs/architecture.md) and
[design decisions](docs/decisions/0001-portable-core.md) explain these boundaries.

## Verify a change

`npm run check` checks generated packages, generated documentation, local
links, Markdown formatting, release reproducibility, book metadata, and tests.
Run the affected live tool checks when behavior changes. Offline checks do not
establish native Skill selection or complete workflow behavior.

For book source changes, follow the existing [book documentation](docs/books/pstack/README.md)
and the complete audit commands in [CI](.github/workflows/ci.yml).

## Publish an authorized release

Follow the [release process](docs/release-process.md). It requires independent
review, current CI, clean tagged builds, and downloaded-asset checks.
Local checks and a documentation edit do not authorize publishing or merging.
Cloud operations follow [AGENTS.md](AGENTS.md) and the
[official operations instructions](docs/operations/official-cloud-operations.md).

## Inspect prior decisions and evidence

The [maintainer index](docs/maintainers/README.md) links historical acceptance,
implementation plans, and the archived README. Preserve dates, version scopes,
and evidence checksums when adding new records.
