<!-- BEGIN official-cloud-operations -->
## Official cloud operations

Read [oh-my-stack operations](docs/operations/official-cloud-operations.md) before cloud or production-data work. Use official provider MCP/CLI/SDK/API and official skills; verify Git origin, account, exact resource and environment. Preserve existing release, migration, review, dry-run and human approval gates.

The william-cloud-ops plugin, gateway, scripts/hooks and credential store are retired; never activate them or import their credentials. Retained .cloud-ops files are legacy resource metadata, not an executable operations configuration. cf-cutover-20260929 is historical evidence only; never execute its forward/rollback bundles or deploy from it. Keep secrets local and preserve executed SQL, historical evidence and checksums.
<!-- END official-cloud-operations -->

# Repository instructions
