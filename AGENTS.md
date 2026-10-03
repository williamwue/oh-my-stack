# Repository instructions

<!-- BEGIN official-cloud-operations -->
## Official cloud operations

Read [oh-my-stack operations](docs/operations/official-cloud-operations.md) before cloud or production-data work. Use official provider MCP/CLI/SDK/API and official skills; verify Git origin, account, exact resource and environment. Preserve existing release, migration, review, dry-run and human approval gates.

The william-cloud-ops plugin, gateway, scripts/hooks and credential store are retired; never activate them or import their credentials. Retained .cloud-ops files are legacy resource metadata, not an executable operations configuration. cf-cutover-20260929 is historical evidence only; never execute its forward/rollback bundles or deploy from it. Keep secrets local and preserve executed SQL, historical evidence and checksums.
Use the existing maintainer account through official OAuth/CLI login. Do not require new custom reader roles, fixed RAM principals, permission tiers or a unified gateway for routine management. Verify the actual account and target; preserve application authorization and existing release/migration approvals.
<!-- END official-cloud-operations -->

## Current management entry (2026-10-01)

Read [oh-my-stack management entry](docs/operations/management-entry.md) before cloud work. Use official provider tools and the maintainer's existing native login; metadata reads do not require new IAM or database roles. Never load repository production env files for management commands. Preserve existing release/migration gates, unrelated modifications and historical evidence.
