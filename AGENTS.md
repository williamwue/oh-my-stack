# Repository instructions

<!-- BEGIN official-cloud-operations -->
## Official cloud operations

Read [oh-my-stack operations](docs/operations/official-cloud-operations.md) before cloud or production-data work. Use official provider MCP/CLI/SDK/API and official skills; verify Git origin, account, exact resource and environment. Preserve existing release, migration, review, dry-run and human approval gates.

The william-cloud-ops plugin, gateway, scripts/hooks and credential store are retired; never activate them or import their credentials. Retained .cloud-ops files are legacy resource metadata, not an executable operations configuration. cf-cutover-20260929 is historical evidence only; never execute its forward/rollback bundles or deploy from it. Keep secrets local and preserve executed SQL, historical evidence and checksums.
Use the existing maintainer account through official OAuth/CLI login. Do not require new custom reader roles, fixed RAM principals, permission tiers or a unified gateway for routine management. Verify the actual account and target; preserve application authorization and existing release/migration approvals.
<!-- END official-cloud-operations -->

## Development entry

Use the [README](README.md) for current architecture and commands. Formal generation
uses the complete fixed sources in `upstream/distribution.json` through
`tools/generate.mjs`. Do not edit generated packages or vendored source bytes.
Read [the source transition](docs/maintainers/upstream-0.21.0.md) before changing
pins, packaging, T3 mappings or checks. Compare both repositories as separate
histories and record capability decisions with evidence. Preserve upstream model
configuration paths and defaults; never migrate personal sheets automatically.

The old `src/core/skills`, roles, parity derivations, adapter engines and their
registries are retained historical implementation, not formal distribution
inputs. Their old derivation commands must not regenerate current packages.
Run `npm run check` with official Node 22.23.3 / zlib 1.3.1-e00f703 and Bun 1.4.4.
Report fixture, installation, live host and publication evidence separately.

## Current management entry (2026-10-01)

Read [oh-my-stack management entry](docs/operations/management-entry.md) before cloud work. Use official provider tools and the maintainer's existing native login; metadata reads do not require new IAM or database roles. Never load repository production env files for management commands. Preserve existing release/migration gates, unrelated modifications and historical evidence.
